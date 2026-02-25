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
// ACORD 140 (2014/12) — Property Section
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

// ── ACORD 126 — Commercial General Liability Section ──
// New PDF (Acord126-3.pdf) — 3 pages. Indices verified via /pdf-diagnostic "Fill All TXT".
// Gaps in numbering are CHK (checkbox) fields.
export const ACORD_126_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 (P1) — Header ──
  agency_customer_id:         1,   // Agency Customer ID
  transaction_date:           2,   // Date (MM/DD/YYYY)
  agency_name:                3,   // Agency
  policy_number:              4,   // Policy Number
  effective_date:             5,   // Effective Date
  carrier:                    6,   // Carrier
  naic_code:                  7,   // NAIC Code
  insured_name:               8,   // Applicant / First Named Insured

  // ── Coverages / Limits ──
  // Gaps 9-13 are checkboxes (CGL, Claims Made, Occurrence, Owner's & Contractor's, etc.)
  // [14] text field in coverages area (possibly related to coverage trigger)

  deductible_pd:             16,   // Deductible — Property Damage $
  deductible_bi:             18,   // Deductible — Bodily Injury $
  deductible_applies_1:      20,   // Deductible applies field 1
  deductible_applies_2:      21,   // Deductible applies field 2

  general_aggregate:         24,   // General Aggregate $
  aggregate_applies_other:   29,   // Limit Applies Per — OTHER text
  products_aggregate:        30,   // Products & Completed Operations Aggregate $
  personal_adv_injury:       31,   // Personal & Advertising Injury $
  each_occurrence:           32,   // Each Occurrence $
  fire_damage:               33,   // Damage to Rented Premises (each occurrence) $
  medical_payments:          34,   // Medical Expense (Any one person) $
  ebl_limit:                 35,   // Employee Benefits $
  coverage_subtotal:         36,   // Coverage subtotal field
  coverage_total:            37,   // Coverage total field

  // ── Premiums column ──
  premiums_prem_ops:         38,   // Premises/Operations premium
  premiums_products:         39,   // Products premium
  premiums_other:            40,   // Other premium
  premiums_total:            41,   // Total premium

  // ── Other Coverages ──
  other_coverages_endorsements: 42, // Other Coverages, Restrictions and/or Endorsements

  // Gaps 43-46 = Wisconsin section checkboxes

  // ── Schedule of Hazards — Row 1 ──
  // Columns: LOC# | HAZ# | CLASS CODE | PREMIUM BASIS | EXPOSURE | TERR | RATE PO | RATE PROD | PREM PO | PREM PROD
  hazard_loc_1:              47,
  hazard_bldg_1:             48,   // HAZ #
  hazard_code_1:             49,   // Class Code
  hazard_premium_basis_1:    50,   // Premium Basis
  hazard_exposure_1:         51,   // Exposure
  hazard_terr_1:             52,   // Territory
  hazard_rate_premops_1:     53,   // Rate Prem/Ops
  hazard_rate_products_1:    54,   // Rate Products
  hazard_premium_premops_1:  55,   // Premium Prem/Ops
  hazard_premium_products_1: 56,   // Premium Products
  hazard_classification_1:   57,   // Classification Description

  // ── Schedule of Hazards — Row 2 ──
  hazard_loc_2:              58,
  hazard_bldg_2:             59,
  hazard_code_2:             60,
  hazard_premium_basis_2:    61,
  hazard_exposure_2:         62,
  hazard_terr_2:             63,
  hazard_rate_premops_2:     64,
  hazard_rate_products_2:    65,
  hazard_premium_premops_2:  66,
  hazard_premium_products_2: 67,
  hazard_classification_2:   68,

  // ── Schedule of Hazards — Row 3 ──
  hazard_loc_3:              69,
  hazard_bldg_3:             70,
  hazard_code_3:             71,
  hazard_premium_basis_3:    72,
  hazard_exposure_3:         73,
  hazard_terr_3:             74,
  hazard_rate_premops_3:     75,
  hazard_rate_products_3:    76,
  hazard_premium_premops_3:  77,
  hazard_premium_products_3: 78,
  hazard_classification_3:   79,   // Classification Description Row 3

  // ── CHECKBOX FIELDS (Page 1) ──
  chk_commercial_general_liability: 9,   // ☐ CGL
  chk_claims_made:                 10,   // ☐ Claims Made
  chk_occurrence:                  11,   // ☐ Occurrence
  chk_owners_contractors:          12,   // ☐ Owner's & Contractor's Protective
  chk_other_coverage:              13,   // ☐ Other Coverage
  chk_pd_deductible:               15,   // ☐ Property Damage Deductible
  chk_bi_deductible:               17,   // ☐ Bodily Injury Deductible
  chk_other_deductible:            19,   // ☐ Other Deductible
  chk_deductible_per_claim:        22,   // ☐ Per Claim
  chk_deductible_per_occurrence:   23,   // ☐ Per Occurrence
  chk_aggregate_per_policy:        25,   // ☐ Per Policy
  chk_aggregate_per_project:       26,   // ☐ Per Project
  chk_aggregate_per_location:      27,   // ☐ Per Location
  chk_aggregate_other:             28,   // ☐ Other
  chk_um_available:                43,   // ☐ UM Coverage Available
  chk_um_not_available:            44,   // ☐ UM Not Available
  chk_med_pay_available:           45,   // ☐ Med Pay Available
  chk_med_pay_not_available:       46,   // ☐ Med Pay Not Available

  // ── Page 2 — Claims-Made (indices 80-85) ──
  retroactive_date:              80,   // ClaimsMade_ProposedRetroactiveDate_A
  entry_date_claims_made:        81,   // ClaimsMade_UninterruptedCoverageEntryDate_A
  claims_made_q1_code:           82,   // AAHCode — Any product/work/accident excluded?
  claims_made_q1_explanation:    83,   // Explanation
  claims_made_q2_code:           84,   // AAICode — Tail coverage purchased?
  claims_made_q2_explanation:    85,   // Explanation

  // ── Employee Benefits Liability (indices 86-89) ──
  ebl_deductible_per_claim:      86,   // EBL Per Claim Deductible Amount
  ebl_num_employees:             87,   // Employee Count
  ebl_num_covered:               88,   // Employees Covered Count
  ebl_retroactive_date:          89,   // EBL Retroactive Date

  // ── Contractors Questions (indices 90-106) ──
  contractors_q1_code:           90,   // AABCode — Draw plans for others?
  contractors_q1_explanation:    91,   // Explanation
  contractors_q2_code:           92,   // AAICode — Blasting/explosives?
  contractors_q2_explanation:    93,   // Explanation
  contractors_q3_code:           94,   // AACCode — Excavation/underground?
  contractors_q3_explanation:    95,   // Explanation
  contractors_q4_code:           96,   // ABBCode — Subs carry lower limits?
  contractors_q4_explanation:    97,   // Explanation
  contractors_q5_code:           98,   // AADCode — Subs without COI?
  contractors_q5_explanation:    99,   // Explanation
  contractors_q6_code:          100,   // AAECode — Lease equipment to others?
  contractors_q6_explanation:   101,   // Explanation
  paid_to_subcontractors:       102,   // Subcontractors Paid Amount
  pct_work_subcontracted:       103,   // Percent Subcontracted
  contractors_ft_employees:     104,   // Full Time Employee Count
  contractors_pt_employees:     105,   // Part Time Employee Count
  type_work_subcontracted:      106,   // Type of Work Subcontracted

  // ── Products / Completed Operations (indices 107-146) ──
  product_name_a:               107,   // Product Name A
  product_gross_sales_a:        108,   // Annual Gross Sales A
  product_units_a:              109,   // Unit Count A
  product_months_market_a:      110,   // In Market Month Count A
  product_expected_life_a:      111,   // Expected Life Month Count A
  product_intended_use_a:       112,   // Intended Use A
  product_components_a:         113,   // Principal Components A
  product_name_b:               114,   // Product Name B
  product_gross_sales_b:        115,   // Annual Gross Sales B
  product_units_b:              116,   // Unit Count B
  product_months_market_b:      117,   // In Market Month Count B
  product_expected_life_b:      118,   // Expected Life Month Count B
  product_intended_use_b:       119,   // Intended Use B
  product_components_b:         120,   // Principal Components B
  product_name_c:               121,   // Product Name C
  product_gross_sales_c:        122,   // Annual Gross Sales C
  product_units_c:              123,   // Unit Count C
  product_months_market_c:      124,   // In Market Month Count C
  product_expected_life_c:      125,   // Expected Life Month Count C
  product_intended_use_c:       126,   // Intended Use C
  product_components_c:         127,   // Principal Components C
  products_q1_code:             128,   // AAJCode — Install/service products?
  products_q1_explanation:      129,   // Explanation
  products_q2_code:             130,   // ABACode — Distribution?
  products_q3_code:             131,   // ABBCode — R&D new products?
  products_q3_explanation:      132,   // Explanation
  products_q4_code:             133,   // ABCCode — Guarantees/warranties?
  products_q4_explanation:      134,   // Explanation
  products_q5_code:             135,   // ABDCode — Aircraft industry?
  products_q5_explanation:      136,   // Explanation
  products_q6_code:             137,   // ABECode — Products recalled/discontinued?
  products_q6_explanation:      138,   // Explanation
  products_q7_code:             139,   // ABFCode — Others' products under applicant label?
  products_q7_explanation:      140,   // Explanation
  products_q8_code:             141,   // ABGCode — Products under label of others?
  products_q8_explanation:      142,   // Explanation
  products_q9_code:             143,   // ABHCode — Vendor coverage required?
  products_q9_explanation:      144,   // Explanation
  products_q10_code:            145,   // ABICode — Named insured sell to other named insured?
  products_q10_explanation:     146,   // Explanation

  // ── Additional Interest (indices 147-170) ──
  chk_126_addl_interest_attached: 147, // ☐ Additional Interest Attached
  chk_126_addl_insured:          148,  // ☐ Additional Insured
  chk_126_employee_lessor:       149,  // ☐ Employee as Lessor
  chk_126_lenders_loss_payable:  150,  // ☐ Lender's Loss Payable
  chk_126_lienholder:            151,  // ☐ Lienholder
  chk_126_loss_payee:            152,  // ☐ Loss Payee
  chk_126_mortgagee:             153,  // ☐ Mortgagee
  chk_126_interest_other:        154,  // ☐ Other
  addl_interest_126_other_desc:  155,  // Other Description
  addl_interest_126_rank:        156,  // Interest Rank
  chk_126_cert_required:         157,  // ☐ Certificate Required
  addl_interest_126_name:        158,  // Full Name
  addl_interest_126_address:     159,  // Address Line One
  addl_interest_126_address2:    160,  // Address Line Two
  addl_interest_126_city:        161,  // City
  addl_interest_126_state:       162,  // State
  addl_interest_126_zip:         163,  // Postal Code
  addl_interest_126_country:     164,  // Country Code
  addl_interest_126_account:     165,  // Account Number
  addl_interest_126_location:    166,  // Location Producer Identifier
  addl_interest_126_building:    167,  // Building Producer Identifier
  addl_interest_126_sched_class: 168,  // Scheduled Item Class Code
  addl_interest_126_sched_id:    169,  // Scheduled Item Producer Identifier
  addl_interest_126_item_desc:   170,  // Item Description

  // ── General Information Questions (indices 171-247) ──
  gi_q1_code:                   171,   // ABJCode — Medical facilities/professionals?
  gi_q1_explanation:            172,   // Explanation
  gi_q2_code:                   173,   // ACACode — Radioactive materials?
  gi_q2_explanation:            174,   // Explanation
  gi_q3_code:                   175,   // ACJCode — Hazardous material ops?
  gi_q3_explanation:            176,   // Explanation
  gi_q4_code:                   177,   // ACBCode — Operations sold/acquired last 5 years?
  gi_q4_explanation:            178,   // Explanation
  gi_q5_code:                   179,   // ACCCode — Machinery/equipment loaned/rented?
  gi_q5_explanation:            180,   // Explanation
  chk_equip_small_tools_a:      181,   // ☐ Small Tools A
  chk_equip_large_a:            182,   // ☐ Large Equipment A
  equip_instruction_a:          183,   // Equipment Instruction Given Code A
  gi_q5_explanation_b:          184,   // Explanation B (additional equipment)
  chk_equip_small_tools_b:      185,   // ☐ Small Tools B
  chk_equip_large_b:            186,   // ☐ Large Equipment B
  equip_instruction_b:          187,   // Equipment Instruction Given Code B
  gi_q6_code:                   188,   // AAHCode — Watercraft/docks/floats?
  gi_q6_explanation:            189,   // Explanation
  gi_q7_code:                   190,   // ACDCode — Parking facilities?
  gi_q7_explanation:            191,   // Explanation
  gi_q8_code:                   192,   // KAGCode — Fee charged for parking?
  gi_q8_explanation:            193,   // Explanation
  gi_q9_code:                   194,   // ACECode — Recreational facilities?
  gi_q9_explanation:            195,   // Explanation
  gi_q10_code:                  196,   // KAACode — Apartments?
  gi_q10_apartment_count:       197,   // Apartment Count
  gi_q10_apartment_area:        198,   // Apartment Area
  gi_q10_other_lodging:         199,   // Other Lodging Operations Description
  gi_q11_code:                  200,   // KAHCode — Swimming pool?
  chk_pool_fence:               201,   // ☐ Approved Fence
  chk_pool_limited_access:      202,   // ☐ Limited Access
  chk_pool_diving_board:        203,   // ☐ Diving Board
  chk_pool_slide:               204,   // ☐ Slide
  chk_pool_above_ground:        205,   // ☐ Above Ground
  chk_pool_in_ground:           206,   // ☐ In Ground
  chk_pool_lifeguard:           207,   // ☐ Life Guard
  gi_q12_code:                  208,   // ACFCode — Sporting/social events?
  gi_q12_explanation:           209,   // Explanation
  gi_q13_code:                  210,   // KABCode — Athletic teams?
  athletic_sport_a:             211,   // Sport Description A
  athletic_contact_a:           212,   // Contact Sport Code A
  chk_athletic_12under_a:       213,   // ☐ 12 and Under A
  chk_athletic_13to18_a:        214,   // ☐ 13-18 A
  chk_athletic_over18_a:        215,   // ☐ Over 18 A
  athletic_sponsorship_a:       216,   // Sponsorship Extent A
  athletic_sport_b:             217,   // Sport Description B
  athletic_contact_b:           218,   // Contact Sport Code B
  chk_athletic_12under_b:       219,   // ☐ 12 and Under B
  chk_athletic_13to18_b:        220,   // ☐ 13-18 B
  chk_athletic_over18_b:        221,   // ☐ Over 18 B
  athletic_sponsorship_b:       222,   // Sponsorship Extent B
  gi_q14_code:                  223,   // ACGCode — Structural alterations?
  gi_q14_explanation:           224,   // Explanation
  gi_q15_code:                  225,   // ACHCode — Demolition exposure?
  gi_q15_explanation:           226,   // Explanation
  gi_q16_code:                  227,   // AABCode — Active joint ventures?
  gi_q16_explanation:           228,   // Explanation
  gi_q17_code:                  229,   // AACCode — Uninsured subcontractors?
  gi_q17_sub_name_a:            230,   // Subcontractor Name A
  gi_q17_sub_wc_a:              231,   // WC Carried Code A
  gi_q17_sub_name_b:            232,   // Subcontractor Name B
  gi_q17_sub_wc_b:              233,   // WC Carried Code B
  gi_q17_sub_name_c:            234,   // Subcontractor Name C
  gi_q17_sub_wc_c:              235,   // WC Carried Code C
  gi_q17_sub_name_d:            236,   // Subcontractor Name D
  gi_q17_sub_wc_d:              237,   // WC Carried Code D
  gi_q18_code:                  238,   // AADCode — Labour interchange?
  gi_q18_explanation:           239,   // Explanation
  gi_q19_code:                  240,   // AAECode — Day care facilities?
  gi_q19_explanation:           241,   // Explanation
  gi_q20_code:                  242,   // AAFCode — Crimes last 3 years?
  gi_q20_explanation:           243,   // Explanation
  gi_q21_code:                  244,   // AAGCode — Formal safety/security policy?
  gi_q21_explanation:           245,   // Explanation
  gi_q22_code:                  246,   // AAGCode — Business/promotional literature?
  gi_q22_explanation:           247,   // Explanation

  // ── Remarks & Signature (indices 248-254) ──
  remarks_126:                  248,   // RemarkText_B
  producer_126_signature:       249,   // Producer Signature
  producer_126_name:            250,   // Producer Full Name
  producer_126_license:         251,   // State License Identifier
  insured_126_signature:        252,   // Named Insured Signature
  signature_126_date:           253,   // Signature Date
  national_producer_126:        254,   // National Producer Identifier
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
// ── ACORD 131 (2016/04) — Commercial Umbrella / Excess — 396 fields ──
// Verified: 332 TXT, 64 CHK.  Indices from /pdf-diagnostic "Fill All TXT" export.
export const ACORD_131_INDEX_MAP: AcordIndexMap = {
  // ── Page 1 (P1) — Header ──
  agency_customer_id:       0,
  completion_date:          1,
  agency_name:              2,
  policy_number:            3,
  effective_date:           4,
  carrier:                  5,
  naic_code:                6,
  insured_name:             7,

  // [8-15] CHK = Transaction type checkboxes

  // ── Policy / Limits ──
  transaction_type_other:  16,
  expiring_policy_number:  17,
  proposed_retroactive_date: 18,
  current_retroactive_date: 19,
  each_occurrence_limit:   20,
  aggregate_limit:         21,
  other_coverage_limit:    22,
  other_coverage_description: 23,
  retained_limit_occurrence: 24,
  first_dollar_defense:    25,

  // ── Employee Benefits Liability ──
  ebl_each_employee:       26,
  ebl_aggregate:           27,
  ebl_retained_limit:      28,
  ebl_retroactive_date:    29,
  benefit_program_name:    30,

  // ── Location A ──
  location_id_a:           31,
  location_name_a:         32,
  location_address_a:      33,
  location_city_a:         34,
  location_state_a:        35,
  location_zip_a:          36,
  operations_description_a: 37,
  total_payroll_a:         38,
  annual_gross_receipts_a: 39,
  foreign_gross_sales_a:   40,
  employee_count_a:        41,

  // ── Location B ──
  location_id_b:           42,
  location_name_b:         43,
  location_address_b:      44,
  location_city_b:         45,
  location_state_b:        46,
  location_zip_b:          47,
  operations_description_b: 48,
  total_payroll_b:         49,
  annual_gross_receipts_b: 50,
  foreign_gross_sales_b:   51,
  employee_count_b:        52,

  // ── Location C ──
  location_id_c:           53,
  location_name_c:         54,
  location_address_c:      55,
  location_city_c:         56,
  location_state_c:        57,
  location_zip_c:          58,
  operations_description_c: 59,
  total_payroll_c:         60,
  annual_gross_receipts_c: 61,
  foreign_gross_sales_c:   62,
  employee_count_c:        63,

  // ── Location D ──
  location_id_d:           64,
  location_name_d:         65,
  location_address_d:      66,
  location_city_d:         67,
  location_state_d:        68,
  location_zip_d:          69,
  operations_description_d: 70,
  total_payroll_d:         71,
  annual_gross_receipts_d: 72,
  foreign_gross_sales_d:   73,
  employee_count_d:        74,

  // ── Location E ──
  location_id_e:           75,
  location_name_e:         76,
  location_address_e:      77,
  location_city_e:         78,
  location_state_e:        79,
  location_zip_e:          80,
  operations_description_e: 81,
  total_payroll_e:         82,
  annual_gross_receipts_e: 83,
  foreign_gross_sales_e:   84,
  employee_count_e:        85,

  // ── Location F ──
  location_id_f:           86,
  location_name_f:         87,
  location_address_f:      88,
  location_city_f:         89,
  location_state_f:        90,
  location_zip_f:          91,
  operations_description_f: 92,
  total_payroll_f:         93,
  annual_gross_receipts_f: 94,
  foreign_gross_sales_f:   95,
  employee_count_f:        96,

  // ── Underlying Insurance — Auto ──
  underlying_auto_carrier:      97,
  underlying_auto_policy_number: 98,
  underlying_auto_eff_date:     99,
  underlying_auto_exp_date:    100,
  underlying_auto_csl:         101,
  underlying_auto_bi_ea_acc:   102,
  underlying_auto_bi_ea_per:   103,
  underlying_auto_pd:          104,
  underlying_auto_csl_premium: 105,
  underlying_auto_bi_premium:  106,
  underlying_auto_pd_premium:  107,
  underlying_auto_mod_factor:  108,

  // [109-110] CHK

  // ── Underlying Insurance — GL ──
  underlying_gl_carrier:       111,
  underlying_gl_policy_number: 112,
  underlying_gl_eff_date:      113,
  underlying_gl_exp_date:      114,
  underlying_gl_occurrence:    115,
  underlying_gl_aggregate:     116,
  underlying_gl_products:      117,
  underlying_gl_personal:      118,
  underlying_gl_fire_damage:   119,
  underlying_gl_med_expense:   120,
  underlying_gl_prem_ops_premium: 121,
  underlying_gl_products_premium: 122,
  underlying_gl_other_premium: 123,
  underlying_gl_mod_factor:    124,

  // ── Underlying Insurance — Employers Liability ──
  underlying_el_carrier:         125,
  underlying_el_policy_number:   126,
  underlying_el_eff_date:        127,
  underlying_el_exp_date:        128,
  underlying_el_each_accident:   129,
  underlying_el_disease_employee: 130,
  underlying_el_disease_policy:  131,
  underlying_el_premium:         132,
  underlying_el_mod_factor:      133,

  // ── Underlying Insurance — Other A ──
  underlying_other_a_type:       134,
  underlying_other_a_carrier:    135,
  underlying_other_a_policy_number: 136,
  underlying_other_a_eff_date:   137,
  underlying_other_a_exp_date:   138,
  underlying_other_a_coverage:   139,
  underlying_other_a_csl:        140,
  underlying_other_a_premium:    141,
  underlying_other_a_mod_factor: 142,

  // ── Underlying Insurance — Other B ──
  underlying_other_b_type:       143,
  underlying_other_b_carrier:    144,
  underlying_other_b_policy_number: 145,
  underlying_other_b_eff_date:   146,
  underlying_other_b_exp_date:   147,
  underlying_other_b_coverage:   148,
  underlying_other_b_csl:        149,
  underlying_other_b_premium:    150,
  underlying_other_b_mod_factor: 151,

  // ── Page 2 (P2) ──
  p2_agency_customer_id:   152,

  // [153-155] CHK

  gl_form_edition_date:    156,
  q_excluded_uninsured_code: 157,
  q_excluded_uninsured_explanation: 158,
  gl_claims_retroactive_date: 159,
  gl_claims_entry_date:    160,
  q_tail_coverage_code:    161,
  tail_coverage_eff_date:  162,
  q_tail_coverage_explanation: 163,

  // [164-193] CHK — underlying coverage checkboxes

  underlying_other_coverage_a: 194,
  // [195-196] CHK
  underlying_other_coverage_b: 197,
  // [198-199] CHK
  underlying_other_coverage_c: 200,
  // [201-202] CHK
  underlying_other_coverage_d: 203,
  // [204] CHK
  underlying_info_description: 205,

  // ── Loss History (6 rows) ──
  loss_date_a:             206,
  loss_lob_a:              207,
  loss_description_a:      208,
  loss_paid_a:             209,
  loss_reserved_a:         210,

  loss_date_b:             211,
  loss_lob_b:              212,
  loss_description_b:      213,
  loss_paid_b:             214,
  loss_reserved_b:         215,

  loss_date_c:             216,
  loss_lob_c:              217,
  loss_description_c:      218,
  loss_paid_c:             219,
  loss_reserved_c:         220,

  loss_date_d:             221,
  loss_lob_d:              222,
  loss_description_d:      223,
  loss_paid_d:             224,
  loss_reserved_d:         225,

  loss_date_e:             226,
  loss_lob_e:              227,
  loss_description_e:      228,
  loss_paid_e:             229,
  loss_reserved_e:         230,

  loss_date_f:             231,
  loss_lob_f:              232,
  loss_description_f:      233,
  loss_paid_f:             234,
  loss_reserved_f:         235,

  // [236] CHK

  // ── Care Custody & Control ──
  ccc_location_id:         237,
  // [238-239] CHK
  ccc_property_value:      240,
  // [241-243] CHK
  ccc_insured_liability_other: 244,
  ccc_occupied_area:       245,
  ccc_property_description: 246,

  // ── Vehicle Fleet Schedule ──
  fleet_pp_owned:          247,
  fleet_pp_nonowned:       248,
  fleet_pp_leased:         249,
  fleet_pp_hauled:         250,
  fleet_pp_local:          251,
  fleet_pp_intermediate:   252,
  fleet_pp_long:           253,

  fleet_lt_owned:          254,
  fleet_lt_nonowned:       255,
  fleet_lt_leased:         256,
  fleet_lt_hauled:         257,
  fleet_lt_local:          258,
  fleet_lt_intermediate:   259,
  fleet_lt_long:           260,

  fleet_mt_owned:          261,
  fleet_mt_nonowned:       262,
  fleet_mt_leased:         263,
  fleet_mt_hauled:         264,
  fleet_mt_local:          265,
  fleet_mt_intermediate:   266,
  fleet_mt_long:           267,

  fleet_ht_owned:          268,
  fleet_ht_nonowned:       269,
  fleet_ht_leased:         270,
  fleet_ht_hauled:         271,
  fleet_ht_local:          272,
  fleet_ht_intermediate:   273,
  fleet_ht_long:           274,

  fleet_xht_owned:         275,
  fleet_xht_nonowned:      276,
  fleet_xht_leased:        277,
  fleet_xht_hauled:        278,
  fleet_xht_local:         279,
  fleet_xht_intermediate:  280,
  fleet_xht_long:          281,

  fleet_htt_owned:         282,
  fleet_htt_nonowned:      283,
  fleet_htt_leased:        284,
  fleet_htt_hauled:        285,
  fleet_htt_local:         286,
  fleet_htt_intermediate:  287,
  fleet_htt_long:          288,

  fleet_xhtt_owned:        289,
  fleet_xhtt_nonowned:     290,
  fleet_xhtt_leased:       291,
  fleet_xhtt_hauled:       292,
  fleet_xhtt_local:        293,
  fleet_xhtt_intermediate: 294,
  fleet_xhtt_long:         295,

  fleet_bus_owned:         296,
  fleet_bus_nonowned:      297,
  fleet_bus_leased:        298,
  fleet_bus_hauled:        299,
  fleet_bus_local:         300,
  fleet_bus_intermediate:  301,
  fleet_bus_long:          302,

  // ── Page 3 (P3) — Questions ──
  p3_agency_customer_id:   303,
  advertisers_media_code:  304,
  advertisers_annual_cost: 305,

  q_services_ad_agency_code: 306,
  q_services_ad_agency_explanation: 307,
  q_coverage_agency_policy_code: 308,
  q_coverage_agency_policy_explanation: 309,
  q_aircraft_code:         310,
  q_aircraft_explanation:  311,
  q_explosives_code:       312,
  q_explosives_explanation: 313,
  q_passengers_fee_code:   314,
  q_passengers_fee_explanation: 315,
  q_units_not_insured_code: 316,
  q_units_not_insured_explanation: 317,
  q_vehicles_leased_code:  318,
  q_vehicles_leased_explanation: 319,
  q_hired_nonowned_code:   320,
  q_hired_nonowned_explanation: 321,
  q_bridge_dam_marine_code: 322,
  q_bridge_dam_marine_explanation: 323,
  contractors_work_description: 324,
  contractors_agreement:   325,
  q_cranes_code:           326,
  q_cranes_explanation:    327,
  q_subcontractors_code:   328,
  q_subcontractors_explanation: 329,
  q_self_insured_code:     330,
  q_self_insured_explanation: 331,

  // [332-335] CHK

  el_other_description:    336,
  q_hospital_code:         337,
  q_hospital_explanation:  338,
  q_doctors_nurses_code:   339,
  q_doctors_nurses_explanation: 340,
  malpractice_doctor_count: 341,
  malpractice_nurse_count: 342,
  malpractice_bed_count:   343,

  // ── Page 4 (P4) ──
  p4_agency_customer_id:   344,
  epa_identifier:          345,
  q_hazardous_materials_code: 346,
  q_hazardous_materials_explanation: 347,

  // [348-351] CHK

  q_missiles_engines_code: 352,
  q_missiles_engines_explanation: 353,
  q_kaq_code:              354,
  q_product_loss_code:     355,
  q_product_loss_explanation: 356,
  product_gross_sales_a:   357,
  product_gross_sales_b:   358,
  product_gross_sales_c:   359,
  protective_liability_description: 360,
  q_watercraft_code:       361,
  watercraft_location_g:   362,
  watercraft_count_a:      363,
  watercraft_length_a:     364,
  watercraft_hp_a:         365,
  watercraft_location_h:   366,
  watercraft_count_b:      367,
  watercraft_length_b:     368,
  watercraft_hp_b:         369,
  property_rating_location_i: 370,
  property_stories_a:      371,
  property_apartments_a:   372,
  property_pools_a:        373,
  property_diving_boards_a: 374,
  property_rating_location_j: 375,
  property_stories_b:      376,
  property_apartments_b:   377,
  property_pools_b:        378,
  property_diving_boards_b: 379,
  umbrella_remarks:        380,

  // ── Page 5 (P5) — Signature ──
  p5_agency_customer_id:   381,
  uninsured_motorists_limit: 382,
  underinsured_motorists_limit: 383,
  medical_payments_limit:  384,
  initials_a:              385,
  initials_b:              386,
  initials_e:              387,
  initials_c:              388,
  initials_d:              389,
  producer_signature:      390,
  producer_name:           391,
  producer_license_no:     392,
  insured_signature:       393,
  signature_date:          394,
  national_producer_number: 395,
};

