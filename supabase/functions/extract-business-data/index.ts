import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

/**
 * ═══════════════════════════════════════════════════════════
 *  AURA Extraction Pipeline (Gemini Native PDF)
 * ═══════════════════════════════════════════════════════════
 *
 *  Stage 1 — Gemini Native PDF Vision (primary)
 *    Sends raw PDF bytes directly to Gemini Flash/Pro
 *    for multimodal extraction. No separate OCR step needed.
 *
 *  Stage 2 — Escalation (if Flash yields low results)
 *    Retries with Gemini Pro for higher accuracy.
 *
 *  Stage 3 — Claude Opus Specialist (optional)
 *    Only invoked when stages 1-2 produce < CONFIDENCE_THRESHOLD
 *    meaningful fields. Receives extracted text + partial results.
 *
 *  Text-only path: Gemini Flash direct schema mapping.
 * ═══════════════════════════════════════════════════════════
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PDF_PAGES = 80; // increased — prescan trims to ideal pages
const MAX_TOTAL_PAGES = 80;
const PRESCAN_TARGET_PAGES = 15; // ideal number of data-rich pages to extract from
const PRESCAN_THRESHOLD = 20; // only prescan if doc has more pages than this
const CONFIDENCE_THRESHOLD = 5; // minimum meaningful fields before triggering specialist

// ── Shared schema prompt (used by all stages) ──
const SCHEMA_PROMPT = `You are an expert insurance underwriter assistant. Extract data from the provided OCR text and return ONLY valid JSON with no markdown fences, no explanation — just raw JSON.

CRITICAL ANTI-HALLUCINATION RULES:
- NEVER fabricate, guess, or invent data. If information is not explicitly present in the provided text, leave the field as an empty string "".
- Do NOT fill in sample/placeholder data like "123 Main St", "Acme Corp", "John Smith", or generic SIC/NAICS codes.
- Do NOT infer employee counts, revenue, addresses, phone numbers, or any other factual data that is not stated.
- Only populate a field if you can point to the specific text in the input that contains that value.

CODES — EXTRACT VERBATIM ONLY, NEVER INFER:
- sic_code, naics_code, naic_code, gl_code, class_code_1, class_code_2, hazard_code_1, hazard_code_2, program_code, ncci_risk_id, wc_class_code, policy_number, prior_policy_number_1, prior_wc_policy_1: these fields must ONLY be populated if the EXACT code/number appears verbatim in the source text.

DOCUMENT TYPE RECOGNITION:
- DECLARATIONS PAGES (Dec Pages): These contain the core policy data — carrier, insured name, policy number, dates, limits, deductibles, premiums, locations, endorsement schedules. FOCUS on these pages first. They typically have headers like "DECLARATION PAGE", "DECLARATIONS", "POLICY DECLARATIONS", or carrier letterhead with policy details.
- BUSINESSOWNERS (BOP) Dec Pages: Look for building limits, BPP limits, property deductibles, glass deductibles, auto increase percentages, liability limits, EPLI, cyber coverages, equipment breakdown, crime coverages. These are the MOST data-rich pages.
- COVERAGE FORMS / POLICY LANGUAGE (e.g., "BP 00 03", "BUSINESSOWNERS COVERAGE FORM"): These are STANDARD FORM LANGUAGE that contains no insured-specific data. SKIP extracting from these pages — they contain only generic policy terms, conditions, and definitions that are the same for every policyholder.
- PRIVACY NOTICES, TERRORISM ENDORSEMENT FORMS (blank/unsigned): Contain no extractable data. Skip these.

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
    "lob_inland_marine": "false", "lob_bop": "false",
    "lob_commercial_general_liability": "false",
    "cgl_premium": "", "auto_premium": "", "umbrella_premium": "", "wc_premium": "",
    "inland_marine_premium": "", "bop_premium": "",
    "chk_commercial_general_liability": "false",
    "chk_claims_made": "false", "chk_occurrence": "false",
    "chk_owners_contractors": "false",
    "chk_limit_policy": "false", "chk_limit_location": "false",
    "chk_limit_project": "false", "chk_limit_other": "false",
    "chk_deductible_pd": "false", "chk_deductible_bi": "false",
    "chk_per_claim": "false", "chk_per_occurrence": "false",
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
    "audit_period": "", "tria_premium": "", "policy_fee": "",
    "bop_carrier": "", "bop_policy_number": "",
    "auto_carrier": "", "auto_policy_number": "",
    "umbrella_carrier": "", "umbrella_policy_number": "",
    "wc_carrier": "", "wc_policy_number": "",
    "underwriter": "", "underwriter_office": "",

    "producer_name": "", "producer_address": "", "producer_city": "", "producer_state": "", "producer_zip": "", "producer_phone": "",

    "location_1_number": "", "location_1_building_number": "", "location_1_address": "", "location_1_city": "", "location_1_state": "", "location_1_zip": "", "location_1_occupancy": "",
    "location_2_number": "", "location_2_building_number": "", "location_2_address": "", "location_2_city": "", "location_2_state": "", "location_2_zip": "", "location_2_occupancy": "",
    "location_3_number": "", "location_3_building_number": "", "location_3_address": "", "location_3_city": "", "location_3_state": "", "location_3_zip": "", "location_3_occupancy": "",

    "bop_building_limit_1": "", "bop_bpp_limit_1": "", "bop_property_deductible_1": "", "bop_glass_deductible_1": "", "bop_valuation_1": "", "bop_auto_increase_percent_1": "",
    "bop_building_limit_2": "", "bop_bpp_limit_2": "", "bop_property_deductible_2": "", "bop_glass_deductible_2": "", "bop_valuation_2": "", "bop_auto_increase_percent_2": "",
    "bop_building_limit_3": "", "bop_bpp_limit_3": "", "bop_property_deductible_3": "", "bop_glass_deductible_3": "", "bop_valuation_3": "", "bop_auto_increase_percent_3": "",

    "epli_each_claim_limit": "", "epli_aggregate_limit": "", "epli_deductible": "", "epli_retro_date": "",

    "cyber_multimedia_liability_limit": "", "cyber_security_privacy_liability_limit": "",
    "cyber_regulatory_defense_limit": "", "cyber_pci_dss_limit": "",
    "cyber_breach_response_limit": "", "cyber_network_asset_limit": "",
    "cyber_extortion_limit": "", "cyber_terrorism_limit": "",
    "cyber_brand_guard_limit": "", "cyber_boid_theft_limit": "",
    "cyber_aggregate_limit": "", "cyber_retro_date": "",

    "addl_interest_1_name": "", "addl_interest_1_address": "", "addl_interest_1_city": "", "addl_interest_1_state": "", "addl_interest_1_zip": "", "addl_interest_1_interest_type": "", "addl_interest_1_location_ref": "", "addl_interest_1_attention": "",
    "addl_interest_2_name": "", "addl_interest_2_address": "", "addl_interest_2_city": "", "addl_interest_2_state": "", "addl_interest_2_zip": "", "addl_interest_2_interest_type": "", "addl_interest_2_location_ref": "",
    "addl_interest_3_name": "", "addl_interest_3_address": "", "addl_interest_3_city": "", "addl_interest_3_state": "", "addl_interest_3_zip": "", "addl_interest_3_interest_type": "", "addl_interest_3_location_ref": "",

    "terrorism_premium_certified_acts": "",
    "policy_total_premium": "",
    "billing_plan": "",

    "vehicles": [],
    "drivers": [],
    "policies": [],
    "underlying_insurance": [],
    "wc_classifications": [],
    "cgl_hazards": [],
    "cgl_limits": {},
    "locations": [],
    "mortgagees": [],
    "endorsements": [],
    "wc_other_states_3a": "", "wc_excluded_states": "",
    "waiver_of_subrogation": "", "waiver_endorsement_number": "",
    "contracting_class_credit": "",
    "standard_premium": "", "modified_premium": "", "expense_constant": "",
    "terrorism_premium": "", "cat_premium": "",
    "second_injury_fund": "", "wc_fund_assessment": "",
    "products_completed_ops_aggregate": "",
    "defense_within_limits": "", "crisis_mgmt_limit": "",
    "non_cumulation_occurrence": "false", "non_cumulation_endorsement": "",
    "additional_named_insured_1": "", "additional_named_insured_2": "",
    "hired_auto_liability": "", "hired_auto_cost_of_hire": "", "hired_auto_premium": "",
    "non_owned_liability": "", "non_owned_num_employees": "", "non_owned_premium": "",
    "auto_coverage_plus": "false", "rental_reimbursement": "false",
    "roadside_assistance": "false", "glass_deductible_waiver": "false",
    "hired_auto_pd": "false", "gap_coverage": "false",
    "accounts_receivable_limit": "", "valuable_papers_limit": "",
    "edp_media_limit": "", "fine_arts_limit": "", "fungus_limit": "",
    "coverage_extensions_limit": "",
    "bi_ee_type": "", "bi_ee_months": "",
    "bi_rental_value_included": "false", "bi_ordinary_payroll_included": "false",
    "bi_extended_days": "", "bi_dependent_properties_limit": "",
    "equipment_breakdown_coverage": "false", "equipment_breakdown_limit": "",
    "spoilage_limit": "", "expediting_expense_limit": "",
    "ammonia_contamination_limit": "", "hazardous_substance_limit": "",
    "crime_employee_theft": "false", "crime_forgery": "false",
    "computer_fraud_limit": "", "ordinance_or_law_limit": "",
    "power_pac_blanket_limit": "",
    "occupancy_description": "",
    "mortgagee_1_name": "", "mortgagee_1_address": "", "mortgagee_1_clause": "",
    "mortgagee_2_name": "", "mortgagee_2_address": "",
    "mortgagee_3_name": "", "mortgagee_3_address": ""
  },
  "gaps": []
}

EXTRACTION RULES:
- Return ALL fields even if empty string — but ONLY populate with data actually found in input
- All scalar values must be strings — booleans as "true"/"false"
- Dates → MM/DD/YYYY format, currencies → plain number without $ or commas
- lob_* flags: set "true" ONLY if that coverage type is explicitly mentioned
- CHECKBOX FIELDS (chk_*): set "true" if the document indicates that option applies
- SCHEDULE OF HAZARDS: Extract ALL class code rows (hazard_*_1, hazard_*_2, hazard_*_3) AND also populate cgl_hazards[] with structured objects: { location, building, class_code, classification, premium_basis, exposure, territory, rate_premops, rate_products, premium_premops, premium_products }. Both the flat fields and the array should be populated.
- CGL LIMITS: Also populate cgl_limits: { general_aggregate, products_aggregate, each_occurrence, personal_adv_injury, fire_damage, medical_payments, coverage_type, aggregate_applies_per, deductible_amount, retention_amount }. Extract these from the General Liability section of declarations pages or the ACORD 126 coverages section.
- vehicles[]: include ALL vehicles — each: { year, make, model, vin, body_type, stated_amount, garaging_zip, gvw, comp_deductible, coll_deductible, territory, use_class }
- drivers[]: include ALL drivers listed in driver schedules, driver listings, or "CURRENT DRIVERS" sections — each: { name, first_name, last_name, dob, license, license_state }. The "name" field should be the full name as shown (e.g., "ORR, LISA"). Also split into "first_name" and "last_name" separately. If DOB or license number are not provided, leave them as empty strings. For license_state, default to the insured's state if not explicitly listed per driver. Look for driver listings in auto policy declarations, endorsements, and supplemental schedules.
- policies[]: When MULTIPLE policy declarations are present (BOP, Auto, Umbrella, WC, etc.), extract EACH as a separate object: { line_of_business, carrier_name, policy_number, premium, effective_date, expiration_date, naic_code }. This is critical for multi-policy packets.
- underlying_insurance[]: Extract ALL underlying policies from umbrella/excess declarations. Each: { line_of_business, carrier, policy_number, limits: { each_occurrence, general_aggregate, products_completed_ops, personal_adv_injury, csl, each_accident, disease_each_employee, disease_policy }, premium }. Map Auto CSL, GL limits, and Employers Liability limits from the schedule of underlying.
- wc_classifications[]: Extract ALL WC class codes from workers comp declarations/schedules. Each: { class_code, description, naics, sic, num_employees, annual_remuneration, rate, estimated_premium }. Look in "CLASSIFICATION SCHEDULE", "PREMIUM COMPUTATION", or "SCHEDULE OF CLASSIFICATIONS".
- locations[]: Extract all premises/building info for property. Each: { premises_number, building_number, address, city, state, zip, description, occupancy }
- mortgagees[]: Extract ALL mortgagees/loss payees. Each: { name, address, clause, premises_number, building_number }. Include ISAOA ATIMA wording.
- endorsements[]: Extract endorsement numbers and names from endorsement schedules. Each: { number, name, description }. Use to set waiver_of_subrogation, non_cumulation_occurrence, and enhancement flags.
- Per-LOB carrier/premium fields: Also populate the flat fields (bop_carrier, bop_policy_number, auto_carrier, auto_policy_number, umbrella_carrier, umbrella_policy_number, wc_carrier, wc_policy_number, auto_premium, umbrella_premium, wc_premium, cgl_premium, property_premium, inland_marine_premium, bop_premium) from the corresponding policy declarations.
- BOP DECLARATIONS: For Businessowners policies, extract ALL property and liability details:
  * Set lob_bop to "true" and populate bop_carrier, bop_policy_number, bop_premium
  * Location-indexed property: bop_building_limit_N, bop_bpp_limit_N, bop_property_deductible_N, bop_glass_deductible_N, bop_valuation_N (e.g. "replacement cost"), bop_auto_increase_percent_N
  * Location-indexed info: location_N_number, location_N_building_number, location_N_address, location_N_city, location_N_state, location_N_zip, location_N_occupancy
  * GL limits from BOP: each_occurrence (Per Occurrence), general_aggregate (Other Than Products/Completed Ops Aggregate), products_aggregate (Products/Completed Ops Aggregate), fire_damage (Damage to Premises Rented), medical_payments (Medical Expense Per Person)
  * EPLI: epli_each_claim_limit, epli_aggregate_limit, epli_deductible, epli_retro_date
  * Cyber coverages: cyber_multimedia_liability_limit, cyber_security_privacy_liability_limit, cyber_regulatory_defense_limit, cyber_pci_dss_limit, cyber_breach_response_limit, cyber_network_asset_limit, cyber_extortion_limit, cyber_terrorism_limit, cyber_brand_guard_limit, cyber_boid_theft_limit, cyber_aggregate_limit, cyber_retro_date
  * Additional interests/mortgagees: addl_interest_N_name, addl_interest_N_attention, addl_interest_N_address, addl_interest_N_city, addl_interest_N_state, addl_interest_N_zip, addl_interest_N_interest_type (e.g. "mortgagee"), addl_interest_N_location_ref
  * Terrorism: terrorism_premium_certified_acts
  * Total: policy_total_premium
  * Billing: billing_plan (e.g. "Four Pay", "Annual", "Monthly")
- PRODUCER/AGENCY: Extract producer_name, producer_address, producer_city, producer_state, producer_zip, producer_phone from the Agent/Agency section of declarations. These map to the agency/producer fields on ACORD 125.
- WC PREMIUM DATA: Extract standard_premium, modified_premium, expense_constant, terrorism_premium, cat_premium, second_injury_fund, wc_fund_assessment from WC premium computation sections.
- WC OTHER STATES: Extract wc_other_states_3a (list of covered states from Item 3.A), wc_excluded_states (monopolistic/excluded states).
- WAIVER OF SUBROGATION: If a blanket waiver of subrogation endorsement is listed (e.g., WC 00 03 13), set waiver_of_subrogation to "Yes - Blanket" and waiver_endorsement_number to the form number.
- PROPERTY BI/EE: Extract bi_ee_type (Actual Loss Sustained, Monthly Limit, Max Period), bi_ee_months, bi_rental_value_included, bi_ordinary_payroll_included, bi_extended_days from Business Income coverage sections.
- PROPERTY ADDITIONAL COVERAGES: Extract equipment breakdown limits, crime coverages, computer fraud, ordinance or law from property endorsement schedules and Power Pac sections.
- MORTGAGEES: Extract from mortgage/loss payee schedules per building/premises.
- ENHANCEMENT FLAGS: Set auto_coverage_plus, rental_reimbursement, roadside_assistance, glass_deductible_waiver, hired_auto_pd, gap_coverage to "true" if explicitly endorsed on auto declarations.
- naic_code: Look for "NAIC" followed by a number on insurance ID cards, declarations pages, or certificate headers. Extract ONLY the numeric code (e.g., "24775" from "NAIC 24775 ST. PAUL GUARDIAN").
- underwriter / underwriter_office: Extract if present on declarations page.
- ENDORSEMENT FORM NUMBERS: Extract the list of form numbers from "FORMS AND ENDORSEMENTS" sections (e.g., "BP0003 0106, BP0159 0808, ..."). Populate endorsements[] with each form number.
- gaps[]: list missing important fields — { field, question, priority: required|recommended|optional }
- If no meaningful data is provided, return all fields as empty strings`;

// ═══════════════════════════════════════════════════════════
//  Gemini Native PDF Vision — sends raw PDF bytes to Gemini
// ═══════════════════════════════════════════════════════════

async function callGeminiWithPdfs(
  apiKey: string,
  systemPrompt: string,
  userPromptText: string,
  pdfFiles: any[],
  model = "google/gemini-2.5-pro",
): Promise<string> {
  type ContentPart = { type: string; text?: string; image_url?: { url: string } };
  const userContent: ContentPart[] = [{ type: "text", text: userPromptText }];
  for (const pf of pdfFiles) {
    if (pf.base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${pf.mimeType || "application/pdf"};base64,${pf.base64}` },
      });
    }
  }

  const t0 = Date.now();
  console.log(`[gemini-native] Calling ${model} with raw PDFs...`);

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
        { role: "user", content: userContent },
      ],
    }),
  });

  console.log(`[gemini-native] ${model} responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const t = await response.text();
    console.error("[gemini-native] error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limited, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI extraction failed (${response.status})`);
  }

  const aiResult = await response.json();
  return aiResult.choices?.[0]?.message?.content || "{}";
}

// ═══════════════════════════════════════════════════════════
//  Gemini Flash — Text-only Schema Mapping
// ═══════════════════════════════════════════════════════════

async function callGeminiFlash(
  apiKey: string,
  ocrText: string,
  additionalContext: string,
): Promise<string> {
  const userPrompt = `Extract all insurance data from the following OCR text extracted from insurance documents.

${additionalContext ? `Additional context:\n${additionalContext}\n\n` : ""}OCR TEXT:
${ocrText}`;

  const t0 = Date.now();
  console.log(`[text-mapping] Calling Gemini Flash for schema mapping (${ocrText.length} chars)...`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SCHEMA_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  console.log(`[text-mapping] Gemini Flash responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const t = await response.text();
    console.error("[text-mapping] Gemini Flash error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limited, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Gemini Flash error: ${response.status}`);
  }

  const aiResult = await response.json();
  return aiResult.choices?.[0]?.message?.content || "{}";
}

// ═══════════════════════════════════════════════════════════
//  Claude Opus Specialist (low-confidence gap-fill)
// ═══════════════════════════════════════════════════════════

async function callClaudeOpus(
  apiKey: string,
  pdfFiles: any[],
  partialResults: Record<string, any>,
  additionalContext: string,
): Promise<string> {
  const emptyFields = Object.entries(partialResults)
    .filter(([k, v]) => !["vehicles", "drivers", "coverage_types_needed", "gaps"].includes(k) && (!v || String(v).trim() === "" || String(v).trim() === "false"))
    .map(([k]) => k);

  const specialistPrompt = `You are a specialist insurance document analyst reviewing documents that a previous extraction pass could not fully parse.

PREVIOUS EXTRACTION found ${Object.entries(partialResults).filter(([k, v]) => v && String(v).trim() && String(v).trim() !== "false").length} fields but left ${emptyFields.length} fields empty.

Your job: carefully re-read the documents and fill in any fields the previous pass missed. Focus especially on:
- Names, addresses, policy numbers buried in dense text
- Table data (vehicles, drivers, class codes, limits)
- Ambiguous abbreviations or formatting

CRITICAL: Do NOT hallucinate. Only fill fields with data you can directly find in the documents.

Return the COMPLETE form_data JSON (all fields, including the ones already filled), merging your findings with the previous results. Keep existing values unless you find a more accurate/complete version.

Return ONLY valid JSON with this structure:
{
  "form_data": { ... all fields ... },
  "gaps": [ ... remaining gaps ... ]
}`;

  const claudeContent: any[] = [];
  for (const pf of pdfFiles) {
    if (pf.base64) {
      const mt = pf.mimeType === "application/pdf" ? "application/pdf"
        : pf.mimeType?.startsWith("image/") ? pf.mimeType : "application/pdf";
      if (mt === "application/pdf") {
        claudeContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pf.base64 } });
      } else {
        claudeContent.push({ type: "image", source: { type: "base64", media_type: mt, data: pf.base64 } });
      }
    }
  }
  claudeContent.push({
    type: "text",
    text: `Previous partial extraction:\n${JSON.stringify(partialResults, null, 2).substring(0, 3000)}\n\n${additionalContext ? `Context: ${additionalContext}\n\n` : ""}Please extract all missing fields from the attached documents.`,
  });

  const t0 = Date.now();
  console.log(`[stage-claude] Calling Claude Opus for specialist review (${emptyFields.length} empty fields)...`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 8192,
      system: specialistPrompt,
      messages: [{ role: "user", content: claudeContent }],
    }),
  });

  console.log(`[stage-claude] Claude Opus responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[stage-claude] Claude Opus error:", response.status, errText);
    throw new Error(`Claude Opus error: ${response.status}`);
  }

  const result = await response.json();
  const blocks = Array.isArray(result?.content) ? result.content : [];
  const text = blocks
    .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();

  console.log(`[stage-claude] Claude Opus usage: ${JSON.stringify(result?.usage || {})}`);

  if (!text) throw new Error("Claude Opus returned empty content");
  return text;
}

// ═══════════════════════════════════════════════════════════
//  PDF UTILITIES
// ═══════════════════════════════════════════════════════════

async function truncatePdf(base64Data: string, maxPages: number): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();
    if (pageCount <= maxPages) return base64Data;

    console.log(`[pdf] Truncating from ${pageCount} to ${maxPages} pages`);
    const newDoc = await PDFDocument.create();
    const indices = Array.from({ length: maxPages }, (_, i) => i);
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));

    const newBytes = await newDoc.save();
    let binary = '';
    const bytes = new Uint8Array(newBytes);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn("[pdf] Truncation failed, using original:", err);
    return base64Data;
  }
}

function countMeaningfulFields(fd: Record<string, any>): number {
  const IGNORE = new Set(["vehicles", "drivers", "coverage_types_needed", "gaps"]);
  return Object.entries(fd).filter(
    ([k, v]) => !IGNORE.has(k) && v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]"
  ).length;
}

function parseAiJson(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

// ═══════════════════════════════════════════════════════════
//  PRESCAN — Identify data-rich pages using Flash Lite
// ═══════════════════════════════════════════════════════════

async function prescanForDataPages(
  apiKey: string,
  pdfBase64: string,
  totalPages: number,
  maxTargetPages: number = PRESCAN_TARGET_PAGES,
): Promise<number[]> {
  const t0 = Date.now();
  console.log(`[prescan] Starting page prescan on ${totalPages}-page document (target: ${maxTargetPages} pages)...`);

  const prescanPrompt = `You are analyzing a ${totalPages}-page insurance document packet. Your job is to identify which PAGE NUMBERS contain actual insured-specific data worth extracting.

INCLUDE these page types (they have extractable data):
- Declaration pages (insured name, policy number, limits, premiums, deductibles, effective dates)
- Coverage summary / schedule of coverages pages
- Vehicle schedules / auto schedules
- Driver schedules / driver listings
- Classification schedules (WC class codes, GL hazard codes)
- Premium computation / breakdown pages
- Location schedules / property schedules
- Mortgagee / additional interest schedules
- Endorsement schedule pages (listing form numbers)
- Certificate of insurance pages
- Loss run summaries with actual claim data

EXCLUDE these page types (no extractable data):
- Standard policy form language (e.g., "BUSINESSOWNERS COVERAGE FORM BP 00 03", "COMMERCIAL GENERAL LIABILITY COVERAGE FORM CG 00 01")
- Generic terms, conditions, and definitions boilerplate
- Privacy notices / data practices notices
- Terrorism Risk Insurance Act standard notices
- Blank pages or signature-only pages
- Table of contents
- Standard exclusions text
- "COMMON POLICY CONDITIONS" boilerplate
- Any page that is standard form text identical across all policyholders

Return ONLY a JSON array of 1-indexed page numbers containing extractable data.
Prioritize declaration pages and schedule pages.
Return at most ${maxTargetPages} page numbers.
Example: [1, 2, 3, 7, 12, 15]

Return ONLY the JSON array, nothing else.`;

  try {
    type ContentPart = { type: string; text?: string; image_url?: { url: string } };
    const userContent: ContentPart[] = [
      { type: "text", text: prescanPrompt },
      { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: userContent }],
      }),
    });

    console.log(`[prescan] Flash Lite responded in ${Date.now() - t0}ms (status: ${response.status})`);

    if (!response.ok) {
      const t = await response.text();
      console.warn("[prescan] Flash Lite error:", response.status, t);
      return []; // fallback: process all pages
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content || "[]";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const pages: number[] = JSON.parse(cleaned);

    if (Array.isArray(pages)) {
      const valid = pages
        .map(Number)
        .filter(n => !isNaN(n) && n > 0 && n <= totalPages)
        .slice(0, maxTargetPages);
      console.log(`[prescan] Identified ${valid.length} data-rich pages: [${valid.join(", ")}]`);
      return valid;
    }
  } catch (err) {
    console.warn("[prescan] Failed to parse prescan result:", err);
  }
  return []; // empty = fallback to all pages
}

/**
 * Extract specific 1-indexed page numbers from a PDF
 */
