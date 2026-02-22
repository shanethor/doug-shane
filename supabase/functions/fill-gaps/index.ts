import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All ACORD form field keys that matter for completeness
const ACORD_125_FIELDS = [
  "applicant_name", "proposed_eff_date", "proposed_exp_date",
  "mailing_address", "city", "state", "zip", "fein", "business_type",
  "business_phone", "annual_revenues", "full_time_employees", "part_time_employees",
  "description_of_operations", "business_category", "date_business_started",
  "safety_program", "exposure_flammables", "policy_declined_cancelled",
  "prior_carrier_1", "sic_code", "naics_code", "website",
  "subsidiary_of_another", "has_subsidiaries", "bankruptcy", "foreign_operations",
  "total_employees", "occupied_sq_ft", "premises_address", "premises_city",
  "premises_state", "premises_zip", "contact_name", "contact_phone",
];

const ACORD_126_FIELDS = [
  "insured_name", "effective_date", "coverage_type",
  "general_aggregate", "each_occurrence", "personal_adv_injury",
  "fire_damage", "medical_payments", "products_aggregate",
  "hazard_classification_1", "hazard_code_1", "hazard_exposure_1",
  "alcohol_served", "products_sold", "professional_services",
  "draws_plans_for_others", "installs_services_products",
  "blasting_explosives", "annual_gross_sales",
];

const ACORD_127_FIELDS = [
  "insured_name", "effective_date",
  "driver_1_name", "driver_1_dob", "driver_1_license",
  "vehicle_1_year", "vehicle_1_make", "vehicle_1_model", "vehicle_1_vin",
  "vehicle_1_body_type", "vehicle_1_radius",
  "garaging_street", "garaging_city", "garaging_state", "garaging_zip",
  "transporting_hazmat", "vehicle_maintenance_program",
  "driver_monitoring_program", "safety_program_auto", "mvr_checks",
  "driver_training", "pre_post_trip_inspections",
];

const ACORD_130_FIELDS = [
  "insured_name", "effective_date", "expiration_date", "state_of_operation",
  "mailing_address", "city", "state", "zip", "fein", "business_type",
  "nature_of_business", "sic_code", "description_of_operations",
  "class_code_1", "class_description_1", "num_employees_1", "annual_remuneration_1",
  "class_code_2", "class_description_2", "num_employees_2", "annual_remuneration_2",
  "officer_1_name", "officer_1_title", "officer_1_ownership", "officer_1_inc_exc", "officer_1_remuneration",
  "subcontractors_used", "subcontractor_certs", "wc_travel_out_of_state",
  "seasonal_employees", "wc_lease_employees", "workplace_safety_program",
  "prior_wc_carrier_1", "wc_part1_states", "rating_state",
  "wc_each_accident", "wc_disease_policy_limit", "wc_disease_each_employee",
  "experience_mod",
];

const ACORD_131_FIELDS = [
  "insured_name", "effective_date",
  "umbrella_or_excess", "coverage_basis",
  "each_occurrence_limit", "aggregate_limit",
  "retained_limit_occurrence", "retained_limit_aggregate",
  "underlying_gl_carrier", "underlying_gl_occurrence", "underlying_gl_aggregate",
  "underlying_auto_carrier", "underlying_auto_bi_ea_acc",
  "underlying_el_carrier", "underlying_el_each_accident",
  "annual_payroll", "annual_gross_sales", "total_employees",
  "primary_description",
];

const ACORD_140_FIELDS = [
  "insured_name", "effective_date",
  "building_street_address", "construction_type", "num_stories", "year_built",
  "total_area_sq_ft", "building_amount", "bpp_amount",
  "building_valuation", "building_causes_of_loss", "building_deductible",
  "bpp_valuation", "bpp_causes_of_loss", "bpp_deductible",
  "business_income_amount", "extra_expense_amount",
  "roof_type", "sprinkler_pct", "fire_alarm_type", "burglar_alarm_type",
  "primary_heat_type", "protection_class",
  "occupied_sq_ft", "vacancy_pct",
];

