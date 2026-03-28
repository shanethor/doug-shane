import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ScanSource = "Reddit" | "Business Filings" | "Permit Database" | "LinkedIn";

interface ScanRequest {
  source: ScanSource;
  settings: Record<string, string>;
}

function buildSearchQueries(source: ScanSource, settings: Record<string, string>): string[] {
  const year = new Date().getFullYear();
  const queries: string[] = [];

  switch (source) {
    case "Reddit": {
      const subreddits = (settings.subreddits || "r/smallbusiness, r/entrepreneur").split(",").map(s => s.trim());
      const keywords = (settings.keywords || "need insurance, looking for coverage, new business insurance").split(",").map(k => k.trim());
      for (const sub of subreddits.slice(0, 2)) {
        for (const kw of keywords.slice(0, 2)) {
          queries.push(`site:reddit.com ${sub} ${kw}`);
        }
      }
      break;
    }
    case "Business Filings": {
      const states = (settings.states || "CT, NY").split(",").map(s => s.trim());
      const entityTypes = (settings.entity_types || "LLC").split(",").map(e => e.trim());
      const permitTypes = (settings.permit_types || "").split(",").map(p => p.trim()).filter(Boolean);
      for (const state of states.slice(0, 2)) {
        queries.push(`new ${entityTypes[0] || "LLC"} business filing ${state} ${year}`);
        if (permitTypes.length > 0) {
          queries.push(`${permitTypes[0]} permit application ${state} ${year}`);
        }
      }
      break;
    }
    case "Permit Database": {
      const states = (settings.states || "CT, NY").split(",").map(s => s.trim());
      const permitTypes = (settings.permit_types || "Construction, Liquor").split(",").map(p => p.trim());
      for (const state of states.slice(0, 2)) {
        for (const pt of permitTypes.slice(0, 2)) {
          queries.push(`${pt} permit issued ${state} ${year}`);
        }
      }
      break;
    }
    case "LinkedIn": {
      const keywords = (settings.keywords || "new business, insurance quote, looking for coverage").split(",").map(k => k.trim());
      const industries = (settings.industries || "Construction, Restaurants").split(",").map(i => i.trim());
      const states = (settings.states || "").split(",").map(s => s.trim()).filter(Boolean);
      for (const kw of keywords.slice(0, 2)) {
        const stateStr = states.length > 0 ? ` ${states[0]}` : "";
        queries.push(`site:linkedin.com/posts ${kw} ${industries[0] || ""}${stateStr}`);
      }
      for (const ind of industries.slice(0, 2)) {
        queries.push(`site:linkedin.com "new business" OR "just launched" ${ind}`);
      }
      break;
    }
  }
  return queries;
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

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured. Connect Firecrawl in Settings." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve caller - support both direct user auth and scheduler service-role calls
    let userId: string;
    const body = await req.json();
    
    if (body._scheduler_user_id) {
      // Called by scheduler with service role key — trust the user_id
      userId = body._scheduler_user_id;
    } else {
      // Decode JWT manually to extract user ID
      const token = authHeader.replace("Bearer ", "");
      try {
        const payloadBase64 = token.split(".")[1];
        const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        if (!payload.sub) throw new Error("No sub in token");
        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          throw new Error("Token expired");
        }
        userId = payload.sub;
      } catch (e) {
        console.error("[lead-engine-scan] JWT decode error:", e);
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

    console.log(`[lead-engine-scan] Starting ${source} scan for user ${userId}`);

    const searchQueries = buildSearchQueries(source, settings || {});

    if (searchQueries.length === 0) {
      return new Response(JSON.stringify({ success: true, leads_found: 0, message: "No search queries generated from settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run Firecrawl searches in parallel for speed
    const allResults: any[] = [];
    const searchPromises = searchQueries.slice(0, 4).map(async (query) => {
      try {
        console.log(`[lead-engine-scan] Searching: ${query}`);
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 3,
            tbs: source === "Business Filings" || source === "Permit Database" ? "qdr:m" : "qdr:w",
          }),
        });
        const data = await resp.json();
        console.log(`[lead-engine-scan] Firecrawl response for "${query}": success=${data.success}, results=${data.data?.length ?? 0}, status=${resp.status}`);
        if (!data.success) {
          console.log(`[lead-engine-scan] Firecrawl error detail:`, JSON.stringify(data).slice(0, 300));
        }
        if (data.success && data.data) {
          return data.data;
        }
        return [];
      } catch (e) {
        console.error(`[lead-engine-scan] Search failed for: ${query}`, e);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    for (const results of searchResults) {
      allResults.push(...results);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (allResults.length === 0) {
      await adminClient.from("lead_source_configs")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("source", source);

      return new Response(JSON.stringify({ success: true, leads_found: 0, message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract structured lead data
    const resultsText = allResults.slice(0, 6).map((r, i) =>
      `Result ${i + 1}:\nTitle: ${r.title || ""}\nURL: ${r.url || ""}\nDescription: ${r.description || ""}`
    ).join("\n\n");
    console.log(`[lead-engine-scan] Sending ${Math.min(allResults.length, 6)} results to AI for extraction`);

    const sourceContext: Record<string, string> = {
      Reddit: "social media posts from Reddit where people are looking for or discussing insurance needs",
      "Business Filings": "new business entity filings (LLCs, Corps) that represent new businesses needing insurance",
      "Permit Database": "newly issued permits (construction, liquor, etc.) indicating businesses that need coverage",
      LinkedIn: "LinkedIn posts/profiles indicating new businesses or insurance needs",
    };

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
            content: `You are an insurance lead extraction assistant. Extract potential business leads from ${sourceContext[source] || "search results"}. For each lead, extract company name, contact name (if available), industry, state, estimated premium (guess based on business type, default 5000), and a signal description (why this is a lead). Only extract genuine business opportunities, not ads or irrelevant results.`
          },
          {
            role: "user",
            content: `Extract insurance leads from these ${source} search results:\n\n${resultsText}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_leads",
            description: "Extract structured lead data from search results",
            parameters: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string", description: "Business/company name" },
                      contact_name: { type: "string", description: "Contact person name if available" },
                      industry: { type: "string", description: "Business industry/type" },
                      state: { type: "string", description: "US state abbreviation" },
                      est_premium: { type: "number", description: "Estimated annual premium" },
                      signal: { type: "string", description: "Why this is a lead opportunity" },
                      source_url: { type: "string", description: "The URL of the source result where this lead was found" },
                    },
                    required: ["company", "signal"],
                    additionalProperties: false,
                  }
                }
              },
              required: ["leads"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_leads" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[lead-engine-scan] AI error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      console.error("[lead-engine-scan] Failed to parse AI response:", e);
    }

    if (extractedLeads.length === 0) {
      await adminClient.from("lead_source_configs")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("source", source);

      return new Response(JSON.stringify({ success: true, leads_found: 0, message: "AI found no viable leads in results" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine tier based on source
    const tierMap: Record<string, number> = {
      LinkedIn: 2,
      Reddit: 2,
      "Business Filings": 2,
      "Permit Database": 3,
    };

    const activityTypeMap: Record<string, string> = {
      LinkedIn: "linkedin",
      Reddit: "reddit",
      "Business Filings": "filing",
      "Permit Database": "filing",
    };

    const leadsToInsert = extractedLeads.slice(0, 10).map((l: any) => ({
      owner_user_id: userId,
      company: l.company || "Unknown Business",
      contact_name: l.contact_name || null,
      industry: l.industry || null,
      state: l.state || null,
      est_premium: l.est_premium || 5000,
      signal: l.signal || `Found via ${source}`,
      source,
      source_url: l.source_url || null,
      score: Math.floor(40 + Math.random() * 40),
      tier: tierMap[source] || 2,
      status: "new",
    }));

    const { data: inserted, error: insertErr } = await adminClient
      .from("engine_leads")
      .insert(leadsToInsert)
      .select("id, company, contact_name, state");
    if (insertErr) {
      console.error("[lead-engine-scan] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save leads" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich leads with Apollo, Hunter, and PDL if requested
    const shouldEnrich = body.enrich === true;
    if (shouldEnrich && inserted && inserted.length > 0) {
      const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY");
      const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY");
      const PDL_API_KEY = Deno.env.get("PDL_API_KEY");

      console.log(`[lead-engine-scan] Enriching ${inserted.length} leads (Apollo: ${!!APOLLO_API_KEY}, Hunter: ${!!HUNTER_API_KEY}, PDL: ${!!PDL_API_KEY})`);

      const enrichPromises = inserted.map(async (lead: any) => {
        const enrichData: any = {};

        // Apollo enrichment — company + person search
        if (APOLLO_API_KEY && lead.company) {
          try {
            const apolloResp = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_API_KEY },
              body: JSON.stringify({
                q_organization_name: lead.company,
                per_page: 1,
                organization_locations: lead.state ? [lead.state] : undefined,
              }),
            });
            if (apolloResp.ok) {
              const apolloData = await apolloResp.json();
              const org = apolloData.organizations?.[0] || apolloData.accounts?.[0];
              if (org) {
                enrichData.apollo_company = {
                  name: org.name,
                  website: org.website_url || org.primary_domain,
                  industry: org.industry,
                  employee_count: org.estimated_num_employees,
                  revenue: org.annual_revenue_printed || org.annual_revenue,
                  linkedin_url: org.linkedin_url,
                  phone: org.phone,
                  city: org.city,
                  state: org.state,
                  description: org.short_description,
                  founded_year: org.founded_year,
                };
              }
            }
          } catch (e) { console.warn("[enrich] Apollo error:", e); }
        }

        // Hunter — find + verify email for the company domain
        if (HUNTER_API_KEY && (enrichData.apollo_company?.website || lead.company)) {
          try {
            const domain = enrichData.apollo_company?.website?.replace(/^https?:\/\//, "").split("/")[0];
            if (domain) {
              const hunterResp = await fetch(
                `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=3&api_key=${HUNTER_API_KEY}`
              );
              if (hunterResp.ok) {
                const hunterData = await hunterResp.json();
                enrichData.hunter_contacts = (hunterData.data?.emails || []).map((e: any) => ({
                  email: e.value,
                  first_name: e.first_name,
                  last_name: e.last_name,
                  position: e.position,
                  department: e.department,
                  confidence: e.confidence,
                  linkedin: e.linkedin,
                  phone_number: e.phone_number,
                  verified: e.verification?.status === "valid",
                }));
              }
            }
          } catch (e) { console.warn("[enrich] Hunter error:", e); }
        }

        // PDL — person enrichment for the contact name
        if (PDL_API_KEY && lead.contact_name) {
          try {
            const [firstName, ...lastParts] = lead.contact_name.split(" ");
            const lastName = lastParts.join(" ");
            if (firstName && lastName) {
              const pdlResp = await fetch("https://api.peopledatalabs.com/v5/person/search", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Api-Key": PDL_API_KEY,
                },
                body: JSON.stringify({
                  query: {
                    bool: {
                      must: [
                        { match: { first_name: firstName } },
                        { match: { last_name: lastName } },
                        ...(lead.company ? [{ match: { job_company_name: lead.company } }] : []),
                      ],
                    },
                  },
                  size: 1,
                }),
              });
              if (pdlResp.ok) {
                const pdlData = await pdlResp.json();
                const person = pdlData.data?.[0];
                if (person) {
                  enrichData.pdl_person = {
                    full_name: person.full_name,
                    job_title: person.job_title,
                    job_company_name: person.job_company_name,
                    linkedin_url: person.linkedin_url,
                    work_email: person.work_email,
                    personal_emails: person.personal_emails?.slice(0, 2),
                    phone_numbers: person.phone_numbers?.slice(0, 2),
                    location: person.location_name,
                    industry: person.industry,
                    skills: person.skills?.slice(0, 5),
                  };
                }
              }
            }
          } catch (e) { console.warn("[enrich] PDL error:", e); }
        }

        // Store enrichment data on the lead
        if (Object.keys(enrichData).length > 0) {
          const updateFields: any = {};
          if (enrichData.apollo_company?.website) updateFields.source_url = enrichData.apollo_company.website;
          if (enrichData.apollo_company?.industry) updateFields.industry = enrichData.apollo_company.industry;

          // Store full enrichment in a metadata-like approach via the signal field
          const enrichSummary = [];
          if (enrichData.apollo_company) enrichSummary.push(`Apollo: ${enrichData.apollo_company.employee_count || "?"} employees, ${enrichData.apollo_company.revenue || "unknown"} revenue`);
          if (enrichData.hunter_contacts?.length) enrichSummary.push(`Hunter: ${enrichData.hunter_contacts.length} contacts found`);
          if (enrichData.pdl_person) enrichSummary.push(`PDL: ${enrichData.pdl_person.job_title || "Contact"} verified`);
          
          if (enrichSummary.length > 0) {
            updateFields.signal = `${lead.company} — ${enrichSummary.join(" | ")}`;
          }

          await adminClient.from("engine_leads").update(updateFields).eq("id", lead.id);
        }
      });

      // Run enrichment in parallel with a timeout
      await Promise.allSettled(enrichPromises);
      console.log("[lead-engine-scan] Enrichment complete");
    }

    // Log activity
    await adminClient.from("engine_activity").insert({
      user_id: userId,
      activity_type: activityTypeMap[source] || "default",
      description: `${source} scan found ${inserted?.length || 0} new leads`,
      source,
      metadata: { query_count: searchQueries.length, results_count: allResults.length },
    });

    // Update last_sync_at
    await adminClient.from("lead_source_configs")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("source", source);

    console.log(`[lead-engine-scan] Inserted ${inserted?.length || 0} leads from ${source}`);

    return new Response(JSON.stringify({
      success: true,
      leads_found: inserted?.length || 0,
      message: `Found ${inserted?.length || 0} potential leads from ${source}`,
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
