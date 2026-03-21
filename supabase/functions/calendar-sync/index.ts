import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecrypt, encryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CAL_BASE = "https://www.googleapis.com/calendar/v3";

/* ─── Token Refresh ─── */

async function refreshOutlookToken(encryptedRefreshToken: string) {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const plainRefreshToken = await safeDecrypt(encryptedRefreshToken);

  const resp = await fetch(OUTLOOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: plainRefreshToken,
      scope: "openid email Calendars.ReadWrite offline_access",
    }),
  });

  if (!resp.ok) {
    console.error("Outlook token refresh failed:", await resp.text());
    return null;
  }
  return await resp.json();
}

async function refreshGoogleToken(encryptedRefreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const plainRefreshToken = await safeDecrypt(encryptedRefreshToken);

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: plainRefreshToken,
    }),
  });

  if (!resp.ok) {
    console.error("Google token refresh failed:", await resp.text());
    return null;
  }
  return await resp.json();
}

/* ─── Ensure valid access token ─── */
async function ensureToken(calConn: any, adminClient: any) {
  if (new Date(calConn.token_expires_at) > new Date()) {
    // Decrypt stored access token
    return safeDecrypt(calConn.access_token);
  }

  const refreshed = calConn.provider === "outlook"
    ? await refreshOutlookToken(calConn.refresh_token)
    : await refreshGoogleToken(calConn.refresh_token);

  if (!refreshed) return null;

  // Encrypt new tokens before storing
  const encAccessToken = await encryptToken(refreshed.access_token);
  const encRefreshToken = refreshed.refresh_token
    ? await encryptToken(refreshed.refresh_token)
    : calConn.refresh_token; // keep existing encrypted value

  await adminClient.from("external_calendars").update({
    access_token: encAccessToken,
    refresh_token: encRefreshToken,
    token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
  }).eq("id", calConn.id);

  return refreshed.access_token;
}

