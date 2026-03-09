/**
 * ACORD Question Definitions
 * 
 * Maps intake form questions to ACORD form fields.
 * Each question's `key` must match the field keys used in acord-field-map.ts
 * and the CommercialFormData state so data flows directly from intake → ACORD prefill.
 */

export type AcordCode = "125" | "126" | "127" | "130" | "131" | "140" | "75" | "PL" | "CYBER" | "OTHER";

export type AcordSection =
  | "business"
  | "locations"
  | "vehicles"
  | "wc"
  | "property"
  | "umbrella"
  | "professional"
  | "cyber"
  | "other"
  | "binder";

export type QuestionType = "text" | "number" | "select" | "boolean" | "currency" | "date";

export interface AcordQuestion {
  acord: AcordCode;
  key: string;
  label: string;
  type: QuestionType;
  required: boolean;
  section: AcordSection;
  options?: string[];
  placeholder?: string;
  dependsOn?: (form: Record<string, any>) => boolean;
}

/* ═══════════════════════════════════════════════════════════════
   ACORD 125 – Commercial Insurance Application (base)
   ═══════════════════════════════════════════════════════════════ */
const ACORD_125: AcordQuestion[] = [
  { acord: "125", key: "business_name", label: "Legal business name", type: "text", required: true, section: "business" },
  { acord: "125", key: "dba", label: "Doing Business As (DBA), if different", type: "text", required: false, section: "business" },
  { acord: "125", key: "business_entity_type", label: "Business entity type", type: "select", required: true, section: "business",
    options: ["Individual", "Partnership", "Corporation", "LLC", "LLP", "Non-profit", "Trust", "Other"] },
  { acord: "125", key: "mailing_address", label: "Mailing address", type: "text", required: true, section: "business" },
  { acord: "125", key: "years_in_business", label: "Years in business under this name", type: "number", required: true, section: "business" },
  { acord: "125", key: "primary_naics", label: "Primary NAICS / business classification", type: "text", required: false, section: "business",
    placeholder: "e.g. 238210 – Electrical Contractors" },
  { acord: "125", key: "has_prior_coverage", label: "Has had prior insurance coverage", type: "boolean", required: true, section: "business" },
  { acord: "125", key: "loss_history_years", label: "How many years of loss history can you provide?", type: "number", required: false, section: "business" },
];

/* ═══════════════════════════════════════════════════════════════
   ACORD 126 – General Liability
   ═══════════════════════════════════════════════════════════════ */
const ACORD_126: AcordQuestion[] = [
  { acord: "126", key: "gl_class_description", label: "Describe your operations for General Liability", type: "text", required: true, section: "business",
    placeholder: "e.g. Electrical contractor performing residential and commercial wiring" },
  { acord: "126", key: "annual_payroll_total", label: "Total annual payroll (all employees)", type: "currency", required: true, section: "business" },
  { acord: "126", key: "annual_gross_sales", label: "Estimated annual gross sales", type: "currency", required: true, section: "business" },
  { acord: "126", key: "gl_each_occurrence_limit", label: "Requested GL each occurrence limit", type: "currency", required: false, section: "business",
    placeholder: "$1,000,000" },
  { acord: "126", key: "gl_general_aggregate_limit", label: "Requested GL general aggregate limit", type: "currency", required: false, section: "business",
    placeholder: "$2,000,000" },
  { acord: "126", key: "gl_products_completed_ops", label: "Products/completed operations aggregate limit", type: "currency", required: false, section: "business",
    placeholder: "$2,000,000" },
  { acord: "126", key: "gl_personal_adv_injury", label: "Personal & advertising injury limit", type: "currency", required: false, section: "business",
    placeholder: "$1,000,000" },
  { acord: "126", key: "gl_damage_to_premises_rented", label: "Damage to premises rented to you limit", type: "currency", required: false, section: "business",
    placeholder: "$100,000" },
  { acord: "126", key: "gl_medical_payments", label: "Medical payments limit (per person)", type: "currency", required: false, section: "business",
    placeholder: "$5,000" },
  { acord: "126", key: "gl_products_completed_ops_desired", label: "Is Products/Completed Operations coverage desired?", type: "boolean", required: false, section: "business" },
  { acord: "126", key: "gl_additional_insureds_needed", label: "Are any Additional Insureds required?", type: "boolean", required: false, section: "business" },
  { acord: "126", key: "gl_additional_insureds_text", label: "List additional insured names/entities", type: "text", required: false, section: "business",
    placeholder: "e.g. ABC Property Management, LLC",
    dependsOn: (f) => f.gl_additional_insureds_needed === true || f.gl_additional_insureds_needed === "yes" },
  { acord: "126", key: "gl_work_at_third_party_premises", label: "Do you work at customer/third-party premises more than 50% of the time?", type: "boolean", required: false, section: "business" },
  { acord: "126", key: "gl_high_risk_work", label: "Any work involving heights over 3 stories, cranes, or structural changes?", type: "boolean", required: false, section: "business" },
];

