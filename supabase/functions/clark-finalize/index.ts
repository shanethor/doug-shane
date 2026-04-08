import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Maps extracted data keys to PDF form field names for common ACORD forms.
 * This is a simplified mapping — the full mapping lives in the client-side
 * acord-field-map.ts but we need a server-side version for finalization.
 */
const ACORD_FIELD_MAP: Record<string, Record<string, string>> = {
  "125": {
    applicant_name: "Applicant Name",
    dba: "DBA",
    mailing_address: "Mailing Address",
    city: "City",
    state: "State",
    zip: "Zip Code",
    business_phone: "Business Phone",
    fein: "FEIN",
    sic_code: "SIC Code",
    naics_code: "NAICS Code",
    entity_type: "Entity Type",
    years_in_business: "Years in Business",
    annual_revenue: "Annual Revenue",
    num_employees: "Number of Employees",
    effective_date: "Proposed Eff Date",
    expiration_date: "Proposed Exp Date",
    prior_carrier: "Prior Carrier",
    prior_policy_number: "Prior Policy Number",
    prior_premium: "Prior Premium",
  },
  "126": {
    applicant_name: "Applicant Name",
    gl_each_occurrence: "Each Occurrence",
    gl_general_aggregate: "General Aggregate",
    gl_products_aggregate: "Products/Completed Operations Aggregate",
    gl_personal_injury: "Personal & Advertising Injury",
    gl_damage_rented: "Damage to Rented Premises",
    gl_medical_expense: "Medical Expense",
  },
  "127": {
    applicant_name: "Applicant Name",
    vehicle_count: "Number of Vehicles",
    auto_liability_limit: "Combined Single Limit",
    auto_uninsured_motorist: "Uninsured Motorist",
    auto_comprehensive_deductible: "Comprehensive Deductible",
    auto_collision_deductible: "Collision Deductible",
  },
  "130": {
    applicant_name: "Applicant Name",
    wc_state: "State",
    wc_class_code: "Class Code",
    wc_description: "Description",
    num_employees: "Number of Employees",
    annual_payroll: "Annual Payroll",
    experience_mod: "Experience Modification Rate",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Authentication failed");

    const { submission_id } = await req.json();
    if (!submission_id) throw new Error("submission_id is required");

    // Fetch submission
    const { data: submission, error: subErr } = await supabase
      .from("clark_submissions")
      .select("*")
      .eq("id", submission_id)
      .eq("user_id", user.id)
      .single();

    if (subErr || !submission) throw new Error("Submission not found");

    const extractedData = (submission.extracted_data || {}) as Record<string, any>;
    const acordForms = (submission.acord_forms || ["125"]) as string[];
    const carriers = (submission.carriers || ["Default"]) as string[];

    // Fetch agent's clark profile for branding
    const { data: clarkProfile } = await supabase
      .from("clark_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Merge agent info into extracted data
    if (clarkProfile) {
      extractedData.producer_name = clarkProfile.producer_name || extractedData.producer_name;
      extractedData.firm_name = clarkProfile.firm_name || extractedData.firm_name;
      extractedData.firm_address = clarkProfile.firm_address || extractedData.firm_address;
      extractedData.producer_phone = clarkProfile.contact_phone || extractedData.producer_phone;
      extractedData.producer_email = clarkProfile.contact_email || extractedData.producer_email;
      extractedData.license_number = clarkProfile.license_number || extractedData.license_number;
    }

    const zip = new JSZip();

    // For each carrier, create a folder with filled ACORD forms
    for (const carrier of carriers.length > 0 ? carriers : ["General"]) {
      const carrierFolder = zip.folder(carrier.replace(/[^a-zA-Z0-9 ]/g, "")) as JSZip;

      for (const formId of acordForms) {
        try {
          // Fetch the fillable PDF template
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          // Templates stored in public/acord-fillable/
          const templateUrl = `${supabaseUrl}/storage/v1/object/public/agency-assets/acord-fillable/${formId}.pdf`;

          let pdfBytes: ArrayBuffer;
          try {
            const pdfResp = await fetch(templateUrl);
            if (!pdfResp.ok) {
              // Fallback: try from the app's public directory
              const fallbackUrl = `https://aura-risk-group.lovable.app/acord-fillable/${formId}.pdf`;
              const fallbackResp = await fetch(fallbackUrl);
              if (!fallbackResp.ok) {
                console.warn(`Template not found for ACORD ${formId}, skipping`);
                continue;
              }
              pdfBytes = await fallbackResp.arrayBuffer();
            } else {
              pdfBytes = await pdfResp.arrayBuffer();
            }
          } catch {
            console.warn(`Failed to fetch template for ACORD ${formId}, skipping`);
            continue;
          }

          const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
          const form = pdfDoc.getForm();
          const fieldMap = ACORD_FIELD_MAP[formId] || {};

          // Fill fields
          for (const [dataKey, pdfFieldName] of Object.entries(fieldMap)) {
            const value = extractedData[dataKey];
            if (!value) continue;

            try {
              const field = form.getTextField(pdfFieldName);
              field.setText(String(value));
            } catch {
              // Field not found in this version of the form — skip
            }
          }

          // Add carrier name if there's a field for it
          try {
            const carrierField = form.getTextField("Insurance Company");
            carrierField.setText(carrier);
          } catch { /* no carrier field */ }

          // Flatten to prevent further editing
          form.flatten();

          const filledBytes = await pdfDoc.save();
          carrierFolder.file(`ACORD_${formId}_${carrier.replace(/\s+/g, "_")}.pdf`, filledBytes);
        } catch (formErr) {
          console.error(`Error processing ACORD ${formId} for ${carrier}:`, formErr);
        }
      }
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    // Upload to storage
    const fileName = `clark/${user.id}/${submission_id}/submission_${Date.now()}.zip`;
    const { error: uploadErr } = await supabase.storage
      .from("agency-assets")
      .upload(fileName, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      throw new Error("Failed to upload ZIP file");
    }

    const { data: urlData } = supabase.storage
      .from("agency-assets")
      .getPublicUrl(fileName);

    const zipUrl = urlData.publicUrl;

    // Update submission
    await supabase
      .from("clark_submissions")
      .update({
        status: "finalized",
        final_zip_url: zipUrl,
      })
      .eq("id", submission_id);

    return new Response(JSON.stringify({
      success: true,
      zip_url: zipUrl,
      forms_generated: acordForms.length,
      carriers: carriers.length > 0 ? carriers : ["General"],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("clark-finalize error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
