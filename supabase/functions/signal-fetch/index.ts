import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function fetchGoogleNewsRSS(query: string, max = 12) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const resp = await fetch(rssUrl);
  if (!resp.ok) return [];
  const xml = await resp.text();
  const items: Array<{ title: string; link: string; pubDate: string; source: string; description: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null && items.length < max) {
    const it = m[1];
    const title = it.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
    const link = it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
    const pubDate = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
    const source = it.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "Google News";
    const description = it.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
    if (title) items.push({ title, link, pubDate, source, description });
  }
  return items;
}

async function fetchGoogleNewsTopHeadlines(max = 12) {
  // Top headlines feed — no query required, always returns fresh stories
  const url = `https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const xml = await resp.text();
    const items: Array<{ title: string; link: string; pubDate: string; source: string; description: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRegex.exec(xml)) !== null && items.length < max) {
      const it = m[1];
      const title = it.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
      const link = it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
      const pubDate = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const source = it.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "Google News";
      const description = it.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
      if (title) items.push({ title, link, pubDate, source, description });
    }
    return items;
  } catch { return []; }
}

async function fetchHackerNews(max = 10) {
  // HN Algolia API — free, no key, great signal-to-noise for business/tech
  try {
    const resp = await fetch(`https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${max}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.hits || []).filter((h: any) => h.url && h.title).map((h: any) => ({
      title: h.title as string,
      link: h.url as string,
      pubDate: h.created_at as string,
      source: "Hacker News",
      description: (h.story_text || "").slice(0, 240),
    }));
  } catch { return []; }
}

function extractImageFromHtml(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i);
  if (og) return og[1];
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) return tw[1];
  const img = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"'?]*)/i);
  if (img) return img[1];
  return null;
}

async function tryFetchImage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 SignalBot" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const html = await r.text();
    return extractImageFromHtml(html);
  } catch { return null; }
}

async function generateAiImage(prompt: string): Promise<string | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Editorial illustration, modern, clean, professional, no text. Subject: ${prompt}` }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch { return null; }
}

async function hashStr(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function scoreWithClaude(items: any[], industry: string, learnedContext: string) {
  const prompt = `You are Signal, a curator for ${industry} professionals. Below is a list of fresh stories. For each, return: importance_score (0-100, where 100 = critical industry impact), topics (3-5 short tags), signal_type (news|trend|regulatory|risk|opportunity), and a tightened 1-2 sentence summary written for a busy professional.

User learning signal: ${learnedContext || "(no prior feedback)"}

Return STRICT JSON: { "items": [{ "index": number, "importance_score": number, "topics": string[], "signal_type": string, "summary": string }] }

Stories:
${items.map((it, i) => `[${i}] ${it.title}\n${it.description?.slice(0, 240) || ""}`).join("\n\n")}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Return only valid JSON. No prose." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    console.error("AI scoring failed", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch { return null; }
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
    const subVertical: string | undefined = body.subVertical;

    // Pull user prefs + recent feedback to bias selection
    const [{ data: prefs }, { data: feedback }] = await Promise.all([
      supabase.from("signal_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("signal_feedback").select("reaction, topics_snapshot, source_snapshot").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);

    const blockedTopics = new Set<string>(((prefs as any)?.blocked_topics) || []);
    const blockedSources = new Set<string>(((prefs as any)?.blocked_sources) || []);
    const liked = (feedback || []).filter((f: any) => f.reaction === "great_info").flatMap((f: any) => f.topics_snapshot || []);
    const disliked = (feedback || []).filter((f: any) => f.reaction === "not_interested").flatMap((f: any) => f.topics_snapshot || []);
    const learnedContext = `Likes topics: ${[...new Set(liked)].slice(0, 10).join(", ") || "none"}. Avoids: ${[...new Set(disliked)].slice(0, 10).join(", ") || "none"}.`;

    // Build search query for industry
    const queries = [
      `${industry} ${subVertical || ""} news`,
      `${industry} ${subVertical || ""} regulation OR lawsuit OR trend`,
      `${industry} ${subVertical || ""} acquisition OR funding OR expansion`,
    ];
    const [industryResults, topHeadlines, hn] = await Promise.all([
      Promise.all(queries.map(q => fetchGoogleNewsRSS(q, 6))).then(arr => arr.flat()),
      fetchGoogleNewsTopHeadlines(10),
      fetchHackerNews(8),
    ]);
    // Always include fallbacks so the feed is never empty
    const fetched = [...industryResults, ...topHeadlines, ...hn];

    // Dedupe by title
    const seen = new Set<string>();
    const unique = fetched.filter(it => {
      const k = it.title.toLowerCase().slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return !blockedSources.has(it.source);
    }).slice(0, 18);

    if (unique.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Score with AI
    const scored = await scoreWithClaude(unique, industry, learnedContext);
    const scoresMap = new Map<number, any>();
    if (scored?.items) {
      for (const s of scored.items) scoresMap.set(s.index, s);
    }

    // Try to grab og:image for top items (parallel, capped)
    const imageEnriched = await Promise.all(unique.map(async (it, idx) => {
      const sc = scoresMap.get(idx);
      const score = sc?.importance_score ?? 50;
      const image = score >= 60 ? await tryFetchImage(it.link) : null;
      return { ...it, idx, score, sc, image };
    }));

    const rows = await Promise.all(imageEnriched
      .filter(x => !((x.sc?.topics || []).some((t: string) => blockedTopics.has(t))))
      .map(async x => ({
        title: x.title,
        summary: x.sc?.summary || x.description?.slice(0, 220) || x.title,
        source_name: x.source,
        source_url: x.link,
        image_url: x.image,
        ai_image: false,
        industry,
        sub_vertical: subVertical || null,
        topics: x.sc?.topics || [],
        signal_type: x.sc?.signal_type || "news",
        source_kind: "news",
        importance_score: x.score,
        hash: await hashStr(x.title + x.link),
        raw: { description: x.description },
        published_at: x.pubDate ? new Date(x.pubDate).toISOString() : null,
      })));

    // Upsert (ignore duplicates via unique hash)
    const { error: insErr, data: inserted } = await supabase
      .from("signal_items")
      .upsert(rows, { onConflict: "hash", ignoreDuplicates: true })
      .select("id");

    if (insErr) console.error("insert error:", insErr);

    return new Response(JSON.stringify({ inserted: inserted?.length ?? 0, scanned: unique.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signal-fetch error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});