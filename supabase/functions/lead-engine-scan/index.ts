import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ScanSource = "Reddit" | "Business Filings";

interface ScanRequest {
  source: ScanSource;
  settings: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Resolve caller
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { source, settings }: ScanRequest = await req.json();
    if (!source) throw new Error("source is required");

    console.log(`[lead-engine-scan] Starting ${source} scan for user ${user.id}`);

    // Build search queries based on source
    let searchQueries: string[] = [];

    if (source === "Reddit") {
      const subreddits = (settings.subreddits || "r/smallbusiness, r/entrepreneur").split(",").map(s => s.trim());
      const keywords = (settings.keywords || "need insurance, looking for coverage, new business insurance").split(",").map(k => k.trim());
      
      // Create targeted search queries
      for (const sub of subreddits.slice(0, 2)) {
        for (const kw of keywords.slice(0, 2)) {
          searchQueries.push(`site:reddit.com ${sub} ${kw}`);
        }
      }
    } else if (source === "Business Filings") {
      const states = (settings.states || "CT, NY").split(",").map(s => s.trim());
      const entityTypes = (settings.entity_types || "LLC").split(",").map(e => e.trim());
      const permitTypes = (settings.permit_types || "").split(",").map(p => p.trim()).filter(Boolean);

      for (const state of states.slice(0, 2)) {
        searchQueries.push(`new ${entityTypes[0] || "LLC"} business filing ${state} ${new Date().getFullYear()}`);
        if (permitTypes.length > 0) {
          searchQueries.push(`${permitTypes[0]} permit application ${state} ${new Date().getFullYear()}`);
        }
      }
    }

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
            tbs: "qdr:w", // last week
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

    if (allResults.length === 0) {
      // Update last_sync_at
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("lead_source_configs")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("source", source);

      return new Response(JSON.stringify({ success: true, leads_found: 0, message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract structured lead data from search results
    const resultsText = allResults.slice(0, 10).map((r, i) => 
      `Result ${i + 1}:\nTitle: ${r.title || ""}\nURL: ${r.url || ""}\nDescription: ${r.description || ""}`
    ).join("\n\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an insurance lead extraction assistant. Extract potential business leads from search results. For each lead, extract company name, contact name (if available), industry, state, estimated premium (guess based on business type, default 5000), and a signal description (why this is a lead). Only extract genuine business opportunities, not ads or irrelevant results. Return ONLY leads that represent a real business that might need insurance.`
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI extraction failed");
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
      return new Response(JSON.stringify({ success: true, leads_found: 0, message: "AI found no viable leads in results" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert leads into engine_leads using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const leadsToInsert = extractedLeads.slice(0, 10).map((l: any) => ({
      owner_user_id: user.id,
      company: l.company || "Unknown Business",
      contact_name: l.contact_name || null,
      industry: l.industry || null,
      state: l.state || null,
      est_premium: l.est_premium || 5000,
      signal: l.signal || `Found via ${source}`,
      source,
      score: Math.floor(40 + Math.random() * 40), // 40-80 score range
      tier: 2, // Default to Warm for auto-discovered
      status: "new",
    }));

    const { data: inserted, error: insertErr } = await adminClient
      .from("engine_leads")
      .insert(leadsToInsert)
      .select("id");
    if (insertErr) {
      console.error("[lead-engine-scan] Insert error:", insertErr);
      throw insertErr;
    }

    // Log activity
    await adminClient.from("engine_activity").insert({
      user_id: user.id,
      activity_type: source === "Reddit" ? "reddit" : "filing",
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
