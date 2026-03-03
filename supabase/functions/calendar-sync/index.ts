import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function refreshOutlookToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const resp = await fetch(OUTLOOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "openid email Calendars.ReadWrite offline_access",
    }),
  });

  if (!resp.ok) {
    console.error("Token refresh failed:", await resp.text());
    return null;
  }

  return await resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's calendar connection
    const { data: calConn } = await adminClient
      .from("external_calendars")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "outlook")
      .eq("is_active", true)
      .maybeSingle();

    if (!calConn && action !== "connect") {
      return new Response(JSON.stringify({ error: "No calendar connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if expired
    let accessToken = calConn?.access_token;
    if (calConn && new Date(calConn.token_expires_at) <= new Date()) {
      const refreshed = await refreshOutlookToken(calConn.refresh_token);
      if (!refreshed) {
        return new Response(JSON.stringify({ error: "Calendar token expired. Please reconnect." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshed.access_token;
      await adminClient.from("external_calendars").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || calConn.refresh_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("id", calConn.id);
    }

    // --- CONNECT (OAuth exchange for calendar scope) ---
    if (action === "connect") {
      const { code, redirect_uri } = body;
      const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
      const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;

      const tokenResp = await fetch(OUTLOOK_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri,
          grant_type: "authorization_code",
          scope: "openid email Calendars.ReadWrite offline_access",
        }),
      });

      const tokenData = await tokenResp.json();
      if (!tokenResp.ok) {
        console.error("Calendar token exchange failed:", tokenData);
        return new Response(JSON.stringify({ error: "Failed to connect calendar" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user email
      const meResp = await fetch(`${GRAPH_BASE}/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const me = await meResp.json();
      const email = me.mail || me.userPrincipalName;

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      await adminClient.from("external_calendars").upsert({
        user_id: userId,
        provider: "outlook",
        email_address: email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" });

      return new Response(JSON.stringify({ success: true, email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SYNC: Pull events from Outlook ---
    if (action === "sync") {
      const now = new Date();
      const startRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endRange = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

      const eventsResp = await fetch(
        `${GRAPH_BASE}/me/calendarView?startDateTime=${startRange}&endDateTime=${endRange}&$top=200&$orderby=start/dateTime&$select=id,subject,bodyPreview,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl`,
        { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } }
      );

      if (!eventsResp.ok) {
        const errText = await eventsResp.text();
        console.error("Graph calendar error:", errText);
        return new Response(JSON.stringify({ error: "Failed to fetch Outlook events" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventsData = await eventsResp.json();
      const outlookEvents = eventsData.value || [];

      let synced = 0;
      for (const oe of outlookEvents) {
        const startTime = oe.start?.dateTime ? new Date(oe.start.dateTime + "Z").toISOString() : null;
        const endTime = oe.end?.dateTime ? new Date(oe.end.dateTime + "Z").toISOString() : null;
        if (!startTime || !endTime) continue;

        const attendees = (oe.attendees || [])
          .map((a: any) => a.emailAddress?.address)
          .filter(Boolean);

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

        if (!error) synced++;
      }

      return new Response(JSON.stringify({ success: true, synced, total: outlookEvents.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CREATE EVENT: Push to Outlook ---
    if (action === "create_event") {
      const { title, start, end, description, location, attendees } = body;

      const graphBody: any = {
        subject: title,
        body: { contentType: "Text", content: description || "" },
        start: { dateTime: start, timeZone: "UTC" },
        end: { dateTime: end, timeZone: "UTC" },
      };

      if (location) graphBody.location = { displayName: location };
      if (attendees && attendees.length > 0) {
        graphBody.attendees = attendees.map((email: string) => ({
          emailAddress: { address: email },
          type: "required",
        }));
      }

      const createResp = await fetch(`${GRAPH_BASE}/me/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphBody),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error("Graph create event error:", errText);
        return new Response(JSON.stringify({ error: "Failed to create Outlook event" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const created = await createResp.json();
      return new Response(JSON.stringify({ success: true, outlook_event_id: created.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- BUSY SLOTS: Read free/busy for scheduling ---
    if (action === "busy_slots") {
      const { start, end } = body;
      const scheduleResp = await fetch(`${GRAPH_BASE}/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=start,end,showAs&$top=100`, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
      });

      if (!scheduleResp.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch busy slots" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // --- DISCONNECT ---
    if (action === "disconnect") {
      await adminClient.from("external_calendars").delete().eq("user_id", userId).eq("provider", "outlook");
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