/* ═══════════════════════════════════════════════════════════════
   ACORD 127 – Business Auto
   ═══════════════════════════════════════════════════════════════ */
const ACORD_127: AcordQuestion[] = [
  { acord: "127", key: "owns_or_leases_vehicles", label: "Do you own or lease any vehicles in the business name?", type: "boolean", required: true, section: "vehicles" },
  { acord: "127", key: "num_power_units", label: "How many power units (trucks, tractors, service vehicles)?", type: "number", required: false, section: "vehicles",
    dependsOn: (f) => f.owns_or_leases_vehicles === true || f.owns_or_leases_vehicles === "yes" },
  { acord: "127", key: "num_private_passenger", label: "How many private passenger vehicles?", type: "number", required: false, section: "vehicles",
    dependsOn: (f) => f.owns_or_leases_vehicles === true || f.owns_or_leases_vehicles === "yes" },
  { acord: "127", key: "any_hired_non_owned_auto", label: "Do you hire or use non-owned vehicles for business?", type: "boolean", required: true, section: "vehicles" },
  { acord: "127", key: "auto_csl_limit", label: "Requested auto liability combined single limit", type: "currency", required: false, section: "vehicles",
    placeholder: "$1,000,000" },
  { acord: "127", key: "auto_um_uim_limit", label: "Uninsured/underinsured motorist limit", type: "currency", required: false, section: "vehicles" },
  { acord: "127", key: "auto_med_pay_limit", label: "Medical payments limit", type: "currency", required: false, section: "vehicles" },
  { acord: "127", key: "auto_comp_deductible", label: "Comprehensive deductible", type: "currency", required: false, section: "vehicles",
    placeholder: "$500" },
  { acord: "127", key: "auto_collision_deductible", label: "Collision deductible", type: "currency", required: false, section: "vehicles",
    placeholder: "$1,000" },
  { acord: "127", key: "auto_physical_damage_desired", label: "Is physical damage coverage desired on owned vehicles?", type: "boolean", required: false, section: "vehicles",
    dependsOn: (f) => f.owns_or_leases_vehicles === true || f.owns_or_leases_vehicles === "yes" },
  { acord: "127", key: "auto_garagekeeping_pd", label: "Any garage-keeping or hired-car physical damage needed?", type: "boolean", required: false, section: "vehicles",
    dependsOn: (f) => f.any_hired_non_owned_auto === true || f.any_hired_non_owned_auto === "yes" },
  { acord: "127", key: "auto_travel_radius", label: "How far do your vehicles routinely travel from your main location?", type: "select", required: false, section: "vehicles",
    options: ["0–50 miles", "51–200 miles", "200+ miles"],
    dependsOn: (f) => f.owns_or_leases_vehicles === true || f.owns_or_leases_vehicles === "yes" },
  { acord: "127", key: "auto_interstate_or_contract_haul", label: "Do any vehicles cross state lines or haul for others under contract?", type: "boolean", required: false, section: "vehicles",
    dependsOn: (f) => f.owns_or_leases_vehicles === true || f.owns_or_leases_vehicles === "yes" },
];

/* ═══════════════════════════════════════════════════════════════
   ACORD 130 – Workers Compensation
   ═══════════════════════════════════════════════════════════════ */
