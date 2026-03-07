import type { AcordFormDefinition } from "./acord-forms";
import { supabase } from "@/integrations/supabase/client";

/** Parse natural-language dates into YYYY-MM-DD */
export const parseDate = (raw: string): string => {
  if (!raw) return "";
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
};

/** Auto-calculate expiration = effective + 1 year */
export const calcExpiration = (effDateStr: string): string => {
  const d = new Date(effDateStr);
  if (isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/** Format a numeric string as USD: "600000" → "$600,000" */
export const formatUSD = (raw: string | number): string => {
  if (raw === "" || raw === null || raw === undefined) return "";
  const num = typeof raw === "number" ? raw : Number(String(raw).replace(/[$,\s]/g, ""));
  if (isNaN(num)) return String(raw);
  return "$" + num.toLocaleString("en-US");
};

/** Clean currency strings: "$600,000" → "600000" */
export const cleanCurrency = (raw: string): string => {
  if (!raw) return "";
  return String(raw).replace(/[$,\s]/g, "");
};

/** Split "9 (2 Full Time, 7 Part Time)" into parts */
export const splitEmployees = (raw: string): { full_time: string; part_time: string; total: string } => {
  const s = String(raw);
  const ftMatch = s.match(/(\d+)\s*full[\s-]?time/i);
  const ptMatch = s.match(/(\d+)\s*part[\s-]?time/i);
  const totalMatch = s.match(/^(\d+)/);
  return {
    full_time: ftMatch?.[1] || "",
    part_time: ptMatch?.[1] || "",
    total: totalMatch?.[1] || s.replace(/\D/g, "") || "",
  };
};

/**
 * Auto-classify vehicle body type from make/model strings.
 * Maps common commercial vehicle patterns to ACORD body type codes.
 */
export const classifyVehicleBodyType = (make: string, model: string): string => {
  const combined = `${make} ${model}`.toLowerCase().trim();
  
  // Trailer patterns
  if (/trailer|flatbed|lowboy|reefer|tanker|van\s*trailer|semi[\s-]?trailer|dry\s*van/i.test(combined)) return "Trailer";
  
  // Truck patterns (heavy/medium duty)
  if (/f[- ]?[5-9]50|f[- ]?[6-9]\d{2}|peterbilt|kenworth|freightliner|mack|international|hino|isuzu\s*(n|f|e)/i.test(combined)) return "Truck";
  if (/dump\s*truck|box\s*truck|stake\s*body|cab\s*(and\s*)?chassis|tractor|straight\s*truck/i.test(combined)) return "Truck";
  if (/[2-9]\d{3,}|gvw/i.test(combined)) return "Truck";
  
  // Pickup patterns
  if (/f[- ]?[1-4]50|silverado|sierra|ram\s*\d|tundra|titan|ranger|colorado|canyon|tacoma|frontier|gladiator|ridgeline/i.test(combined)) return "Pickup";
  
  // Van patterns
  if (/van|sprinter|transit|promaster|express|savana|metris|e[- ]?\d{3}/i.test(combined)) return "Van";
  
  // SUV patterns
  if (/suv|suburban|tahoe|yukon|expedition|explorer|4runner|highlander|pilot|pathfinder|durango|traverse|blazer|bronco|wrangler|defender/i.test(combined)) return "SUV";
  
  // Sedan/car patterns
  if (/sedan|camry|accord|civic|corolla|altima|malibu|fusion|impala|charger|model\s*[3sy]/i.test(combined)) return "Sedan";
  
  return "";
};

/**
 * Comprehensive AI-to-ACORD field alias map.
 * Each key is an AI extraction field; the values are all ACORD form field keys it should populate.
 */
const AI_TO_FORM_ALIASES: Record<string, string[]> = {
  // ── Applicant / Insured ──
  applicant_name: ["applicant_name", "insured_name", "named_insured", "primary_location_name", "contact_name_1"],
  named_insured: ["applicant_name", "insured_name", "named_insured", "primary_location_name", "contact_name_1"],
  insured_name: ["applicant_name", "insured_name", "named_insured", "primary_location_name"],
  dba_name: ["dba_name", "other_named_insured"],
  doing_business_as: ["dba_name", "other_named_insured"],
  company_name: ["applicant_name", "insured_name", "named_insured", "primary_location_name"],
  establishment_name: ["applicant_name", "insured_name", "named_insured"],
  first_named_insured: ["applicant_name", "insured_name", "named_insured", "primary_location_name", "contact_name_1"],

  // ── Address (one-to-many) — including supplement extraction keys ──
  mailing_address: ["mailing_address", "premises_address", "building_street_address", "garaging_street", "location_1_address", "primary_location_address"],
  address: ["mailing_address", "premises_address", "building_street_address", "garaging_street", "location_1_address", "primary_location_address"],
  location_street: ["mailing_address", "premises_address", "building_street_address", "garaging_street", "location_1_address", "primary_location_address"],
  location_address: ["premises_address", "building_street_address", "location_1_address", "primary_location_address"],
  insured_address: ["mailing_address", "premises_address"],
  city: ["city", "premises_city", "garaging_city", "building_city"],
  state: ["state", "premises_state", "garaging_state", "building_state", "rating_state", "wc_part1_states"],
  zip: ["zip", "premises_zip", "garaging_zip", "building_zip"],
  zip_code: ["zip", "premises_zip", "garaging_zip", "building_zip"],
  postal_code: ["zip", "premises_zip", "garaging_zip", "building_zip"],
  county: ["premises_county", "garaging_county"],
  states_of_operation: ["state", "premises_state", "wc_part1_states", "rating_state"],

  // ── Contact — including supplement extraction keys ──
  phone: ["business_phone", "phone", "contact_phone", "applicant_phone", "contact_phone_1"],
  telephone: ["business_phone", "phone", "contact_phone", "applicant_phone", "contact_phone_1"],
  contact_number: ["business_phone", "phone", "contact_phone", "applicant_phone", "contact_phone_1"],
  business_phone: ["business_phone", "applicant_phone", "contact_phone_1"],
  email: ["contact_email_1", "applicant_email"],
  contact_name: ["contact_name", "contact_name_1"],
  website: ["website"],

  // ── Business identifiers ──
  fein: ["fein"],
  tax_id: ["fein"],
  federal_employer_id: ["fein"],
  sic_code: ["sic_code", "vehicle_1_sic"],
  naics_code: ["naics_code"],
  naic_number: ["naic_code"],
  business_type: ["business_type"],
  applicant_type: ["business_type"],
  form_of_business: ["business_type"],
  organization_type: ["business_type"],
  legal_entity: ["business_type"],
  gl_code: ["gl_code"],

  // ── Business history — including supplement keys ──
  year_established: ["date_business_started", "years_in_business"],
  date_business_started: ["date_business_started", "years_in_business"],
  years_in_business: ["years_in_business", "date_business_started"],
  industry_experience: ["years_in_business"],
  annual_revenue: ["annual_revenues", "annual_revenue", "gross_sales", "annual_gross_sales"],
  annual_revenues: ["annual_revenues", "annual_revenue", "gross_sales", "annual_gross_sales"],
  total_sales: ["annual_revenues", "annual_revenue", "gross_sales", "annual_gross_sales"],
  receipts_current: ["annual_revenues", "annual_revenue", "gross_sales", "annual_gross_sales"],
  food_sales: ["annual_revenues"],

  // ── Operations ──
  nature_of_business: ["nature_of_business", "business_category", "description_of_operations"],
  business_category: ["business_category", "nature_of_business"],
  business_description: ["description_of_operations", "premises_description", "primary_description", "nature_of_business"],
  description_of_operations: ["description_of_operations", "premises_description", "primary_description", "nature_of_business"],
  insured_business: ["description_of_operations", "premises_description"],
  type_of_business: ["description_of_operations", "business_type"],

  // ── Policy dates ──
  effective_date: ["effective_date", "proposed_eff_date"],
  expiration_date: ["expiration_date", "proposed_exp_date"],
  proposed_eff_date: ["proposed_eff_date", "effective_date"],
  proposed_exp_date: ["proposed_exp_date", "expiration_date"],
  policy_period_from: ["proposed_eff_date", "effective_date"],
  policy_period_to: ["proposed_exp_date", "expiration_date"],

  // ── Prior carrier / Policy ──
  current_carrier: ["prior_carrier_name", "current_carrier", "carrier", "prior_wc_carrier_1", "prior_carrier_1"],
  insurer_name: ["carrier"],
  insurance_company: ["carrier"],
  writing_company: ["carrier"],
  current_premium: ["current_premium", "total_premium", "cgl_premium"],
  cgl_premium: ["cgl_premium"],
  gl_premium: ["cgl_premium"],
  coverage_part_premium: ["cgl_premium"],
  advance_premium: ["cgl_premium"],
  prior_carrier_name: ["prior_carrier_1", "prior_wc_carrier_1", "current_carrier"],
  naic_code: ["naic_code"],
  policy_fee: ["policy_fee"],
  tria_premium: ["tria_premium"],
  terrorism_premium: ["tria_premium"],
  audit_period: ["audit_period"],
  surplus_lines_tax: ["surplus_lines_tax"],
  broker_fee: ["broker_fee"],
  inspection_fee: ["inspection_fee"],
  stamping_fee: ["stamping_fee"],
  total_annual_premium: ["policy_premium", "total_premium"],
  premium_total: ["policy_premium", "total_premium"],
  grand_total: ["policy_premium", "total_premium"],
  total_charges: ["policy_premium", "total_premium"],

  // ── Policy number ──
  policy_number: ["policy_number"],
  previous_policy_number: ["prior_policy_number_1"],
  expiring_policy_number: ["prior_policy_number_1", "expiring_policy_number"],
  renewal_of: ["prior_policy_number_1"],

  // ── Premises ──
  premises_address: ["premises_address", "building_street_address", "garaging_street", "location_1_address"],
  premises_location: ["premises_address", "building_street_address", "location_1_address"],
  premises_owned_or_leased: ["premises_interest"],
  premises_interest: ["premises_interest"],
  square_footage: ["occupied_sq_ft", "total_building_sq_ft", "total_area_sq_ft"],
  occupied_sq_ft: ["occupied_sq_ft", "total_building_sq_ft", "total_area_sq_ft"],
  total_area: ["occupied_sq_ft", "total_building_sq_ft", "total_area_sq_ft"],

  // ── Loss history ──
  prior_losses_last_5_years: ["loss_history", "wc_loss_history"],
  claims_description: ["loss_history"],
  coverage_types_needed: ["lines_of_business"],

  // ── Employees (cross-form) ──
  number_of_employees: ["total_employees"],
  total_employees: ["total_employees", "num_employees_1", "ebl_num_employees"],
  full_time_employees: ["full_time_employees"],
  part_time_employees: ["part_time_employees"],
  employee_count: ["total_employees", "num_employees_1", "ebl_num_employees"],

  // ── WC-specific ──
  wc_class_code: ["class_code_1"],
  class_code_1: ["class_code_1"],
  wc_class_description: ["class_description_1"],
  class_description_1: ["class_description_1"],
  annual_remuneration: ["annual_remuneration_1"],
  annual_remuneration_1: ["annual_remuneration_1"],
  officer_name: ["officer_1_name"],
  officer_1_name: ["officer_1_name"],
  officer_title: ["officer_1_title"],
  officer_1_title: ["officer_1_title"],
  officer_ownership: ["officer_1_ownership"],
  officer_1_ownership: ["officer_1_ownership"],
  officer_1_duties: ["officer_1_duties"],
  experience_mod: ["experience_mod"],

  // ── Payroll — contractor supplement keys ──
  payroll_current: ["annual_payroll", "annual_remuneration_1"],
  owner_payroll: ["officer_1_remuneration"],
  annual_payroll: ["annual_payroll", "annual_remuneration_1"],

  // ── Property / Construction ──
  building_construction: ["construction_type"],
  construction_type: ["construction_type"],
  year_built: ["year_built"],
  num_stories: ["num_stories"],
  number_of_stories: ["num_stories"],
  roof_type: ["roof_type"],
  wiring_year: ["wiring_year"],
  plumbing_year: ["plumbing_year"],
  roofing_year: ["roofing_year"],
  heating_year: ["heating_year"],
  sprinkler_pct: ["sprinkler_pct"],
  protection_class: ["protection_class"],
  distance_to_hydrant: ["distance_to_hydrant"],
  wood_frame: ["construction_type"],

  // ── Property amounts ──
  building_amount: ["building_amount"],
  building_limit: ["building_amount"],
  building_replacement_cost: ["building_amount"],
  bpp_amount: ["bpp_amount"],
  business_personal_property: ["bpp_amount"],
  business_income_amount: ["business_income_amount"],
  extra_expense_amount: ["extra_expense_amount"],
  rental_value_amount: ["rental_value_amount"],
  building_deductible: ["building_deductible"],
  property_deductible: ["building_deductible"],
  bpp_deductible: ["bpp_deductible"],
  building_valuation: ["building_valuation"],
  building_causes_of_loss: ["building_causes_of_loss"],

  // ── Safety — including contractor supplement keys ──
  safety_program: ["workplace_safety_program", "safety_program"],
  workplace_safety_program: ["workplace_safety_program", "safety_program"],
  has_safety_program: ["workplace_safety_program", "safety_program"],
  subcontractors_used: ["subcontractors_used"],
  seasonal_employees: ["seasonal_employees"],
  osha_violations: ["osha_compliance"],

  // ── Contractor supplement → ACORD 125/126 General Info ──
  bankruptcy: ["bankruptcy"],
  has_workers_comp: ["wc_other_insurance_same"],
  contractor_license: ["producer_license_no"],

  // ── Auto ──
  driver_1_name: ["driver_1_name"],
  driver_1_license: ["driver_1_license"],
  driver_1_dob: ["driver_1_dob"],
  driver_1_license_number: ["driver_1_license"],
  driver_1_license_state: ["driver_1_license_state"],
  driver_2_name: ["driver_2_name"],
  driver_2_dob: ["driver_2_dob"],
  driver_2_license: ["driver_2_license"],
  driver_2_license_state: ["driver_2_license_state"],
  driver_3_name: ["driver_3_name"],
  driver_3_dob: ["driver_3_dob"],
  driver_3_license: ["driver_3_license"],
  driver_3_license_state: ["driver_3_license_state"],
  driver_4_name: ["driver_4_name"],
  driver_4_dob: ["driver_4_dob"],
  driver_4_license: ["driver_4_license"],
  driver_4_license_state: ["driver_4_license_state"],
  driver_5_name: ["driver_5_name"],
  driver_5_dob: ["driver_5_dob"],
  driver_5_license: ["driver_5_license"],
  driver_5_license_state: ["driver_5_license_state"],
  vehicle_1_year: ["vehicle_1_year"],
  vehicle_1_make: ["vehicle_1_make"],
  vehicle_1_model: ["vehicle_1_model"],
  vehicle_1_vin: ["vehicle_1_vin"],
  vehicle_1_body_type: ["vehicle_1_body_type"],
  vehicle_1_cost_new: ["vehicle_1_cost_new"],
  auto_liability_limit: ["auto_liability_limit"],
  auto_liability_premium: ["auto_liability_premium", "auto_premium"],
  um_uim_limit: ["um_uim_limit"],
  number_of_vehicles: ["number_of_vehicles"],
  number_of_drivers: ["number_of_drivers"],
  radius_of_operations: ["radius_of_operations"],

  // ── Umbrella / Excess ──
  each_occurrence_limit: ["each_occurrence_limit"],
  aggregate_limit: ["aggregate_limit"],
  umbrella_or_excess: ["umbrella_or_excess"],
  coverage_basis: ["coverage_basis"],
  retained_limit_occurrence: ["retained_limit_occurrence"],
  retained_limit_aggregate: ["retained_limit_aggregate"],
  self_insured_retention: ["self_insured_retention"],

  // ── CGL Limits — including common dec page extraction keys ──
  general_aggregate: ["general_aggregate"],
  aggregate_limits_of_liability: ["general_aggregate"],
  general_aggregate_limit: ["general_aggregate"],
  products_aggregate: ["products_aggregate"],
  products_completed_operations_aggregate: ["products_aggregate"],
  products_comp_op_agg: ["products_aggregate"],
  each_occurrence: ["each_occurrence"],
  bodily_injury_property_damage: ["each_occurrence"],
  bodily_injury_property_damage_liability: ["each_occurrence"],
  per_occurrence: ["each_occurrence"],
  per_occurrence_limit: ["each_occurrence"],
  personal_adv_injury: ["personal_adv_injury"],
  personal_advertising_injury: ["personal_adv_injury"],
  personal_and_advertising_injury: ["personal_adv_injury"],
  personal_injury: ["personal_adv_injury"],
  fire_damage: ["fire_damage"],
  damage_to_rented_premises: ["fire_damage"],
  damage_to_premises_rented_to_you: ["fire_damage"],
  fire_damage_limit: ["fire_damage"],
  medical_payments: ["medical_payments"],
  medical_expense: ["medical_payments"],
  med_exp: ["medical_payments"],
  medical_expense_limit: ["medical_payments"],
  coverage_type: ["coverage_type"],
  aggregate_applies_per: ["aggregate_applies_per"],

  // ── CGL Class / Hazard — dec page extraction keys ──
  class_code: ["hazard_code_1"],
  classification_code: ["hazard_code_1"],
  gl_class_code: ["hazard_code_1"],
  classification: ["hazard_classification_1"],
  classification_description: ["hazard_classification_1"],
  class_description: ["hazard_classification_1"],
  gl_classification: ["hazard_classification_1"],
  premium_basis: ["hazard_premium_basis_1", "hazard_exposure_1"],
  exposure: ["hazard_exposure_1", "hazard_premium_basis_1"],
  exposure_units: ["hazard_exposure_1"],
  territory: ["hazard_terr_1"],

  // ── Lines of Business flags (ACORD 125 LOB checkboxes) ──
  lob_gl: ["chk_lob_cgl", "lob_commercial_general_liability", "chk_commercial_general_liability"],
  lob_auto: ["chk_lob_auto"],
  lob_property: ["chk_lob_property"],
  lob_umbrella: ["chk_lob_umbrella"],
  lob_wc: ["lob_other"],  // WC maps to "Other LOB" on ACORD 125
  lob_commercial_general_liability: ["chk_lob_cgl", "lob_commercial_general_liability", "chk_commercial_general_liability"],

  // ── Multi-policy carrier / premium aliases ──
  wc_premium: ["other_lob_premium"],
  wc_carrier: ["prior_other_carrier_1"],
  wc_policy_number: ["prior_other_policy_1"],
  umbrella_carrier: ["prior_other_carrier_1"],
  umbrella_policy_number: ["prior_other_policy_1"],
  bop_carrier: ["carrier", "prior_carrier_1"],
  bop_policy_number: ["policy_number", "prior_policy_number_1"],
  auto_carrier: ["prior_auto_carrier_1"],
  auto_policy_number: ["prior_auto_policy_1"],
  property_carrier: ["prior_prop_carrier_1"],
  property_policy_number: ["prior_prop_policy_1"],

  // ── Prior carrier premiums (per-LOB) ──
  prior_gl_premium: ["prior_gl_premium_1"],
  prior_auto_premium: ["prior_auto_premium_1"],
  prior_property_premium: ["prior_prop_premium_1"],
  prior_umbrella_premium: ["prior_other_premium_1"],
  prior_wc_premium: ["prior_other_premium_1"],

  // ── ACORD 126 Checkboxes (coverage triggers, deductibles, limits) ──
  chk_commercial_general_liability: ["chk_commercial_general_liability", "chk_lob_cgl", "lob_commercial_general_liability"],
  chk_claims_made: ["chk_claims_made"],
  chk_occurrence: ["chk_occurrence"],
  chk_owners_contractors: ["chk_owners_contractors"],
  chk_limit_policy: ["chk_limit_policy"],
  chk_limit_location: ["chk_limit_location"],
  chk_limit_project: ["chk_limit_project"],
  chk_limit_other: ["chk_limit_other"],
  chk_deductible_pd: ["chk_deductible_pd"],
  chk_deductible_bi: ["chk_deductible_bi"],
  chk_per_claim: ["chk_per_claim"],
  chk_per_occurrence: ["chk_per_occurrence"],

  // ── ACORD 126 Schedule of Hazards ──
  hazard_loc_1: ["hazard_loc_1"],
  hazard_bldg_1: ["hazard_bldg_1"],
  hazard_classification_1: ["hazard_classification_1"],
  hazard_code_1: ["hazard_code_1"],
  hazard_premium_basis_1: ["hazard_premium_basis_1", "hazard_exposure_1"],
  hazard_exposure_1: ["hazard_exposure_1", "hazard_premium_basis_1"],
  hazard_rate_premops_1: ["hazard_rate_premops_1"],
  hazard_rate_products_1: ["hazard_rate_products_1"],
  hazard_premium_premops_1: ["hazard_premium_premops_1"],
  hazard_premium_products_1: ["hazard_premium_products_1"],

  // ── ACORD 126 Schedule of Hazards — Row 2 ──
  hazard_loc_2: ["hazard_loc_2"],
  hazard_bldg_2: ["hazard_bldg_2"],
  hazard_classification_2: ["hazard_classification_2"],
  hazard_code_2: ["hazard_code_2"],
  hazard_premium_basis_2: ["hazard_premium_basis_2"],
  hazard_exposure_2: ["hazard_exposure_2"],
  hazard_terr_2: ["hazard_terr_2"],
  hazard_rate_premops_2: ["hazard_rate_premops_2"],
  hazard_rate_products_2: ["hazard_rate_products_2"],
  hazard_premium_premops_2: ["hazard_premium_premops_2"],
  hazard_premium_products_2: ["hazard_premium_products_2"],

  // ── ACORD 126 Schedule of Hazards — Row 3 ──
  hazard_loc_3: ["hazard_loc_3"],
  hazard_bldg_3: ["hazard_bldg_3"],
  hazard_classification_3: ["hazard_classification_3"],
  hazard_code_3: ["hazard_code_3"],
  hazard_premium_basis_3: ["hazard_premium_basis_3"],
  hazard_exposure_3: ["hazard_exposure_3"],
  hazard_terr_3: ["hazard_terr_3"],
  hazard_rate_premops_3: ["hazard_rate_premops_3"],
  hazard_rate_products_3: ["hazard_rate_products_3"],
  hazard_premium_premops_3: ["hazard_premium_premops_3"],
  hazard_premium_products_3: ["hazard_premium_products_3"],

  // ── ACORD 126 Premium Totals ──
  total_premium_premops: ["total_premium_premops", "premiums_prem_ops"],
  total_premium_products: ["total_premium_products", "premiums_products"],
  premium_subtotal: ["premium_subtotal", "premiums_other"],
  premium_tax: ["premium_tax"],
  total_premium: ["total_premium", "premiums_total"],

  // ── ACORD 126 Claims-Made / EBL ──
  retroactive_date: ["retroactive_date"],
  entry_date_claims_made: ["entry_date_claims_made"],
  retention_amount: ["retention_amount"],
  ebl_limit: ["ebl_limit"],
  ebl_deductible_per_claim: ["ebl_deductible_per_claim"],
  ebl_aggregate: ["ebl_aggregate"],

  // ── WC Coverages ──
  wc_each_accident: ["wc_each_accident"],
  wc_disease_policy_limit: ["wc_disease_policy_limit"],
  wc_disease_each_employee: ["wc_disease_each_employee"],

  // ── Policy / Billing ──
  billing_plan: ["billing_plan"],
  payment_plan: ["payment_plan"],
  method_of_payment: ["method_of_payment"],
  transaction_type: ["transaction_type"],

  // ── Agency (from profile defaults) ──
  agency_name: ["agency_name"],
  agency_phone: ["agency_phone"],
  agency_fax: ["agency_fax"],
  agency_email: ["agency_email"],
  agency_customer_id: ["agency_customer_id"],
  producer_name: ["producer_name"],
  producer_license_no: ["producer_license_no"],
  national_producer_number: ["national_producer_number"],
  cs_representative: ["cs_representative"],
  agent_name: ["agency_name"],
  agent_number: ["agency_customer_id"],
  producer_number: ["agency_customer_id"],
};

const DATE_FIELDS = new Set([
  "proposed_eff_date", "proposed_exp_date", "effective_date", "expiration_date",
  "date_business_started", "prior_eff_date", "prior_exp_date", "retroactive_date",
  "pending_litigation_date", "signature_date", "mod_effective_date",
  "prior_eff_date_1", "prior_exp_date_1",
  "driver_1_dob", "driver_2_dob", "driver_3_dob", "driver_4_dob", "driver_5_dob", "driver_6_dob",
  "officer_1_dob", "ebl_retroactive_date", "entry_date_claims_made",
  "anniversary_rating_date", "transaction_date",
]);

/** Code fields that must NEVER be AI-inferred — only from documents or manual entry */
export const MANUAL_CODE_FIELDS = new Set([
  "sic_code", "naics_code", "naic_code", "gl_code", "class_code_1", "class_code_2",
  "hazard_code_1", "hazard_code_2", "hazard_code_3", "hazard_code_4", "hazard_code_5",
  "program_code", "ncci_risk_id", "wc_class_code", "policy_number",
  "prior_policy_number_1", "prior_wc_policy_1",
  // Products/Completed Operations — only explicit extraction
  "product_name_a", "product_gross_sales_a", "product_units_a", "product_months_market_a",
  "product_expected_life_a", "product_intended_use_a", "product_components_a",
  "product_name_b", "product_gross_sales_b", "product_units_b", "product_months_market_b",
  "product_expected_life_b", "product_intended_use_b", "product_components_b",
  "product_name_c", "product_gross_sales_c", "product_units_c", "product_months_market_c",
  "product_expected_life_c", "product_intended_use_c", "product_components_c",
  // Products & Contractors question fields
  "products_q1_code", "products_q2_code", "products_q3_code", "products_q4_code",
  "products_q5_code", "products_q6_code", "products_q7_code", "products_q8_code",
  "contractors_q1_code", "contractors_q2_code", "contractors_q3_code",
  "contractors_q4_code", "contractors_q5_code", "contractors_q6_code",
  "claims_made_q1_code", "claims_made_q2_code",
]);

export const CURRENCY_FIELDS = new Set([
  "annual_revenues", "annual_revenue", "gross_sales", "current_premium",
  "cgl_premium", "property_premium", "auto_premium", "umbrella_premium",
  "crime_premium", "cyber_premium", "general_aggregate", "products_aggregate",
  "each_occurrence", "personal_adv_injury", "fire_damage", "medical_payments",
  "deductible_amount", "prior_gl_premium", "prior_auto_premium", "prior_property_premium",
  "total_losses", "ebl_each_employee", "ebl_aggregate", "ebl_deductible",
  "annual_remuneration_1", "annual_remuneration_2", "est_premium_1", "est_premium_2",
  "hazard_premium_1", "hazard_premium_2", "each_occurrence_limit", "aggregate_limit",
  "self_insured_retention", "annual_premium", "total_estimated_premium", "total_wc_incurred",
  "building_amount", "bpp_amount", "business_income_amount", "extra_expense_amount",
  "rental_value_amount", "building_deductible", "bpp_deductible",
  "prior_gl_premium_1", "prior_auto_premium_1", "prior_property_premium_1",
  "prior_wc_premium_1", "prior_wc_paid_1", "prior_wc_reserve_1",
  "retained_limit_occurrence", "retained_limit_aggregate",
  "underlying_auto_bi_ea_acc", "underlying_auto_bi_ea_per", "underlying_auto_pd",
  "underlying_auto_premium", "underlying_gl_occurrence", "underlying_gl_aggregate",
  "underlying_gl_products", "underlying_gl_personal", "underlying_gl_premium",
  "underlying_el_each_accident", "underlying_el_disease_employee", "underlying_el_disease_policy",
  "underlying_el_premium", "ebl_limit", "ebl_deductible_per_claim", "ebl_retained_limit",
  "wc_each_accident", "wc_disease_policy_limit", "wc_disease_each_employee",
  "vehicle_1_cost_new", "max_dollar_value_at_risk", "paid_to_subcontractors",
  "vehicle_2_cost_new", "vehicle_3_cost_new", "vehicle_4_cost_new",
  "vehicle_5_cost_new", "vehicle_6_cost_new", "vehicle_7_cost_new", "vehicle_8_cost_new",
  "auto_liability_limit", "um_uim_limit",
  "deposit_amount", "minimum_premium", "policy_premium", "annual_gross_sales",
  "annual_payroll", "officer_1_remuneration", "sinkhole_limit", "mine_subsidence_limit",
  "spoilage_limit", "blanket_1_amount",
  "total_minimum_premium", "total_deposit_premium",
  "inland_marine_premium", "boiler_premium", "bop_premium", "garage_premium", "liquor_premium",
]);

/** Fields with "code" in the name must only contain numeric values */
const CODE_FIELD_PATTERN = /code/i;

const isCodeField = (fieldKey: string): boolean => CODE_FIELD_PATTERN.test(fieldKey);

/** Strip non-numeric chars from a value; return "" if nothing numeric remains */
const enforceNumericCode = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "");
  return digits || "";
};