async function extractSpecificPages(base64Data: string, pageNumbers: number[]): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // Convert to 0-indexed and filter valid
    const indices = pageNumbers
      .map(p => p - 1)
      .filter(i => i >= 0 && i < totalPages)
      .sort((a, b) => a - b);

    if (indices.length === 0 || indices.length >= totalPages) return base64Data;

    console.log(`[prescan] Slicing PDF: ${indices.length} pages from ${totalPages}-page document`);

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));

    const newBytes = await newDoc.save();
    let binary = '';
    const arr = new Uint8Array(newBytes);
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn("[prescan] Page extraction failed, using original:", err);
    return base64Data;
  }
}

// ═══════════════════════════════════════════════════════════
//  POST-PROCESSING (shared across all paths)
// ═══════════════════════════════════════════════════════════

function classifyVehicleBodyType(make: string, model: string): string {
  const combined = `${make} ${model}`.toLowerCase().trim();
  if (/trailer|flatbed|lowboy|reefer|tanker|semi[- ]?trailer|drop[- ]?deck|gooseneck|car\s*hauler|dump\s*trailer/i.test(combined)) return "Trailer";
  if (/f[- ]?[5-9]\d{2}|peterbilt|kenworth|mack|freightliner|international\s*(4[0-9]|work|dura|pay)|hino|isuzu\s*n[prq]r|volvo\s*v[hn]|western\s*star/i.test(combined)) return "Truck";
  if (/f[- ]?[1-4]50|silverado|sierra|ram\s*[1-5]\d{3}|tundra|titan|tacoma|ranger|colorado|canyon|frontier|ridgeline|maverick|gladiator/i.test(combined)) return "Pickup";
  if (/sprinter|transit|promaster|express|savana|metris|nv\s*\d|e[- ]?\d{3}/i.test(combined)) return "Van";
  if (/suburban|tahoe|yukon|expedition|explorer|4runner|sequoia|armada|pathfinder|pilot|highlander|durango|wrangler|bronco|defender/i.test(combined)) return "SUV";
  if (/sedan|camry|accord|civic|altima|malibu|fusion|corolla|jetta|passat|sonata|elantra|mazda[36]|impreza|legacy/i.test(combined)) return "Sedan";
  return "";
}

