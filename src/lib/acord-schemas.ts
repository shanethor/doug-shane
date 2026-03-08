/**
 * Canonical TypeScript schemas for ACORD form extraction output.
 * 
 * These interfaces define the structured data we extract from each ACORD form.
 * They are used as the target shape for the extraction pipeline and as the
 * source of truth for review UI rendering.
 * 
 * Architecture notes:
 * - Form-type detection: src/lib/acord-form-detection.ts
 * - Per-form field definitions (UI): src/lib/acord-forms.ts
 * - Per-form PDF field maps: src/lib/acord-field-map.ts
 * - Extraction pipeline: src/lib/acord-extraction.ts
 * - Review/correction DB: acord_extraction_runs + acord_field_corrections tables
 */

// ─── Shared types ───────────────────────────────────────────

export interface AcordAddress {
  street: string;
  street2?: string;
  city: string;
  county?: string;
  state: string;
  zip: string;
  country?: string;
}

export interface AcordHeader {
  agency_name: string;
  agency_customer_id?: string;
  carrier?: string;
  naic_code?: string;
  policy_number?: string;
  effective_date?: string;
  expiration_date?: string;
  insured_name: string;
  transaction_date?: string;
}

export interface AcordOfficer {
  name: string;
  title?: string;
  ownership_pct?: string;
  duties?: string;
  dob?: string;
  included_excluded?: "Included" | "Excluded";
  class_code?: string;
  remuneration?: string;
  state?: string;
  location?: string;
}

export interface AcordLossRecord {
  year?: string;
  carrier?: string;
  policy_number?: string;
  premium?: string;
  mod?: string;
  num_claims?: string;
  amount_paid?: string;
  amount_reserved?: string;
}

// ─── ACORD 127 — Business Auto ──────────────────────────────

export interface Acord127Driver {
  id?: string;
  first_name: string;
  middle?: string;
  last_name: string;
  city?: string;
  state?: string;
  zip?: string;
  sex?: "M" | "F";
  marital_status?: "S" | "M" | "W" | "D";
  dob?: string;
  years_experience?: string;
  license_number?: string;
  license_state?: string;
  ssn?: string;
  hired_date?: string;
  vehicle_id?: string;
  vehicle_pct?: string;
}

export interface Acord127Vehicle {
  id?: string;
  year: string;
  make: string;
  model: string;
  body_type?: string;
  vin: string;
  cost_new?: string;
  symbol?: string;
  comp_symbol?: string;
  coll_symbol?: string;
  garaging_address?: AcordAddress;
  registration_state?: string;
  territory?: string;
  gvw?: string;
  rate_class?: string;
  sic?: string;
  radius?: string;
  farthest_zone?: string;
  seating_capacity?: string;
  comp_deductible?: string;
  coll_deductible?: string;
  premium?: string;
}

export interface Acord127Coverage {
  symbol?: string;
  coverage_code?: string;
  limit_1?: string;
  limit_2?: string;
  limit_3?: string;
  deductible?: string;
  premium?: string;
}

export interface Acord127Data {
  header: AcordHeader;
  drivers: Acord127Driver[];
  vehicles: Acord127Vehicle[];
  coverages?: Acord127Coverage[];
  garaging_address?: AcordAddress;
  general_info_questions: Record<string, string>;
  garage_storage_description?: string;
  max_dollar_value_at_risk?: string;
  remarks?: string;
}

// ─── ACORD 130 — Workers Compensation ───────────────────────

export interface Acord130ClassCode {
  location?: string;
  class_code: string;
  description: string;
  duties?: string;
  sic?: string;
  naics?: string;
  num_employees?: string;
  num_part_time?: string;
  annual_remuneration: string;
  rate?: string;
  estimated_premium?: string;
}

export interface Acord130Location {
  id?: string;
  floors?: string;
  address: AcordAddress;
}

export interface Acord130Data {
  header: AcordHeader;
  applicant_address: AcordAddress;
  business_type?: string;
  fein?: string;
  ncci_risk_id?: string;
  years_in_business?: string;
  sic_code?: string;
  naics_code?: string;
  
