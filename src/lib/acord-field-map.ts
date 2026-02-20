/**
 * Maps our internal field keys to the AcroForm PDF field names
 * embedded in the official fillable ACORD PDFs.
 *
 * Discovered by inspecting the PDFs with pdf-lib's getForm().getFields()
 * and cross-referencing ACORD standard PDF naming conventions.
 * Each entry: [ourKey]: "PDF AcroForm field name"
 *
 * Note: We use a best-effort mapping. Unknown field names are auto-detected
 * at runtime via substring matching against the PDF's actual field list.
 */

export type AcordFieldMap = Record<string, string>;

/** ACORD 125 — Commercial Insurance Application */
export const ACORD_125_FIELD_MAP: AcordFieldMap = {
  // Agency Information
  agency_name: "AGENCY",
  agency_phone: "PHONE\\nA\\/C No Ext",
  agency_fax: "FAX\\nA\\/C No",
  agency_email: "EMAIL ADDRESS",
  agency_customer_id: "AGENCY CUSTOMER ID",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  company_program_name: "COMPANY\\/POLICY OR PROGRAM NAME",
  program_code: "PROGRAM CODE",
  policy_number: "POLICY NUMBER",
  contact_name: "CONTACT NAME",
  underwriter: "UNDERWRITER",
  underwriter_office: "UNDERWRITER OFFICE",
  transaction_date: "DATE",

  // Policy Information
  proposed_eff_date: "PROPOSED EFF DATE",
  proposed_exp_date: "PROPOSED EXP DATE",
  billing_plan: "BILL PLAN",
  payment_plan: "PAYMENT PLAN",
  method_of_payment: "METHOD OF PAYMENT",
  audit: "AUDIT",
  deposit_amount: "DEPOSIT",
  minimum_premium: "MINIMUM PREMIUM",
  policy_premium: "TOTAL PREMIUM",

  // Applicant Information
  applicant_name: "APPLICANT",
  mailing_address: "MAILING ADDRESS",
  city: "CITY",
  state: "STATE",
  zip: "ZIP CODE",
  gl_code: "GL CODE",
  sic_code: "SIC",
  naics_code: "NAICS",
  fein: "FEIN OR SOC SEC",
  business_phone: "BUSINESS PHONE",
  website: "WEBSITE ADDRESS",
  business_type: "BUSINESS TYPE",
  llc_members_managers: "LLC NO",

  // Other Named Insured
  other_named_insured: "OTHER NAMED INSURED",

  // Contact Information
  contact_name_1: "CONTACT NAME 1",
  contact_phone_1: "PRIMARY PHONE",
  contact_email_1: "PRIMARY E-MAIL",

  // Premises Information
  premises_address: "STREET ADDRESS",
  premises_city: "PREMISES CITY",
  premises_state: "PREMISES STATE",
  premises_zip: "PREMISES ZIP",
  full_time_employees: "FULL TIME",
  part_time_employees: "PART TIME",
  premises_description: "DESCRIPTION OF OPERATIONS",

  // Nature of Business
  annual_revenues: "ANNUAL REVENUES",
  occupied_sq_ft: "OCCUPIED AREA",
  total_building_sq_ft: "TOTAL BUILDING AREA",
  date_business_started: "DATE BUSINESS STARTED",
  description_of_operations: "DESCRIPTION OF PRIMARY OPERATIONS",

  // General Information (Yes/No questions mapped to closest PDF field names)
  subsidiary_of_another: "1A YES",
  has_subsidiaries: "1B YES",
  safety_program: "2 YES",
  exposure_flammables: "3 YES",
  other_insurance_same_company: "4 YES",
  policy_declined_cancelled: "5 YES",
  past_sexual_abuse_claims: "6 YES",
  fraud_conviction: "7 YES",
  fire_safety_violations: "8 YES",
  bankruptcy: "9 YES",
  judgement_or_lien: "10 YES",
  business_in_trust: "11 YES",
  foreign_operations: "12 YES",
  other_business_ventures: "13 YES",
  operates_drones: "14 YES",
  hires_drone_operators: "15 YES",
  general_info_remarks: "EXPLAIN ALL YES RESPONSES",

  // Remarks
  remarks: "REMARKS",

  // Prior Carrier
  prior_carrier_1: "PRIOR CARRIER 1",
  prior_policy_number_1: "PRIOR POLICY NUMBER 1",
  prior_eff_date_1: "PRIOR EFF DATE 1",
  prior_exp_date_1: "PRIOR EXP DATE 1",

  // Loss History
  loss_history: "LOSS HISTORY",

  // Signature
  producer_name: "PRODUCERS NAME",
  producer_license_no: "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date: "SIGNATURE DATE",
};