function postProcess(fd: Record<string, any>, sourceText: string, hasPdfs: boolean): void {
  // Strip potentially hallucinated code fields
  const CODE_FIELDS = [
    "sic_code", "naics_code", "naic_code", "gl_code", "class_code_1", "class_code_2",
    "hazard_code_1", "hazard_code_2", "hazard_code_3", "program_code", "ncci_risk_id", "wc_class_code",
  ];
  for (const cf of CODE_FIELDS) {
    if (fd[cf]) {
      const val = String(fd[cf]).trim();
      if (val && !hasPdfs && !sourceText.includes(val)) fd[cf] = "";
    }
  }

  // ── Flatten locations[] → location_N_* and also populate premises_* from first location ──
  const locations: any[] = Array.isArray(fd.locations) ? fd.locations : [];
  locations.forEach((loc: any, idx: number) => {
    const n = idx + 1;
    if (n > 3) return;
    if (loc.premises_number && !fd[`location_${n}_number`]) fd[`location_${n}_number`] = String(loc.premises_number);
    if (loc.building_number && !fd[`location_${n}_building_number`]) fd[`location_${n}_building_number`] = String(loc.building_number);
    if (loc.address && !fd[`location_${n}_address`]) fd[`location_${n}_address`] = String(loc.address);
    if (loc.city && !fd[`location_${n}_city`]) fd[`location_${n}_city`] = String(loc.city);
    if (loc.state && !fd[`location_${n}_state`]) fd[`location_${n}_state`] = String(loc.state);
    if (loc.zip && !fd[`location_${n}_zip`]) fd[`location_${n}_zip`] = String(loc.zip);
    if ((loc.occupancy || loc.description) && !fd[`location_${n}_occupancy`]) fd[`location_${n}_occupancy`] = String(loc.occupancy || loc.description);
  });
  // Auto-populate premises_* from location_1 if not set
  if (!fd.premises_address && fd.location_1_address) fd.premises_address = fd.location_1_address;
  if (!fd.premises_city && fd.location_1_city) fd.premises_city = fd.location_1_city;
  if (!fd.premises_state && fd.location_1_state) fd.premises_state = fd.location_1_state;
  if (!fd.premises_zip && fd.location_1_zip) fd.premises_zip = fd.location_1_zip;

  // ── Flatten mortgagees[] → mortgagee_N_* and addl_interest_N_* ──
  const mortgagees: any[] = Array.isArray(fd.mortgagees) ? fd.mortgagees : [];
  mortgagees.forEach((m: any, idx: number) => {
    const n = idx + 1;
    if (n > 3) return;
    if (m.name && !fd[`mortgagee_${n}_name`]) fd[`mortgagee_${n}_name`] = String(m.name);
    if (m.address && !fd[`mortgagee_${n}_address`]) fd[`mortgagee_${n}_address`] = String(m.address);
    if (m.clause && !fd[`mortgagee_${n}_clause`]) fd[`mortgagee_${n}_clause`] = String(m.clause);
    // Also populate addl_interest fields from mortgagees
    if (m.name && !fd[`addl_interest_${n}_name`]) fd[`addl_interest_${n}_name`] = String(m.name);
    if (m.address && !fd[`addl_interest_${n}_address`]) fd[`addl_interest_${n}_address`] = String(m.address);
    if (!fd[`addl_interest_${n}_interest_type`]) fd[`addl_interest_${n}_interest_type`] = "mortgagee";
    if ((m.premises_number || m.building_number) && !fd[`addl_interest_${n}_location_ref`]) {
      fd[`addl_interest_${n}_location_ref`] = `Prem ${m.premises_number || "001"} Bldg ${m.building_number || "001"}`;
    }
  });

  // ── Cross-populate BOP fields from generic fields and vice versa ──
  // If BOP is detected, populate generic limits from BOP-specific fields
  if (fd.lob_bop === "true") {
    if (fd.bop_building_limit_1 && !fd.building_limit) fd.building_limit = fd.bop_building_limit_1;
    if (fd.bop_bpp_limit_1 && !fd.bpp_limit) fd.bpp_limit = fd.bop_bpp_limit_1;
    if (fd.bop_property_deductible_1 && !fd.property_deductible) fd.property_deductible = fd.bop_property_deductible_1;
    if (!fd.bop_carrier && fd.current_carrier) fd.bop_carrier = fd.current_carrier;
    if (!fd.bop_policy_number && fd.policy_number) fd.bop_policy_number = fd.policy_number;
    if (!fd.bop_premium && fd.current_premium) fd.bop_premium = fd.current_premium;
    if (!fd.bop_premium && fd.policy_total_premium) fd.bop_premium = fd.policy_total_premium;
  }
  // Reverse: if generic fields are set but BOP-specific are not, and it's a BOP
  if (fd.lob_bop === "true") {
    if (!fd.bop_building_limit_1 && fd.building_limit) fd.bop_building_limit_1 = fd.building_limit;
    if (!fd.bop_bpp_limit_1 && fd.bpp_limit) fd.bop_bpp_limit_1 = fd.bpp_limit;
    if (!fd.bop_property_deductible_1 && fd.property_deductible) fd.bop_property_deductible_1 = fd.property_deductible;
  }

  // ── Populate GL limits from cgl_limits object ──
  const cglLimits = fd.cgl_limits || {};
  if (cglLimits.general_aggregate && !fd.general_aggregate) fd.general_aggregate = String(cglLimits.general_aggregate);
  if (cglLimits.products_aggregate && !fd.products_aggregate) fd.products_aggregate = String(cglLimits.products_aggregate);
  if (cglLimits.each_occurrence && !fd.each_occurrence) fd.each_occurrence = String(cglLimits.each_occurrence);
  if (cglLimits.fire_damage && !fd.fire_damage) fd.fire_damage = String(cglLimits.fire_damage);
  if (cglLimits.medical_payments && !fd.medical_payments) fd.medical_payments = String(cglLimits.medical_payments);
  if (cglLimits.personal_adv_injury && !fd.personal_adv_injury) fd.personal_adv_injury = String(cglLimits.personal_adv_injury);

  // Also populate products_completed_ops_aggregate
  if (!fd.products_completed_ops_aggregate && fd.products_aggregate) fd.products_completed_ops_aggregate = fd.products_aggregate;

  // ── Auto-detect BOP from policy type or carrier patterns ──
  if (fd.lob_bop !== "true") {
    const policyType = String(fd.coverage_type || fd.nature_of_business || "").toLowerCase();
    const policyNumber = String(fd.policy_number || "").toUpperCase();
    if (policyType.includes("businessowners") || policyType.includes("bop") || policyNumber.startsWith("BO ") || policyNumber.startsWith("BO-")) {
      fd.lob_bop = "true";
    }
  }

  // ── Flatten vehicles[] → vehicle_N_* ──
  const vehicles: any[] = Array.isArray(fd.vehicles) ? fd.vehicles : [];
  vehicles.forEach((v: any, idx: number) => {
    const n = idx + 1;
    if (v.year && !fd[`vehicle_${n}_year`]) fd[`vehicle_${n}_year`] = String(v.year);
    if (v.make && !fd[`vehicle_${n}_make`]) fd[`vehicle_${n}_make`] = String(v.make);
    if (v.model && !fd[`vehicle_${n}_model`]) fd[`vehicle_${n}_model`] = String(v.model);
    if ((v.vin || v.VIN) && !fd[`vehicle_${n}_vin`]) fd[`vehicle_${n}_vin`] = String(v.vin || v.VIN);
    if ((v.body_type || v.bodyType || v.type) && !fd[`vehicle_${n}_body_type`])
      fd[`vehicle_${n}_body_type`] = String(v.body_type || v.bodyType || v.type);
    if ((v.stated_amount || v.cost_new) && !fd[`vehicle_${n}_stated_amount`])
      fd[`vehicle_${n}_stated_amount`] = String(v.stated_amount || v.cost_new);
    if ((v.garaging_zip || v.zip) && !fd[`vehicle_${n}_garaging_zip`])
      fd[`vehicle_${n}_garaging_zip`] = String(v.garaging_zip || v.zip);
    if ((v.gvw || v.gcw || v.gross_vehicle_weight) && !fd[`vehicle_${n}_gvw`])
      fd[`vehicle_${n}_gvw`] = String(v.gvw || v.gcw || v.gross_vehicle_weight);
    if ((v.comp_deductible || v.comprehensive_deductible) && !fd[`vehicle_${n}_comp_deductible`])
      fd[`vehicle_${n}_comp_deductible`] = String(v.comp_deductible || v.comprehensive_deductible);
    if ((v.coll_deductible || v.collision_deductible) && !fd[`vehicle_${n}_coll_deductible`])
      fd[`vehicle_${n}_coll_deductible`] = String(v.coll_deductible || v.collision_deductible);
  });
  if (vehicles.length > 0 && !fd.number_of_vehicles) fd.number_of_vehicles = String(vehicles.length);

  // Auto-classify vehicle body types from make/model
  for (let n = 1; n <= 15; n++) {
    const make = fd[`vehicle_${n}_make`] || "";
    const model = fd[`vehicle_${n}_model`] || "";
    if (!make && !model) break;
    if (!fd[`vehicle_${n}_body_type`]) {
      fd[`vehicle_${n}_body_type`] = classifyVehicleBodyType(make, model);
    }
  }

  // Flatten drivers[] → driver_N_*
  const drivers: any[] = Array.isArray(fd.drivers) ? fd.drivers : [];
  drivers.forEach((d: any, idx: number) => {
    const n = idx + 1;
    if (n > 13) return;
    if ((d.name || d.full_name) && !fd[`driver_${n}_name`])
      fd[`driver_${n}_name`] = String(d.name || d.full_name);
    if ((d.first_name) && !fd[`driver_${n}_first_name`])
      fd[`driver_${n}_first_name`] = String(d.first_name);
    if ((d.last_name) && !fd[`driver_${n}_last_name`])
      fd[`driver_${n}_last_name`] = String(d.last_name);
    if ((d.dob || d.date_of_birth) && !fd[`driver_${n}_dob`])
      fd[`driver_${n}_dob`] = String(d.dob || d.date_of_birth);
    if ((d.license || d.license_number || d.dl_number) && !fd[`driver_${n}_license`])
      fd[`driver_${n}_license`] = String(d.license || d.license_number || d.dl_number);
    if ((d.license_state || d.state) && !fd[`driver_${n}_license_state`])
      fd[`driver_${n}_license_state`] = String(d.license_state || d.state);
    if ((d.sex || d.gender) && !fd[`driver_${n}_sex`])
      fd[`driver_${n}_sex`] = String(d.sex || d.gender);
    if ((d.marital_status || d.marital) && !fd[`driver_${n}_marital`])
      fd[`driver_${n}_marital`] = String(d.marital_status || d.marital);
    if ((d.city) && !fd[`driver_${n}_city`])
      fd[`driver_${n}_city`] = String(d.city);
    if ((d.zip) && !fd[`driver_${n}_zip`])
      fd[`driver_${n}_zip`] = String(d.zip);
  });
  if (drivers.length > 0 && !fd.number_of_drivers) fd.number_of_drivers = String(drivers.length);

  // Regex fallback: recover NAIC from source text
  if (!fd.naic_code) {
    const naicMatch = sourceText.match(/\bNAIC\s*(?:CODE|#|NO\.?|NUMBER)?\s*[:\-]?\s*(\d{4,6})\b/i);
    if (naicMatch) fd.naic_code = naicMatch[1];
  }

  // Normalize business_type
  const BT_MAP: Record<string, string> = {
    "limited liability company": "LLC", "limit liability comp": "LLC", "llc": "LLC",
    "corporation": "Corporation", "corp": "Corporation",
    "s corporation": "S Corporation", "s corp": "S Corporation",
    "c corporation": "C Corporation", "c corp": "C Corporation",
    "partnership": "Partnership", "sole proprietor": "Sole Proprietor",
    "sole proprietorship": "Sole Proprietor", "joint venture": "Joint Venture",
    "trust": "Trust", "not for profit": "Not For Profit",
    "non-profit": "Not For Profit", "nonprofit": "Not For Profit",
    "individual": "Individual", "subchapter s corporation": "Subchapter S Corporation",
  };
  if (fd.business_type) {
    const btLower = String(fd.business_type).trim().toLowerCase();
    if (BT_MAP[btLower]) {
      fd.business_type = BT_MAP[btLower];
    } else {
      const entityKw = ["llc", "corp", "partnership", "proprietor", "venture", "trust", "individual", "liability"];
      if (!entityKw.some(kw => btLower.includes(kw)) && !fd.nature_of_business) {
        fd.nature_of_business = fd.business_type;
        fd.business_type = "";
      }
    }
  }

  // Auto-detect occurrence vs claims-made
  if (fd.lob_gl === "true" || fd.lob_commercial_general_liability === "true" || fd.chk_commercial_general_liability === "true" || fd.lob_bop === "true") {
    if (fd.chk_occurrence !== "true" && fd.chk_claims_made !== "true") {
      if (fd.retroactive_date || fd.entry_date_claims_made) fd.chk_claims_made = "true";
      else fd.chk_occurrence = "true";
    }
  }

  // Auto-set aggregate applies per
  if (!fd.aggregate_applies_per && (fd.chk_limit_policy === "true" || fd.chk_limit_project === "true" || fd.chk_limit_location === "true")) {
    if (fd.chk_limit_policy === "true") fd.aggregate_applies_per = "Policy";
    else if (fd.chk_limit_project === "true") fd.aggregate_applies_per = "Project";
    else if (fd.chk_limit_location === "true") fd.aggregate_applies_per = "Location";
  }
  if ((fd.lob_gl === "true" || fd.lob_bop === "true") && fd.chk_limit_policy !== "true" && fd.chk_limit_project !== "true" && fd.chk_limit_location !== "true") {
    fd.chk_limit_policy = "true";
    if (!fd.aggregate_applies_per) fd.aggregate_applies_per = "Policy";
  }

  // Infer entity type from company name
  if (!fd.business_type && fd.applicant_name) {
    const name = String(fd.applicant_name).trim();
    if (/\bLLC\b/i.test(name)) fd.business_type = "LLC";
    else if (/\bInc\.?\b/i.test(name)) fd.business_type = "Corporation";
    else if (/\bCorp\.?\b/i.test(name)) fd.business_type = "Corporation";
    else if (/\bLLP\b/i.test(name)) fd.business_type = "Partnership";
    else if (/\bLP\b/i.test(name)) fd.business_type = "Partnership";
  }

  // ── Auto-set GL flag if GL limits are present from BOP ──
  if (fd.each_occurrence && fd.general_aggregate && fd.lob_gl !== "true") {
    fd.lob_gl = "true";
    fd.lob_commercial_general_liability = "true";
    fd.chk_commercial_general_liability = "true";
  }

  // ── Populate current_carrier / current_premium from BOP if not set ──
  if (!fd.current_carrier && fd.bop_carrier) fd.current_carrier = fd.bop_carrier;
  if (!fd.current_premium && fd.bop_premium) fd.current_premium = fd.bop_premium;
  if (!fd.current_premium && fd.policy_total_premium) fd.current_premium = fd.policy_total_premium;
  if (!fd.total_premium && fd.policy_total_premium) fd.total_premium = fd.policy_total_premium;
}

// ═══════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const hasPdfs = Array.isArray(pdf_files) && pdf_files.length > 0;
    const additionalContext = `${description || ""}${file_contents ? `\n${file_contents}` : ""}`;

    const t0 = Date.now();
    let extracted: any;
    let pipelineUsed = "unknown";

    // ────────────────────────────────────────────────
    //  PDF PIPELINE — Gemini Native PDF Vision
    // ────────────────────────────────────────────────
    if (hasPdfs) {
      pipelineUsed = "gemini-native-pdf";
      console.log(`[pipeline] Starting Gemini native PDF extraction (${pdf_files.length} file(s))`);

      // ── Step 0: Prepare PDFs and run prescan for large documents ──
      const truncatedFiles: any[] = [];
      let totalPages = 0;

      for (const pf of pdf_files) {
        if (!pf.base64) continue;
        if (totalPages >= MAX_TOTAL_PAGES) {
          console.log(`[pipeline] Page budget exhausted (${totalPages}/${MAX_TOTAL_PAGES}), skipping remaining files`);
          break;
        }

        const mimeType = pf.mimeType || "application/pdf";
        const remainingBudget = MAX_TOTAL_PAGES - totalPages;

        if (mimeType === "application/pdf") {
          let pages = 0;
          try {
            const tmpBytes = Uint8Array.from(atob(pf.base64), c => c.charCodeAt(0));
            const tmpDoc = await PDFDocument.load(tmpBytes, { ignoreEncryption: true });
            pages = tmpDoc.getPageCount();
          } catch (_) { pages = 1; }

          const cappedPages = Math.min(pages, remainingBudget);

          // ── PRESCAN: For large PDFs, identify data-rich pages first ──
          if (pages > PRESCAN_THRESHOLD) {
            console.log(`[prescan] Document has ${pages} pages (>${PRESCAN_THRESHOLD}), running prescan...`);
            // First truncate to budget for prescan
            const prescanBase64 = pages > MAX_TOTAL_PAGES
              ? await truncatePdf(pf.base64, MAX_TOTAL_PAGES)
              : pf.base64;
            const prescanPageCount = Math.min(pages, MAX_TOTAL_PAGES);

            const dataPages = await prescanForDataPages(
              LOVABLE_API_KEY,
              prescanBase64,
              prescanPageCount,
              PRESCAN_TARGET_PAGES,
            );

            if (dataPages.length > 0) {
              // Extract only the identified data-rich pages
              const slicedBase64 = await extractSpecificPages(
                pages > MAX_TOTAL_PAGES ? prescanBase64 : pf.base64,
                dataPages,
              );
              truncatedFiles.push({ base64: slicedBase64, mimeType });
              totalPages += dataPages.length;
              console.log(`[prescan] Sending ${dataPages.length} data-rich pages (from ${pages} total) to extraction`);
            } else {
              // Prescan returned nothing — fallback to truncated
              console.log(`[prescan] No pages identified, falling back to first ${cappedPages} pages`);
              const truncated = await truncatePdf(pf.base64, cappedPages);
              truncatedFiles.push({ base64: truncated, mimeType });
              totalPages += cappedPages;
            }
          } else {
            // Small PDF — no prescan needed
            const truncated = cappedPages < pages
              ? await truncatePdf(pf.base64, cappedPages)
              : pf.base64;
            truncatedFiles.push({ base64: truncated, mimeType });
            totalPages += cappedPages;
          }
        } else {
          truncatedFiles.push({ base64: pf.base64, mimeType });
          totalPages += 1;
        }
      }

      console.log(`[pipeline] Processing ${truncatedFiles.length} files, ~${totalPages} total pages (after prescan)`);

      // Stage 1: Gemini Flash
      try {
        const flashRaw = await callGeminiWithPdfs(
          LOVABLE_API_KEY,
          SCHEMA_PROMPT,
          `Extract all insurance data from the attached PDF document(s). IMPORTANT: Focus on DECLARATIONS PAGES first — these contain insured-specific data (limits, premiums, deductibles, locations, endorsements). SKIP standard policy form language (e.g. "BUSINESSOWNERS COVERAGE FORM" boilerplate, privacy notices) as they contain no insured-specific data. Extract ALL BOP property limits, GL limits, EPLI, cyber coverages, mortgagee/additional interest info, producer/agency details, endorsement form numbers, and location-indexed data.${additionalContext ? `\n\nAdditional context:\n${additionalContext}` : ""}`,
          truncatedFiles,
          "google/gemini-2.5-flash",
        );
        extracted = parseAiJson(flashRaw);
        const flashCount = countMeaningfulFields(extracted.form_data || {});
        console.log(`[pipeline] Gemini Flash extracted ${flashCount} meaningful fields`);

        // Stage 2: Escalate to Pro if low confidence
        if (flashCount < CONFIDENCE_THRESHOLD) {
          console.log(`[pipeline] Low confidence (${flashCount}), escalating to Gemini Pro...`);
          try {
            const proRaw = await callGeminiWithPdfs(
              LOVABLE_API_KEY,
              SCHEMA_PROMPT,
               `Extract all insurance data from the attached PDF document(s). IMPORTANT: Focus on DECLARATIONS PAGES first — these contain insured-specific data (limits, premiums, deductibles, locations, endorsements). SKIP standard policy form language boilerplate. Extract ALL BOP property limits, GL limits, EPLI, cyber coverages, mortgagee/additional interest info, producer/agency details, endorsement form numbers, and location-indexed data.${additionalContext ? `\n\nAdditional context:\n${additionalContext}` : ""}`,
              truncatedFiles,
              "google/gemini-2.5-pro",
            );
            const proExtracted = parseAiJson(proRaw);
            const proCount = countMeaningfulFields(proExtracted.form_data || {});
            console.log(`[pipeline] Gemini Pro extracted ${proCount} fields`);
            if (proCount > flashCount) {
              extracted = proExtracted;
              pipelineUsed = "gemini-native-pdf-pro";
            }
          } catch (proErr) {
            console.warn("[pipeline] Pro escalation failed:", proErr);
          }
        }

        // Stage 3: Claude Opus specialist if still low
        const currentCount = countMeaningfulFields(extracted.form_data || {});
        if (currentCount < CONFIDENCE_THRESHOLD && ANTHROPIC_API_KEY) {
          console.log(`[pipeline] Still low confidence (${currentCount}), invoking Claude Opus specialist`);
          try {
            const claudeRaw = await callClaudeOpus(
              ANTHROPIC_API_KEY,
              truncatedFiles,
              extracted.form_data || {},
              additionalContext,
            );
            const claudeExtracted = parseAiJson(claudeRaw);
            const claudeCount = countMeaningfulFields(claudeExtracted.form_data || {});
            console.log(`[pipeline] Claude Opus extracted ${claudeCount} fields`);
            if (claudeCount > currentCount) {
              extracted = claudeExtracted;
              pipelineUsed = "gemini-native+opus";
            }
          } catch (claudeErr) {
            console.warn("[pipeline] Claude Opus specialist failed:", claudeErr);
          }
        }
      } catch (flashErr) {
        console.error("[pipeline] Gemini Flash failed, trying Pro directly:", flashErr);
        // Fallback: try Pro directly
        try {
          const proRaw = await callGeminiWithPdfs(
            LOVABLE_API_KEY,
            SCHEMA_PROMPT,
            `Extract all insurance data from the attached PDF document(s). Focus on DECLARATIONS PAGES. SKIP policy form boilerplate. Extract ALL BOP property limits, GL limits, EPLI, cyber coverages, mortgagee info, producer details, endorsement form numbers, and location-indexed data.${additionalContext ? `\n\nAdditional context:\n${additionalContext}` : ""}`,
            truncatedFiles,
            "google/gemini-2.5-pro",
          );
          extracted = parseAiJson(proRaw);
          pipelineUsed = "gemini-native-pdf-pro-fallback";
        } catch (proErr) {
          console.error("[pipeline] Both Gemini Flash and Pro failed:", proErr);
          throw proErr;
        }
      }
    }
    // ────────────────────────────────────────────────
    //  TEXT-ONLY PIPELINE
    // ────────────────────────────────────────────────
    else {
      pipelineUsed = "text-only";
      console.log(`[pipeline] Using text-only path`);
      const raw = await callGeminiFlash(LOVABLE_API_KEY, additionalContext, "");
      extracted = parseAiJson(raw);
    }

    const totalTime = Date.now() - t0;
    console.log(`[pipeline] ${pipelineUsed} completed in ${totalTime}ms`);

    // ── Post-processing ──
    const fd: Record<string, any> = extracted.form_data || {};
    postProcess(fd, additionalContext, hasPdfs);
    extracted.form_data = fd;

    // Debug log
    const fdKeys = Object.entries(fd).filter(([_, v]) => v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]");
    console.log(`[result] ${fdKeys.length} non-empty fields. pipeline=${pipelineUsed}, time=${totalTime}ms. Key: applicant_name="${fd.applicant_name}", city="${fd.city}", state="${fd.state}"`);

    // Save to database
    if (submission_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: submission, error: subError } = await supabase
        .from("business_submissions")
        .select("user_id")
        .eq("id", submission_id)
        .single();

      if (subError) {
        console.error("[db] Failed to fetch submission:", subError);
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
          console.error("[db] Insert FAILED:", insertError);
        } else {
          console.log(`[db] Insert SUCCESS: id=${insertData?.id}, fields=${fdKeys.length}, pipeline=${pipelineUsed}`);
        }

        await supabase
          .from("business_submissions")
          .update({ status: "extracted" })
          .eq("id", submission_id);
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("extract error:", e);
    const errMsg = e?.message || "";
    let userError = "An error occurred processing your request";
    let statusCode = 500;

    if (errMsg.includes("Rate limited")) {
      userError = "AI service is rate limited. Please try again in a moment.";
      statusCode = 429;
    } else if (errMsg.includes("AI credits exhausted")) {
      userError = "AI credits have been exhausted. Please check your plan.";
      statusCode = 402;
    }

    return new Response(
      JSON.stringify({ error: userError }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
