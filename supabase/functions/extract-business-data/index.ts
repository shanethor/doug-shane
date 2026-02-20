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

    const prompt = `You are an expert insurance underwriter assistant. Given the following business information, insurance policy documents, or business descriptions, extract as much data as possible to fill out commercial insurance applications (ACORD 125, 126, 127, 130, 131, 140).

IMPORTANT EXTRACTION RULES:
- Dates MUST be returned in YYYY-MM-DD format (e.g. "2026-03-01" not "March 1, 2026")
- If you find an effective_date but no expiration_date, calculate expiration as effective_date + 1 year
- Currency values must be plain numbers without $ signs or commas (e.g. "600000" not "$600,000")
- If employee counts mention full-time and part-time separately, split them: set full_time_employees and part_time_employees as separate numeric fields, AND set number_of_employees to the total
- For business_type, use one of: Corporation, LLC, Partnership, Sole Proprietor, Joint Venture, Not For Profit, Subchapter S Corp, Trust, Individual
- If the document is an existing insurance policy, extract all policy details including premiums, limits, carrier names, policy numbers, vehicle schedules, and driver lists
- For coverage premiums that clearly do NOT apply to this business type (e.g. liquor_premium for a contractor), set them to "0"
- For boolean LOB fields: set lob_auto=true if auto coverage is present, lob_property=true if property is present, lob_umbrella=true if excess/umbrella is present, etc.

Business information provided:
${description || ""}
${file_contents ? `\nAdditional file contents:\n${file_contents}` : ""}

Extract the data and identify GAPS — important fields that are MISSING and need to be asked. You MUST ask about ALL of these critical fields if they cannot be found:

ACORD 125 (General Application):
- Coverage limits: general aggregate, each occurrence, deductible amounts
- Prior carrier name, policy number, and premium
- Whether applicant has: safety program, exposure to flammables, policies declined/cancelled, foreign operations
- Desired billing/payment plan

ACORD 126 (GL):
- Coverage type: Occurrence or Claims-Made
- GL classification code(s) and description(s)
- Whether business involves: hazardous waste, products sold/manufactured, alcohol served, professional services

ACORD 127 (Business Auto) — if auto exposure detected:
- Complete vehicle schedule (year, make, model, VIN, body type, stated value)
- Complete driver list with names
- Radius of operations, garaging location
- Auto liability, UM/UIM, medical payments, comp, collision limits and premiums

ACORD 130 (Workers Comp) — CRITICAL, ask ALL of these if missing:
- Workers compensation class code(s) and description(s) for each job classification
- Annual payroll/remuneration for each class code
- Owner/officer names, titles, ownership %, and whether included or excluded from coverage
- Whether subcontractors are used (and if certs of insurance are obtained)
- Whether employees are seasonal or travel out of state
- Whether a workplace safety program is in effect
- Prior workers comp carrier name
- WC loss history for last 5 years (or confirm no losses)

ACORD 140 (Property) — if property coverage detected:
- Building construction type (Frame, Joisted Masonry, Non-Combustible, etc.) and year built
- Building/property value amounts and BPP amounts
- Protective devices (sprinkler, fire alarm, burglar alarm)
- Roof type and condition

ACORD 131 (Umbrella/Excess) — if umbrella/excess coverage detected:
- Each occurrence and aggregate limits
- Self-insured retention amount
- Underlying coverage schedule

Do NOT ask about fields that can be inferred or auto-calculated (like expiration date from effective date).
Mark WC-related gaps as "required" priority since ACORD 130 needs them for submission.`;

    const systemPrompt = `You are an expert insurance underwriter assistant. Extract data from the provided business or policy information and return ONLY valid JSON with no markdown fences, no explanation — just raw JSON.

Return this exact structure:
{
  "form_data": { ... all extracted fields as string values ... },
  "gaps": [ { "field": "field_key", "question": "question to ask", "priority": "required|recommended|optional" } ]
}

RULES:
- All values in form_data must be strings (including booleans: use "true"/"false")
- Dates in YYYY-MM-DD format
- Currency as plain numbers without $ or commas
- lob_auto/lob_gl/lob_property/lob_umbrella/lob_wc should be "true" or "false" strings`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
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
