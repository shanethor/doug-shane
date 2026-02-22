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

    // Filter out code fields — AI must never infer these
    const CODE_FIELDS = new Set([
      "sic_code", "naics_code", "naic_code", "gl_code", "class_code_1", "class_code_2",
      "hazard_code_1", "hazard_code_2", "hazard_code_3", "hazard_code_4", "hazard_code_5",
      "program_code", "ncci_risk_id", "wc_class_code", "policy_number",
      "prior_policy_number_1", "prior_wc_policy_1",
    ]);
    const filteredUnfilled = (unfilled as string[]).filter(k => !CODE_FIELDS.has(k));

    const systemPrompt = `You are an expert insurance data mapper. You map extracted business data to ACORD insurance form fields.

CRITICAL ANTI-HALLUCINATION RULES:
- NEVER fabricate, guess, or invent data that is not present in the extracted data.
- If the extracted data has no value for a field, do NOT create one.
- Do NOT fill in sample/placeholder values like "123 Main St", "Acme Corp", default SIC codes, or typical limits.
- Only map a value if it directly comes from the extracted data provided.
- NEVER infer or look up any CODES (SIC, NAICS, NAIC, GL, class codes, hazard codes, policy numbers, program codes). These are excluded from the target fields list.

Given extracted business data and a list of unfilled ACORD form fields, do TWO things:
1. Map extracted values to form fields where a direct match exists in the data.
2. Mark fields as NOT APPLICABLE based on the business type and coverage context.

Rules for mapping values:
- Only map values that exist in the extracted data. Do not guess or fabricate.
- A single extracted value can map to multiple form fields (e.g. an address maps to mailing, premises, building addresses).
- Use your insurance domain knowledge for format conversions only (e.g. if you see "LLC" in the business name, business_type should be "LLC").
- For Yes/No fields, only infer from explicit context (e.g. if there's a safety program description, safety_program = "Yes").
- For checkbox fields, return true/false.
- For date fields, return YYYY-MM-DD format.
- For currency fields, return numeric strings without $ or commas.

Rules for marking fields N/A:
- Only mark a field N/A if you have enough business context to determine the coverage line doesn't apply.
- If there's insufficient data to determine business type, do NOT mark anything N/A.
- Be conservative: when in doubt, leave the field unmapped rather than guessing.

- Return ONLY a JSON object mapping field_key -> value. No explanations.`;

    const userPrompt = `Form: ${form_name || "ACORD Form"}

Extracted Business Data:
${extractedSummary}

Unfilled ACORD form fields that need values:
${filteredUnfilled.join(", ")}

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
