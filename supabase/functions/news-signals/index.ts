import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google News RSS → parsed signals for prospect/client companies
async function fetchGoogleNewsRSS(companyName: string): Promise<Array<{ title: string; link: string; pubDate: string; source: string }>> {
  try {
    const query = encodeURIComponent(`"${companyName}" insurance OR lawsuit OR merger OR expansion OR funding OR acquisition`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const resp = await fetch(rssUrl);
    if (!resp.ok) return [];
    const xml = await resp.text();

    const items: Array<{ title: string; link: string; pubDate: string; source: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "Google News";
      if (title) items.push({ title, link, pubDate, source });
    }
    return items;
  } catch (e) {
    console.error("RSS fetch error for", companyName, e);
    return [];
  }
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companies } = await req.json();
    // Accept explicit list or pull from user's leads
    let companyNames: string[] = companies || [];

    if (companyNames.length === 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("account_name")
        .order("updated_at", { ascending: false })
        .limit(20);
      companyNames = (leads || []).map((l: any) => l.account_name).filter(Boolean);
    }

    if (companyNames.length === 0) {
      return new Response(JSON.stringify({ signals: [], message: "No companies to monitor" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch news for up to 10 companies in parallel
    const targets = companyNames.slice(0, 10);
    const results = await Promise.all(
      targets.map(async (company) => {
        const articles = await fetchGoogleNewsRSS(company);
        return { company, articles };
      })
    );

    const signals = results
      .filter(r => r.articles.length > 0)
      .flatMap(r =>
        r.articles.map(a => ({
          company: r.company,
          title: a.title,
          link: a.link,
          published: a.pubDate,
          news_source: a.source,
          signal_type: categorizeSignal(a.title),
        }))
      );

    return new Response(JSON.stringify({ signals, companies_scanned: targets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("news-signals error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch signals" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function categorizeSignal(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("lawsuit") || t.includes("sued") || t.includes("litigation")) return "legal_risk";
  if (t.includes("merger") || t.includes("acqui")) return "m&a";
  if (t.includes("expan") || t.includes("new location") || t.includes("facility")) return "expansion";
  if (t.includes("funding") || t.includes("raised") || t.includes("investment")) return "funding";
  if (t.includes("hire") || t.includes("appoint") || t.includes("ceo") || t.includes("cfo")) return "leadership_change";
  if (t.includes("layoff") || t.includes("restructur")) return "restructuring";
  if (t.includes("fire") || t.includes("damage") || t.includes("flood") || t.includes("storm")) return "property_risk";
  return "general";
}
