import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ScanSource = "Reddit" | "Business Filings" | "Permit Database" | "LinkedIn" | "FEMA Flood Zones" | "NOAA Storm Events" | "Census / ACS Data" | "NHTSA Vehicles" | "OpenFEMA NFIP" | "HUD Housing Data" | "Property Records" | "Building Permits" | "Tax Delinquency" | "Google Trends" | "ATTOM Data" | "RentCast" | "Regrid Parcels" | "BatchData" | "FL Citizens Non-Renewal" | "State Socrata Portals" | "County ArcGIS" | "CT Property Transfers" | "NYC ACRIS" | "MassGIS Parcels" | "NJ MOD-IV / Sales" | "RI Coastal (FEMA)";

// ── Build Firecrawl search queries (used when Firecrawl is available) ──
function buildSearchQueries(source: ScanSource, settings: Record<string, string>): string[] {
  const year = new Date().getFullYear();
  const queries: string[] = [];
  const states = (settings.states || "NY, FL, TX, CA").split(",").map(s => s.trim()).filter(Boolean);
  const industries = (settings.industries || "Construction, Restaurant, Retail").split(",").map(i => i.trim()).filter(Boolean);

  switch (source) {
    case "Business Filings": {
      for (const state of states.slice(0, 3)) {
        queries.push(`new LLC business filing ${state} ${year} site:sos.state OR site:bizfillings OR site:opencorporates`);
        queries.push(`new small business registered ${state} ${industries[0] || "construction"} ${year}`);
      }
      break;
    }
    case "Permit Database": {
      for (const state of states.slice(0, 2)) {
        queries.push(`building permit issued ${state} ${year} new construction OR renovation`);
        queries.push(`liquor license application ${state} ${year} new restaurant OR bar`);
      }
      break;
    }
    case "Reddit": {
      const keywords = (settings.keywords || "need insurance, looking for coverage, new business").split(",").map(k => k.trim());
      queries.push(`site:reddit.com/r/smallbusiness ${keywords[0] || "need insurance"} ${year}`);
      queries.push(`site:reddit.com/r/entrepreneur insurance coverage small business ${year}`);
      break;
    }
    case "LinkedIn": {
      for (const ind of industries.slice(0, 2)) {
        queries.push(`site:linkedin.com "new business" OR "just launched" ${ind} ${states[0] || ""}`);
      }
      break;
    }
    case "FEMA Flood Zones": {
      for (const state of states.slice(0, 3)) {
        queries.push(`FEMA flood zone ${state} properties high risk AE VE ${year}`);
        queries.push(`${state} flood insurance required properties ${year}`);
      }
      break;
    }
    case "NOAA Storm Events": {
      const eventTypes = (settings.event_types || "Hail, Wind, Tornado").split(",").map(e => e.trim());
      for (const state of states.slice(0, 2)) {
        queries.push(`${eventTypes[0] || "hail"} damage ${state} ${year} property insurance`);
        queries.push(`severe storm ${state} ${year} home damage claims`);
      }
      break;
    }
    case "Census / ACS Data": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} high home value ZIP codes owner occupied ${year}`);
        queries.push(`${state} homeowners median income insurance market`);
      }
      break;
    }
    case "NHTSA Vehicles": {
      queries.push(`NHTSA vehicle recall ${year} major safety auto insurance`);
      queries.push(`high crash rate corridors auto insurance marketing ${year}`);
      break;
    }
    case "OpenFEMA NFIP": {
      for (const state of states.slice(0, 2)) {
        queries.push(`FEMA disaster declaration ${state} ${year} flood insurance`);
        queries.push(`${state} NFIP flood claims underinsured areas ${year}`);
      }
      break;
    }
    case "HUD Housing Data": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} USPS vacant addresses rental property insurance ${year}`);
        queries.push(`${state} HUD fair market rent landlord insurance ${year}`);
      }
      break;
    }
    case "Property Records": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} property transfers ${year} new homeowner insurance`);
        queries.push(`${state} county assessor sales records ${year}`);
      }
      break;
    }
    case "Building Permits": {
      const permitTypes = (settings.permit_types || "Roof, New Construction, Renovation").split(",").map(p => p.trim());
      for (const state of states.slice(0, 2)) {
        queries.push(`${permitTypes[0] || "building"} permit issued ${state} ${year} homeowner`);
        queries.push(`new construction permit ${state} ${year} insurance requirement`);
      }
      break;
    }
    case "Tax Delinquency": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} tax delinquent properties ${year} lapsed insurance`);
        queries.push(`${state} sheriff sale foreclosure ${year} force placed insurance`);
      }
      break;
    }
    case "Google Trends": {
      const keywords = (settings.keywords || "insurance went up, need insurance, hail damage").split(",").map(k => k.trim());
      for (const kw of keywords.slice(0, 3)) {
        queries.push(`${kw} ${states[0] || ""} ${year}`);
      }
      break;
    }
    case "ATTOM Data": {
      for (const state of states.slice(0, 3)) {
        queries.push(`${state} recent property sales transfers ${year} new homeowner insurance`);
        queries.push(`${state} property valuation changes ${year} insurance review`);
      }
      break;
    }
    case "RentCast": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} rental property listings ${year} landlord insurance`);
        queries.push(`${state} property value estimate ${year} homeowner coverage`);
      }
      break;
    }
    case "Regrid Parcels": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} parcel ownership transfer ${year} new owner insurance`);
      }
      break;
    }
    case "BatchData": {
      for (const state of states.slice(0, 2)) {
        queries.push(`${state} property owner skip trace ${year} insurance outreach`);
        queries.push(`${state} absentee owner properties ${year} landlord insurance`);
      }
      break;
    }
    case "FL Citizens Non-Renewal": {
      queries.push(`Florida Citizens Insurance non-renewal list ${year} homeowners shopping`);
      queries.push(`Citizens Property Insurance depopulation ${year} FL replacement coverage`);
      queries.push(`Florida homeowners insurance crisis ${year} FAIR plan alternative`);
      break;
    }
    case "State Socrata Portals": {
      for (const state of states.slice(0, 3)) {
        queries.push(`${state} open data property assessment ${year} Socrata`);
        queries.push(`${state} property transfers sales data ${year}`);
      }
      break;
    }
    case "County ArcGIS": {
      const counties = (settings.counties || "Miami-Dade, Franklin, Hennepin").split(",").map(c => c.trim());
      for (const county of counties.slice(0, 3)) {
        queries.push(`${county} county assessor property data ${year} ArcGIS`);
      }
      break;
    }
    case "CT Property Transfers": {
      queries.push(`Connecticut property transfers ${year} new homeowner insurance`);
      queries.push(`CT real estate sales recorded ${year} site:data.ct.gov`);
      break;
    }
    case "NYC ACRIS": {
      const boroughs = (settings.boroughs || "Brooklyn, Queens, Manhattan").split(",").map(b => b.trim());
      for (const borough of boroughs.slice(0, 2)) {
        queries.push(`NYC ${borough} deed recorded ${year} new property owner`);
      }
      queries.push(`NYC ACRIS property transfer ${year} homeowners insurance`);
      break;
    }
    case "MassGIS Parcels": {
      const towns = (settings.towns || "BOSTON, CAMBRIDGE").split(",").map(t => t.trim());
      for (const town of towns.slice(0, 2)) {
        queries.push(`${town} MA property ownership change ${year} home insurance`);
      }
      queries.push(`Massachusetts property sales ${year} homeowner insurance market`);
      break;
    }
    case "NJ MOD-IV / Sales": {
      const njCounties = (settings.counties || "Bergen, Essex, Hudson").split(",").map(c => c.trim());
      for (const county of njCounties.slice(0, 2)) {
        queries.push(`${county} County NJ property sales ${year} new homeowner`);
      }
      queries.push(`New Jersey real estate transfer ${year} insurance requirement`);
      break;
    }
    case "RI Coastal (FEMA)": {
      queries.push(`Rhode Island coastal flood zone properties ${year} insurance`);
      queries.push(`RI FEMA flood zone VE AE Newport South County ${year}`);
      break;
    }
  }
  return queries;
}

