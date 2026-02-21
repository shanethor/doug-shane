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
// ACORD 126 (2016/09) — Commercial General Liability Section
// 279 fields total — one of the most complex ACORD forms
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

  // Schedule of Hazards (rows 1–4)
  hazard_loc_1:             "LOC 1",
  hazard_code_1:            "CLASS CODE 1",
  hazard_classification_1:  "CLASSIFICATION 1",
  hazard_exposure_1:        "EXPOSURE 1",
  hazard_rate_1:            "RATE 1",
  hazard_premium_1:         "PREMIUM 1",
  hazard_loc_2:             "LOC 2",
  hazard_code_2:            "CLASS CODE 2",
  hazard_classification_2:  "CLASSIFICATION 2",
  hazard_exposure_2:        "EXPOSURE 2",
  hazard_rate_2:            "RATE 2",
  hazard_premium_2:         "PREMIUM 2",
  hazard_loc_3:             "LOC 3",
  hazard_code_3:            "CLASS CODE 3",
  hazard_classification_3:  "CLASSIFICATION 3",
  hazard_exposure_3:        "EXPOSURE 3",
  hazard_premium_3:         "PREMIUM 3",
  hazard_loc_4:             "LOC 4",
  hazard_code_4:            "CLASS CODE 4",
  hazard_classification_4:  "CLASSIFICATION 4",
  hazard_exposure_4:        "EXPOSURE 4",
  hazard_premium_4:         "PREMIUM 4",

  // Claims-Made
  retroactive_date:         "RETROACTIVE DATE",
  entry_date_claims_made:   "ENTRY DATE",

  // Employee Benefits Liability
  ebl_deductible_per_claim: "EBL DEDUCTIBLE",
  ebl_num_employees:        "NUMBER OF EMPLOYEES",
  ebl_retroactive_date:     "EBL RETROACTIVE DATE",

  // Contractors (Yes/No questions)
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
  "acord-126": ACORD_126_FIELD_MAP,
  "acord-127": ACORD_127_FIELD_MAP,
  "acord-130": ACORD_130_FIELD_MAP,
  "acord-131": ACORD_131_FIELD_MAP,
  "acord-140": ACORD_140_FIELD_MAP,
  "acord-75":  ACORD_75_FIELD_MAP,
};

/**
 * Paths to the official fillable PDFs in /public/acord-fillable/
 * NOTE: ACORD 125 and ACORD 25 are XFA-format and excluded until
 * AcroForm-compatible versions are uploaded.
 */
