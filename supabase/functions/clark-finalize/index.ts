import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Comprehensive mapping from extracted data keys → actual ACORD 125 PDF field names.
 * These are the REAL field names from the fillable PDF templates.
 */
const ACORD_125_MAP: Record<string, string> = {
  // Producer / Agency
  firm_name: "F[0].P1[0].Producer_FullName_A[0]",
  firm_address: "F[0].P1[0].Producer_MailingAddress_LineOne_A[0]",
  producer_name: "F[0].P1[0].Producer_ContactPerson_FullName_A[0]",
  producer_phone: "F[0].P1[0].Producer_ContactPerson_PhoneNumber_A[0]",
  producer_email: "F[0].P1[0].Producer_ContactPerson_EmailAddress_A[0]",
  producer_fax: "F[0].P1[0].Producer_FaxNumber_A[0]",
  producer_city: "F[0].P1[0].Producer_MailingAddress_CityName_A[0]",
  producer_state: "F[0].P1[0].Producer_MailingAddress_StateOrProvinceCode_A[0]",
  producer_zip: "F[0].P1[0].Producer_MailingAddress_PostalCode_A[0]",
  producer_customer_id: "F[0].P1[0].Producer_CustomerIdentifier_A[0]",

  // Named Insured
  applicant_name: "F[0].P1[0].NamedInsured_FullName_A[0]",
  dba: "F[0].P1[0].NamedInsured_FullName_B[0]",
  mailing_address: "F[0].P1[0].NamedInsured_MailingAddress_LineOne_A[0]",
  mailing_address_2: "F[0].P1[0].NamedInsured_MailingAddress_LineTwo_A[0]",
  city: "F[0].P1[0].NamedInsured_MailingAddress_CityName_A[0]",
  state: "F[0].P1[0].NamedInsured_MailingAddress_StateOrProvinceCode_A[0]",
  zip: "F[0].P1[0].NamedInsured_MailingAddress_PostalCode_A[0]",
  business_phone: "F[0].P1[0].NamedInsured_Primary_PhoneNumber_A[0]",
  website: "F[0].P1[0].NamedInsured_Primary_WebsiteAddress_A[0]",
  fein: "F[0].P1[0].NamedInsured_TaxIdentifier_A[0]",
  sic_code: "F[0].P1[0].NamedInsured_SICCode_A[0]",
  naics_code: "F[0].P1[0].NamedInsured_NAICSCode_A[0]",
  gl_class_code: "F[0].P1[0].NamedInsured_GeneralLiabilityCode_A[0]",

  // Insurer
  carrier_name: "F[0].P1[0].Insurer_FullName_A[0]",
  naic_code: "F[0].P1[0].Insurer_NAICCode_A[0]",
  underwriter_name: "F[0].P1[0].Insurer_Underwriter_FullName_A[0]",

  // Policy
  effective_date: "F[0].P1[0].Policy_EffectiveDate_A[0]",
  expiration_date: "F[0].P1[0].Policy_ExpirationDate_A[0]",
  policy_number: "F[0].P1[0].Policy_PolicyNumberIdentifier_A[0]",
  form_completion_date: "F[0].P1[0].Form_CompletionDate_A[0]",
  total_premium: "F[0].P1[0].Policy_Payment_EstimatedTotalAmount_A[0]",
  deposit_amount: "F[0].P1[0].Policy_Payment_DepositAmount_A[0]",
  minimum_premium: "F[0].P1[0].Policy_Payment_MinimumPremiumAmount_A[0]",

  // Premium by line
  gl_premium: "F[0].P1[0].GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A[0]",
  property_premium: "F[0].P1[0].CommercialPropertyLineOfBusiness_PremiumAmount_A[0]",
  auto_premium: "F[0].P1[0].CommercialVehicleLineOfBusiness_PremiumAmount_A[0]",
  umbrella_premium: "F[0].P1[0].CommercialUmbrellaLineOfBusiness_PremiumAmount_A[0]",
  crime_premium: "F[0].P1[0].CrimeLineOfBusiness_PremiumAmount_A[0]",
  cyber_premium: "F[0].P1[0].CyberAndPrivacyLineOfBusiness_PremiumAmount_A[0]",
  bop_premium: "F[0].P1[0].BusinessOwnersLineOfBusiness_PremiumAmount_A[0]",
  inland_marine_premium: "F[0].P1[0].CommercialInlandMarineLineOfBusiness_PremiumAmount_A[0]",
};

