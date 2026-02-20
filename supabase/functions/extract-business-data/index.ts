import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ACORD 125-style commercial insurance application fields
const ACORD_FIELDS = {
  // Applicant Information
  applicant_name: "",
  dba_name: "",
  mailing_address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  website: "",
  fein: "",
  sic_code: "",
  naics_code: "",
  
  // Business Information
  business_type: "", // corporation, llc, partnership, sole proprietor, etc.
  year_established: "",
  annual_revenue: "",
  number_of_employees: "",
  nature_of_business: "",
  description_of_operations: "",
  
  // Coverage Information
  coverage_types_needed: [], // GL, property, auto, workers comp, umbrella, cyber, etc.
  effective_date: "",
  expiration_date: "",
  current_carrier: "",
  current_premium: "",
  
  // Location Information
  premises_address: "",
  premises_owned_or_leased: "",
  square_footage: "",
  building_construction: "",
  year_built: "",
  
  // Loss History
  prior_losses_last_5_years: "",
  claims_description: "",
  
  // Additional
  additional_insureds: "",
  special_conditions: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, file_contents, pdf_files, submission_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert insurance underwriter assistant. Extract data from the provided business or policy information and return ONLY valid JSON with no markdown fences, no explanation — just raw JSON.

Return this exact structure:
{
  "form_data": {
    "applicant_name": "", "dba_name": "", "mailing_address": "", "city": "", "state": "", "zip": "",
    "phone": "", "email": "", "website": "", "fein": "", "sic_code": "", "naics_code": "",
    "business_type": "", "year_established": "", "annual_revenue": "", "number_of_employees": "",
    "full_time_employees": "", "part_time_employees": "", "nature_of_business": "",
    "description_of_operations": "", "effective_date": "", "expiration_date": "",
    "current_carrier": "", "current_premium": "", "policy_number": "",
    "premises_address": "", "premises_city": "", "premises_state": "", "premises_zip": "",
    "square_footage": "", "building_construction": "", "year_built": "",
    "prior_losses_last_5_years": "", "additional_insureds": "",
    "general_aggregate": "", "products_aggregate": "", "each_occurrence": "",
    "personal_adv_injury": "", "fire_damage": "", "medical_payments": "",
    "coverage_type": "", "hazard_code_1": "", "hazard_classification_1": "",
    "wc_class_code": "", "wc_class_description": "", "annual_remuneration": "",
    "class_code_1": "", "class_description_1": "", "annual_remuneration_1": "",
    "officer_1_name": "", "officer_1_title": "", "officer_1_ownership": "", "officer_1_included": "",
    "subcontractors_used": "", "prior_wc_carrier": "", "experience_mod_rate": "",
    "construction_type": "", "building_amount": "", "bpp_amount": "", "business_income_amount": "",
    "sprinkler_system": "", "fire_alarm": "", "burglar_alarm": "", "roof_type": "",
    "each_occurrence_limit": "", "aggregate_limit": "", "self_insured_retention": "",
    "number_of_vehicles": "", "number_of_drivers": "", "radius_of_operations": "",
    "auto_liability_limit": "", "auto_liability_premium": "", "um_uim_limit": "",
    "building_limit": "", "bpp_limit": "", "business_income_limit": "", "total_insured_value": "",
    "property_premium": "", "property_deductible": "",
    "lob_auto": "false", "lob_gl": "false", "lob_property": "false", "lob_umbrella": "false", "lob_wc": "false",
    "vehicles": [],
    "drivers": []
  },
  "gaps": []
}

EXTRACTION RULES:
- Return ALL fields even if empty string
- All scalar values must be strings — booleans as "true"/"false"
- Dates → YYYY-MM-DD, currencies → plain number without $ or commas
- lob_* flags: set "true" if that coverage type exists in the document
- vehicles[]: include ALL vehicles — each: { year, make, model, vin, body_type, stated_amount, garaging_zip }
- drivers[]: include ALL drivers — each: { name, dob, license, license_state }
- gaps[]: list fields that are missing and important — { field, question, priority: required|recommended|optional }
- If document is an insurance policy, extract carrier, policy number, limits, premiums, and all schedules
- Be exhaustive — extract everything you can see in the document`;

    const userPromptText = `Extract all insurance data from the following document(s).

${description || ""}
${file_contents ? `\nAdditional text content:\n${file_contents}` : ""}`;

    // Build multimodal message — PDFs sent as inline base64 for Gemini native PDF reading
    type ContentPart = { type: string; text?: string; image_url?: { url: string } };
    const userContent: ContentPart[] = [{ type: "text", text: userPromptText }];

    const hasPdfs = Array.isArray(pdf_files) && pdf_files.length > 0;
    if (hasPdfs) {
      for (const pf of pdf_files) {
        if (pf.base64) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${pf.mimeType || "application/pdf"};base64,${pf.base64}` },
          });
        }
      }
    }

    // Use gemini-2.5-pro for multimodal PDF reading (better accuracy), flash for text-only
    const model = hasPdfs ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: hasPdfs ? userContent : userPromptText },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI extraction failed");
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content returned from AI");
    }

    // Strip markdown code fences if present
    const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const extracted = JSON.parse(jsonStr);

    // Pre-expand vehicles[] and drivers[] arrays into flat vehicle_N_* / driver_N_* keys
    // This ensures the form fill pipeline has exact flat keys identical to the benchmark ground-truth format
    const fd: Record<string, any> = extracted.form_data || {};

    const vehicles: any[] = Array.isArray(fd.vehicles) ? fd.vehicles : [];
    vehicles.forEach((v: any, idx: number) => {
      const n = idx + 1;
      if (v.year && !fd[`vehicle_${n}_year`])         fd[`vehicle_${n}_year`]      = String(v.year);
      if (v.make && !fd[`vehicle_${n}_make`])         fd[`vehicle_${n}_make`]      = String(v.make);
      if (v.model && !fd[`vehicle_${n}_model`])       fd[`vehicle_${n}_model`]     = String(v.model);
      if ((v.vin || v.VIN) && !fd[`vehicle_${n}_vin`]) fd[`vehicle_${n}_vin`]     = String(v.vin || v.VIN);
      if ((v.body_type || v.bodyType || v.type) && !fd[`vehicle_${n}_body_type`])
        fd[`vehicle_${n}_body_type`] = String(v.body_type || v.bodyType || v.type);
      if ((v.stated_amount || v.cost_new) && !fd[`vehicle_${n}_stated_amount`])
        fd[`vehicle_${n}_stated_amount`] = String(v.stated_amount || v.cost_new);
      if ((v.garaging_zip || v.zip) && !fd[`vehicle_${n}_garaging_zip`])
        fd[`vehicle_${n}_garaging_zip`] = String(v.garaging_zip || v.zip);
    });
    if (vehicles.length > 0 && !fd.number_of_vehicles) {
      fd.number_of_vehicles = String(vehicles.length);
    }

    const drivers: any[] = Array.isArray(fd.drivers) ? fd.drivers : [];
    drivers.forEach((d: any, idx: number) => {
      const n = idx + 1;
      if ((d.name || d.full_name) && !fd[`driver_${n}_name`])
        fd[`driver_${n}_name`] = String(d.name || d.full_name);
      if ((d.dob || d.date_of_birth) && !fd[`driver_${n}_dob`])
        fd[`driver_${n}_dob`] = String(d.dob || d.date_of_birth);
      if ((d.license || d.license_number || d.dl_number) && !fd[`driver_${n}_license`])
        fd[`driver_${n}_license`] = String(d.license || d.license_number || d.dl_number);
      if ((d.license_state || d.state) && !fd[`driver_${n}_license_state`])
        fd[`driver_${n}_license_state`] = String(d.license_state || d.state);
    });
    if (drivers.length > 0 && !fd.number_of_drivers) {
      fd.number_of_drivers = String(drivers.length);
    }

    // Also set LOB flags from detected arrays if not already set
    if (vehicles.length > 0 && fd.lob_auto !== "true") fd.lob_auto = "true";

    extracted.form_data = fd;

    // Save to database if submission_id provided
    if (submission_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get the submission to find user_id
      const { data: submission } = await supabase
        .from("business_submissions")
        .select("user_id")
        .eq("id", submission_id)
        .single();

      if (submission) {
        await supabase.from("insurance_applications").insert({
          submission_id,
          user_id: submission.user_id,
          form_data: extracted.form_data,
          gaps: extracted.gaps,
          status: "draft",
        });

        await supabase
          .from("business_submissions")
          .update({ status: "extracted" })
          .eq("id", submission_id);
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
