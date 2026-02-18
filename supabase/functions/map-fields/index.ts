import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { extracted_data, target_fields, form_name } = await req.json();

    if (!extracted_data || !target_fields) {
      return new Response(JSON.stringify({ error: "Missing extracted_data or target_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build a concise representation of what we have and what we need
    const extractedSummary = Object.entries(extracted_data)
      .filter(([_, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join("\n");

    const unfilled = target_fields as string[];

    const systemPrompt = `You are an expert insurance data mapper. You map extracted business data to ACORD insurance form fields.

Given extracted business data and a list of unfilled ACORD form fields, do TWO things:
1. Map extracted values to form fields where you're confident.
2. Mark fields as NOT APPLICABLE based on the business type and coverage context.

Rules for mapping values:
- Only map values you are confident about. Do not guess or fabricate data.
- A single extracted value can map to multiple form fields (e.g. an address maps to mailing, premises, building addresses).
- Use your insurance domain knowledge to make smart inferences (e.g. if you see "LLC" in the business name, business_type should be "LLC").
- For Yes/No fields, infer from context when possible (e.g. if there's a safety program description, safety_program = "Yes").
- For checkbox fields, return true/false.
- For date fields, return YYYY-MM-DD format.
- For currency fields, return numeric strings without $ or commas.

Rules for marking fields N/A:
- Analyze the business type (e.g. contractor, restaurant, retail) and determine which coverage lines are IRRELEVANT.
- For premium fields of irrelevant coverage lines, set to "0" (e.g. inland_marine_premium, cyber_premium, liquor_premium for a general contractor).
- For LOB checkbox fields of irrelevant lines, set to false (e.g. lob_cyber, lob_crime for a small contractor).
- For fields about vehicles/drivers when the business clearly has no auto exposure, set to "N/A".
- For umbrella/excess fields when there's no umbrella coverage indicated, set to "N/A".
- Be conservative: only mark a field N/A if you're reasonably confident the coverage line doesn't apply based on the business profile.
- Common examples:
  - General contractor → inland_marine_premium=0, cyber_premium=0, crime_premium=0, liquor_premium=0, garage_premium=0, bop_premium=0
  - Restaurant → auto_premium=0, inland_marine_premium=0, boiler_premium=0 (unless indicated otherwise)
  - Small business without fleet → driver fields = "N/A", vehicle fields = "N/A"

- Return ONLY a JSON object mapping field_key -> value. No explanations.`;

    const userPrompt = `Form: ${form_name || "ACORD Form"}

Extracted Business Data:
${extractedSummary}

Unfilled ACORD form fields that need values:
${unfilled.join(", ")}

Return a JSON object mapping field keys to inferred values. Only include fields you can confidently fill.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later", mappings: {} }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error", mappings: {} }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";

    // Parse the JSON from the response (handle markdown code blocks)
    let mappings: Record<string, any> = {};
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      mappings = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse AI mapping response:", content);
      mappings = {};
    }

    // Filter to only include keys that are in the target fields list
    const validMappings: Record<string, any> = {};
    const targetSet = new Set(unfilled);
    for (const [key, value] of Object.entries(mappings)) {
      if (targetSet.has(key) && value !== null && value !== undefined && value !== "") {
        validMappings[key] = value;
      }
    }

    return new Response(JSON.stringify({ mappings: validMappings, ai_inferred_count: Object.keys(validMappings).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("map-fields error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", mappings: {} }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
