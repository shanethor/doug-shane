import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ScanSource = "Reddit" | "Business Filings" | "Permit Database" | "LinkedIn" | "FEMA Flood Zones" | "NOAA Storm Events" | "Census / ACS Data" | "NHTSA Vehicles" | "OpenFEMA NFIP" | "HUD Housing Data" | "Property Records" | "Building Permits" | "Tax Delinquency" | "Google Trends" | "ATTOM Data" | "RentCast" | "Regrid Parcels" | "BatchData" | "FL Citizens Non-Renewal" | "State Socrata Portals" | "County ArcGIS" | "CT Property Transfers" | "NYC ACRIS" | "MassGIS Parcels" | "NJ MOD-IV / Sales" | "RI Coastal (FEMA)" | "Google Maps";

// ── Google Places API (Text Search) ──
interface PlacesResult {
  company: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  city: string | null;
  state: string | null;
}

async function searchGooglePlaces(
  query: string,
  apiKey: string,
): Promise<PlacesResult[]> {
  // Try Places API (New) first — uses POST with fieldMask
  const newApiUrl = "https://places.googleapis.com/v1/places:searchText";
  try {
    const resp = await fetch(newApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "en" }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const places = data.places || [];
      console.log(`[google-places] New API success for "${query}" — ${places.length} results`);
      return places.map((p: any) => {
        const addr = p.formattedAddress || "";
        let city: string | null = null;
        let state: string | null = null;
        const match = addr.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d/);
        if (match) { city = match[1].trim(); state = match[2]; }
        else {
          const match2 = addr.match(/,\s*([^,]+),\s*([A-Z]{2}),/);
          if (match2) { city = match2[1].trim(); state = match2[2]; }
        }
        return {
          company: p.displayName?.text || "Unknown Business",
          address: addr,
          phone: p.nationalPhoneNumber || null,
          website: p.websiteUri || null,
          rating: p.rating || null,
          reviewCount: p.userRatingCount || null,
          city,
          state,
        };
      });
    }
    const errText = await resp.text();
    console.warn(`[google-places] New API error ${resp.status}: ${errText.slice(0, 300)}`);
  } catch (e) {
    console.warn(`[google-places] New API fetch error:`, e);
  }

  // Fallback to legacy Text Search API
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[google-places] Legacy API error ${resp.status}: ${errText.slice(0, 200)}`);
    return [];
  }
  const data = await resp.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`[google-places] Legacy API status: ${data.status} — ${data.error_message || ""}`);
    return [];
  }
  const places = data.results || [];
  return places.map((p: any) => {
    let city: string | null = null;
    let state: string | null = null;
    const addr = p.formatted_address || "";
    const match = addr.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d/);
    if (match) { city = match[1].trim(); state = match[2]; }
    else {
      const match2 = addr.match(/,\s*([^,]+),\s*([A-Z]{2}),/);
      if (match2) { city = match2[1].trim(); state = match2[2]; }
    }
    return {
      company: p.name || "Unknown Business",
      address: addr,
      phone: null,
      website: null,
      rating: p.rating || null,
      reviewCount: p.user_ratings_total || null,
      city,
      state,
    };
  });
}

// Map common abbreviations to full state names for better Google Places results
const STATE_FULL_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function expandState(s: string): string {
  const upper = s.toUpperCase().trim();
  return STATE_FULL_NAMES[upper] || s;
}

function buildGoogleMapsQueries(settings: Record<string, string>): string[] {
  const rawStates = (settings.states || "TX, FL, CA").split(",").map(s => s.trim()).filter(Boolean);
  const states = rawStates.map(expandState);
  const rawIndustries = (settings.industries || "contractor, restaurant, HVAC").split(",").map(i => i.trim()).filter(Boolean);
  const queries: string[] = [];

  // Expand composite labels like "Trucking / Commercial Fleet" into individual search terms
  const industries: string[] = [];
  for (const ind of rawIndustries) {
    if (/\//.test(ind)) {
      industries.push(...ind.split("/").map(s => s.trim()).filter(Boolean));
    } else {
      industries.push(ind);
    }
  }

  // Vertical-specific search term mappings for industries that need specialized queries
  const verticalSearchExpansions: Record<string, string[]> = {
    "trucking": ["trucking company", "freight carrier", "motor carrier", "logistics company", "truck fleet"],
    "commercial fleet": ["fleet management company", "commercial trucking", "freight hauling company"],
    "motor carriers": ["motor carrier", "trucking company"],
    "motor carriers (for-hire)": ["for hire motor carrier", "trucking company"],
    "owner-operators": ["owner operator trucking", "independent trucker"],
    "freight brokers": ["freight broker", "freight brokerage"],
    "fleet operations": ["fleet operations company", "commercial fleet management"],
    "fleet operations (6+ units)": ["fleet management company", "large trucking fleet"],
    "last mile": ["last mile delivery company", "courier service"],
    "last mile / hot shot": ["last mile delivery", "hot shot trucking", "courier service"],
    "hot shot": ["hot shot trucking", "hotshot delivery"],
    "intermodal": ["intermodal transportation", "drayage company"],
    "intermodal / drayage": ["intermodal transportation company", "drayage trucking"],
    "hazmat carriers": ["hazmat trucking company", "hazardous materials carrier"],
    "tanker operations": ["tanker trucking company", "liquid bulk carrier"],
    "refrigerated": ["reefer trucking company", "refrigerated transport"],
    "refrigerated / reefer": ["refrigerated trucking company", "reefer carrier"],
    "restaurant": ["restaurant", "new restaurant opening"],
    "hospitality": ["hotel", "hospitality business"],
    "cannabis": ["cannabis dispensary", "marijuana business"],
    "manufacturing": ["manufacturing company", "factory"],
    "auto dealers": ["auto dealer", "car dealership"],
    "nonprofit": ["nonprofit organization", "charity"],
    "general contractor": ["general contractor", "construction company"],
    "roofing": ["roofing contractor", "roofing company"],
    "plumbing": ["plumbing contractor", "plumber"],
    "hvac": ["HVAC contractor", "heating and cooling company"],
    "electrician": ["electrical contractor", "electrician"],
    "excavation": ["excavation company", "earthwork contractor"],
  };

  // Build specific queries for each industry/trade in each state
  for (const ind of industries.slice(0, 8)) {
    const lowerInd = ind.toLowerCase();
    const expansions = verticalSearchExpansions[lowerInd];

    if (expansions) {
      // Use specialized search terms for known verticals
      for (const term of expansions.slice(0, 3)) {
        for (const st of states.slice(0, 4)) {
          queries.push(`${term} in ${st}`);
        }
      }
    } else {
      for (const st of states.slice(0, 4)) {
        // If the industry term already contains "company", "contractor", "carrier" etc, use as-is
        const alreadySpecific = /company|contractor|carrier|broker|dealer|service|fleet|operator|delivery|trucking|transport/i.test(ind);
        const tradeQuery = alreadySpecific
          ? `${ind} in ${st}`
          : /contractor|roofing|plumbing|hvac|electrician|excavation|flooring|solar|drywall|insulation|glazing|elevator|fire sprinkler/i.test(ind)
            ? `${ind} contractor in ${st}`
            : `${ind} company in ${st}`;
        queries.push(tradeQuery);
      }
    }
  }

  // Fallback
  if (industries.length === 0 && states[0]) {
    queries.push(`new business in ${states[0]}`);
  }

  // Cap total queries to avoid API overuse
  return queries.slice(0, 20);
}

// ── Build Firecrawl search queries ──
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

// ── Extract REAL leads from Firecrawl search results using AI ──
// AI is ONLY allowed to extract/structure data that exists in the search results.
// It must NOT invent company names, contacts, emails, or phone numbers.
function buildExtractionPrompt(source: ScanSource, firecrawlResults: string): string {
  return `You are a data extraction assistant. Below are REAL web search results from a "${source}" scan.

