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

  // Skip meta fields
  const skipKeys = new Set(["form_type"]);

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

      // Build the extraction prompt — supplemental-form-aware
      const extractionPrompt = `You are an expert insurance data extractor. Extract ALL data from this supplemental insurance form into structured fields.

IMPORTANT: Extract EVERY field present in the document. Do not skip any data. Use the exact field keys provided in the tool schema.

For Yes/No fields, return "Yes" or "No".
For currency fields, return the dollar amount as-is (e.g. "$1,528,996").
For percentages, return as-is (e.g. "27%").
For arrays (like work types), return as an array of strings.

Document to extract:
${formText}`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a precise insurance form data extractor. Extract every single field from the provided form." },
              { role: "user", content: extractionPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_supplemental_form",
                  description: "Extract all fields from a supplemental insurance form",
                  parameters: buildExtractionSchema(form.form_type),
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "extract_supplemental_form" } },
          }),
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

        const extracted = JSON.parse(toolCall.function.arguments);
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
