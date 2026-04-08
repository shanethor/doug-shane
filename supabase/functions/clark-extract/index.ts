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

/**
 * Call Claude with retry + back-off for 529 (overloaded) and 429 (rate-limit).
 */
async function callClaude(
  apiKey: string,
  messages: any[],
  system: string,
  retries = 3,
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system,
        messages,
      }),
    });

    if (resp.ok) return resp.json();

    // Retry on overloaded / rate-limit
    if ((resp.status === 529 || resp.status === 429) && attempt < retries) {
      const wait = Math.min(2000 * Math.pow(2, attempt), 16000);
      console.log(`Claude ${resp.status}, retrying in ${wait}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const errText = await resp.text();
    console.error("Claude API error:", resp.status, errText);
    throw new Error(`Claude API error ${resp.status}: ${errText.slice(0, 200)}`);
  }
  throw new Error("Claude API: max retries exceeded");
}

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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const systemPrompt = `You are Clark, an expert insurance data extraction AI. Your job is to look at uploaded insurance documents (dec pages, ACORD applications, loss runs, certificates of insurance) and extract ALL available data into a single flat JSON object.

Rules:
- Return ONLY valid JSON — no markdown fences, no explanation, no preamble
- Use snake_case keys matching ACORD field conventions
- For fields you cannot find, omit them entirely — never guess or hallucinate
- Extract everything: applicant info, business details, coverage details, limits, deductibles, prior insurance, loss history, property details, vehicle schedules, employee counts, classification codes
- If multiple documents are provided, merge intelligently — latest/most-specific values win
- Dates should be MM/DD/YYYY format
- Currency values as plain numbers (no $ signs)
- Be thorough — insurance underwriters depend on this data being complete and accurate`;

    // Build Claude-compatible content blocks with vision
    const contentParts: any[] = [];

    // Process files in staggered batches to avoid token limits
    // Claude supports multiple images per message, but we chunk large batches
    const BATCH_SIZE = 3;
    const batches: any[][] = [];
    for (let i = 0; i < pdf_files.length; i += BATCH_SIZE) {
      batches.push(pdf_files.slice(i, i + BATCH_SIZE));
    }

    let mergedExtraction: Record<string, any> = {};

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchContent: any[] = [];

      // Add each file as a Claude vision block
      for (const file of batch) {
        const mediaType = file.mimeType === "application/pdf"
          ? "application/pdf"
          : file.mimeType || "image/jpeg";

        batchContent.push({
          type: mediaType === "application/pdf" ? "document" : "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: file.base64,
          },
          ...(mediaType === "application/pdf" ? { title: file.name } : {}),
        });
      }

      // Add the extraction prompt
      const isMultiBatch = batches.length > 1;
      let promptText = "";
      if (isMultiBatch && batchIdx > 0) {
        promptText = `Here are more documents (batch ${batchIdx + 1} of ${batches.length}). Extract all data and merge with what you've already found. Previously extracted: ${JSON.stringify(mergedExtraction)}\n\nReturn the COMPLETE merged JSON with all fields from all documents.`;
      } else {
        promptText = `Extract all insurance data from these document(s) into a single flat JSON object.${user_prompt ? `\n\nAdditional context: ${user_prompt}` : ""}`;
      }

      batchContent.push({ type: "text", text: promptText });

      // Call Claude with stagger delay between batches
      if (batchIdx > 0) {
        await new Promise((r) => setTimeout(r, 1500)); // 1.5s stagger
      }

      const result = await callClaude(
        ANTHROPIC_API_KEY,
        [{ role: "user", content: batchContent }],
        systemPrompt,
      );

      const rawContent = result.content?.[0]?.text || "{}";

      // Parse JSON from response
      let batchExtracted: Record<string, any> = {};
      try {
        const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        batchExtracted = JSON.parse(jsonStr);
      } catch {
        console.error("Failed to parse Claude output:", rawContent.slice(0, 500));
        // Try to find JSON in the output
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            batchExtracted = JSON.parse(jsonMatch[0]);
          } catch {
            throw new Error("Claude returned invalid JSON");
          }
        } else {
          throw new Error("Claude returned invalid JSON");
        }
      }

      // Merge batch results (later batches override earlier for conflicts)
      mergedExtraction = { ...mergedExtraction, ...batchExtracted };
    }

    const extracted = mergedExtraction;

    // Identify missing required fields
    const missingFields = REQUIRED_FIELDS.filter(f => !extracted[f] || extracted[f] === "");

    // Generate questionnaire token
    const qToken = crypto.randomUUID();

    // Determine which ACORD forms are needed based on extracted data
    const acordForms: string[] = ["125"]; // Always need 125
    const coverageStr = (extracted.coverage_requested || "").toLowerCase();
    if (coverageStr.includes("general liability") || extracted.gl_each_occurrence) {
      acordForms.push("126");
    }
    if (coverageStr.includes("auto") || extracted.vehicle_count) {
      acordForms.push("127");
    }
    if (coverageStr.includes("workers") || extracted.workers_comp_requested) {
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