/** ACORD 126 — Commercial General Liability Section */
export const ACORD_126_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name: "AGENCY",
  agency_customer_id: "AGENCY CUSTOMER ID",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",

  // Coverages / Limits
  coverage_type: "OCCURRENCE",
  general_aggregate: "GENERAL AGGREGATE",
  products_aggregate: "PRODUCTS - COMP\\/OP AGG",
  personal_adv_injury: "PERSONAL & ADV INJURY",
  each_occurrence: "EACH OCCURRENCE",
  fire_damage: "FIRE DAMAGE",
  medical_payments: "MED EXP",
  ebl_limit: "EMPLOYEE BENEFITS",
  deductible_pd: "DEDUCTIBLE PD",
  deductible_bi: "DEDUCTIBLE BI",

  // Other Coverages
  other_coverages_endorsements: "OTHER COVERAGES",

  // Schedule of Hazards
  hazard_code_1: "CLASS CODE 1",
  hazard_classification_1: "CLASSIFICATION 1",
  hazard_exposure_1: "EXPOSURE 1",
  hazard_premium_1: "PREMIUM 1",
  hazard_code_2: "CLASS CODE 2",
  hazard_classification_2: "CLASSIFICATION 2",
  hazard_exposure_2: "EXPOSURE 2",
  hazard_premium_2: "PREMIUM 2",

  // Claims-Made
  retroactive_date: "RETROACTIVE DATE",

  // Employee Benefits Liability
  ebl_deductible_per_claim: "EBL DEDUCTIBLE",
  ebl_num_employees: "NUMBER OF EMPLOYEES",

  // Contractors
  draws_plans_for_others: "1 YES",
  blasting_explosives: "2 YES",
  excavation_underground: "3 YES",
  subs_less_coverage: "4 YES",
  subs_without_coi: "5 YES",
  leases_equipment: "6 YES",
  type_work_subcontracted: "TYPE OF WORK SUBCONTRACTED",
  paid_to_subcontractors: "PAID TO SUBCONTRACTORS",
  pct_work_subcontracted: "PCT SUBCONTRACTED",

  // General Information
  general_questions_remarks: "EXPLAIN ALL YES RESPONSES",

  // Remarks
  remarks_126: "REMARKS",
};

/** ACORD 127 — Business Auto Section */
export const ACORD_127_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name: "AGENCY",
  agency_customer_id: "AGENCY CUSTOMER ID",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",

  // Driver Information
  driver_1_name: "DRIVER 1 NAME",
  driver_1_dob: "DRIVER 1 DOB",
  driver_1_license: "DRIVER 1 LICENSE",
  driver_2_name: "DRIVER 2 NAME",
  driver_2_dob: "DRIVER 2 DOB",
  driver_2_license: "DRIVER 2 LICENSE",

  // Vehicle Description
  vehicle_1_year: "YEAR 1",
  vehicle_1_make: "MAKE 1",
  vehicle_1_model: "MODEL 1",
  vehicle_1_body_type: "BODY TYPE 1",
  vehicle_1_vin: "VIN 1",
  vehicle_1_cost_new: "COST NEW 1",

  // Garaging Address
  garaging_street: "GARAGING STREET",
  garaging_city: "GARAGING CITY",
  garaging_state: "GARAGING STATE",
  garaging_zip: "GARAGING ZIP",

  // General Information remarks
  auto_general_remarks: "EXPLAIN ALL YES RESPONSES",

  // Remarks
  auto_remarks: "REMARKS",

  // Signature
  producer_name: "PRODUCERS NAME",
  producer_license_no: "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date: "SIGNATURE DATE",
};