/** Checkbox fields — entity type */
const ACORD_125_CHECKBOXES: Record<string, string> = {
  corporation: "F[0].P1[0].NamedInsured_LegalEntity_CorporationIndicator_A[0]",
  individual: "F[0].P1[0].NamedInsured_LegalEntity_IndividualIndicator_A[0]",
  partnership: "F[0].P1[0].NamedInsured_LegalEntity_PartnershipIndicator_A[0]",
  llc: "F[0].P1[0].NamedInsured_LegalEntity_LimitedLiabilityCorporationIndicator_A[0]",
  joint_venture: "F[0].P1[0].NamedInsured_LegalEntity_JointVentureIndicator_A[0]",
  trust: "F[0].P1[0].NamedInsured_LegalEntity_TrustIndicator_A[0]",
  s_corp: "F[0].P1[0].NamedInsured_LegalEntity_SubchapterSCorporationIndicator_A[0]",
  not_for_profit: "F[0].P1[0].NamedInsured_LegalEntity_NotForProfitIndicator_A[0]",

  // LOB checkboxes
  lob_gl: "F[0].P1[0].Policy_LineOfBusiness_CommercialGeneralLiability_A[0]",
  lob_property: "F[0].P1[0].Policy_LineOfBusiness_CommercialProperty_A[0]",
  lob_auto: "F[0].P1[0].Policy_LineOfBusiness_BusinessAutoIndicator_A[0]",
  lob_umbrella: "F[0].P1[0].Policy_LineOfBusiness_UmbrellaIndicator_A[0]",
  lob_crime: "F[0].P1[0].Policy_LineOfBusiness_CrimeIndicator_A[0]",
  lob_cyber: "F[0].P1[0].Policy_LineOfBusiness_CyberAndPrivacy_A[0]",
  lob_bop: "F[0].P1[0].Policy_LineOfBusiness_BusinessOwnersIndicator_A[0]",
  lob_inland_marine: "F[0].P1[0].Policy_LineOfBusiness_CommercialInlandMarineIndicator_A[0]",
  lob_boiler: "F[0].P1[0].Policy_LineOfBusiness_BoilerAndMachineryIndicator_A[0]",

  // Policy status
  status_quote: "F[0].P1[0].Policy_Status_QuoteIndicator_A[0]",
  status_bound: "F[0].P1[0].Policy_Status_BoundIndicator_A[0]",
  status_issue: "F[0].P1[0].Policy_Status_IssueIndicator_A[0]",
  status_renew: "F[0].P1[0].Policy_Status_RenewIndicator_A[0]",

  // Payment
  direct_bill: "F[0].P1[0].Policy_Payment_DirectBillIndicator_A[0]",
  producer_bill: "F[0].P1[0].Policy_Payment_ProducerBillIndicator_A[0]",
};

/** Simple mappings for ACORD 126 (GL). We'll add real field names once inspected. */
const ACORD_126_MAP: Record<string, string> = {};
const ACORD_127_MAP: Record<string, string> = {};
const ACORD_130_MAP: Record<string, string> = {};

const FORM_MAPS: Record<string, Record<string, string>> = {
  "125": ACORD_125_MAP,
  "126": ACORD_126_MAP,
  "127": ACORD_127_MAP,
  "130": ACORD_130_MAP,
};

/**
 * Try to set a text field, silently skip if not found
 */
function safeSetText(form: any, fieldName: string, value: string) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch { /* field not in this form version */ }
}

/**
 * Try to check a checkbox, silently skip if not found
 */
