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
    // Use HasData's dedicated Zillow listing API
    const apiUrl = new URL("https://api.hasdata.com/scrape/zillow/listing");
    apiUrl.searchParams.set("keyword", zipCode);
    apiUrl.searchParams.set("type", "forSale");
    if (page > 1) apiUrl.searchParams.set("page", String(page));

    console.log("Fetching:", apiUrl.toString());

    const res = await fetch(apiUrl.toString(), {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
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
    const status = data?.requestMetadata?.status;
    console.log("HasData status:", status);

    if (status === "error" || !data.properties) {
      console.log("HasData error response:", JSON.stringify(data));
      return new Response(JSON.stringify({ listings: [], totalResults: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalResults = data.searchInformation?.totalResults ?? data.properties?.length ?? 0;

    // Map HasData property format to our listing format
    const listings = (data.properties || []).map((p: any) => ({
      zpid: String(p.id || ""),
      price: `$${(p.price || 0).toLocaleString()}`,
      unformattedPrice: p.price || 0,
      address: p.addressRaw || "",
      addressStreet: p.address?.street || "",
      addressCity: p.address?.city || "",
      addressState: p.address?.state || "",
      addressZipcode: p.address?.zipcode || "",
      beds: p.beds ?? null,
      baths: p.baths ?? null,
      area: p.area ?? null,
      imgSrc: p.image || (p.photos?.[0]) || null,
      detailUrl: p.url || "",
      statusText: p.status?.replace(/_/g, " ")?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || "For Sale",
      homeType: p.homeType || null,
      daysOnZillow: p.daysOnZillow ?? null,
      zestimate: p.zestimate ?? null,
      brokerName: p.brokerName || null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      lotArea: p.lotAreaValue ? `${p.lotAreaValue} ${p.lotAreaUnits || ""}`.trim() : null,
      rentZestimate: p.rentZestimate ?? null,
    }));

    console.log("Returning", listings.length, "listings");

    return new Response(JSON.stringify({ listings, totalResults }), {
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
