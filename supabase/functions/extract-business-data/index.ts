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
    const { description, file_contents, submission_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are an insurance application data extractor. Given the following business plan/description, extract as much information as possible to fill out a commercial insurance application (ACORD 125 style).

Business information provided:
${description || ""}
${file_contents ? `\nAdditional file contents:\n${file_contents}` : ""}

Extract the data and also identify any GAPS — important fields that are missing and need to be asked about.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert insurance underwriter assistant." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_insurance_data",
              description: "Extract business data into insurance application fields and identify gaps",
              parameters: {
                type: "object",
                properties: {
                  form_data: {
                    type: "object",
                    description: "Extracted ACORD-style form fields",
                    properties: {
                      applicant_name: { type: "string" },
                      dba_name: { type: "string" },
                      mailing_address: { type: "string" },
                      city: { type: "string" },
                      state: { type: "string" },
                      zip: { type: "string" },
                      phone: { type: "string" },
                      email: { type: "string" },
                      website: { type: "string" },
                      fein: { type: "string" },
                      sic_code: { type: "string" },
                      naics_code: { type: "string" },
                      business_type: { type: "string" },
                      year_established: { type: "string" },
                      annual_revenue: { type: "string" },
                      number_of_employees: { type: "string" },
                      nature_of_business: { type: "string" },
                      description_of_operations: { type: "string" },
                      coverage_types_needed: { type: "array", items: { type: "string" } },
                      effective_date: { type: "string" },
                      expiration_date: { type: "string" },
                      current_carrier: { type: "string" },
                      current_premium: { type: "string" },
                      premises_address: { type: "string" },
                      premises_owned_or_leased: { type: "string" },
                      square_footage: { type: "string" },
                      building_construction: { type: "string" },
                      year_built: { type: "string" },
                      prior_losses_last_5_years: { type: "string" },
                      claims_description: { type: "string" },
                      additional_insureds: { type: "string" },
                      special_conditions: { type: "string" },
                    },
                  },
                  gaps: {
                    type: "array",
                    description: "List of missing fields that need user input",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", description: "The field key" },
                        question: { type: "string", description: "A clear question to ask the user" },
                        priority: { type: "string", enum: ["required", "recommended", "optional"] },
                      },
                      required: ["field", "question", "priority"],
                    },
                  },
                },
                required: ["form_data", "gaps"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_insurance_data" } },
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
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No structured data returned from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

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