function safeCheck(form: any, fieldName: string) {
  try {
    const field = form.getCheckBox(fieldName);
    field.check();
  } catch { /* field not in this form version */ }
}

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

    const extractedData = { ...(submission.extracted_data || {}) } as Record<string, any>;
    const acordForms = (submission.acord_forms || ["125"]) as string[];
    const carriers = (submission.carriers || ["Default"]) as string[];

    // Fetch agent's clark profile for branding
    const { data: clarkProfile } = await supabase
      .from("clark_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // FORCE_OVERRIDE: Agent info always overrides
    if (clarkProfile) {
      extractedData.producer_name = clarkProfile.producer_name || extractedData.producer_name;
      extractedData.firm_name = clarkProfile.firm_name || extractedData.firm_name;
      extractedData.firm_address = clarkProfile.firm_address || extractedData.firm_address;
      extractedData.producer_phone = clarkProfile.contact_phone || extractedData.producer_phone;
      extractedData.producer_email = clarkProfile.contact_email || extractedData.producer_email;
      extractedData.license_number = clarkProfile.license_number || extractedData.license_number;
    }

    // Set today as form completion date if not set
    if (!extractedData.form_completion_date) {
      const now = new Date();
      extractedData.form_completion_date = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
    }

    const zip = new JSZip();
    let formsGenerated = 0;

    for (const carrier of carriers.length > 0 ? carriers : ["General"]) {
      const carrierFolder = zip.folder(carrier.replace(/[^a-zA-Z0-9 ]/g, "")) as JSZip;

      // Set carrier name in extracted data for form filling
      extractedData.carrier_name = carrier;

      for (const formId of acordForms) {
        try {
          // Fetch the fillable PDF template
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const templateUrl = `${supabaseUrl}/storage/v1/object/public/agency-assets/acord-fillable/${formId}.pdf`;

          let pdfBytes: ArrayBuffer;
          try {
            const pdfResp = await fetch(templateUrl);
            if (!pdfResp.ok) {
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

          // Get the field map for this form
          const fieldMap = FORM_MAPS[formId] || {};

          // Fill text fields using the correct PDF field names
          for (const [dataKey, pdfFieldName] of Object.entries(fieldMap)) {
            const value = extractedData[dataKey];
            if (value !== undefined && value !== null && value !== "") {
              safeSetText(form, pdfFieldName, String(value));
            }
          }

          // For ACORD 125: handle entity type checkboxes
          if (formId === "125") {
            const entityType = String(extractedData.entity_type || "").toLowerCase();
            if (entityType.includes("llc") || entityType.includes("limited liability")) {
              safeCheck(form, ACORD_125_CHECKBOXES.llc);
            } else if (entityType.includes("corporation") || entityType.includes("corp")) {
              if (entityType.includes("s corp") || entityType.includes("subchapter")) {
                safeCheck(form, ACORD_125_CHECKBOXES.s_corp);
              } else {
                safeCheck(form, ACORD_125_CHECKBOXES.corporation);
              }
            } else if (entityType.includes("partnership")) {
              safeCheck(form, ACORD_125_CHECKBOXES.partnership);
            } else if (entityType.includes("individual") || entityType.includes("sole")) {
              safeCheck(form, ACORD_125_CHECKBOXES.individual);
            } else if (entityType.includes("trust")) {
              safeCheck(form, ACORD_125_CHECKBOXES.trust);
            } else if (entityType.includes("joint")) {
              safeCheck(form, ACORD_125_CHECKBOXES.joint_venture);
            } else if (entityType.includes("non") || entityType.includes("not for profit")) {
              safeCheck(form, ACORD_125_CHECKBOXES.not_for_profit);
            }

            // Check LOB boxes based on which forms are selected
            if (acordForms.includes("126")) safeCheck(form, ACORD_125_CHECKBOXES.lob_gl);
            if (acordForms.includes("127")) safeCheck(form, ACORD_125_CHECKBOXES.lob_auto);
            if (acordForms.includes("130")) {
              // WC is not on 125 but umbrella might be
            }

            // Coverage detection from extracted data
            const allDataStr = JSON.stringify(extractedData).toLowerCase();
            if (allDataStr.includes("property") || extractedData.property_premium) {
              safeCheck(form, ACORD_125_CHECKBOXES.lob_property);
            }
            if (allDataStr.includes("umbrella") || extractedData.umbrella_premium) {
              safeCheck(form, ACORD_125_CHECKBOXES.lob_umbrella);
            }
            if (allDataStr.includes("crime") || extractedData.crime_premium) {
              safeCheck(form, ACORD_125_CHECKBOXES.lob_crime);
            }
            if (allDataStr.includes("cyber") || extractedData.cyber_premium) {
              safeCheck(form, ACORD_125_CHECKBOXES.lob_cyber);
            }
            if (allDataStr.includes("bop") || allDataStr.includes("business owner") || extractedData.bop_premium) {
              safeCheck(form, ACORD_125_CHECKBOXES.lob_bop);
            }

            // Default to quote status
            safeCheck(form, ACORD_125_CHECKBOXES.status_quote);
          }

          // For forms without specific mappings (126, 127, 130),
          // try a brute-force approach: iterate all form fields and try to match
          if (!fieldMap || Object.keys(fieldMap).length === 0) {
            const allFields = form.getFields();
            for (const field of allFields) {
              const name = field.getName();
              const nameLower = name.toLowerCase();

              // Try to match common patterns
              if (nameLower.includes("namedinsured_fullname") || nameLower.includes("applicant")) {
                safeSetText(form, name, extractedData.applicant_name || "");
              } else if (nameLower.includes("producer_fullname")) {
                safeSetText(form, name, extractedData.firm_name || "");
              } else if (nameLower.includes("producer_contactperson_fullname")) {
                safeSetText(form, name, extractedData.producer_name || "");
              } else if (nameLower.includes("policy_effectivedate")) {
                safeSetText(form, name, extractedData.effective_date || "");
              } else if (nameLower.includes("policy_expirationdate")) {
                safeSetText(form, name, extractedData.expiration_date || "");
              } else if (nameLower.includes("insurer_fullname")) {
                safeSetText(form, name, carrier);
              }
            }
          }

          // Don't flatten — allow further editing
          const filledBytes = await pdfDoc.save();
          carrierFolder.file(`ACORD_${formId}_${carrier.replace(/\s+/g, "_")}.pdf`, filledBytes);
          formsGenerated++;
          console.log(`Filled ACORD ${formId} for ${carrier}: ${Object.keys(fieldMap).length} mapped fields`);
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
      forms_generated: formsGenerated,
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