const ALL_TARGET_FIELDS: Record<string, string[]> = {
  "acord-125": ACORD_125_FIELDS,
  "acord-126": ACORD_126_FIELDS,
  "acord-127": ACORD_127_FIELDS,
  "acord-130": ACORD_130_FIELDS,
  "acord-131": ACORD_131_FIELDS,
  "acord-140": ACORD_140_FIELDS,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, answers } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: app, error } = await supabase
      .from("insurance_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (error || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company name from business_submissions for context
    const { data: submission } = await supabase
      .from("business_submissions")
      .select("company_name, description")
      .eq("id", app.submission_id)
      .single();

    // Merge answers into form_data
    const mergedFormData = { ...(app.form_data as Record<string, any>), ...answers };
    // Ensure applicant/insured name is set from submission if available
    if (submission?.company_name) {
      if (!mergedFormData.applicant_name) mergedFormData.applicant_name = submission.company_name;
      if (!mergedFormData.insured_name) mergedFormData.insured_name = submission.company_name;
    }

    // Now use AI to infer missing fields from context and regenerate gaps
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Collect all target fields across all forms
    const allFields = new Set<string>();
    for (const fields of Object.values(ALL_TARGET_FIELDS)) {
      for (const f of fields) allFields.add(f);
    }

    // Find still-empty fields
    const emptyFields: string[] = [];
    for (const field of allFields) {
      const val = mergedFormData[field];
      if (!val || (typeof val === "string" && !val.trim())) {
        emptyFields.push(field);
      }
    }

    console.log("Empty fields count:", emptyFields.length, "Fields:", emptyFields.join(", "));

    let finalFormData = mergedFormData;
    let newGaps: any[] = [];

    if (emptyFields.length > 0) {
      // Build context summary
      const knownData = Object.entries(mergedFormData)
        .filter(([, v]) => v && (typeof v !== "string" || v.trim()))
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      const companyContext = submission?.company_name ? `\nCOMPANY NAME: ${submission.company_name}` : "";
      const descContext = submission?.description ? `\nORIGINAL BUSINESS DESCRIPTION: ${submission.description}` : "";

      const inferPrompt = `You are an expert insurance underwriter filling ACORD forms (125, 126, 127, 130, 131, 140). Given the KNOWN data, infer empty fields ONLY when the inference is directly supported by existing data.

CRITICAL ANTI-HALLUCINATION RULES:
- NEVER fabricate data. Only infer values that logically follow from KNOWN DATA below.
- If KNOWN DATA is empty or minimal, return very few or zero inferred values — that is correct behavior.
- Do NOT invent addresses, phone numbers, employee counts, revenue figures, SIC/NAICS codes, or any factual data.
- Do NOT assume business type, industry, or operations unless explicitly stated in KNOWN DATA.
- Only infer derivative values (e.g. expiration = effective + 1 year, insured_name = applicant_name).

SAFE INFERENCES (only when source data exists):
- proposed_exp_date = proposed_eff_date + 1 year (if effective date is known)
- insured_name = applicant_name (if applicant_name is known)
- coverage_type = "Occurrence" (default for GL forms, only if GL coverage is indicated)
- If a Yes/No question has an explicit answer elsewhere, propagate it

UNSAFE — DO NOT DO:
- Guessing SIC codes, class codes, or hazard codes without explicit business type
- Estimating revenue, payroll, or employee counts
- Filling in officer names, titles, or ownership percentages
- Setting safety/compliance flags without evidence
- Inventing prior carrier information
${companyContext}${descContext}

KNOWN DATA:
${knownData}

EMPTY FIELDS THAT NEED VALUES:
${emptyFields.join(", ")}

Return inferred values (only those supported by known data) and remaining gaps.`;

      // Build explicit properties for inferred_values based on empty fields
      const inferredProps: Record<string, any> = {};
      for (const f of emptyFields) {
        inferredProps[f] = { type: "string", description: `Value for ${f}` };
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are an expert insurance underwriter assistant. Only fill inferred_values with data that is directly supported by the known data provided. If known data is sparse, return few or zero inferred values — do NOT fabricate data to fill fields." },
            { role: "user", content: inferPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "fill_and_gap",
              description: "Fill inferred_values with as many field values as possible, and only put truly unknown fields in remaining_gaps",
              parameters: {
                type: "object",
                properties: {
                  inferred_values: {
                    type: "object",
                    description: "MUST contain values for all fields that can be inferred. Each key is a field name from the empty fields list.",
                    properties: inferredProps,
                  },
                  remaining_gaps: {
                    type: "array",
                    description: "ONLY fields that truly cannot be inferred and need user input",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string" },
                        question: { type: "string" },
                        priority: { type: "string", enum: ["required", "recommended", "optional"] },
                      },
                      required: ["field", "question", "priority"],
                    },
                  },
                },
                required: ["inferred_values", "remaining_gaps"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "fill_and_gap" } },
        }),
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          const parsed = JSON.parse(toolCall.function.arguments);
          console.log("AI inferred:", JSON.stringify(Object.keys(parsed.inferred_values || {})));
          console.log("AI gaps:", parsed.remaining_gaps?.length || 0);
          // Merge ALL inferred values — no field restriction
          if (parsed.inferred_values) {
            for (const [k, v] of Object.entries(parsed.inferred_values)) {
              if (v && typeof v === "string" && v.trim()) {
                finalFormData[k] = v;
              }
            }
          }
          newGaps = parsed.remaining_gaps || [];
        }
      } else {
        console.error("AI inference failed:", aiResponse.status, await aiResponse.text());
        // Fall back to simple gap removal
        const answeredFields = Object.keys(answers);
        newGaps = ((app.gaps as any[]) || []).filter(
          (g: any) => !answeredFields.includes(g.field)
        );
      }
    }

    const requiredGapsRemaining = newGaps.filter((g: any) => g.priority === "required").length;
    const newStatus = requiredGapsRemaining === 0 ? "complete" : "draft";

    await supabase
      .from("insurance_applications")
      .update({
        form_data: finalFormData,
        gaps: newGaps,
        status: newStatus,
      })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({ form_data: finalFormData, gaps: newGaps, status: newStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fill-gaps error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
