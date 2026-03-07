/**
 * ACORD Extraction Pipeline — form-specific mappers.
 * 
 * Each mapper takes OCR text + existing extracted data and returns
 * a structured object matching the canonical schema for that form type.
 * 
 * Hybrid approach:
 * - Rule/anchor-based mapping for stable labels
 * - LLM-based extraction via the map-fields edge function for normalization
 * 
 * This module is purely for converting flat form_data records into
 * the canonical schemas. The actual AI extraction happens in edge functions.
 */

import type {
  Acord127Data, Acord127Driver, Acord127Vehicle,
  Acord130Data, Acord130ClassCode,
  Acord131Data, Acord131UnderlyingPolicy,
  Acord140Data, Acord140Building,
  Acord75Data,
  AcordHeader, AcordAddress, AcordOfficer, AcordLossRecord,
} from "./acord-schemas";

// ─── Helpers ────────────────────────────────────────────────

function extractHeader(data: Record<string, any>): AcordHeader {
  return {
    agency_name: data.agency_name || "",
    agency_customer_id: data.agency_customer_id,
    carrier: data.carrier,
    naic_code: data.naic_code,
    policy_number: data.policy_number,
    effective_date: data.effective_date || data.proposed_eff_date,
    expiration_date: data.expiration_date || data.proposed_exp_date,
    insured_name: data.insured_name || data.applicant_name || "",
    transaction_date: data.transaction_date,
  };
}

function extractAddress(data: Record<string, any>, prefix: string): AcordAddress {
  return {
    street: data[`${prefix}address`] || data[`${prefix}street`] || data[`${prefix}address_a`] || "",
    street2: data[`${prefix}address2`] || data[`${prefix}address_line2`],
    city: data[`${prefix}city`] || "",
    county: data[`${prefix}county`],
    state: data[`${prefix}state`] || "",
    zip: data[`${prefix}zip`] || "",
    country: data[`${prefix}country`],
  };
}

function extractNumberedItems<T>(
  data: Record<string, any>,
  prefix: string,
  maxCount: number,
  mapper: (data: Record<string, any>, idx: number) => T | null
): T[] {
  const items: T[] = [];
  for (let i = 1; i <= maxCount; i++) {
    const item = mapper(data, i);
    if (item) items.push(item);
  }
  return items;
}

// ─── ACORD 127 — Business Auto Mapper ───────────────────────

export function mapAcord127(data: Record<string, any>): Acord127Data {
  const drivers = extractNumberedItems<Acord127Driver>(data, "driver_", 13, (d, i) => {
    const name = d[`driver_${i}_first_name`] || d[`driver_${i}_name`];
    if (!name) return null;
    return {
      id: d[`driver_${i}_id`],
      first_name: d[`driver_${i}_first_name`] || name,
      middle: d[`driver_${i}_middle`],
      last_name: d[`driver_${i}_last_name`] || "",
      city: d[`driver_${i}_city`],
      state: d[`driver_${i}_state`],
      zip: d[`driver_${i}_zip`],
      sex: d[`driver_${i}_sex`],
      marital_status: d[`driver_${i}_marital`],
      dob: d[`driver_${i}_dob`],
      years_experience: d[`driver_${i}_experience`],
      license_number: d[`driver_${i}_license`],
      license_state: d[`driver_${i}_license_state`] || d[`driver_${i}_state_lic`],
      ssn: d[`driver_${i}_ssn`],
      hired_date: d[`driver_${i}_hired_date`],
      vehicle_id: d[`driver_${i}_vehicle_id`],
      vehicle_pct: d[`driver_${i}_vehicle_pct`],
    };
  });

  const vehicles = extractNumberedItems<Acord127Vehicle>(data, "vehicle_", 8, (d, i) => {
    const year = d[`vehicle_${i}_year`];
    const vin = d[`vehicle_${i}_vin`];
    if (!year && !vin) return null;
    return {
      id: d[`vehicle_${i}_id`],
      year: year || "",
      make: d[`vehicle_${i}_make`] || "",
      model: d[`vehicle_${i}_model`] || "",
      body_type: d[`vehicle_${i}_body_type`],
      vin: vin || "",
      cost_new: d[`vehicle_${i}_cost_new`],
      symbol: d[`vehicle_${i}_symbol`],
      comp_symbol: d[`vehicle_${i}_comp_symbol`],
      coll_symbol: d[`vehicle_${i}_coll_symbol`],
      garaging_address: i === 1 ? extractAddress(data, "garaging_") : extractAddress(data, `vehicle_${i}_garaging_`),
      registration_state: d[`vehicle_${i}_reg_state`],
      territory: d[`vehicle_${i}_territory`],
      gvw: d[`vehicle_${i}_gvw`],
      rate_class: d[`vehicle_${i}_rate_class`],
      sic: d[`vehicle_${i}_sic`],
      radius: d[`vehicle_${i}_radius`],
      farthest_zone: d[`vehicle_${i}_farthest_zone`],
      seating_capacity: d[`vehicle_${i}_seating`],
      comp_deductible: d[`vehicle_${i}_comp_deductible`],
      coll_deductible: d[`vehicle_${i}_coll_deductible`],
      premium: d[`vehicle_${i}_premium`],
    };
  });

  // Collect Y/N questions
  const qKeys = [
    "vehicles_not_solely_owned", "over_50pct_employees_use_autos",
    "vehicle_maintenance_program", "vehicles_leased_to_others",
    "modified_vehicles", "icc_puc_filings", "transporting_hazmat",
    "hold_harmless_agreements", "vehicles_used_by_family",
    "mvr_verifications", "driver_recruiting_method", "drivers_no_wc",
    "vehicles_not_scheduled", "drivers_with_violations",
    "agent_inspected_vehicles", "all_vehicles_in_fleet",
  ];
  const questions: Record<string, string> = {};
  for (const k of qKeys) {
    if (data[k]) questions[k] = data[k];
  }

  return {
    header: extractHeader(data),
    drivers,
    vehicles,
    garaging_address: extractAddress(data, "garaging_"),
    general_info_questions: questions,
    garage_storage_description: data.garage_storage_description,
    max_dollar_value_at_risk: data.max_dollar_value_at_risk,
    remarks: data.auto_remarks || data.remarks,
  };
}

