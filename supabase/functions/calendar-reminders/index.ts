import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Calendar Reminders Edge Function
 * 
 * Actions:
 *  - "meeting_reminders": Sends email reminders 15 min before meetings
 *  - "weekly_digest": Sends weekly Sunday digest of upcoming events
 * 
 * Both are triggered via pg_cron.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "meeting_reminders";

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.log("[calendar-reminders] RESEND_API_KEY not set, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "No RESEND_API_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "meeting_reminders") {
      return await handleMeetingReminders(adminClient, RESEND_API_KEY);
    } else if (action === "weekly_digest") {
      return await handleWeeklyDigest(adminClient, RESEND_API_KEY);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[calendar-reminders] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ─── 15-min Meeting Reminders ─── */
async function handleMeetingReminders(adminClient: any, apiKey: string) {
  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);
  const in20 = new Date(now.getTime() + 20 * 60 * 1000);

  // Find events starting in ~15 minutes (window: 15-20 min from now)
  const { data: events, error } = await adminClient
    .from("calendar_events")
    .select("id, title, start_time, end_time, location, attendees, user_id, metadata")
    .gte("start_time", in15.toISOString())
    .lt("start_time", in20.toISOString())
    .eq("status", "scheduled");

  if (error) {
    console.error("[calendar-reminders] Query error:", error);
    return new Response(JSON.stringify({ error: "DB query failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No upcoming meetings" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Group events by user
  const userEvents: Record<string, any[]> = {};
  for (const ev of events) {
    if (!userEvents[ev.user_id]) userEvents[ev.user_id] = [];
    userEvents[ev.user_id].push(ev);
  }

  let sent = 0;
  for (const [userId, evts] of Object.entries(userEvents)) {
    // Get user email
    const { data: { user } } = await adminClient.auth.admin.getUserById(userId);
    if (!user?.email) continue;

    for (const ev of evts) {
      const startDt = new Date(ev.start_time);
      const timeStr = startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const dateStr = startDt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

      const html = buildReminderEmail(ev.title, dateStr, timeStr, ev.location);

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "AuRa Calendar <calendar@aura-risk-group.com>",
            to: [user.email],
            subject: `⏰ In 15 min: ${ev.title}`,
            html,
          }),
        });
        if (resp.ok) sent++;
        else console.error("[calendar-reminders] Resend error:", await resp.text());
      } catch (e) {
        console.error("[calendar-reminders] Send error:", e);
      }
    }
  }

  return new Response(JSON.stringify({ sent, total_events: events.length }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ─── Weekly Digest (Sunday) ─── */
async function handleWeeklyDigest(adminClient: any, apiKey: string) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() + 1); // Sunday → Monday
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Get all users with calendar events this coming week
  const { data: events, error } = await adminClient
    .from("calendar_events")
    .select("id, title, start_time, end_time, location, attendees, user_id, event_type")
    .gte("start_time", monday.toISOString())
    .lte("start_time", sunday.toISOString())
    .eq("status", "scheduled")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[calendar-reminders] Digest query error:", error);
    return new Response(JSON.stringify({ error: "DB query failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No events this week" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Group by user
  const userEvents: Record<string, any[]> = {};
  for (const ev of events) {
    if (!userEvents[ev.user_id]) userEvents[ev.user_id] = [];
    userEvents[ev.user_id].push(ev);
  }

  let sent = 0;
  for (const [userId, evts] of Object.entries(userEvents)) {
    const { data: { user } } = await adminClient.auth.admin.getUserById(userId);
    if (!user?.email) continue;

    const weekRange = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const html = buildDigestEmail(evts, weekRange);

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AuRa Calendar <calendar@aura-risk-group.com>",
          to: [user.email],
          subject: `📅 Your week ahead: ${evts.length} event${evts.length !== 1 ? "s" : ""} (${weekRange})`,
          html,
        }),
      });
      if (resp.ok) sent++;
      else console.error("[calendar-reminders] Digest send error:", await resp.text());
    } catch (e) {
      console.error("[calendar-reminders] Digest send error:", e);
    }
  }

  return new Response(JSON.stringify({ sent, total_users: Object.keys(userEvents).length }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ─── Email Templates ─── */

function buildReminderEmail(title: string, date: string, time: string, location?: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:24px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#1a1a2e;padding:20px 24px;">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">⏰ Meeting in 15 minutes</h1>
  </div>
  <div style="padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#111;">${escHtml(title)}</h2>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0;color:#166534;font-size:14px;"><strong>${escHtml(date)}</strong> at <strong>${escHtml(time)}</strong></p>
      ${location ? `<p style="margin:4px 0 0;color:#166534;font-size:13px;">📍 ${escHtml(location)}</p>` : ""}
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">This is an automated reminder from your AuRa Calendar.</p>
  </div>
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">AuRa Connect · Powered by AuRa Risk Group</p>
  </div>
</div>
</body></html>`;
}

function buildDigestEmail(events: any[], weekRange: string): string {
  const rows = events.map(ev => {
    const d = new Date(ev.start_time);
    const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;white-space:nowrap;">${escHtml(day)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;white-space:nowrap;">${escHtml(time)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111;font-weight:500;">${escHtml(ev.title)}</td>
    </tr>`;
  }).join("");

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#1a1a2e;padding:20px 24px;">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">📅 Your Week Ahead</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${escHtml(weekRange)} · ${events.length} event${events.length !== 1 ? "s" : ""}</p>
  </div>
  <div style="padding:4px 8px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Day</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Time</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Event</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="padding:16px 24px;background:#f0fdf4;border-top:1px solid #bbf7d0;">
    <p style="margin:0;color:#166534;font-size:13px;">💡 You'll also receive a reminder 15 minutes before each meeting.</p>
  </div>
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">AuRa Connect · Powered by AuRa Risk Group</p>
  </div>
</div>
</body></html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
