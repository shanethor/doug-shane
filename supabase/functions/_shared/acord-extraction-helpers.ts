// supabase/functions/_shared/acord-extraction-helpers.ts

// Large-file ACORD extraction helpers for AURA
// Fixes: page slicing, doc type detection, typed prompts, retry logic, formdata mapping

export const LARGE_PDF_CONFIG = {
  MAX_PAGES_DIRECT: 20,
  DEC_PAGE_SLICE: 10,
  LOW_CONFIDENCE_THRESHOLD: 0.5,
  GEMINI_MODEL: "gemini-2.0-flash",
  MAX_OUTPUT_TOKENS: 8192,
} as const;

export type AcordDocType =
  | "BOP"
  | "ACORD_127"
  | "ACORD_130"
  | "UMBRELLA"
  | "GL"
  | "PROPERTY"
  | "DEC_PAGE"
  | "LOSS_RUN"
  | "UNKNOWN";

export function detectDocType(firstPageText: string): AcordDocType {
  const t = firstPageText.toUpperCase();

  if (
    t.includes("BUSINESSOWNERS") ||
    t.includes("BUSINESS OWNERS") ||
    t.includes("BOP") ||
    /\bBO\s+\d{5,}/.test(t)
  ) return "BOP";

  if (
    t.includes("BUSINESS AUTO") ||
    t.includes("COMMERCIAL AUTO") ||
    t.includes("ACORD 127") ||
    t.includes("DRIVER INFORMATION")
  ) return "ACORD_127";

  if (
    t.includes("WORKERS COMPENSATION") ||
    t.includes("WORKERS COMP") ||
    t.includes("ACORD 130") ||
    t.includes("WC POLICY") ||
    t.includes("CLASS CODE")
  ) return "ACORD_130";

  if (
    t.includes("UMBRELLA") ||
    t.includes("EXCESS LIABILITY") ||
    t.includes("SCHEDULE OF UNDERLYING")
  ) return "UMBRELLA";

  if (t.includes("GENERAL LIABILITY") && !t.includes("BUSINESSOWNERS")) return "GL";

  if (t.includes("COMMERCIAL PROPERTY") || t.includes("BUILDING AND PERSONAL")) return "PROPERTY";

  if (t.includes("LOSS RUN") || t.includes("LOSS HISTORY") || t.includes("CLAIM SUMMARY")) return "LOSS_RUN";

  if (
    t.includes("DECLARATIONS") ||
    t.includes("DECLARATION PAGE") ||
    t.includes("POLICY NUMBER") ||
    t.includes("NAMED INSURED")
  ) return "DEC_PAGE";

  return "UNKNOWN";
}

export const GEMINI_SYSTEM_PROMPT = `You are an expert insurance document parser for a commercial lines insurance agency management system.

Extract data into STRICT JSON that exactly matches the provided schema.

Rules:
- Return ONLY the JSON object — no prose, no markdown fences.
- If a field is not present in the document, set it to null.
- Never invent data. Only extract what is explicitly stated.
- Normalize dates to ISO format (YYYY-MM-DD).
- Normalize dollar amounts to numbers (no $ or commas): 1000000 not "$1,000,000".
- For limits expressed as "X per occurrence / Y aggregate", use the per-occurrence value for limit fields and aggregate for aggregate fields.`;

