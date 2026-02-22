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
// ACORD 130 (2013/01) — Workers Compensation Application
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

// ── ACORD 127 — Business Auto Section — 472 TXT fields ──
// Verified via /pdf-diagnostic "Fill All TXT" export — field names are semantic XFA names.
// Indices verified 2026-02-22 against replacement 127.pdf.
export const ACORD_127_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 (P1) — Header ──
  agency_customer_id:     0,   // Producer_CustomerIdentifier_A
  transaction_date:       1,   // Form_CompletionDate_A
  agency_name:            2,   // Producer_FullName_A
  policy_number:          3,   // Policy_PolicyNumberIdentifier_A
  effective_date:         4,   // Policy_EffectiveDate_A
  carrier:                5,   // Insurer_FullName_A
  naic_code:              6,   // Insurer_NAICCode_A
  insured_name:           7,   // NamedInsured_FullName_A

  // ── Driver A ──
  driver_1_id:            9,
  driver_1_first_name:   10,
  driver_1_middle:       11,
  driver_1_last_name:    12,
  driver_1_city:         13,
  driver_1_state:        14,
  driver_1_zip:          15,
  driver_1_sex:          16,
  driver_1_marital:      17,
  driver_1_dob:          18,
  driver_1_experience:   19,
  driver_1_licensed_year: 20,
  driver_1_license:      21,
  driver_1_ssn:          22,
  driver_1_license_state: 23,
  driver_1_hired_date:   24,
  driver_1_no_fault:     25,
  driver_1_other_car:    26,
  driver_1_vehicle_id:   27,
  driver_1_vehicle_pct:  28,

  // ── Driver B ──
  driver_2_id:           29,
  driver_2_first_name:   30,
  driver_2_middle:       31,
  driver_2_last_name:    32,
  driver_2_city:         33,
  driver_2_state:        34,
  driver_2_zip:          35,
  driver_2_sex:          36,
  driver_2_marital:      37,
  driver_2_dob:          38,
  driver_2_experience:   39,
  driver_2_licensed_year: 40,
  driver_2_license:      41,
  driver_2_ssn:          42,
  driver_2_license_state: 43,
  driver_2_hired_date:   44,
  driver_2_no_fault:     45,
  driver_2_other_car:    46,
  driver_2_vehicle_id:   47,
  driver_2_vehicle_pct:  48,

  // ── Driver C ──
  driver_3_id:           49,
  driver_3_first_name:   50,
  driver_3_middle:       51,
  driver_3_last_name:    52,
  driver_3_city:         53,
  driver_3_state:        54,
  driver_3_zip:          55,
  driver_3_sex:          56,
  driver_3_marital:      57,
  driver_3_dob:          58,
  driver_3_experience:   59,
  driver_3_licensed_year: 60,
  driver_3_license:      61,
  driver_3_ssn:          62,
  driver_3_license_state: 63,
  driver_3_hired_date:   64,
  driver_3_no_fault:     65,
  driver_3_other_car:    66,
  driver_3_vehicle_id:   67,
  driver_3_vehicle_pct:  68,

  // ── Driver D ──
  driver_4_id:           69,
  driver_4_first_name:   70,
  driver_4_middle:       71,
  driver_4_last_name:    72,
  driver_4_city:         73,
  driver_4_state:        74,
  driver_4_zip:          75,
  driver_4_sex:          76,
  driver_4_marital:      77,
  driver_4_dob:          78,
  driver_4_experience:   79,
  driver_4_licensed_year: 80,
  driver_4_license:      81,
  driver_4_ssn:          82,
  driver_4_license_state: 83,
  driver_4_hired_date:   84,
  driver_4_no_fault:     85,
  driver_4_other_car:    86,
  driver_4_vehicle_id:   87,
  driver_4_vehicle_pct:  88,

  // ── Driver E ──
  driver_5_id:           89,
  driver_5_first_name:   90,
  driver_5_middle:       91,
  driver_5_last_name:    92,
  driver_5_city:         93,
  driver_5_state:        94,
  driver_5_zip:          95,
  driver_5_sex:          96,
  driver_5_marital:      97,
  driver_5_dob:          98,
  driver_5_experience:   99,
  driver_5_licensed_year: 100,
  driver_5_license:      101,
  driver_5_ssn:          102,
  driver_5_license_state: 103,
  driver_5_hired_date:   104,
  driver_5_no_fault:     105,
  driver_5_other_car:    106,
  driver_5_vehicle_id:   107,
  driver_5_vehicle_pct:  108,

  // ── Driver F ──
  driver_6_id:           109,
  driver_6_first_name:   110,
  driver_6_middle:       111,
  driver_6_last_name:    112,
  driver_6_city:         113,
  driver_6_state:        114,
  driver_6_zip:          115,
  driver_6_sex:          116,
  driver_6_marital:      117,
  driver_6_dob:          118,
  driver_6_experience:   119,
  driver_6_licensed_year: 120,
  driver_6_license:      121,
  driver_6_ssn:          122,
  driver_6_license_state: 123,
  driver_6_hired_date:   124,
  driver_6_vehicle_id:   127,
  driver_6_vehicle_pct:  128,

  // ── Driver G ──
  driver_7_id:           129,
  driver_7_first_name:   130,
  driver_7_middle:       131,
  driver_7_last_name:    132,
  driver_7_city:         133,
  driver_7_state:        134,
  driver_7_zip:          135,
  driver_7_sex:          136,
  driver_7_marital:      137,
  driver_7_dob:          138,
  driver_7_experience:   139,
  driver_7_licensed_year: 140,
  driver_7_license:      141,
  driver_7_ssn:          142,
  driver_7_license_state: 143,
  driver_7_hired_date:   144,
  driver_7_vehicle_id:   147,
  driver_7_vehicle_pct:  148,

  // ── Driver H ──
  driver_8_id:           149,
  driver_8_first_name:   150,
  driver_8_middle:       151,
  driver_8_last_name:    152,
  driver_8_city:         153,
  driver_8_state:        154,
  driver_8_zip:          155,
  driver_8_sex:          156,
  driver_8_marital:      157,
  driver_8_dob:          158,
  driver_8_experience:   159,
  driver_8_licensed_year: 160,
  driver_8_license:      161,
  driver_8_ssn:          162,
  driver_8_license_state: 163,
  driver_8_hired_date:   164,
  driver_8_vehicle_id:   167,
  driver_8_vehicle_pct:  168,

  // ── Driver I ──
  driver_9_id:           169,
  driver_9_first_name:   170,
  driver_9_middle:       171,
  driver_9_last_name:    172,
  driver_9_city:         173,
  driver_9_state:        174,
  driver_9_zip:          175,
  driver_9_sex:          176,
  driver_9_marital:      177,
  driver_9_dob:          178,
  driver_9_experience:   179,
  driver_9_licensed_year: 180,
  driver_9_license:      181,
  driver_9_ssn:          182,
  driver_9_license_state: 183,
  driver_9_hired_date:   184,
  driver_9_vehicle_id:   187,
  driver_9_vehicle_pct:  188,

  // ── Driver J ──
  driver_10_id:          189,
  driver_10_first_name:  190,
  driver_10_middle:      191,
  driver_10_last_name:   192,
  driver_10_city:        193,
  driver_10_state:       194,
  driver_10_zip:         195,
  driver_10_sex:         196,
  driver_10_marital:     197,
  driver_10_dob:         198,
  driver_10_experience:  199,
  driver_10_licensed_year: 200,
  driver_10_license:     201,
  driver_10_ssn:         202,
  driver_10_license_state: 203,
  driver_10_hired_date:  204,
  driver_10_vehicle_id:  207,
  driver_10_vehicle_pct: 208,

  // ── Driver K ──
  driver_11_id:          209,
  driver_11_first_name:  210,
  driver_11_middle:      211,
  driver_11_last_name:   212,
  driver_11_city:        213,
  driver_11_state:       214,
  driver_11_zip:         215,
  driver_11_sex:         216,
  driver_11_marital:     217,
  driver_11_dob:         218,
  driver_11_experience:  219,
  driver_11_licensed_year: 220,
  driver_11_license:     221,
  driver_11_ssn:         222,
  driver_11_license_state: 223,
  driver_11_hired_date:  224,
  driver_11_vehicle_id:  227,
  driver_11_vehicle_pct: 228,

  // ── Driver L ──
  driver_12_id:          229,
  driver_12_first_name:  230,
  driver_12_middle:      231,
  driver_12_last_name:   232,
  driver_12_city:        233,
  driver_12_state:       234,
  driver_12_zip:         235,
  driver_12_sex:         236,
  driver_12_marital:     237,
  driver_12_dob:         238,
  driver_12_experience:  239,
  driver_12_licensed_year: 240,
  driver_12_license:     241,
  driver_12_ssn:         242,
  driver_12_license_state: 243,
  driver_12_hired_date:  244,
  driver_12_vehicle_id:  247,
  driver_12_vehicle_pct: 248,

  // ── Driver M ──
  driver_13_id:          249,
  driver_13_first_name:  250,
  driver_13_middle:      251,
  driver_13_last_name:   252,
  driver_13_city:        253,
  driver_13_state:       254,
  driver_13_zip:         255,
  driver_13_sex:         256,
  driver_13_marital:     257,
  driver_13_dob:         258,
  driver_13_experience:  259,
  driver_13_licensed_year: 260,
  driver_13_license:     261,
  driver_13_ssn:         262,
  driver_13_license_state: 263,
  driver_13_hired_date:  264,
  driver_13_vehicle_id:  267,
  driver_13_vehicle_pct: 268,

  // ── Page 1 — Questions / Modified Equipment ──
  question_aaj_code:     269,   // AAJCode
  modified_equip_veh_id_1: 270, // Vehicle_ProducerIdentifier_AA
  modified_equip_name_1: 271,   // AdditionalInterest_FullName_C
  modified_equip_veh_id_2: 272, // Vehicle_ProducerIdentifier_AB
  modified_equip_name_2: 273,   // AdditionalInterest_FullName_D
  over_50pct_employees_use_autos: 274, // ABACode
  vehicle_maintenance_program: 275,    // KADCode
  vehicle_maintenance_explanation: 276,
  vehicles_leased_to_others: 277,      // ABCCode
  vehicles_leased_explanation: 278,
  modified_special_equipment: 279,     // AAGCode
  modified_equip_veh_id_3: 280,
  modified_equip_desc_1: 281,
  modified_equip_cost_1: 282,
  modified_equip_veh_id_4: 283,
  modified_equip_desc_2: 284,
  modified_equip_cost_2: 285,
  icc_puc_filings:       286,   // AAECode
  transporting_hazmat:   287,   // AAFCode
  transporting_hazmat_explanation: 288,

  // ── Page 2 (P2) — Questions continued ──
  p2_agency_customer_id: 289,
  hold_harmless_agreements: 290, // AABCode
  hold_harmless_explanation: 291,
  vehicles_used_by_family: 292,  // AACCode
  vehicles_used_by_family_explanation: 293,
  mvr_verifications:     294,    // KAECode
  mvr_explanation:       295,
  driver_recruiting_method: 296, // KAFCode
  driver_recruiting_explanation: 297,
  drivers_not_wc:        298,    // AAHCode
  drivers_no_wc_explanation: 299,
  vehicles_not_scheduled: 300,   // AADCode
  vehicles_not_scheduled_explanation: 301,
  driver_moving_violations: 302, // AAICode

  // Accident/Conviction records
  accident_driver_id_1:  303,
  accident_date_1:       304,
  accident_description_1: 305,
  accident_place_1:      306,
  accident_years_1:      307,

  agent_inspected_vehicles: 308, // ABBCode
  agent_inspected_explanation: 309,
  fleet_monitoring:      310,    // KAGCode
  fleet_monitoring_device: 311,  // KAHCode
  fleet_monitored_pct:   312,
  fleet_monitoring_other_desc: 320,
  fleet_monitoring_additional: 321,
  garage_storage_description: 322,
  max_dollar_value_at_risk: 323,

  // Additional Interest A
  additional_interest_other_desc_1: 333,
  additional_interest_name_1: 334,
  additional_interest_address_1: 335,
  additional_interest_address2_1: 336,
  additional_interest_city_1: 337,
  additional_interest_state_1: 338,
  additional_interest_zip_1: 339,
  additional_interest_rank_1: 340,
  additional_interest_account_1: 342,
  additional_interest_vehicle_1: 343,
  additional_interest_location_1: 344,

  // Additional Interest B
  additional_interest_other_desc_2: 353,
  additional_interest_name_2: 354,
  additional_interest_address_2: 355,
  additional_interest_address2_2: 356,
  additional_interest_city_2: 357,
  additional_interest_state_2: 358,
  additional_interest_zip_2: 359,
  additional_interest_rank_2: 360,
  additional_interest_account_2: 362,
  additional_interest_vehicle_2: 363,
  additional_interest_location_2: 364,

  auto_remarks:          365,   // RemarkText_A

  // ── Page 3 (P3) — Vehicle Schedule ──
  p3_agency_customer_id: 366,

  // Vehicle A
  vehicle_1_id:          368,
  vehicle_1_year:        369,
  vehicle_1_make:        370,
  vehicle_1_model:       371,
  vehicle_1_body_type:   372,
  vehicle_1_vin:         373,
  vehicle_1_symbol:      377,
  vehicle_1_comp_symbol: 378,
  vehicle_1_coll_symbol: 379,
  garaging_street:       380,
  garaging_city:         381,
  garaging_county:       382,
  garaging_state:        383,
  garaging_zip:          384,
  vehicle_1_reg_state:   385,
  vehicle_1_territory:   386,
  vehicle_1_gvw:         387,
  vehicle_1_rate_class:  388,
  vehicle_1_sic:         389,
  vehicle_1_liability_factor: 390,
  vehicle_1_seating:     391,
  vehicle_1_radius:      392,
  vehicle_1_farthest_zone: 393,
  vehicle_1_cost_new:    394,
  vehicle_1_use_other:   402,
  vehicle_1_coverage_other: 420,
  vehicle_1_agreed_amount: 424,
  vehicle_1_comp_deductible: 427,
  vehicle_1_coll_deductible: 428,
  vehicle_1_net_rating:  431,
  vehicle_1_premium:     432,

  // Vehicle B
  vehicle_2_id:          433,
  vehicle_2_year:        434,
  vehicle_2_make:        435,
  vehicle_2_model:       436,
  vehicle_2_body_type:   437,
  vehicle_2_vin:         438,
  vehicle_2_symbol:      442,
  vehicle_2_comp_symbol: 443,
  vehicle_2_coll_symbol: 444,
  vehicle_2_garaging_street: 445,
  vehicle_2_garaging_city: 446,
  vehicle_2_garaging_county: 447,
  vehicle_2_garaging_state: 448,
  vehicle_2_garaging_zip: 449,
  vehicle_2_reg_state:   450,
  vehicle_2_territory:   451,
  vehicle_2_gvw:         452,
  vehicle_2_rate_class:  453,
  vehicle_2_sic:         454,
  vehicle_2_liability_factor: 455,
  vehicle_2_seating:     456,
  vehicle_2_radius:      457,
  vehicle_2_farthest_zone: 458,
  vehicle_2_cost_new:    459,
  vehicle_2_use_other:   467,
  vehicle_2_coverage_other: 485,
  vehicle_2_agreed_amount: 489,
  vehicle_2_comp_deductible: 492,
  vehicle_2_coll_deductible: 493,
  vehicle_2_net_rating:  496,
  vehicle_2_premium:     497,

  // Vehicle C
  vehicle_3_id:          498,
  vehicle_3_year:        499,
  vehicle_3_make:        500,
  vehicle_3_model:       501,
  vehicle_3_body_type:   502,
  vehicle_3_vin:         503,
  vehicle_3_symbol:      507,
  vehicle_3_comp_symbol: 508,
  vehicle_3_coll_symbol: 509,
  vehicle_3_garaging_street: 510,
  vehicle_3_garaging_city: 511,
  vehicle_3_garaging_county: 512,
  vehicle_3_garaging_state: 513,
  vehicle_3_garaging_zip: 514,
  vehicle_3_reg_state:   515,
  vehicle_3_territory:   516,
  vehicle_3_gvw:         517,
  vehicle_3_rate_class:  518,
  vehicle_3_sic:         519,
  vehicle_3_liability_factor: 520,
  vehicle_3_seating:     521,
  vehicle_3_radius:      522,
  vehicle_3_farthest_zone: 523,
  vehicle_3_cost_new:    524,
  vehicle_3_use_other:   532,
  vehicle_3_coverage_other: 550,
  vehicle_3_agreed_amount: 554,
  vehicle_3_comp_deductible: 557,
  vehicle_3_coll_deductible: 558,
  vehicle_3_net_rating:  561,
  vehicle_3_premium:     562,

  // Vehicle D
  vehicle_4_id:          563,
  vehicle_4_year:        564,
  vehicle_4_make:        565,
  vehicle_4_model:       566,
  vehicle_4_body_type:   567,
  vehicle_4_vin:         568,
  vehicle_4_symbol:      572,
  vehicle_4_comp_symbol: 573,
  vehicle_4_coll_symbol: 574,
  vehicle_4_garaging_street: 575,
  vehicle_4_garaging_city: 576,
  vehicle_4_garaging_county: 577,
  vehicle_4_garaging_state: 578,
  vehicle_4_garaging_zip: 579,
  vehicle_4_reg_state:   580,
  vehicle_4_territory:   581,
  vehicle_4_gvw:         582,
  vehicle_4_rate_class:  583,
  vehicle_4_sic:         584,
  vehicle_4_liability_factor: 585,
  vehicle_4_seating:     586,
  vehicle_4_radius:      587,
  vehicle_4_farthest_zone: 588,
  vehicle_4_cost_new:    589,
  vehicle_4_use_other:   597,
  vehicle_4_coverage_other: 615,
  vehicle_4_agreed_amount: 619,
  vehicle_4_comp_deductible: 622,
  vehicle_4_coll_deductible: 623,
  vehicle_4_net_rating:  626,
  vehicle_4_premium:     627,

  auto_general_remarks:  628,   // RemarkText_B

  // ── Page 4 (P4) — Signature ──
  p4_agency_customer_id: 629,
  producer_signature:    630,
  producer_name:         631,
  producer_license_no:   632,
  insured_signature:     633,
  signature_date:        634,
  national_producer_number: 635,
};