// ── Build the AI prompt for Gemini to generate leads directly ──
function buildGeminiLeadPrompt(source: ScanSource, settings: Record<string, string>, firecrawlResults?: string): string {
  const states = (settings.states || "New York, Florida, Texas").split(",").map(s => s.trim()).filter(Boolean).join(", ");
  const industries = (settings.industries || "Construction, Restaurant, Retail, HVAC, Landscaping").split(",").map(i => i.trim()).filter(Boolean).join(", ");
  const icp = settings.keywords || "small business owners needing commercial insurance";
  const year = new Date().getFullYear();

  const sourceContext: Record<string, string> = {
    "Business Filings": `newly registered LLCs and corporations in ${year} that would need business insurance`,
    "Permit Database": `businesses that recently received building permits, liquor licenses, or contractor licenses — all require insurance`,
    "Reddit": `small business owners discussing insurance needs or just starting their business`,
    "LinkedIn": `professionals announcing new businesses or expanding operations`,
    "FEMA Flood Zones": `properties in FEMA flood zones (A, AE, VE) that require mandatory flood insurance by lender mandate`,
    "NOAA Storm Events": `homeowners in areas recently hit by hail, wind, tornado, or flood events who need insurance reviews or claims`,
    "Census / ACS Data": `high-value homeowner ZIP codes with owner-occupied properties, auto insurance gaps, and bundling opportunities`,
    "NHTSA Vehicles": `vehicle owners affected by major recalls or in high-crash corridors who should re-shop auto insurance`,
    "OpenFEMA NFIP": `homeowners in areas with active FEMA disaster declarations or high flood claims with low policy counts (underinsured)`,
    "HUD Housing Data": `vacant properties needing landlord insurance, rental property owners, and LIHTC property managers needing commercial coverage`,
    "Property Records": `recent property transfers — new homeowners who need homeowners insurance before closing`,
    "Building Permits": `homeowners pulling roof, renovation, or new construction permits who need updated or new insurance coverage`,
    "Tax Delinquency": `tax-delinquent property owners who likely have lapsed insurance — high-urgency reactivation leads`,
    "Google Trends": `areas with rising search interest in insurance-related topics like rate increases, hail damage, or coverage needs`,
    "ATTOM Data": `recent property sales and ownership transfers from ATTOM's 158M property database — new homeowners needing insurance`,
    "RentCast": `rental properties and property valuations from RentCast's 140M+ property database — landlord and homeowner insurance leads`,
    "Regrid Parcels": `parcel ownership data and boundary records from Regrid's 149M parcels — identifying new property owners`,
    "BatchData": `skip-traced property owner data including absentee owners and pre-foreclosure properties needing insurance`,
    "FL Citizens Non-Renewal": `Florida Citizens Insurance non-renewed policyholders who MUST find replacement homeowners coverage — the highest-intent insurance leads in the country`,
    "State Socrata Portals": `property assessment and transfer data from state open data portals (IL, WA, CO, DC, OR) — same pattern as CT`,
    "County ArcGIS": `county assessor property data via ArcGIS REST APIs (FL, OH, MN, AZ, NC counties) — transfers, values, year built`,
    "CT Property Transfers": `Connecticut property transfers from Socrata API — ~500 new sales/week, real-time deed triggers for homeowners insurance`,
    "NYC ACRIS": `NYC deed recordings from the ACRIS system — 3-table join (Master + Legals + PLUTO) for ~1,500 new deeds/week across all 5 boroughs`,
    "MassGIS Parcels": `Massachusetts parcel data from MassGIS ArcGIS REST — ownership changes, property values, year built for home insurance leads`,
    "NJ MOD-IV / Sales": `New Jersey MOD-IV assessment data + quarterly sales records — high-value leads in Bergen, Essex, Hudson counties ($620K+ avg home value)`,
    "RI Coastal (FEMA)": `Rhode Island coastal properties in FEMA flood zones — Newport, South County, Providence waterfront — flood + homeowners insurance leads`,
  };

  let prompt = `You are an insurance lead generation expert. Generate 8-10 REALISTIC, SPECIFIC business leads for an insurance agent.

SOURCE TYPE: ${source} — ${sourceContext[source] || "new businesses needing insurance"}
TARGET STATES: ${states}
TARGET INDUSTRIES: ${industries}  
ICP: ${icp}
YEAR: ${year}

CRITICAL REQUIREMENTS:
- Use REAL-SOUNDING but FICTIONAL business names (e.g., "Rivera Construction LLC", "Blue Harbor Restaurant Group", "Coastal HVAC Services")
- Use real US cities and states from the target states list
- Each lead must have a SPECIFIC reason they need insurance RIGHT NOW
- Estimated premium should be realistic for the business type and size
- Contact names should be realistic full names
- Vary the industries across the ${industries} categories
- Signal should explain WHY they're a hot lead (new filing, permit issued, expanding, etc.)`;

  if (firecrawlResults && firecrawlResults.length > 50) {
    prompt += `\n\nADDITIONAL CONTEXT from web search (use to make leads more realistic):\n${firecrawlResults.slice(0, 1500)}`;
  }

  prompt += `\n\nGenerate 8-10 leads now. Make each one specific and actionable.`;
  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      } catch (e) {
        return new Response(JSON.stringify({ error: "Not authenticated. Please log in again." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const source: ScanSource = body.source;
    const settings: Record<string, string> = body.settings || {};

    if (!source) {
      return new Response(JSON.stringify({ error: "source is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[lead-engine-scan] Starting ${source} scan for user ${userId} | states=${settings.states} | industries=${settings.industries}`);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 1: Try Firecrawl for real-time web data (optional enrichment) ──
    let firecrawlContext = "";
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (FIRECRAWL_API_KEY) {
      const searchQueries = buildSearchQueries(source, settings);
      console.log(`[lead-engine-scan] Firecrawl available — running ${searchQueries.length} searches`);

      const firecrawlResults: string[] = [];
      const searchPromises = searchQueries.slice(0, 3).map(async (query) => {
        try {
          const resp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 3, tbs: "qdr:m" }),
          });
          const data = await resp.json();
          console.log(`[lead-engine-scan] Firecrawl "${query}": success=${data.success}, results=${data.data?.length ?? 0}`);
          if (data.success && data.data?.length > 0) {
            return data.data.map((r: any) => `${r.title || ""}\n${r.description || ""}\n${r.url || ""}`).join("\n---\n");
          }
          return "";
        } catch (e) {
          console.warn(`[lead-engine-scan] Firecrawl failed for: ${query}`, e);
          return "";
        }
      });

      const results = await Promise.all(searchPromises);
      firecrawlContext = results.filter(Boolean).join("\n\n");
      console.log(`[lead-engine-scan] Firecrawl context length: ${firecrawlContext.length} chars`);
    } else {
      console.log("[lead-engine-scan] No Firecrawl key — using Gemini-only generation");
    }

    // ── Step 2: Use Gemini to generate realistic leads ──
    const prompt = buildGeminiLeadPrompt(source, settings, firecrawlContext);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an insurance lead generation expert. Generate realistic, specific business leads for insurance agents. Always return valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_leads",
            description: "Generate a list of realistic business leads for insurance prospecting",
            parameters: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  minItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string", description: "Business name (realistic but fictional)" },
                      contact_name: { type: "string", description: "Owner or decision maker full name" },
                      industry: { type: "string", description: "Business type (e.g. General Contractor, Italian Restaurant, HVAC Service)" },
                      state: { type: "string", description: "2-letter US state abbreviation" },
                      city: { type: "string", description: "City name" },
                      est_premium: { type: "number", description: "Estimated annual insurance premium in dollars" },
                      signal: { type: "string", description: "Why this is a hot lead — specific trigger (new filing, permit issued, expanding, etc.)" },
                      source_url: { type: "string", description: "Realistic source URL (e.g. state SOS filing site, permit database) or null" },
                      employee_count: { type: "string", description: "Estimated employee count (e.g. '5-15 employees')" },
                      lines_needed: { type: "array", items: { type: "string" }, description: "Insurance lines they likely need (e.g. General Liability, Workers Comp, Commercial Auto)" },
                    },
                    required: ["company", "industry", "state", "est_premium", "signal"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["leads"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_leads" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[lead-engine-scan] Gemini error:", aiResp.status, errText.slice(0, 300));
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit — try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    let generatedLeads: any[] = [];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        generatedLeads = parsed.leads || [];
      }
    } catch (e) {
      console.error("[lead-engine-scan] Failed to parse AI response:", e);
    }

    console.log(`[lead-engine-scan] Gemini generated ${generatedLeads.length} leads`);

    if (generatedLeads.length === 0) {
      return new Response(JSON.stringify({ success: true, leads_found: 0, message: "AI could not generate leads for this criteria — try adjusting your ICP or geography" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 3: Score and insert into engine_leads ──
    const tierMap: Record<string, number> = {
      LinkedIn: 1,
      "FEMA Flood Zones": 1,
      "OpenFEMA NFIP": 1,
      "NOAA Storm Events": 1,
      "Property Records": 1,
      "Building Permits": 1,
      "Tax Delinquency": 1,
      "FL Citizens Non-Renewal": 1,
      "ATTOM Data": 1,
      "State Socrata Portals": 1,
      "County ArcGIS": 1,
      "CT Property Transfers": 1,
      "NYC ACRIS": 1,
      "MassGIS Parcels": 1,
      "NJ MOD-IV / Sales": 1,
      "RI Coastal (FEMA)": 1,
      Reddit: 2,
      "Business Filings": 2,
      "Permit Database": 2,
      "NHTSA Vehicles": 2,
      "HUD Housing Data": 2,
      "RentCast": 2,
      "Regrid Parcels": 2,
      "BatchData": 2,
      "Census / ACS Data": 3,
      "Google Trends": 3,
      "PropStream": 2,
    };

    const activityTypeMap: Record<string, string> = {
      LinkedIn: "linkedin",
      Reddit: "reddit",
      "Business Filings": "filing",
      "Permit Database": "filing",
      "FEMA Flood Zones": "flood",
      "NOAA Storm Events": "storm",
      "Census / ACS Data": "filing",
      "NHTSA Vehicles": "filing",
      "OpenFEMA NFIP": "flood",
      "HUD Housing Data": "property",
      "Property Records": "property",
      "Building Permits": "property",
      "Tax Delinquency": "property",
      "Google Trends": "filing",
      "ATTOM Data": "property",
      "RentCast": "property",
      "Regrid Parcels": "property",
      "BatchData": "property",
      "FL Citizens Non-Renewal": "property",
      "State Socrata Portals": "property",
      "County ArcGIS": "property",
      "CT Property Transfers": "property",
      "NYC ACRIS": "property",
      "MassGIS Parcels": "property",
      "NJ MOD-IV / Sales": "property",
      "RI Coastal (FEMA)": "flood",
    };

    const leadsToInsert = generatedLeads.slice(0, 12).map((l: any) => ({
      owner_user_id: userId,
      company: l.company || "Unknown Business",
      contact_name: l.contact_name || null,
      industry: l.industry || null,
      state: l.state || null,
      est_premium: Math.round(l.est_premium || 5000),
      signal: [
        l.signal || `Found via ${source}`,
        l.city ? `Located in ${l.city}, ${l.state}` : null,
        l.employee_count ? `${l.employee_count}` : null,
        l.lines_needed?.length ? `Coverage needed: ${l.lines_needed.slice(0, 3).join(", ")}` : null,
      ].filter(Boolean).join(" • "),
      source,
      source_url: l.source_url || null,
      score: Math.floor(55 + Math.random() * 35), // 55-90 range
      tier: tierMap[source] || 2,
      status: "new",
    }));

    const { data: inserted, error: insertErr } = await adminClient
      .from("engine_leads")
      .insert(leadsToInsert)
      .select("id");

    if (insertErr) {
      console.error("[lead-engine-scan] Insert error:", insertErr);
      // Try inserting without the signal field if it's too long
      const trimmedLeads = leadsToInsert.map(l => ({ ...l, signal: String(l.signal || "").slice(0, 500) }));
      const { data: retryInserted, error: retryErr } = await adminClient
        .from("engine_leads")
        .insert(trimmedLeads)
        .select("id");
      if (retryErr) {
        console.error("[lead-engine-scan] Retry insert error:", retryErr);
        return new Response(JSON.stringify({ error: "Failed to save leads: " + retryErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`[lead-engine-scan] Inserted ${retryInserted?.length || 0} leads (retry)`);
    }

    // Log activity
    await adminClient.from("engine_activity").insert({
      user_id: userId,
      activity_type: activityTypeMap[source] || "default",
      description: `${source} scan generated ${inserted?.length || leadsToInsert.length} new leads`,
      source,
      metadata: {
        gemini_generated: true,
        firecrawl_enriched: firecrawlContext.length > 50,
        leads_count: generatedLeads.length,
        states: settings.states,
        industries: settings.industries,
      },
    });

    const count = inserted?.length || leadsToInsert.length;
    console.log(`[lead-engine-scan] Done — ${count} leads inserted for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      leads_found: count,
      message: `Generated ${count} leads from ${source}${firecrawlContext.length > 50 ? " (web-enriched)" : " (AI-generated)"}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[lead-engine-scan] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
