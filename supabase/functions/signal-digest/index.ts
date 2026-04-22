// Hourly cron — sends daily digest to users where local time matches digest_time.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function localHour(tz: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  } catch { return new Date().getUTCHours(); }
}

function buildEmailHtml(industry: string, items: any[]): string {
  const rows = items.map(it => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
      <a href="${it.source_url}" style="color:#111;text-decoration:none;font-weight:600;font-size:16px;">${it.title}</a>
      <div style="color:#666;font-size:14px;margin-top:4px;">${it.summary || ""}</div>
      <div style="color:#999;font-size:12px;margin-top:6px;">${it.source_name} · score ${it.importance_score}</div>
    </td></tr>`).join("");
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f7f7;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;">
      <h1 style="margin:0 0 4px 0;font-size:22px;">Signal · ${industry}</h1>
      <p style="color:#666;margin:0 0 16px 0;font-size:13px;">Your top stories today.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#999;font-size:12px;margin-top:24px;">You're receiving this because you opted into the daily Signal digest. Adjust at /connect/signal.</p>
    </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: prefs, error } = await supabase
      .from("signal_preferences")
      .select("user_id, digest_enabled, digest_time, digest_timezone, digest_last_sent_at, industry_override")
      .eq("digest_enabled", true);
    if (error) throw error;

    let sent = 0;
    for (const p of prefs || []) {
      const tz = p.digest_timezone || "America/New_York";
      const targetHour = Number((p.digest_time || "08:00").slice(0, 2));
      if (localHour(tz) !== targetHour) continue;
      // Don't double-send within 12h
      if (p.digest_last_sent_at && Date.now() - new Date(p.digest_last_sent_at).getTime() < 12 * 3600 * 1000) continue;

      // Resolve user email + industry
      const { data: { user } } = await supabase.auth.admin.getUserById(p.user_id);
      if (!user?.email) continue;
      const { data: profile } = await supabase.from("profiles").select("connect_vertical").eq("user_id", p.user_id).maybeSingle();
      const industry = p.industry_override || (profile as any)?.connect_vertical || "insurance";

      // Fetch top 5 from last 24h, excluding items the user dismissed
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: dismissed } = await supabase.from("signal_feedback").select("signal_item_id").eq("user_id", p.user_id).eq("reaction", "not_interested");
      const dismissedIds = new Set((dismissed || []).map((d: any) => d.signal_item_id));
      const { data: pool } = await supabase
        .from("signal_items").select("*").eq("industry", industry).gte("created_at", since)
        .order("importance_score", { ascending: false }).limit(20);
      const top = (pool || []).filter((i: any) => !dismissedIds.has(i.id)).slice(0, 5);
      if (top.length === 0) continue;

      const html = buildEmailHtml(industry, top);
      const sendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Signal <signal@buildingaura.site>",
          to: [user.email],
          subject: `Signal · ${top.length} stories worth your time today`,
          html,
        }),
      });
      if (sendResp.ok) {
        await supabase.from("signal_preferences").update({ digest_last_sent_at: new Date().toISOString() }).eq("user_id", p.user_id);
        sent++;
      } else {
        console.error("digest send failed", p.user_id, await sendResp.text());
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, candidates: prefs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signal-digest error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});