// ── ACORD 130 (2013/01) — Workers Compensation — 484 fields ──
// Verified: 447 TXT, 37 CHK via /pdf-diagnostic.
// CHK blocks: [31-38] business structure, [40] misc, [46-56] officer inc/exc & misc,
//   [59-62] misc, [63] misc, [92-93] misc, [118-120] yes/no, [123-127] yes/no, [129] misc
// Tab order: header → producer → insured → policy info → locations → WC coverages →
//   class codes → state coverage → officers → prior coverage → questions → signature
// Verified via readable field names from new ACORD 130 PDF (447 TXT fields).
export const ACORD_130_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 — Header / Producer [0-14] ──
  completion_date:          0,   // Form_CompletionDate
  agency_name:              1,   // Producer_FullName
  agency_address_line1:     2,   // Producer_MailingAddress_LineOne
  agency_address_line2:     3,   // Producer_MailingAddress_LineTwo
  agency_city:              4,   // Producer_MailingAddress_CityName
  agency_state:             5,   // Producer_MailingAddress_StateOrProvinceCode
  agency_zip:               6,   // Producer_MailingAddress_PostalCode
  producer_name:            7,   // Producer_ContactPerson_FullName
  cs_representative:        8,   // Producer_CustomerServiceRepresentative_FullName
  agency_phone:             9,   // Producer_ContactPerson_PhoneNumber
  agency_mobile:           10,   // Producer_ContactPerson_CellPhoneNumber
  agency_fax:              11,   // Producer_FaxNumber
  agency_email:            12,   // Producer_ContactPerson_EmailAddress
  producer_id:             13,   // Insurer_ProducerIdentifier
  sub_producer_id:         14,   // Insurer_SubProducerIdentifier
  agency_customer_id:      15,   // Producer_CustomerIdentifier

  // ── Carrier / Insured [16-30] ──
  carrier:                 16,   // Insurer_FullName
  underwriter:             17,   // Insurer_Underwriter_FullName
  insured_name:            18,   // NamedInsured_FullName
  applicant_phone:         19,   // NamedInsured_Primary_PhoneNumber
  applicant_mobile:        20,   // NamedInsured_Secondary_PhoneNumber
  mailing_address:         21,   // NamedInsured_MailingAddress_LineOne
  mailing_address_line2:   22,   // NamedInsured_MailingAddress_LineTwo
  city:                    23,   // NamedInsured_MailingAddress_CityName
  state:                   24,   // NamedInsured_MailingAddress_StateOrProvinceCode
  zip:                     25,   // NamedInsured_MailingAddress_PostalCode
  years_in_business:       26,   // NamedInsured_InBusinessYearCount
  sic_code:                27,   // NamedInsured_SICCode
  naics_code:              28,   // NamedInsured_NAICSCode
  website:                 29,   // NamedInsured_Primary_WebsiteAddress
  applicant_email:         30,   // NamedInsured_Primary_EmailAddress

  // [31-38] CHK = business entity type
  entity_other_description: 39,  // NamedInsured_LegalEntity_OtherDescription

  // [40] CHK
  credit_bureau_name:      41,   // NamedInsured_CreditBureauName
  credit_bureau_id:        42,   // NamedInsured_CreditBureauIdentifier
  fein:                    43,   // NamedInsured_TaxIdentifier
  ncci_risk_id:            44,   // NamedInsured_NCCIRiskIdentifier
  rating_bureau_id:        45,   // NamedInsured_RatingBureauIdentifier

  // [46-47] CHK
  proposed_eff_date:       48,   // Binder_EffectiveDate

  // [49-56] CHK = payment plan, audit type
  payment_plan:            57,   // Policy_Payment_PaymentScheduleCode
  down_payment_percent:    58,   // Policy_Payment_DownPaymentPercent

  // [59-63] CHK = audit frequency
  audit_frequency:         64,   // Policy_Audit_FrequencyCode

  // ── Locations A/B/C [65-88] ──
  location_id_a:           65,   // Location_ProducerIdentifier_A
  location_floors_a:       66,   // Location_HighestFloorCount_A
  location_address_a:      67,   // Location_PhysicalAddress_LineOne_A
  location_address2_a:     68,   // Location_PhysicalAddress_LineTwo_A
  location_city_a:         69,   // Location_PhysicalAddress_CityName_A
  location_county_a:       70,   // Location_PhysicalAddress_CountyName_A
  location_state_a:        71,   // Location_PhysicalAddress_StateOrProvinceCode_A
  location_zip_a:          72,   // Location_PhysicalAddress_PostalCode_A
  location_id_b:           73,   // Location_ProducerIdentifier_B
  location_floors_b:       74,   // Location_HighestFloorCount_B
  location_address_b:      75,   // Location_PhysicalAddress_LineOne_B
  location_address2_b:     76,   // Location_PhysicalAddress_LineTwo_B
  location_city_b:         77,   // Location_PhysicalAddress_CityName_B
  location_county_b:       78,   // Location_PhysicalAddress_CountyName_B
  location_state_b:        79,   // Location_PhysicalAddress_StateOrProvinceCode_B
  location_zip_b:          80,   // Location_PhysicalAddress_PostalCode_B
  location_id_c:           81,   // Location_ProducerIdentifier_C
  location_floors_c:       82,   // Location_HighestFloorCount_C
  location_address_c:      83,   // Location_PhysicalAddress_LineOne_C
  location_address2_c:     84,   // Location_PhysicalAddress_LineTwo_C
  location_city_c:         85,   // Location_PhysicalAddress_CityName_C
  location_county_c:       86,   // Location_PhysicalAddress_CountyName_C
  location_state_c:        87,   // Location_PhysicalAddress_StateOrProvinceCode_C
  location_zip_c:          88,   // Location_PhysicalAddress_PostalCode_C

  // ── Policy Dates [89-91] ──
  effective_date:          89,   // Policy_EffectiveDate
  proposed_exp_date:       90,   // Policy_ExpirationDate
  anniversary_rating_date: 91,   // Policy_NormalAnniversaryRatingDate

  // [92-93] CHK
  retrospective_rating_plan: 94, // Policy_RetrospectiveRatingPlan

  // ── WC Part 1 States [95-104] ──
  wc_part1_states:         95,   // WorkersCompensation_PartOne_StateOrProvinceCode_A
  wc_part1_state_b:        96,
  wc_part1_state_c:        97,
  wc_part1_state_d:        98,
  wc_part1_state_e:        99,
  wc_part1_state_f:       100,
  wc_part1_state_g:       101,
  wc_part1_state_h:       102,
  wc_part1_state_i:       103,
  wc_part1_state_j:       104,

  // ── Employers Liability Limits [105-107] ──
  wc_each_accident:       105,   // EachAccidentLimitAmount
  wc_disease_policy_limit: 106,  // DiseasePolicyLimitAmount
  wc_disease_each_employee: 107, // DiseaseEachEmployeeLimitAmount

  // ── WC Part 3 States [108-117] ──
  wc_part3_state_a:       108,
  wc_part3_state_b:       109,
  wc_part3_state_c:       110,
  wc_part3_state_d:       111,
  wc_part3_state_e:       112,
  wc_part3_state_f:       113,
  wc_part3_state_g:       114,
  wc_part3_state_h:       115,
  wc_part3_state_i:       116,
  wc_part3_state_j:       117,

  // [118-120] CHK = deductible type
  deductible_other_desc:  121,   // WorkersCompensation_DeductibleType_OtherDescription
  deductible_amount:      122,   // WorkersCompensation_DeductibleAmount

  // [123-127] CHK = coverage options
  coverage_other_desc_a:  128,   // WorkersCompensation_Coverage_OtherDescription_A
  // [129] CHK
  coverage_other_desc_b:  130,   // WorkersCompensation_Coverage_OtherDescription_B
  dividend_safety_plan:   131,   // WorkersCompensation_DividendOrSafetyPlan
  additional_company_info: 132,  // WorkersCompensation_AdditionalCompanyInformation
  additional_endorsements: 133,  // WorkersCompensation_AdditionalCoverageEndorsementDescription
  total_estimated_premium: 134,  // TotalEstimatedAnnualPremiumAllStatesAmount
  total_minimum_premium:  135,   // TotalMinimumPremiumAllStatesAmount
  total_deposit_premium:  136,   // TotalDepositPremiumAllStatesAmount

  // ── Contact Info [137-148] ──
  inspection_contact_name:  137, // InspectionContact_FullName
  inspection_contact_phone: 138, // InspectionContact_PhoneNumber
  inspection_contact_cell:  139, // InspectionContact_CellPhoneNumber
  inspection_contact_email: 140, // InspectionContact_EmailAddress
  accounting_contact_name:  141, // AccountingContact_FullName
  accounting_contact_phone: 142, // AccountingContact_PhoneNumber
  accounting_contact_cell:  143, // AccountingContact_CellPhoneNumber
  accounting_contact_email: 144, // AccountingContact_EmailAddress
  claim_contact_name:       145, // ClaimContact_FullName
  claim_contact_phone:      146, // ClaimContact_PhoneNumber
  claim_contact_cell:       147, // ClaimContact_CellPhoneNumber
  claim_contact_email:      148, // ClaimContact_EmailAddress

  // ── Individual / Officer Schedule (4 rows × 10 cols) [149-188] ──
  officer_1_state:        149,   // Individual_StateOrProvinceCode_A
  officer_1_location:     150,   // Individual_LocationProducerIdentifier_A
  officer_1_name:         151,   // Individual_FullName_A
  officer_1_dob:          152,   // Individual_BirthDate_A
  officer_1_title:        153,   // Individual_TitleRelationshipCode_A
  officer_1_ownership:    154,   // Individual_OwnershipPercent_A
  officer_1_duties:       155,   // Individual_DutiesDescription_A
  officer_1_inc_exc:      156,   // Individual_IncludedExcludedCode_A
  officer_1_class_code:   157,   // Individual_RatingClassificationCode_A
  officer_1_remuneration: 158,   // Individual_RemunerationAmount_A
  officer_2_state:        159,
  officer_2_location:     160,
  officer_2_name:         161,
  officer_2_dob:          162,
  officer_2_title:        163,
  officer_2_ownership:    164,
  officer_2_duties:       165,
  officer_2_inc_exc:      166,
  officer_2_class_code:   167,
  officer_2_remuneration: 168,
  officer_3_state:        169,
  officer_3_location:     170,
  officer_3_name:         171,
  officer_3_dob:          172,
  officer_3_title:        173,
  officer_3_ownership:    174,
  officer_3_duties:       175,
  officer_3_inc_exc:      176,
  officer_3_class_code:   177,
  officer_3_remuneration: 178,
  officer_4_state:        179,
  officer_4_location:     180,
  officer_4_name:         181,
  officer_4_dob:          182,
  officer_4_title:        183,
  officer_4_ownership:    184,
  officer_4_duties:       185,
  officer_4_inc_exc:      186,
  officer_4_class_code:   187,
  officer_4_remuneration: 188,

  // ── Page 2 — Rate State / Class Codes (14 rows × 11 cols) [189-346] ──
  page2_customer_id:      189,   // Producer_CustomerIdentifier (page 2)
  rate_state_page_num:    190,   // RateState_PageNumber
  rate_state_total_pages: 191,   // RateState_TotalPageNumber
  rating_state:           192,   // RateState_StateOrProvinceName

  // Row A [193-203]
  class_loc_a:            193,   // RateClass_LocationProducerIdentifier_A
  class_code_1:           194,   // RateClass_ClassificationCode_A
  class_description_1:    195,   // RateClass_DescriptionCode_A
  class_duties_1:         196,   // RateClass_DutiesDescription_A
  full_time_employees:    197,   // RateClass_FullTimeEmployeeCount_A
  part_time_employees:    198,   // RateClass_PartTimeEmployeeCount_A
  class_sic_a:            199,   // RateClass_SICCode_A
  class_naics_a:          200,   // RateClass_NAICSCode_A
  annual_remuneration_1:  201,   // RateClass_RemunerationAmount_A
  rate_1:                 202,   // RateClass_Rate_A
  est_premium_1:          203,   // RateClass_EstimatedManualPremiumAmount_A

  // Row B [204-214]
  class_loc_b:            204,
  class_code_2:           205,
  class_description_2:    206,
  class_duties_2:         207,
  num_employees_2:        208,
  part_time_employees_2:  209,
  class_sic_b:            210,
  class_naics_b:          211,
  annual_remuneration_2:  212,
  rate_2:                 213,
  est_premium_2:          214,

  // Row C [215-225]
  class_loc_c:            215,
  class_code_3:           216,
  class_description_3:    217,
  class_duties_3:         218,
  num_employees_3:        219,
  part_time_employees_3:  220,
  class_sic_c:            221,
  class_naics_c:          222,
  annual_remuneration_3:  223,
  rate_3:                 224,
  est_premium_3:          225,

  // Rows D-N [226-346] — follow same 11-field pattern
  // Row D
  class_code_4:           227,
  class_description_4:    228,
  annual_remuneration_4:  234,
  est_premium_4:          236,

  // ── State Coverage Modifiers [347-384] ──
  state_coverage_state:   347,   // RateState_StateOrProvinceName (repeat)
  total_factored_premium: 348,   // TotalFactoredPremiumAmount
  increased_limits_mod:   349,   // IncreasedLimits_ModificationFactor
  increased_limits_prem:  350,   // IncreasedLimits_FactoredPremiumAmount
  deductible_mod:         351,   // Deductible_ModificationFactor
  deductible_prem:        352,   // Deductible_FactoredPremiumAmount
  other_coverage_desc_a:  353,   // Other_CoverageDescription_A
  other_mod_a:            354,   // Other_ModificationFactor_A
  other_prem_a:           355,   // Other_FactoredPremiumAmount_A
  experience_mod:         356,   // ExperienceOrMerit_ModificationFactor
  experience_prem:        357,   // ExperienceOrMerit_FactoredPremiumAmount
  other_coverage_desc_b:  358,   // Other_CoverageDescription_B
  other_mod_b:            359,
  other_prem_b:           360,
  assigned_risk_mod:      361,   // AssignedRiskSurcharge_ModificationFactor
  assigned_risk_prem:     362,   // AssignedRiskSurcharge_FactoredPremiumAmount
  assigned_risk_addl_mod: 363,   // AssignedRiskAdditionalPremium_ModificationFactor
  assigned_risk_addl_prem: 364,  // AssignedRiskAdditionalPremium_FactoredPremiumAmount
  other_coverage_desc_c:  365,
  other_mod_c:            366,
  other_prem_c:           367,
  schedule_rating_mod:    368,   // ScheduleRating_ModificationFactor
  schedule_rating_prem:   369,   // ScheduleRating_FactoredPremiumAmount
  ccpap_mod:              370,   // ContractingClassPremiumAdjustmentProgram_ModificationFactor
  ccpap_prem:             371,   // ContractingClassPremiumAdjustmentProgram_FactoredPremiumAmount
  standard_premium_mod:   372,   // StandardPremium_ModificationFactor
  standard_premium_prem:  373,   // StandardPremium_FactoredPremiumAmount
  premium_discount_mod:   374,   // PremiumDiscount_ModificationFactor
  premium_discount_prem:  375,   // PremiumDiscount_FactoredPremiumAmount
  expense_constant:       376,   // ExpenseConstant_PremiumAmount
  taxes_fees:             377,   // TaxesFeeAssessment_PremiumAmount
  other_coverage_desc_d:  378,
  other_mod_d:            379,
  other_prem_d:           380,
  state_total_est_premium: 381,  // RateState_TotalEstimatedAnnualPremiumAmount
  state_minimum_premium:  382,   // RateState_MinimumPremiumAmount
  state_deposit_premium:  383,   // RateState_DepositPremiumAmount
  state_remarks:          384,   // RateState_RemarkText

  // ── Page 3 — Prior Coverage / Loss History [385-426] ──
  page3_customer_id:      385,   // Producer_CustomerIdentifier (page 3)
  // [386] CHK
  prior_year_1:           387,   // PriorCoverage_EffectiveYear_A
  prior_wc_carrier_1:     388,   // PriorCoverage_InsurerFullName_A
  prior_wc_policy_1:      389,   // PriorCoverage_PolicyNumberIdentifier_A
  prior_wc_premium_1:     390,   // PriorCoverage_TotalPremiumAmount_A
  prior_mod_1:            391,   // PriorCoverage_ModificationFactor_A
  prior_claims_1:         392,   // LossHistory_ClaimCount_A
  prior_paid_1:           393,   // LossHistory_PaidAmount_A
  prior_reserved_1:       394,   // LossHistory_ReservedAmount_A
  prior_year_2:           395,
  prior_wc_carrier_2:     396,
  prior_wc_policy_2:      397,
  prior_wc_premium_2:     398,
  prior_mod_2:            399,
  prior_claims_2:         400,
  prior_paid_2:           401,
  prior_reserved_2:       402,
  prior_year_3:           403,
  prior_wc_carrier_3:     404,
  prior_wc_policy_3:      405,
  prior_wc_premium_3:     406,
  prior_mod_3:            407,
  prior_claims_3:         408,
  prior_paid_3:           409,
  prior_reserved_3:       410,
  prior_year_4:           411,
  prior_wc_carrier_4:     412,
  prior_wc_policy_4:      413,
  prior_wc_premium_4:     414,
  prior_mod_4:            415,
  prior_claims_4:         416,
  prior_paid_4:           417,
  prior_reserved_4:       418,
  prior_year_5:           419,
  prior_wc_carrier_5:     420,
  prior_wc_policy_5:      421,
  prior_wc_premium_5:     422,
  prior_mod_5:            423,
  prior_claims_5:         424,
  prior_paid_5:           425,
  prior_reserved_5:       426,

  // ── Nature of Business / Questions [427-477] ──
  description_of_operations: 427, // CommercialPolicy_OperationsDescription
  // Questions are Y/N code + explanation pairs
  q_aircraft_watercraft_code: 428,
  q_aircraft_watercraft_expl: 429,
  q_hazardous_material_code: 430,
  q_hazardous_material_expl: 431,
  q_underground_above15_code: 432,
  q_underground_above15_expl: 433,
  q_vessels_docks_bridges_code: 434,
  q_vessels_docks_bridges_expl: 435,
  q_other_business_code:    436,
  q_other_business_expl:    437,
  q_subcontractors_code:    438,
  q_subcontractors_expl:    439,
  q_sublet_no_certs_code:   440,
  q_sublet_no_certs_expl:   441,
  q_safety_program_code:    442,
  q_safety_program_expl:    443,
  q_group_transport_code:   444,
  q_group_transport_expl:   445,
  q_under16_over60_code:    446,
  q_under16_over60_expl:    447,
  q_seasonal_employees_code: 448,
  q_seasonal_employees_expl: 449,
  q_volunteer_labor_code:   450,
  q_volunteer_labor_expl:   451,
  q_handicap_code:          452,
  q_handicap_expl:          453,
  q_travel_out_state_code:  454,
  q_travel_out_state_expl:  455,
  q_athletic_teams_code:    456,
  q_athletic_teams_expl:    457,

  // ── Page 4 — More Questions [458-477] ──
  page4_customer_id:      458,   // Producer_CustomerIdentifier (page 4)
  q_physicals_code:        459,
  q_physicals_expl:        460,
  q_other_insurance_code:  461,
  q_other_insurance_expl:  462,
  q_declined_cancelled_code: 463,
  q_declined_cancelled_expl: 464,
  q_health_plans_code:     465,
  q_health_plans_expl:     466,
  q_work_other_biz_code:   467,
  q_work_other_biz_expl:   468,
  q_lease_employees_code:  469,
  q_lease_employees_expl:  470,
  q_at_home_code:          471,
  q_at_home_count:         472,
  q_at_home_expl:          473,
  q_tax_liens_code:        474,
  q_tax_liens_expl:        475,
  q_unpaid_premium_code:   476,
  q_unpaid_premium_expl:   477,

  // [478] CHK
  // ── Signature [479-483] ──
  insured_initials:        479,  // NamedInsured_Initials
  insured_signature:       480,  // NamedInsured_Signature
  signature_date:          481,  // NamedInsured_SignatureDate
  producer_signature:      482,  // Producer_AuthorizedRepresentative_Signature
  national_producer_number: 483, // Producer_NationalIdentifier
};

