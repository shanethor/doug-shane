import type { AcordFormDefinition } from "./acord-forms";

/** Parse natural-language dates into YYYY-MM-DD */
export const parseDate = (raw: string): string => {
  if (!raw) return "";
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

const AI_TO_FORM_ALIASES: Record<string, string[]> = {
  applicant_name: ["applicant_name", "insured_name", "named_insured"],
  dba_name: ["dba_name"],
  mailing_address: ["mailing_address", "premises_address", "building_address"],
  city: ["city", "premises_city", "garaging_city", "building_city"],
  state: ["state", "premises_state", "state_of_operation", "garaging_state", "building_state"],
  zip: ["zip", "premises_zip", "garaging_zip", "building_zip"],
  phone: ["business_phone", "phone", "contact_phone"],
  email: ["email", "agency_email", "contact_email"],
  website: ["website"],
  fein: ["fein"],
  sic_code: ["sic_code"],
  naics_code: ["naics_code"],
  business_type: ["business_type"],
  year_established: ["date_business_started"],
  annual_revenue: ["annual_revenues", "annual_revenue", "gross_sales"],
  nature_of_business: ["nature_of_business", "business_category"],
  description_of_operations: ["description_of_operations", "operations_description"],
  effective_date: ["effective_date", "proposed_eff_date"],
  expiration_date: ["expiration_date", "proposed_exp_date"],
  current_carrier: ["prior_carrier_name", "current_carrier", "carrier"],
  current_premium: ["current_premium"],
  premises_address: ["premises_address"],
  premises_owned_or_leased: ["premises_interest"],
  square_footage: ["occupied_sq_ft", "total_building_sq_ft", "total_area_sq_ft"],
  prior_losses_last_5_years: ["loss_history"],
  claims_description: ["loss_history"],
  coverage_types_needed: ["lines_of_business"],
};

const DATE_FIELDS = new Set([
  "proposed_eff_date", "proposed_exp_date", "effective_date", "expiration_date",
  "date_business_started", "prior_eff_date", "prior_exp_date", "retroactive_date",
  "pending_litigation_date", "signature_date", "mod_effective_date",
]);

const CURRENCY_FIELDS = new Set([
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
]);

const normalizeValue = (fieldKey: string, value: any): any => {
  const s = String(value ?? "");
  if (!s) return s;
  if (DATE_FIELDS.has(fieldKey)) return parseDate(s);
  if (CURRENCY_FIELDS.has(fieldKey)) return cleanCurrency(s);
  return Array.isArray(value) ? value.join(", ") : s;
};

/**
 * Build auto-filled form data for a given ACORD form using AI-extracted data and agent profile.
 */
export function buildAutofilledData(
  form: AcordFormDefinition,
  aiData: Record<string, any>,
  profile?: { full_name?: string | null; agency_name?: string | null; phone?: string | null } | null
): Record<string, any> {
  const formFieldKeys = new Set(form.fields.map((f) => f.key));
  const mapped: Record<string, any> = {};

  // Agent profile
  if (profile) {
    if (profile.agency_name && formFieldKeys.has("agency_name")) mapped.agency_name = profile.agency_name;
    if (profile.full_name && formFieldKeys.has("producer_name")) mapped.producer_name = profile.full_name;
    if (profile.phone && formFieldKeys.has("agency_phone")) mapped.agency_phone = profile.phone;
  }

  // Employee splitting
  const rawEmployees = aiData.number_of_employees;
  if (rawEmployees) {
    const emp = splitEmployees(String(rawEmployees));
    if (formFieldKeys.has("full_time_employees") && emp.full_time) mapped.full_time_employees = emp.full_time;
    if (formFieldKeys.has("part_time_employees") && emp.part_time) mapped.part_time_employees = emp.part_time;
    if (formFieldKeys.has("num_employees_1") && emp.total) mapped.num_employees_1 = emp.total;
    if (formFieldKeys.has("ebl_num_employees") && emp.total) mapped.ebl_num_employees = emp.total;
    if (formFieldKeys.has("total_employees") && emp.total) mapped.total_employees = emp.total;
  }

  // Alias mapping
  for (const [aiKey, formKeys] of Object.entries(AI_TO_FORM_ALIASES)) {
    const value = aiData[aiKey];
    if (!value) continue;
    for (const formKey of formKeys) {
      if (formFieldKeys.has(formKey) && !mapped[formKey]) {
        mapped[formKey] = normalizeValue(formKey, value);
      }
    }
  }

  // Direct matches
  for (const [aiKey, value] of Object.entries(aiData)) {
    if (formFieldKeys.has(aiKey) && !mapped[aiKey] && value) {
      mapped[aiKey] = normalizeValue(aiKey, value);
    }
  }

  // Auto-calc expiration
  const effKey = formFieldKeys.has("proposed_exp_date") ? "proposed_eff_date" : "effective_date";
  const expKey = formFieldKeys.has("proposed_exp_date") ? "proposed_exp_date" : "expiration_date";
  if (mapped[effKey] && !mapped[expKey] && formFieldKeys.has(expKey)) {
    mapped[expKey] = calcExpiration(mapped[effKey]);
  }

  // Signature date
  if (formFieldKeys.has("signature_date") && !mapped.signature_date) {
    mapped.signature_date = new Date().toISOString().slice(0, 10);
  }

  // No losses default
  if (formFieldKeys.has("no_losses") && aiData.prior_losses_last_5_years) {
    const loss = String(aiData.prior_losses_last_5_years).toLowerCase();
    if (loss === "no" || loss === "none" || loss === "n/a") {
      mapped.no_losses = true;
    }
  }

  return mapped;
}
