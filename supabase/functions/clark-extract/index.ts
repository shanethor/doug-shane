import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Fields we expect for a typical commercial submission */
const REQUIRED_FIELDS = [
  "applicant_name", "dba", "mailing_address", "city", "state", "zip",
  "business_phone", "fein", "sic_code", "naics_code", "business_type",
  "entity_type", "years_in_business", "annual_revenue", "num_employees",
  "effective_date", "expiration_date", "coverage_requested",
  "prior_carrier", "prior_policy_number", "prior_premium",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Authentication failed");

    const { pdf_files, user_prompt, submission_id } = await req.json();
    if (!pdf_files || pdf_files.length === 0) throw new Error("No files provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build multimodal content for LLM vision
    const contentParts: any[] = [
      {
        type: "text",
        text: `You are Clark, an expert insurance data extraction AI. Extract ALL available data from the uploaded insurance documents into a flat JSON object with standardized field names.

Rules:
- Return ONLY valid JSON — no markdown, no explanation
- Use snake_case keys matching ACORD field conventions
- For fields you cannot find in the documents, do NOT guess or hallucinate — omit them
- Extract: applicant info, business details, coverage details, prior insurance, loss history, property details, vehicle schedules, employee counts
- If multiple documents are provided, merge data intelligently (latest values win)
${user_prompt ? `\nAdditional context from the user: ${user_prompt}` : ""}`,
      },
    ];

    // Add each file as a vision block
    for (const file of pdf_files) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${file.mimeType || "application/pdf"};base64,${file.base64}`,
        },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: contentParts },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI extraction failed");
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response (strip markdown fences if present)
    let extracted: Record<string, any> = {};
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI output:", rawContent);
      throw new Error("AI returned invalid JSON");
    }

    // Identify missing required fields
    const missingFields = REQUIRED_FIELDS.filter(f => !extracted[f] || extracted[f] === "");

    // Generate questionnaire token
    const qToken = crypto.randomUUID();

    // Determine which ACORD forms are needed based on extracted data
    const acordForms: string[] = ["125"]; // Always need 125
    if (extracted.coverage_requested?.toLowerCase()?.includes("general liability") || extracted.gl_each_occurrence) {
      acordForms.push("126");
    }
    if (extracted.coverage_requested?.toLowerCase()?.includes("auto") || extracted.vehicle_count) {
      acordForms.push("127");
    }
    if (extracted.coverage_requested?.toLowerCase()?.includes("workers") || extracted.workers_comp_requested) {
      acordForms.push("130");
    }

    // Create or update submission
    const subData = {
      user_id: user.id,
      status: missingFields.length > 0 ? "needs_info" : "extracted",
      client_name: extracted.applicant_name || extracted.insured_name || null,
      business_name: extracted.dba || extracted.applicant_name || null,
      extracted_data: extracted,
      missing_fields: missingFields,
      questionnaire_token: qToken,
      acord_forms: acordForms,
    };

    let finalSubmissionId = submission_id;
    if (submission_id) {
      await supabase.from("clark_submissions").update(subData).eq("id", submission_id);
    } else {
      const { data: newSub, error: insertErr } = await supabase
        .from("clark_submissions")
        .insert(subData)
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      finalSubmissionId = newSub.id;
    }

    return new Response(JSON.stringify({
      submission_id: finalSubmissionId,
      extracted_data: extracted,
      missing_fields: missingFields,
      acord_forms: acordForms,
      questionnaire_token: missingFields.length > 0 ? qToken : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("clark-extract error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
