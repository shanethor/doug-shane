const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const zipCode = url.searchParams.get("zip");
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return new Response(JSON.stringify({ error: "Valid 5-digit zip required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("HASDATA_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "HASDATA_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Use HasData web scraping API to scrape Zillow search results
    const zillowUrl = `https://www.zillow.com/homes/for_sale/${zipCode}_rb/${page}_p/`;
    const scraperUrl = new URL("https://api.hasdata.com/scrape/web");
    scraperUrl.searchParams.set("url", zillowUrl);
    scraperUrl.searchParams.set("jsRendering", "true");

    const res = await fetch(scraperUrl.toString(), {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("HasData error:", res.status, errText);
      return new Response(JSON.stringify({ error: "Upstream API error", status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.content || "";

    if (!content) {
      return new Response(JSON.stringify({ listings: [], totalResults: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract listResults from Zillow's embedded JSON
    const listings = extractListResults(content);

    return new Response(JSON.stringify({ listings, totalResults: listings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching listings:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch listings" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ZillowListing {
  zpid: string;
  price: string;
  unformattedPrice: number;
  address: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
  beds: number | null;
  baths: number | null;
  area: number | null;
  imgSrc: string | null;
  detailUrl: string;
  statusText: string;
  homeType: string | null;
  daysOnZillow: number | null;
  zestimate: number | null;
  brokerName: string | null;
  latitude: number | null;
  longitude: number | null;
}

function extractListResults(html: string): ZillowListing[] {
  const marker = '"listResults":[';
  const idx = html.indexOf(marker);
  if (idx < 0) return [];

  const start = idx + marker.length - 1; // include the [
  let depth = 0;
  let end = start;

  for (let i = start; i < Math.min(start + 500000, html.length); i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  try {
    const raw = JSON.parse(html.slice(start, end));
    return raw.map((item: any) => {
      const homeInfo = item?.hdpData?.homeInfo || {};
      return {
        zpid: String(item.zpid || ""),
        price: item.price || "",
        unformattedPrice: item.unformattedPrice || homeInfo.price || 0,
        address: item.address || "",
        addressStreet: item.addressStreet || homeInfo.streetAddress || "",
        addressCity: item.addressCity || homeInfo.city || "",
        addressState: item.addressState || homeInfo.state || "",
        addressZipcode: item.addressZipcode || homeInfo.zipcode || "",
        beds: item.beds ?? homeInfo.bedrooms ?? null,
        baths: item.baths ?? homeInfo.bathrooms ?? null,
        area: item.area ?? homeInfo.livingArea ?? null,
        imgSrc: item.imgSrc || null,
        detailUrl: item.detailUrl?.startsWith("http") ? item.detailUrl : item.detailUrl ? `https://www.zillow.com${item.detailUrl}` : "",
        statusText: item.statusText || "",
        homeType: homeInfo.homeType || null,
        daysOnZillow: homeInfo.daysOnZillow ?? null,
        zestimate: item.zestimate ?? homeInfo.zestimate ?? null,
        brokerName: item.brokerName || null,
        latitude: item.latLong?.latitude ?? homeInfo.latitude ?? null,
        longitude: item.latLong?.longitude ?? homeInfo.longitude ?? null,
      };
    });
  } catch (e) {
    console.error("Failed to parse listResults:", e);
    return [];
  }
}