const ACORD_130: AcordQuestion[] = [
  { acord: "130", key: "has_employees", label: "Do you have any employees (including owners on payroll)?", type: "boolean", required: true, section: "wc" },
  { acord: "130", key: "num_full_time_employees", label: "Number of full-time employees", type: "number", required: true, section: "wc",
    dependsOn: (f) => f.has_employees === true || f.has_employees === "yes" },
  { acord: "130", key: "num_part_time_employees", label: "Number of part-time or seasonal employees", type: "number", required: false, section: "wc",
    dependsOn: (f) => f.has_employees === true || f.has_employees === "yes" },
  { acord: "130", key: "annual_wc_payroll", label: "Estimated annual payroll subject to Workers Comp", type: "currency", required: true, section: "wc",
    dependsOn: (f) => f.has_employees === true || f.has_employees === "yes" },
  { acord: "130", key: "wc_class_codes", label: "Primary Workers Comp class codes and descriptions", type: "text", required: false, section: "wc",
    placeholder: "e.g. 5190 – Electrical Wiring",
    dependsOn: (f) => f.has_employees === true || f.has_employees === "yes" },
  { acord: "130", key: "wc_states_of_operation", label: "State(s) of operation for Workers Comp", type: "text", required: false, section: "wc",
    placeholder: "e.g. TX, CA, FL",
    dependsOn: (f) => f.has_employees === true || f.has_employees === "yes" },
  { acord: "130", key: "wc_include_owners", label: "Include owners/officers in Workers Comp coverage?", type: "boolean", required: false, section: "wc",
    dependsOn: (f) => f.has_employees === true || f.has_employees === "yes" },
  { acord: "130", key: "any_subcontractors", label: "Do you use subcontractors?", type: "boolean", required: false, section: "wc" },
  { acord: "130", key: "subcontractor_costs", label: "Estimated annual cost of subcontracted work", type: "currency", required: false, section: "wc",
    dependsOn: (f) => f.any_subcontractors === true || f.any_subcontractors === "yes" },
  { acord: "130", key: "wc_experience_mod", label: "Experience Modification Rate (if known)", type: "text", required: false, section: "wc",
    placeholder: "e.g. 1.00" },
];

/* ═══════════════════════════════════════════════════════════════
   ACORD 131 – Umbrella / Excess
   ═══════════════════════════════════════════════════════════════ */
const ACORD_131: AcordQuestion[] = [
  { acord: "131", key: "umbrella_limit", label: "Requested Umbrella / Excess limit", type: "currency", required: true, section: "umbrella",
    placeholder: "$1,000,000" },
  { acord: "131", key: "umbrella_underlying_policies", label: "Which policies should Umbrella sit over?", type: "text", required: false, section: "umbrella",
    placeholder: "GL, Auto, Employers Liability, etc." },
  { acord: "131", key: "umbrella_retention", label: "Self-insured retention (if any)", type: "currency", required: false, section: "umbrella" },
  { acord: "131", key: "umbrella_non_standard_underlying", label: "Any underlying policies NOT written at standard $1M per occurrence limits?", type: "boolean", required: false, section: "umbrella" },
  { acord: "131", key: "umbrella_non_standard_details", label: "Describe non-standard underlying limits", type: "text", required: false, section: "umbrella",
    placeholder: "e.g. Auto liability at $500K CSL",
    dependsOn: (f) => f.umbrella_non_standard_underlying === true || f.umbrella_non_standard_underlying === "yes" },
];

/* ═══════════════════════════════════════════════════════════════
   ACORD 140 – Commercial Property
   ═══════════════════════════════════════════════════════════════ */