// ── ACORD 131 (2016/04) — Umbrella / Excess Liability — 396 fields ──
// Verified: 332 TXT, 64 CHK via /pdf-diagnostic.
// CHK blocks: [8-15] transaction type (New/Renewal, Umbrella/Excess, Occurrence/Claims-Made,
//   Voluntary/Proposed/Current), [109-110] misc, [153] misc,
//   [164-204] coverage/exposure checklist (page 2), [236-239] misc,
//   [241-243] misc, [332-334] misc, [348-351] misc
// Tab order: header → policy CHKs → limits → EBL → locations → underlying → exposure → signature
export const ACORD_131_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 — Header [0-7] TXT ──
  agency_name:              0,   // Agency
  agency_customer_id:       1,   // Agency Customer ID
  carrier:                  2,   // Carrier
  naic_code:                3,   // NAIC Code
  policy_number:            4,   // Policy Number
  effective_date:           5,   // Effective Date
  insured_name:             6,   // Named Insured(s)
  // [7] = transaction_date or misc date

  // [8-15] CHK = Transaction type checkboxes

  // ── Policy Information / Limits [16-23] TXT ──
  retroactive_date:        16,   // Retroactive Date
  each_occurrence_limit:   17,   // Limit of Liability - Each Occurrence ($)
  aggregate_limit:         18,   // Limit of Liability - Aggregate ($)
  retained_limit_occurrence: 19, // Retained Limit ($)
  expiring_policy_number:  21,   // Expiring Policy #

  // ── Employee Benefits Liability [24-28] TXT ──
  ebl_each_employee:       24,   // EBL Limit (Each Employee)
  ebl_aggregate:           25,   // EBL Aggregate Limit
  ebl_retained_limit:      26,   // EBL Retained Limit
  ebl_retroactive_date:    27,   // EBL Retroactive Date
  benefit_program_name:    28,   // Name of Benefit Program

  // ── Primary Location & Subsidiaries [29-70] TXT ──
  primary_location_name:   29,   // Row 1 Name
  primary_location_address: 30,  // Row 1 Location
  primary_description:     31,   // Row 1 Description
  annual_payroll:          32,   // Row 1 Annual Payroll
  annual_gross_sales:      33,   // Row 1 Annual Gross Sales
  total_employees:         35,   // Row 1 # Employees

  // ── Underlying Insurance — Auto [71-77] TXT ──
  underlying_auto_carrier:      71,
  underlying_auto_bi_ea_acc:    74,
  underlying_auto_bi_ea_per:    75,
  underlying_auto_pd:           76,
  underlying_auto_premium:      77,

  // ── Underlying Insurance — GL [78-95] TXT ──
  underlying_gl_carrier:        78,
  underlying_gl_occurrence:     81,
  underlying_gl_aggregate:      84,
  underlying_gl_products:       85,
  underlying_gl_personal:       86,
  underlying_gl_premium:        87,

  // ── Underlying Insurance — Employers Liability [96-108] TXT ──
  underlying_el_carrier:        96,
  underlying_el_each_accident:  99,
  underlying_el_disease_employee: 100,
  underlying_el_disease_policy: 101,
  underlying_el_premium:        102,

  // ── Page 5 — Remarks / Signature ──
  umbrella_remarks:        380,
  producer_name:           388,
  producer_license_no:     389,
  signature_date:          390,
  national_producer_number: 391,
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