SEARCH RESULTS:
${firecrawlResults}

TASK: Extract any REAL businesses or leads mentioned in these search results.

CRITICAL RULES — READ CAREFULLY:
1. ONLY extract information that is EXPLICITLY stated in the search results above.
2. DO NOT invent, fabricate, or hallucinate ANY data.
3. If a company name is mentioned but no contact info exists, leave contact_name, email, and phone as null.
4. If no real businesses are found in the results, return an EMPTY array.
5. The company name MUST appear verbatim in the search results.
6. Do NOT generate fake 555-XXXX phone numbers.
7. Do NOT generate emails that aren't in the source text.
8. It is BETTER to return fewer leads with real data than many leads with fake data.

Extract what you can find. Leave unknown fields as null.`;
}

// ── Enrich a single lead via Serper → Apollo → PDL waterfall ──
async function enrichLead(
  company: string,
  state: string | null,
  industry: string | null,
): Promise<{ contact_name?: string; email?: string; phone?: string; linkedin_url?: string }> {
  const result: { contact_name?: string; email?: string; phone?: string; linkedin_url?: string } = {};

  // Step 1: Serper web search
  const SERPER_KEY = Deno.env.get("SERPER_API_KEY");
  if (SERPER_KEY) {
    try {
      const q = `${company} ${state || ""} owner contact email`;
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 5 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const r of (data.organic || [])) {
          if (r.link?.includes("linkedin.com/in/")) {
            result.linkedin_url = r.link;
            break;
          }
        }
        const kg = data.knowledgeGraph || {};
        if (kg.phoneNumber) result.phone = kg.phoneNumber;
        if (kg.email) result.email = kg.email;
      }
    } catch (e) { console.warn("[enrich] Serper failed:", e); }
  }

  // Step 2: Apollo people search
  const APOLLO_KEY = Deno.env.get("APOLLO_API_KEY");
  if (!result.email && APOLLO_KEY) {
    try {
      const resp = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
        body: JSON.stringify({
          q_organization_name: company,
          person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
          page: 1,
          per_page: 3,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const best = (data.people || [])[0];
        if (best) {
          if (!result.contact_name) result.contact_name = best.name || `${best.first_name || ""} ${best.last_name || ""}`.trim() || undefined;
          if (best.email) result.email = best.email;
          if (!result.phone && best.phone_numbers?.[0]?.sanitized_number) result.phone = best.phone_numbers[0].sanitized_number;
        }
      }
    } catch (e) { console.warn("[enrich] Apollo failed:", e); }
  }

  // Step 3: PDL fallback
  const PDL_KEY = Deno.env.get("PDL_API_KEY");
  if (!result.email && PDL_KEY) {
    try {
      const resp = await fetch("https://api.peopledatalabs.com/v5/person/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": PDL_KEY },
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                { match: { job_company_name: company } },
                { terms: { job_title_levels: ["owner", "cxo", "director", "vp"] } },
              ],
            },
          },
          size: 1,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const person = data.data?.[0];
        if (person) {
          if (!result.contact_name) result.contact_name = person.full_name || undefined;
          if (person.work_email) result.email = person.work_email;
          else if (person.personal_emails?.[0]) result.email = person.personal_emails[0];
          if (!result.phone && person.phone_numbers?.[0]) result.phone = person.phone_numbers[0];
        }
      }
    } catch (e) { console.warn("[enrich] PDL failed:", e); }
  }

  return result;
}

// ── Score leads based on real data completeness ──
function calculateLeadScore(lead: any): number {
  let score = 50; // Base score

  // Positive signals (real data present)
  if (lead.email) score += 15;
  if (lead.phone && !/555-\d{4}/.test(lead.phone)) score += 10;
  if (lead.contact_name) score += 10;
  if (lead.website) score += 5;
  if (lead.state) score += 3;
  if (lead.industry) score += 2;

  // Penalty for missing critical contact data
  if (!lead.email) score -= 10;
  if (!lead.phone) score -= 5;
  if (!lead.contact_name) score -= 5;

  // Fake phone penalty
  if (lead.phone && /555-\d{4}/.test(lead.phone)) score -= 15;

  // Clamp to 1-99
  return Math.max(1, Math.min(99, score));
}

// ── Enrich a batch of leads (max concurrency 3) ──
async function enrichLeadsBatch(
  leads: Array<{ company: string; state: string | null; industry: string | null; idx: number }>,
): Promise<Map<number, { contact_name?: string; email?: string; phone?: string; linkedin_url?: string }>> {
  const results = new Map<number, { contact_name?: string; email?: string; phone?: string; linkedin_url?: string }>();
  
  // Process in batches of 3 to avoid rate limits
  for (let i = 0; i < leads.length; i += 3) {
    const batch = leads.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(async (l) => {
        const enriched = await enrichLead(l.company, l.state, l.industry);
        return { idx: l.idx, data: enriched };
      })
    );
    for (const r of batchResults) {
      results.set(r.idx, r.data);
    }
  }

  return results;
}

// ── Tier and activity type maps ──
const tierMap: Record<string, number> = {
  LinkedIn: 1, "FEMA Flood Zones": 1, "OpenFEMA NFIP": 1, "NOAA Storm Events": 1,
  "Property Records": 1, "Building Permits": 1, "Tax Delinquency": 1,
  "FL Citizens Non-Renewal": 1, "ATTOM Data": 1, "State Socrata Portals": 1,
  "County ArcGIS": 1, "CT Property Transfers": 1, "NYC ACRIS": 1,
  "MassGIS Parcels": 1, "NJ MOD-IV / Sales": 1, "RI Coastal (FEMA)": 1,
  "Google Maps": 1,
  Reddit: 2, "Business Filings": 2, "Permit Database": 2, "NHTSA Vehicles": 2,
  "HUD Housing Data": 2, "RentCast": 2, "Regrid Parcels": 2, "BatchData": 2,
  "Census / ACS Data": 3, "Google Trends": 3,
};

const activityTypeMap: Record<string, string> = {
  LinkedIn: "linkedin", Reddit: "reddit", "Business Filings": "filing",
  "Permit Database": "filing", "FEMA Flood Zones": "flood", "NOAA Storm Events": "storm",
  "Census / ACS Data": "filing", "NHTSA Vehicles": "filing", "OpenFEMA NFIP": "flood",
  "HUD Housing Data": "property", "Property Records": "property", "Building Permits": "property",
  "Tax Delinquency": "property", "Google Trends": "filing", "ATTOM Data": "property",
  "RentCast": "property", "Regrid Parcels": "property", "BatchData": "property",
  "FL Citizens Non-Renewal": "property", "State Socrata Portals": "property",
  "County ArcGIS": "property", "CT Property Transfers": "property", "NYC ACRIS": "property",
  "MassGIS Parcels": "property", "NJ MOD-IV / Sales": "property", "RI Coastal (FEMA)": "flood",
  "Google Maps": "google_maps",
};

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

    // Generate a unique batch ID for this scan run
    const batchId = `batch_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    console.log(`[lead-engine-scan] Starting ${source} scan for user ${userId} | batch=${batchId} | states=${settings.states} | industries=${settings.industries}`);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ═══════════════════════════════════════════════════════════
    // ── GOOGLE MAPS PATH: Real data from Places API + enrichment
    // ═══════════════════════════════════════════════════════════
    if (source === "Google Maps") {
      const GOOGLE_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
      const SERPER_KEY = Deno.env.get("SERPER_API_KEY");
      
      const queries = buildGoogleMapsQueries(settings);
      console.log(`[lead-engine-scan] Google Maps — running ${queries.length} place searches`);

      const allPlaces: PlacesResult[] = [];
      const seenNames = new Set<string>();

      // Try Google Places API first
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

      // Fallback: use Serper maps endpoint for actual business listings, then web search
      if (allPlaces.length === 0 && SERPER_KEY) {
        console.log(`[lead-engine-scan] Google Places returned 0 — falling back to Serper maps + web search`);
        
        // Step 1: Try Serper Maps endpoint (returns actual Google Maps business listings)
        for (const q of queries.slice(0, 6)) {
          try {
            const mapsResp = await fetch("https://google.serper.dev/maps", {
              method: "POST",
              headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ q, gl: "us" }),
            });
            if (mapsResp.ok) {
              const mapsData = await mapsResp.json();
              for (const p of (mapsData.places || [])) {
                const name = p.title || "";
                if (!name) continue;
                const key = name.toLowerCase().trim();
                if (seenNames.has(key)) continue;
                seenNames.add(key);
                let state: string | null = null;
                let city: string | null = null;
                const addr = p.address || "";
                const stMatch = addr.match(/,\s*([A-Z]{2})\s+\d/);
                if (stMatch) state = stMatch[1];
                const cityMatch = addr.match(/,\s*([^,]+),\s*[A-Z]{2}/);
                if (cityMatch) city = cityMatch[1].trim();
                allPlaces.push({
                  company: name,
                  address: addr,
                  phone: p.phoneNumber || null,
                  website: p.website || null,
                  rating: p.rating || null,
                  reviewCount: p.ratingCount || null,
                  city,
                  state,
                });
              }
              if ((mapsData.places || []).length > 0) {
                console.log(`[lead-engine-scan] Serper Maps "${q}" → ${mapsData.places.length} businesses`);
              }
            }
          } catch (e) { console.warn(`[lead-engine-scan] Serper Maps query failed:`, e); }
        }
        
        // Step 2: If still not enough, supplement with regular web search
        if (allPlaces.length < 10) {
        for (const q of queries.slice(0, 6)) {
          try {
            const resp = await fetch("https://google.serper.dev/search", {
              method: "POST",
              headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ q, num: 10, gl: "us" }),
            });
            if (!resp.ok) { await resp.text(); continue; }
            const data = await resp.json();
            // Extract local/places results from Serper
            const places = data.places || [];
            for (const p of places) {
              const name = p.title || p.name || "";
              if (!name) continue;
              const key = name.toLowerCase().trim();
              if (seenNames.has(key)) continue;
              seenNames.add(key);
              // Parse state from address
              let state: string | null = null;
              let city: string | null = null;
              const addr = p.address || "";
              const stMatch = addr.match(/,\s*([A-Z]{2})\s+\d/);
              if (stMatch) state = stMatch[1];
              const cityMatch = addr.match(/,\s*([^,]+),\s*[A-Z]{2}/);
              if (cityMatch) city = cityMatch[1].trim();
              allPlaces.push({
                company: name,
                address: addr,
                phone: p.phoneNumber || p.phone || null,
                website: p.website || p.link || null,
                rating: p.rating || null,
                reviewCount: p.ratingCount || null,
                city,
                state,
              });
            }
            // Also extract from organic results that look like individual business pages
            for (const r of (data.organic || []).slice(0, 5)) {
              const title = r.title || "";
              const link = r.link || "";
              // Skip aggregator / directory / listicle / government / job sites
              if (/yelp|yellowpages|bbb|manta|mapquest|tripadvisor|indeed|glassdoor|ziprecruiter|wikipedia|alltruckjobs|zippia|comparably|crunchbase\.com\/hub|listicle|cdljobs|\.gov\//i.test(link)) continue;
              if (!title || seenNames.has(title.toLowerCase().trim())) continue;
              // Skip list articles, search result pages, job postings, and generic non-business content
              if (/top \d|best \d|\d+ best|\d+ largest|learn about \d|company search|search results|companies in|how to|what is|guide|blog|hiring|cdl drivers|motor carrier list|intrastate licens|enforcement/i.test(title)) continue;
              // Skip very generic titles that are clearly not business names
              if (/^(home|about|contact|services|all|motor carriers?)$/i.test(title.trim())) continue;
              // Skip titles that are just location names (e.g., "DALLAS, TX")
              if (/^[A-Z\s]+,\s*[A-Z]{2}$/i.test(title.trim())) continue;
              // Skip titles containing aggregation keywords (unless they have LLC/Inc/Corp indicating a real business)
              if (/freight shipping|ltl freight|shipping company|freight forwarder/i.test(title) && !/inc|llc|corp|co\.|l\.l\.c/i.test(title)) continue;
              seenNames.add(title.toLowerCase().trim());
              let state: string | null = null;
              const snippet = r.snippet || "";
              const stMatch = snippet.match(/\b([A-Z]{2})\b/);
              if (stMatch && STATE_FULL_NAMES[stMatch[1]]) state = stMatch[1];
              // Clean company name: strip taglines, page titles, suffixes
              let companyName = title.replace(/\s*[-|–—:]\s*(Home|About|Contact|Services|Official|Welcome|All|Overview|Premier|Leading|Your|Best|Top).*$/i, "").trim();
              companyName = companyName.replace(/\s*\|\s*.*$/, "").trim(); // strip "| anything"
              companyName = companyName.replace(/:\s*(Premier|Leading|Your|A |The |Best|Top|#1|No\.).*$/i, "").trim(); // strip taglines after colon
              companyName = companyName.replace(/\s*[-–—]\s*[^-–—]*$/, "").trim();
              if (companyName.length < 3 || companyName.length > 80) continue;
              // Final check: skip if cleaned name is still generic
              if (/^(home|about|all|contact|motor carriers?)$/i.test(companyName)) continue;
              allPlaces.push({
                company: companyName,
                address: "",
                phone: null,
                website: link || null,
                rating: null,
                reviewCount: null,
                city: null,
                state,
              });
            }
            console.log(`[lead-engine-scan] Serper "${q}" → found ${places.length} places + organic`);
          } catch (e) {
            console.warn(`[lead-engine-scan] Serper query failed:`, e);
          }
        }
      }

      console.log(`[lead-engine-scan] Google Maps total unique: ${allPlaces.length}`);

      if (allPlaces.length === 0) {
        return new Response(JSON.stringify({ success: true, leads_found: 0, message: "No businesses found for your criteria. Try different states or industries." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Score based on real signals only
      const scored = allPlaces.map(p => {
        let score = 50;
        if (!p.website) score += 20;
        if ((p.reviewCount ?? 0) < 10) score += 15;
        if ((p.reviewCount ?? 0) === 0) score += 10;
        if ((p.rating ?? 5) < 4.0) score += 5;
        score = Math.min(score, 99);
        return { ...p, score };
      }).sort((a, b) => b.score - a.score);

      const topPlaces = scored.slice(0, 12);

      // Insert leads with ONLY real Google Places data (no AI-fabricated contacts)
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
        return new Response(JSON.stringify({ error: "Failed to save leads: " + insertErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Enrich inserted leads via Serper → Apollo → PDL waterfall ──
      if (inserted && inserted.length > 0) {
        console.log(`[lead-engine-scan] Enriching ${inserted.length} Google Maps leads via waterfall...`);
        const enrichBatch = inserted.map((lead: any, idx: number) => ({
          company: lead.company,
          state: lead.state,
          industry: lead.industry,
          idx,
          id: lead.id,
        }));

        const enrichResults = await enrichLeadsBatch(enrichBatch);

        // Update each lead with enriched data
        for (const lead of enrichBatch) {
          const enriched = enrichResults.get(lead.idx);
          if (enriched && (enriched.contact_name || enriched.email || enriched.phone)) {
            const updates: Record<string, unknown> = {};
            if (enriched.contact_name) updates.contact_name = enriched.contact_name;
            if (enriched.email) updates.email = enriched.email;
            if (enriched.phone) updates.phone = enriched.phone;

            await adminClient
              .from("engine_leads")
              .update(updates)
              .eq("id", lead.id);
          }
        }

        const enrichedCount = Array.from(enrichResults.values()).filter(r => r.email || r.contact_name).length;
        console.log(`[lead-engine-scan] Enrichment complete: ${enrichedCount}/${inserted.length} leads enriched with real contact data`);
      }

      await adminClient.from("engine_activity").insert({
        user_id: userId,
        activity_type: "google_maps",
        description: `Google Maps scan found ${inserted?.length || leadsToInsert.length} businesses — enriching via Serper/Apollo/PDL`,
        source: "Google Maps",
        metadata: {
          total_discovered: allPlaces.length,
          queries_run: queries.length,
          avg_rating: allPlaces.reduce((s, p) => s + (p.rating || 0), 0) / allPlaces.length,
          no_website_pct: Math.round(allPlaces.filter(p => !p.website).length / allPlaces.length * 100),
          states: settings.states,
          industries: settings.industries,
        },
      });

      const count = inserted?.length || leadsToInsert.length;
      return new Response(JSON.stringify({
        success: true,
        leads_found: count,
        batch_id: batchId,
        message: `Found ${count} real businesses from Google Maps (${allPlaces.length} total scanned). Contact data is being enriched via verified sources.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ── FIRECRAWL PATH: Extract real data from web search results
    // ═══════════════════════════════════════════════════════════
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({
        success: true,
        leads_found: 0,
        message: `${source} scan requires web search capabilities. Please configure Firecrawl to enable this data source.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit: 5, tbs: "qdr:m" }),
        });
        if (resp.status === 402) {
          console.warn("[lead-engine-scan] Firecrawl credits exhausted");
          return [];
        }
        const data = await resp.json();
        if (data.success && data.data?.length > 0) {
          return data.data.map((r: any) => ({
            title: r.title || "",
            description: r.description || "",
            url: r.url || "",
          }));
        }
        return [];
      } catch (e) {
        console.warn(`[lead-engine-scan] Firecrawl failed for: ${query}`, e);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    for (const batch of searchResults) {
      allSearchResults.push(...batch);
    }

    console.log(`[lead-engine-scan] Total Firecrawl results: ${allSearchResults.length}`);

    if (allSearchResults.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        leads_found: 0,
        message: `No results found for ${source}. Try different states, industries, or keywords.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format results for AI extraction (NOT generation)
    const firecrawlText = allSearchResults.map((r, i) =>
      `[${i + 1}] Title: ${r.title}\nSnippet: ${r.description}\nURL: ${r.url}`
    ).join("\n\n");

    // Use AI to EXTRACT (not generate) leads from real search results
    const extractionPrompt = buildExtractionPrompt(source, firecrawlText);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a strict data extraction tool. You ONLY extract information that explicitly appears in the provided text. You NEVER invent, fabricate, or hallucinate data. If information is not present, use null. Return fewer results rather than fake results.",
          },
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
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit — try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI extraction failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // Filter out leads with suspicious patterns (555-XXXX phones, fabricated-looking emails)
    const validatedLeads = extractedLeads.filter((l: any) => {
      if (!l.company || l.company === "Unknown Business") return false;
      // Reject 555-XXXX pattern phones (these are always fake)
      if (l.phone && /555-\d{4}/.test(l.phone)) {
        l.phone = null;
      }
      return true;
    });

    console.log(`[lead-engine-scan] Extracted ${validatedLeads.length} real leads from ${allSearchResults.length} search results`);

    if (validatedLeads.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        leads_found: 0,
        message: `No specific business leads could be extracted from ${source} search results. Try different parameters.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert with only real extracted data
    const leadsToInsert = validatedLeads.slice(0, 12).map((l: any) => ({
      owner_user_id: userId,
      company: l.company,
      contact_name: l.contact_name || null,
      email: l.email || null,
      phone: l.phone || null,
      industry: l.industry || settings.industries?.split(",")[0]?.trim() || null,
      state: l.state || null,
      est_premium: 5000,
      signal: [
        l.signal || `Found via ${source}`,
        l.city ? `Located in ${l.city}, ${l.state || ""}` : null,
      ].filter(Boolean).join(" • ").slice(0, 500),
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
        console.error("[lead-engine-scan] Retry insert error:", retryErr);
        return new Response(JSON.stringify({ error: "Failed to save leads: " + retryErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Use retry results for enrichment
      if (retryInserted) {
        await enrichInsertedLeads(retryInserted, adminClient);
      }
    } else if (inserted) {
      // ── Enrich via Serper → Apollo → PDL waterfall ──
      await enrichInsertedLeads(inserted, adminClient);
    }

    // Log activity
    await adminClient.from("engine_activity").insert({
      user_id: userId,
      activity_type: activityTypeMap[source] || "default",
      description: `${source} scan extracted ${inserted?.length || leadsToInsert.length} real leads — enriching via verified sources`,
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

    return new Response(JSON.stringify({
      success: true,
      leads_found: count,
      batch_id: batchId,
      message: `Extracted ${count} real leads from ${source} search results. Contact data is being enriched via Serper/Apollo/PDL.`,
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

// Helper: enrich inserted leads in background
async function enrichInsertedLeads(
  inserted: Array<{ id: string; company: string; state: string | null; industry: string | null }>,
  adminClient: any,
) {
  console.log(`[lead-engine-scan] Enriching ${inserted.length} leads via Serper → Apollo → PDL waterfall...`);
  const enrichBatch = inserted.map((lead, idx) => ({
    company: lead.company,
    state: lead.state,
    industry: lead.industry,
    idx,
    id: lead.id,
  }));

  const enrichResults = await enrichLeadsBatch(enrichBatch);

  for (const lead of enrichBatch) {
    const enriched = enrichResults.get(lead.idx);
    if (enriched && (enriched.contact_name || enriched.email || enriched.phone)) {
      const updates: Record<string, unknown> = {};
      if (enriched.contact_name) updates.contact_name = enriched.contact_name;
      if (enriched.email) updates.email = enriched.email;
      if (enriched.phone) updates.phone = enriched.phone;

      await adminClient
        .from("engine_leads")
        .update(updates)
        .eq("id", lead.id);
    }
  }

  const enrichedCount = Array.from(enrichResults.values()).filter(r => r.email || r.contact_name).length;
  console.log(`[lead-engine-scan] Enrichment complete: ${enrichedCount}/${inserted.length} leads enriched with verified data`);
}
