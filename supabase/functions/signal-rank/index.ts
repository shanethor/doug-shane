// Signal v2: per-user ranking against the shared signal_items pool.
// Hybrid scoring: importance + topic/source weights + recency + freshness + diversity.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function recencyBoost(publishedAt: string | null): number {
  if (!publishedAt) return 0;
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  if (hours < 6) return 20;
  if (hours < 24) return 15;
  if (hours < 48) return 8;
  if (hours < 72) return 3;
  return 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function explainScore(item: any, user: any): string {
  const reasons: string[] = [];
  if (item.published_at) {
    const hours = (Date.now() - new Date(item.published_at).getTime()) / 3_600_000;
    if (hours < 6) reasons.push("Breaking");
  }
  const matched = (item.topics || []).filter((t: string) => (user.topic_weights?.[t] || 0) > 2);
  if (matched.length) reasons.push(`You like ${matched[0]}`);
  if ((user.source_weights?.[item.source_name] || 0) > 2) reasons.push(`You trust ${item.source_name}`);
  if (item.importance_score > 80) reasons.push("High industry impact");
  if (item.signal_type === "regulatory") reasons.push("Regulatory");
  return reasons.slice(0, 2).join(" · ") || "New in your industry";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const industry: string = body.industry || "insurance";
    const topN: number = body.topN || 30;

    const [{ data: prefs }, { data: dismissed }] = await Promise.all([
      supabase.from("signal_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("signal_feedback").select("signal_item_id, reaction").eq("user_id", user.id).eq("reaction", "not_interested"),
    ]);

    const userCtx = {
      topic_weights: (prefs as any)?.topic_weights || {},
      source_weights: (prefs as any)?.source_weights || {},
      blocked_topics: new Set<string>(((prefs as any)?.blocked_topics) || []),
      blocked_sources: new Set<string>(((prefs as any)?.blocked_sources) || []),
      custom_topics: ((prefs as any)?.custom_topics || []).map((t: string) => t.toLowerCase()),
      last_seen_at: (prefs as any)?.last_seen_at ? new Date((prefs as any).last_seen_at).getTime() : 0,
    };
    const dismissedIds = new Set<string>((dismissed || []).map((d: any) => d.signal_item_id));

    // Pull last 72h candidates for the industry
    const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    const { data: pool, error: poolErr } = await supabase
      .from("signal_items")
      .select("*")
      .eq("industry", industry)
      .gte("created_at", since)
      .order("importance_score", { ascending: false })
      .limit(300);
    if (poolErr) throw poolErr;

    const filtered = (pool || []).filter((it: any) => {
      if (dismissedIds.has(it.id)) return false;
      if (userCtx.blocked_sources.has(it.source_name)) return false;
      if ((it.topics || []).some((t: string) => userCtx.blocked_topics.has(t))) return false;
      return true;
    });

    const scored = filtered.map((item: any) => {
      const importance = item.importance_score || 50;
      const topicBoost = clamp(
        (item.topics || []).reduce((s: number, t: string) => s + (userCtx.topic_weights[t] || 0), 0) * 5,
        -25, 25
      );
      const sourceBoost = clamp((userCtx.source_weights[item.source_name] || 0) * 3, -10, 10);
      const recency = recencyBoost(item.published_at);
      const freshness = userCtx.last_seen_at && new Date(item.created_at).getTime() > userCtx.last_seen_at ? 10 : 0;
      // Custom topic boost: matches title/summary/topics against user-followed subjects
      const haystack = `${item.title || ""} ${item.summary || ""} ${(item.topics || []).join(" ")}`.toLowerCase();
      const customMatches = userCtx.custom_topics.filter((t: string) => t && haystack.includes(t));
      const customBoost = clamp(customMatches.length * 20, 0, 40);
      const userScore = clamp(importance + topicBoost + sourceBoost + recency + freshness + customBoost, 0, 200);
      return { ...item, user_score: userScore, why: explainScore(item, userCtx) };
    });

    scored.sort((a: any, b: any) => b.user_score - a.user_score);

    // Diversity: max 3 per source in top N
    const counts: Record<string, number> = {};
    const ranked: any[] = [];
    const overflow: any[] = [];
    for (const it of scored) {
      const k = it.source_name || "unknown";
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] <= 3) ranked.push(it); else overflow.push(it);
      if (ranked.length >= topN) break;
    }
    while (ranked.length < topN && overflow.length) ranked.push(overflow.shift());

    // Update last_seen_at so next visit's "freshness" boost applies to newer items only
    await supabase.from("signal_preferences").upsert({
      user_id: user.id,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ items: ranked, total_pool: pool?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signal-rank error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});