const normalizeValue = (fieldKey: string, value: any): any => {
  // Filter out boolean false values — they leak from checkbox/flag fields
  if (value === false) return "";
  // Preserve boolean true for checkbox fields
  if (value === true) return true;
  const s = String(value ?? "");
  if (!s || s === "false") return "";
  if (DATE_FIELDS.has(fieldKey)) return parseDate(s);
  if (CURRENCY_FIELDS.has(fieldKey)) return cleanCurrency(s);
  // CODE fields must be numeric only
  if (isCodeField(fieldKey)) return enforceNumericCode(s);
  return Array.isArray(value) ? value.join(", ") : s;
};

/**
 * Build auto-filled form data for a given ACORD form using AI-extracted data, agent profile, and form defaults.
 */
export function buildAutofilledData(
  form: AcordFormDefinition,
  aiData: Record<string, any>,
  profile?: { full_name?: string | null; agency_name?: string | null; phone?: string | null } | null,
  formDefaults?: Record<string, string> | null,
): Record<string, any> {
  const formFieldKeys = new Set(form.fields.map((f) => f.key));
  const mapped: Record<string, any> = {};

  // 1. Agent profile basics
  if (profile) {
    if (profile.agency_name && formFieldKeys.has("agency_name")) mapped.agency_name = profile.agency_name;
    if (profile.full_name && formFieldKeys.has("producer_name")) mapped.producer_name = profile.full_name;
    if (profile.phone && formFieldKeys.has("agency_phone")) mapped.agency_phone = profile.phone;
  }

  // 2. Form defaults (agency_fax, agency_email, producer_license_no, etc.)
  if (formDefaults) {
    for (const [k, v] of Object.entries(formDefaults)) {
      if (v && formFieldKeys.has(k) && !mapped[k]) {
        mapped[k] = v;
      }
    }
  }

  // 3. Employee splitting
  const rawEmployees = aiData.number_of_employees;
  if (rawEmployees) {
    const emp = splitEmployees(String(rawEmployees));
    if (formFieldKeys.has("full_time_employees") && emp.full_time) mapped.full_time_employees = emp.full_time;
    if (formFieldKeys.has("part_time_employees") && emp.part_time) mapped.part_time_employees = emp.part_time;
    if (formFieldKeys.has("num_employees_1") && emp.total) mapped.num_employees_1 = emp.total;
    if (formFieldKeys.has("ebl_num_employees") && emp.total) mapped.ebl_num_employees = emp.total;
    if (formFieldKeys.has("total_employees") && emp.total) mapped.total_employees = emp.total;
  }

  // 4. Alias mapping
  for (const [aiKey, formKeys] of Object.entries(AI_TO_FORM_ALIASES)) {
    const value = aiData[aiKey];
    if (!value) continue;
    for (const formKey of formKeys) {
      if (formFieldKeys.has(formKey) && !mapped[formKey]) {
        mapped[formKey] = normalizeValue(formKey, value);
      }
    }
  }

  // 5. Direct matches — handles AI fields that use exact form field keys
  for (const [aiKey, value] of Object.entries(aiData)) {
    if (formFieldKeys.has(aiKey) && !mapped[aiKey] && value) {
      mapped[aiKey] = normalizeValue(aiKey, value);
    }
  }

  // 5b. Expand vehicles[] array → vehicle_N_year/make/model/vin/body_type fields
  const vehicles: any[] = Array.isArray(aiData.vehicles) ? aiData.vehicles : [];
  vehicles.forEach((v: any, idx: number) => {
    const n = idx + 1;
    const vFields: Record<string, string> = {
      [`vehicle_${n}_year`]: v.year || v.vehicle_year || "",
      [`vehicle_${n}_make`]: v.make || v.vehicle_make || "",
      [`vehicle_${n}_model`]: v.model || v.vehicle_model || "",
      [`vehicle_${n}_vin`]: v.vin || v.vehicle_vin || v.VIN || "",
      [`vehicle_${n}_body_type`]: v.body_type || v.bodyType || v.type || classifyVehicleBodyType(v.make || v.vehicle_make || "", v.model || v.vehicle_model || ""),
      [`vehicle_${n}_cost_new`]: v.stated_amount || v.cost_new || v.statedAmount || "",
      [`vehicle_${n}_garaging_zip`]: v.garaging_zip || v.zip || "",
    };
    for (const [k, val] of Object.entries(vFields)) {
      if (val && formFieldKeys.has(k) && !mapped[k]) mapped[k] = val;
    }
  });

  // 5c. Expand drivers[] array → driver_N_name/dob/license fields
  const drivers: any[] = Array.isArray(aiData.drivers) ? aiData.drivers : [];
  drivers.forEach((d: any, idx: number) => {
    const n = idx + 1;
    const dFields: Record<string, string> = {
      [`driver_${n}_name`]: d.name || d.driver_name || d.full_name || "",
      [`driver_${n}_dob`]: d.dob || d.date_of_birth || d.birth_date || "",
      [`driver_${n}_license`]: d.license || d.license_number || d.dl_number || "",
      [`driver_${n}_license_state`]: d.license_state || d.state || "",
    };
    for (const [k, val] of Object.entries(dFields)) {
      if (val && formFieldKeys.has(k) && !mapped[k]) mapped[k] = normalizeValue(k, val);
    }
  });

  // 5d. Also expand flat driver_N_name / vehicle_N_vin keys if AI returned them directly
  for (let n = 2; n <= 30; n++) {
    const vKeys: Record<string, string> = {
      [`vehicle_${n}_year`]: aiData[`vehicle_${n}_year`] || "",
      [`vehicle_${n}_make`]: aiData[`vehicle_${n}_make`] || "",
      [`vehicle_${n}_model`]: aiData[`vehicle_${n}_model`] || "",
      [`vehicle_${n}_vin`]: aiData[`vehicle_${n}_vin`] || "",
      [`vehicle_${n}_body_type`]: aiData[`vehicle_${n}_body_type`] || classifyVehicleBodyType(aiData[`vehicle_${n}_make`] || "", aiData[`vehicle_${n}_model`] || ""),
      [`vehicle_${n}_cost_new`]: aiData[`vehicle_${n}_cost_new`] || aiData[`vehicle_${n}_stated_amount`] || "",
      [`vehicle_${n}_garaging_zip`]: aiData[`vehicle_${n}_garaging_zip`] || "",
      [`vehicle_${n}_gvw`]: aiData[`vehicle_${n}_gvw`] || "",
    };
    for (const [k, val] of Object.entries(vKeys)) {
      if (val && formFieldKeys.has(k) && !mapped[k]) mapped[k] = val;
    }
    const dKeys: Record<string, string> = {
      [`driver_${n}_name`]: aiData[`driver_${n}_name`] || "",
      [`driver_${n}_dob`]: aiData[`driver_${n}_dob`] || "",
      [`driver_${n}_license`]: aiData[`driver_${n}_license`] || "",
      [`driver_${n}_license_state`]: aiData[`driver_${n}_license_state`] || "",
    };
    for (const [k, val] of Object.entries(dKeys)) {
      if (val && formFieldKeys.has(k) && !mapped[k]) mapped[k] = normalizeValue(k, val);
    }
  }

  // 6. Auto-calc expiration
  const effKey = formFieldKeys.has("proposed_exp_date") ? "proposed_eff_date" : "effective_date";
  const expKey = formFieldKeys.has("proposed_exp_date") ? "proposed_exp_date" : "expiration_date";
  if (mapped[effKey] && !mapped[expKey] && formFieldKeys.has(expKey)) {
    mapped[expKey] = calcExpiration(mapped[effKey]);
  }

  // 7. Signature date
  if (formFieldKeys.has("signature_date") && !mapped.signature_date) {
    mapped.signature_date = new Date().toISOString().slice(0, 10);
  }

  // 8. Transaction date
  if (formFieldKeys.has("transaction_date") && !mapped.transaction_date) {
    mapped.transaction_date = new Date().toISOString().slice(0, 10);
  }

  // 9. Normalize business_type at the autofill level too
  if (mapped.business_type) {
    const ENTITY_NORMALIZE: Record<string, string> = {
      "limited liability company": "LLC", "limit liability comp": "LLC", "llc": "LLC",
      "corporation": "Corporation", "corp": "Corporation", "corp.": "Corporation",
      "s corporation": "S Corporation", "s corp": "S Corporation",
      "partnership": "Partnership", "sole proprietor": "Sole Proprietor",
      "sole proprietorship": "Sole Proprietor", "joint venture": "Joint Venture",
      "trust": "Trust", "individual": "Individual", "not for profit": "Not For Profit",
    };
    const normalized = ENTITY_NORMALIZE[String(mapped.business_type).trim().toLowerCase()];
    if (normalized) mapped.business_type = normalized;
  }

  // 10. No losses default
  if (formFieldKeys.has("no_losses") && aiData.prior_losses_last_5_years) {
    const loss = String(aiData.prior_losses_last_5_years).toLowerCase();
    if (loss === "no" || loss === "none" || loss === "n/a") {
      mapped.no_losses = true;
    }
  }

  // 10. No previous claims for umbrella
  if (formFieldKeys.has("no_previous_claims") && aiData.prior_losses_last_5_years) {
    const loss = String(aiData.prior_losses_last_5_years).toLowerCase();
    if (loss === "no" || loss === "none" || loss === "n/a") {
      mapped.no_previous_claims = true;
    }
  }

  // 11. Auto-check LOB checkboxes when a premium amount is present
  const PREMIUM_TO_CHECKBOX: Record<string, string[]> = {
    cgl_premium:        ["lob_commercial_general_liability", "chk_lob_cgl", "chk_commercial_general_liability"],
    property_premium:   ["lob_commercial_property", "chk_lob_property"],
    auto_premium:       ["lob_business_auto", "chk_lob_auto"],
    umbrella_premium:   ["lob_umbrella", "chk_lob_umbrella"],
    crime_premium:      ["lob_crime"],
    cyber_premium:      ["lob_cyber"],
    inland_marine_premium: ["lob_inland_marine"],
    boiler_premium:     ["lob_boiler_machinery"],
    bop_premium:        ["lob_bop"],
    garage_premium:     ["lob_garage_dealers"],
    liquor_premium:     ["lob_liquor_liability"],
    other_lob_premium:  ["lob_other"],
    wc_premium:         ["lob_other"],
  };

  for (const [premiumKey, checkboxKeys] of Object.entries(PREMIUM_TO_CHECKBOX)) {
    const premVal = mapped[premiumKey];
    if (premVal && String(premVal).replace(/[$,\s0]/g, "") !== "") {
      for (const chkKey of checkboxKeys) {
        if (formFieldKeys.has(chkKey)) {
          mapped[chkKey] = true;
        }
      }
    }
  }

  // 12. Auto-check Occurrence / Claims Made checkboxes from coverage_type value
  const covType = String(mapped.coverage_type || aiData.coverage_type || "").toLowerCase();
  if (covType.includes("occurrence")) {
    if (formFieldKeys.has("chk_occurrence")) mapped.chk_occurrence = true;
    if (formFieldKeys.has("chk_claims_made") && !mapped.chk_claims_made) mapped.chk_claims_made = false;
  } else if (covType.includes("claims") || covType.includes("claims-made") || covType.includes("claims made")) {
    if (formFieldKeys.has("chk_claims_made")) mapped.chk_claims_made = true;
    if (formFieldKeys.has("chk_occurrence") && !mapped.chk_occurrence) mapped.chk_occurrence = false;
  }

  // 13. Multi-policy packet: auto-populate "Other LOB" description for WC
  if (mapped.lob_other || mapped.other_lob_premium || mapped.wc_premium || aiData.wc_premium) {
    if (formFieldKeys.has("other_lob_description") && !mapped.other_lob_description) {
      mapped.other_lob_description = "WORKERS COMPENSATION";
    }
    if (formFieldKeys.has("lob_other")) {
      mapped.lob_other = true;
    }
    // Map WC premium to Other LOB premium
    const wcPrem = mapped.wc_premium || aiData.wc_premium || aiData.total_estimated_premium;
    if (wcPrem && formFieldKeys.has("other_lob_premium") && !mapped.other_lob_premium) {
      mapped.other_lob_premium = normalizeValue("other_lob_premium", wcPrem);
    }
  }

  // 14. Multi-policy packet: Q4 "Other insurance with this company"
  //     When multiple policies from the same carrier are present, auto-check Q4
  const policyKeys = ["policy_number", "auto_policy_number", "umbrella_policy_number", "wc_policy_number"];
  const distinctPolicies = new Set(
    policyKeys.map(k => aiData[k] || mapped[k]).filter(Boolean)
  );
  if (distinctPolicies.size >= 2 || (aiData.policies && Array.isArray(aiData.policies) && aiData.policies.length > 1)) {
    if (formFieldKeys.has("q4_code")) mapped.q4_code = "Y";
    // Fill Q4 detail rows from the policies
    const policies = aiData.policies || [];
    if (Array.isArray(policies)) {
      const q4Slots = ["a", "b", "c", "d"];
      policies.slice(0, 4).forEach((p: any, i: number) => {
        const slot = q4Slots[i];
        const lobKey = `q4_lob_${slot}`;
        const polKey = `q4_policy_${slot}`;
        if (p.line_of_business && formFieldKeys.has(lobKey) && !mapped[lobKey]) {
          mapped[lobKey] = p.line_of_business;
        }
        if (p.policy_number && formFieldKeys.has(polKey) && !mapped[polKey]) {
          mapped[polKey] = p.policy_number;
        }
      });
    }
  }

  // 15. Multi-policy packet: auto-populate prior carrier rows from policy data
  //     If aiData contains structured policy objects, map them to prior carrier grid
  if (aiData.policies && Array.isArray(aiData.policies)) {
    const policies = aiData.policies as Array<{
      line_of_business?: string;
      carrier_name?: string;
      policy_number?: string;
      premium?: string;
      effective_date?: string;
      expiration_date?: string;
    }>;

    // Separate by LOB category for ACORD 125 prior carrier grid
    for (const p of policies) {
      const lob = (p.line_of_business || "").toUpperCase();
      const yr = p.effective_date ? parseDate(p.effective_date).slice(0, 4) : "";

      // Determine which prior carrier column this maps to
      let prefix = "";
      let yearKey = "";
      if (lob.includes("GENERAL") || lob.includes("BOP") || lob.includes("GL") || lob.includes("PACKAGE")) {
        prefix = "prior_"; yearKey = "prior_year_1";
        // GL/BOP goes in the GL column
        if (!mapped.prior_carrier_1 && formFieldKeys.has("prior_carrier_1")) {
          mapped.prior_carrier_1 = p.carrier_name || "";
          if (yr && formFieldKeys.has("prior_year_1")) mapped.prior_year_1 = yr;
          if (p.policy_number && formFieldKeys.has("prior_policy_number_1")) mapped.prior_policy_number_1 = p.policy_number;
          if (p.premium && formFieldKeys.has("prior_gl_premium_1")) mapped.prior_gl_premium_1 = normalizeValue("prior_gl_premium_1", p.premium);
          if (p.effective_date && formFieldKeys.has("prior_eff_date_1")) mapped.prior_eff_date_1 = parseDate(p.effective_date);
          if (p.expiration_date && formFieldKeys.has("prior_exp_date_1")) mapped.prior_exp_date_1 = parseDate(p.expiration_date);
        }
      } else if (lob.includes("AUTO")) {
        if (!mapped.prior_auto_carrier_1 && formFieldKeys.has("prior_auto_carrier_1")) {
          mapped.prior_auto_carrier_1 = p.carrier_name || "";
          if (p.policy_number && formFieldKeys.has("prior_auto_policy_1")) mapped.prior_auto_policy_1 = p.policy_number;
          if (p.premium && formFieldKeys.has("prior_auto_premium_1")) mapped.prior_auto_premium_1 = normalizeValue("prior_auto_premium_1", p.premium);
          if (p.effective_date && formFieldKeys.has("prior_auto_eff_1")) mapped.prior_auto_eff_1 = parseDate(p.effective_date);
          if (p.expiration_date && formFieldKeys.has("prior_auto_exp_1")) mapped.prior_auto_exp_1 = parseDate(p.expiration_date);
        }
      } else if (lob.includes("PROPERTY") || lob.includes("FIRE")) {
        if (!mapped.prior_prop_carrier_1 && formFieldKeys.has("prior_prop_carrier_1")) {
          mapped.prior_prop_carrier_1 = p.carrier_name || "";
          if (p.policy_number && formFieldKeys.has("prior_prop_policy_1")) mapped.prior_prop_policy_1 = p.policy_number;
          if (p.premium && formFieldKeys.has("prior_prop_premium_1")) mapped.prior_prop_premium_1 = normalizeValue("prior_prop_premium_1", p.premium);
          if (p.effective_date && formFieldKeys.has("prior_prop_eff_1")) mapped.prior_prop_eff_1 = parseDate(p.effective_date);
          if (p.expiration_date && formFieldKeys.has("prior_prop_exp_1")) mapped.prior_prop_exp_1 = parseDate(p.expiration_date);
        }
      } else if (lob.includes("UMBRELLA") || lob.includes("EXCESS") || lob.includes("WORKERS") || lob.includes("WC")) {
        // Umbrella/WC goes in "Other Line" column
        if (!mapped.prior_other_carrier_1 && formFieldKeys.has("prior_other_carrier_1")) {
          mapped.prior_other_lob_1 = lob.includes("UMBRELLA") || lob.includes("EXCESS")
            ? "COMMERCIAL UMBRELLA" : "WORKERS COMPENSATION";
          mapped.prior_other_carrier_1 = p.carrier_name || "";
          if (p.policy_number && formFieldKeys.has("prior_other_policy_1")) mapped.prior_other_policy_1 = p.policy_number;
          if (p.premium && formFieldKeys.has("prior_other_premium_1")) mapped.prior_other_premium_1 = normalizeValue("prior_other_premium_1", p.premium);
          if (p.effective_date && formFieldKeys.has("prior_other_eff_1")) mapped.prior_other_eff_1 = parseDate(p.effective_date);
          if (p.expiration_date && formFieldKeys.has("prior_other_exp_1")) mapped.prior_other_exp_1 = parseDate(p.expiration_date);
        }
      }
    }
  }

  // 16. Nature of business — copy from description_of_operations if not set separately
  if (formFieldKeys.has("nature_of_business") && !mapped.nature_of_business && mapped.description_of_operations) {
    mapped.nature_of_business = mapped.description_of_operations;
  }

  // 17. Premises loc number defaults to "1" when premises address is set
  if (formFieldKeys.has("premises_loc_number") && !mapped.premises_loc_number && mapped.premises_address) {
    mapped.premises_loc_number = "1";
  }

  return mapped;
}

