import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ScanSource,
  type PlacesResult,
  isValidBusinessLead,
  buildGoogleMapsQueries,
  searchGooglePlaces,
  searchSerperFallback,
  buildSearchQueries,
  buildExtractionPrompt,
} from "../_shared/lead-scan.ts";
import { enrichLeadsBatch, enrichInsertedLeads } from "../_shared/lead-enrich.ts";
import { calculateLeadScore, tierMap, activityTypeMap, validateExtractedLeads } from "../_shared/lead-score.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Missing authorization header" }, 401);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResp({ error: "AI service not configured" }, 500);
    }

    // Resolve user
    let userId: string;
    const body = await req.json();

    if (body._scheduler_user_id) {
      userId = body._scheduler_user_id;
    } else {
      const token = authHeader.replace("Bearer ", "");
      try {
        const payloadBase64 = token.split(".")[1];
        const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        if (!payload.sub) throw new Error("No sub in token");
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
        userId = payload.sub;
      } catch {
        return jsonResp({ error: "Not authenticated. Please log in again." }, 401);
      }
    }

    const source: ScanSource = body.source;
    const settings: Record<string, string> = body.settings || {};

    if (!source) {
      return jsonResp({ error: "source is required" }, 400);
    }

    const batchId = `batch_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    console.log(`[lead-engine-scan] Starting ${source} scan for user ${userId} | batch=${batchId}`);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── GOOGLE MAPS PATH ──
    if (source === "Google Maps") {
      return await handleGoogleMapsScan(userId, settings, batchId, adminClient);
    }

    // ── FIRECRAWL PATH ──
    return await handleFirecrawlScan(userId, source, settings, batchId, adminClient, LOVABLE_API_KEY);

  } catch (err: any) {
    console.error("[lead-engine-scan] Error:", err);
    return jsonResp({ error: err.message || "Internal error" }, 500);
  }
});

// ═══════════════════════════════════════════
// ── Google Maps scan handler
// ═══════════════════════════════════════════
async function handleGoogleMapsScan(
  userId: string,
  settings: Record<string, string>,
  batchId: string,
  adminClient: any,
) {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  const SERPER_KEY = Deno.env.get("SERPER_API_KEY");
  const queries = buildGoogleMapsQueries(settings);
  console.log(`[lead-engine-scan] Google Maps — running ${queries.length} place searches`);

  let allPlaces: PlacesResult[] = [];
  const seenNames = new Set<string>();

  // Try Google Places API
  if (GOOGLE_API_KEY) {
    for (const q of queries.slice(0, 8)) {
      try {
        const results = await searchGooglePlaces(q, GOOGLE_API_KEY);
        for (const r of results) {
          const key = r.company.toLowerCase().trim();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            allPlaces.push(r);
          }
        }
        if (results.length > 0) console.log(`[lead-engine-scan] "${q}" → ${results.length} places`);
      } catch (e) {
        console.warn(`[lead-engine-scan] Google Places query failed: ${q}`, e);
      }
    }
  }

  // Serper fallback
  if (allPlaces.length === 0 && SERPER_KEY) {
    console.log(`[lead-engine-scan] Google Places returned 0 — falling back to Serper`);
    const serperResults = await searchSerperFallback(queries, SERPER_KEY);
    for (const r of serperResults) {
      const key = r.company.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allPlaces.push(r);
      }
    }
  }

  console.log(`[lead-engine-scan] Google Maps total unique: ${allPlaces.length}`);

  if (allPlaces.length === 0) {
    return jsonResp({ success: true, leads_found: 0, message: "No businesses found for your criteria. Try different states or industries." });
  }

  // Score and sort
  const scored = allPlaces
    .filter(p => isValidBusinessLead(p.company))
    .map(p => {
      let score = 50;
      if (!p.website) score += 20;
      if ((p.reviewCount ?? 0) < 10) score += 15;
      if ((p.reviewCount ?? 0) === 0) score += 10;
      if ((p.rating ?? 5) < 4.0) score += 5;
      return { ...p, score: Math.min(score, 99) };
    }).sort((a, b) => b.score - a.score);

  const topPlaces = scored.slice(0, 12);

  const leadsToInsert = topPlaces.map((place) => {
    const signalParts = [
      `Found on Google Maps`,
      place.city && place.state ? `Located in ${place.city}, ${place.state}` : null,
      !place.website ? "⚠️ No website found — needs digital presence" : null,
      (place.reviewCount ?? 0) < 10 ? `Only ${place.reviewCount || 0} Google reviews — likely new/untouched` : null,
      place.rating ? `Rating: ${place.rating}/5` : null,
    ].filter(Boolean).join(" • ");

    return {
      owner_user_id: userId,
      company: place.company,
      contact_name: null,
      email: null,
      phone: place.phone,
      industry: settings.industries?.split(",")[0]?.trim() || null,
      state: place.state || null,
      est_premium: 5000,
      signal: signalParts.slice(0, 500),
      source: "Google Maps",
      source_url: place.website || null,
      score: place.score,
      tier: 1,
      status: "new",
      batch_id: batchId,
    };
  });

  const { data: inserted, error: insertErr } = await adminClient
    .from("engine_leads")
    .insert(leadsToInsert)
    .select("id, company, state, industry");

  if (insertErr) {
    console.error("[lead-engine-scan] Google Maps insert error:", insertErr);
    return jsonResp({ error: "Failed to save leads: " + insertErr.message }, 500);
  }

  // Enrich
  if (inserted && inserted.length > 0) {
    await enrichInsertedLeads(inserted, adminClient);
  }

  await adminClient.from("engine_activity").insert({
    user_id: userId,
    activity_type: "google_maps",
    description: `Google Maps scan found ${inserted?.length || leadsToInsert.length} businesses`,
    source: "Google Maps",
    metadata: {
      total_discovered: allPlaces.length,
      queries_run: queries.length,
      states: settings.states,
      industries: settings.industries,
    },
  });

  const count = inserted?.length || leadsToInsert.length;
  return jsonResp({
    success: true,
    leads_found: count,
    batch_id: batchId,
    message: `Found ${count} real businesses from Google Maps (${allPlaces.length} total scanned). Contact data is being enriched via verified sources.`,
  });
}

// ═══════════════════════════════════════════
// ── Firecrawl scan handler
// ═══════════════════════════════════════════
async function handleFirecrawlScan(
  userId: string,
  source: ScanSource,
  settings: Record<string, string>,
  batchId: string,
  adminClient: any,
  lovableApiKey: string,
) {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    return jsonResp({
      success: true, leads_found: 0,
      message: `${source} scan requires web search capabilities. Please configure Firecrawl to enable this data source.`,
    });
  }

  const searchQueries = buildSearchQueries(source, settings);
  console.log(`[lead-engine-scan] Firecrawl — running ${searchQueries.length} searches for ${source}`);

  // Collect raw search results
  const allSearchResults: Array<{ title: string; description: string; url: string }> = [];
  const searchPromises = searchQueries.slice(0, 4).map(async (query) => {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { "Authorization": `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5, tbs: "qdr:m" }),
      });
      if (resp.status === 402) { console.warn("[lead-engine-scan] Firecrawl credits exhausted"); return []; }
      const data = await resp.json();
      if (data.success && data.data?.length > 0) {
        return data.data.map((r: any) => ({ title: r.title || "", description: r.description || "", url: r.url || "" }));
      }
      return [];
    } catch (e) { console.warn(`[lead-engine-scan] Firecrawl failed for: ${query}`, e); return []; }
  });

  const searchResults = await Promise.all(searchPromises);
  for (const batch of searchResults) allSearchResults.push(...batch);

  console.log(`[lead-engine-scan] Total Firecrawl results: ${allSearchResults.length}`);

  if (allSearchResults.length === 0) {
    return jsonResp({ success: true, leads_found: 0, message: `No results found for ${source}. Try different states, industries, or keywords.` });
  }

  // AI extraction
  const firecrawlText = allSearchResults.map((r, i) => `[${i + 1}] Title: ${r.title}\nSnippet: ${r.description}\nURL: ${r.url}`).join("\n\n");
  const extractionPrompt = buildExtractionPrompt(source, firecrawlText);

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a strict data extraction tool. You ONLY extract information that explicitly appears in the provided text. You NEVER invent, fabricate, or hallucinate data. If information is not present, use null. Return fewer results rather than fake results." },
        { role: "user", content: extractionPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_leads",
          description: "Extract real business leads found in search results. Only include data that appears verbatim in the source text.",
          parameters: {
            type: "object",
            properties: {
              leads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    company: { type: "string", description: "Company name as it appears in search results" },
                    contact_name: { type: ["string", "null"], description: "Contact name if found in results, otherwise null" },
                    email: { type: ["string", "null"], description: "Email if found in results, otherwise null" },
                    phone: { type: ["string", "null"], description: "Phone if found in results, otherwise null" },
                    website: { type: ["string", "null"], description: "Website URL from results" },
                    industry: { type: ["string", "null"], description: "Industry/business type if mentioned" },
                    state: { type: ["string", "null"], description: "US state if mentioned" },
                    city: { type: ["string", "null"], description: "City if mentioned" },
                    signal: { type: "string", description: "Why this is an insurance lead based on the search context" },
                    source_result_index: { type: "number", description: "Index of the search result this was extracted from" },
                  },
                  required: ["company", "signal"],
                },
              },
            },
            required: ["leads"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_leads" } },
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error("[lead-engine-scan] AI extraction error:", aiResp.status, errText.slice(0, 300));
    if (aiResp.status === 429) return jsonResp({ error: "Rate limit — try again in a moment." }, 429);
    if (aiResp.status === 402) return jsonResp({ error: "AI credits exhausted." }, 402);
    return jsonResp({ error: "AI extraction failed" }, 500);
  }

  const aiData = await aiResp.json();
  let extractedLeads: any[] = [];
  try {
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      extractedLeads = parsed.leads || [];
    }
  } catch (e) {
    console.error("[lead-engine-scan] Failed to parse AI extraction:", e);
  }

  const validatedLeads = validateExtractedLeads(extractedLeads);
  console.log(`[lead-engine-scan] Extracted ${validatedLeads.length} real leads from ${allSearchResults.length} search results`);

  if (validatedLeads.length === 0) {
    return jsonResp({ success: true, leads_found: 0, message: `No specific business leads could be extracted from ${source} search results. Try different parameters.` });
  }

  const leadsToInsert = validatedLeads.slice(0, 12).map((l: any) => ({
    owner_user_id: userId,
    company: l.company,
    contact_name: l.contact_name || null,
    email: l.email || null,
    phone: l.phone || null,
    industry: l.industry || settings.industries?.split(",")[0]?.trim() || null,
    state: l.state || null,
    est_premium: 5000,
    signal: [l.signal || `Found via ${source}`, l.city ? `Located in ${l.city}, ${l.state || ""}` : null].filter(Boolean).join(" • ").slice(0, 500),
    source,
    source_url: l.website || (l.source_result_index != null ? allSearchResults[l.source_result_index - 1]?.url : null) || null,
    score: calculateLeadScore(l),
    tier: tierMap[source] || 2,
    status: "new",
    batch_id: batchId,
  }));

  const { data: inserted, error: insertErr } = await adminClient
    .from("engine_leads")
    .insert(leadsToInsert)
    .select("id, company, state, industry");

  if (insertErr) {
    console.error("[lead-engine-scan] Insert error:", insertErr);
    const trimmedLeads = leadsToInsert.map(l => ({ ...l, signal: String(l.signal || "").slice(0, 500) }));
    const { data: retryInserted, error: retryErr } = await adminClient
      .from("engine_leads")
      .insert(trimmedLeads)
      .select("id, company, state, industry");
    if (retryErr) {
      return jsonResp({ error: "Failed to save leads: " + retryErr.message }, 500);
    }
    if (retryInserted) await enrichInsertedLeads(retryInserted, adminClient);
  } else if (inserted) {
    await enrichInsertedLeads(inserted, adminClient);
  }

  await adminClient.from("engine_activity").insert({
    user_id: userId,
    activity_type: activityTypeMap[source] || "default",
    description: `${source} scan extracted ${inserted?.length || leadsToInsert.length} real leads`,
    source,
    metadata: {
      firecrawl_results: allSearchResults.length,
      extracted_leads: extractedLeads.length,
      validated_leads: validatedLeads.length,
      states: settings.states,
      industries: settings.industries,
    },
  });

  const count = inserted?.length || leadsToInsert.length;
  console.log(`[lead-engine-scan] Done — ${count} leads inserted for user ${userId}`);

  return jsonResp({
    success: true,
    leads_found: count,
    batch_id: batchId,
    message: `Extracted ${count} real leads from ${source} search results. Contact data is being enriched via Serper/Apollo/PDL.`,
  });
}