// ─── ACORD 130 — Workers Compensation Mapper ────────────────

export function mapAcord130(data: Record<string, any>): Acord130Data {
  const officers = extractNumberedItems<AcordOfficer>(data, "officer_", 4, (d, i) => {
    const name = d[`officer_${i}_name`];
    if (!name) return null;
    return {
      name,
      title: d[`officer_${i}_title`],
      ownership_pct: d[`officer_${i}_ownership`],
      duties: d[`officer_${i}_duties`],
      dob: d[`officer_${i}_dob`],
      included_excluded: d[`officer_${i}_inc_exc`],
      class_code: d[`officer_${i}_class_code`],
      remuneration: d[`officer_${i}_remuneration`],
      state: d[`officer_${i}_state`],
      location: d[`officer_${i}_location`],
    };
  });

  const classCodes = extractNumberedItems<Acord130ClassCode>(data, "class_", 6, (d, i) => {
    const code = d[`class_code_${i}`];
    if (!code) return null;
    return {
      location: d[`class_loc_${String.fromCharCode(96 + i)}`],
      class_code: code,
      description: d[`class_description_${i}`] || "",
      duties: d[`class_duties_${i}`],
      sic: d[`class_sic_${String.fromCharCode(96 + i)}`],
      naics: d[`class_naics_${String.fromCharCode(96 + i)}`],
      num_employees: d[`num_employees_${i}`],
      num_part_time: d[`part_time_employees_${i}`],
      annual_remuneration: d[`annual_remuneration_${i}`] || "",
      rate: d[`rate_${i}`],
      estimated_premium: d[`est_premium_${i}`],
    };
  });

  const lossHistory = extractNumberedItems<AcordLossRecord>(data, "prior_wc_", 3, (d, i) => {
    const carrier = d[`prior_wc_carrier_${i}`];
    if (!carrier) return null;
    return {
      carrier,
      policy_number: d[`prior_wc_policy_${i}`],
      premium: d[`prior_wc_premium_${i}`],
      mod: d[`prior_mod_${i}`] || d[`prior_wc_mod_${i}`],
      num_claims: d[`prior_claims_${i}`] || d[`prior_wc_claims_${i}`],
      amount_paid: d[`prior_paid_${i}`] || d[`prior_wc_paid_${i}`],
      amount_reserved: d[`prior_reserved_${i}`] || d[`prior_wc_reserve_${i}`],
    };
  });

  const wcQuestionKeys = [
    "wc_aircraft_watercraft", "wc_hazardous_material", "wc_underground_above_15ft",
    "wc_barges_vessels_docks", "wc_other_business", "subcontractors_used",
    "wc_work_sublet_no_coi", "workplace_safety_program", "wc_group_transportation",
    "wc_under_16_over_60", "seasonal_employees", "wc_volunteer_labor",
    "wc_physical_handicaps", "wc_travel_out_of_state", "wc_athletic_teams",
    "wc_physicals_required", "wc_other_insurance_same", "wc_prior_declined",
    "wc_health_plans", "wc_employees_other_business", "wc_lease_employees",
    "wc_work_at_home", "wc_tax_liens_bankruptcy", "wc_unpaid_premium",
  ];
  const questions: Record<string, string> = {};
  for (const k of wcQuestionKeys) {
    if (data[k]) questions[k] = data[k];
  }

  return {
    header: extractHeader(data),
    applicant_address: extractAddress(data, "mailing_") || extractAddress(data, ""),
    business_type: data.business_type,
    fein: data.fein,
    ncci_risk_id: data.ncci_risk_id,
    years_in_business: data.years_in_business,
    sic_code: data.sic_code,
    naics_code: data.naics_code,
    wc_part1_states: data.wc_part1_states || "",
    wc_each_accident: data.wc_each_accident,
    wc_disease_policy_limit: data.wc_disease_policy_limit,
    wc_disease_each_employee: data.wc_disease_each_employee,
    additional_endorsements: data.additional_endorsements,
    total_estimated_premium: data.total_estimated_premium,
    total_minimum_premium: data.total_minimum_premium,
    total_deposit_premium: data.total_deposit_premium,
    officers,
    locations: [],
    rating_state: data.rating_state,
    class_codes: classCodes,
    experience_mod: data.experience_mod,
    mod_effective_date: data.mod_effective_date,
    loss_history: lossHistory,
    general_info_questions: questions,
    description_of_operations: data.description_of_operations,
    remarks: data.wc_remarks || data.remarks,
  };
}