  // WC Coverages
  wc_part1_states: string;
  wc_each_accident?: string;
  wc_disease_policy_limit?: string;
  wc_disease_each_employee?: string;
  additional_endorsements?: string;
  
  // Premiums
  total_estimated_premium?: string;
  total_minimum_premium?: string;
  total_deposit_premium?: string;
  
  // Officers
  officers: AcordOfficer[];
  
  // Locations
  locations: Acord130Location[];
  
  // Classification / Rating
  rating_state?: string;
  class_codes: Acord130ClassCode[];
  experience_mod?: string;
  mod_effective_date?: string;
  
  // Prior carrier / Loss history
  loss_history: AcordLossRecord[];
  
  // General info Y/N
  general_info_questions: Record<string, string>;
  
  description_of_operations?: string;
  remarks?: string;
}

// ─── ACORD 131 — Umbrella / Excess ──────────────────────────

export interface Acord131UnderlyingPolicy {
  line_of_business: string;
  carrier: string;
  policy_number?: string;
  effective_date?: string;
  expiration_date?: string;
  limits: Record<string, string>;
  premium?: string;
  mod_factor?: string;
}

export interface Acord131Location {
  id?: string;
  name?: string;
  address: AcordAddress;
  operations_description?: string;
  total_payroll?: string;
  annual_gross_receipts?: string;
  employee_count?: string;
}

export interface Acord131Data {
  header: AcordHeader;
  policy_type: "Umbrella" | "Excess";
  coverage_basis?: "Occurrence" | "Claims Made";
  each_occurrence_limit?: string;
  aggregate_limit?: string;
  retained_limit_occurrence?: string;
  retained_limit_aggregate?: string;
  self_insured_retention?: string;
  retroactive_date?: string;
  
  // Underlying policies
  underlying_policies: Acord131UnderlyingPolicy[];
  
  // Locations
  locations: Acord131Location[];
  
  // EBL
  ebl_each_employee?: string;
  ebl_aggregate?: string;
  ebl_retained_limit?: string;
  ebl_retroactive_date?: string;
  
  // Loss history (same as 125)
  loss_history: AcordLossRecord[];
  
  // General info Y/N
  general_info_questions: Record<string, string>;
  
  remarks?: string;
}

// ─── ACORD 140 — Property ───────────────────────────────────

export interface Acord140SubjectOfInsurance {
  coverage: string;
  amount?: string;
  valuation?: string;
  causes_of_loss?: string;
  deductible?: string;
  coinsurance_pct?: string;
  inflation_guard_pct?: string;
  agreed_value?: boolean;
}

export interface Acord140Building {
  location_number?: string;
  building_number?: string;
  address: AcordAddress;
  description?: string;
  construction_type?: string;
  num_stories?: string;
  year_built?: string;
  total_area_sq_ft?: string;
  
  // Fire protection
  protection_class?: string;
  distance_to_hydrant?: string;
  distance_to_fire_station?: string;
  
  // Updates
  wiring_year?: string;
  plumbing_year?: string;
  roofing_year?: string;
  heating_year?: string;
  roof_type?: string;
  
  // Protective devices
  burglar_alarm_type?: string;
  fire_alarm_type?: string;
  sprinkler_pct?: string;
  num_guards?: string;
  
  // Subjects of insurance for this building
  subjects: Acord140SubjectOfInsurance[];
}

export interface Acord140Data {
  header: AcordHeader;
  buildings: Acord140Building[];
  
  // Optional coverages
  earthquake_coverage?: boolean;
  flood_coverage?: boolean;
  ordinance_or_law?: boolean;
  equipment_breakdown?: boolean;
  
  // General info Y/N
  general_info_questions: Record<string, string>;
  
  remarks?: string;
}

// ─── ACORD 75 — Insurance Binder ─────────────────────────────

export interface Acord75AdditionalParty {
  name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  roles: {
    mortgagee?: boolean;
    loss_payee?: boolean;
    additional_insured?: boolean;
  };
}

export interface Acord75Data {
  header: AcordHeader;

  // Binder meta
  binder_number?: string;
  binder_title?: string;
  per_expiring_policy_number?: string;
  loan_number?: string;

