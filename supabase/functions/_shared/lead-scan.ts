// ─── Lead Scan: Google Places, Serper fallback, Firecrawl search, query builders ───

export type ScanSource = "Reddit" | "Business Filings" | "Permit Database" | "LinkedIn" | "FEMA Flood Zones" | "NOAA Storm Events" | "Census / ACS Data" | "NHTSA Vehicles" | "OpenFEMA NFIP" | "HUD Housing Data" | "Property Records" | "Building Permits" | "Tax Delinquency" | "Google Trends" | "ATTOM Data" | "RentCast" | "Regrid Parcels" | "BatchData" | "FL Citizens Non-Renewal" | "State Socrata Portals" | "County ArcGIS" | "CT Property Transfers" | "NYC ACRIS" | "MassGIS Parcels" | "NJ MOD-IV / Sales" | "RI Coastal (FEMA)" | "Google Maps";

export interface PlacesResult {
  company: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  city: string | null;
  state: string | null;
}

// ── Business name filter ──
const NON_BUSINESS_PATTERN = /federal motor carrier|motor carrier compliance|department of transportation|highway patrol|public safety|dmv\b|dot office|chamber of commerce|\bassociation\b|licensing|compliance (office|bureau)|insurance agenc|insurance compan|lead(s)?\s*(generation|service|provider)|auto transport leads|safety administration|state police|city of |county of |town of |village of |\.gov\b|government|municipality/i;

export function isValidBusinessLead(name: string): boolean {
  if (!name || name.length < 3 || name.length > 80) return false;
  if (NON_BUSINESS_PATTERN.test(name)) return false;
  if (/^(home|about|all|contact|motor carriers?)$/i.test(name)) return false;
  return true;
}

// ── State abbreviation map ──
export const STATE_FULL_NAMES: Record<string, string> = {
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
  return STATE_FULL_NAMES[s.toUpperCase().trim()] || s;
}

// ── Vertical-specific search term expansions ──
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

// ── Google Maps query builder ──
export function buildGoogleMapsQueries(settings: Record<string, string>): string[] {
  const rawStates = (settings.states || "TX, FL, CA").split(",").map(s => s.trim()).filter(Boolean);
  const states = rawStates.map(expandState);
  const rawIndustries = (settings.industries || "contractor, restaurant, HVAC").split(",").map(i => i.trim()).filter(Boolean);
  const queries: string[] = [];

  const industries: string[] = [];
  for (const ind of rawIndustries) {
    if (/\//.test(ind)) {
      industries.push(...ind.split("/").map(s => s.trim()).filter(Boolean));
    } else {
      industries.push(ind);
    }
  }

  for (const ind of industries.slice(0, 8)) {
    const lowerInd = ind.toLowerCase();
    const expansions = verticalSearchExpansions[lowerInd];

    if (expansions) {
      for (const term of expansions.slice(0, 3)) {
        for (const st of states.slice(0, 4)) {
          queries.push(`${term} in ${st}`);
        }
      }
    } else {
      for (const st of states.slice(0, 4)) {
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

  if (industries.length === 0 && states[0]) {
    queries.push(`new business in ${states[0]}`);
  }

  return queries.slice(0, 20);
}

// ── Google Places API search ──
export async function searchGooglePlaces(query: string, apiKey: string): Promise<PlacesResult[]> {
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
      return places
        .filter((p: any) => isValidBusinessLead(p.displayName?.text || ""))
        .map((p: any) => parseAddressToResult(p.displayName?.text || "Unknown Business", p.formattedAddress || "", p.nationalPhoneNumber || null, p.websiteUri || null, p.rating || null, p.userRatingCount || null));
    }
    const errText = await resp.text();
    console.warn(`[google-places] New API error ${resp.status}: ${errText.slice(0, 300)}`);
  } catch (e) {
    console.warn(`[google-places] New API fetch error:`, e);
  }

  // Fallback to legacy
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
  return (data.results || []).map((p: any) =>
    parseAddressToResult(p.name || "Unknown Business", p.formatted_address || "", null, null, p.rating || null, p.user_ratings_total || null)
  );
}

function parseAddressToResult(company: string, addr: string, phone: string | null, website: string | null, rating: number | null, reviewCount: number | null): PlacesResult {
  let city: string | null = null;
  let state: string | null = null;
  const match = addr.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d/);
  if (match) { city = match[1].trim(); state = match[2]; }
  else {
    const match2 = addr.match(/,\s*([^,]+),\s*([A-Z]{2}),/);
    if (match2) { city = match2[1].trim(); state = match2[2]; }
  }
  return { company, address: addr, phone, website, rating, reviewCount, city, state };
}

