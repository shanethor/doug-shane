// Cron every 30 min — retries image extraction with progressively different strategies.
// Falls back to AI generation after 3 failed scrape attempts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tryFetchImage, generateAiCover } from "../_shared/signal-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEXT_STRATEGY: Record<string, string> = {
  og: "twitter_card",
  twitter_card: "first_img",
  first_img: "ai_generate",
  ai_generate: "ai_generate",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Process up to 25 queued items per run
    const { data: queue, error } = await supabase
      .from("signal_image_queue")
      .select("signal_item_id, attempts, next_strategy")
      .lte("attempts", 4)
      .order("attempts", { ascending: true })
      .limit(25);
    if (error) throw error;

    let resolved = 0, generated = 0;
    for (const q of queue || []) {
      const { data: item } = await supabase.from("signal_items").select("id, title, source_url, image_url").eq("id", q.signal_item_id).maybeSingle();
      if (!item || item.image_url) {
        await supabase.from("signal_image_queue").delete().eq("signal_item_id", q.signal_item_id);
        continue;
      }

      const strategy = q.next_strategy as "og" | "twitter_card" | "first_img" | "ai_generate";
      let imgUrl: string | null = null;
      if (strategy === "ai_generate") {
        imgUrl = await generateAiCover(item.title, apiKey);
        if (imgUrl) generated++;
      } else {
        imgUrl = await tryFetchImage(item.source_url, strategy, 5000);
      }

      if (imgUrl) {
        await supabase.from("signal_items").update({ image_url: imgUrl, ai_image: strategy === "ai_generate" }).eq("id", item.id);
        await supabase.from("signal_image_queue").delete().eq("signal_item_id", item.id);
        resolved++;
      } else {
        const next = NEXT_STRATEGY[strategy] || "ai_generate";
        await supabase.from("signal_image_queue").update({
          attempts: q.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          next_strategy: next,
        }).eq("signal_item_id", item.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: queue?.length || 0, resolved, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signal-image-retry error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});