/** ACORD 130 — Workers Compensation Application */
export const ACORD_130_FIELD_MAP: AcordFieldMap = {
  // Agency & Contact
  agency_name: "AGENCY",
  agency_phone: "OFFICE PHONE",
  agency_email: "EMAIL ADDRESS",
  agency_fax: "FAX",
  producer_name: "PRODUCER NAME",
  carrier: "COMPANY",
  underwriter: "UNDERWRITER",
  agency_customer_id: "AGENCY CUSTOMER ID",

  // Applicant Information
  insured_name: "APPLICANT",
  applicant_name: "APPLICANT",
  applicant_phone: "APPLICANT PHONE",
  mailing_address: "MAILING ADDRESS",
  city: "CITY",
  state: "STATE",
  zip: "ZIP CODE",
  years_in_business: "YEARS IN BUSINESS",
  sic_code: "SIC",
  naics_code: "NAICS",
  website: "WEBSITE",
  applicant_email: "E-MAIL",

  // Business Structure
  business_type: "BUSINESS STRUCTURE",

  // Credit Information
  fein: "FEIN",
  ncci_risk_id: "NCCI RISK ID",

  // Policy Information
  effective_date: "PROPOSED EFF DATE",
  expiration_date: "PROPOSED EXP DATE",

  // WC Coverages
  wc_part1_states: "PART 1 STATES",
  wc_each_accident: "EACH ACCIDENT",
  wc_disease_policy_limit: "DISEASE POLICY LIMIT",
  wc_disease_each_employee: "DISEASE EACH EMPLOYEE",
  additional_endorsements: "ADDITIONAL ENDORSEMENTS",

  // Premiums
  total_estimated_premium: "TOTAL ESTIMATED ANNUAL PREMIUM",
  total_minimum_premium: "TOTAL MINIMUM PREMIUM",
  total_deposit_premium: "TOTAL DEPOSIT PREMIUM",

  // Individuals Included / Excluded
  officer_1_name: "OFFICER 1 NAME",
  officer_1_title: "OFFICER 1 TITLE",
  officer_1_ownership: "OFFICER 1 OWNERSHIP",
  officer_1_duties: "OFFICER 1 DUTIES",
  officer_1_remuneration: "OFFICER 1 REMUNERATION",
  officer_2_name: "OFFICER 2 NAME",
  officer_2_title: "OFFICER 2 TITLE",
  officer_2_ownership: "OFFICER 2 OWNERSHIP",

  // State Rating Information
  rating_state: "RATING STATE",
  class_code_1: "CLASS CODE 1",
  class_description_1: "CLASSIFICATION 1",
  num_employees_1: "NUM EMPLOYEES 1",
  annual_remuneration_1: "ANNUAL REMUNERATION 1",
  est_premium_1: "EST PREMIUM 1",
  class_code_2: "CLASS CODE 2",
  class_description_2: "CLASSIFICATION 2",
  num_employees_2: "NUM EMPLOYEES 2",
  annual_remuneration_2: "ANNUAL REMUNERATION 2",
  est_premium_2: "EST PREMIUM 2",
  experience_mod: "EXPERIENCE MOD",

  // Prior Carrier / Loss History
  prior_wc_carrier_1: "PRIOR CARRIER 1",
  prior_wc_policy_1: "PRIOR POLICY 1",
  prior_wc_premium_1: "PRIOR PREMIUM 1",

  // Nature of Business
  description_of_operations: "DESCRIPTION",
  annual_revenues: "ANNUAL REVENUES",
  full_time_employees: "FULL TIME EMPLOYEES",
  part_time_employees: "PART TIME EMPLOYEES",

  // General Information
  wc_general_remarks: "EXPLAIN ALL YES RESPONSES",

  // Remarks
  wc_remarks: "REMARKS",
};

