import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  buildDocumentBlocks,
  callClaude,
  mergeExtractionData,
  parseClaudeJson,
} from "../_shared/clark-extract-utils.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let activeSubmissionId: string | null = null;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Authentication failed");

    const { pdf_files, user_prompt, submission_id } = await req.json();
    if (!Array.isArray(pdf_files) || pdf_files.length === 0) throw new Error("No files provided");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    let questionnaireToken: string | null = null;

    if (submission_id) {
      const { data: existingSubmission, error: existingErr } = await supabase
        .from("clark_submissions")
        .select("id, questionnaire_token")
        .eq("id", submission_id)
        .eq("user_id", user.id)
        .single();

      if (existingErr || !existingSubmission) throw new Error("Submission not found");

      activeSubmissionId = existingSubmission.id;
      questionnaireToken = existingSubmission.questionnaire_token || crypto.randomUUID();

      const { error: processingErr } = await supabase
        .from("clark_submissions")
        .update({ status: "processing" })
        .eq("id", activeSubmissionId)
        .eq("user_id", user.id);

      if (processingErr) throw processingErr;
    } else {
      questionnaireToken = crypto.randomUUID();

      const { data: draftSubmission, error: draftErr } = await supabase
        .from("clark_submissions")
        .insert({
          user_id: user.id,
          status: "processing",
          questionnaire_token: questionnaireToken,
          extracted_data: {},
          missing_fields: REQUIRED_FIELDS,
        })
        .select("id")
        .single();

      if (draftErr || !draftSubmission) throw draftErr || new Error("Failed to create submission");
      activeSubmissionId = draftSubmission.id;
    }

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

    const docBlocks = await buildDocumentBlocks(pdf_files, {
      maxTotalPdfPages: 100,
      maxPdfChunkPages: 10,
    });
    if (docBlocks.length === 0) throw new Error("No supported files provided");

    console.log(`Prepared ${docBlocks.length} chunk(s) for extraction`);

    let step1Data: Record<string, any> = {};
    const totalBatches = docBlocks.length;

    for (let i = 0; i < docBlocks.length; i++) {
      const batchNum = i + 1;
      if (i > 0) await new Promise((r) => setTimeout(r, 1200));

      const promptText = `Perform a full, exhaustive extraction of all pertinent insurance data from these documents (batch ${batchNum}/${totalBatches}). Capture every coverage, limit, deductible, schedule, insured, endorsement, and classification. Filter out legal boilerplate and privacy notices. Return a single flat JSON object.${batchNum === 1 && user_prompt ? `

Additional context from the agent: ${user_prompt}` : ""}`;

      const result = await callClaude(
        ANTHROPIC_API_KEY,
        [{ role: "user", content: [docBlocks[i], { type: "text", text: promptText }] }],
        step1System,
      );
      const batchData = parseClaudeJson(result.content?.[0]?.text || "{}");
      step1Data = mergeExtractionData(step1Data, batchData);
    }

    console.log(`STEP 1 complete: ${Object.keys(step1Data).length} fields extracted`);

    console.log("STEP 2: Web enrichment...");
    await new Promise((r) => setTimeout(r, 1000));

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
            content: `Business: ${businessName}
Address: ${address}

Cross-reference this business and return supplementary data as JSON. Only provide fields you are confident about.`,
          }],
          step2System,
          4096,
        );
        step2Data = parseClaudeJson(result.content?.[0]?.text || "{}");
        console.log(`STEP 2 complete: ${Object.keys(step2Data).length} enrichment fields`);
      } catch (e) {
        console.warn("Step 2 enrichment failed (non-fatal):", e);
      }
    } else {
      console.log("STEP 2 skipped: no business name to research");
    }

    console.log("STEP 3: Merging & mapping...");

    const merged: Record<string, any> = { ...step2Data, ...step1Data };

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

    if (!merged.naics_code && step2Data.naics_code) merged.naics_code = step2Data.naics_code;
    if (!merged.sic_code && step2Data.sic_code) merged.sic_code = step2Data.sic_code;
    if (!merged.num_employees && step2Data.num_employees_estimate) merged.num_employees = step2Data.num_employees_estimate;
    if (!merged.annual_revenue && step2Data.annual_revenue_estimate) merged.annual_revenue = step2Data.annual_revenue_estimate;
    if (!merged.entity_type && step2Data.entity_type) merged.entity_type = step2Data.entity_type;
    if (!merged.years_in_business && step2Data.year_established) {
      merged.years_in_business = new Date().getFullYear() - parseInt(step2Data.year_established);
    }

    const extracted = merged;
    const missingFields = REQUIRED_FIELDS.filter((field) => !extracted[field] || extracted[field] === "");
    const qToken = questionnaireToken || crypto.randomUUID();

    const acordForms: string[] = ["125"];
    const coverageStr = String(extracted.coverage_requested || "").toLowerCase();
    const allValues = JSON.stringify(extracted).toLowerCase();

    if (coverageStr.includes("general liability") || coverageStr.includes("gl") || extracted.gl_each_occurrence || allValues.includes("general liability")) {
      acordForms.push("126");
    }
    if (coverageStr.includes("auto") || extracted.vehicle_count || allValues.includes("auto liability") || allValues.includes("commercial auto")) {
      acordForms.push("127");
    }
    if (coverageStr.includes("workers") || coverageStr.includes("wc") || extracted.workers_comp_requested || allValues.includes("workers comp") || allValues.includes("workers' comp")) {
      acordForms.push("130");
    }

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

    if (!activeSubmissionId) throw new Error("Submission could not be created");

    const { error: saveErr } = await supabase
      .from("clark_submissions")
      .update(subData)
      .eq("id", activeSubmissionId)
      .eq("user_id", user.id);

    if (saveErr) throw saveErr;

    console.log(`Clark extract complete: ${Object.keys(extracted).length} total fields, ${missingFields.length} missing, forms: ${acordForms.join(",")}`);

    return new Response(JSON.stringify({
      submission_id: activeSubmissionId,
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
    if (activeSubmissionId) {
      await supabase
        .from("clark_submissions")
        .update({ status: "failed" })
        .eq("id", activeSubmissionId);
    }

    console.error("clark-extract error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
