import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_FIELDS = [
  "applicant_name", "dba", "mailing_address", "city", "state", "zip",
  "business_phone", "fein", "sic_code", "naics_code", "business_type",
  "entity_type", "years_in_business", "annual_revenue", "num_employees",
  "effective_date", "expiration_date", "coverage_requested",
  "prior_carrier", "prior_policy_number", "prior_premium",
];

/**
 * Call Claude with retry + exponential back-off for 529/429.
 */
async function callClaude(
  apiKey: string,
  messages: any[],
  system: string,
  maxTokens = 8192,
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
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    if (resp.ok) return resp.json();

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

/** Parse JSON from Claude response, handling markdown fences and partial matches */
function parseClaudeJson(raw: string): Record<string, any> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    console.error("Failed to parse Claude JSON:", cleaned.slice(0, 500));
    throw new Error("Claude returned invalid JSON");
  }
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

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Exhaustive Dec Page Extraction
    // "Chronological wall" — this MUST complete before Step 2
    // ═══════════════════════════════════════════════════════════════
    console.log("STEP 1: Exhaustive document extraction...");

    const step1System = `You are Clark, an expert insurance data extraction AI specializing in Declaration pages, ACORD applications, loss runs, and certificates of insurance.

Your task is STEP 1 of a strict workflow: EXHAUSTIVE EXTRACTION.

Rules:
- Conduct a FULL, EXHAUSTIVE extraction of ALL pertinent insurance data from the provided documents
- Capture EVERY detail related to: coverages, limits, deductibles, sub-limits, property schedules, named insureds, additional insureds, specific endorsements, classification codes, experience mods, payroll data, vehicle schedules, driver lists, loss history, prior carriers, policy numbers, premium breakdowns
- This applies to BOTH personal and commercial lines
- FILTER OUT: standard legal boilerplate, privacy notices, signature blocks, general terms & conditions — these waste context and add no underwriting value
- Return ONLY valid JSON — no markdown fences, no explanation, no preamble
- Use snake_case keys matching ACORD field conventions
- NEVER guess or hallucinate — if a field is not present, omit it entirely
- Dates in MM/DD/YYYY format
- Currency as plain numbers (no $ signs)
- If multiple documents provided, merge intelligently — most specific/recent values win
- Be extraordinarily thorough — insurance underwriters depend on this data`;

    // Build vision content blocks for all files
    const docBlocks: any[] = [];
    for (const file of pdf_files) {
      const mediaType = file.mimeType === "application/pdf"
        ? "application/pdf"
        : file.mimeType || "image/jpeg";

      docBlocks.push({
        type: mediaType === "application/pdf" ? "document" : "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: file.base64,
        },
        ...(mediaType === "application/pdf" ? { title: file.name } : {}),
      });
    }

    // If many files, batch them. Otherwise send all at once.
    let step1Data: Record<string, any> = {};
    const BATCH_SIZE = 3;

    if (pdf_files.length <= BATCH_SIZE) {
      // Single call for small batches
      const result = await callClaude(
        ANTHROPIC_API_KEY,
        [{
          role: "user",
          content: [
            ...docBlocks,
            {
              type: "text",
              text: `Perform a full, exhaustive extraction of all pertinent insurance data from these documents. Capture every coverage, limit, deductible, schedule, insured, endorsement, and classification. Filter out legal boilerplate and privacy notices. Return a single flat JSON object.${user_prompt ? `\n\nAdditional context from the agent: ${user_prompt}` : ""}`,
            },
          ],
        }],
        step1System,
      );
      step1Data = parseClaudeJson(result.content?.[0]?.text || "{}");
    } else {
      // Staggered batches for large uploads
      for (let i = 0; i < pdf_files.length; i += BATCH_SIZE) {
        const batchBlocks = docBlocks.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(pdf_files.length / BATCH_SIZE);

        if (i > 0) await new Promise((r) => setTimeout(r, 2000)); // stagger

        const promptText = i === 0
          ? `Perform a full, exhaustive extraction of all pertinent insurance data from these documents (batch ${batchNum}/${totalBatches}). Filter out legal boilerplate. Return a single flat JSON object.${user_prompt ? `\n\nAdditional context: ${user_prompt}` : ""}`
          : `Here are more documents (batch ${batchNum}/${totalBatches}). Extract all data and MERGE with previous extraction:\n${JSON.stringify(step1Data)}\n\nReturn the COMPLETE merged JSON.`;

        const result = await callClaude(
          ANTHROPIC_API_KEY,
          [{ role: "user", content: [...batchBlocks, { type: "text", text: promptText }] }],
          step1System,
        );
        const batchData = parseClaudeJson(result.content?.[0]?.text || "{}");
        step1Data = { ...step1Data, ...batchData };
      }
    }

    console.log(`STEP 1 complete: ${Object.keys(step1Data).length} fields extracted`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Web Cross-Reference & Enrichment
    // Using extracted business names + addresses to verify/enrich
    // ═══════════════════════════════════════════════════════════════
    console.log("STEP 2: Web enrichment...");
    await new Promise((r) => setTimeout(r, 1500)); // stagger between steps

    const businessName = step1Data.applicant_name || step1Data.insured_name || step1Data.dba || "";
    const address = [step1Data.mailing_address, step1Data.city, step1Data.state, step1Data.zip].filter(Boolean).join(", ");

    let step2Data: Record<string, any> = {};

    if (businessName) {
      const step2System = `You are a business intelligence researcher. Given a business name and address extracted from insurance documents, search your knowledge to cross-reference and verify their current details.

Return ONLY valid JSON with these fields (omit any you cannot determine with confidence):
- naics_code: the 6-digit NAICS code
- sic_code: the 4-digit SIC code  
- business_type: brief description of operations
- entity_type: LLC, Corp, Sole Prop, Partnership, etc.
- year_established: year the business was founded
- num_employees_estimate: estimated employee count
- annual_revenue_estimate: estimated annual revenue
- construction_type: building construction type if physical location
- square_footage: building square footage if available
- website: company website URL if known

Do NOT override data that was already extracted from the documents — only SUPPLEMENT missing fields.`;

      try {
        const result = await callClaude(
          ANTHROPIC_API_KEY,
          [{
            role: "user",
            content: `Business: ${businessName}\nAddress: ${address}\n\nCross-reference this business and return supplementary data as JSON. Only provide fields you are confident about.`,
          }],
          step2System,
          4096,
        );
        step2Data = parseClaudeJson(result.content?.[0]?.text || "{}");
        console.log(`STEP 2 complete: ${Object.keys(step2Data).length} enrichment fields`);
      } catch (e) {
        console.warn("Step 2 enrichment failed (non-fatal):", e);
        // Non-fatal — we continue with Step 1 data only
      }
    } else {
      console.log("STEP 2 skipped: no business name to research");
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Merge & Map to ACORD Field Names
    // Step 1 data takes priority; Step 2 only fills gaps
    // ═══════════════════════════════════════════════════════════════
    console.log("STEP 3: Merging & mapping...");

    // Step 2 fills gaps only — Step 1 (document data) always wins
    const merged: Record<string, any> = { ...step2Data, ...step1Data };

    // Normalize common aliases
    const ALIASES: Record<string, string> = {
      insured_name: "applicant_name",
      named_insured: "applicant_name",
      business_name: "dba",
      doing_business_as: "dba",
      federal_ein: "fein",
      employer_id: "fein",
      phone: "business_phone",
      telephone: "business_phone",
      policy_effective_date: "effective_date",
      policy_expiration_date: "expiration_date",
      naic_code: "naics_code",
      naic_number: "naics_code",
      number_of_employees: "num_employees",
      employee_count: "num_employees",
      revenue: "annual_revenue",
      gross_revenue: "annual_revenue",
    };

    for (const [alias, canonical] of Object.entries(ALIASES)) {
      if (merged[alias] && !merged[canonical]) {
        merged[canonical] = merged[alias];
      }
    }

    // Use enrichment estimates if doc didn't have exact values
    if (!merged.naics_code && step2Data.naics_code) merged.naics_code = step2Data.naics_code;
    if (!merged.sic_code && step2Data.sic_code) merged.sic_code = step2Data.sic_code;
    if (!merged.num_employees && step2Data.num_employees_estimate) merged.num_employees = step2Data.num_employees_estimate;
    if (!merged.annual_revenue && step2Data.annual_revenue_estimate) merged.annual_revenue = step2Data.annual_revenue_estimate;
    if (!merged.entity_type && step2Data.entity_type) merged.entity_type = step2Data.entity_type;
    if (!merged.years_in_business && step2Data.year_established) {
      merged.years_in_business = new Date().getFullYear() - parseInt(step2Data.year_established);
    }

    const extracted = merged;

    // Identify missing required fields
    const missingFields = REQUIRED_FIELDS.filter(f => !extracted[f] || extracted[f] === "");

    // Generate questionnaire token
    const qToken = crypto.randomUUID();

    // Determine which ACORD forms are needed
    const acordForms: string[] = ["125"];
    const coverageStr = String(extracted.coverage_requested || "").toLowerCase();
    const allValues = JSON.stringify(extracted).toLowerCase();

    if (coverageStr.includes("general liability") || coverageStr.includes("gl") ||
        extracted.gl_each_occurrence || allValues.includes("general liability")) {
      acordForms.push("126");
    }
    if (coverageStr.includes("auto") || extracted.vehicle_count ||
        allValues.includes("auto liability") || allValues.includes("commercial auto")) {
      acordForms.push("127");
    }
    if (coverageStr.includes("workers") || coverageStr.includes("wc") ||
        extracted.workers_comp_requested || allValues.includes("workers comp") ||
        allValues.includes("workers' comp")) {
      acordForms.push("130");
    }

    // Create or update submission
    const subData = {
      user_id: user.id,
      status: missingFields.length > 0 ? "needs_info" : "extracted",
      client_name: extracted.applicant_name || null,
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

    console.log(`Clark extract complete: ${Object.keys(extracted).length} total fields, ${missingFields.length} missing, forms: ${acordForms.join(",")}`);

    return new Response(JSON.stringify({
      submission_id: finalSubmissionId,
      extracted_data: extracted,
      missing_fields: missingFields,
      acord_forms: acordForms,
      questionnaire_token: missingFields.length > 0 ? qToken : null,
      steps_completed: {
        step1_fields: Object.keys(step1Data).length,
        step2_enrichment: Object.keys(step2Data).length,
        step3_final: Object.keys(extracted).length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("clark-extract error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