/** ACORD 131 — Umbrella / Excess Liability Section */
export const ACORD_131_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name: "AGENCY",
  agency_customer_id: "AGENCY CUSTOMER ID",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",

  // Policy Information
  each_occurrence_limit: "EACH OCCURRENCE",
  aggregate_limit: "AGGREGATE LIMIT",
  retained_limit_occurrence: "RETAINED LIMIT OCCURRENCE",
  retained_limit_aggregate: "RETAINED LIMIT AGGREGATE",
  retroactive_date: "RETROACTIVE DATE",
  expiring_policy_number: "EXPIRING POLICY",

  // Primary Location & Subsidiaries
  primary_location_name: "PRIMARY COMPANY NAME",
  primary_location_address: "PRIMARY LOCATION",
  primary_description: "DESCRIPTION OF OPERATIONS",
  annual_payroll: "ANNUAL PAYROLL",
  annual_gross_sales: "ANNUAL GROSS SALES",
  total_employees: "NUM EMPLOYEES",

  // Underlying Insurance
  underlying_auto_carrier: "AUTO CARRIER POLICY",
  underlying_auto_bi_ea_acc: "AUTO BI EACH ACCIDENT",
  underlying_auto_pd: "AUTO PD",
  underlying_auto_premium: "AUTO PREMIUM",
  underlying_gl_carrier: "GL CARRIER POLICY",
  underlying_gl_occurrence: "GL EACH OCCURRENCE",
  underlying_gl_aggregate: "GL GENERAL AGGREGATE",
  underlying_gl_products: "GL PRODUCTS",
  underlying_gl_premium: "GL PREMIUM",
  underlying_el_carrier: "EL CARRIER POLICY",
  underlying_el_each_accident: "EL EACH ACCIDENT",
  underlying_el_disease_employee: "EL DISEASE EMPLOYEE",
  underlying_el_disease_policy: "EL DISEASE POLICY",
  underlying_el_premium: "EL PREMIUM",

  // Remarks
  umbrella_remarks: "REMARKS",

  // Signature
  producer_name: "PRODUCERS NAME",
  producer_license_no: "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date: "SIGNATURE DATE",
};

/** ACORD 140 — Property Section */
export const ACORD_140_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name: "AGENCY",
  agency_customer_id: "AGENCY CUSTOMER ID",
  carrier: "COMPANY",
  naic_code: "NAIC CODE",
  policy_number: "POLICY NUMBER",
  effective_date: "EFFECTIVE DATE",
  insured_name: "APPLICANT",
  applicant_name: "APPLICANT",

  // Premises Information
  premises_address: "LOCATION ADDRESS",
  premises_city: "CITY",
  premises_state: "STATE",
  premises_zip: "ZIP",
  building_street_address: "STREET ADDRESS",
  building_description: "BUILDING DESCRIPTION",

  // Subject of Insurance
  building_amount: "BUILDING AMOUNT",
  building_valuation: "BUILDING VALUATION",
  building_causes_of_loss: "BUILDING CAUSES OF LOSS",
  building_deductible: "BUILDING DEDUCTIBLE",
  bpp_amount: "BPP AMOUNT",
  bpp_valuation: "BPP VALUATION",
  bpp_causes_of_loss: "BPP CAUSES OF LOSS",
  bpp_deductible: "BPP DEDUCTIBLE",
  business_income_amount: "BUSINESS INCOME",
  extra_expense_amount: "EXTRA EXPENSE",
  rental_value_amount: "RENTAL VALUE",

  // Construction
  construction_type: "CONSTRUCTION TYPE",
  num_stories: "NUM STORIES",
  year_built: "YEAR BUILT",
  total_area_sq_ft: "TOTAL AREA",
  distance_to_hydrant: "DISTANCE TO HYDRANT",
  protection_class: "PROTECTION CLASS",

  // Building Improvements
  roof_type: "ROOF TYPE",
  wiring_year: "WIRING YEAR",
  plumbing_year: "PLUMBING YEAR",
  roofing_year: "ROOFING YEAR",
  heating_year: "HEATING YEAR",

  // Protective Devices
  burglar_alarm_type: "BURGLAR ALARM",
  num_guards_watchmen: "NUM GUARDS",
  sprinkler_pct: "SPRINKLERED",
  fire_alarm_type: "FIRE ALARM",

  // Remarks
  property_remarks: "REMARKS",

  // Signature
  producer_name: "PRODUCERS NAME",
  producer_license_no: "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date: "SIGNATURE DATE",
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
