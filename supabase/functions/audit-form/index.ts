import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { form_data, form_id, agent_defaults } = await req.json();
    // form_data: Record<string, any> — current filled data
    // form_id: string — which ACORD form (acord-125, acord-130, etc.)
    // agent_defaults: Record<string, any> — agent's saved defaults

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Merge agent defaults first (don't override existing values)
    const merged = { ...form_data };
    if (agent_defaults) {
      for (const [k, v] of Object.entries(agent_defaults)) {
        if (v && (!merged[k] || (typeof merged[k] === "string" && !merged[k].trim()))) {
          merged[k] = v;
        }
      }
    }

    // Build the known data summary
    const knownData = Object.entries(merged)
      .filter(([, v]) => v && (typeof v !== "string" || v.trim()))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    // Find which Yes/No fields are "Yes" but have no explanation
    const yesFields: string[] = [];
    const yesNoKeys = [
      "subcontractors_used", "employees_travel_out_of_state", "seasonal_employees",
      "leased_employees", "workplace_safety_program", "exposure_flammables",
      "policy_declined_cancelled", "safety_program", "alcohol_served",
      "products_sold", "professional_services", "any_umbrella_claims",
      "has_subsidiaries", "subsidiary_of_another", "foreign_operations",
    ];
    for (const key of yesNoKeys) {
      if (merged[key]?.toLowerCase?.() === "yes") {
        yesFields.push(key);
      }
    }

    // Find empty fields that should have values
    const emptyFields: string[] = [];
    const importantFields: Record<string, string[]> = {
      "acord-130": [
        "agency_name", "insured_name", "effective_date", "expiration_date",
        "state_of_operation", "class_description_1", "num_employees_1",
        "annual_remuneration_1", "rate_1", "est_premium_1", "total_estimated_premium",
        "experience_mod_rate", "interstate_rating",
        "officer_1_name", "officer_1_title", "officer_1_ownership",
        "officer_1_included", "officer_1_remuneration",
        "wc_general_remarks", "wc_loss_history", "total_wc_claims", "total_wc_incurred",
        "prior_workers_comp_carrier",
      ],
      "acord-125": [
        "agency_name", "applicant_name", "proposed_eff_date", "proposed_exp_date",
        "billing_plan", "payment_plan", "annual_revenues",
        "business_category", "general_info_remarks",
        "prior_carrier_name", "no_losses",
      ],
      "acord-126": [
        "agency_name", "insured_name", "effective_date", "coverage_type",
        "general_aggregate", "each_occurrence", "personal_adv_injury",
        "fire_damage", "medical_payments", "products_aggregate",
        "general_questions_remarks",
      ],
    };

    const fieldsToCheck = importantFields[form_id] || [];
    for (const f of fieldsToCheck) {
      if (!merged[f] || (typeof merged[f] === "string" && !merged[f].trim())) {
        emptyFields.push(f);
      }
    }

    const prompt = `You are a senior insurance underwriter performing a FINAL AUDIT on an ACORD ${form_id} form before submission. Review the data and:

1. **Fill ALL empty fields** with appropriate values:
${emptyFields.length > 0 ? `   Empty fields needing values: ${emptyFields.join(", ")}` : "   No critical empty fields."}

2. **Generate explanations for all "Yes" answers**:
${yesFields.length > 0 ? `   Fields answered "Yes": ${yesFields.join(", ")}
   Write a professional explanation for each Yes answer based on business context.
   Put ALL explanations into the appropriate remarks field (wc_general_remarks, general_info_remarks, or general_questions_remarks).` : "   No Yes answers to explain."}

3. **Estimate rates and premiums** if empty:
   - For WC class code 9079 (Restaurant NOC) in Oklahoma, typical rate is ~$1.20-$2.50 per $100 of payroll
   - Calculate: rate_1 = estimated rate, est_premium_1 = (annual_remuneration_1 / 100) * rate_1
   - Set total_estimated_premium = sum of all class premiums
   - For new businesses with no losses: experience_mod_rate = "1.00" (unity mod)

4. **MANDATORY data cleanup** — you MUST return corrected values for these:
   - officer_1_name: If it contains "100%" or any percentage, REMOVE the percentage. Return ONLY the person's name. "Cailin Shafer 100%" → officer_1_name must be "Cailin Shafer"
   - prior_workers_comp_carrier: Strip pricing/details. "State Farm $79/month (one location)" → "State Farm"
   - current_carrier: Same cleanup as above
   - subcontractor_certs: If subcontractors_used is "No", set to "N/A"
   - total_wc_claims: If no losses, set to "0"
   - total_wc_incurred: If no losses, set to "$0"
   - interstate_rating: If locations span multiple states, set to "Yes"
   - state_of_operation: List ALL states where business operates. If description mentions AR locations, include "OK, AR"
   - billing_plan: Default to "Direct" if empty
   - payment_plan: Default to "Monthly" if empty

CURRENT FORM DATA:
${knownData}

Return the COMPLETE set of corrections/additions as field key-value pairs.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a meticulous insurance underwriter performing final form audit. Fill every gap, estimate every rate, explain every Yes answer." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "audit_corrections",
            description: "Return all corrections and additions for the form",
            parameters: {
              type: "object",
              properties: {
                corrections: {
                  type: "object",
                  description: "Key-value pairs of field corrections/additions. Keys are form field names, values are the corrected/new values.",
                  properties: Object.fromEntries(
                    [...emptyFields, ...yesFields.map(f => f + "_explanation")]
                      .map(f => [f, { type: "string" }])
                  ),
                  additionalProperties: { type: "string" },
                },
                audit_notes: {
                  type: "string",
                  description: "Brief summary of what was corrected/estimated for the agent to review",
                },
              },
              required: ["corrections", "audit_notes"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "audit_corrections" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI audit error:", response.status, t);
      throw new Error("AI audit failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    let auditedData = { ...merged };
    let auditNotes = "";

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log("Audit corrections:", JSON.stringify(Object.keys(parsed.corrections || {})));
      
      if (parsed.corrections) {
        for (const [k, v] of Object.entries(parsed.corrections)) {
          if (v && typeof v === "string" && v.trim()) {
            auditedData[k] = v;
          }
        }
      }
      auditNotes = parsed.audit_notes || "";
    }

    return new Response(
      JSON.stringify({ audited_data: auditedData, audit_notes: auditNotes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("audit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