export function buildGeminiPrompt(docType: AcordDocType): string {
  switch (docType) {
    case "BOP":
      return `
The attached document is a Businessowners Policy (BOP) declarations page or complete policy packet.
Focus on the DECLARATION PAGE(S) — typically the first 3-5 pages with the policy header.
Extract ALL fields below into the JSON schema.

JSON Schema:
{
  "policy": {
    "policy_number": "string",
    "policy_type": "string",
    "policy_effective_date": "YYYY-MM-DD",
    "policy_expiration_date": "YYYY-MM-DD",
    "total_annual_premium": number,
    "terrorism_premium": number | null,
    "billing_method": "string | null"
  },
  "carrier": {
    "carrier_name": "string",
    "carrier_group": "string | null",
    "naic_code": "string | null",
    "carrier_address": "string | null"
  },
  "insured": {
    "applicant_name": "string",
    "mailing_address": "string",
    "mailing_city": "string",
    "mailing_state": "string",
    "mailing_zip": "string",
    "legal_entity": "string",
    "business_description": "string | null"
  },
  "producer": {
    "producer_name": "string | null",
    "producer_address": "string | null",
    "producer_city": "string | null",
    "producer_state": "string | null",
    "producer_zip": "string | null",
    "producer_phone": "string | null",
    "agency_code": "string | null"
  },
  "locations": [
    {
      "prem_number": "string",
      "bldg_number": "string",
      "address": "string",
      "city": "string",
      "state": "string",
      "zip": "string",
      "occupancy": "string | null",
      "building_limit": number | null,
      "bpp_limit": number | null,
      "property_deductible": number | null,
      "glass_deductible": number | null,
      "valuation": "string | null",
      "coinsurance_percent": number | null,
      "auto_increase_percent": number | null,
      "blanket_basis": "boolean | null"
    }
  ],
  "liability": {
    "each_occurrence_limit": number | null,
    "general_aggregate_limit": number | null,
    "products_completed_ops_aggregate": number | null,
    "medical_expense_limit": number | null,
    "damage_to_premises_rented_limit": number | null,
    "hired_non_owned_auto_included": "boolean",
    "professional_liability_included": "boolean"
  },
  "epli": {
    "each_claim_limit": number | null,
    "aggregate_limit": number | null,
    "deductible": number | null,
    "retro_date": "YYYY-MM-DD | null"
  },
  "cyber": {
    "retro_date": "YYYY-MM-DD | null",
    "annual_aggregate_limit": number | null,
    "multimedia_liability_limit": number | null,
    "security_privacy_liability_limit": number | null,
    "regulatory_defense_limit": number | null,
    "pci_dss_limit": number | null,
    "breach_response_limit": number | null,
    "network_asset_limit": number | null,
    "cyber_extortion_limit": number | null,
    "cyber_terrorism_limit": number | null,
    "brand_guard_limit": number | null,
    "boid_theft_limit": number | null
  },
  "additional_interests": [
    {
      "name": "string",
      "address": "string | null",
      "city": "string | null",
      "state": "string | null",
      "zip": "string | null",
      "interest_type": "string",
      "property_description": "string | null",
      "provision": "string | null"
    }
  ],
  "endorsements": ["string"],
  "confidence": number
}`;

    case "ACORD_127":
      return `
The attached document is an ACORD 127 Business Auto application or declarations page.
Extract ALL fields below.

JSON Schema:
{
  "policy": {
    "policy_number": "string | null",
    "policy_effective_date": "YYYY-MM-DD | null",
    "policy_expiration_date": "YYYY-MM-DD | null",
    "total_annual_premium": number | null
  },
  "carrier": { "carrier_name": "string | null", "naic_code": "string | null" },
  "insured": {
    "applicant_name": "string | null",
    "mailing_address": "string | null",
    "mailing_city": "string | null",
    "mailing_state": "string | null",
    "mailing_zip": "string | null",
    "business_description": "string | null"
  },
  "auto_liability": {
    "any_auto": "boolean",
    "combined_single_limit": number | null,
    "bodily_injury_per_person": number | null,
    "bodily_injury_per_accident": number | null,
    "property_damage_limit": number | null,
    "uninsured_motorist_limit": number | null,
    "pip_limit": number | null,
    "medical_payments_limit": number | null
  },
  "vehicles": [
    {
      "vin": "string | null",
      "year": "string | null",
      "make": "string | null",
      "model": "string | null",
      "body_type": "string | null",
      "collision_deductible": number | null,
      "comp_deductible": number | null,
      "total_premium": number | null
    }
  ],
  "drivers": [
    {
      "name": "string",
      "date_of_birth": "YYYY-MM-DD | null",
      "sex": "string | null",
      "license_number": "string | null",
      "license_state": "string | null"
    }
  ],
  "confidence": number
}`;

    case "ACORD_130":
      return `
The attached document is a Workers Compensation declarations page or ACORD 130 application.
Extract ALL fields below.

JSON Schema:
{
  "policy": {
    "policy_number": "string | null",
    "policy_effective_date": "YYYY-MM-DD | null",
    "policy_expiration_date": "YYYY-MM-DD | null",
    "total_annual_premium": number | null
  },
  "carrier": { "carrier_name": "string | null", "naic_code": "string | null" },
  "insured": {
    "applicant_name": "string | null",
    "mailing_address": "string | null",
    "mailing_city": "string | null",
    "mailing_state": "string | null",
    "mailing_zip": "string | null",
    "fein": "string | null"
  },
  "employers_liability": {
    "each_accident_limit": number | null,
    "disease_each_employee_limit": number | null,
    "disease_policy_limit": number | null
  },
  "states": ["string"],
  "class_codes": [
    {
      "code": "string",
      "description": "string | null",
      "payroll": number | null,
      "rate": number | null,
      "estimated_premium": number | null,
      "state": "string | null"
    }
  ],
  "confidence": number
}`;

    default:
      return `
The attached document is an insurance declarations page or policy document.
Extract all available policy, insured, producer, coverage, and premium information into JSON.

JSON Schema:
{
  "policy_number": "string | null",
  "policy_type": "string | null",
  "carrier_name": "string | null",
  "policy_effective_date": "YYYY-MM-DD | null",
  "policy_expiration_date": "YYYY-MM-DD | null",
  "total_annual_premium": number | null,
  "applicant_name": "string | null",
  "mailing_address": "string | null",
  "mailing_city": "string | null",
  "mailing_state": "string | null",
  "mailing_zip": "string | null",
  "legal_entity": "string | null",
  "business_description": "string | null",
  "producer_name": "string | null",
  "producer_phone": "string | null",
  "coverages": {},
  "confidence": number
}`;
  }
}

