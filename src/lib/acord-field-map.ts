/**
 * Maps our internal field keys to the AcroForm PDF field names
 * embedded in the official fillable ACORD PDFs.
 *
 * Discovered by inspecting the PDFs with pdf-lib's getForm().getFields().
 * Each entry: [ourKey]: "PDF AcroForm field name"
 *
 * Note: We use a best-effort mapping. Unknown field names are auto-detected
 * at runtime via substring matching against the PDF's actual field list.
 */

export type AcordFieldMap = Record<string, string>;

/** ACORD 125 — Commercial Insurance Application */
export const ACORD_125_FIELD_MAP: AcordFieldMap = {
  agency_name: "AGENCY",
  agency_phone: "PHONE\\nA\\/C No Ext",
  agency_fax: "FAX\\nA\\/C No",
  agency_email: "EMAIL ADDRESS",
  agency_customer_id: "AGENCY CUSTOMER ID",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  contact_name: "CONTACT NAME",
  transaction_date: "DATE",
  proposed_eff_date: "PROPOSED EFF DATE",
  proposed_exp_date: "PROPOSED EXP DATE",
  billing_plan: "BILL PLAN",
  payment_plan: "PAYMENT PLAN",
  policy_premium: "TOTAL PREMIUM",
  applicant_name: "APPLICANT",
  mailing_address: "MAILING ADDRESS",
  city: "CITY",
  state: "STATE",
  zip: "ZIP CODE",
  fein: "FEIN OR SOC SEC",
  business_phone: "BUSINESS PHONE",
  website: "WEBSITE ADDRESS",
  business_type: "BUSINESS TYPE",
  annual_revenues: "ANNUAL REVENUES",
  description_of_operations: "DESCRIPTION OF PRIMARY OPERATIONS",
  remarks: "REMARKS",
  producer_name: "PRODUCERS NAME",
};

/** ACORD 126 — Commercial General Liability Section */
export const ACORD_126_FIELD_MAP: AcordFieldMap = {
  agency_name: "AGENCY",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",
  general_aggregate: "GENERAL AGGREGATE",
  each_occurrence: "EACH OCCURRENCE",
  products_aggregate: "PRODUCTS - COMP\\/OP AGG",
  personal_adv_injury: "PERSONAL & ADV INJURY",
  fire_damage: "FIRE DAMAGE",
  medical_payments: "MED EXP",
  coverage_type: "OCCURRENCE",
};

/** ACORD 127 — Business Auto Section */
export const ACORD_127_FIELD_MAP: AcordFieldMap = {
  agency_name: "AGENCY",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",
};

/** ACORD 130 — Workers Compensation Application */
export const ACORD_130_FIELD_MAP: AcordFieldMap = {
  agency_name: "AGENCY",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",
  applicant_name: "APPLICANT",
  mailing_address: "MAILING ADDRESS",
  city: "CITY",
  state: "STATE",
  zip: "ZIP CODE",
  fein: "FEIN",
  business_phone: "BUSINESS PHONE",
  annual_revenues: "ANNUAL REVENUES",
  full_time_employees: "FULL TIME EMPLOYEES",
  description_of_operations: "DESCRIPTION",
};

/** ACORD 131 — Umbrella / Excess Liability Section */
export const ACORD_131_FIELD_MAP: AcordFieldMap = {
  agency_name: "AGENCY",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",
};

/** ACORD 140 — Property Section */
export const ACORD_140_FIELD_MAP: AcordFieldMap = {
  agency_name: "AGENCY",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",
  applicant_name: "APPLICANT",
  premises_address: "LOCATION ADDRESS",
  premises_city: "CITY",
  premises_state: "STATE",
  premises_zip: "ZIP",
};

export const ACORD_FIELD_MAPS: Record<string, AcordFieldMap> = {
  "acord-125": ACORD_125_FIELD_MAP,
  "acord-126": ACORD_126_FIELD_MAP,
  "acord-127": ACORD_127_FIELD_MAP,
  "acord-130": ACORD_130_FIELD_MAP,
  "acord-131": ACORD_131_FIELD_MAP,
  "acord-140": ACORD_140_FIELD_MAP,
};

/** Paths to the fillable PDFs in /public/acord-fillable/ */
export const FILLABLE_PDF_PATHS: Record<string, string> = {
  "acord-125": "/acord-fillable/125.pdf",
  "acord-126": "/acord-fillable/126.pdf",
  "acord-127": "/acord-fillable/127.pdf",
  "acord-130": "/acord-fillable/130.pdf",
  "acord-131": "/acord-fillable/131.pdf",
  "acord-140": "/acord-fillable/140.pdf",
};