/* ─── Outlook Sync ─── */
async function syncOutlook(accessToken: string, userId: string, adminClient: any) {
  const now = new Date();
  const startRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endRange = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

  const resp = await fetch(
    `${GRAPH_BASE}/me/calendarView?startDateTime=${startRange}&endDateTime=${endRange}&$top=200&$orderby=start/dateTime&$select=id,subject,bodyPreview,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl`,
    { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } }
  );

  if (!resp.ok) {
    console.error("Graph calendar error:", await resp.text());
    return { synced: 0, total: 0, error: "Failed to fetch Outlook events" };
  }

  const data = await resp.json();
  const events = data.value || [];
  let synced = 0;

  for (const oe of events) {
    const startTime = oe.start?.dateTime ? new Date(oe.start.dateTime + "Z").toISOString() : null;
    const endTime = oe.end?.dateTime ? new Date(oe.end.dateTime + "Z").toISOString() : null;
    if (!startTime || !endTime) continue;

    const attendees = (oe.attendees || []).map((a: any) => a.emailAddress?.address).filter(Boolean);

    const { error } = await adminClient.from("calendar_events").upsert({
      user_id: userId,
      external_event_id: oe.id,
      provider: "outlook",
      title: oe.subject || "(No subject)",
      description: oe.bodyPreview || null,
      location: oe.location?.displayName || null,
      start_time: startTime,
      end_time: endTime,
      attendees: attendees.length > 0 ? attendees : null,
      event_type: "other",
      status: "scheduled",
      metadata: {
        online_meeting_url: oe.onlineMeetingUrl || null,
        is_online: oe.isOnlineMeeting || false,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,external_event_id" });

    if (error) {
      console.error(`Outlook upsert error for event ${oe.id}:`, JSON.stringify(error));
    } else {
      synced++;
    }
  }

  return { synced, total: events.length };
}

/* ─── Google Calendar Sync ─── */
async function syncGoogle(accessToken: string, userId: string, adminClient: any) {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

  const resp = await fetch(
    `${GOOGLE_CAL_BASE}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!resp.ok) {
    console.error("Google Calendar error:", await resp.text());
    return { synced: 0, total: 0, error: "Failed to fetch Google Calendar events" };
  }

  const data = await resp.json();
  const events = data.items || [];
  let synced = 0;

  for (const ge of events) {
    const startTime = ge.start?.dateTime || ge.start?.date;
    const endTime = ge.end?.dateTime || ge.end?.date;
    if (!startTime || !endTime) continue;

    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();

    const attendees = (ge.attendees || []).map((a: any) => a.email).filter(Boolean);

    const { error } = await adminClient.from("calendar_events").upsert({
      user_id: userId,
      external_event_id: ge.id,
      provider: "google",
      title: ge.summary || "(No title)",
      description: ge.description || null,
      location: ge.location || null,
      start_time: startISO,
      end_time: endISO,
      attendees: attendees.length > 0 ? attendees : null,
      event_type: "other",
      status: ge.status === "cancelled" ? "cancelled" : "scheduled",
      metadata: {
        hangout_link: ge.hangoutLink || null,
        html_link: ge.htmlLink || null,
        is_online: !!ge.hangoutLink,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,external_event_id" });

    if (error) {
      console.error(`Google upsert error for event ${ge.id}:`, JSON.stringify(error));
    } else {
      synced++;
    }
  }

  return { synced, total: events.length };
}

/* ─── Google Create Event ─── */
async function createGoogleEvent(accessToken: string, body: any) {
  const { title, start, end, description, location, attendees, conferenceData } = body;

  const eventBody: any = {
    summary: title,
    description: description || "",
    start: { dateTime: start, timeZone: "UTC" },
    end: { dateTime: end, timeZone: "UTC" },
  };

  if (location) eventBody.location = location;
  if (attendees?.length > 0) {
    eventBody.attendees = attendees.map((email: string) => ({ email }));
  }
  if (conferenceData) {
    eventBody.conferenceData = conferenceData;
  }

  const url = conferenceData
    ? `${GOOGLE_CAL_BASE}/calendars/primary/events?conferenceDataVersion=1`
    : `${GOOGLE_CAL_BASE}/calendars/primary/events`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!resp.ok) {
    console.error("Google create event error:", await resp.text());
    return null;
  }
  return await resp.json();
}

/* ─── Main Handler ─── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const body = await req.json();
    const { action, provider: requestedProvider } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- SYNC ---
    if (action === "sync") {
      const { data: connections } = await adminClient
        .from("external_calendars")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (!connections || connections.length === 0) {
        return new Response(JSON.stringify({ error: "No calendar connected" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];

      for (const conn of connections) {
        if (requestedProvider && conn.provider !== requestedProvider) continue;

        const accessToken = await ensureToken(conn, adminClient);
        if (!accessToken) {
          results.push({ provider: conn.provider, error: "Token expired. Please reconnect." });
          continue;
        }

        const result = conn.provider === "outlook"
          ? await syncOutlook(accessToken, userId, adminClient)
          : await syncGoogle(accessToken, userId, adminClient);

        results.push({ provider: conn.provider, ...result });
      }

      const totalSynced = results.reduce((s, r) => s + (r.synced || 0), 0);
      return new Response(JSON.stringify({ success: true, synced: totalSynced, details: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CREATE EVENT ---
    if (action === "create_event") {
      let targetProvider = requestedProvider || "outlook";
      if (targetProvider === "gmail") targetProvider = "google";
      
      const { data: calConn } = await adminClient
        .from("external_calendars")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", targetProvider)
        .eq("is_active", true)
        .maybeSingle();

      if (!calConn) {
        return new Response(JSON.stringify({ error: `No ${targetProvider} calendar connected` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await ensureToken(calConn, adminClient);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Calendar token expired. Please reconnect." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetProvider === "google") {
        const created = await createGoogleEvent(accessToken, body);
        if (!created) {
          return new Response(JSON.stringify({ error: "Failed to create Google Calendar event" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, google_event_id: created.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { title, start, end, description, location, attendees } = body;
        const graphBody: any = {
          subject: title,
          body: { contentType: "Text", content: description || "" },
          start: { dateTime: start, timeZone: "UTC" },
          end: { dateTime: end, timeZone: "UTC" },
        };
        if (location) graphBody.location = { displayName: location };
        if (attendees?.length > 0) {
          graphBody.attendees = attendees.map((email: string) => ({
            emailAddress: { address: email }, type: "required",
          }));
        }

        const createResp = await fetch(`${GRAPH_BASE}/me/events`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(graphBody),
        });

        if (!createResp.ok) {
          console.error("Graph create event error:", await createResp.text());
          return new Response(JSON.stringify({ error: "Failed to create Outlook event" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const created = await createResp.json();
        return new Response(JSON.stringify({ success: true, outlook_event_id: created.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- CREATE MEET LINK ---
    if (action === "create_meet") {
      const { data: calConn } = await adminClient
        .from("external_calendars")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "google")
        .eq("is_active", true)
        .maybeSingle();

      if (!calConn) {
        return new Response(JSON.stringify({ error: "No Google Calendar connected. Connect Google Calendar in Settings to create Meet links." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await ensureToken(calConn, adminClient);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Google Calendar token expired. Please reconnect." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const meetEvent = await createGoogleEvent(accessToken, {
        title: body.title || "Quick Meeting",
        start: body.start || new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        end: body.end || new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        description: body.description || "Meeting created from AURA",
        attendees: body.attendees || [],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      });

      if (!meetEvent) {
        return new Response(JSON.stringify({ error: "Failed to create Google Meet" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const meetLink = meetEvent.hangoutLink || meetEvent.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || null;

      return new Response(JSON.stringify({ success: true, meet_link: meetLink, event_id: meetEvent.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- BUSY SLOTS ---
    if (action === "busy_slots") {
      const { start, end } = body;
      const targetProvider = requestedProvider || "outlook";

      const { data: calConn } = await adminClient
        .from("external_calendars")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", targetProvider)
        .eq("is_active", true)
        .maybeSingle();

      if (!calConn) {
        return new Response(JSON.stringify({ busy_slots: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await ensureToken(calConn, adminClient);
      if (!accessToken) {
        return new Response(JSON.stringify({ busy_slots: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetProvider === "gmail") {
        const resp = await fetch(
          `${GOOGLE_CAL_BASE}/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&maxResults=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!resp.ok) {
          return new Response(JSON.stringify({ busy_slots: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const data = await resp.json();
        const busySlots = (data.items || [])
          .filter((e: any) => e.status !== "cancelled")
          .map((e: any) => ({
            start: e.start?.dateTime ? new Date(e.start.dateTime).toISOString() : null,
            end: e.end?.dateTime ? new Date(e.end.dateTime).toISOString() : null,
          }))
          .filter((s: any) => s.start && s.end);

        return new Response(JSON.stringify({ busy_slots: busySlots }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const scheduleResp = await fetch(
          `${GRAPH_BASE}/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=start,end,showAs&$top=100`,
          { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } }
        );
        if (!scheduleResp.ok) {
          return new Response(JSON.stringify({ busy_slots: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const scheduleData = await scheduleResp.json();
        const busySlots = (scheduleData.value || [])
          .filter((e: any) => e.showAs === "busy" || e.showAs === "tentative")
          .map((e: any) => ({
            start: e.start?.dateTime ? new Date(e.start.dateTime + "Z").toISOString() : null,
            end: e.end?.dateTime ? new Date(e.end.dateTime + "Z").toISOString() : null,
          }));

        return new Response(JSON.stringify({ busy_slots: busySlots }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- DISCONNECT ---
    if (action === "disconnect") {
      const targetProvider = requestedProvider || "outlook";
      await adminClient.from("external_calendars").delete().eq("user_id", userId).eq("provider", targetProvider);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calendar-sync error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});