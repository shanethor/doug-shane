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
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Not authenticated. Please log in again." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
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

    // Run Firecrawl searches
    const allResults: any[] = [];
    for (const query of searchQueries.slice(0, 4)) {
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
            limit: 5,
            tbs: source === "Business Filings" || source === "Permit Database" ? "qdr:m" : "qdr:w",
          }),
        });
        const data = await resp.json();
        if (data.success && data.data) {
          allResults.push(...data.data);
        }
      } catch (e) {
        console.error(`[lead-engine-scan] Search failed for: ${query}`, e);
      }
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
    const resultsText = allResults.slice(0, 10).map((r, i) =>
      `Result ${i + 1}:\nTitle: ${r.title || ""}\nURL: ${r.url || ""}\nDescription: ${r.description || ""}`
    ).join("\n\n");

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
      score: Math.floor(40 + Math.random() * 40),
      tier: tierMap[source] || 2,
      status: "new",
    }));

    const { data: inserted, error: insertErr } = await adminClient
      .from("engine_leads")
      .insert(leadsToInsert)
      .select("id");
    if (insertErr) {
      console.error("[lead-engine-scan] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save leads" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity
    await adminClient.from("engine_activity").insert({
      user_id: user.id,
      activity_type: activityTypeMap[source] || "default",
      description: `${source} scan found ${inserted?.length || 0} new leads`,
      source,
      metadata: { query_count: searchQueries.length, results_count: allResults.length },
    });

    // Update last_sync_at
    await adminClient.from("lead_source_configs")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id)
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
