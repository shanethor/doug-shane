/**
 * Maps our internal field keys to the AcroForm PDF field names OR indices.
 *
 * IMPORTANT: Official ACORD fillable PDFs use binary-obfuscated field names.
 * Name-based matching DOES NOT WORK. We must use index-based (positional) mapping.
 *
 * Use ACORD_INDEX_MAPS for index-based filling (primary strategy).
 * ACORD_FIELD_MAPS (name-based) is kept as a fallback for PDFs that have readable names.
 */

export type AcordFieldMap = Record<string, string>;
/** Maps internal key → field index (0-based position in form.getFields()) */
export type AcordIndexMap = Record<string, number>;


// ─────────────────────────────────────────────────────────────────
// ACORD 125 (2016/03) — Commercial Insurance Application
// Field names verified against standard ACORD fillable PDF spec
// ─────────────────────────────────────────────────────────────────
export const ACORD_125_FIELD_MAP: AcordFieldMap = {
  // Agency block (top-left)
  agency_name:              "AGENCY",
  agency_phone:             "PHONE\nA/C No Ext",
  agency_fax:               "FAX\nA/C No",
  agency_email:             "EMAIL ADDRESS",
  agency_customer_id:       "AGENCY CUSTOMER ID",
  contact_name:             "CONTACT NAME",

  // Carrier block (top-right)
  carrier:                  "COMPANY",
  naic_code:                "NAIC CODE",
  company_program_name:     "COMPANY/POLICY OR PROGRAM NAME",
  program_code:             "PROGRAM CODE",
  policy_number:            "POLICY NUMBER",
  underwriter:              "UNDERWRITER",
  underwriter_office:       "UNDERWRITER OFFICE",
  transaction_date:         "DATE",

  // Policy Information
  proposed_eff_date:        "PROPOSED EFF DATE",
  proposed_exp_date:        "PROPOSED EXP DATE",
  billing_plan:             "BILL PLAN",
  payment_plan:             "PAYMENT PLAN",
  method_of_payment:        "METHOD OF PAYMENT",
  audit:                    "AUDIT",
  deposit_amount:           "DEPOSIT",
  minimum_premium:          "MINIMUM PREMIUM",
  policy_premium:           "TOTAL PREMIUM",

  // Lines of Business checkboxes (standard ACORD 125 naming)
  lob_commercial_general_liability: "CGL",
  lob_commercial_property:          "PROPERTY",
  lob_business_auto:                "AUTO",
  lob_umbrella:                     "UMBRELLA",
  lob_crime:                        "CRIME",
  lob_cyber:                        "CYBER",
  lob_inland_marine:                "INLAND MARINE",
  lob_boiler_machinery:             "BOILER",
  lob_bop:                          "BOP",
  cgl_premium:                      "CGL PREMIUM",
  property_premium:                 "PROP PREMIUM",
  auto_premium:                     "AUTO PREMIUM",
  umbrella_premium:                 "UMBRELLA PREMIUM",

  // Applicant Information
  applicant_name:           "APPLICANT",
  mailing_address:          "MAILING ADDRESS",
  city:                     "CITY",
  state:                    "STATE",
  zip:                      "ZIP CODE",
  gl_code:                  "GL CODE",
  sic_code:                 "SIC",
  naics_code:               "NAICS",
  fein:                     "FEIN OR SOC SEC",
  business_phone:           "BUSINESS PHONE",
  website:                  "WEBSITE ADDRESS",
  business_type:            "BUSINESS TYPE",
  llc_members_managers:     "LLC NO",

  // Other Named Insured
  other_named_insured:      "OTHER NAMED INSURED",

  // Contact Information
  contact_name_1:           "CONTACT NAME 1",
  contact_phone_1:          "PRIMARY PHONE",
  contact_email_1:          "PRIMARY E-MAIL",

  // Premises Information
  premises_address:         "STREET ADDRESS",
  premises_city:            "PREMISES CITY",
  premises_state:           "PREMISES STATE",
  premises_zip:             "PREMISES ZIP",
  full_time_employees:      "FULL TIME",
  part_time_employees:      "PART TIME",
  premises_description:     "DESCRIPTION OF OPERATIONS",

  // Nature of Business
  annual_revenues:          "ANNUAL REVENUES",
  occupied_sq_ft:           "OCCUPIED AREA",
  total_building_sq_ft:     "TOTAL BUILDING AREA",
  date_business_started:    "DATE BUSINESS STARTED",
  description_of_operations:"DESCRIPTION OF PRIMARY OPERATIONS",

  // General Information (Yes/No — ACORD uses numbered question fields)
  subsidiary_of_another:    "1A YES",
  has_subsidiaries:         "1B YES",
  safety_program:           "2 YES",
  exposure_flammables:      "3 YES",
  other_insurance_same_company: "4 YES",
  policy_declined_cancelled:"5 YES",
  past_sexual_abuse_claims: "6 YES",
  fraud_conviction:         "7 YES",
  fire_safety_violations:   "8 YES",
  bankruptcy:               "9 YES",
  judgement_or_lien:        "10 YES",
  business_in_trust:        "11 YES",
  foreign_operations:       "12 YES",
  other_business_ventures:  "13 YES",
  operates_drones:          "14 YES",
  hires_drone_operators:    "15 YES",
  general_info_remarks:     "EXPLAIN ALL YES RESPONSES",

  // Remarks
  remarks:                  "REMARKS",

  // Prior Carrier
  prior_carrier_1:          "PRIOR CARRIER 1",
  prior_policy_number_1:    "PRIOR POLICY NUMBER 1",
  prior_eff_date_1:         "PRIOR EFF DATE 1",
  prior_exp_date_1:         "PRIOR EXP DATE 1",
  prior_gl_premium_1:       "GL",

  // Loss History
  loss_history:             "LOSS HISTORY",

  // Signature
  producer_name:            "PRODUCERS NAME",
  producer_license_no:      "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date:           "SIGNATURE DATE",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 126 (2009/08) — Commercial General Liability Section
// Field names TBD — use /pdf-diagnostic Fill All TXT to verify
// ─────────────────────────────────────────────────────────────────
export const ACORD_126_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name:              "AGENCY",
  agency_customer_id:       "AGENCY CUSTOMER ID",
  carrier:                  "COMPANY",
  naic_code:                "NAIC CODE",
  policy_number:            "POLICY NUMBER",
  effective_date:           "EFFECTIVE DATE",
  insured_name:             "APPLICANT",
  transaction_date:         "DATE",

  // Coverages / Limits
  coverage_type:            "OCCURRENCE",
  general_aggregate:        "GENERAL AGGREGATE",
  aggregate_applies_per:    "LIMIT APPLIES PER",
  products_aggregate:       "PRODUCTS - COMP/OP AGG",
  personal_adv_injury:      "PERSONAL & ADV INJURY",
  each_occurrence:          "EACH OCCURRENCE",
  fire_damage:              "FIRE DAMAGE",
  medical_payments:         "MED EXP",
  ebl_limit:                "EMPLOYEE BENEFITS",
  deductible_pd:            "DEDUCTIBLE PD",
  deductible_bi:            "DEDUCTIBLE BI",

  // Other Coverages
  other_coverages_endorsements: "OTHER COVERAGES",

  // Schedule of Hazards
  hazard_loc_1:             "LOC 1",
  hazard_code_1:            "CLASS CODE 1",
  hazard_classification_1:  "CLASSIFICATION 1",
  hazard_exposure_1:        "EXPOSURE 1",
  hazard_rate_premops_1:    "RATE PREMOPS 1",
  hazard_rate_products_1:   "RATE PRODUCTS 1",
  hazard_premium_premops_1: "PREMIUM PREMOPS 1",
  hazard_premium_products_1:"PREMIUM PRODUCTS 1",

  // Claims-Made
  retroactive_date:         "RETROACTIVE DATE",
  entry_date_claims_made:   "ENTRY DATE",

  // Employee Benefits Liability
  ebl_deductible_per_claim: "EBL DEDUCTIBLE",
  ebl_num_employees:        "NUMBER OF EMPLOYEES",
  ebl_retroactive_date:     "EBL RETROACTIVE DATE",

  // Contractors
  draws_plans_for_others:   "1 YES",
  blasting_explosives:      "2 YES",
  excavation_underground:   "3 YES",
  subs_less_coverage:       "4 YES",
  subs_without_coi:         "5 YES",
  leases_equipment:         "6 YES",
  type_work_subcontracted:  "TYPE OF WORK SUBCONTRACTED",
  paid_to_subcontractors:   "PAID TO SUBCONTRACTORS",
  pct_work_subcontracted:   "PCT SUBCONTRACTED",

  // General Information
  general_questions_remarks:"EXPLAIN ALL YES RESPONSES",

  // Remarks
  remarks_126:              "REMARKS",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 127 (2010/05) — Business Auto Section
// ─────────────────────────────────────────────────────────────────
export const ACORD_127_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name:              "AGENCY",
  agency_customer_id:       "AGENCY CUSTOMER ID",
  carrier:                  "COMPANY",
  naic_code:                "NAIC CODE",
  policy_number:            "POLICY NUMBER",
  effective_date:           "EFFECTIVE DATE",
  insured_name:             "APPLICANT",

  // Driver Information
  driver_1_name:            "DRIVER NAME 1",
  driver_1_sex:             "SEX 1",
  driver_1_marital:         "MARITAL STATUS 1",
  driver_1_dob:             "DATE OF BIRTH 1",
  driver_1_license:         "LICENSE NUMBER 1",
  driver_2_name:            "DRIVER NAME 2",
  driver_2_sex:             "SEX 2",
  driver_2_marital:         "MARITAL STATUS 2",
  driver_2_dob:             "DATE OF BIRTH 2",
  driver_2_license:         "LICENSE NUMBER 2",
  driver_3_name:            "DRIVER NAME 3",
  driver_3_dob:             "DATE OF BIRTH 3",
  driver_3_license:         "LICENSE NUMBER 3",

  // Vehicle Description
  vehicle_1_year:           "YEAR 1",
  vehicle_1_make:           "MAKE 1",
  vehicle_1_model:          "MODEL 1",
  vehicle_1_body_type:      "BODY TYPE 1",
  vehicle_1_vin:            "VIN 1",
  vehicle_1_cost_new:       "COST NEW 1",
  vehicle_1_radius:         "RADIUS 1",
  vehicle_1_gvw:            "GVW 1",
  vehicle_2_year:           "YEAR 2",
  vehicle_2_make:           "MAKE 2",
  vehicle_2_model:          "MODEL 2",
  vehicle_2_vin:            "VIN 2",
  vehicle_2_cost_new:       "COST NEW 2",

  // Garaging Address
  garaging_street:          "GARAGING STREET",
  garaging_city:            "GARAGING CITY",
  garaging_state:           "GARAGING STATE",
  garaging_zip:             "GARAGING ZIP",

  // General Information (Yes/No)
  vehicles_not_solely_owned: "1 YES",
  over_50pct_employees_use_autos: "2 YES",
  vehicle_maintenance_program: "3 YES",
  vehicles_leased_to_others: "4 YES",
  modified_vehicles:        "5 YES",
  icc_puc_filings:          "6 YES",
  transporting_hazmat:      "7 YES",
  hold_harmless_agreements: "8 YES",
  vehicles_used_by_family:  "9 YES",
  mvr_verifications:        "10 YES",
  driver_recruiting_method: "11 YES",
  drivers_no_wc:            "12 YES",
  vehicles_not_scheduled:   "13 YES",
  drivers_with_violations:  "14 YES",
  agent_inspected_vehicles: "15 YES",
  all_vehicles_in_fleet:    "16 YES",
  auto_general_remarks:     "EXPLAIN ALL YES RESPONSES",

  // Garage / Storage
  max_dollar_value_at_risk: "MAXIMUM DOLLAR VALUE",

  // Remarks
  auto_remarks:             "REMARKS",

  // Signature
  producer_name:            "PRODUCERS NAME",
  producer_license_no:      "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date:           "SIGNATURE DATE",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 130 (2010/05) — Workers Compensation Application
// ─────────────────────────────────────────────────────────────────
export const ACORD_130_FIELD_MAP: AcordFieldMap = {
  // Agency & Contact
  agency_name:              "AGENCY",
  agency_phone:             "OFFICE PHONE",
  agency_mobile:            "MOBILE PHONE",
  agency_email:             "EMAIL ADDRESS",
  agency_fax:               "FAX",
  producer_name:            "PRODUCER NAME",
  cs_representative:        "CS REPRESENTATIVE",
  carrier:                  "COMPANY",
  underwriter:              "UNDERWRITER",
  agency_customer_id:       "AGENCY CUSTOMER ID",

  // Applicant Information
  insured_name:             "APPLICANT",
  applicant_name:           "APPLICANT",
  applicant_phone:          "APPLICANT PHONE",
  applicant_mobile:         "APPLICANT MOBILE",
  mailing_address:          "MAILING ADDRESS",
  city:                     "CITY",
  state:                    "STATE",
  zip:                      "ZIP CODE",
  years_in_business:        "YEARS IN BUSINESS",
  sic_code:                 "SIC",
  naics_code:               "NAICS",
  website:                  "WEBSITE",
  applicant_email:          "E-MAIL",

  // Business Structure
  business_type:            "BUSINESS STRUCTURE",

  // Credit Information
  fein:                     "FEIN",
  ncci_risk_id:             "NCCI RISK ID",

  // Policy Information
  effective_date:           "PROPOSED EFF DATE",
  expiration_date:          "PROPOSED EXP DATE",
  proposed_eff_date:        "PROPOSED EFF DATE",
  proposed_exp_date:        "PROPOSED EXP DATE",

  // WC Coverages
  wc_part1_states:          "PART 1 STATES",
  wc_each_accident:         "EACH ACCIDENT",
  wc_disease_policy_limit:  "DISEASE POLICY LIMIT",
  wc_disease_each_employee: "DISEASE EACH EMPLOYEE",
  additional_endorsements:  "ADDITIONAL ENDORSEMENTS",

  // Premiums
  total_estimated_premium:  "TOTAL ESTIMATED ANNUAL PREMIUM",
  total_minimum_premium:    "TOTAL MINIMUM PREMIUM",
  total_deposit_premium:    "TOTAL DEPOSIT PREMIUM",

  // Individuals Included / Excluded (officer table)
  officer_1_name:           "OFFICER 1",
  officer_1_title:          "TITLE 1",
  officer_1_ownership:      "OWNERSHIP 1",
  officer_1_duties:         "DUTIES 1",
  officer_1_remuneration:   "REMUNERATION 1",
  officer_2_name:           "OFFICER 2",
  officer_2_title:          "TITLE 2",
  officer_2_ownership:      "OWNERSHIP 2",
  officer_2_duties:         "DUTIES 2",
  officer_2_remuneration:   "REMUNERATION 2",
  officer_3_name:           "OFFICER 3",
  officer_3_title:          "TITLE 3",
  officer_3_ownership:      "OWNERSHIP 3",

  // State Rating Information
  rating_state:             "RATING STATE",
  class_code_1:             "CLASS CODE 1",
  class_description_1:      "CLASSIFICATION 1",
  num_employees_1:          "NUM EMPLOYEES 1",
  annual_remuneration_1:    "ANNUAL REMUNERATION 1",
  est_premium_1:            "EST PREMIUM 1",
  class_code_2:             "CLASS CODE 2",
  class_description_2:      "CLASSIFICATION 2",
  num_employees_2:          "NUM EMPLOYEES 2",
  annual_remuneration_2:    "ANNUAL REMUNERATION 2",
  est_premium_2:            "EST PREMIUM 2",
  experience_mod:           "EXPERIENCE MOD",
  mod_effective_date:       "MOD EFF DATE",

  // Prior Carrier / Loss History
  prior_wc_carrier_1:       "PRIOR CARRIER 1",
  prior_wc_policy_1:        "PRIOR POLICY 1",
  prior_wc_premium_1:       "PRIOR PREMIUM 1",

  // Nature of Business
  description_of_operations:"DESCRIPTION",
  annual_revenues:          "ANNUAL REVENUES",
  full_time_employees:      "FULL TIME EMPLOYEES",
  part_time_employees:      "PART TIME EMPLOYEES",

  // General Information
  wc_general_remarks:       "EXPLAIN ALL YES RESPONSES",

  // Remarks
  wc_remarks:               "REMARKS",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 131 (2013/09) — Umbrella / Excess Liability Section
// ─────────────────────────────────────────────────────────────────
export const ACORD_131_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name:              "AGENCY",
  agency_customer_id:       "AGENCY CUSTOMER ID",
  carrier:                  "COMPANY",
  naic_code:                "NAIC CODE",
  policy_number:            "POLICY NUMBER",
  effective_date:           "EFFECTIVE DATE",
  insured_name:             "APPLICANT",

  // Policy Information — Limits
  each_occurrence_limit:    "EACH OCCURRENCE",
  aggregate_limit:          "AGGREGATE LIMIT",
  retained_limit_occurrence:"RETAINED LIMIT OCCURRENCE",
  retained_limit_aggregate: "RETAINED LIMIT AGGREGATE",
  retroactive_date:         "RETROACTIVE DATE",
  expiring_policy_number:   "EXPIRING POLICY",

  // Primary Location & Operations
  primary_location_name:    "PRIMARY COMPANY NAME",
  primary_location_address: "PRIMARY LOCATION",
  primary_description:      "DESCRIPTION OF OPERATIONS",
  annual_payroll:           "ANNUAL PAYROLL",
  annual_gross_sales:       "ANNUAL GROSS SALES",
  total_employees:          "NUM EMPLOYEES",

  // Underlying Insurance — Auto
  underlying_auto_carrier:       "AUTO CARRIER POLICY",
  underlying_auto_bi_ea_acc:     "AUTO BI EACH ACCIDENT",
  underlying_auto_pd:            "AUTO PD",
  underlying_auto_premium:       "AUTO PREMIUM",

  // Underlying Insurance — GL
  underlying_gl_carrier:         "GL CARRIER POLICY",
  underlying_gl_occurrence:      "GL EACH OCCURRENCE",
  underlying_gl_aggregate:       "GL GENERAL AGGREGATE",
  underlying_gl_products:        "GL PRODUCTS",
  underlying_gl_premium:         "GL PREMIUM",

  // Underlying Insurance — Employers Liability
  underlying_el_carrier:         "EL CARRIER POLICY",
  underlying_el_each_accident:   "EL EACH ACCIDENT",
  underlying_el_disease_employee:"EL DISEASE EMPLOYEE",
  underlying_el_disease_policy:  "EL DISEASE POLICY",
  underlying_el_premium:         "EL PREMIUM",

  // Remarks
  umbrella_remarks:         "REMARKS",

  // Signature
  producer_name:            "PRODUCERS NAME",
  producer_license_no:      "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date:           "SIGNATURE DATE",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 140 (2007/03) — Property Section
// ─────────────────────────────────────────────────────────────────
export const ACORD_140_FIELD_MAP: AcordFieldMap = {
  // Header
  agency_name:              "AGENCY",
  agency_customer_id:       "AGENCY CUSTOMER ID",
  carrier:                  "COMPANY",
  naic_code:                "NAIC CODE",
  policy_number:            "POLICY NUMBER",
  effective_date:           "EFFECTIVE DATE",
  insured_name:             "APPLICANT",
  applicant_name:           "APPLICANT",

  // Premises Information
  premises_address:         "LOCATION ADDRESS",
  premises_city:            "CITY",
  premises_state:           "STATE",
  premises_zip:             "ZIP",
  building_street_address:  "STREET ADDRESS",
  building_description:     "BUILDING DESCRIPTION",

  // Subject of Insurance amounts
  building_amount:          "BUILDING AMOUNT",
  building_valuation:       "BUILDING VALUATION",
  building_causes_of_loss:  "BUILDING CAUSES OF LOSS",
  building_deductible:      "BUILDING DEDUCTIBLE",
  bpp_amount:               "BPP AMOUNT",
  bpp_valuation:            "BPP VALUATION",
  bpp_causes_of_loss:       "BPP CAUSES OF LOSS",
  bpp_deductible:           "BPP DEDUCTIBLE",
  business_income_amount:   "BUSINESS INCOME",
  extra_expense_amount:     "EXTRA EXPENSE",
  rental_value_amount:      "RENTAL VALUE",

  // Construction
  construction_type:        "CONSTRUCTION TYPE",
  num_stories:              "NUM STORIES",
  year_built:               "YEAR BUILT",
  total_area_sq_ft:         "TOTAL AREA",
  distance_to_hydrant:      "DISTANCE TO HYDRANT",
  protection_class:         "PROTECTION CLASS",

  // Building Improvements / Updates
  roof_type:                "ROOF TYPE",
  wiring_year:              "WIRING YEAR",
  plumbing_year:            "PLUMBING YEAR",
  roofing_year:             "ROOFING YEAR",
  heating_year:             "HEATING YEAR",

  // Protective Devices
  burglar_alarm_type:       "BURGLAR ALARM",
  num_guards_watchmen:      "NUM GUARDS",
  sprinkler_pct:            "SPRINKLERED",
  fire_alarm_type:          "FIRE ALARM",

  // Remarks
  property_remarks:         "REMARKS",

  // Signature
  producer_name:            "PRODUCERS NAME",
  producer_license_no:      "STATE LICENSE NO",
  national_producer_number: "NATIONAL PRODUCER NUMBER",
  signature_date:           "SIGNATURE DATE",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 75 (2010/07) — Cyber / Privacy Liability
// ─────────────────────────────────────────────────────────────────
export const ACORD_75_FIELD_MAP: AcordFieldMap = {
  agency_name:              "AGENCY",
  agency_customer_id:       "AGENCY CUSTOMER ID",
  carrier:                  "COMPANY",
  naic_code:                "NAIC CODE",
  policy_number:            "POLICY NUMBER",
  effective_date:           "EFFECTIVE DATE",
  insured_name:             "APPLICANT",
  annual_revenues:          "ANNUAL REVENUES",
  total_employees:          "NUM EMPLOYEES",
  description_of_operations:"DESCRIPTION OF OPERATIONS",
  each_occurrence_limit:    "EACH OCCURRENCE",
  aggregate_limit:          "AGGREGATE LIMIT",
  remarks:                  "REMARKS",
  producer_name:            "PRODUCERS NAME",
  signature_date:           "SIGNATURE DATE",
};

// ─────────────────────────────────────────────────────────────────
// ACORD 25 (2016/03) — Certificate of Liability Insurance
// ─────────────────────────────────────────────────────────────────
export const ACORD_25_FIELD_MAP: AcordFieldMap = {
  agency_name:              "PRODUCER",
  agency_phone:             "PHONE",
  agency_fax:               "FAX",
  agency_email:             "E-MAIL ADDRESS",
  insured_name:             "INSURED",
  mailing_address:          "INSURED ADDRESS",
  city:                     "INSURED CITY STATE ZIP",

  // GL coverage
  general_aggregate:        "GENERAL AGGREGATE",
  products_aggregate:       "PRODUCTS - COMP/OP AGG",
  personal_adv_injury:      "PERSONAL & ADV INJURY",
  each_occurrence:          "EACH OCCURRENCE",
  fire_damage:              "DAMAGE TO RENTED PREMISES",
  medical_payments:         "MED EXP",
  gl_policy_number:         "GL POLICY NUMBER",
  gl_eff_date:              "GL EFF DATE",
  gl_exp_date:              "GL EXP DATE",

  // Auto
  auto_combined_single_limit:"COMBINED SINGLE LIMIT",
  auto_policy_number:       "AUTO POLICY NUMBER",

  // Umbrella
  umbrella_each_occurrence: "UMBRELLA EACH OCCURRENCE",
  umbrella_aggregate:       "UMBRELLA AGGREGATE",

  // WC
  wc_each_accident:         "EACH ACCIDENT",
  wc_disease_policy_limit:  "DISEASE - POLICY LIMIT",
  wc_disease_each_employee: "DISEASE - EA EMPLOYEE",

  // Description & Certificate Holder
  certificate_holder:       "CERTIFICATE HOLDER",
  description_of_operations:"DESCRIPTION OF OPERATIONS",
  effective_date:           "CERTIFICATE DATE",
  producer_name:            "AUTHORIZED REPRESENTATIVE",
};

// ─────────────────────────────────────────────────────────────────
// Master lookups
// ─────────────────────────────────────────────────────────────────
// Name-based maps kept as fallback (index maps are primary for all active forms)
export const ACORD_FIELD_MAPS: Record<string, AcordFieldMap> = {
  "acord-125": ACORD_125_FIELD_MAP,
  "acord-126": ACORD_126_FIELD_MAP,
  "acord-127": ACORD_127_FIELD_MAP,
  "acord-130": ACORD_130_FIELD_MAP,
  "acord-131": ACORD_131_FIELD_MAP,
  "acord-140": ACORD_140_FIELD_MAP,
  "acord-75":  ACORD_75_FIELD_MAP,
};

/**
 * Paths to the official fillable PDFs in /public/acord-fillable/
 */
export const FILLABLE_PDF_PATHS: Record<string, string> = {
  "acord-125": "/acord-fillable/125.pdf",
  "acord-126": "/acord-fillable/126.pdf",
  "acord-127": "/acord-fillable/127.pdf",
  "acord-130": "/acord-fillable/130.pdf",
  "acord-131": "/acord-fillable/131.pdf",
  "acord-140": "/acord-fillable/140.pdf",
  "acord-75":  "/acord-fillable/75.pdf",
};

// ─────────────────────────────────────────────────────────────────
// INDEX-BASED FIELD MAPS (primary strategy)
//
// Official ACORD PDFs use binary-obfuscated field names that cannot
// be matched by name. Instead, map internal keys to field indices
// (0-based position in form.getFields()).
//
// Tab order follows ACORD standard: top→bottom, left→right per page.
// Verified using /pdf-diagnostic with indexed fill test.
// ─────────────────────────────────────────────────────────────────

// ── ACORD 126 (2009/08) — Commercial General Liability Section ──
// 253 TXT fields across 4 pages. Indices verified via /pdf-diagnostic "Fill All TXT".
// Gaps in numbering (8-12, 14, 16, 18, 21-22, 24-27, 151, 210, etc.) are CHK (checkbox) fields.
export const ACORD_126_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 (P1) — Header / Coverages / Schedule of Hazards ──
  agency_name:                0,   // P1.Text1  — Agency Name
  agency_customer_id:         1,   // P1.Text2  — Agency Customer ID
  transaction_date:           2,   // P1.Text3  — Date (MM/DD/YYYY)
  carrier:                    3,   // P1.Text4  — Company
  naic_code:                  4,   // P1.Text5  — NAIC Code
  policy_number:              5,   // P1.Text6  — Policy Number
  effective_date:             6,   // P1.Text7  — Effective Date
  insured_name:               7,   // P1.Text8  — Named Insured

  // Coverage Limits
  each_occurrence:           13,   // P1.Text9  — Each Occurrence Limit
  fire_damage:               15,   // P1.Text10 — Fire Damage (Any one fire)
  medical_payments:          17,   // P1.Text11 — Med Exp (Any one person)
  personal_adv_injury:       19,   // P1.Text12 — Personal & Adv Injury
  general_aggregate:         20,   // P1.Text13 — General Aggregate
  products_aggregate:        23,   // P1.Text14 — Products-Comp/Op Agg

  // Deductibles & Other Coverage Details
  deductible_amount:         28,   // P1.Text15 — Deductible Amount
  deductible_applies:        29,   // P1.Text16 — Deductible Applies To
  retention_amount:          30,   // P1.Text17 — SIR / Retention
  aggregate_applies_per:     31,   // P1.Text18 — Aggregate Limit Applies Per
  ebl_limit:                 32,   // P1.Text19 — Employee Benefits Liability Limit
  other_coverage_1:          33,   // P1.Text20 — Other Coverage/Endorsement 1
  other_coverage_2:          34,   // P1.Text21 — Other Coverage/Endorsement 2
  other_coverage_3:          35,   // P1.Text22 — Other Coverage/Endorsement 3

  // Schedule of Hazards — Row 1
  hazard_loc_1:              36,   // P1.Text23 — Loc #
  hazard_bldg_1:             37,   // P1.Text24 — Bldg #
  hazard_code_1:             38,   // P1.Text25 — Class Code
  hazard_classification_1:   39,   // P1.Text26 — Classification Description
  hazard_exposure_1:         40,   // P1.Text27 — Premium Basis / Exposure
  hazard_rate_premops_1:     41,   // P1.Text28 — Rate PremOps
  hazard_rate_products_1:    42,   // P1.Text29 — Rate Products
  hazard_premium_premops_1:  43,   // P1.Text30 — Premium PremOps
  hazard_premium_products_1: 44,   // P1.Text31 — Premium Products

  // Schedule of Hazards — Row 2
  hazard_loc_2:              45,   // P1.Text32
  hazard_bldg_2:             46,   // P1.Text33
  hazard_code_2:             47,   // P1.Text34
  hazard_classification_2:   48,   // P1.Text35
  hazard_exposure_2:         49,   // P1.Text36
  hazard_rate_premops_2:     50,   // P1.Text37
  hazard_rate_products_2:    51,   // P1.Text38
  hazard_premium_premops_2:  52,   // P1.Text39
  hazard_premium_products_2: 53,   // P1.Text40

  // Schedule of Hazards — Row 3
  hazard_loc_3:              54,   // P1.Text41
  hazard_bldg_3:             55,   // P1.Text42
  hazard_code_3:             56,   // P1.Text43
  hazard_classification_3:   57,   // P1.Text44
  hazard_exposure_3:         58,   // P1.Text45
  hazard_rate_premops_3:     59,   // P1.Text46
  hazard_rate_products_3:    60,   // P1.Text47
  hazard_premium_premops_3:  61,   // P1.Text48
  hazard_premium_products_3: 62,   // P1.Text49

  // Schedule of Hazards — Row 4
  hazard_loc_4:              63,   // P1.Text50
  hazard_bldg_4:             64,   // P1.Text51
  hazard_code_4:             65,   // P1.Text52
  hazard_classification_4:   66,   // P1.Text53
  hazard_exposure_4:         67,   // P1.Text54
  hazard_rate_premops_4:     68,   // P1.Text55
  hazard_rate_products_4:    69,   // P1.Text56
  hazard_premium_premops_4:  70,   // P1.Text57
  hazard_premium_products_4: 71,   // P1.Text58

  // Schedule of Hazards — Row 5
  hazard_loc_5:              72,   // P1.Text59
  hazard_bldg_5:             73,   // P1.Text60
  hazard_code_5:             74,   // P1.Text61
  hazard_classification_5:   75,   // P1.Text62
  hazard_exposure_5:         76,   // P1.Text63
  hazard_rate_premops_5:     77,   // P1.Text64
  hazard_rate_products_5:    78,   // P1.Text65
  hazard_premium_premops_5:  79,   // P1.Text66
  hazard_premium_products_5: 80,   // P1.Text67

  // Schedule of Hazards — Row 6
  hazard_loc_6:              81,   // P1.Text68
  hazard_bldg_6:             82,   // P1.Text69
  hazard_code_6:             83,   // P1.Text70
  hazard_classification_6:   84,   // P1.Text71
  hazard_exposure_6:         85,   // P1.Text72
  hazard_rate_premops_6:     86,   // P1.Text73
  hazard_rate_products_6:    87,   // P1.Text74
  hazard_premium_premops_6:  88,   // P1.Text75
  hazard_premium_products_6: 89,   // P1.Text76

  // Schedule of Hazards — Row 7
  hazard_loc_7:              90,   // P1.Text77
  hazard_bldg_7:             91,   // P1.Text78
  hazard_code_7:             92,   // P1.Text79
  hazard_classification_7:   93,   // P1.Text80
  hazard_exposure_7:         94,   // P1.Text81
  hazard_rate_premops_7:     95,   // P1.Text82
  hazard_rate_products_7:    96,   // P1.Text83
  hazard_premium_premops_7:  97,   // P1.Text84
  hazard_premium_products_7: 98,   // P1.Text85

  // Schedule of Hazards — Row 8
  hazard_loc_8:              99,   // P1.Text86
  hazard_bldg_8:            100,   // P1.Text87
  hazard_code_8:            101,   // P1.Text88
  hazard_classification_8:  102,   // P1.Text89
  hazard_exposure_8:        103,   // P1.Text90
  hazard_rate_premops_8:    104,   // P1.Text91
  hazard_rate_products_8:   105,   // P1.Text92
  hazard_premium_premops_8: 106,   // P1.Text93
  hazard_premium_products_8:107,   // P1.Text94

  // Premium Totals
  total_premium_premops:    108,   // P1.Text95 — Total Prem/Ops Premium
  total_premium_products:   109,   // P1.Text96 — Total Products Premium
  premium_subtotal:         110,   // P1.Text97 — Premium Subtotal
  premium_tax:              111,   // P1.Text98 — Premium Tax
  total_premium:            112,   // P1.Text99 — Total Premium

  // Products / Completed Operations Questions
  q7_desc_products:         113,   // P1.Text100 — Q7 Description of Products
  q8_pct_foreign:           114,   // P1.Text101 — Q8 % Foreign Products
  q9_recall_expense:        115,   // P1.Text102 — Q9 Recall Expense
  q10_annual_sales:         116,   // P1.Text103 — Q10 Annual Sales

  // Claims-Made Section
  retroactive_date:         117,   // P1.Text104 — Retroactive Date
  entry_date_claims_made:   118,   // P1.Text105 — Entry Date
  claims_made_pending:      119,   // P1.Text106 — Pending Claims Count
  claims_made_prior_acts:   120,   // P1.Text107 — Prior Acts Date

  // Additional Coverage Details
  additional_cov_1:         121,   // P1.Text108
  additional_cov_2:         122,   // P1.Text109
  additional_cov_3:         123,   // P1.Text110
  additional_cov_4:         124,   // P1.Text111
  additional_cov_5:         125,   // P1.Text112
  additional_cov_6:         126,   // P1.Text113
  additional_cov_7:         127,   // P1.Text114
  additional_cov_8:         128,   // P1.Text115
  additional_cov_9:         129,   // P1.Text116
  additional_cov_10:        130,   // P1.Text117
  additional_cov_11:        131,   // P1.Text118
  additional_cov_12:        132,   // P1.Text119
  additional_cov_13:        133,   // P1.Text120
  additional_cov_14:        134,   // P1.Text121
  additional_cov_15:        135,   // P1.Text122
  additional_cov_16:        136,   // P1.Text123
  additional_cov_17:        137,   // P1.Text124
  additional_cov_18:        138,   // P1.Text125
  additional_cov_19:        139,   // P1.Text126
  additional_cov_20:        140,   // P1.Text127

  // Employee Benefits Liability
  ebl_deductible_per_claim: 141,   // P1.Text128 — EBL Deductible Per Claim
  ebl_aggregate:            142,   // P1.Text129 — EBL Aggregate
  ebl_num_employees:        143,   // P1.Text130 — Number of Employees
  ebl_retroactive_date:     144,   // P1.Text131 — EBL Retroactive Date
  ebl_desc_plan_1:          145,   // P1.Text132
  ebl_desc_plan_2:          146,   // P1.Text133
  ebl_desc_plan_3:          147,   // P1.Text134
  ebl_plan_admin:           148,   // P1.Text135
  ebl_fiduciary_coverage:   149,   // P1.Text136
  ebl_additional:           150,   // P1.Text137

  // ── Page 2 (P2) — Contractor Questions / General Info ──
  contractor_q1_desc:       152,   // P2.Text1  — Q1 Description
  contractor_q2_desc:       153,   // P2.Text2  — Q2 Description
  contractor_q3_desc:       154,   // P2.Text3  — Q3 Description
  contractor_q4_desc:       155,   // P2.Text4  — Q4 Description
  contractor_q5_desc:       156,   // P2.Text5  — Q5 Description
  contractor_q6_desc:       157,   // P2.Text6  — Q6 Description
  type_work_subcontracted:  158,   // P2.Text7  — Type of Work Subcontracted
  paid_to_subcontractors:   159,   // P2.Text8  — Amount Paid to Subs
  pct_work_subcontracted:   160,   // P2.Text9  — % Subcontracted

  // General Information Questions (P2 continuation)
  gen_q1_desc:              161,   // P2.Text10
  gen_q2_desc:              162,   // P2.Text11
  gen_q3_desc:              163,   // P2.Text12
  gen_q4_desc:              164,   // P2.Text13
  gen_q5_desc:              165,   // P2.Text14
  gen_q6_desc:              166,   // P2.Text15
  gen_q7_desc:              167,   // P2.Text16
  gen_q8_desc:              168,   // P2.Text17
  gen_q9_desc:              169,   // P2.Text18
  gen_q10_desc:             170,   // P2.Text19
  gen_q11_desc:             171,   // P2.Text20
  gen_q12_desc:             172,   // P2.Text21
  gen_q13_desc:             173,   // P2.Text22
  gen_q14_desc:             174,   // P2.Text23
  gen_q15_desc:             175,   // P2.Text24
  gen_q16_desc:             176,   // P2.Text25
  gen_q17_desc:             177,   // P2.Text26
  gen_q18_desc:             178,   // P2.Text27
  gen_q19_desc:             179,   // P2.Text28
  gen_q20_desc:             180,   // P2.Text29
  gen_q21_desc:             181,   // P2.Text30
  gen_q22_desc:             182,   // P2.Text31
  gen_q23_desc:             183,   // P2.Text32
  gen_q24_desc:             184,   // P2.Text33
  gen_q25_desc:             185,   // P2.Text34
  gen_q26_desc:             186,   // P2.Text35
  gen_q27_desc:             187,   // P2.Text36
  gen_q28_desc:             188,   // P2.Text37
  gen_q29_desc:             189,   // P2.Text38
  gen_q30_desc:             190,   // P2.Text39
  gen_q31_desc:             191,   // P2.Text40
  gen_q32_desc:             192,   // P2.Text41
  gen_q33_desc:             193,   // P2.Text42
  gen_q34_desc:             194,   // P2.Text43
  gen_q35_desc:             195,   // P2.Text44
  gen_q36_desc:             196,   // P2.Text45
  gen_q37_desc:             197,   // P2.Text46
  gen_q38_desc:             198,   // P2.Text47
  gen_q39_desc:             199,   // P2.Text48
  gen_q40_desc:             200,   // P2.Text49
  gen_q41_desc:             201,   // P2.Text50
  gen_q42_desc:             202,   // P2.Text51
  gen_q43_desc:             203,   // P2.Text52
  gen_q44_desc:             204,   // P2.Text53
  gen_q45_desc:             205,   // P2.Text54
  gen_q46_desc:             206,   // P2.Text55
  gen_q47_desc:             207,   // P2.Text56
  gen_q48_desc:             208,   // P2.Text57
  general_questions_remarks:209,   // P2.Text58 — Explain All Yes Responses

  // ── Page 3 (P3) — Additional Interests / Remarks ──
  additional_interest_remarks: 211, // P3.Text1  — Additional Interest Remarks
  ai_1_rank:                219,   // P3.Text2
  ai_1_name:                220,   // P3.Text3
  ai_1_address:             222,   // P3.Text4
  ai_1_loc:                 223,   // P3.Text6
  ai_1_bldg:                224,   // P3.Text7
  ai_2_rank:                225,   // P3.Text8
  ai_2_name:                226,   // P3.Text9
  ai_2_address:             227,   // P3.Text10
  ai_2_loc:                 228,   // P3.Text11
  ai_2_bldg:                229,   // P3.Text12
  ai_3_rank:                230,   // P3.Text13
  ai_3_name:                231,   // P3.Text14
  ai_3_address:             232,   // P3.Text15
  ai_3_loc:                 233,   // P3.Text16
  ai_3_bldg:                234,   // P3.Text17
  ai_4_rank:                235,   // P3.Text18
  ai_4_name:                236,   // P3.Text19
  ai_4_address:             237,   // P3.Text20
  ai_4_loc:                 238,   // P3.Text21
  ai_4_bldg:                239,   // P3.Text22
  ai_5_rank:                240,   // P3.Text23
  ai_5_name:                241,   // P3.Text24
  ai_5_address:             242,   // P3.Text25
  ai_5_loc:                 243,   // P3.Text26
  ai_5_bldg:                244,   // P3.Text27
  ai_6_rank:                245,   // P3.Text28
  ai_6_name:                246,   // P3.Text29
  ai_6_address:             247,   // P3.Text30
  ai_6_loc:                 248,   // P3.Text31
  ai_6_bldg:                249,   // P3.Text32
  ai_7_rank:                250,   // P3.Text33
  ai_7_name:                251,   // P3.Text34
  ai_7_address:             252,   // P3.Text35
  ai_7_loc:                 253,   // P3.Text36
  ai_7_bldg:                254,   // P3.Text37
  ai_8_rank:                255,   // P3.Text38
  ai_8_name:                256,   // P3.Text39
  ai_8_address:             257,   // P3.Text40
  ai_8_loc:                 258,   // P3.Text41
  ai_8_bldg:                259,   // P3.Text42
  remarks_126_p3_1:         260,   // P3.Text43
  remarks_126_p3_2:         261,   // P3.Text44
  remarks_126_p3_3:         262,   // P3.Text45
  remarks_126_p3_4:         263,   // P3.Text46
  remarks_126_p3_5:         264,   // P3.Text47

  // ── Page 4 (P4) — Remarks (continued) / Signature ──
  remarks_126_p4_1:         266,   // P4.Text1
  remarks_126_p4_2:         267,   // P4.Text2
  remarks_126_p4_3:         268,   // P4.Text3
  remarks_126_p4_4:         269,   // P4.Text4
  remarks_126_p4_5:         270,   // P4.Text5
  remarks_126_p4_6:         271,   // P4.Text6
  remarks_126_p4_7:         272,   // P4.Text7
  remarks_126_p4_8:         273,   // P4.Text8
  remarks_126_p4_9:         274,   // P4.Text9
  remarks_126_p4_10:        275,   // P4.Text10
  remarks_126_p4_11:        276,   // P4.Text11
  remarks_126_p4_12:        277,   // P4.Text12
};

// ── ACORD 127 — Business Auto Section ──
// WIPED: awaiting new index mapping from /pdf-diagnostic "Fill All TXT" export
// against the replacement 127.pdf uploaded 2026-02-22.
export const ACORD_127_INDEX_MAP: AcordIndexMap = {
  // Placeholder — populate after running /pdf-diagnostic on new 127.pdf
};

// ── ACORD 130 (2010/05) — Workers Compensation — 486 fields ──
// Verified: 447 TXT, 35 CHK.
// CHK blocks: [31-38] business structure, [45-46] type, [48-55] officer inc/exc,
//   [58-62] misc, [91-92] misc, [117-119] yes/no answers, [122-126] yes/no
// Tab order: header → agency contact → applicant → WC coverages → class codes →
//   officers → loss history → general questions → remarks
export const ACORD_130_INDEX_MAP: AcordIndexMap = {
  // Header [0-6] TXT
  // NOTE: [5] effective_date is read-only in ACORD 130 PDF — skip
  agency_name:            0,
  agency_customer_id:     1,
  carrier:                2,
  naic_code:              3,
  policy_number:          4,
  insured_name:           6,
  // Agency contact block [7-14] TXT
  producer_name:          7,
  cs_representative:      8,
  agency_phone:           9,
  agency_mobile:         10,
  agency_email:          11,
  agency_fax:            12,
  underwriter:           13,
  // Applicant info [15-30] TXT
  applicant_phone:       15,
  applicant_mobile:      16,
  mailing_address:       17,
  city:                  18,
  state:                 19,
  zip:                   20,
  fein:                  21,
  ncci_risk_id:          22,
  years_in_business:     23,
  sic_code:              24,
  naics_code:            25,
  website:               26,
  applicant_email:       27,
  proposed_eff_date:     28,
  proposed_exp_date:     29,
  // [31-38] CHK = business structure type + misc
  // WC Coverage limits [39-44] TXT
  wc_part1_states:       39,
  wc_each_accident:      40,
  wc_disease_policy_limit: 41,
  wc_disease_each_employee: 42,
  additional_endorsements: 43,
  total_estimated_premium: 44,
  // [45-46] CHK
  // Class code table — [47]+ with CHKs interspersed for inc/exc
  class_code_1:          47,
  // [48-55] CHK = officer included/excluded block
  class_description_1:   56,
  num_employees_1:       57,
  // [58-62] CHK
  annual_remuneration_1: 63,
  est_premium_1:         64,
  class_code_2:          65,
  class_description_2:   66,
  num_employees_2:       67,
  annual_remuneration_2: 68,
  est_premium_2:         69,
  class_code_3:          70,
  class_description_3:   71,
  num_employees_3:       72,
  annual_remuneration_3: 73,
  est_premium_3:         74,
  // Totals / experience mod
  experience_mod:        90,
  // [91-92] CHK
  mod_effective_date:    93,
  // Officer schedule [94-113] TXT
  // NOTE: [94],[95],[96] officer_1_name/title/ownership are read-only in ACORD 130 PDF
  officer_1_duties:      97,
  officer_1_remuneration: 98,
  officer_2_name:        99,
  officer_2_title:       100,
  officer_2_ownership:   101,
  officer_2_duties:      102,
  officer_2_remuneration: 103,
  officer_3_name:        104,
  officer_3_title:       105,
  officer_3_ownership:   106,
  officer_3_duties:      107,
  officer_3_remuneration: 108,
  // Prior carrier / loss history [109-116]
  prior_wc_carrier_1:   109,
  prior_wc_policy_1:    110,
  prior_wc_premium_1:   111,
  // [117-119] CHK = yes/no question answers
  // Prior carrier continued [120-121]
  rating_state:         120,
  // [122-126] CHK
  // Nature of business / remarks [127+]
  // NOTE: [128] is CHK in ACORD 130 — annual_revenues has no TXT field in this PDF version
  description_of_operations: 127,
  full_time_employees:  129,
  part_time_employees:  130,
  wc_general_remarks:   131,
  wc_remarks:           132,
  // Signature
  producer_license_no:  140,
  national_producer_number: 141,
  signature_date:       142,
};

// ── ACORD 131 (2013/09) — Umbrella / Excess Liability — 405 fields ──
// Verified: 341 TXT, 59 CHK.
// CHK blocks: [8-13] policy type (Umbrella/Excess, Occurrence/Claims-Made), [107-108] misc
// Tab order: header → policy type CHKs → limits → location → underlying insurance → exposure
export const ACORD_131_INDEX_MAP: AcordIndexMap = {
  // Header [0-7] TXT
  agency_name:            0,
  agency_customer_id:     1,
  carrier:                2,
  naic_code:              3,
  policy_number:          4,
  effective_date:         5,
  insured_name:           6,
  // [7] TXT = misc date
  // [8-13] CHK = policy type selections (Umbrella/Excess, Occurrence/Claims-Made, etc.)
  // Limits [14-19] TXT
  each_occurrence_limit:  14,
  aggregate_limit:        15,
  retained_limit_occurrence: 16,
  retained_limit_aggregate:  17,
  retroactive_date:       18,
  expiring_policy_number: 19,
  // Primary location & operations [20-25] TXT
  primary_location_name:  20,
  primary_location_address: 21,
  primary_description:    22,
  annual_payroll:         23,
  annual_gross_sales:     24,
  total_employees:        25,
  // Underlying — Auto [26-29] TXT
  underlying_auto_carrier:      26,
  underlying_auto_bi_ea_acc:    27,
  underlying_auto_pd:           28,
  underlying_auto_premium:      29,
  // Underlying — GL [30-34] TXT
  underlying_gl_carrier:        30,
  underlying_gl_occurrence:     31,
  underlying_gl_aggregate:      32,
  underlying_gl_products:       33,
  underlying_gl_premium:        34,
  // Underlying — Employers Liability [35-39] TXT
  underlying_el_carrier:        35,
  underlying_el_each_accident:  36,
  underlying_el_disease_employee: 37,
  underlying_el_disease_policy: 38,
  underlying_el_premium:        39,
  // Exposure checklist / misc [40-60] TXT
  mailing_address:        40,
  city:                   41,
  state:                  42,
  zip:                    43,
  // Remarks
  umbrella_remarks:       80,
  // Signature
  producer_name:          90,
  producer_license_no:    91,
  national_producer_number: 92,
  signature_date:         93,
};

// ── ACORD 140 (2007/03) — Property Section — 355 fields ──
// Verified: 279 TXT, 76 CHK.
// CHK blocks: [74-75] construction type, [81-84] construction detail,
//   [86-87] heating, [89-90] electrical, [92] misc, [105] burglar alarm,
//   [107] sprinkler, [109] fire alarm, [111] smoke, [113] watchmen,
//   [120-122] misc, [124] misc, [127] misc, [129-130] misc
// Tab order: header → location info → subject of insurance amounts →
//   construction → updates → protective devices → remarks
export const ACORD_140_INDEX_MAP: AcordIndexMap = {
  // Header [0-6] TXT
  agency_name:            0,
  agency_customer_id:     1,
  carrier:                2,
  naic_code:              3,
  policy_number:          4,
  effective_date:         5,
  insured_name:           6,
  // Location [7-12] TXT
  building_street_address: 7,
  building_description:    8,
  premises_city:           9,
  premises_state:         10,
  premises_zip:           11,
  // Subject of insurance — Building [12-16] TXT
  building_amount:        12,
  building_valuation:     13,
  building_causes_of_loss: 14,
  building_deductible:    15,
  // BPP [16-20] TXT
  bpp_amount:             16,
  bpp_valuation:          17,
  bpp_causes_of_loss:     18,
  bpp_deductible:         19,
  // Income/expense [20-23] TXT
  business_income_amount: 20,
  extra_expense_amount:   21,
  rental_value_amount:    22,
  // Additional coverage blocks [23-50] TXT
  annual_revenues:        30,
  description_of_operations: 31,
  // Construction section — mostly TXT until CHKs at [74-75]
  // [70-73] = pre-construction TXT fields
  // [74-75] CHK = construction type checkboxes
  // After CHK block: construction detail TXT fields
  num_stories:            76,
  year_built:             77,
  total_area_sq_ft:       78,
  distance_to_hydrant:    79,
  protection_class:       80,
  // [81-84] CHK = construction material details
  // [85] TXT
  roof_type:              85,
  // [86-87] CHK = heating type
  wiring_year:            88,
  // [89-90] CHK
  plumbing_year:          91,
  // [92] CHK
  roofing_year:           93,
  heating_year:           94,
  // Protective devices — text after CHK fields
  // [105] CHK = burglar alarm type
  num_guards_watchmen:   106,
  // [107] CHK = sprinkler type
  sprinkler_pct:         108,
  // [109] CHK = fire alarm type
  fire_alarm_type:       110,
  // [111] CHK = smoke detector
  // [113] CHK = watchmen
  // Remarks / signature [125+] TXT
  property_remarks:      125,
  producer_name:         133,
  producer_license_no:   134,
  national_producer_number: 135,
  signature_date:        136,
};

// ── ACORD 75 (2010/07) — Cyber / Privacy Liability — 147 fields ──
export const ACORD_75_INDEX_MAP: AcordIndexMap = {
  agency_name:          0,
  agency_customer_id:   1,
  carrier:              2,
  naic_code:            3,
  policy_number:        4,
  effective_date:       5,
  insured_name:         6,
  annual_revenues:      7,
  total_employees:      8,
  description_of_operations: 9,
  each_occurrence_limit: 10,
  aggregate_limit:      11,
  remarks:              12,
  producer_name:        13,
  signature_date:       14,
};

// ── ACORD 125 (2016/03) — Commercial Insurance Application — 550+ fields ──
// Verified via /pdf-diagnostic "Fill All TXT" export — field names are semantic XFA names.
// Field names follow pattern: F[0].P{page}[0].{FieldName}_{Suffix}[0]
// Indices verified 2026-02-21 against 125.pdf diagnostic output.
export const ACORD_125_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 (P1) — Agency / Carrier / LOB / Policy / Applicant ──

  // Agency block
  transaction_date:       0,   // Form_CompletionDate_A
  agency_name:            1,   // Producer_FullName_A
  contact_name:           7,   // Producer_ContactPerson_FullName_A
  agency_phone:           8,   // Producer_ContactPerson_PhoneNumber_A
  agency_fax:             9,   // Producer_FaxNumber_A
  agency_email:          10,   // Producer_ContactPerson_EmailAddress_A
  agency_customer_id:    13,   // Producer_CustomerIdentifier_A

  // Carrier block
  carrier:               14,   // Insurer_FullName_A
  naic_code:             15,   // Insurer_NAICCode_A
  company_program_name:  16,   // Insurer_ProductDescription_A
  program_code:          17,   // Insurer_ProductCode_A
  policy_number:         18,   // Policy_PolicyNumberIdentifier_A
  underwriter:           19,   // Insurer_Underwriter_FullName_A
  underwriter_office:    20,   // Insurer_Underwriter_OfficeIdentifier_A

  // Lines of Business premium amounts (odd indices are CHK checkboxes)
  boiler_premium:        32,   // BoilerAndMachineryLineOfBusiness_PremiumAmount_A
  auto_premium:          34,   // CommercialVehicleLineOfBusiness_PremiumAmount_A
  bop_premium:           36,   // BusinessOwnersLineOfBusiness_PremiumAmount_A
  cgl_premium:           38,   // GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A
  inland_marine_premium: 40,   // CommercialInlandMarineLineOfBusiness_PremiumAmount_A
  property_premium:      42,   // CommercialPropertyLineOfBusiness_PremiumAmount_A
  crime_premium:         44,   // CrimeLineOfBusiness_PremiumAmount_A
  cyber_premium:         46,   // CyberAndPrivacyLineOfBusiness_PremiumAmount_A
  garage_premium:        50,   // GarageAndDealersLineOfBusiness_PremiumAmount_A
  liquor_premium:        52,   // LiquorLiabilityLineOfBusiness_PremiumAmount_A
  umbrella_premium:      58,   // CommercialUmbrellaLineOfBusiness_PremiumAmount_A

  // Policy Information
  proposed_eff_date:    115,   // Policy_EffectiveDate_A
  proposed_exp_date:    116,   // Policy_ExpirationDate_A
  billing_plan:         119,   // Policy_Payment_PaymentScheduleCode_A
  method_of_payment:    120,   // Policy_PaymentMethod_MethodDescription_A
  audit:                121,   // Policy_Audit_FrequencyCode_A
  deposit_amount:       122,   // Policy_Payment_DepositAmount_A
  minimum_premium:      123,   // Policy_Payment_MinimumPremiumAmount_A
  policy_premium:       124,   // Policy_Payment_EstimatedTotalAmount_A

  // Applicant Information (First Named Insured)
  applicant_name:       125,   // NamedInsured_FullName_A
  mailing_address:      126,   // NamedInsured_MailingAddress_LineOne_A
  city:                 128,   // NamedInsured_MailingAddress_CityName_A
  state:                129,   // NamedInsured_MailingAddress_StateOrProvinceCode_A
  zip:                  130,   // NamedInsured_MailingAddress_PostalCode_A
  gl_code:              131,   // NamedInsured_GeneralLiabilityCode_A
  sic_code:             132,   // NamedInsured_SICCode_A
  naics_code:           133,   // NamedInsured_NAICSCode_A
  fein:                 134,   // NamedInsured_TaxIdentifier_A
  business_phone:       135,   // NamedInsured_Primary_PhoneNumber_A
  website:              136,   // NamedInsured_Primary_WebsiteAddress_A
  llc_members_managers: 141,   // NamedInsured_LegalEntity_MemberManagerCount_A

  // Other Named Insured
  other_named_insured:  148,   // NamedInsured_FullName_B

  // ── Page 2 (P2) — Contacts / Premises / Nature of Business / Additional Interest ──

  // Contact Information
  contact_type_1:       195,   // NamedInsured_Contact_ContactDescription_A
  contact_name_1:       196,   // NamedInsured_Contact_FullName_A
  contact_phone_1:      197,   // NamedInsured_Contact_PrimaryPhoneNumber_A
  contact_email_1:      205,   // NamedInsured_Contact_PrimaryEmailAddress_A

  // Premises Information (Location A)
  premises_loc_number:  219,   // CommercialStructure_Location_ProducerIdentifier_A
  premises_address:     221,   // CommercialStructure_PhysicalAddress_LineOne_A
  premises_city:        223,   // CommercialStructure_PhysicalAddress_CityName_A
  premises_county:      224,   // CommercialStructure_PhysicalAddress_CountyName_A
  premises_state:       225,   // CommercialStructure_PhysicalAddress_StateOrProvinceCode_A
  premises_zip:         226,   // CommercialStructure_PhysicalAddress_PostalCode_A
  full_time_employees:  235,   // BusinessInformation_FullTimeEmployeeCount_A
  part_time_employees:  236,   // BusinessInformation_PartTimeEmployeeCount_A
  annual_revenues:      237,   // CommercialStructure_AnnualRevenueAmount_A
  occupied_sq_ft:       238,   // BuildingOccupancy_OccupiedArea_A
  open_to_public_area:  239,   // BuildingOccupancy_OpenToPublicArea_A
  total_building_sq_ft: 240,   // Construction_BuildingArea_A
  premises_description: 241,   // BuildingOccupancy_OperationsDescription_A

  // Nature of Business
  date_business_started: 327,  // NamedInsured_BusinessStartDate_A
  description_of_operations: 328, // CommercialPolicy_OperationsDescription_A

  // ── Page 3 (P3) — General Info / Remarks / Prior Coverage ──

  // Remarks
  remarks:              449,   // CommercialPolicy_RemarkText_A

  // Prior Coverage — Year 1
  prior_year_1:         450,   // PriorCoverage_PolicyYear_A
  prior_carrier_1:      451,   // PriorCoverage_GeneralLiability_InsurerFullName_A
  prior_policy_number_1: 452,  // PriorCoverage_GeneralLiability_PolicyNumberIdentifier_A
  prior_gl_premium_1:   453,   // PriorCoverage_GeneralLiability_TotalPremiumAmount_A
  prior_eff_date_1:     454,   // PriorCoverage_GeneralLiability_EffectiveDate_A
  prior_exp_date_1:     455,   // PriorCoverage_GeneralLiability_ExpirationDate_A

  // ── Page 4 (P4) — Loss History / Signature ──

  // Loss History
  loss_history_years:   517,   // LossHistory_InformationYearCount_A
  total_losses:         518,   // LossHistory_TotalAmount_A

  // Signature
  producer_name:        546,   // Producer_AuthorizedRepresentative_FullName_A
  producer_license_no:  547,   // Producer_StateLicenseIdentifier_A
  signature_date:       549,   // NamedInsured_SignatureDate_A
  national_producer_number: 550, // Producer_NationalIdentifier_A
};

export const ACORD_INDEX_MAPS: Record<string, AcordIndexMap> = {
  "acord-125": ACORD_125_INDEX_MAP,
  "acord-126": ACORD_126_INDEX_MAP,
  "acord-127": ACORD_127_INDEX_MAP,
  "acord-130": ACORD_130_INDEX_MAP,
  "acord-131": ACORD_131_INDEX_MAP,
  "acord-140": ACORD_140_INDEX_MAP,
  "acord-75":  ACORD_75_INDEX_MAP,
};


