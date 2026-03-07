import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ACORD 125-style commercial insurance application fields
const ACORD_FIELDS = {
  // Applicant Information
  applicant_name: "",
  dba_name: "",
  mailing_address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  website: "",
  fein: "",
  sic_code: "",
  naics_code: "",
  
  // Business Information
  business_type: "", // corporation, llc, partnership, sole proprietor, etc.
  year_established: "",
  annual_revenue: "",
  number_of_employees: "",
  nature_of_business: "",
  description_of_operations: "",
  
  // Coverage Information
  coverage_types_needed: [], // GL, property, auto, workers comp, umbrella, cyber, etc.
  effective_date: "",
  expiration_date: "",
  current_carrier: "",
  current_premium: "",
  
  // Location Information
  premises_address: "",
  premises_owned_or_leased: "",
  square_footage: "",
  building_construction: "",
  year_built: "",
  
  // Loss History
  prior_losses_last_5_years: "",
  claims_description: "",
  
  // Additional
  additional_insureds: "",
  special_conditions: "",
};

const MAX_PDF_PAGES = 15;

/** Truncate a PDF to the first N pages to reduce payload size and speed up extraction */
async function truncatePdf(base64Data: string, maxPages: number): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();
    
    if (pageCount <= maxPages) {
      console.log(`[extract] PDF has ${pageCount} pages — no truncation needed`);
      return base64Data;
    }
    
    console.log(`[extract] Truncating PDF from ${pageCount} to ${maxPages} pages`);
    const newDoc = await PDFDocument.create();
    const indices = Array.from({ length: maxPages }, (_, i) => i);
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));
    
    const newBytes = await newDoc.save();
    // Convert back to base64
    let binary = '';
    const bytes = new Uint8Array(newBytes);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn("[extract] PDF truncation failed, using original:", err);
    return base64Data;
  }
}