export const FILLABLE_PDF_PATHS: Record<string, string> = {
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

// ── ACORD 126 (2016/09) — Commercial General Liability Section — 279 fields ──
//
// Field type layout (verified via /pdf-diagnostic indexed fill):
//   [0]  TXT  agency_name
//   [1]  TXT  agency_customer_id
//   [2]  TXT  carrier
//   [3]  TXT  naic_code
//   [4]  TXT  policy_number
//   [5]  TXT  effective_date
//   [6]  TXT  insured_name
//   [7]  TXT  (date / transaction field)
//   [8]  CHK  (Claims Made checkbox)
//   [9]  CHK  (Occurrence checkbox)
//   [10] CHK  (Owner's & Contractor's checkbox)
//   [11] CHK  (other coverage checkbox)
//   [12] CHK  (checkbox)
//   [13] TXT  general_aggregate
//   [14] CHK  (checkbox)
//   [15] TXT  products_aggregate
//   [16] CHK  (checkbox)
//   [17] TXT  personal_adv_injury
//   [18] CHK  (checkbox)
//   [19] TXT  each_occurrence
//   [20] TXT  fire_damage
//   [21] CHK  (checkbox)
//   [22] CHK  (checkbox)
//   [23] TXT  medical_payments
//   [24] CHK  (checkbox)
//   [25] CHK  (checkbox)
//   [26] CHK  (checkbox)
//   [27] CHK  (checkbox)
//   [28] TXT  ebl_limit
//   [29] TXT  deductible_pd
//   [30] TXT  deductible_bi
//   [31] TXT  other_coverages_endorsements
//   ...  TXT  Schedule of Hazards rows follow
export const ACORD_126_INDEX_MAP: AcordIndexMap = {
  // Header — Page 1
  agency_name:            0,   // AGENCY
  agency_customer_id:     1,   // AGENCY CUSTOMER ID
  carrier:                2,   // CARRIER
  naic_code:              3,   // NAIC CODE
  policy_number:          4,   // POLICY NUMBER
  effective_date:         5,   // EFFECTIVE DATE
  insured_name:           6,   // APPLICANT / FIRST NAMED INSURED

  // Coverage Limits — actual TXT fields after checkbox block
  general_aggregate:     13,   // TXT — verified [13] is TXT
  products_aggregate:    15,   // TXT — verified [15] is TXT
  personal_adv_injury:   17,   // TXT — verified [17] is TXT
  each_occurrence:       19,   // TXT — verified [19] is TXT
  fire_damage:           20,   // TXT — verified [20] is TXT
  medical_payments:      23,   // TXT — verified [23] is TXT
  ebl_limit:             28,   // TXT — EBL limit field
  deductible_pd:         29,   // TXT
  deductible_bi:         30,   // TXT
  other_coverages_endorsements: 31,  // TXT

  // Schedule of Hazards — TXT fields continuing from [32]+
  // Exact positions TBD from full indexed view; approximate:
  hazard_loc_1:          32,
  hazard_code_1:         33,
  hazard_exposure_1:     34,
  hazard_classification_1: 35,
  hazard_loc_2:          36,
  hazard_code_2:         37,
  hazard_exposure_2:     38,
  hazard_classification_2: 39,
  hazard_loc_3:          40,
  hazard_code_3:         41,
  hazard_exposure_3:     42,
  hazard_classification_3: 43,
};

// ── ACORD 127 (2010/05) — Business Auto Section — 636 fields ──
// Verified: 472 TXT, 164 CHK. Only [8] is CHK in the first ~200 fields.
// CHKs appear later for coverage symbols per vehicle and yes/no questions.
// Tab order: header → vehicle schedule → coverage limits → driver schedule → garaging → yes/no
export const ACORD_127_INDEX_MAP: AcordIndexMap = {
  // Header [0-7] TXT
  agency_name:          0,
  agency_customer_id:   1,
  carrier:              2,
  naic_code:            3,
  policy_number:        4,
  effective_date:       5,
  insured_name:         6,
  // [7] TXT = expiration / misc date
  // [8] CHK = business type indicator
  // Vehicle Schedule — each row: Year, Make, Model, Body Type, VIN, Cost New, Radius, GVW
  vehicle_1_year:        9,
  vehicle_1_make:       10,
  vehicle_1_model:      11,
  vehicle_1_body_type:  12,
  vehicle_1_vin:        13,
  vehicle_1_cost_new:   14,
  vehicle_1_radius:     15,
  vehicle_1_gvw:        16,
  vehicle_2_year:       17,
  vehicle_2_make:       18,
  vehicle_2_model:      19,
  vehicle_2_vin:        21,
  vehicle_2_cost_new:   22,
  vehicle_2_radius:     23,
  vehicle_3_year:       25,
  vehicle_3_make:       26,
  vehicle_3_model:      27,
  vehicle_3_vin:        29,
  vehicle_3_cost_new:   30,
  vehicle_4_year:       33,
  vehicle_4_make:       34,
  vehicle_4_model:      35,
  vehicle_4_vin:        37,
  vehicle_5_year:       41,
  vehicle_5_make:       42,
  vehicle_5_model:      43,
  vehicle_5_vin:        45,
  // Garaging address block
  garaging_street:      65,
  garaging_city:        66,
  garaging_state:       67,
  garaging_zip:         68,
  // Driver Schedule — Name, License State, License #, DOB, Date Hired
  driver_1_name:        80,
  driver_1_license:     81,
  driver_1_dob:         82,
  driver_2_name:        88,
  driver_2_license:     89,
  driver_2_dob:         90,
  driver_3_name:        96,
  driver_3_license:     97,
  driver_3_dob:         98,
  driver_4_name:       104,
  driver_4_license:    105,
  driver_4_dob:        106,
  driver_5_name:       112,
  driver_5_license:    113,
  driver_5_dob:        114,
  // General info / remarks
  auto_remarks:        130,
  auto_general_remarks: 131,
  // Signature block
  producer_name:       135,
  producer_license_no: 136,
  national_producer_number: 137,
  signature_date:      138,
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

// ── ACORD 125 — Commercial Insurance Application — Index Map ──
// Placeholder indices — run /pdf-diagnostic on 125.pdf and refine with "Show All Indices"
// Current mapping follows typical ACORD tab order: header → LOB → policy → applicant → premises → general info → remarks → signature
export const ACORD_125_INDEX_MAP: AcordIndexMap = {
  // Header / Agency block
  agency_name:          0,
  agency_phone:         1,
  agency_fax:           2,
  agency_email:         3,
  agency_customer_id:   4,
  contact_name:         5,
  carrier:              6,
  naic_code:            7,
  company_program_name: 8,
  program_code:         9,
  policy_number:       10,
  underwriter:         11,
  underwriter_office:  12,
  transaction_date:    13,

  // Lines of Business checkboxes — these need diagnostic verification
  // (indices will be CHK type fields interspersed with premium TXT fields)

  // Policy Information
  proposed_eff_date:   30,
  proposed_exp_date:   31,
  deposit_amount:      32,
  minimum_premium:     33,
  policy_premium:      34,

  // Applicant Information
  applicant_name:      40,
  mailing_address:     41,
  city:                42,
  state:               43,
  zip:                 44,
  gl_code:             45,
  sic_code:            46,
  naics_code:          47,
  fein:                48,
  business_phone:      49,
  website:             50,

  // Other Named Insured
  other_named_insured: 55,

  // Contact Information
  contact_name_1:      60,
  contact_phone_1:     61,
  contact_email_1:     62,

  // Premises Information
  premises_address:    70,
  premises_city:       71,
  premises_state:      72,
  premises_zip:        73,
  full_time_employees: 74,
  part_time_employees: 75,
  premises_description:76,

  // Nature of Business
  annual_revenues:     80,
  occupied_sq_ft:      81,
  total_building_sq_ft:82,
  date_business_started:83,
  description_of_operations: 84,

  // General Information (Y/N)
  subsidiary_of_another: 90,
  has_subsidiaries:      91,
  safety_program:        92,
  exposure_flammables:   93,
  other_insurance_same_company: 94,
  policy_declined_cancelled: 95,
  bankruptcy:            96,
  general_info_remarks:  100,

  // Remarks
  remarks:              110,

  // Prior Carrier
  prior_carrier_1:      115,
  prior_policy_number_1:116,
  prior_gl_premium_1:   117,

  // Loss History
  loss_history:         120,

  // Signature
  producer_name:        130,
  producer_license_no:  131,
  national_producer_number: 132,
  signature_date:       133,
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