export async function extractPageRange(
  pdfBytes: Uint8Array,
  startPage: number,
  endPage: number
): Promise<Uint8Array> {
  const { PDFDocument } = await import("https://esm.sh/pdf-lib@1.17.1");
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  const safeEnd = Math.min(endPage, totalPages);
  const safeStart = Math.max(startPage - 1, 0);

  const newDoc = await PDFDocument.create();
  const pageIndices = Array.from({ length: safeEnd - safeStart }, (_, i) => safeStart + i);
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page: unknown) => newDoc.addPage(page as any));

  return await newDoc.save();
}

export function mapBopExtractionToFormData(
  extracted: Record<string, any>
): Record<string, string | number | boolean | null> {
  const policy = extracted.policy ?? {};
  const carrier = extracted.carrier ?? {};
  const insured = extracted.insured ?? {};
  const producer = extracted.producer ?? {};
  const locations: any[] = extracted.locations ?? [];
  const liability = extracted.liability ?? {};
  const epli = extracted.epli ?? {};
  const cyber = extracted.cyber ?? {};
  const interests: any[] = extracted.additional_interests ?? [];
  const endorsements: string[] = extracted.endorsements ?? [];

  const loc1 = locations[0] ?? {};
  const mort1 = interests.find((i) => i.interest_type?.toLowerCase().includes("mortgag")) ?? {};

  return {
    policy_number:              policy.policy_number ?? null,
    policy_type:                policy.policy_type ?? "Businessowners",
    policy_effective_date:      policy.policy_effective_date ?? null,
    policy_expiration_date:     policy.policy_expiration_date ?? null,
    total_annual_premium:       policy.total_annual_premium ?? null,
    terrorism_premium:          policy.terrorism_premium ?? null,
    billing_method:             policy.billing_method ?? null,

    carrier_name:               carrier.carrier_name ?? null,
    carrier_group:              carrier.carrier_group ?? null,
    carrier_naic:               carrier.naic_code ?? null,

    applicant_name:             insured.applicant_name ?? null,
    mailing_address:            insured.mailing_address ?? null,
    mailing_city:               insured.mailing_city ?? null,
    mailing_state:              insured.mailing_state ?? null,
    mailing_zip:                insured.mailing_zip ?? null,
    legal_entity:               insured.legal_entity ?? null,
    business_description:       insured.business_description ?? null,

    producer_name:              producer.producer_name ?? null,
    producer_address:           producer.producer_address ?? null,
    producer_city:              producer.producer_city ?? null,
    producer_state:             producer.producer_state ?? null,
    producer_zip:               producer.producer_zip ?? null,
    producer_phone:             producer.producer_phone ?? null,
    agency_code:                producer.agency_code ?? null,

    location_1_number:          loc1.prem_number ?? null,
    location_1_building_number: loc1.bldg_number ?? null,
    location_1_address:         loc1.address ?? null,
    location_1_city:            loc1.city ?? null,
    location_1_state:           loc1.state ?? null,
    location_1_zip:             loc1.zip ?? null,
    location_1_occupancy:       loc1.occupancy ?? null,
    bop_building_limit_1:       loc1.building_limit ?? null,
    bop_bpp_limit_1:            loc1.bpp_limit ?? null,
    bop_property_deductible_1:  loc1.property_deductible ?? null,
    bop_glass_deductible_1:     loc1.glass_deductible ?? null,
    bop_valuation_1:            loc1.valuation ?? null,
    bop_coinsurance_1:          loc1.coinsurance_percent ?? null,
    bop_auto_increase_percent_1: loc1.auto_increase_percent ?? null,

    gl_each_occurrence_limit:               liability.each_occurrence_limit ?? null,
    gl_general_aggregate_limit:             liability.general_aggregate_limit ?? null,
    gl_products_completed_operations_aggregate: liability.products_completed_ops_aggregate ?? null,
    gl_medical_expense_any_one_person_limit: liability.medical_expense_limit ?? null,
    gl_damage_to_premises_rented_limit:     liability.damage_to_premises_rented_limit ?? null,
    hired_non_owned_auto_included:          liability.hired_non_owned_auto_included ?? false,

    epli_each_claim_limit:  epli.each_claim_limit ?? null,
    epli_aggregate_limit:   epli.aggregate_limit ?? null,
    epli_deductible:        epli.deductible ?? null,
    epli_retro_date:        epli.retro_date ?? null,

    cyber_retro_date:                        cyber.retro_date ?? null,
    cyber_aggregate_limit:                   cyber.annual_aggregate_limit ?? null,
    cyber_multimedia_liability_limit:         cyber.multimedia_liability_limit ?? null,
    cyber_security_privacy_liability_limit:   cyber.security_privacy_liability_limit ?? null,
    cyber_regulatory_defense_limit:           cyber.regulatory_defense_limit ?? null,
    cyber_pci_dss_limit:                      cyber.pci_dss_limit ?? null,
    cyber_breach_response_limit:              cyber.breach_response_limit ?? null,
    cyber_network_asset_limit:                cyber.network_asset_limit ?? null,
    cyber_extortion_limit:                    cyber.cyber_extortion_limit ?? null,
    cyber_terrorism_limit:                    cyber.cyber_terrorism_limit ?? null,
    cyber_brand_guard_limit:                  cyber.brand_guard_limit ?? null,
    cyber_boid_theft_limit:                   cyber.boid_theft_limit ?? null,

    mortgagee_1_name:           mort1.name ?? null,
    mortgagee_1_address:        mort1.address ?? null,
    mortgagee_1_city:           mort1.city ?? null,
    mortgagee_1_state:          mort1.state ?? null,
    mortgagee_1_zip:            mort1.zip ?? null,
    mortgagee_1_type:           mort1.interest_type ?? null,
    mortgagee_1_provision:      mort1.provision ?? null,

    endorsements_list:          endorsements.join(", ") || null,

    line_bop:      true,
    line_gl:       !!(liability.each_occurrence_limit),
    line_property: !!(loc1.building_limit || loc1.bpp_limit),
    line_cyber:    !!(cyber.annual_aggregate_limit),
    line_epli:     !!(epli.each_claim_limit),
  };
}