import type { AcordFormDefinition } from "./acord-forms";

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
 * Comprehensive AI-to-ACORD field alias map.
 * Each key is an AI extraction field; the values are all ACORD form field keys it should populate.
 */
const AI_TO_FORM_ALIASES: Record<string, string[]> = {
  // ── Applicant / Insured ──
  applicant_name: ["applicant_name", "insured_name", "named_insured", "primary_location_name", "contact_name_1"],
  named_insured: ["applicant_name", "insured_name", "named_insured", "primary_location_name", "contact_name_1"],
  insured_name: ["applicant_name", "insured_name", "named_insured", "primary_location_name"],
  dba_name: ["dba_name", "other_named_insured"],
  company_name: ["applicant_name", "insured_name", "named_insured", "primary_location_name"],
  establishment_name: ["applicant_name", "insured_name", "named_insured"],

  // ── Address (one-to-many) — including supplement extraction keys ──
  mailing_address: ["mailing_address", "premises_address", "building_street_address", "garaging_street", "location_1_address", "primary_location_address"],
  address: ["mailing_address", "premises_address", "building_street_address", "garaging_street", "location_1_address", "primary_location_address"],
  location_street: ["mailing_address", "premises_address", "building_street_address", "garaging_street", "location_1_address", "primary_location_address"],
  city: ["city", "premises_city", "garaging_city", "building_city"],
  state: ["state", "premises_state", "garaging_state", "building_state", "rating_state", "wc_part1_states"],
  zip: ["zip", "premises_zip", "garaging_zip", "building_zip"],
  zip_code: ["zip", "premises_zip", "garaging_zip", "building_zip"],
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
  sic_code: ["sic_code", "vehicle_1_sic"],
  naics_code: ["naics_code"],
  business_type: ["business_type"],
  applicant_type: ["business_type"],
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
  nature_of_business: ["nature_of_business", "business_category"],
  business_category: ["business_category", "nature_of_business"],
  description_of_operations: ["description_of_operations", "premises_description", "primary_description"],

  // ── Policy dates ──
  effective_date: ["effective_date", "proposed_eff_date"],
  expiration_date: ["expiration_date", "proposed_exp_date"],
  proposed_eff_date: ["proposed_eff_date", "effective_date"],
  proposed_exp_date: ["proposed_exp_date", "expiration_date"],

  // ── Prior carrier ──
  current_carrier: ["prior_carrier_name", "current_carrier", "carrier", "prior_wc_carrier_1", "prior_carrier_1"],
  current_premium: ["current_premium"],
  prior_carrier_name: ["prior_carrier_1", "prior_wc_carrier_1", "current_carrier"],

  // ── Premises ──
  premises_address: ["premises_address", "building_street_address", "garaging_street", "location_1_address"],
  premises_owned_or_leased: ["premises_interest"],
  premises_interest: ["premises_interest"],
  square_footage: ["occupied_sq_ft", "total_building_sq_ft", "total_area_sq_ft"],
  occupied_sq_ft: ["occupied_sq_ft", "total_building_sq_ft", "total_area_sq_ft"],

  // ── Loss history ──
  prior_losses_last_5_years: ["loss_history", "wc_loss_history"],
  claims_description: ["loss_history"],
  coverage_types_needed: ["lines_of_business"],

  // ── Employees (cross-form) ──
  number_of_employees: ["total_employees"],
  total_employees: ["total_employees", "num_employees_1", "ebl_num_employees"],
  full_time_employees: ["full_time_employees"],
  part_time_employees: ["part_time_employees"],

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
  bpp_amount: ["bpp_amount"],
  business_income_amount: ["business_income_amount"],
  extra_expense_amount: ["extra_expense_amount"],
  rental_value_amount: ["rental_value_amount"],
  building_deductible: ["building_deductible"],
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
  vehicle_1_year: ["vehicle_1_year"],
  vehicle_1_make: ["vehicle_1_make"],
  vehicle_1_model: ["vehicle_1_model"],
  vehicle_1_vin: ["vehicle_1_vin"],
  vehicle_1_body_type: ["vehicle_1_body_type"],
  vehicle_1_cost_new: ["vehicle_1_cost_new"],

  // ── Umbrella / Excess ──
  each_occurrence_limit: ["each_occurrence_limit"],
  aggregate_limit: ["aggregate_limit"],
  umbrella_or_excess: ["umbrella_or_excess"],
  coverage_basis: ["coverage_basis"],
  retained_limit_occurrence: ["retained_limit_occurrence"],
  retained_limit_aggregate: ["retained_limit_aggregate"],
  self_insured_retention: ["self_insured_retention"],

  // ── CGL Limits ──
  general_aggregate: ["general_aggregate"],
  products_aggregate: ["products_aggregate"],
  each_occurrence: ["each_occurrence"],
  personal_adv_injury: ["personal_adv_injury"],
  fire_damage: ["fire_damage"],
  medical_payments: ["medical_payments"],
  coverage_type: ["coverage_type"],
  aggregate_applies_per: ["aggregate_applies_per"],

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
};

const DATE_FIELDS = new Set([
  "proposed_eff_date", "proposed_exp_date", "effective_date", "expiration_date",
  "date_business_started", "prior_eff_date", "prior_exp_date", "retroactive_date",
  "pending_litigation_date", "signature_date", "mod_effective_date",
  "prior_eff_date_1", "prior_exp_date_1", "driver_1_dob", "driver_2_dob",
  "officer_1_dob", "ebl_retroactive_date", "entry_date_claims_made",
  "anniversary_rating_date", "transaction_date",
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
  "deposit_amount", "minimum_premium", "policy_premium", "annual_gross_sales",
  "annual_payroll", "officer_1_remuneration", "sinkhole_limit", "mine_subsidence_limit",
  "spoilage_limit", "blanket_1_amount",
  "total_minimum_premium", "total_deposit_premium",
  "inland_marine_premium", "boiler_premium", "bop_premium", "garage_premium", "liquor_premium",
]);

const normalizeValue = (fieldKey: string, value: any): any => {
  const s = String(value ?? "");
  if (!s) return s;
  if (DATE_FIELDS.has(fieldKey)) return parseDate(s);
  if (CURRENCY_FIELDS.has(fieldKey)) return cleanCurrency(s);
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

  // 9. No losses default
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

  return mapped;
}