/**
 * AI-powered field inference: sends extracted data + unfilled ACORD fields to AI
 * to dynamically infer additional mappings the static aliases missed.
 */
export async function aiInferFieldMappings(
  form: AcordFormDefinition,
  aiData: Record<string, any>,
  alreadyFilled: Record<string, any>,
): Promise<Record<string, any>> {
  const allFieldKeys = form.fields.map((f) => f.key);
  const filledKeys = new Set(
    Object.keys(alreadyFilled).filter(
      (k) => alreadyFilled[k] !== "" && alreadyFilled[k] !== null && alreadyFilled[k] !== undefined
    )
  );
  const unfilledKeysPreFilter = allFieldKeys.filter((k) => !filledKeys.has(k) && !MANUAL_CODE_FIELDS.has(k));
  const unfilledKeys = allFieldKeys.filter((k) => !filledKeys.has(k) && !MANUAL_CODE_FIELDS.has(k));

  // Skip if nothing to fill or no extracted data
  if (unfilledKeys.length === 0 || Object.keys(aiData).length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabase.functions.invoke("map-fields", {
      body: {
        extracted_data: aiData,
        target_fields: unfilledKeys,
        form_name: form.fullName || form.name,
      },
    });

    if (error) {
      console.error("AI field mapping error:", error);
      return {};
    }

    return data?.mappings || {};
  } catch (err) {
    console.error("AI field mapping failed:", err);
    return {};
  }
}

/**
 * Full autofill pipeline: static mapping + AI inference.
 * Returns merged results with both static and AI-inferred values.
 */
export async function buildAutofilledDataWithAI(
  form: AcordFormDefinition,
  aiData: Record<string, any>,
  profile?: { full_name?: string | null; agency_name?: string | null; phone?: string | null } | null,
  formDefaults?: Record<string, string> | null,
): Promise<{ data: Record<string, any>; aiInferredCount: number }> {
  // Step 1: Static mapping
  const staticMapped = buildAutofilledData(form, aiData, profile, formDefaults);

  // Step 2: AI inference for remaining gaps
  const aiMappings = await aiInferFieldMappings(form, aiData, staticMapped);

  // Merge: static takes priority, AI fills the rest
  const merged = { ...staticMapped };
  let aiInferredCount = 0;
  for (const [key, value] of Object.entries(aiMappings)) {
    if (!merged[key] && value !== "" && value !== null && value !== undefined) {
      merged[key] = normalizeValue(key, value);
      aiInferredCount++;
    }
  }

  return { data: merged, aiInferredCount };
}
