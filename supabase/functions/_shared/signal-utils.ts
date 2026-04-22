// Shared utilities for Signal v2 ingest / rank / digest

export type RawItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  source_kind: "news" | "reddit" | "nitter" | "blog" | "reg" | "podcast";
  source_tier?: number;
  engagement?: { upvotes?: number; comments?: number; likes?: number; retweets?: number };
};

export async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// 60-bit simhash on word tokens — used for near-duplicate detection across rephrased headlines.
// Returns a JS number safe up to ~2^53 — we use 53 bits and store as bigint.
export async function simhash53(text: string): Promise<bigint> {
  const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(t => t.length > 2);
  if (tokens.length === 0) return 0n;
  const bits: number[] = new Array(53).fill(0);
  for (const tok of tokens) {
    const buf = new TextEncoder().encode(tok);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
    // Take first 7 bytes = 56 bits, use 53 of them
    let h = 0n;
    for (let i = 0; i < 7; i++) h = (h << 8n) | BigInt(hash[i]);
    h = h & ((1n << 53n) - 1n);
    for (let i = 0; i < 53; i++) {
      if ((h >> BigInt(i)) & 1n) bits[i] += 1; else bits[i] -= 1;
    }
  }
  let result = 0n;
  for (let i = 0; i < 53; i++) if (bits[i] > 0) result |= (1n << BigInt(i));
  return result;
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) { count += Number(x & 1n); x >>= 1n; }
  return count;
}

// ---- RSS parsing ----
function decodeCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

export function parseRssItems(xml: string, max = 30, defaultSource = "RSS", kind: RawItem["source_kind"] = "news"): RawItem[] {
  const items: RawItem[] = [];
  const re = /<item[\s>][\s\S]*?<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null && items.length < max) {
    const block = m[0];
    const title = decodeCdata(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const link = decodeCdata(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const pubDate = decodeCdata(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    const sourceTag = decodeCdata(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
    const description = decodeCdata(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");
    if (title && link) {
      items.push({
        title: stripHtml(title).slice(0, 240),
        link,
        pubDate,
        source: sourceTag || defaultSource,
        description: stripHtml(description).slice(0, 400),
        source_kind: kind,
      });
    }
  }
  return items;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

// ---- Source fetchers ----
export async function fetchWithTimeout(url: string, ms = 10_000): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 SignalBot/2.0 (+https://buildingaura.site)" },
      signal: AbortSignal.timeout(ms),
    });
  } catch { return null; }
}

export async function fetchRSS(url: string, kind: RawItem["source_kind"] = "news", timeout = 10_000): Promise<RawItem[]> {
  const r = await fetchWithTimeout(url, timeout);
  if (!r || !r.ok) throw new Error(`RSS fetch failed ${url}`);
  return parseRssItems(await r.text(), 30, hostname(url), kind);
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "RSS"; }
}

export async function fetchReddit(subreddit: string, timeout = 15_000): Promise<RawItem[]> {
  // Reddit JSON endpoint — public, no key needed for read-only.
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=20`;
  const r = await fetchWithTimeout(url, timeout);
  if (!r || !r.ok) throw new Error(`Reddit fetch failed r/${subreddit}`);
  const data = await r.json();
  return (data?.data?.children || []).filter((c: any) => !c.data.over_18 && !c.data.stickied).map((c: any) => ({
    title: c.data.title,
    link: `https://reddit.com${c.data.permalink}`,
    pubDate: new Date(c.data.created_utc * 1000).toISOString(),
    source: `r/${subreddit}`,
    description: (c.data.selftext || c.data.url || "").slice(0, 400),
    source_kind: "reddit" as const,
    source_tier: 4,
    engagement: { upvotes: c.data.ups, comments: c.data.num_comments },
  }));
}

export async function fetchNitter(handle: string, instances: string[], timeout = 12_000): Promise<RawItem[]> {
  // Try each Nitter instance until one responds. Public instances are flaky; fail soft.
  for (const base of instances) {
    const url = `${base}/${handle}/rss`;
    const r = await fetchWithTimeout(url, timeout);
    if (r && r.ok) {
      const items = parseRssItems(await r.text(), 15, `@${handle}`, "nitter");
      if (items.length) return items.map(it => ({ ...it, source: `@${handle}` }));
    }
  }
  return [];
}

export async function fetchHackerNews(max = 8): Promise<RawItem[]> {
  const r = await fetchWithTimeout(`https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${max}`, 10_000);
  if (!r || !r.ok) return [];
  const data = await r.json();
  return (data.hits || []).filter((h: any) => h.url && h.title).map((h: any) => ({
    title: h.title,
    link: h.url,
    pubDate: h.created_at,
    source: "Hacker News",
    description: (h.story_text || "").slice(0, 240),
    source_kind: "blog" as const,
    source_tier: 3,
    engagement: { upvotes: h.points, comments: h.num_comments },
  }));
}

// ---- Image extraction ----
export function extractImageFromHtml(html: string, strategy: "og" | "twitter_card" | "first_img" = "og"): string | null {
  if (strategy === "og") {
    const og = html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i);
    if (og) return og[1];
  }
  if (strategy === "twitter_card") {
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (tw) return tw[1];
  }
  if (strategy === "first_img") {
    const img = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"'?]*)/i);
    if (img) return img[1];
  }
  return null;
}

export async function tryFetchImage(url: string, strategy: "og" | "twitter_card" | "first_img" = "og", timeout = 4000): Promise<string | null> {
  const r = await fetchWithTimeout(url, timeout);
  if (!r || !r.ok) return null;
  return extractImageFromHtml(await r.text(), strategy);
}

// ---- AI helpers ----
export async function generateAiCover(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Editorial illustration, modern, clean, professional, no text. Subject: ${prompt}` }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch { return null; }
}

// ---- AI scoring (tool-call schema, batches of 10) ----
export async function scoreBatch(items: RawItem[], industry: string, apiKey: string): Promise<Array<{ index: number; importance_score: number; topics: string[]; signal_type: string; summary: string }> | null> {
  const prompt = `You are Signal, a curator for ${industry} professionals. For each story, return importance_score (0-100), topics (3-5 short tags), signal_type, and a tightened 1-2 sentence summary.\n\nStories:\n${items.map((it, i) => `[${i}] ${it.title}\n${it.description.slice(0, 240)}`).join("\n\n")}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "score_items",
            description: "Return curated scores for each story.",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number" },
                      importance_score: { type: "number" },
                      topics: { type: "array", items: { type: "string" } },
                      signal_type: { type: "string", enum: ["news", "trend", "regulatory", "risk", "opportunity"] },
                      summary: { type: "string" },
                    },
                    required: ["index", "importance_score", "topics", "signal_type", "summary"],
                  },
                },
              },
              required: ["items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_items" } },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return parsed.items || null;
  } catch (e) {
    console.error("scoreBatch failed", e);
    return null;
  }
}

// Rule-based fallback when AI is unavailable
export function ruleScore(item: RawItem, tier1Sources: Set<string>): { importance_score: number; topics: string[]; signal_type: string; summary: string } {
  let score = 50;
  if (tier1Sources.has(item.source)) score += 40;
  const ageMs = item.pubDate ? Date.now() - new Date(item.pubDate).getTime() : 0;
  if (ageMs > 0 && ageMs < 6 * 3600 * 1000) score += 15;
  if (item.engagement?.upvotes && item.engagement.upvotes > 100) score += 10;
  return {
    importance_score: Math.min(100, score),
    topics: [],
    signal_type: item.source_kind === "reg" ? "regulatory" : "news",
    summary: item.description.slice(0, 220) || item.title,
  };
}