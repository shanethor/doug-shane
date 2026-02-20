import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Convert a generated form's structured data into a natural-language "document"
 * that simulates what an agent would paste or upload into the chat.
 */
function formDataToText(formType: string, data: Record<string, any>): string {
  if (formType === "restaurant_supplement") {
    const lines = [
      `Restaurant Supplement Form`,
      `Agency Customer ID: ${data.agency_customer_id || ""}`,
      `Location #: ${data.loc_number || ""}`,
      `Date: ${data.date || ""}`,
      `Named Insured: ${data.named_insured || ""}`,
      `Contact Name: ${data.contact_name || ""}`,
      `Contact Number: ${data.contact_number || ""}`,
      `Establishment Name: ${data.establishment_name || ""}`,
      `Location Street: ${data.location_street || ""}`,
      `City and State: ${data.city_state || ""}`,
      `Zip: ${data.zip || ""}`,
      `Applicant Type: ${data.applicant_type || ""}`,
      `Total Sales (food and liquor): ${data.total_sales || ""}`,
      `Food Sales Only: ${data.food_sales || ""}`,
      `Has Liquor Sales: ${data.has_liquor_sales ? "Yes" : "No"}`,
      `Building over 20 years old: ${data.building_age_over_20 || ""}`,
      `Roof update year: ${data.roof_update_year || ""}`,
      `Electrical update year: ${data.electrical_update_year || ""}`,
      `HVAC update year: ${data.hvac_update_year || ""}`,
      `Plumbing update year: ${data.plumbing_update_year || ""}`,
      `Wood frame construction: ${data.wood_frame || ""}`,
      `Fully sprinklered: ${data.fully_sprinklered || ""}`,
      `UL300 wet-chemical system: ${data.ul300_system || ""}`,
      `K Class fire extinguishers: ${data.k_class_extinguishers || ""}`,
      `Suppression service frequency: ${data.suppression_service_frequency || ""}`,
      `Suppression service vendor: ${data.suppression_vendor || ""}`,
      `Last suppression service date: ${data.last_suppression_service || ""}`,
      `All cooking under approved hood/duct: ${data.cooking_under_hood || ""}`,
      `Number of deep fat fryers: ${data.num_fryers || ""}`,
      `Number of woks: ${data.num_woks || ""}`,
      `Hood/duct professionally cleaned: ${data.hood_professionally_cleaned || ""}`,
      `Hood cleaning frequency: ${data.hood_cleaning_frequency || ""}`,
      `Hood cleaning vendor: ${data.hood_vendor || ""}`,
      `Last hood cleaning date: ${data.last_hood_cleaning || ""}`,
    ];

    if (data.has_liquor_sales) {
      lines.push(
        ``,
        `--- Liquor Liability Section ---`,
        `Name on liquor license: ${data.liquor_license_name || ""}`,
        `License number: ${data.liquor_license_number || ""}`,
        `Years at this location: ${data.years_at_location || ""}`,
        `Hours Mon-Thu: ${data.hours_mon_thu || ""}`,
        `Hours Friday: ${data.hours_fri || ""}`,
        `Hours Saturday: ${data.hours_sat || ""}`,
        `Hours Sunday: ${data.hours_sun || ""}`,
        `Type of business: ${data.business_type || ""}`,
        `Restaurant seating capacity: ${data.seating_restaurant || ""}`,
        `Bar seating capacity: ${data.seating_bar || ""}`,
        `Food receipts (est next 12 mo): ${data.food_receipts_est || ""}`,
        `Hard liquor receipts (est): ${data.hard_liquor_receipts_est || ""}`,
        `Beer receipts (est): ${data.beer_receipts_est || ""}`,
        `Wine receipts (est): ${data.wine_receipts_est || ""}`,
        `Number of servers: ${data.num_servers || ""}`,
        `Number of bartenders: ${data.num_bartenders || ""}`,
        `Entertainment provided: ${data.entertainment || ""}`,
        `Dancing permitted: ${data.dancing_permitted || ""}`,
        `Drink specials offered: ${data.drink_specials || ""}`,
        `IDs checked upon entry: ${data.id_checked || ""}`,
        `Staff training program: ${data.staff_training || ""}`,
      );
    }

    return lines.join("\n");
  }

  if (formType === "contractor_supplement") {
    const lines = [
      `Contractors Supplemental Application`,
      ``,
      `Section I - Applicant Information`,
      `Name of Applicant: ${data.applicant_name || ""}`,
      `Address: ${data.address || ""}`,
      `City: ${data.city || ""}`,
      `State: ${data.state || ""}`,
      `Zip Code: ${data.zip_code || ""}`,
      `Telephone: ${data.telephone || ""}`,
      `Website: ${data.website || ""}`,
      `States of Operation: ${data.states_of_operation || ""}`,
      `Licensed States: ${data.licensed_states || ""}`,
      `Years in Business: ${data.years_in_business || ""}`,
      `Contractor License #: ${data.contractor_license || ""}`,
      `Industry Experience: ${data.industry_experience || ""}`,
      `Description of Operations: ${data.description_of_operations || ""}`,
      ``,
      `Section II - Business Information`,
      `Business Type: ${data.business_type || ""}`,
      `Current Year Payroll: ${data.payroll_current || ""}`,
      `Current Year Receipts: ${data.receipts_current || ""}`,
      `Current Year Subcontractor Costs: ${data.subcontractor_costs_current || ""}`,
      `Prior Year 1 Payroll: ${data.payroll_prior_1 || ""}`,
      `Prior Year 1 Receipts: ${data.receipts_prior_1 || ""}`,
      `Prior Year 1 Sub Costs: ${data.subcontractor_costs_prior_1 || ""}`,
      `Prior Year 2 Payroll: ${data.payroll_prior_2 || ""}`,
      `Prior Year 2 Receipts: ${data.receipts_prior_2 || ""}`,
      `Prior Year 2 Sub Costs: ${data.subcontractor_costs_prior_2 || ""}`,
      `Owner/Officer Payroll: ${data.owner_payroll || ""}`,
      `Employee Payroll (non-owner): ${data.employee_payroll || ""}`,
      `Owns other business: ${data.owns_other_business || ""}`,
      `Bankruptcy history: ${data.bankruptcy || ""}`,
      ``,
      `Section III - Work Breakdown`,
      `Commercial New: ${data.commercial_new_pct || ""}`,
      `Commercial Remodel: ${data.commercial_remodel_pct || ""}`,
      `Residential New: ${data.residential_new_pct || ""}`,
      `Residential Remodel: ${data.residential_remodel_pct || ""}`,
      `Work types performed: ${Array.isArray(data.work_types_performed) ? data.work_types_performed.join(", ") : data.work_types_performed || ""}`,
      ``,
      `Section V - Current Projects`,
      ...(Array.isArray(data.largest_projects) ? data.largest_projects.map((p: any, i: number) => `Project ${i + 1}: ${p.description} - ${p.value}`) : []),
      ``,
      `Section VII - Safety`,
      `Formal safety program: ${data.has_safety_program || ""}`,
      `Safety rules: ${data.safety_rules || ""}`,
      `Fall protection: ${data.fall_protection || ""}`,
      `Subcontractor safety requirements: ${data.sub_safety_requirements || ""}`,
      `Safety meetings: ${data.safety_meetings || ""}`,
      `PPE mandated: ${data.ppe_mandated || ""}`,
      `OSHA violations (3 years): ${data.osha_violations || ""}`,
      `Uses scaffolding: ${data.uses_scaffolding || ""}`,
      `Maximum height: ${data.max_height_ft || ""} ft`,
      ``,
      `Section VIII - Liability & Risk Transfer`,
      `Requires sub contracts: ${data.requires_sub_contracts || ""}`,
      `Indemnification agreements: ${data.indemnification_agreements || ""}`,
      `Named additional insured: ${data.named_additional_insured || ""}`,
      `Waiver of subrogation: ${data.waiver_of_subrogation || ""}`,
      `Sub limits required: ${data.sub_limits_required || ""}`,
      `Sub workers comp required: ${data.sub_workers_comp_required || ""}`,
      `Certificates obtained: ${data.certificates_obtained || ""}`,
      `Has workers comp: ${data.has_workers_comp || ""}`,
      `Uses written customer contracts: ${data.uses_written_customer_contracts || ""}`,
      ``,
      `Section IX - Loss / Claim History`,
      `Pending claims: ${data.pending_claims || ""}`,
      `Breach of contract: ${data.breach_of_contract || ""}`,
      `Fired from job: ${data.fired_from_job || ""}`,
      `Faulty construction litigation: ${data.faulty_construction_litigation || ""}`,
      `Lapse in GL coverage: ${data.lapse_in_gl || ""}`,
    ];

    return lines.join("\n");
  }

  // ── Real policy types ─────────────────────────────────────────────────────
  if (formType === "real_policy_auto") {
    const lines = [
      `Commercial Business Auto Policy`,
      ``,
      `NAMED INSURED: ${data.named_insured || data.company_name || ""}`,
      `Mailing Address: ${data.mailing_address || data.street_address || ""}, ${data.city || ""}, ${data.state || ""} ${data.zip || ""}`,
      `Organization Type: ${data.organization_type || ""}`,
      ``,
      `AGENT / BROKER`,
      `Agent Name: ${data.agent_name || ""}`,
      `Agent Address: ${data.agent_address || ""}`,
      `Agent Phone: ${data.agent_phone || ""}`,
      ``,
      `POLICY INFORMATION`,
      `Policy Number: ${data.policy_number || ""}`,
      `Carrier: ${data.current_carrier || ""}`,
      `Effective Date: ${data.effective_date || ""}`,
      `Expiration Date: ${data.expiration_date || ""}`,
      `State: ${data.state || ""}`,
      ``,
      `COVERAGE SUMMARY`,
      `Auto Liability Limit (CSL): $${data.auto_liability_limit || ""}`,
      `Auto Liability Premium: $${data.auto_liability_premium || ""}`,
      `UM/UIM Limit: $${data.um_uim_limit || ""}`,
      `UM/UIM Premium: $${data.um_uim_premium || ""}`,
      `Medical Payments Limit: $${data.med_pay_limit || ""}`,
      `Medical Payments Premium: $${data.med_pay_premium || ""}`,
      `Comprehensive Premium: $${data.comp_premium || ""}`,
      `Collision Premium: $${data.collision_premium || ""}`,
      `Total 12-Month Premium: $${data.total_annual_premium || ""}`,
      `Blanket Waiver of Subrogation: ${data.blanket_waiver_of_subrogation || ""}`,
      `Blanket Additional Insured: ${data.additional_insured_blanket || ""}`,
      ``,
      `FLEET / VEHICLE INFORMATION`,
      `Number of Vehicles: ${data.number_of_vehicles || data.fleet_size || ""}`,
      `Radius of Operations: ${data.radius_of_operations || ""}`,
      `Garaging State: ${data.garaging_state || ""}`,
      `Garaging Zip: ${data.garaging_zip || ""}`,
      `Personal Use of Vehicles: ${data.personal_use_of_vehicles || ""}`,
      ``,
      `VEHICLE SCHEDULE`,
      `Vehicle 1: ${data.vehicle_1_year || ""} ${data.vehicle_1_make || ""} ${data.vehicle_1_model || ""} | VIN: ${data.vehicle_1_vin || ""} | Body: ${data.vehicle_1_body_type || ""} | Stated Amount: $${data.vehicle_1_stated_amount || ""} | Comp Ded: $${data.vehicle_1_comp_deductible || ""} | Coll Ded: $${data.vehicle_1_collision_deductible || ""}`,
      `Vehicle 2: ${data.vehicle_2_year || ""} ${data.vehicle_2_make || ""} ${data.vehicle_2_model || ""} | VIN: ${data.vehicle_2_vin || ""} | Body: ${data.vehicle_2_body_type || ""} | Stated Amount: $${data.vehicle_2_stated_amount || ""} | Comp Ded: $${data.vehicle_2_comp_deductible || ""} | Coll Ded: $${data.vehicle_2_collision_deductible || ""}`,
      `Vehicle 3: ${data.vehicle_3_year || ""} ${data.vehicle_3_make || ""} ${data.vehicle_3_model || ""} | VIN: ${data.vehicle_3_vin || ""} | Body: ${data.vehicle_3_body_type || ""} | Stated Amount: $${data.vehicle_3_stated_amount || ""} | Comp Ded: $${data.vehicle_3_comp_deductible || ""} | Coll Ded: $${data.vehicle_3_collision_deductible || ""}`,
      `Vehicle 4: ${data.vehicle_4_year || ""} ${data.vehicle_4_make || ""} ${data.vehicle_4_model || ""} | VIN: ${data.vehicle_4_vin || ""} | Body: ${data.vehicle_4_body_type || ""}`,
      `Vehicle 5: ${data.vehicle_5_year || ""} ${data.vehicle_5_make || ""} ${data.vehicle_5_model || ""} | VIN: ${data.vehicle_5_vin || ""} | Body: ${data.vehicle_5_body_type || ""} | Stated Amount: $${data.vehicle_5_stated_amount || ""} | Comp Ded: $${data.vehicle_5_comp_deductible || ""} | Coll Ded: $${data.vehicle_5_collision_deductible || ""}`,
      `Vehicle 6: ${data.vehicle_6_year || ""} ${data.vehicle_6_make || ""} ${data.vehicle_6_model || ""} | VIN: ${data.vehicle_6_vin || ""} | Body: ${data.vehicle_6_body_type || ""} | Comp Ded: $${data.vehicle_6_comp_deductible || ""} | Coll Ded: $${data.vehicle_6_collision_deductible || ""}`,
      ``,
      `RATED DRIVERS`,
      `Driver 1: ${data.driver_1_name || ""}`,
      `Driver 2: ${data.driver_2_name || ""}`,
      `Driver 3: ${data.driver_3_name || ""}`,
      `Driver 4: ${data.driver_4_name || ""}`,
      `Driver 5: ${data.driver_5_name || ""}`,
      `Driver 6: ${data.driver_6_name || ""}`,
      `Driver 7: ${data.driver_7_name || ""}`,
      `Driver 8: ${data.driver_8_name || ""}`,
      `Driver 9: ${data.driver_9_name || ""}`,
      `Driver 10: ${data.driver_10_name || ""}`,
      `Driver 11: ${data.driver_11_name || ""}`,
      `Driver 12: ${data.driver_12_name || ""}`,
      `Driver 13: ${data.driver_13_name || ""}`,
      `Driver 14: ${data.driver_14_name || ""}`,
      `Driver 15: ${data.driver_15_name || ""}`,
      `Driver 16: ${data.driver_16_name || ""}`,
      `Driver 17: ${data.driver_17_name || ""}`,
      `Driver 18: ${data.driver_18_name || ""}`,
      `Driver 19: ${data.driver_19_name || ""}`,
      `Driver 20: ${data.driver_20_name || ""}`,
      `Total Number of Drivers: ${data.number_of_drivers || ""}`,
      ``,
      `BUSINESS PROFILE`,
      `Description of Operations: ${data.description_of_operations || ""}`,
      `Industry: ${data.industry || ""}`,
      `Business Category: ${data.business_category || ""}`,
      `Has Workers Comp: ${data.has_workers_comp || ""}`,
    ];
    return lines.join("\n");
  }

  if (formType === "real_policy_property") {
    const lines = [
      `Commercial Property Policy`,
      ``,
      `NAMED INSURED: ${data.named_insured || data.company_name || ""}`,
      `Mailing Address: ${data.mailing_address || data.street_address || ""}, ${data.city || ""}, ${data.state || ""} ${data.zip || ""}`,
      `Organization Type: ${data.organization_type || ""}`,
      ``,
      `CARRIER / BROKER`,
      `Carrier: ${data.current_carrier || ""}`,
      `Broker: ${data.broker_name || ""}`,
      `Broker Address: ${data.broker_address || ""}`,
      `Surplus Lines: ${data.surplus_lines || ""}`,
      ``,
      `POLICY INFORMATION`,
      `Policy Number: ${data.policy_number || ""}`,
      `Effective Date: ${data.effective_date || ""}`,
      `Expiration Date: ${data.expiration_date || ""}`,
      `Date Issued: ${data.date_issued || ""}`,
      `Renewal or Replacement: ${data.renewal_or_replacement || ""}`,
      ``,
      `DESCRIBED PREMISES`,
      `Premises 1 Address: ${data.premises_1_address || ""}`,
      `Description of Business: ${data.description_of_business || ""}`,
      ``,
      `COVERAGE LIMITS`,
      `Building Limit: $${data.building_limit || ""}`,
      `Business Personal Property (BPP) Limit: $${data.bpp_limit || ""}`,
      `Business Income Limit: $${data.business_income_limit || ""}`,
      `Total Insured Value: $${data.total_insured_value || ""}`,
      `Causes of Loss: ${data.causes_of_loss || ""}`,
      `Building Valuation: ${data.building_valuation || ""}`,
      `BPP Valuation: ${data.bpp_valuation || ""}`,
      `Business Income Valuation: ${data.business_income_valuation || ""}`,
      `Equipment Breakdown Coverage: ${data.has_equipment_breakdown || ""}`,
      ``,
      `PREMIUMS`,
      `Property Premium: $${data.property_premium || ""}`,
      `Equipment Breakdown Premium: $${data.equipment_breakdown_premium || ""}`,
      `Total Annual Premium: $${data.total_annual_premium || ""}`,
      ``,
      `DEDUCTIBLES`,
      `Property Deductible: $${data.property_deductible || ""}`,
      `Wind/Hail Deductible: ${data.wind_hail_deductible_pct || ""} subject to $${data.wind_hail_deductible_minimum || ""} minimum`,
      `Deductible Notes: ${data.deductible_notes || ""}`,
      ``,
      `BUSINESS PROFILE`,
      `Description of Operations: ${data.description_of_operations || ""}`,
      `Industry: ${data.industry || ""}`,
    ];
    return lines.join("\n");
  }

  if (formType === "real_policy_excess") {
    const lines = [
      `Excess Liability / Umbrella Policy`,
      ``,
      `NAMED INSURED: ${data.named_insured || data.company_name || ""}`,
      `Mailing Address: ${data.mailing_address || data.street_address || ""}, ${data.city || ""}, ${data.state || ""} ${data.zip || ""}`,
      `Organization Type: ${data.organization_type || ""}`,
      ``,
      `CARRIER / BROKER`,
      `Carrier: ${data.current_carrier || ""}`,
      `Broker: ${data.broker_name || ""}`,
      `Third-Party Claims Administrator: ${data.third_party_claims_admin || ""}`,
      `Claims Phone: ${data.claims_phone || ""}`,
      `Surplus Lines: ${data.surplus_lines || ""}`,
      ``,
      `POLICY INFORMATION`,
      `Policy Number: ${data.policy_number || ""}`,
      `Coverage Type: ${data.coverage_type || ""}`,
      `Effective Date: ${data.effective_date || ""}`,
      `Expiration Date: ${data.expiration_date || ""}`,
      ``,
      `COVERAGE LIMITS`,
      `Each Occurrence / Each Claim Limit: $${data.excess_each_claim_limit || data.umbrella_each_occurrence || ""}`,
      `Aggregate Limit: $${data.excess_aggregate_limit || data.umbrella_aggregate || ""}`,
      ``,
      `PREMIUMS`,
      `Umbrella/Excess Premium: $${data.umbrella_premium || ""}`,
      `Total Charges (premium + fees + taxes): $${data.total_annual_premium || ""}`,
      `Broker Fee: $${data.broker_fee || ""}`,
      `Carrier Policy Fee: $${data.carrier_policy_fee || ""}`,
      `Surplus Lines Tax: $${data.surplus_lines_tax || ""}`,
      `Minimum Earned Premium: ${data.minimum_earned_premium_pct || ""}`,
      `Pay Plan: ${data.pay_plan || ""}`,
      `Terrorism Premium: ${data.terrorism_premium || ""}`,
      ``,
      `BUSINESS PROFILE`,
      `Description of Operations: ${data.description_of_operations || ""}`,
      `Industry: ${data.industry || ""}`,
      `Has Underlying GL: ${data.has_underlying_gl || ""}`,
    ];
    return lines.join("\n");
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Flatten a form's data for comparison - normalize values for matching
 */
function normalizeForComparison(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.sort().join(", ").toLowerCase();
  return String(value).replace(/[$,\s]+/g, "").toLowerCase();
}

/**
 * Compare extracted data against ground truth and produce a detailed report
 */
function compareExtraction(
  groundTruth: Record<string, any>,
  extracted: Record<string, any>
): {
  matched: string[];
  partial: string[];
  missed: string[];
  extra: string[];
  accuracy: number;
  details: Record<string, { expected: any; got: any; status: string }>;
} {
  const details: Record<string, { expected: any; got: any; status: string }> = {};
  const matched: string[] = [];
  const partial: string[] = [];
  const missed: string[] = [];
  const extra: string[] = [];

  // Skip meta/display fields that aren't insurance data
  const skipKeys = new Set(["form_type", "display_name"]);

  for (const [key, expectedVal] of Object.entries(groundTruth)) {
    if (skipKeys.has(key)) continue;
    if (expectedVal === null || expectedVal === undefined || expectedVal === "") continue;

    // Find matching extracted field (try exact, then common mappings)
    const mappings = getFieldMappings(key);
    let foundKey = "";
    let foundVal: any = undefined;

    for (const mk of mappings) {
      if (extracted[mk] !== undefined && extracted[mk] !== null && extracted[mk] !== "") {
        foundKey = mk;
        foundVal = extracted[mk];
        break;
      }
    }

    const expectedNorm = normalizeForComparison(expectedVal);

    if (foundVal !== undefined) {
      const gotNorm = normalizeForComparison(foundVal);
      if (expectedNorm === gotNorm) {
        matched.push(key);
        details[key] = { expected: expectedVal, got: foundVal, status: "match" };
      } else if (gotNorm.includes(expectedNorm) || expectedNorm.includes(gotNorm)) {
        partial.push(key);
        details[key] = { expected: expectedVal, got: foundVal, status: "partial" };
      } else {
        partial.push(key);
        details[key] = { expected: expectedVal, got: foundVal, status: "mismatch" };
      }
    } else {
      missed.push(key);
      details[key] = { expected: expectedVal, got: null, status: "missed" };
    }
  }

  // Check for extra fields AI found that weren't in ground truth
  for (const [key, val] of Object.entries(extracted)) {
    if (val === null || val === undefined || val === "") continue;
    const reverseKeys = Object.keys(groundTruth);
    const allMappings = reverseKeys.flatMap(k => getFieldMappings(k));
    if (!allMappings.includes(key) && !reverseKeys.includes(key)) {
      extra.push(key);
    }
  }

  const totalFields = matched.length + partial.length + missed.length;
  const accuracy = totalFields > 0 ? Math.round(((matched.length + partial.length * 0.5) / totalFields) * 100) : 0;

  return { matched, partial, missed, extra, accuracy, details };
}

/**
 * Map ground truth field keys to possible extraction field keys
 */
function getFieldMappings(key: string): string[] {
  const mappings: Record<string, string[]> = {
    // Restaurant supplement mappings
    named_insured: ["applicant_name", "named_insured", "insured_name", "company_name"],
    establishment_name: ["establishment_name", "dba_name", "business_name"],
    contact_name: ["contact_name", "contact_name_1"],
    contact_number: ["contact_number", "contact_phone_1", "phone", "business_phone"],
    location_street: ["location_street", "mailing_address", "premises_address", "address"],
    city_state: ["city_state"],
    zip: ["zip", "zip_code"],
    applicant_type: ["applicant_type", "business_type"],
    total_sales: ["total_sales", "annual_revenue", "annual_revenues", "gross_sales", "total_food_liquor_sales"],
    food_sales: ["food_sales", "food_sales_only"],
    has_liquor_sales: ["has_liquor_sales", "liquor_sales"],
    building_age_over_20: ["building_age_over_20", "building_over_20_years"],
    roof_update_year: ["roof_update_year", "roof_year"],
    electrical_update_year: ["electrical_update_year", "electrical_year"],
    hvac_update_year: ["hvac_update_year", "hvac_year"],
    plumbing_update_year: ["plumbing_update_year", "plumbing_year"],
    wood_frame: ["wood_frame", "wood_frame_construction"],
    fully_sprinklered: ["fully_sprinklered", "sprinkler_system"],
    ul300_system: ["ul300_system", "ul300_wet_chemical"],
    k_class_extinguishers: ["k_class_extinguishers", "k_class_fire_extinguishers"],
    suppression_service_frequency: ["suppression_service_frequency", "suppression_frequency"],
    suppression_vendor: ["suppression_vendor", "suppression_service_vendor"],
    last_suppression_service: ["last_suppression_service", "last_service_date"],
    cooking_under_hood: ["cooking_under_hood", "cooking_under_approved_hood"],
    num_fryers: ["num_fryers", "number_of_fryers", "fryers"],
    num_woks: ["num_woks", "number_of_woks", "woks"],
    hood_professionally_cleaned: ["hood_professionally_cleaned", "hood_cleaned"],
    hood_cleaning_frequency: ["hood_cleaning_frequency", "hood_duct_cleaning_frequency"],
    hood_vendor: ["hood_vendor", "hood_cleaning_vendor"],
    last_hood_cleaning: ["last_hood_cleaning", "last_hood_cleaning_date"],
    // Liquor section
    liquor_license_name: ["liquor_license_name", "license_name"],
    liquor_license_number: ["liquor_license_number", "license_number"],
    years_at_location: ["years_at_location"],
    hours_mon_thu: ["hours_mon_thu", "hours_monday_thursday"],
    hours_fri: ["hours_fri", "hours_friday"],
    hours_sat: ["hours_sat", "hours_saturday"],
    hours_sun: ["hours_sun", "hours_sunday"],
    business_type: ["business_type", "type_of_business", "applicant_type"],
    seating_restaurant: ["seating_restaurant", "restaurant_seating"],
    seating_bar: ["seating_bar", "bar_seating"],
    food_receipts_est: ["food_receipts_est", "food_receipts"],
    hard_liquor_receipts_est: ["hard_liquor_receipts_est", "hard_liquor_receipts"],
    beer_receipts_est: ["beer_receipts_est", "beer_receipts"],
    wine_receipts_est: ["wine_receipts_est", "wine_receipts"],
    num_servers: ["num_servers", "number_of_servers", "servers"],
    num_bartenders: ["num_bartenders", "number_of_bartenders", "bartenders"],
    entertainment: ["entertainment", "has_entertainment"],
    dancing_permitted: ["dancing_permitted", "dancing"],
    drink_specials: ["drink_specials", "has_drink_specials"],
    id_checked: ["id_checked", "ids_checked"],
    staff_training: ["staff_training", "has_staff_training"],
    // Contractor supplement mappings
    applicant_name: ["applicant_name", "named_insured", "insured_name", "company_name"],
    address: ["address", "mailing_address", "premises_address", "location_street"],
    city: ["city", "premises_city"],
    state: ["state", "premises_state", "states_of_operation"],
    zip_code: ["zip_code", "zip"],
    telephone: ["telephone", "phone", "business_phone", "contact_number"],
    website: ["website"],
    states_of_operation: ["states_of_operation", "state"],
    licensed_states: ["licensed_states", "licensed_in_states"],
    years_in_business: ["years_in_business", "year_established"],
    contractor_license: ["contractor_license", "license_number"],
    industry_experience: ["industry_experience"],
    description_of_operations: ["description_of_operations", "operations_description"],
    payroll_current: ["payroll_current", "current_payroll", "annual_remuneration"],
    receipts_current: ["receipts_current", "current_receipts", "annual_revenue"],
    subcontractor_costs_current: ["subcontractor_costs_current", "current_sub_costs"],
    payroll_prior_1: ["payroll_prior_1", "prior_year_payroll"],
    receipts_prior_1: ["receipts_prior_1", "prior_year_receipts"],
    subcontractor_costs_prior_1: ["subcontractor_costs_prior_1"],
    payroll_prior_2: ["payroll_prior_2"],
    receipts_prior_2: ["receipts_prior_2"],
    subcontractor_costs_prior_2: ["subcontractor_costs_prior_2"],
    owner_payroll: ["owner_payroll", "officer_payroll"],
    employee_payroll: ["employee_payroll"],
    commercial_new_pct: ["commercial_new_pct", "commercial_new_percent"],
    commercial_remodel_pct: ["commercial_remodel_pct", "commercial_remodel_percent"],
    residential_new_pct: ["residential_new_pct", "residential_new_percent"],
    residential_remodel_pct: ["residential_remodel_pct", "residential_remodel_percent"],
    work_types_performed: ["work_types_performed", "types_of_work"],
    has_safety_program: ["has_safety_program", "safety_program"],
    safety_rules: ["safety_rules"],
    fall_protection: ["fall_protection"],
    sub_safety_requirements: ["sub_safety_requirements"],
    safety_meetings: ["safety_meetings"],
    ppe_mandated: ["ppe_mandated"],
    osha_violations: ["osha_violations"],
    uses_scaffolding: ["uses_scaffolding", "scaffolding"],
    max_height_ft: ["max_height_ft", "maximum_height"],
    requires_sub_contracts: ["requires_sub_contracts"],
    indemnification_agreements: ["indemnification_agreements"],
    named_additional_insured: ["named_additional_insured"],
    waiver_of_subrogation: ["waiver_of_subrogation"],
    sub_limits_required: ["sub_limits_required", "subcontractor_limits"],
    sub_workers_comp_required: ["sub_workers_comp_required"],
    certificates_obtained: ["certificates_obtained"],
    has_workers_comp: ["has_workers_comp", "workers_comp"],
    uses_written_customer_contracts: ["uses_written_customer_contracts"],
    largest_projects: ["largest_projects", "projects"],
    pending_claims: ["pending_claims"],
    breach_of_contract: ["breach_of_contract"],
    fired_from_job: ["fired_from_job"],
    faulty_construction_litigation: ["faulty_construction_litigation"],
    lapse_in_gl: ["lapse_in_gl", "lapse_in_coverage"],
    owns_other_business: ["owns_other_business"],
    // ── Real policy shared fields ──────────────────────────────────────────
    named_insured: ["named_insured", "applicant_name", "insured_name", "company_name", "business_name"],
    company_name: ["company_name", "named_insured", "applicant_name", "business_name"],
    business_name: ["business_name", "named_insured", "company_name", "applicant_name"],
    mailing_address: ["mailing_address", "street_address", "address", "location_street", "premises_address"],
    street_address: ["street_address", "mailing_address", "address"],
    city: ["city", "premises_city"],
    state: ["state", "premises_state"],
    zip: ["zip", "zip_code", "premises_zip"],
    city_state_zip: ["city_state_zip", "city_state"],
    organization_type: ["organization_type", "business_type", "applicant_type"],
    business_type: ["business_type", "organization_type", "applicant_type"],
    // Policy shared
    policy_number: ["policy_number", "current_policy_number"],
    current_carrier: ["current_carrier", "carrier_name", "prior_carrier_1"],
    carrier_name: ["carrier_name", "current_carrier"],
    effective_date: ["effective_date", "proposed_eff_date"],
    expiration_date: ["expiration_date", "proposed_exp_date"],
    total_annual_premium: ["total_annual_premium", "current_premium", "total_estimated_premium"],
    broker_name: ["broker_name", "agent_name"],
    agent_name: ["agent_name", "broker_name"],
    surplus_lines: ["surplus_lines"],
    // Auto policy
    auto_liability_limit: ["auto_liability_limit", "each_occurrence"],
    auto_liability_premium: ["auto_liability_premium", "auto_premium"],
    um_uim_limit: ["um_uim_limit"],
    um_uim_premium: ["um_uim_premium"],
    med_pay_limit: ["med_pay_limit", "medical_payments"],
    med_pay_premium: ["med_pay_premium"],
    comp_premium: ["comp_premium"],
    collision_premium: ["collision_premium"],
    blanket_waiver_of_subrogation: ["blanket_waiver_of_subrogation", "waiver_of_subrogation"],
    additional_insured_blanket: ["additional_insured_blanket", "named_additional_insured"],
    number_of_vehicles: ["number_of_vehicles", "fleet_size"],
    fleet_size: ["fleet_size", "number_of_vehicles"],
    radius_of_operations: ["radius_of_operations", "radius_of_travel"],
    garaging_state: ["garaging_state", "state"],
    garaging_zip: ["garaging_zip", "zip"],
    personal_use_of_vehicles: ["personal_use_of_vehicles"],
    number_of_drivers: ["number_of_drivers"],
    has_auto_exposure: ["has_auto_exposure"],
    // Vehicle schedule
    vehicle_1_year: ["vehicle_1_year"],
    vehicle_1_make: ["vehicle_1_make"],
    vehicle_1_model: ["vehicle_1_model"],
    vehicle_1_vin: ["vehicle_1_vin"],
    vehicle_1_body_type: ["vehicle_1_body_type"],
    vehicle_1_stated_amount: ["vehicle_1_stated_amount"],
    vehicle_1_comp_deductible: ["vehicle_1_comp_deductible"],
    vehicle_1_collision_deductible: ["vehicle_1_collision_deductible"],
    vehicle_2_year: ["vehicle_2_year"],
    vehicle_2_make: ["vehicle_2_make"],
    vehicle_2_model: ["vehicle_2_model"],
    vehicle_2_vin: ["vehicle_2_vin"],
    vehicle_2_body_type: ["vehicle_2_body_type"],
    vehicle_2_stated_amount: ["vehicle_2_stated_amount"],
    vehicle_2_comp_deductible: ["vehicle_2_comp_deductible"],
    vehicle_2_collision_deductible: ["vehicle_2_collision_deductible"],
    vehicle_3_year: ["vehicle_3_year"],
    vehicle_3_make: ["vehicle_3_make"],
    vehicle_3_model: ["vehicle_3_model"],
    vehicle_3_vin: ["vehicle_3_vin"],
    vehicle_3_body_type: ["vehicle_3_body_type"],
    vehicle_3_stated_amount: ["vehicle_3_stated_amount"],
    vehicle_3_comp_deductible: ["vehicle_3_comp_deductible"],
    vehicle_3_collision_deductible: ["vehicle_3_collision_deductible"],
    vehicle_4_year: ["vehicle_4_year"],
    vehicle_4_make: ["vehicle_4_make"],
    vehicle_4_model: ["vehicle_4_model"],
    vehicle_4_vin: ["vehicle_4_vin"],
    vehicle_4_body_type: ["vehicle_4_body_type"],
    vehicle_5_year: ["vehicle_5_year"],
    vehicle_5_make: ["vehicle_5_make"],
    vehicle_5_model: ["vehicle_5_model"],
    vehicle_5_vin: ["vehicle_5_vin"],
    vehicle_5_body_type: ["vehicle_5_body_type"],
    vehicle_5_stated_amount: ["vehicle_5_stated_amount"],
    vehicle_5_comp_deductible: ["vehicle_5_comp_deductible"],
    vehicle_5_collision_deductible: ["vehicle_5_collision_deductible"],
    vehicle_6_year: ["vehicle_6_year"],
    vehicle_6_make: ["vehicle_6_make"],
    vehicle_6_model: ["vehicle_6_model"],
    vehicle_6_vin: ["vehicle_6_vin"],
    vehicle_6_body_type: ["vehicle_6_body_type"],
    vehicle_6_comp_deductible: ["vehicle_6_comp_deductible"],
    vehicle_6_collision_deductible: ["vehicle_6_collision_deductible"],
    // Driver names
    driver_1_name: ["driver_1_name"],
    driver_2_name: ["driver_2_name"],
    driver_3_name: ["driver_3_name"],
    driver_4_name: ["driver_4_name"],
    driver_5_name: ["driver_5_name"],
    driver_6_name: ["driver_6_name"],
    driver_7_name: ["driver_7_name"],
    driver_8_name: ["driver_8_name"],
    driver_9_name: ["driver_9_name"],
    driver_10_name: ["driver_10_name"],
    driver_11_name: ["driver_11_name"],
    driver_12_name: ["driver_12_name"],
    driver_13_name: ["driver_13_name"],
    driver_14_name: ["driver_14_name"],
    driver_15_name: ["driver_15_name"],
    driver_16_name: ["driver_16_name"],
    driver_17_name: ["driver_17_name"],
    driver_18_name: ["driver_18_name"],
    driver_19_name: ["driver_19_name"],
    driver_20_name: ["driver_20_name"],
    // Property policy
    building_limit: ["building_limit", "building_amount"],
    bpp_limit: ["bpp_limit", "bpp_amount"],
    business_income_limit: ["business_income_limit", "business_income_amount"],
    total_insured_value: ["total_insured_value"],
    causes_of_loss: ["causes_of_loss"],
    building_valuation: ["building_valuation"],
    bpp_valuation: ["bpp_valuation"],
    business_income_valuation: ["business_income_valuation"],
    has_equipment_breakdown: ["has_equipment_breakdown"],
    equipment_breakdown_premium: ["equipment_breakdown_premium"],
    property_premium: ["property_premium"],
    property_deductible: ["property_deductible"],
    wind_hail_deductible_pct: ["wind_hail_deductible_pct"],
    wind_hail_deductible_minimum: ["wind_hail_deductible_minimum"],
    deductible_notes: ["deductible_notes"],
    premises_1_address: ["premises_1_address", "premises_address"],
    description_of_business: ["description_of_business", "nature_of_business", "description_of_operations"],
    // Excess / umbrella policy
    excess_each_claim_limit: ["excess_each_claim_limit", "umbrella_each_occurrence", "each_occurrence_limit"],
    excess_aggregate_limit: ["excess_aggregate_limit", "umbrella_aggregate", "aggregate_limit"],
    umbrella_premium: ["umbrella_premium"],
    broker_fee: ["broker_fee"],
    carrier_policy_fee: ["carrier_policy_fee"],
    surplus_lines_tax: ["surplus_lines_tax"],
    minimum_earned_premium_pct: ["minimum_earned_premium_pct"],
    pay_plan: ["pay_plan"],
    terrorism_premium: ["terrorism_premium"],
    coverage_type: ["coverage_type"],
    has_underlying_gl: ["has_underlying_gl"],
    third_party_claims_admin: ["third_party_claims_admin"],
    claims_phone: ["claims_phone"],
    // Cross-form AI-inferred
    description_of_operations: ["description_of_operations", "nature_of_business", "description_of_business"],
    industry: ["industry", "nature_of_business"],
    business_category: ["business_category"],
    has_workers_comp: ["has_workers_comp", "workers_comp"],
    lob_auto: ["lob_auto"],
    lob_gl: ["lob_gl"],
    lob_property: ["lob_property"],
    lob_umbrella: ["lob_umbrella"],
    auto_premium: ["auto_premium"],
    inland_marine_premium: ["inland_marine_premium"],
    cyber_premium: ["cyber_premium"],
    crime_premium: ["crime_premium"],
    liquor_premium: ["liquor_premium"],
    // ── Legacy field keep-existing ─────────────────────────────────────────
    agency_customer_id: ["agency_customer_id"],
    loc_number: ["loc_number", "location_number"],
    date: ["date"],
  };

  return mappings[key] || [key];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { form_ids, user_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch forms
    let query = supabase.from("generated_forms").select("*");
    if (form_ids && form_ids.length > 0) {
      query = query.in("id", form_ids);
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    }
    query = query.order("created_at", { ascending: true });

    const { data: forms, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!forms || forms.length === 0) throw new Error("No forms found");

    const results: any[] = [];

    for (const form of forms) {
      const formData = form.form_data as Record<string, any>;
      const formText = formDataToText(form.form_type, formData);

      // Build the extraction prompt — policy-type-aware
      const isRealPolicy = form.form_type.startsWith("real_policy");
      const extractionPrompt = isRealPolicy
        ? `You are an expert commercial insurance underwriter and data extractor. Extract ALL structured data from this insurance policy document into the exact field keys defined in the tool schema.

CRITICAL RULES FOR POLICY DOCUMENTS:
- Extract named insured, address, city, state, zip precisely as written.
- Extract policy number, carrier name, effective date (YYYY-MM-DD), expiration date (YYYY-MM-DD).
- For currency/premium fields: extract the numeric value ONLY — no $ signs or commas (e.g. "145137" not "$145,137").
- For coverage limits: extract numeric value only (e.g. "1000000").
- For deductible amounts: extract numeric value only (e.g. "1000").
- For vehicle VINs: extract exact alphanumeric VIN string.
- For driver names: extract the full name as written.
- For Yes/No fields: return "Yes" or "No".
- For boolean fields (lob_auto, lob_gl, etc.): return true or false.
- For organization_type: return Corporation, LLC, Partnership, Sole Proprietor, etc.
- For surplus_lines: return "Yes" or "No".
- Infer business_category (e.g. "Contractor") from named insured and description.
- Infer industry (e.g. "General Contractor", "Restoration Contractor") from context.
- For auto policies: infer lob_auto=true; for property: lob_property=true; for excess: lob_umbrella=true.
- Set N/A coverage premiums to "0" (e.g. cyber_premium="0", liquor_premium="0" for a general contractor).

Document to extract:
${formText}`
        : `You are an expert insurance data extractor. Extract ALL data from this supplemental insurance form into structured fields.

IMPORTANT: Extract EVERY field present in the document. Do not skip any data. Use the exact field keys provided in the tool schema.

For Yes/No fields, return "Yes" or "No".
For currency fields, return the dollar amount as-is (e.g. "$1,528,996").
For percentages, return as-is (e.g. "27%").
For arrays (like work types), return as an array of strings.

Document to extract:
${formText}`;

      try {
        // Real policy schemas are too large for tool-calling (Google 400 schema branching limit).
        // Use plain JSON response mode instead — more reliable for large schemas.
        const requestBody: any = {
          model: isRealPolicy ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: isRealPolicy
                ? "You are a commercial insurance underwriter with deep expertise in extracting structured data from auto, property, and excess liability policy documents. Extract every field with precision. ALWAYS respond with valid JSON only, no markdown fences."
                : "You are a precise insurance form data extractor. Extract every single field from the provided form. ALWAYS respond with valid JSON only, no markdown fences.",
            },
            {
              role: "user",
              content: isRealPolicy
                ? `${extractionPrompt}\n\nRespond ONLY with a JSON object containing the extracted fields. No markdown, no explanation — just the JSON.`
                : extractionPrompt,
            },
          ],
        };

        // Supplement forms are small enough to use tool-calling reliably
        if (!isRealPolicy) {
          requestBody.tools = [
            {
              type: "function",
              function: {
                name: "extract_supplemental_form",
                description: "Extract all fields from a supplemental insurance form",
                parameters: buildExtractionSchema(form.form_type),
              },
            },
          ];
          requestBody.tool_choice = { type: "function", function: { name: "extract_supplemental_form" } };
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`AI error for form ${form.id}:`, response.status, errText);
          results.push({
            form_id: form.id,
            form_type: form.form_type,
            display_name: form.display_name,
            error: `AI error: ${response.status}`,
            accuracy: 0,
          });
          // Wait to avoid rate limiting
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const aiResult = await response.json();

        let extracted: Record<string, any>;
        if (isRealPolicy) {
          // Parse JSON from assistant message content
          const content = aiResult.choices?.[0]?.message?.content || "";
          const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
          try {
            extracted = JSON.parse(cleaned);
          } catch {
            console.error(`Failed to parse JSON for form ${form.id}:`, cleaned.slice(0, 200));
            results.push({
              form_id: form.id,
              form_type: form.form_type,
              display_name: form.display_name,
              error: "Failed to parse AI JSON response",
              accuracy: 0,
            });
            continue;
          }
        } else {
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) {
            results.push({
              form_id: form.id,
              form_type: form.form_type,
              display_name: form.display_name,
              error: "No structured data returned",
              accuracy: 0,
            });
            continue;
          }
          extracted = JSON.parse(toolCall.function.arguments);
        }
        const comparison = compareExtraction(formData, extracted);

        results.push({
          form_id: form.id,
          form_type: form.form_type,
          display_name: form.display_name,
          accuracy: comparison.accuracy,
          matched: comparison.matched.length,
          partial: comparison.partial.length,
          missed: comparison.missed.length,
          extra: comparison.extra.length,
          total_fields: comparison.matched.length + comparison.partial.length + comparison.missed.length,
          missed_fields: comparison.missed,
          partial_fields: comparison.partial,
          details: comparison.details,
          extracted_data: extracted,
        });
      } catch (e) {
        console.error(`Error processing form ${form.id}:`, e);
        results.push({
          form_id: form.id,
          form_type: form.form_type,
          display_name: form.display_name,
          error: e instanceof Error ? e.message : "Unknown error",
          accuracy: 0,
        });
      }

      // Rate limit protection - wait between calls
      await new Promise(r => setTimeout(r, 1500));
    }

    // Aggregate stats
    const successful = results.filter(r => !r.error);
    const avgAccuracy = successful.length > 0
      ? Math.round(successful.reduce((s, r) => s + r.accuracy, 0) / successful.length)
      : 0;

    // Find most commonly missed fields
    const missedFrequency: Record<string, number> = {};
    for (const r of successful) {
      for (const f of (r.missed_fields || [])) {
        missedFrequency[f] = (missedFrequency[f] || 0) + 1;
      }
    }
    const topMissed = Object.entries(missedFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([field, count]) => ({ field, count, pct: Math.round((count / successful.length) * 100) }));

    return new Response(JSON.stringify({
      summary: {
        total_forms: forms.length,
        successful: successful.length,
        failed: results.length - successful.length,
        avg_accuracy: avgAccuracy,
        top_missed_fields: topMissed,
      },
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("benchmark error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Build a comprehensive extraction schema based on form type
 */
function buildExtractionSchema(formType: string): any {
  // Real policy schemas
  if (formType === "real_policy_auto") return buildRealPolicyAutoSchema();
  if (formType === "real_policy_property") return buildRealPolicyPropertySchema();
  if (formType === "real_policy_excess") return buildRealPolicyExcessSchema();

  if (formType === "restaurant_supplement") {
    return {
      type: "object",
      properties: {
        agency_customer_id: { type: "string" },
        loc_number: { type: "string" },
        date: { type: "string" },
        named_insured: { type: "string" },
        contact_name: { type: "string" },
        contact_number: { type: "string" },
        establishment_name: { type: "string" },
        location_street: { type: "string" },
        city_state: { type: "string" },
        zip: { type: "string" },
        applicant_type: { type: "string" },
        total_sales: { type: "string" },
        food_sales: { type: "string" },
        has_liquor_sales: { type: "boolean" },
        building_age_over_20: { type: "string" },
        roof_update_year: { type: "string" },
        electrical_update_year: { type: "string" },
        hvac_update_year: { type: "string" },
        plumbing_update_year: { type: "string" },
        wood_frame: { type: "string" },
        fully_sprinklered: { type: "string" },
        ul300_system: { type: "string" },
        k_class_extinguishers: { type: "string" },
        suppression_service_frequency: { type: "string" },
        suppression_vendor: { type: "string" },
        last_suppression_service: { type: "string" },
        cooking_under_hood: { type: "string" },
        num_fryers: { type: "string" },
        num_woks: { type: "string" },
        hood_professionally_cleaned: { type: "string" },
        hood_cleaning_frequency: { type: "string" },
        hood_vendor: { type: "string" },
        last_hood_cleaning: { type: "string" },
        // Liquor section
        liquor_license_name: { type: "string" },
        liquor_license_number: { type: "string" },
        years_at_location: { type: "string" },
        hours_mon_thu: { type: "string" },
        hours_fri: { type: "string" },
        hours_sat: { type: "string" },
        hours_sun: { type: "string" },
        business_type: { type: "string" },
        seating_restaurant: { type: "string" },
        seating_bar: { type: "string" },
        food_receipts_est: { type: "string" },
        hard_liquor_receipts_est: { type: "string" },
        beer_receipts_est: { type: "string" },
        wine_receipts_est: { type: "string" },
        num_servers: { type: "string" },
        num_bartenders: { type: "string" },
        entertainment: { type: "string" },
        dancing_permitted: { type: "string" },
        drink_specials: { type: "string" },
        id_checked: { type: "string" },
        staff_training: { type: "string" },
      },
      required: ["named_insured"],
    };
  }

  // Contractor supplement
  return {
    type: "object",
    properties: {
      applicant_name: { type: "string" },
      address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      zip_code: { type: "string" },
      telephone: { type: "string" },
      website: { type: "string" },
      states_of_operation: { type: "string" },
      licensed_states: { type: "string" },
      years_in_business: { type: "string" },
      contractor_license: { type: "string" },
      industry_experience: { type: "string" },
      description_of_operations: { type: "string" },
      business_type: { type: "string" },
      payroll_current: { type: "string" },
      receipts_current: { type: "string" },
      subcontractor_costs_current: { type: "string" },
      payroll_prior_1: { type: "string" },
      receipts_prior_1: { type: "string" },
      subcontractor_costs_prior_1: { type: "string" },
      payroll_prior_2: { type: "string" },
      receipts_prior_2: { type: "string" },
      subcontractor_costs_prior_2: { type: "string" },
      owner_payroll: { type: "string" },
      employee_payroll: { type: "string" },
      owns_other_business: { type: "string" },
      bankruptcy: { type: "string" },
      commercial_new_pct: { type: "string" },
      commercial_remodel_pct: { type: "string" },
      residential_new_pct: { type: "string" },
      residential_remodel_pct: { type: "string" },
      work_types_performed: { type: "array", items: { type: "string" } },
      has_safety_program: { type: "string" },
      safety_rules: { type: "string" },
      fall_protection: { type: "string" },
      sub_safety_requirements: { type: "string" },
      safety_meetings: { type: "string" },
      ppe_mandated: { type: "string" },
      osha_violations: { type: "string" },
      uses_scaffolding: { type: "string" },
      max_height_ft: { type: "string" },
      requires_sub_contracts: { type: "string" },
      indemnification_agreements: { type: "string" },
      named_additional_insured: { type: "string" },
      waiver_of_subrogation: { type: "string" },
      sub_limits_required: { type: "string" },
      sub_workers_comp_required: { type: "string" },
      certificates_obtained: { type: "string" },
      has_workers_comp: { type: "string" },
      uses_written_customer_contracts: { type: "string" },
      largest_projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            value: { type: "string" },
          },
        },
      },
      pending_claims: { type: "string" },
      breach_of_contract: { type: "string" },
      fired_from_job: { type: "string" },
      faulty_construction_litigation: { type: "string" },
      lapse_in_gl: { type: "string" },
    },
    required: ["applicant_name"],
  };
}

// ── Real policy extraction schemas ────────────────────────────────────────────
function buildRealPolicyAutoSchema(): any {
  return {
    type: "object",
    properties: {
      named_insured: { type: "string" },
      company_name: { type: "string" },
      business_name: { type: "string" },
      mailing_address: { type: "string" },
      street_address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      zip: { type: "string" },
      city_state_zip: { type: "string" },
      organization_type: { type: "string" },
      business_type: { type: "string" },
      // Agent
      agent_name: { type: "string" },
      agent_address: { type: "string" },
      agent_phone: { type: "string" },
      // Policy
      policy_number: { type: "string" },
      current_carrier: { type: "string" },
      carrier_name: { type: "string" },
      effective_date: { type: "string" },
      expiration_date: { type: "string" },
      // Coverage
      auto_liability_limit: { type: "string" },
      auto_liability_premium: { type: "string" },
      um_uim_limit: { type: "string" },
      um_uim_premium: { type: "string" },
      med_pay_limit: { type: "string" },
      med_pay_premium: { type: "string" },
      comp_premium: { type: "string" },
      collision_premium: { type: "string" },
      total_annual_premium: { type: "string" },
      blanket_waiver_of_subrogation: { type: "string" },
      additional_insured_blanket: { type: "string" },
      // Fleet
      number_of_vehicles: { type: "string" },
      fleet_size: { type: "string" },
      radius_of_operations: { type: "string" },
      garaging_state: { type: "string" },
      garaging_zip: { type: "string" },
      personal_use_of_vehicles: { type: "string" },
      number_of_drivers: { type: "string" },
      // Vehicles
      vehicle_1_year: { type: "string" },
      vehicle_1_make: { type: "string" },
      vehicle_1_model: { type: "string" },
      vehicle_1_vin: { type: "string" },
      vehicle_1_body_type: { type: "string" },
      vehicle_1_stated_amount: { type: "string" },
      vehicle_1_comp_deductible: { type: "string" },
      vehicle_1_collision_deductible: { type: "string" },
      vehicle_2_year: { type: "string" },
      vehicle_2_make: { type: "string" },
      vehicle_2_model: { type: "string" },
      vehicle_2_vin: { type: "string" },
      vehicle_2_body_type: { type: "string" },
      vehicle_2_stated_amount: { type: "string" },
      vehicle_2_comp_deductible: { type: "string" },
      vehicle_2_collision_deductible: { type: "string" },
      vehicle_3_year: { type: "string" },
      vehicle_3_make: { type: "string" },
      vehicle_3_model: { type: "string" },
      vehicle_3_vin: { type: "string" },
      vehicle_3_body_type: { type: "string" },
      vehicle_3_stated_amount: { type: "string" },
      vehicle_3_comp_deductible: { type: "string" },
      vehicle_3_collision_deductible: { type: "string" },
      vehicle_4_year: { type: "string" },
      vehicle_4_make: { type: "string" },
      vehicle_4_model: { type: "string" },
      vehicle_4_vin: { type: "string" },
      vehicle_4_body_type: { type: "string" },
      vehicle_5_year: { type: "string" },
      vehicle_5_make: { type: "string" },
      vehicle_5_model: { type: "string" },
      vehicle_5_vin: { type: "string" },
      vehicle_5_body_type: { type: "string" },
      vehicle_5_stated_amount: { type: "string" },
      vehicle_5_comp_deductible: { type: "string" },
      vehicle_5_collision_deductible: { type: "string" },
      vehicle_6_year: { type: "string" },
      vehicle_6_make: { type: "string" },
      vehicle_6_model: { type: "string" },
      vehicle_6_vin: { type: "string" },
      vehicle_6_body_type: { type: "string" },
      vehicle_6_comp_deductible: { type: "string" },
      vehicle_6_collision_deductible: { type: "string" },
      // Drivers
      driver_1_name: { type: "string" },
      driver_2_name: { type: "string" },
      driver_3_name: { type: "string" },
      driver_4_name: { type: "string" },
      driver_5_name: { type: "string" },
      driver_6_name: { type: "string" },
      driver_7_name: { type: "string" },
      driver_8_name: { type: "string" },
      driver_9_name: { type: "string" },
      driver_10_name: { type: "string" },
      driver_11_name: { type: "string" },
      driver_12_name: { type: "string" },
      driver_13_name: { type: "string" },
      driver_14_name: { type: "string" },
      driver_15_name: { type: "string" },
      driver_16_name: { type: "string" },
      driver_17_name: { type: "string" },
      driver_18_name: { type: "string" },
      driver_19_name: { type: "string" },
      driver_20_name: { type: "string" },
      // Business profile
      description_of_operations: { type: "string" },
      industry: { type: "string" },
      business_category: { type: "string" },
      has_workers_comp: { type: "string" },
      has_auto_exposure: { type: "string" },
      lob_auto: { type: "boolean" },
      lob_gl: { type: "boolean" },
      auto_premium: { type: "string" },
      inland_marine_premium: { type: "string" },
      cyber_premium: { type: "string" },
      crime_premium: { type: "string" },
      liquor_premium: { type: "string" },
    },
    required: ["named_insured", "policy_number"],
  };
}

function buildRealPolicyPropertySchema(): any {
  return {
    type: "object",
    properties: {
      named_insured: { type: "string" },
      company_name: { type: "string" },
      business_name: { type: "string" },
      mailing_address: { type: "string" },
      street_address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      zip: { type: "string" },
      city_state_zip: { type: "string" },
      organization_type: { type: "string" },
      business_type: { type: "string" },
      // Carrier
      current_carrier: { type: "string" },
      carrier_name: { type: "string" },
      broker_name: { type: "string" },
      broker_address: { type: "string" },
      surplus_lines: { type: "string" },
      // Policy
      policy_number: { type: "string" },
      effective_date: { type: "string" },
      expiration_date: { type: "string" },
      date_issued: { type: "string" },
      renewal_or_replacement: { type: "string" },
      // Premises
      premises_1_address: { type: "string" },
      description_of_business: { type: "string" },
      description_of_operations: { type: "string" },
      // Coverage limits
      building_limit: { type: "string" },
      bpp_limit: { type: "string" },
      business_income_limit: { type: "string" },
      total_insured_value: { type: "string" },
      causes_of_loss: { type: "string" },
      building_valuation: { type: "string" },
      bpp_valuation: { type: "string" },
      business_income_valuation: { type: "string" },
      has_equipment_breakdown: { type: "string" },
      // Premiums
      property_premium: { type: "string" },
      equipment_breakdown_premium: { type: "string" },
      total_annual_premium: { type: "string" },
      // Deductibles
      property_deductible: { type: "string" },
      wind_hail_deductible_pct: { type: "string" },
      wind_hail_deductible_minimum: { type: "string" },
      deductible_notes: { type: "string" },
      // Business profile
      industry: { type: "string" },
      business_category: { type: "string" },
      lob_property: { type: "boolean" },
      lob_gl: { type: "boolean" },
      inland_marine_premium: { type: "string" },
      cyber_premium: { type: "string" },
      crime_premium: { type: "string" },
      liquor_premium: { type: "string" },
    },
    required: ["named_insured", "policy_number"],
  };
}

function buildRealPolicyExcessSchema(): any {
  return {
    type: "object",
    properties: {
      named_insured: { type: "string" },
      company_name: { type: "string" },
      business_name: { type: "string" },
      mailing_address: { type: "string" },
      street_address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      zip: { type: "string" },
      city_state_zip: { type: "string" },
      organization_type: { type: "string" },
      business_type: { type: "string" },
      // Carrier
      current_carrier: { type: "string" },
      carrier_name: { type: "string" },
      broker_name: { type: "string" },
      third_party_claims_admin: { type: "string" },
      claims_phone: { type: "string" },
      surplus_lines: { type: "string" },
      // Policy
      policy_number: { type: "string" },
      coverage_type: { type: "string" },
      effective_date: { type: "string" },
      expiration_date: { type: "string" },
      // Limits
      excess_each_claim_limit: { type: "string" },
      excess_aggregate_limit: { type: "string" },
      umbrella_each_occurrence: { type: "string" },
      umbrella_aggregate: { type: "string" },
      // Premiums
      umbrella_premium: { type: "string" },
      total_annual_premium: { type: "string" },
      broker_fee: { type: "string" },
      carrier_policy_fee: { type: "string" },
      surplus_lines_tax: { type: "string" },
      minimum_earned_premium_pct: { type: "string" },
      pay_plan: { type: "string" },
      terrorism_premium: { type: "string" },
      // Business profile
      description_of_operations: { type: "string" },
      industry: { type: "string" },
      business_category: { type: "string" },
      has_underlying_gl: { type: "string" },
      lob_umbrella: { type: "boolean" },
      lob_gl: { type: "boolean" },
      auto_premium: { type: "string" },
      bop_premium: { type: "string" },
      inland_marine_premium: { type: "string" },
      cyber_premium: { type: "string" },
      crime_premium: { type: "string" },
      liquor_premium: { type: "string" },
    },
    required: ["named_insured", "policy_number"],
  };
}
