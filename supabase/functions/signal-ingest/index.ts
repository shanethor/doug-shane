// Signal v2 ingest: scheduled global pull (cron every 2h).
// Uses service-role client; no JWT required.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ALL_INDUSTRIES, getSourceConfig, NITTER_INSTANCES, TIER_1_SOURCES } from "../_shared/signal-sources.ts";
import { fetchRSS, fetchReddit, fetchNitter, fetchHackerNews, sha256Hex, simhash53, hammingDistance, scoreBatch, ruleScore, tryFetchImage, type RawItem } from "../_shared/signal-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function ingestIndustry(supabase: any, industry: string) {
  const runId = crypto.randomUUID();
  const { error: runErr } = await supabase.from("signal_ingest_runs").insert({
    id: runId, industry, started_at: new Date().toISOString(),
  });
  if (runErr) console.error("run insert err", runErr);

  const cfg = getSourceConfig(industry);
  const errorLog: any[] = [];
  let attempted = 0, failed = 0;

  const sourceJobs: Array<Promise<{ url: string; items: RawItem[]; error?: string }>> = [];

  for (const url of cfg.rss_news) {
    attempted++;
    sourceJobs.push(
      fetchRSS(url, "news", 10_000)
        .then(items => ({ url, items }))
        .catch(e => { failed++; return { url, items: [], error: String(e).slice(0, 200) }; })
    );
  }
  for (const sub of cfg.reddit) {
    attempted++;
    sourceJobs.push(
      fetchReddit(sub, 15_000)
        .then(items => ({ url: `reddit:${sub}`, items }))
        .catch(e => { failed++; return { url: `reddit:${sub}`, items: [], error: String(e).slice(0, 200) }; })
    );
  }
  for (const handle of cfg.nitter_handles) {
    attempted++;
    sourceJobs.push(
      fetchNitter(handle, NITTER_INSTANCES, 12_000)
        .then(items => ({ url: `nitter:${handle}`, items }))
        .catch(e => { failed++; return { url: `nitter:${handle}`, items: [], error: String(e).slice(0, 200) }; })
    );
  }
  for (const url of cfg.regulatory) {
    attempted++;
    sourceJobs.push(
      fetchRSS(url, "reg", 10_000)
        .then(items => ({ url, items }))
        .catch(e => { failed++; return { url, items: [], error: String(e).slice(0, 200) }; })
    );
  }
  // Always pull HN as a safety baseline so the feed never sits empty
  sourceJobs.push(
    fetchHackerNews(8).then(items => ({ url: "hn", items })).catch(() => ({ url: "hn", items: [] }))
  );

  const results = await Promise.all(sourceJobs);
  const allItems: RawItem[] = results.flatMap(r => r.items);

  // Update source health
  for (const r of results) {
    if (!r.url.startsWith("reddit:") && !r.url.startsWith("nitter:") && r.url !== "hn") {
      const newStatus = r.error ? "broken" : (r.items.length === 0 ? "stale" : "healthy");
      await supabase.from("signal_source_health").upsert({
        source_url: r.url,
        industry,
        last_successful_pull: r.items.length > 0 ? new Date().toISOString() : undefined,
        consecutive_empty_pulls: r.items.length === 0 && !r.error ? 1 : 0,
        consecutive_errors: r.error ? 1 : 0,
        status: newStatus,
        last_error: r.error || null,
      }, { onConflict: "source_url" });
    }
    if (r.error) errorLog.push({ url: r.url, error: r.error });
  }

  // Dedupe against last 3 days
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("signal_items")
    .select("hash, title_simhash, source_url")
    .gte("created_at", since);
  const seenHashes = new Set<string>((existing || []).map((e: any) => e.hash));
  const seenSimhashes: bigint[] = (existing || []).map((e: any) => e.title_simhash ? BigInt(e.title_simhash) : 0n).filter((b: bigint) => b !== 0n);

  const fresh: Array<RawItem & { hash: string; simhash: bigint }> = [];
  const localHashes = new Set<string>();
  for (const it of allItems) {
    const h = await sha256Hex(it.title + it.link);
    if (seenHashes.has(h) || localHashes.has(h)) continue;
    const sh = await simhash53(it.title);
    let dup = false;
    for (const old of seenSimhashes) {
      if (hammingDistance(sh, old) <= 6) { dup = true; break; }
    }
    if (dup) continue;
    localHashes.add(h);
    fresh.push({ ...it, hash: h, simhash: sh });
  }

  if (fresh.length === 0) {
    await supabase.from("signal_ingest_runs").update({
      finished_at: new Date().toISOString(),
      sources_attempted: attempted, sources_failed: failed,
      items_fetched: allItems.length, items_after_dedupe: 0, items_after_scoring: 0,
      error_log: errorLog,
    }).eq("id", runId);
    return { industry, fresh: 0, inserted: 0 };
  }

  // Score in batches of 10 with rule-based fallback
  const scored: Array<typeof fresh[0] & { importance_score: number; topics: string[]; signal_type: string; summary: string }> = [];
  let geminiFailures = 0;
  for (let i = 0; i < fresh.length; i += 10) {
    const batch = fresh.slice(i, i + 10);
    let result = await scoreBatch(batch, industry, LOVABLE_API_KEY);
    if (!result && geminiFailures < 3) {
      // Retry once with a smaller batch
      result = await scoreBatch(batch.slice(0, 5), industry, LOVABLE_API_KEY);
    }
    if (result) {
      const map = new Map(result.map(r => [r.index, r]));
      batch.forEach((it, j) => {
        const s = map.get(j);
        scored.push({ ...it, ...(s ? { importance_score: s.importance_score, topics: s.topics, signal_type: s.signal_type, summary: s.summary } : ruleScore(it, TIER_1_SOURCES)) });
      });
    } else {
      geminiFailures++;
      batch.forEach(it => scored.push({ ...it, ...ruleScore(it, TIER_1_SOURCES) }));
      if (geminiFailures >= 3) errorLog.push({ url: "gemini", error: "circuit-broken-falling-back-to-rules" });
    }
  }

  // Try og:image quickly for top 30 by score; failures go to image queue
  const topForImage = [...scored].sort((a, b) => b.importance_score - a.importance_score).slice(0, 30);
  const imageMap = new Map<string, string | null>();
  await Promise.all(topForImage.map(async it => {
    const img = await tryFetchImage(it.link, "og", 4000);
    imageMap.set(it.hash, img);
  }));

  const rows = scored.map(it => {
    const tier1 = TIER_1_SOURCES.has(it.source);
    const sourceTier = it.source_tier ?? (tier1 ? 1 : (it.source_kind === "reddit" ? 4 : it.source_kind === "nitter" ? 3 : 2));
    const img = imageMap.get(it.hash);
    return {
      title: it.title, summary: it.summary, source_name: it.source, source_url: it.link,
      image_url: img || null, ai_image: false,
      industry, sub_vertical: null,
      topics: it.topics, signal_type: it.signal_type, source_kind: it.source_kind,
      importance_score: Math.round(it.importance_score),
      hash: it.hash, title_simhash: it.simhash.toString(),
      source_tier: sourceTier,
      engagement: it.engagement || null,
      ingest_run_id: runId,
      raw: { description: it.description },
      published_at: it.pubDate ? new Date(it.pubDate).toISOString() : null,
    };
  });

  const { data: inserted, error: insErr } = await supabase
    .from("signal_items")
    .upsert(rows, { onConflict: "hash", ignoreDuplicates: true })
    .select("id, image_url");
  if (insErr) errorLog.push({ url: "db", error: insErr.message });

  // Queue items without image for retry
  const queueRows = (inserted || []).filter((r: any) => !r.image_url).map((r: any) => ({ signal_item_id: r.id, next_strategy: "twitter_card" }));
  if (queueRows.length) await supabase.from("signal_image_queue").upsert(queueRows, { onConflict: "signal_item_id" });

  await supabase.from("signal_ingest_runs").update({
    finished_at: new Date().toISOString(),
    sources_attempted: attempted, sources_failed: failed,
    items_fetched: allItems.length,
    items_after_dedupe: fresh.length,
    items_after_scoring: scored.length,
    error_log: errorLog,
  }).eq("id", runId);

  return { industry, fresh: fresh.length, inserted: inserted?.length || 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Service-role client — this runs on cron, no user JWT
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Optional body: { industries: ["insurance"] } to scope a single run
    const body = await req.json().catch(() => ({}));
    const industries: string[] = body.industries?.length ? body.industries : ALL_INDUSTRIES;

    const summary: any[] = [];
    // Run sequentially so we don't hammer Gemini quota
    for (const ind of industries) {
      try {
        const r = await ingestIndustry(supabase, ind);
        summary.push(r);
      } catch (e) {
        summary.push({ industry: ind, error: String(e).slice(0, 200) });
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signal-ingest fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});