// ── ACORD 140 (2014/12) — Property Section — 355 fields ──
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

  // Lines of Business — CHK checkboxes (odd indices) and premium amounts (even indices)
  chk_lob_boiler:        31,   // ☐ Boiler & Machinery
  boiler_premium:        32,   // BoilerAndMachineryLineOfBusiness_PremiumAmount_A
  chk_lob_auto:          33,   // ☐ Business Auto
  auto_premium:          34,   // CommercialVehicleLineOfBusiness_PremiumAmount_A
  chk_lob_bop:           35,   // ☐ Business Owners
  bop_premium:           36,   // BusinessOwnersLineOfBusiness_PremiumAmount_A
  chk_lob_cgl:           37,   // ☐ Commercial General Liability
  lob_commercial_general_liability: 37, // Alias for extraction key
  cgl_premium:           38,   // GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A
  chk_lob_inland_marine: 39,   // ☐ Commercial Inland Marine
  inland_marine_premium: 40,   // CommercialInlandMarineLineOfBusiness_PremiumAmount_A
  chk_lob_property:      41,   // ☐ Commercial Property
  property_premium:      42,   // CommercialPropertyLineOfBusiness_PremiumAmount_A
  chk_lob_crime:         43,   // ☐ Crime
  crime_premium:         44,   // CrimeLineOfBusiness_PremiumAmount_A
  chk_lob_cyber:         45,   // ☐ Cyber & Privacy
  cyber_premium:         46,   // CyberAndPrivacyLineOfBusiness_PremiumAmount_A
  // indices 47-48: Fiduciary / Garage & Dealers CHK
  chk_lob_garage:        49,   // ☐ Garage & Dealers
  garage_premium:        50,   // GarageAndDealersLineOfBusiness_PremiumAmount_A
  chk_lob_liquor:        51,   // ☐ Liquor Liability
  liquor_premium:        52,   // LiquorLiabilityLineOfBusiness_PremiumAmount_A
  // indices 53-56: Motor Carrier / Truckers CHK+premium
  chk_lob_umbrella:      57,   // ☐ Umbrella
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

  // ── Premises B (indices 243-266) ──
  premises_loc_number_b:  243,   // CommercialStructure_Location_ProducerIdentifier_B
  premises_bldg_number_b: 244,   // CommercialStructure_Building_ProducerIdentifier_B
  premises_address_b:     245,   // CommercialStructure_PhysicalAddress_LineOne_B
  premises_address2_b:    246,   // CommercialStructure_PhysicalAddress_LineTwo_B
  premises_city_b:        247,   // CommercialStructure_PhysicalAddress_CityName_B
  premises_county_b:      248,   // CommercialStructure_PhysicalAddress_CountyName_B
  premises_state_b:       249,   // CommercialStructure_PhysicalAddress_StateOrProvinceCode_B
  premises_zip_b:         250,   // CommercialStructure_PhysicalAddress_PostalCode_B
  chk_inside_city_b:      251,   // ☐ Inside City Limits B
  chk_outside_city_b:     252,   // ☐ Outside City Limits B
  chk_city_other_b:       253,   // ☐ Other B
  city_other_desc_b:      254,   // Other Description B
  chk_owner_b:            255,   // ☐ Owner B
  chk_tenant_b:           256,   // ☐ Tenant B
  chk_interest_other_b:   257,   // ☐ Other Interest B
  interest_other_desc_b:  258,   // Other Interest Description B
  full_time_employees_b:  259,   // BusinessInformation_FullTimeEmployeeCount_B
  part_time_employees_b:  260,   // BusinessInformation_PartTimeEmployeeCount_B
  annual_revenues_b:      261,   // CommercialStructure_AnnualRevenueAmount_B
  occupied_sq_ft_b:       262,   // BuildingOccupancy_OccupiedArea_B
  open_to_public_area_b:  263,   // BuildingOccupancy_OpenToPublicArea_B
  total_building_sq_ft_b: 264,   // Construction_BuildingArea_B
  premises_description_b: 265,   // BuildingOccupancy_OperationsDescription_B
  abb_code_b:             266,   // CommercialStructure_Question_ABBCode_B

  // ── Premises C (indices 267-290) ──
  premises_loc_number_c:  267,   // CommercialStructure_Location_ProducerIdentifier_C
  premises_bldg_number_c: 268,   // CommercialStructure_Building_ProducerIdentifier_C
  premises_address_c:     269,   // CommercialStructure_PhysicalAddress_LineOne_C
  premises_address2_c:    270,   // CommercialStructure_PhysicalAddress_LineTwo_C
  premises_city_c:        271,   // CommercialStructure_PhysicalAddress_CityName_C
  premises_county_c:      272,   // CommercialStructure_PhysicalAddress_CountyName_C
  premises_state_c:       273,   // CommercialStructure_PhysicalAddress_StateOrProvinceCode_C
  premises_zip_c:         274,   // CommercialStructure_PhysicalAddress_PostalCode_C
  chk_inside_city_c:      275,   // ☐ Inside City Limits C
  chk_outside_city_c:     276,   // ☐ Outside City Limits C
  chk_city_other_c:       277,   // ☐ Other C
  city_other_desc_c:      278,   // Other Description C
  chk_owner_c:            279,   // ☐ Owner C
  chk_tenant_c:           280,   // ☐ Tenant C
  chk_interest_other_c:   281,   // ☐ Other Interest C
  interest_other_desc_c:  282,   // Other Interest Description C
  full_time_employees_c:  283,   // BusinessInformation_FullTimeEmployeeCount_C
  part_time_employees_c:  284,   // BusinessInformation_PartTimeEmployeeCount_C
  annual_revenues_c:      285,   // CommercialStructure_AnnualRevenueAmount_C
  occupied_sq_ft_c:       286,   // BuildingOccupancy_OccupiedArea_C
  open_to_public_area_c:  287,   // BuildingOccupancy_OpenToPublicArea_C
  total_building_sq_ft_c: 288,   // Construction_BuildingArea_C
  premises_description_c: 289,   // BuildingOccupancy_OperationsDescription_C
  abb_code_c:             290,   // CommercialStructure_Question_ABBCode_C

  // ── Premises D (indices 291-314) ──
  premises_loc_number_d:  291,   // CommercialStructure_Location_ProducerIdentifier_D
  premises_bldg_number_d: 292,   // CommercialStructure_Building_ProducerIdentifier_D
  premises_address_d:     293,   // CommercialStructure_PhysicalAddress_LineOne_D
  premises_address2_d:    294,   // CommercialStructure_PhysicalAddress_LineTwo_D
  premises_city_d:        295,   // CommercialStructure_PhysicalAddress_CityName_D
  premises_county_d:      296,   // CommercialStructure_PhysicalAddress_CountyName_D
  premises_state_d:       297,   // CommercialStructure_PhysicalAddress_StateOrProvinceCode_D
  premises_zip_d:         298,   // CommercialStructure_PhysicalAddress_PostalCode_D
  chk_inside_city_d:      299,   // ☐ Inside City Limits D
  chk_outside_city_d:     300,   // ☐ Outside City Limits D
  chk_city_other_d:       301,   // ☐ Other D
  city_other_desc_d:      302,   // Other Description D
  chk_owner_d:            303,   // ☐ Owner D
  chk_tenant_d:           304,   // ☐ Tenant D
  chk_interest_other_d:   305,   // ☐ Other Interest D
  interest_other_desc_d:  306,   // Other Interest Description D
  full_time_employees_d:  307,   // BusinessInformation_FullTimeEmployeeCount_D
  part_time_employees_d:  308,   // BusinessInformation_PartTimeEmployeeCount_D
  annual_revenues_d:      309,   // CommercialStructure_AnnualRevenueAmount_D
  occupied_sq_ft_d:       310,   // BuildingOccupancy_OccupiedArea_D
  open_to_public_area_d:  311,   // BuildingOccupancy_OpenToPublicArea_D
  total_building_sq_ft_d: 312,   // Construction_BuildingArea_D
  premises_description_d: 313,   // BuildingOccupancy_OperationsDescription_D
  abb_code_d:             314,   // CommercialStructure_Question_ABBCode_D

  // ── Business Type Checkboxes (indices 315-326) ──
  chk_biz_apartments:     315,   // ☐ Apartments
  chk_biz_condominiums:   316,   // ☐ Condominiums
  chk_biz_contractor:     317,   // ☐ Contractor
  chk_biz_institutional:  318,   // ☐ Institutional
  chk_biz_manufacturing:  319,   // ☐ Manufacturing
  chk_biz_office:         320,   // ☐ Office
  chk_biz_restaurant:     321,   // ☐ Restaurant
  chk_biz_retail:         322,   // ☐ Retail
  chk_biz_service:        323,   // ☐ Service
  chk_biz_wholesale:      324,   // ☐ Wholesale
  chk_biz_other:          325,   // ☐ Other
  biz_other_description:  326,   // Other Business Type Description

  // Nature of Business
  date_business_started:  327,   // NamedInsured_BusinessStartDate_A
  description_of_operations: 328, // CommercialPolicy_OperationsDescription_A
  install_repair_work_pct: 329,  // InstallationRepairWorkPercent_A
  install_repair_offprem_pct: 330, // InstallationRepairWorkOffPremisesPercent_A
  operations_description_b: 331, // CommercialPolicy_OperationsDescription_B

  // ── Additional Interest A (indices 332-372) ──
  chk_addl_insured:       332,   // ☐ Additional Insured
  chk_breach_warranty:    333,   // ☐ Breach of Warranty
  chk_co_owner:           334,   // ☐ Co-Owner
  chk_employee_lessor:    335,   // ☐ Employee as Lessor
  chk_leaseback_owner:    336,   // ☐ Leaseback Owner
  chk_lenders_loss_payable: 337, // ☐ Lender's Loss Payable
  chk_lienholder:         338,   // ☐ Lienholder
  chk_loss_payee:         339,   // ☐ Loss Payee
  chk_mortgagee:          340,   // ☐ Mortgagee
  chk_owner_interest:     341,   // ☐ Owner
  chk_registrant:         342,   // ☐ Registrant
  chk_trustee:            343,   // ☐ Trustee
  chk_addl_interest_other: 344,  // ☐ Other Interest
  addl_interest_other_desc: 345, // Other Interest Description
  addl_interest_reason:   346,   // Interest Reason Description
  addl_interest_rank:     347,   // Interest Rank
  chk_cert_required:      348,   // ☐ Certificate Required
  chk_policy_required:    349,   // ☐ Policy Required
  chk_send_bill:          350,   // ☐ Send Bill
  addl_interest_name:     351,   // Additional Interest Full Name
  addl_interest_address:  352,   // Mailing Address Line One
  addl_interest_address2: 353,   // Mailing Address Line Two
  addl_interest_city:     354,   // City
  addl_interest_state:    355,   // State
  addl_interest_zip:      356,   // Postal Code
  addl_interest_country:  357,   // Country Code
  addl_interest_account:  358,   // Account Number
  addl_interest_end_date: 359,   // Interest End Date
  addl_interest_loan_amt: 360,   // Loan Amount
  addl_interest_phone:    361,   // Phone Number
  addl_interest_fax:      362,   // Fax Number
  addl_interest_email:    363,   // Email Address
  addl_interest_location: 364,   // Location Producer Identifier
  addl_interest_building: 365,   // Building Producer Identifier
  addl_interest_vehicle:  366,   // Vehicle Producer Identifier
  addl_interest_boat:     367,   // Boat Producer Identifier
  addl_interest_airport:  368,   // Airport Identifier
  addl_interest_aircraft: 369,   // Aircraft Producer Identifier
  addl_interest_sched_class: 370, // Scheduled Item Class Code
  addl_interest_sched_id: 371,   // Scheduled Item Producer Identifier
  addl_interest_item_desc: 372,  // Item Description

  // ── Page 3 (P3) — General Information Questions ──
  p3_agency_customer_id:  373,   // Producer_CustomerIdentifier (page 3)

  // Q1: Subsidiary of another entity?
  q1a_code:               374,   // AAICode — Y/N code
  q1a_parent_name:        375,   // Parent Organization Name
  q1a_relationship:       376,   // Parent/Subsidiary Relationship Description
  q1a_ownership_pct:      377,   // Parent Ownership Percent
  q1b_code:               378,   // AAJCode — Has subsidiaries?
  q1b_subsidiary_name:    379,   // Subsidiary Organization Name
  q1b_relationship:       380,   // Subsidiary Relationship Description
  q1b_ownership_pct:      381,   // Subsidiary Ownership Percent

  // Q2: Formal safety program?
  q2_code:                382,   // KAACode — Y/N code
  chk_safety_manual:      383,   // ☐ Safety Manual
  chk_safety_position:    384,   // ☐ Safety Position
  chk_monthly_meetings:   385,   // ☐ Monthly Meetings
  chk_osha:               386,   // ☐ OSHA
  chk_safety_other:       387,   // ☐ Other
  safety_other_desc:      388,   // Safety Other Description

  // Q3: Exposure to flammables/explosives/chemicals?
  q3_code:                389,   // ABCCode — Y/N code
  q3_explanation:         390,   // Explanation

  // Q4: Other insurance with same company?
  q4_code:                391,   // AAHCode — Y/N code
  q4_lob_a:               392,   // Line of Business A
  q4_policy_a:            393,   // Policy Number A
  q4_lob_b:               394,   // Line of Business B
  q4_policy_b:            395,   // Policy Number B
  q4_lob_c:               396,   // Line of Business C
  q4_policy_c:            397,   // Policy Number C
  q4_lob_d:               398,   // Line of Business D
  q4_policy_d:            399,   // Policy Number D

  // Q5: Policy declined/cancelled/non-renewed?
  q5_code:                400,   // AACCode — Y/N code
  chk_cancel_nonpayment:  401,   // ☐ Non-Payment
  chk_cancel_nonrenewal:  402,   // ☐ Non-Renewal
  chk_cancel_agent_left:  403,   // ☐ Agent No Longer Writes
  chk_cancel_underwriting: 404,  // ☐ Underwriting
  chk_cancel_uw_corrected: 405,  // ☐ Underwriting Condition Corrected
  cancel_uw_corrected_desc: 406, // Correction Description
  chk_cancel_other:       407,   // ☐ Other
  cancel_other_desc:      408,   // Other Description

  // Q6: Past losses/claims relating to sexual abuse/discrimination?
  q6_code:                409,   // AADCode — Y/N code
  q6_explanation:         410,   // Explanation

  // Q7: Fraud/bribery/arson conviction?
  q7_code:                411,   // KABCode — Y/N code
  q7_explanation:         412,   // Explanation

  // Q8: Fire code violations?
  q8_code:                413,   // AAFCode — Y/N code
  q8_occurrence_date_a:   414,   // Occurrence Date A
  q8_explanation_a:       415,   // Explanation A
  q8_resolution_desc_a:   416,   // Resolution Description A
  q8_resolution_date_a:   417,   // Resolution Date A
  q8_occurrence_date_b:   418,   // Occurrence Date B
  q8_explanation_b:       419,   // Explanation B
  q8_resolution_desc_b:   420,   // Resolution Description B
  q8_resolution_date_b:   421,   // Resolution Date B

  // Q9: Bankruptcy/foreclosure/repossession?
  q9_code:                422,   // KAKCode — Y/N code
  q9_occurrence_date_a:   423,   // Occurrence Date A
  q9_explanation_a:       424,   // Explanation A
  q9_resolution_desc_a:   425,   // Resolution Description A
  q9_resolution_date_a:   426,   // Resolution Date A
  q9_occurrence_date_b:   427,   // Occurrence Date B
  q9_explanation_b:       428,   // Explanation B
  q9_resolution_desc_b:   429,   // Resolution Description B
  q9_resolution_date_b:   430,   // Resolution Date B

  // Q10: Judgement or lien?
  q10_code:               431,   // KALCode — Y/N code
  q10_occurrence_date_a:  432,   // Occurrence Date A
  q10_explanation_a:      433,   // Explanation A
  q10_resolution_desc_a:  434,   // Resolution Description A
  q10_resolution_date_a:  435,   // Resolution Date A
  q10_occurrence_date_b:  436,   // Occurrence Date B
  q10_explanation_b:      437,   // Explanation B
  q10_resolution_desc_b:  438,   // Resolution Description B
  q10_resolution_date_b:  439,   // Resolution Date B

  // Q11: Business held in trust?
  q11_code:               440,   // ABBCode — Y/N code
  q11_trust_name:         441,   // Trust Name

  // Q12: Foreign operations?
  q12_code:               442,   // KACCode — Y/N code

  // Q13: Other business ventures?
  q13_code:               443,   // KAMCode — Y/N code
  q13_explanation:        444,   // Explanation

  // Q14: Operates drones?
  q14_code:               445,   // KANCode — Y/N code
  q14_explanation:        446,   // Explanation

  // Q15: Hires drone operators?
  q15_code:               447,   // KAOCode — Y/N code
  q15_explanation:        448,   // Explanation

  // Remarks
  remarks:                449,   // CommercialPolicy_RemarkText_A

  // ── Prior Coverage — Year 1 (GL / Auto / Property / Other) ──
  prior_year_1:           450,   // PriorCoverage_PolicyYear_A
  prior_carrier_1:        451,   // PriorCoverage_GeneralLiability_InsurerFullName_A
  prior_policy_number_1:  452,   // PriorCoverage_GeneralLiability_PolicyNumberIdentifier_A
  prior_gl_premium_1:     453,   // PriorCoverage_GeneralLiability_TotalPremiumAmount_A
  prior_eff_date_1:       454,   // PriorCoverage_GeneralLiability_EffectiveDate_A
  prior_exp_date_1:       455,   // PriorCoverage_GeneralLiability_ExpirationDate_A
  prior_auto_carrier_1:   456,   // PriorCoverage_Automobile_InsurerFullName_A
  prior_auto_policy_1:    457,   // PriorCoverage_Automobile_PolicyNumberIdentifier_A
  prior_auto_premium_1:   458,   // PriorCoverage_Automobile_TotalPremiumAmount_A
  prior_auto_eff_1:       459,   // PriorCoverage_Automobile_EffectiveDate_A
  prior_auto_exp_1:       460,   // PriorCoverage_Automobile_ExpirationDate_A
  prior_prop_carrier_1:   461,   // PriorCoverage_Property_InsurerFullName_A
  prior_prop_policy_1:    462,   // PriorCoverage_Property_PolicyNumberIdentifier_A
  prior_prop_premium_1:   463,   // PriorCoverage_Property_TotalPremiumAmount_A
  prior_prop_eff_1:       464,   // PriorCoverage_Property_EffectiveDate_A
  prior_prop_exp_1:       465,   // PriorCoverage_Property_ExpirationDate_A
  prior_other_lob_1:      466,   // PriorCoverage_OtherLine_LineOfBusinessCode_A
  prior_other_carrier_1:  467,   // PriorCoverage_OtherLine_InsurerFullName_A
  prior_other_policy_1:   468,   // PriorCoverage_OtherLine_PolicyNumberIdentifier_A
  prior_other_premium_1:  469,   // PriorCoverage_OtherLine_TotalPremiumAmount_A
  prior_other_eff_1:      470,   // PriorCoverage_OtherLine_EffectiveDate_A
  prior_other_exp_1:      471,   // PriorCoverage_OtherLine_ExpirationDate_A

  // ── Page 4 (P4) — Prior Coverage Years 2 & 3 ──
  p4_agency_customer_id:  472,   // Producer_CustomerIdentifier (page 4)

  // Prior Coverage — Year 2
  prior_year_2:           473,   // PriorCoverage_PolicyYear_B
  prior_carrier_2:        474,   // PriorCoverage_GeneralLiability_InsurerFullName_B
  prior_policy_number_2:  475,   // PriorCoverage_GeneralLiability_PolicyNumberIdentifier_B
  prior_gl_premium_2:     476,   // PriorCoverage_GeneralLiability_TotalPremiumAmount_B
  prior_eff_date_2:       477,   // PriorCoverage_GeneralLiability_EffectiveDate_B
  prior_exp_date_2:       478,   // PriorCoverage_GeneralLiability_ExpirationDate_B
  prior_auto_carrier_2:   479,   // PriorCoverage_Automobile_InsurerFullName_B
  prior_auto_policy_2:    480,   // PriorCoverage_Automobile_PolicyNumberIdentifier_B
  prior_auto_premium_2:   481,   // PriorCoverage_Automobile_TotalPremiumAmount_B
  prior_auto_eff_2:       482,   // PriorCoverage_Automobile_EffectiveDate_B
  prior_auto_exp_2:       483,   // PriorCoverage_Automobile_ExpirationDate_B
  prior_prop_carrier_2:   484,   // PriorCoverage_Property_InsurerFullName_B
  prior_prop_policy_2:    485,   // PriorCoverage_Property_PolicyNumberIdentifier_B
  prior_prop_premium_2:   486,   // PriorCoverage_Property_TotalPremiumAmount_B
  prior_prop_eff_2:       487,   // PriorCoverage_Property_EffectiveDate_B
  prior_prop_exp_2:       488,   // PriorCoverage_Property_ExpirationDate_B
  prior_other_lob_2:      489,   // PriorCoverage_OtherLine_LineOfBusinessCode (page 4)
  prior_other_carrier_2:  490,   // PriorCoverage_OtherLine_InsurerFullName_B
  prior_other_policy_2:   491,   // PriorCoverage_OtherLine_PolicyNumberIdentifier_B
  prior_other_premium_2:  492,   // PriorCoverage_OtherLine_TotalPremiumAmount_B
  prior_other_eff_2:      493,   // PriorCoverage_OtherLine_EffectiveDate_B
  prior_other_exp_2:      494,   // PriorCoverage_OtherLine_ExpirationDate_B

  // Prior Coverage — Year 3
  prior_year_3:           495,   // PriorCoverage_PolicyYear_C
  prior_carrier_3:        496,   // PriorCoverage_GeneralLiability_InsurerFullName_C
  prior_policy_number_3:  497,   // PriorCoverage_GeneralLiability_PolicyNumberIdentifier_C
  prior_gl_premium_3:     498,   // PriorCoverage_GeneralLiability_TotalPremiumAmount_C
  prior_eff_date_3:       499,   // PriorCoverage_GeneralLiability_EffectiveDate_C
  prior_exp_date_3:       500,   // PriorCoverage_GeneralLiability_ExpirationDate_C
  prior_auto_carrier_3:   501,   // PriorCoverage_Automobile_InsurerFullName_C
  prior_auto_policy_3:    502,   // PriorCoverage_Automobile_PolicyNumberIdentifier_C
  prior_auto_premium_3:   503,   // PriorCoverage_Automobile_TotalPremiumAmount_C
  prior_auto_eff_3:       504,   // PriorCoverage_Automobile_EffectiveDate_C
  prior_auto_exp_3:       505,   // PriorCoverage_Automobile_ExpirationDate_C
  prior_prop_carrier_3:   506,   // PriorCoverage_Property_InsurerFullName_C
  prior_prop_policy_3:    507,   // PriorCoverage_Property_PolicyNumberIdentifier_C
  prior_prop_premium_3:   508,   // PriorCoverage_Property_TotalPremiumAmount_C
  prior_prop_eff_3:       509,   // PriorCoverage_Property_EffectiveDate_C
  prior_prop_exp_3:       510,   // PriorCoverage_Property_ExpirationDate_C
  prior_other_carrier_3:  511,   // PriorCoverage_OtherLine_InsurerFullName_C
  prior_other_policy_3:   512,   // PriorCoverage_OtherLine_PolicyNumberIdentifier_C
  prior_other_premium_3:  513,   // PriorCoverage_OtherLine_TotalPremiumAmount_C
  prior_other_eff_3:      514,   // PriorCoverage_OtherLine_EffectiveDate_C
  prior_other_exp_3:      515,   // PriorCoverage_OtherLine_ExpirationDate_C

  // ── Loss History ──
  chk_no_prior_losses:    516,   // ☐ No Prior Losses
  loss_history_years:     517,   // LossHistory_InformationYearCount_A
  total_losses:           518,   // LossHistory_TotalAmount_A

  // Loss Row A
  loss_date_a:            519,   // LossHistory_OccurrenceDate_A
  loss_lob_a:             520,   // LossHistory_LineOfBusiness_A
  loss_description_a:     521,   // LossHistory_OccurrenceDescription_A
  loss_claim_date_a:      522,   // LossHistory_ClaimDate_A
  loss_paid_a:            523,   // LossHistory_PaidAmount_A
  loss_reserved_a:        524,   // LossHistory_ReservedAmount_A
  loss_subrogation_a:     525,   // LossHistory_ClaimStatus_SubrogationCode_A
  loss_open_a:            526,   // LossHistory_ClaimStatus_OpenCode_A

  // Loss Row B
  loss_date_b:            527,   // LossHistory_OccurrenceDate_B
  loss_lob_b:             528,   // LossHistory_LineOfBusiness_B
  loss_description_b:     529,   // LossHistory_OccurrenceDescription_B
  loss_claim_date_b:      530,   // LossHistory_ClaimDate_B
  loss_paid_b:            531,   // LossHistory_PaidAmount_B
  loss_reserved_b:        532,   // LossHistory_ReservedAmount_B
  loss_subrogation_b:     533,   // LossHistory_ClaimStatus_SubrogationCode_B
  loss_open_b:            534,   // LossHistory_ClaimStatus_OpenCode_B

  // Loss Row C
  loss_date_c:            535,   // LossHistory_OccurrenceDate_C
  loss_lob_c:             536,   // LossHistory_LineOfBusiness_C
  loss_description_c:     537,   // LossHistory_OccurrenceDescription_C
  loss_claim_date_c:      538,   // LossHistory_ClaimDate_C
  loss_paid_c:            539,   // LossHistory_PaidAmount_C
  loss_reserved_c:        540,   // LossHistory_ReservedAmount_C
  loss_subrogation_c:     541,   // LossHistory_ClaimStatus_SubrogationCode_C
  loss_open_c:            542,   // LossHistory_ClaimStatus_OpenCode_C

  // ── Signature Block ──
  chk_info_practices_notice: 543, // ☐ Information Practices Notice
  insured_initials:       544,   // NamedInsured_Initials_A
  producer_signature:     545,   // Producer_AuthorizedRepresentative_Signature_A
  producer_name:          546,   // Producer_AuthorizedRepresentative_FullName_A
  producer_license_no:    547,   // Producer_StateLicenseIdentifier_A
  insured_signature:      548,   // NamedInsured_Signature_A
  signature_date:         549,   // NamedInsured_SignatureDate_A
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


