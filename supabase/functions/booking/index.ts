import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecrypt, encryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CAL_BASE = "https://www.googleapis.com/calendar/v3";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

/* ── Token helpers (same as calendar-sync) ── */
async function refreshGoogleToken(encRefresh: string) {
  const cid = Deno.env.get("GOOGLE_CLIENT_ID"), cs = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!cid || !cs) return null;
  const plain = await safeDecrypt(encRefresh);
  const r = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cid, client_secret: cs, grant_type: "refresh_token", refresh_token: plain }),
  });
  return r.ok ? r.json() : null;
}
async function refreshOutlookToken(encRefresh: string) {
  const cid = Deno.env.get("MICROSOFT_CLIENT_ID"), cs = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!cid || !cs) return null;
  const plain = await safeDecrypt(encRefresh);
  const r = await fetch(OUTLOOK_TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cid, client_secret: cs, grant_type: "refresh_token", refresh_token: plain, scope: "openid email Calendars.ReadWrite offline_access" }),
  });
  return r.ok ? r.json() : null;
}
async function ensureToken(conn: any, admin: any) {
  if (new Date(conn.token_expires_at) > new Date()) return safeDecrypt(conn.access_token);
  const refreshed = conn.provider === "outlook" ? await refreshOutlookToken(conn.refresh_token) : await refreshGoogleToken(conn.refresh_token);
  if (!refreshed) return null;
  const encAT = await encryptToken(refreshed.access_token);
  const encRT = refreshed.refresh_token ? await encryptToken(refreshed.refresh_token) : conn.refresh_token;
  await admin.from("external_calendars").update({
    access_token: encAT, refresh_token: encRT,
    token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
  }).eq("id", conn.id);
  return refreshed.access_token;
}

