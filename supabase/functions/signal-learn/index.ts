// Nightly job: aggregate signal_feedback (90d window) into topic/source weights with decay.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REACTION_WEIGHT: Record<string, number> = {
  great_info: 1.0,
  saved: 0.75,
  clicked: 0.3,
  viewed: 0.05,
  not_interested: -1.0,
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    // Fetch all feedback in one shot (paginate if > 50k rows)
    const { data: feedback, error } = await supabase
      .from("signal_feedback")
      .select("user_id, reaction, topics_snapshot, source_snapshot, created_at")
      .gte("created_at", since);
    if (error) throw error;

    // Group by user_id
    const byUser = new Map<string, any[]>();
    for (const fb of feedback || []) {
      const arr = byUser.get(fb.user_id) || [];
      arr.push(fb);
      byUser.set(fb.user_id, arr);
    }

    let updated = 0;
    for (const [userId, items] of byUser) {
      const topicWeights: Record<string, number> = {};
      const sourceWeights: Record<string, number> = {};
      for (const fb of items) {
        const w = REACTION_WEIGHT[fb.reaction] ?? 0;
        if (w === 0) continue;
        const ageDays = (Date.now() - new Date(fb.created_at).getTime()) / 86_400_000;
        const decay = Math.pow(0.95, ageDays / 7);
        const wd = w * decay;
        for (const t of fb.topics_snapshot || []) {
          topicWeights[t] = (topicWeights[t] || 0) + wd;
        }
        if (fb.source_snapshot) {
          sourceWeights[fb.source_snapshot] = (sourceWeights[fb.source_snapshot] || 0) + wd;
        }
      }
      for (const k in topicWeights) topicWeights[k] = clamp(topicWeights[k], -5, 5);
      for (const k in sourceWeights) sourceWeights[k] = clamp(sourceWeights[k], -3, 3);

      await supabase.from("signal_preferences").upsert({
        user_id: userId,
        topic_weights: topicWeights,
        source_weights: sourceWeights,
      }, { onConflict: "user_id" });
      updated++;
    }

    return new Response(JSON.stringify({ ok: true, users_updated: updated, feedback_rows: feedback?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signal-learn error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});