// ─── ACORD 131 — Umbrella / Excess Mapper ───────────────────

export function mapAcord131(data: Record<string, any>): Acord131Data {
  const underlyingPolicies: Acord131UnderlyingPolicy[] = [];
  
  // Auto
  if (data.underlying_auto_carrier) {
    underlyingPolicies.push({
      line_of_business: "Auto",
      carrier: data.underlying_auto_carrier,
      policy_number: data.underlying_auto_policy_number,
      effective_date: data.underlying_auto_eff_date,
      expiration_date: data.underlying_auto_exp_date,
      limits: {
        csl: data.underlying_auto_csl,
        bi_each_accident: data.underlying_auto_bi_ea_acc,
        bi_each_person: data.underlying_auto_bi_ea_per,
        pd: data.underlying_auto_pd,
      },
      premium: data.underlying_auto_csl_premium || data.underlying_auto_bi_premium,
      mod_factor: data.underlying_auto_mod_factor,
    });
  }
  
  // GL
  if (data.underlying_gl_carrier) {
    underlyingPolicies.push({
      line_of_business: "General Liability",
      carrier: data.underlying_gl_carrier,
      policy_number: data.underlying_gl_policy_number,
      effective_date: data.underlying_gl_eff_date,
      expiration_date: data.underlying_gl_exp_date,
      limits: {
        occurrence: data.underlying_gl_occurrence,
        aggregate: data.underlying_gl_aggregate,
        products: data.underlying_gl_products,
        personal_injury: data.underlying_gl_personal,
      },
      premium: data.underlying_gl_prem_ops_premium,
      mod_factor: data.underlying_gl_mod_factor,
    });
  }
  
  // Employers Liability
  if (data.underlying_el_carrier) {
    underlyingPolicies.push({
      line_of_business: "Employers Liability",
      carrier: data.underlying_el_carrier,
      policy_number: data.underlying_el_policy_number,
      effective_date: data.underlying_el_eff_date,
      expiration_date: data.underlying_el_exp_date,
      limits: {
        each_accident: data.underlying_el_each_accident,
        disease_employee: data.underlying_el_disease_employee,
        disease_policy: data.underlying_el_disease_policy,
      },
      premium: data.underlying_el_premium,
      mod_factor: data.underlying_el_mod_factor,
    });
  }

  const questionKeys = [
    "q_excluded_uninsured_code", "q_aircraft_code", "q_explosives_code",
    "q_passengers_fee_code", "q_units_not_insured_code", "q_vehicles_leased_code",
    "q_hired_nonowned_code", "q_cranes_code", "q_subcontractors_code_131",
    "q_self_insured_code", "q_hazardous_materials_code", "q_product_loss_code",
  ];
  const questions: Record<string, string> = {};
  for (const k of questionKeys) {
    if (data[k]) questions[k] = data[k];
  }

  return {
    header: extractHeader(data),
    policy_type: data.umbrella_or_excess === "Excess" ? "Excess" : "Umbrella",
    coverage_basis: data.coverage_basis,
    each_occurrence_limit: data.each_occurrence_limit,
    aggregate_limit: data.aggregate_limit,
    retained_limit_occurrence: data.retained_limit_occurrence,
    retained_limit_aggregate: data.retained_limit_aggregate,
    self_insured_retention: data.self_insured_retention,
    retroactive_date: data.proposed_retroactive_date || data.retroactive_date,
    underlying_policies: underlyingPolicies,
    locations: [],
    ebl_each_employee: data.ebl_each_employee,
    ebl_aggregate: data.ebl_aggregate,
    ebl_retained_limit: data.ebl_retained_limit,
    ebl_retroactive_date: data.ebl_retroactive_date,
    loss_history: [],
    general_info_questions: questions,
    remarks: data.umbrella_remarks || data.remarks,
  };
}