/** Helper: call Lovable AI Gateway (Gemini) for extraction */
async function callLovableGateway(
  apiKey: string,
  systemPrompt: string,
  userPromptText: string,
  pdf_files: any[],
  hasPdfs: boolean,
  corsHeaders: Record<string, string>,
): Promise<string> {
  type ContentPart = { type: string; text?: string; image_url?: { url: string } };
  const userContent: ContentPart[] = [{ type: "text", text: userPromptText }];

  if (hasPdfs) {
    for (const pf of pdf_files) {
      if (pf.base64) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${pf.mimeType || "application/pdf"};base64,${pf.base64}` },
        });
      }
    }
  }

  // Use Flash for speed — Pro is too slow for extraction
  const model = "google/gemini-2.5-flash";
  const t0 = Date.now();
  console.log(`[extract] Calling Gemini ${model}...`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: hasPdfs ? userContent : userPromptText },
      ],
    }),
  });

  console.log(`[extract] Gemini responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limited, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error("AI extraction failed");
  }

  const aiResult = await response.json();
  return aiResult.choices?.[0]?.message?.content || "{}";
}

/**
 * Claude can return multiple content blocks; concatenate all text blocks.
 * This avoids false empty-results when the first block is not usable text.
 */
function extractClaudeText(result: any): string {
  const blocks = Array.isArray(result?.content) ? result.content : [];
  const text = blocks
    .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();

  return text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { description, file_contents, pdf_files, submission_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Service temporarily unavailable");

    const systemPrompt = `You are an expert insurance underwriter assistant. Extract data from the provided business or policy information and return ONLY valid JSON with no markdown fences, no explanation — just raw JSON.

CRITICAL ANTI-HALLUCINATION RULES:
- NEVER fabricate, guess, or invent data. If information is not explicitly present in the provided text or documents, leave the field as an empty string "".
- Do NOT fill in sample/placeholder data like "123 Main St", "Acme Corp", "John Smith", or generic SIC/NAICS codes.
- Do NOT infer employee counts, revenue, addresses, phone numbers, or any other factual data that is not stated.
- If the user provided no business information (empty description, no documents), return ALL fields as empty strings.
- Only populate a field if you can point to the specific text in the input that contains that value.

CODES — EXTRACT VERBATIM ONLY, NEVER INFER:
- sic_code, naics_code, naic_code, gl_code, class_code_1, class_code_2, hazard_code_1, hazard_code_2, program_code, ncci_risk_id, wc_class_code, policy_number, prior_policy_number_1, prior_wc_policy_1: these fields must ONLY be populated if the EXACT code/number appears verbatim in the source document. NEVER look up, guess, or infer a code based on business type, industry, or description. If the document explicitly lists a class code, you MUST extract it.

Return this exact structure:
{
  "form_data": {
    "applicant_name": "", "dba_name": "", "mailing_address": "", "city": "", "state": "", "zip": "",
    "phone": "", "email": "", "website": "", "fein": "", "sic_code": "", "naics_code": "",
    "business_type": "", "year_established": "", "annual_revenue": "", "number_of_employees": "",
    "full_time_employees": "", "part_time_employees": "", "nature_of_business": "",
    "description_of_operations": "", "effective_date": "", "expiration_date": "",
    "current_carrier": "", "current_premium": "", "policy_number": "", "naic_code": "",
    "premises_address": "", "premises_city": "", "premises_state": "", "premises_zip": "",
    "square_footage": "", "building_construction": "", "year_built": "",
    "prior_losses_last_5_years": "", "additional_insureds": "",
    "general_aggregate": "", "products_aggregate": "", "each_occurrence": "",
    "personal_adv_injury": "", "fire_damage": "", "medical_payments": "",
    "coverage_type": "", "hazard_code_1": "", "hazard_classification_1": "",
    "wc_class_code": "", "wc_class_description": "", "annual_remuneration": "",
    "class_code_1": "", "class_description_1": "", "annual_remuneration_1": "",
    "officer_1_name": "", "officer_1_title": "", "officer_1_ownership": "", "officer_1_included": "",
    "subcontractors_used": "", "prior_wc_carrier": "", "experience_mod_rate": "",
    "construction_type": "", "building_amount": "", "bpp_amount": "", "business_income_amount": "",
    "sprinkler_system": "", "fire_alarm": "", "burglar_alarm": "", "roof_type": "",
    "each_occurrence_limit": "", "aggregate_limit": "", "self_insured_retention": "",
    "number_of_vehicles": "", "number_of_drivers": "", "radius_of_operations": "",
    "auto_liability_limit": "", "auto_liability_premium": "", "um_uim_limit": "",
    "building_limit": "", "bpp_limit": "", "business_income_limit": "", "total_insured_value": "",
    "property_premium": "", "property_deductible": "",
    "lob_auto": "false", "lob_gl": "false", "lob_property": "false", "lob_umbrella": "false", "lob_wc": "false",
    "lob_commercial_general_liability": "false",
    "cgl_premium": "",

    "chk_commercial_general_liability": "false",
    "chk_claims_made": "false",
    "chk_occurrence": "false",
    "chk_owners_contractors": "false",
    "chk_limit_policy": "false",
    "chk_limit_location": "false",
    "chk_limit_project": "false",
    "chk_limit_other": "false",
    "chk_deductible_pd": "false",
    "chk_deductible_bi": "false",
    "chk_per_claim": "false",
    "chk_per_occurrence": "false",

    "hazard_loc_1": "", "hazard_bldg_1": "", "hazard_code_1": "", "hazard_classification_1": "",
    "hazard_premium_basis_1": "", "hazard_exposure_1": "", "hazard_terr_1": "",
    "hazard_rate_premops_1": "", "hazard_rate_products_1": "",
    "hazard_premium_premops_1": "", "hazard_premium_products_1": "",
    "hazard_loc_2": "", "hazard_bldg_2": "", "hazard_code_2": "", "hazard_classification_2": "",
    "hazard_premium_basis_2": "", "hazard_exposure_2": "", "hazard_terr_2": "",
    "hazard_rate_premops_2": "", "hazard_rate_products_2": "",
    "hazard_premium_premops_2": "", "hazard_premium_products_2": "",
    "hazard_loc_3": "", "hazard_bldg_3": "", "hazard_code_3": "", "hazard_classification_3": "",
    "hazard_premium_basis_3": "", "hazard_exposure_3": "", "hazard_terr_3": "",
    "hazard_rate_premops_3": "", "hazard_rate_products_3": "",
    "hazard_premium_premops_3": "", "hazard_premium_products_3": "",
    "total_premium_premops": "", "total_premium_products": "", "premium_subtotal": "",
    "premium_tax": "", "total_premium": "",

    "retroactive_date": "", "entry_date_claims_made": "",
    "deductible_amount": "", "retention_amount": "", "aggregate_applies_per": "",
    "ebl_limit": "", "ebl_deductible_per_claim": "", "ebl_aggregate": "", "ebl_num_employees": "",

    "audit_period": "",
    "tria_premium": "",
    "policy_fee": "",

    "vehicles": [],
    "drivers": []
  },
  "gaps": []
}

EXTRACTION RULES:
- Return ALL fields even if empty string — but ONLY populate with data actually found in input
- All scalar values must be strings — booleans as "true"/"false"
- Dates → MM/DD/YYYY format, currencies → plain number without $ or commas
- lob_* flags: set "true" ONLY if that coverage type is explicitly mentioned in the document. lob_gl and lob_commercial_general_liability should both be "true" if CGL coverage is present.
- cgl_premium: extract the CGL/GL total premium amount if listed (e.g. from "Lines of Business" or dec page premium schedule)
- CHECKBOX FIELDS (chk_*): set "true" if the document indicates that option applies:
  - chk_commercial_general_liability: "true" if it is a CGL policy (same as lob_gl)
  - chk_occurrence: "true" if the policy is occurrence-based (look for "CG 00 01" or "occurrence" language)
  - chk_claims_made: "true" if claims-made policy
  - chk_owners_contractors: "true" if Owner's & Contractor's Protective coverage
  - chk_limit_policy: "true" if aggregate limit applies per policy
  - chk_limit_project: "true" if aggregate limit applies per project (look for "Per Project" endorsement)
  - chk_limit_location: "true" if aggregate limit applies per location
  - chk_deductible_pd: "true" if property damage deductible applies
  - chk_deductible_bi: "true" if bodily injury deductible applies
  - chk_per_claim: "true" if deductible applies per claim
  - chk_per_occurrence: "true" if deductible applies per occurrence
- SCHEDULE OF HAZARDS: Extract ALL class code rows from the document. Use hazard_loc_1/hazard_code_1/hazard_classification_1/hazard_premium_basis_1/hazard_exposure_1/hazard_terr_1/hazard_rate_premops_1/hazard_premium_premops_1 for the first row, then hazard_*_2 for the second row, hazard_*_3 for the third row. Many policies have 2-3 class codes — extract ALL of them.
- PREMIUM TOTALS: Extract total_premium, total_premium_premops, total_premium_products if listed
- ENDORSEMENTS: Look for "Per Project" aggregate endorsement (sets chk_limit_project) and deductible endorsements
- vehicles[]: include ALL vehicles found — each: { year, make, model, vin, body_type, stated_amount, garaging_zip }
- drivers[]: include ALL drivers found — each: { name, dob, license, license_state }
- gaps[]: list fields that are missing and important — { field, question, priority: required|recommended|optional }
- If document is an insurance policy/dec page, extract carrier, NAIC code, policy number, limits, premiums, class codes, and all schedules
- If no meaningful business data is provided, return all fields as empty strings and list all critical fields as gaps`;

    const userPromptText = `Extract all insurance data from the following document(s).

${description || ""}
${file_contents ? `\nAdditional text content:\n${file_contents}` : ""}`;

    const hasPdfs = Array.isArray(pdf_files) && pdf_files.length > 0;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    let rawContent: string;
    const t0 = Date.now();

    let aiPdfFiles = pdf_files;

    if (ANTHROPIC_API_KEY && hasPdfs) {
      // Truncate PDFs to first N pages to reduce payload and speed up extraction
      const truncatedPdfFiles = [];
      for (let fi = 0; fi < pdf_files.length; fi++) {
        const pf = pdf_files[fi];
        if (pf.base64 && (pf.mimeType === "application/pdf" || !pf.mimeType?.startsWith("image/"))) {
          // Get page count before truncation
          let origPages = "?";
          try {
            const tmpBytes = Uint8Array.from(atob(pf.base64), c => c.charCodeAt(0));
            const tmpDoc = await PDFDocument.load(tmpBytes, { ignoreEncryption: true });
            origPages = String(tmpDoc.getPageCount());
          } catch (_) {}
          const truncated = await truncatePdf(pf.base64, MAX_PDF_PAGES);
          const b64SizeKB = Math.round(truncated.length / 1024);
          console.log(`[extract] File ${fi + 1}: mime=${pf.mimeType || "pdf"}, pages=${origPages}→${Math.min(Number(origPages) || MAX_PDF_PAGES, MAX_PDF_PAGES)}, base64=${b64SizeKB}KB`);
          truncatedPdfFiles.push({ ...pf, base64: truncated });
        } else {
          const b64SizeKB = pf.base64 ? Math.round(pf.base64.length / 1024) : 0;
          console.log(`[extract] File ${fi + 1}: mime=${pf.mimeType || "unknown"}, type=image, base64=${b64SizeKB}KB`);
          truncatedPdfFiles.push(pf);
        }
      }

      aiPdfFiles = truncatedPdfFiles;
      const totalB64KB = Math.round(aiPdfFiles.reduce((s: number, f: any) => s + (f.base64?.length || 0), 0) / 1024);
      console.log(`[extract] Starting Claude Sonnet 4 extraction (${aiPdfFiles.length} file(s), ${totalB64KB}KB total base64)`);

      // Build Claude messages with document content blocks
      const claudeContent: any[] = [];
      for (const pf of aiPdfFiles) {
        if (pf.base64) {
          const mediaType = pf.mimeType === "application/pdf" ? "application/pdf"
            : pf.mimeType?.startsWith("image/") ? pf.mimeType : "application/pdf";

          if (mediaType === "application/pdf") {
            claudeContent.push({
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pf.base64 },
            });
          } else {
            claudeContent.push({
              type: "image",
              source: { type: "base64", media_type: mediaType, data: pf.base64 },
            });
          }
        }
      }
      claudeContent.push({ type: "text", text: userPromptText });

      const t1 = Date.now();
      console.log(`[extract] Payload built in ${t1 - t0}ms, calling Claude...`);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "pdfs-2024-09-25",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: "user", content: claudeContent }],
        }),
      });

      const t2 = Date.now();
      console.log(`[extract] Claude responded in ${t2 - t1}ms (status: ${response.status})`);

      if (!response.ok) {
        const errText = await response.text();
        console.error("Claude API error:", response.status, errText);
        // Fall back to Lovable AI gateway with faster model
        console.log("[extract] Falling back to Gemini 2.5 Flash");
        rawContent = await callLovableGateway(LOVABLE_API_KEY!, systemPrompt, userPromptText, aiPdfFiles, hasPdfs, corsHeaders);
      } else {
        const result = await response.json();
        const contentBlocks = Array.isArray(result?.content) ? result.content.length : 0;
        console.log(`[extract] Claude stop_reason=${result?.stop_reason || "unknown"}, content_blocks=${contentBlocks}, usage=${JSON.stringify(result?.usage || {})}`);
        rawContent = extractClaudeText(result);

        if (!rawContent) {
          console.warn("[extract] Claude returned HTTP 200 but no usable text content (0 text blocks out of " + contentBlocks + ") — falling back to Gemini");
          rawContent = await callLovableGateway(LOVABLE_API_KEY!, systemPrompt, userPromptText, aiPdfFiles, hasPdfs, corsHeaders);
        }
      }
    } else {
      console.log(`[extract] Using Lovable AI gateway (hasPdfs: ${hasPdfs})`);
      rawContent = await callLovableGateway(LOVABLE_API_KEY!, systemPrompt, userPromptText, aiPdfFiles, hasPdfs, corsHeaders);
    }

    console.log(`[extract] Total AI call completed in ${Date.now() - t0}ms`);

    // Debug: log raw AI response (first 500 chars)
    console.log(`[extract] Raw AI response (${rawContent?.length || 0} chars): ${rawContent?.substring(0, 500)}`);

    if (!rawContent) {
      throw new Error("No content returned from AI");
    }

    // Strip markdown code fences if present
    let jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let extracted: any;
    try {
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[extract] JSON parse failed:", parseErr, "Raw (first 1000):", jsonStr.substring(0, 1000));
      throw new Error("Failed to parse AI response as JSON");
    }

    // ── Fallback: if Claude returned all-empty fields, retry with Gemini ──
    const fd0 = extracted.form_data || {};
    const IGNORE_KEYS = new Set(["vehicles", "drivers", "coverage_types_needed"]);
    const meaningfulCount = Object.entries(fd0).filter(
      ([k, v]) => !IGNORE_KEYS.has(k) && v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]"
    ).length;

    if (meaningfulCount < 3 && LOVABLE_API_KEY && hasPdfs) {
      console.warn(`[extract] Claude returned only ${meaningfulCount} meaningful fields — falling back to Gemini`);
      try {
        const geminiRaw = await callLovableGateway(LOVABLE_API_KEY, systemPrompt, userPromptText, pdf_files, hasPdfs, corsHeaders);
        const geminiJson = geminiRaw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
        const geminiExtracted = JSON.parse(geminiJson);
        const gfd = geminiExtracted.form_data || {};
        const geminiCount = Object.entries(gfd).filter(
          ([k, v]) => !IGNORE_KEYS.has(k) && v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]"
        ).length;
        console.log(`[extract] Gemini fallback returned ${geminiCount} meaningful fields`);
        if (geminiCount > meaningfulCount) {
          extracted = geminiExtracted;
          console.log(`[extract] Using Gemini results (${geminiCount} fields) over Claude (${meaningfulCount} fields)`);
        }
      } catch (geminiErr) {
        console.warn("[extract] Gemini fallback also failed:", geminiErr);
      }
    }

    // Pre-expand vehicles[] and drivers[] arrays into flat vehicle_N_* / driver_N_* keys
    // This ensures the form fill pipeline has exact flat keys identical to the benchmark ground-truth format
    const fd: Record<string, any> = extracted.form_data || {};

    // Strip code fields that may have been hallucinated by AI
    const CODE_FIELDS_TO_STRIP = [
      "sic_code", "naics_code", "naic_code", "gl_code", "class_code_1", "class_code_2",
      "hazard_code_1", "hazard_code_2", "hazard_code_3", "program_code", "ncci_risk_id",
      "wc_class_code",
    ];
    // Only keep code fields if they appear verbatim in the source text
    const sourceText = (description || "") + (file_contents || "");
    for (const codeField of CODE_FIELDS_TO_STRIP) {
      if (fd[codeField]) {
        const codeValue = String(fd[codeField]).trim();
        // If source text doesn't contain the exact code value, strip it
        if (codeValue && !sourceText.includes(codeValue)) {
          // For PDF files we can't easily search, keep the value only if it looks like
          // an actual code (all digits, reasonable length) — but we still strip it
          // since we can't verify. The extraction prompt should handle this.
          if (!hasPdfs) {
            fd[codeField] = "";
          }
          // For PDFs, trust the extraction since we told the AI to only extract verbatim
        }
      }
    }

    const vehicles: any[] = Array.isArray(fd.vehicles) ? fd.vehicles : [];
    vehicles.forEach((v: any, idx: number) => {
      const n = idx + 1;
      if (v.year && !fd[`vehicle_${n}_year`])         fd[`vehicle_${n}_year`]      = String(v.year);
      if (v.make && !fd[`vehicle_${n}_make`])         fd[`vehicle_${n}_make`]      = String(v.make);
      if (v.model && !fd[`vehicle_${n}_model`])       fd[`vehicle_${n}_model`]     = String(v.model);
      if ((v.vin || v.VIN) && !fd[`vehicle_${n}_vin`]) fd[`vehicle_${n}_vin`]     = String(v.vin || v.VIN);
      if ((v.body_type || v.bodyType || v.type) && !fd[`vehicle_${n}_body_type`])
        fd[`vehicle_${n}_body_type`] = String(v.body_type || v.bodyType || v.type);
      if ((v.stated_amount || v.cost_new) && !fd[`vehicle_${n}_stated_amount`])
        fd[`vehicle_${n}_stated_amount`] = String(v.stated_amount || v.cost_new);
      if ((v.garaging_zip || v.zip) && !fd[`vehicle_${n}_garaging_zip`])
        fd[`vehicle_${n}_garaging_zip`] = String(v.garaging_zip || v.zip);
    });
    if (vehicles.length > 0 && !fd.number_of_vehicles) {
      fd.number_of_vehicles = String(vehicles.length);
    }

    const drivers: any[] = Array.isArray(fd.drivers) ? fd.drivers : [];
    drivers.forEach((d: any, idx: number) => {
      const n = idx + 1;
      if ((d.name || d.full_name) && !fd[`driver_${n}_name`])
        fd[`driver_${n}_name`] = String(d.name || d.full_name);
      if ((d.dob || d.date_of_birth) && !fd[`driver_${n}_dob`])
        fd[`driver_${n}_dob`] = String(d.dob || d.date_of_birth);
      if ((d.license || d.license_number || d.dl_number) && !fd[`driver_${n}_license`])
        fd[`driver_${n}_license`] = String(d.license || d.license_number || d.dl_number);
      if ((d.license_state || d.state) && !fd[`driver_${n}_license_state`])
        fd[`driver_${n}_license_state`] = String(d.license_state || d.state);
    });
    if (drivers.length > 0 && !fd.number_of_drivers) {
      fd.number_of_drivers = String(drivers.length);
    }

    // Also set LOB flags from detected arrays if not already set
    if (vehicles.length > 0 && fd.lob_auto !== "true") fd.lob_auto = "true";

    // ── Post-processing: normalize business_type ──
    // Common variations → standard ACORD entity types
    const BUSINESS_TYPE_MAP: Record<string, string> = {
      "limited liability company": "LLC",
      "limit liability comp": "LLC",
      "llc": "LLC",
      "corporation": "Corporation",
      "corp": "Corporation",
      "s corporation": "S Corporation",
      "s corp": "S Corporation",
      "c corporation": "C Corporation",
      "c corp": "C Corporation",
      "partnership": "Partnership",
      "sole proprietor": "Sole Proprietor",
      "sole proprietorship": "Sole Proprietor",
      "joint venture": "Joint Venture",
      "trust": "Trust",
      "not for profit": "Not For Profit",
      "non-profit": "Not For Profit",
      "nonprofit": "Not For Profit",
      "individual": "Individual",
      "subchapter s corporation": "Subchapter S Corporation",
    };

    if (fd.business_type) {
      const btLower = String(fd.business_type).trim().toLowerCase();
      // Check if it's a known entity type
      if (BUSINESS_TYPE_MAP[btLower]) {
        fd.business_type = BUSINESS_TYPE_MAP[btLower];
      } else {
        // If business_type looks like a business description (e.g. "63-unit Habitational"),
        // move it to nature_of_business and clear business_type
        const entityKeywords = ["llc", "corp", "partnership", "proprietor", "venture", "trust", "individual", "liability"];
        const isEntityType = entityKeywords.some(kw => btLower.includes(kw));
        if (!isEntityType && !fd.nature_of_business) {
          fd.nature_of_business = fd.business_type;
          fd.business_type = "";
        }
      }
    }

    // ── Post-processing: auto-detect occurrence vs claims-made ──
    // If CGL is present and chk_occurrence/chk_claims_made are both false,
    // default to occurrence (the most common form type)
    if (fd.lob_gl === "true" || fd.lob_commercial_general_liability === "true" || fd.chk_commercial_general_liability === "true") {
      if (fd.chk_occurrence !== "true" && fd.chk_claims_made !== "true") {
        // Default to occurrence unless there's claims-made indicators
        const hasClaimsMadeIndicator = fd.retroactive_date || fd.entry_date_claims_made;
        if (hasClaimsMadeIndicator) {
          fd.chk_claims_made = "true";
        } else {
          fd.chk_occurrence = "true";
        }
      }
    }

    // ── Post-processing: auto-set aggregate applies per ──
    if (!fd.aggregate_applies_per && (fd.chk_limit_policy === "true" || fd.chk_limit_project === "true" || fd.chk_limit_location === "true")) {
      if (fd.chk_limit_policy === "true") fd.aggregate_applies_per = "Policy";
      else if (fd.chk_limit_project === "true") fd.aggregate_applies_per = "Project";
      else if (fd.chk_limit_location === "true") fd.aggregate_applies_per = "Location";
    }

    // If no aggregate limit checkbox is set but we have GL, default to Policy
    if (fd.lob_gl === "true" && fd.chk_limit_policy !== "true" && fd.chk_limit_project !== "true" && fd.chk_limit_location !== "true") {
      fd.chk_limit_policy = "true";
      if (!fd.aggregate_applies_per) fd.aggregate_applies_per = "Policy";
    }

    // ── Post-processing: infer entity type from company name if business_type empty ──
    if (!fd.business_type && fd.applicant_name) {
      const name = String(fd.applicant_name).trim();
      if (/\bLLC\b/i.test(name)) fd.business_type = "LLC";
      else if (/\bInc\.?\b/i.test(name)) fd.business_type = "Corporation";
      else if (/\bCorp\.?\b/i.test(name)) fd.business_type = "Corporation";
      else if (/\bLLP\b/i.test(name)) fd.business_type = "Partnership";
      else if (/\bLP\b/i.test(name)) fd.business_type = "Partnership";
    }

    extracted.form_data = fd;

    // Debug: log key extracted fields
    const fdKeys = Object.entries(fd).filter(([_, v]) => v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]");
    console.log(`[extract] Extracted ${fdKeys.length} non-empty fields. Key fields: applicant_name="${fd.applicant_name}", city="${fd.city}", state="${fd.state}", business_type="${fd.business_type}"`);

    // Save to database if submission_id provided
    if (submission_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get the submission to find user_id
      const { data: submission, error: subError } = await supabase
        .from("business_submissions")
        .select("user_id")
        .eq("id", submission_id)
        .single();

      if (subError) {
        console.error("[extract] Failed to fetch submission:", subError);
      }

      if (submission) {
        const { data: insertData, error: insertError } = await supabase.from("insurance_applications").insert({
          submission_id,
          user_id: submission.user_id,
          form_data: extracted.form_data,
          gaps: extracted.gaps,
          status: "draft",
        }).select("id").single();

        if (insertError) {
          console.error("[extract] DB insert FAILED:", insertError);
        } else {
          console.log(`[extract] DB insert SUCCESS: application id=${insertData?.id}, form_data has ${fdKeys.length} non-empty fields`);
        }

        await supabase
          .from("business_submissions")
          .update({ status: "extracted" })
          .eq("id", submission_id);
      } else {
        console.error("[extract] No submission found for id:", submission_id);
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