const ACORD_140: AcordQuestion[] = [
  { acord: "140", key: "owns_or_leases_buildings", label: "Do you own or lease any buildings or locations to insure?", type: "boolean", required: true, section: "property" },
  { acord: "140", key: "num_locations", label: "How many locations/buildings do you need to schedule?", type: "number", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "primary_location_address", label: "Street address of your primary insured location", type: "text", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "primary_construction_type", label: "Construction type for primary building", type: "select", required: false, section: "property",
    options: ["Frame", "Joisted Masonry", "Non-combustible", "Masonry Non-combustible", "Modified Fire Resistive", "Fire Resistive"],
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "building_limit", label: "Building limit for primary location", type: "currency", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "bpp_limit", label: "Business Personal Property limit at primary location", type: "currency", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "bi_ee_limit", label: "Business Income / Extra Expense limit (or monthly indemnity)", type: "currency", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "property_year_built", label: "Year built for primary building", type: "number", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "property_square_footage", label: "Square footage of primary building", type: "number", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "property_stories", label: "Number of stories", type: "number", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "has_sprinkler", label: "Is the building fully sprinklered?", type: "boolean", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
  { acord: "140", key: "has_alarm_system", label: "Does the building have a fire/burglar alarm?", type: "boolean", required: false, section: "property",
    dependsOn: (f) => f.owns_or_leases_buildings === true || f.owns_or_leases_buildings === "yes" },
];

/* ═══════════════════════════════════════════════════════════════
   ACORD 75 – Binder Essentials (internal, not client-facing)
   ═══════════════════════════════════════════════════════════════ */
const ACORD_75: AcordQuestion[] = [
  { acord: "75", key: "binder_effective_date", label: "Binder effective date", type: "date", required: false, section: "binder" },
  { acord: "75", key: "binder_expiration_date", label: "Binder expiration date", type: "date", required: false, section: "binder" },
  { acord: "75", key: "binder_total_premium", label: "Estimated total annual premium for this binder", type: "currency", required: false, section: "binder" },
  { acord: "75", key: "binder_agency_fees", label: "Any agency/broker fees to include on binder", type: "currency", required: false, section: "binder" },
  { acord: "75", key: "binder_special_conditions", label: "Any special conditions or lender requirements", type: "text", required: false, section: "binder" },
];

/* ═══════════════════════════════════════════════════════════════
   Combined catalog
   ═══════════════════════════════════════════════════════════════ */
export const ACORD_QUESTION_DEFS: AcordQuestion[] = [
  ...ACORD_125,
  ...ACORD_126,
  ...ACORD_127,
  ...ACORD_130,
  ...ACORD_131,
  ...ACORD_140,
  ...ACORD_75,
];

/**
 * Given selected coverage lines, determine which ACORD codes are needed
 * and return the filtered question set.
 */
export function getQuestionsForCoverage(selectedLines: string[]): AcordQuestion[] {
  const acordSet = new Set<AcordCode>(["125"]); // Always include 125

  for (const line of selectedLines) {
    const normalized = line.toLowerCase();
    if (normalized.includes("general liability") || normalized.includes("gl")) acordSet.add("126");
    if (normalized.includes("auto")) acordSet.add("127");
    if (normalized.includes("workers") || normalized.includes("wc")) acordSet.add("130");
    if (normalized.includes("property")) acordSet.add("140");
    if (normalized.includes("umbrella") || normalized.includes("excess")) acordSet.add("131");
    if (normalized.includes("cyber")) acordSet.add("75");
  }

  return ACORD_QUESTION_DEFS.filter(q => acordSet.has(q.acord));
}

/**
 * Group questions by their section for step-based rendering.
 */
export function groupQuestionsBySection(questions: AcordQuestion[]): Record<AcordSection, AcordQuestion[]> {
  const groups: Record<string, AcordQuestion[]> = {};
  for (const q of questions) {
    if (!groups[q.section]) groups[q.section] = [];
    groups[q.section].push(q);
  }
  return groups as Record<AcordSection, AcordQuestion[]>;
}

/** Section display labels */
export const SECTION_LABELS: Record<AcordSection, string> = {
  business: "Business Details",
  locations: "Locations",
  vehicles: "Commercial Auto",
  wc: "Workers Compensation",
  property: "Commercial Property",
  umbrella: "Umbrella / Excess",
  binder: "Binder",
};

/** Section icons (lucide icon names) */
export const SECTION_ICONS: Record<AcordSection, string> = {
  business: "Building2",
  locations: "MapPin",
  vehicles: "Car",
  wc: "HardHat",
  property: "Home",
  umbrella: "Umbrella",
  binder: "FileText",
};