// ─── ACORD 140 — Property Mapper ────────────────────────────

export function mapAcord140(data: Record<string, any>): Acord140Data {
  const buildings: Acord140Building[] = [];
  
  // Primary building from flat data
  const hasBuilding = data.building_amount || data.construction_type || data.year_built;
  if (hasBuilding) {
    const subjects = [];
    if (data.building_amount) {
      subjects.push({
        coverage: "Building",
        amount: data.building_amount,
        valuation: data.building_valuation,
        causes_of_loss: data.building_causes_of_loss,
        deductible: data.building_deductible,
        coinsurance_pct: data.building_coinsurance_pct,
      });
    }
    if (data.bpp_amount) {
      subjects.push({
        coverage: "Business Personal Property",
        amount: data.bpp_amount,
        valuation: data.bpp_valuation,
        causes_of_loss: data.bpp_causes_of_loss,
        deductible: data.bpp_deductible,
      });
    }
    if (data.business_income_amount) {
      subjects.push({ coverage: "Business Income", amount: data.business_income_amount });
    }
    if (data.extra_expense_amount) {
      subjects.push({ coverage: "Extra Expense", amount: data.extra_expense_amount });
    }
    if (data.rental_value_amount) {
      subjects.push({ coverage: "Rental Value", amount: data.rental_value_amount });
    }

    buildings.push({
      location_number: data.premises_loc_number || "001",
      building_number: data.premises_bldg_number || "001",
      address: extractAddress(data, "building_") || extractAddress(data, "premises_"),
      description: data.building_description,
      construction_type: data.construction_type,
      num_stories: data.num_stories,
      year_built: data.year_built,
      total_area_sq_ft: data.total_area_sq_ft,
      protection_class: data.protection_class,
      distance_to_hydrant: data.distance_to_hydrant,
      wiring_year: data.wiring_year,
      plumbing_year: data.plumbing_year,
      roofing_year: data.roofing_year,
      heating_year: data.heating_year,
      roof_type: data.roof_type,
      burglar_alarm_type: data.burglar_alarm_type,
      fire_alarm_type: data.fire_alarm_type,
      sprinkler_pct: data.sprinkler_pct,
      num_guards: data.num_guards_watchmen,
      subjects,
    });
  }

  return {
    header: extractHeader(data),
    buildings,
    earthquake_coverage: data.earthquake_coverage === "true" || data.earthquake_coverage === true,
    flood_coverage: data.flood_coverage === "true" || data.flood_coverage === true,
    general_info_questions: {},
    remarks: data.property_remarks || data.remarks,
  };
}

// ─── ACORD 75 — Workers Comp Application Mapper ─────────────

export function mapAcord75(data: Record<string, any>): Acord75Data {
  const officers = extractNumberedItems<AcordOfficer>(data, "officer_", 4, (d, i) => {
    const name = d[`officer_${i}_name`];
    if (!name) return null;
    return {
      name,
      title: d[`officer_${i}_title`],
      ownership_pct: d[`officer_${i}_ownership`],
      duties: d[`officer_${i}_duties`],
      remuneration: d[`officer_${i}_remuneration`],
    };
  });

  return {
    header: extractHeader(data),
    applicant_name: data.applicant_name || data.insured_name || "",
    applicant_address: extractAddress(data, "mailing_") || extractAddress(data, ""),
    fein: data.fein,
    business_type: data.business_type,
    nature_of_business: data.description_of_operations,
    locations: [],
    wc_states: data.wc_part1_states,
    employers_liability_each_accident: data.wc_each_accident,
    employers_liability_disease_policy: data.wc_disease_policy_limit,
    employers_liability_disease_each: data.wc_disease_each_employee,
    officers,
    experience_mod: data.experience_mod,
    general_info_questions: {},
    remarks: data.remarks,
  };
}

// ─── Dispatcher ─────────────────────────────────────────────

export function mapFormData(formType: string, data: Record<string, any>): any {
  switch (formType) {
    case "ACORD_127": return mapAcord127(data);
    case "ACORD_130": return mapAcord130(data);
    case "ACORD_131": return mapAcord131(data);
    case "ACORD_140": return mapAcord140(data);
    case "ACORD_75":  return mapAcord75(data);
    default: return data;
  }
}