  // Agency
  agency_name?: string;
  agency_customer_id?: string;
  agency_phone?: string;
  agency_fax?: string;

  // Insured
  insured_name: string;
  description_of_operations?: string;

  // Company / Carrier
  carrier_name?: string;

  // Additional parties (mortgagees, loss payees, additional insureds)
  additional_parties: Acord75AdditionalParty[];

  // ── Coverages ──

  // GL
  gl_trigger?: string; // "OCCURRENCE" | "CLAIMS_MADE"
  gl_each_occurrence?: string;
  gl_general_aggregate?: string;
  gl_products_comp_ops_agg?: string;
  gl_personal_adv_injury?: string;
  gl_damage_to_premises_rented?: string;
  gl_medical_expense?: string;
  gl_retro_date?: string;

  // Auto
  auto_any_auto?: boolean;
  auto_owned_only?: boolean;
  auto_scheduled_only?: boolean;
  auto_hired_only?: boolean;
  auto_non_owned_only?: boolean;
  auto_combined_single_limit?: string;
  auto_bi_per_person?: string;
  auto_bi_per_accident?: string;
  auto_property_damage?: string;
  auto_um_uim_limit?: string;
  auto_pip_limit?: string;
  auto_med_pay_limit?: string;

  // Vehicle Physical Damage
  vpd_valuation?: string;
  vpd_collision_deductible?: string;
  vpd_other_than_collision_deductible?: string;
  vpd_applies_to?: string;

  // Property
  property_causes_of_loss?: string; // "BASIC" | "BROAD" | "SPECIAL"
  property_limit?: string;
  property_deductible?: string;
  property_coinsurance_pct?: string;

  // Workers Comp
  wc_per_statute?: boolean;
  wc_each_accident?: string;
  wc_disease_each_employee?: string;
  wc_disease_policy_limit?: string;

  // Excess / Umbrella
  excess_form?: string; // "UMBRELLA" | "EXCESS"
  excess_trigger?: string; // "OCCURRENCE" | "CLAIMS_MADE"
  excess_each_occurrence?: string;
  excess_aggregate?: string;
  excess_sir?: string;
  excess_retro_date?: string;

  // Financials
  fees?: string;
  taxes?: string;
  estimated_total_premium?: string;

  // Special conditions / remarks
  special_conditions?: string;
  remarks?: string;
}

// ─── Union type for all form data ───────────────────────────

export type AcordFormData = 
  | { form_type: "ACORD_127"; data: Acord127Data }
  | { form_type: "ACORD_130"; data: Acord130Data }
  | { form_type: "ACORD_131"; data: Acord131Data }
  | { form_type: "ACORD_140"; data: Acord140Data }
  | { form_type: "ACORD_75";  data: Acord75Data };

export type AcordFormType = "ACORD_125" | "ACORD_126" | "ACORD_127" | "ACORD_130" | "ACORD_131" | "ACORD_140" | "ACORD_75";

export const ACORD_FORM_TYPE_LABELS: Record<AcordFormType, string> = {
  ACORD_125: "ACORD 125 — Commercial Insurance Application",
  ACORD_126: "ACORD 126 — Commercial General Liability",
  ACORD_127: "ACORD 127 — Business Auto",
  ACORD_130: "ACORD 130 — Workers Compensation",
  ACORD_131: "ACORD 131 — Umbrella / Excess",
  ACORD_140: "ACORD 140 — Property",
  ACORD_75:  "ACORD 75 — Workers Comp Application",
};

/** Map form_type string to our internal formId used elsewhere */
export const FORM_TYPE_TO_ID: Record<AcordFormType, string> = {
  ACORD_125: "acord-125",
  ACORD_126: "acord-126",
  ACORD_127: "acord-127",
  ACORD_130: "acord-130",
  ACORD_131: "acord-131",
  ACORD_140: "acord-140",
  ACORD_75:  "acord-75",
};

export const ID_TO_FORM_TYPE: Record<string, AcordFormType> = Object.fromEntries(
  Object.entries(FORM_TYPE_TO_ID).map(([k, v]) => [v, k as AcordFormType])
);