/* ── Fetch busy slots from external calendars ── */
async function getExternalBusy(userId: string, dateStr: string, admin: any): Promise<{start:string;end:string}[]> {
  const dayStart = new Date(dateStr + "T00:00:00Z").toISOString();
  const dayEnd = new Date(dateStr + "T23:59:59Z").toISOString();
  const busy: {start:string;end:string}[] = [];

  const { data: conns } = await admin.from("external_calendars").select("*").eq("user_id", userId).eq("is_active", true);
  if (!conns?.length) return busy;

  for (const conn of conns) {
    const token = await ensureToken(conn, admin);
    if (!token) continue;

    try {
      if (conn.provider === "google") {
        const r = await fetch(
          `${GOOGLE_CAL_BASE}/calendars/primary/events?timeMin=${encodeURIComponent(dayStart)}&timeMax=${encodeURIComponent(dayEnd)}&singleEvents=true&maxResults=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.ok) {
          const d = await r.json();
          for (const e of (d.items || [])) {
            if (e.status === "cancelled") continue;
            const s = e.start?.dateTime, en = e.end?.dateTime;
            if (s && en) busy.push({ start: new Date(s).toISOString(), end: new Date(en).toISOString() });
          }
        }
      } else if (conn.provider === "outlook") {
        const r = await fetch(
          `${GRAPH_BASE}/me/calendarView?startDateTime=${dayStart}&endDateTime=${dayEnd}&$select=start,end,showAs&$top=50`,
          { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } }
        );
        if (r.ok) {
          const d = await r.json();
          for (const e of (d.value || [])) {
            if (e.showAs === "free") continue;
            const s = e.start?.dateTime, en = e.end?.dateTime;
            if (s && en) busy.push({ start: new Date(s + "Z").toISOString(), end: new Date(en + "Z").toISOString() });
          }
        }
      }
    } catch (err) { console.error("External busy fetch error:", err); }
  }
  return busy;
}

/* ── Compute available slots ── */
function computeSlots(
  dateStr: string,
  template: Record<string, string[]>,
  duration: number,
  busySlots: {start:string;end:string}[],
  minNoticeMin: number,
  bufferBefore: number,
  bufferAfter: number,
  timezone: string,
): string[] {
  const dayOfWeek = ["sun","mon","tue","wed","thu","fri","sat"][new Date(dateStr + "T12:00:00").getDay()];
  const windows = template[dayOfWeek] || [];
  if (windows.length === 0) return [];

  const nowMs = Date.now();
  const slots: string[] = [];

  for (const win of windows) {
    const [startStr, endStr] = win.split("-");
    if (!startStr || !endStr) continue;
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);

    // Create times in UTC (simplified — user sees in their tz on frontend)
    const winStart = new Date(dateStr + "T00:00:00Z");
    winStart.setUTCHours(sh, sm, 0, 0);
    const winEnd = new Date(dateStr + "T00:00:00Z");
    winEnd.setUTCHours(eh, em, 0, 0);

    let cursor = winStart.getTime();
    const durationMs = duration * 60000;

    while (cursor + durationMs <= winEnd.getTime()) {
      const slotStart = cursor - bufferBefore * 60000;
      const slotEnd = cursor + durationMs + bufferAfter * 60000;

      // Check min notice
      if (cursor - nowMs < minNoticeMin * 60000) {
        cursor += 15 * 60000; // 15-min increments
        continue;
      }

      // Check conflicts with busy slots
      let conflict = false;
      for (const b of busySlots) {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        if (slotStart < be && slotEnd > bs) {
          conflict = true;
          break;
        }
      }

      if (!conflict) {
        slots.push(new Date(cursor).toISOString());
      }
      cursor += 15 * 60000;
    }
  }

  return slots;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expected: /booking or just body-based routing
    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action || url.searchParams.get("action") || "";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── GET METADATA (public, no date needed) ──
    if (action === "metadata") {
      const { slug } = body;
      if (!slug) {
        return new Response(JSON.stringify({ error: "slug required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: link } = await admin.from("booking_links").select("*").eq("public_slug", slug).eq("is_active", true).maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: "Booking link not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await admin.from("profiles").select("full_name, agency_name, agency_id").eq("user_id", link.user_id).maybeSingle();
      let agency: any = null;
      if (profile?.agency_id) {
        const { data: ag } = await admin.from("agencies").select("name, logo_url, website").eq("id", profile.agency_id).maybeSingle();
        agency = ag;
      }
      return new Response(JSON.stringify({
        link: { title: link.title, description: link.description, duration_minutes: link.duration_minutes, timezone: link.timezone },
        profile: { full_name: profile?.full_name || "Advisor", agency_name: profile?.agency_name || agency?.name || null },
        agency: agency ? { name: agency.name, logo_url: agency.logo_url, website: agency.website } : null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── GET AVAILABILITY (public) ──
    if (action === "availability") {
      const { slug, date } = body;
      if (!slug || !date) {
        return new Response(JSON.stringify({ error: "slug and date required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: link } = await admin.from("booking_links").select("*").eq("public_slug", slug).eq("is_active", true).maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: "Booking link not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get AURA calendar busy slots
      const { data: auraEvents } = await admin.from("calendar_events")
        .select("start_time, end_time")
        .eq("user_id", link.user_id)
        .gte("start_time", date + "T00:00:00Z")
        .lte("start_time", date + "T23:59:59Z")
        .in("status", ["scheduled"]);

      // Get already booked meetings
      const { data: bookedMeetings } = await admin.from("booked_meetings")
        .select("start_time, end_time")
        .eq("booking_link_id", link.id)
        .eq("status", "scheduled")
        .gte("start_time", date + "T00:00:00Z")
        .lte("start_time", date + "T23:59:59Z");

      // Get external calendar busy slots
      const externalBusy = await getExternalBusy(link.user_id, date, admin);

      const allBusy = [
        ...(auraEvents || []).map((e: any) => ({ start: e.start_time, end: e.end_time })),
        ...(bookedMeetings || []).map((e: any) => ({ start: e.start_time, end: e.end_time })),
        ...externalBusy,
      ];

      const slots = computeSlots(
        date, link.availability_template, link.duration_minutes,
        allBusy, link.min_notice_minutes, link.buffer_before, link.buffer_after, link.timezone,
      );

      // Get user profile + agency for display
      const { data: profile } = await admin.from("profiles").select("full_name, agency_name, agency_id").eq("user_id", link.user_id).maybeSingle();

      let agency: any = null;
      if (profile?.agency_id) {
        const { data: ag } = await admin.from("agencies").select("name, logo_url, website").eq("id", profile.agency_id).maybeSingle();
        agency = ag;
      }

      return new Response(JSON.stringify({
        slots,
        link: { title: link.title, description: link.description, duration_minutes: link.duration_minutes, timezone: link.timezone },
        profile: { full_name: profile?.full_name || "Advisor", agency_name: profile?.agency_name || agency?.name || null },
        agency: agency ? { name: agency.name, logo_url: agency.logo_url, website: agency.website } : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BOOK MEETING (public) ──
    if (action === "book") {
      const { slug, start_time, client_name, client_email, client_phone, notes } = body;
      if (!slug || !start_time || !client_name || !client_email) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: link } = await admin.from("booking_links").select("*").eq("public_slug", slug).eq("is_active", true).maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: "Booking link not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const startDt = new Date(start_time);
      const endDt = new Date(startDt.getTime() + link.duration_minutes * 60000);
      const dateStr = start_time.split("T")[0];

      // Re-check availability to avoid race conditions
      const { data: existingBookings } = await admin.from("booked_meetings")
        .select("start_time, end_time")
        .eq("booking_link_id", link.id)
        .eq("status", "scheduled")
        .gte("start_time", dateStr + "T00:00:00Z")
        .lte("start_time", dateStr + "T23:59:59Z");

      const { data: auraEvents } = await admin.from("calendar_events")
        .select("start_time, end_time")
        .eq("user_id", link.user_id)
        .gte("start_time", dateStr + "T00:00:00Z")
        .lte("start_time", dateStr + "T23:59:59Z")
        .in("status", ["scheduled"]);

      const allBusy = [
        ...(existingBookings || []).map((e: any) => ({ start: e.start_time, end: e.end_time })),
        ...(auraEvents || []).map((e: any) => ({ start: e.start_time, end: e.end_time })),
      ];

      const slotStart = startDt.getTime() - link.buffer_before * 60000;
      const slotEnd = endDt.getTime() + link.buffer_after * 60000;
      for (const b of allBusy) {
        const bs = new Date(b.start).getTime(), be = new Date(b.end).getTime();
        if (slotStart < be && slotEnd > bs) {
          return new Response(JSON.stringify({ error: "This time slot was just booked. Please choose another." }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Create booked meeting
      let externalEventId: string | null = null;

      // Push to connected calendars
      const { data: conns } = await admin.from("external_calendars").select("*").eq("user_id", link.user_id).eq("is_active", true);
      if (conns?.length) {
        for (const conn of conns) {
          const token = await ensureToken(conn, admin);
          if (!token) continue;
          try {
            if (conn.provider === "google") {
              const eventBody = {
                summary: `${link.title} — ${client_name}`,
                description: `Booked via AURA\n\nClient: ${client_name}\nEmail: ${client_email}${notes ? `\nNotes: ${notes}` : ""}`,
                start: { dateTime: startDt.toISOString(), timeZone: "UTC" },
                end: { dateTime: endDt.toISOString(), timeZone: "UTC" },
                attendees: [{ email: client_email }],
                conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
              };
              const r = await fetch(`${GOOGLE_CAL_BASE}/calendars/primary/events?conferenceDataVersion=1`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(eventBody),
              });
              if (r.ok) {
                const created = await r.json();
                externalEventId = created.id;
              }
            } else if (conn.provider === "outlook") {
              const graphBody = {
                subject: `${link.title} — ${client_name}`,
                body: { contentType: "Text", content: `Booked via AURA\n\nClient: ${client_name}\nEmail: ${client_email}${notes ? `\nNotes: ${notes}` : ""}` },
                start: { dateTime: startDt.toISOString(), timeZone: "UTC" },
                end: { dateTime: endDt.toISOString(), timeZone: "UTC" },
                attendees: [{ emailAddress: { address: client_email }, type: "required" }],
                isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness",
              };
              const r = await fetch(`${GRAPH_BASE}/me/events`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(graphBody),
              });
              if (r.ok) {
                const created = await r.json();
                externalEventId = created.id;
              }
            }
          } catch (err) { console.error("Calendar push error:", err); }
        }
      }

      // Save booked meeting
      const { error: insertErr } = await admin.from("booked_meetings").insert({
        booking_link_id: link.id,
        user_id: link.user_id,
        client_name, client_email, client_phone: client_phone || null,
        notes: notes || null,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        external_event_id: externalEventId,
      });
      if (insertErr) {
        console.error("Booked meeting insert error:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to save booking" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create AURA calendar event to block slot
      await admin.from("calendar_events").insert({
        user_id: link.user_id,
        title: `${link.title} — ${client_name}`,
        event_type: "other",
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        description: `Booked via AURA Link\nClient: ${client_name} (${client_email})${notes ? `\nNotes: ${notes}` : ""}`,
        attendees: [client_email],
        provider: "aura",
        status: "scheduled",
      });

      // Send notification to user
      await admin.from("notifications").insert({
        user_id: link.user_id,
        type: "pipeline",
        title: "New meeting booked",
        body: `${client_name} booked "${link.title}" for ${startDt.toLocaleDateString()} at ${startDt.toLocaleTimeString()}`,
        link: "/email",
      });

      // Send confirmation emails (best-effort via send-email function)
      try {
        const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", link.user_id).maybeSingle();
        const advisorName = profile?.full_name || "Your Advisor";

        // Email to client
        const edgeFnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/send-email";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        await fetch(edgeFnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            to: client_email,
            subject: `Your meeting with ${advisorName} is confirmed`,
            html: `<h2>Meeting Confirmed</h2>
              <p>Hi ${client_name},</p>
              <p>Your <strong>${link.title}</strong> with ${advisorName} has been scheduled.</p>
              <p><strong>Date:</strong> ${startDt.toDateString()}<br/><strong>Time:</strong> ${startDt.toUTCString().split(" ")[4]} UTC<br/><strong>Duration:</strong> ${link.duration_minutes} minutes</p>
              <p>You should also receive a calendar invitation shortly.</p>
              <p>— AURA</p>`,
          }),
        });

        // Email to advisor
        const { data: userProfile } = await admin.from("profiles").select("full_name").eq("user_id", link.user_id).maybeSingle();
        const { data: authUser } = await admin.auth.admin.getUserById(link.user_id);
        const advisorEmail = authUser?.user?.email;
        if (advisorEmail) {
          await fetch(edgeFnUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              to: advisorEmail,
              subject: `New meeting booked: ${client_name}`,
              html: `<h2>New Meeting Booked via AURA</h2>
                <p><strong>Client:</strong> ${client_name} (${client_email}${client_phone ? `, ${client_phone}` : ""})</p>
                <p><strong>Meeting:</strong> ${link.title}<br/><strong>Date:</strong> ${startDt.toDateString()}<br/><strong>Time:</strong> ${startDt.toUTCString().split(" ")[4]} UTC<br/><strong>Duration:</strong> ${link.duration_minutes} minutes</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
                <p>— AURA</p>`,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Email notification error:", emailErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("booking error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