// ── Serper Maps + Web fallback ──
export async function searchSerperFallback(queries: string[], serperKey: string): Promise<PlacesResult[]> {
  const allPlaces: PlacesResult[] = [];
  const seenNames = new Set<string>();

  // Step 1: Serper Maps endpoint
  for (const q of queries.slice(0, 6)) {
    try {
      const mapsResp = await fetch("https://google.serper.dev/maps", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q, gl: "us" }),
      });
      if (mapsResp.ok) {
        const mapsData = await mapsResp.json();
        for (const p of (mapsData.places || [])) {
          const name = p.title || "";
          if (!name || !isValidBusinessLead(name)) continue;
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
          allPlaces.push({ company: name, address: addr, phone: p.phoneNumber || null, website: p.website || null, rating: p.rating || null, reviewCount: p.ratingCount || null, city, state });
        }
      }
    } catch (e) { console.warn(`[lead-scan] Serper Maps query failed:`, e); }
  }

  // Step 2: Serper web search supplement
  if (allPlaces.length < 10) {
    for (const q of queries.slice(0, 6)) {
      try {
        const resp = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q, num: 10, gl: "us" }),
        });
        if (!resp.ok) { await resp.text(); continue; }
        const data = await resp.json();

        for (const p of (data.places || [])) {
          const name = p.title || p.name || "";
          if (!name) continue;
          const key = name.toLowerCase().trim();
          if (seenNames.has(key)) continue;
          seenNames.add(key);
          const addr = p.address || "";
          let state: string | null = null;
          let city: string | null = null;
          const stMatch = addr.match(/,\s*([A-Z]{2})\s+\d/);
          if (stMatch) state = stMatch[1];
          const cityMatch = addr.match(/,\s*([^,]+),\s*[A-Z]{2}/);
          if (cityMatch) city = cityMatch[1].trim();
          allPlaces.push({ company: name, address: addr, phone: p.phoneNumber || p.phone || null, website: p.website || p.link || null, rating: p.rating || null, reviewCount: p.ratingCount || null, city, state });
        }

        for (const r of (data.organic || []).slice(0, 5)) {
          const title = r.title || "";
          const link = r.link || "";
          if (/yelp|yellowpages|bbb|manta|mapquest|tripadvisor|indeed|glassdoor|ziprecruiter|wikipedia|alltruckjobs|zippia|comparably|crunchbase\.com\/hub|listicle|cdljobs|\.gov\//i.test(link)) continue;
          if (!title || seenNames.has(title.toLowerCase().trim())) continue;
          if (/top \d|best \d|\d+ best|\d+ largest|learn about \d|company search|search results|companies in|how to|what is|guide|blog|hiring|cdl drivers|motor carrier list|intrastate licens|enforcement/i.test(title)) continue;
          if (/^(home|about|contact|services|all|motor carriers?)$/i.test(title.trim())) continue;
          if (/^[A-Z\s]+,\s*[A-Z]{2}$/i.test(title.trim())) continue;
          if (/freight shipping|ltl freight|shipping company|freight forwarder/i.test(title) && !/inc|llc|corp|co\.|l\.l\.c/i.test(title)) continue;
          seenNames.add(title.toLowerCase().trim());
          let state: string | null = null;
          const snippet = r.snippet || "";
          const stMatch = snippet.match(/\b([A-Z]{2})\b/);
          if (stMatch && STATE_FULL_NAMES[stMatch[1]]) state = stMatch[1];
          let companyName = title.replace(/\s*[-|–—:]\s*(Home|About|Contact|Services|Official|Welcome|All|Overview|Premier|Leading|Your|Best|Top).*$/i, "").trim();
          companyName = companyName.replace(/\s*\|\s*.*$/, "").trim();
          companyName = companyName.replace(/:\s*(Premier|Leading|Your|A |The |Best|Top|#1|No\.).*$/i, "").trim();
          companyName = companyName.replace(/\s*[-–—]\s*[^-–—]*$/, "").trim();
          if (companyName.length < 3 || companyName.length > 80) continue;
          if (/^(home|about|all|contact|motor carriers?)$/i.test(companyName)) continue;
          allPlaces.push({ company: companyName, address: "", phone: null, website: link || null, rating: null, reviewCount: null, city: null, state });
        }
      } catch (e) { console.warn(`[lead-scan] Serper query failed:`, e); }
    }
  }

  return allPlaces;
}

// ── Firecrawl search queries ──
export function buildSearchQueries(source: ScanSource, settings: Record<string, string>): string[] {
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

// ── AI extraction prompt builder ──
export function buildExtractionPrompt(source: ScanSource, firecrawlResults: string): string {
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
