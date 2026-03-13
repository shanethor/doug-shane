import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractPageRange } from "../_shared/acord-extraction-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let documentId: string | undefined;

  try {
    const { document_id, submission_id, storage_path, pdf_base64, file_name } = await req.json();
    documentId = document_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Mark as processing ──
    if (document_id) {
      await supabase
        .from("client_documents")
        .update({ extraction_status: "processing" })
        .eq("id", document_id);
    }

    // ── 2. Get PDF bytes ──
    let pdfBytes: Uint8Array;

    if (pdf_base64) {
      const binaryStr = atob(pdf_base64);
      pdfBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) pdfBytes[i] = binaryStr.charCodeAt(i);
    } else if (storage_path) {
      const { data: pdfData, error: dlError } = await supabase.storage
        .from("documents")
        .download(storage_path);
      if (dlError || !pdfData) throw new Error("Failed to download PDF: " + dlError?.message);
      pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    } else {
      throw new Error("Either pdf_base64 or storage_path is required");
    }

    const pdfSizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(1);

    // ── 3. Determine page count ──
    // IMPORTANT: We do NOT slice PDFs with pdf-lib anymore because copyPages()
    // corrupts encrypted/secured PDFs, producing garbled output that Gemini
    // cannot read (returns "{}"). Instead, we send the ORIGINAL bytes and use
    // prompt instructions to tell Gemini which pages to focus on.
    const { PDFDocument } = await import("https://esm.sh/pdf-lib@1.17.1");
    let totalPages = 0;
    try {
      const tmpDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      totalPages = tmpDoc.getPageCount();
    } catch (e) {
      console.warn("[ingest] Could not read page count:", e);
    }

    console.log(`[ingest] PDF size: ${pdfSizeMB}MB, ${totalPages} pages, doc=${document_id}`);

    // Always send original bytes — never slice (avoids encryption corruption)
    const sendBase64 = pdf_base64 || uint8ToBase64(pdfBytes);

    // Determine how many pages we instruct Gemini to focus on
    let scanEnd: number;
    if (totalPages <= 0) {
      scanEnd = 0; // unknown, scan all
      console.log(`[ingest] Unknown page count, sending full PDF`);
    } else if (totalPages <= 10) {
      scanEnd = totalPages;
      console.log(`[ingest] Small doc (${totalPages}p), scanning all pages`);
    } else if (totalPages <= 25) {
      scanEnd = totalPages;
      console.log(`[ingest] Medium doc (${totalPages}p), scanning all pages`);
    } else {
      scanEnd = 25;
      console.log(`[ingest] Large doc (${totalPages}p), instructing focus on first 25 pages`);
    }

    // Build page-focus instruction for the prompt
    const pageFocus = scanEnd > 0 && scanEnd < totalPages
      ? `\n\nIMPORTANT: This document has ${totalPages} pages. Focus your extraction on pages 1 through ${scanEnd} only. These contain the declarations and coverage summary pages with the key data.`
      : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const rawText = await callGemini(sendBase64, EXTRACTION_PROMPT + pageFocus, LOVABLE_API_KEY);
    console.log(`[ingest] Gemini response length: ${rawText.length} chars`);
    console.log(`[ingest] Response preview: ${rawText.substring(0, 800)}`);

    // ── 4. Parse response ──
    let extracted: Record<string, any> = {};
    try {
      extracted = parseJson(rawText);
    } catch (parseErr) {
      console.error("[ingest] JSON parse failed:", parseErr);
      console.error("[ingest] Raw response (first 1000):", rawText.substring(0, 1000));
    }

    // Flatten any nested objects
    let formdata = flattenToFormKeys(extracted);
    let fieldCount = Object.entries(formdata).filter(
      ([_, v]) => v !== null && v !== undefined && v !== "" && v !== false
    ).length;
    console.log(`[ingest] First pass: ${fieldCount} fields from ${scanEnd || "all"} pages`);

    // ── 4b. Density-based retry — if <10 fields and we scanned <25 pages, retry wider ──
    if (fieldCount < 10 && totalPages > scanEnd && scanEnd > 0 && scanEnd < 25) {
      console.log(`[ingest] Low field count (${fieldCount}), retrying with 25 pages`);
      const retryEnd = Math.min(25, totalPages);
      const retrySliced = await extractPageRange(pdfBytes, 1, retryEnd);
      const retryBase64 = uint8ToBase64(new Uint8Array(retrySliced));
      const retryRaw = await callGemini(retryBase64, EXTRACTION_PROMPT, LOVABLE_API_KEY);
      try {
        const retryParsed = parseJson(retryRaw);
        const retryFlat = flattenToFormKeys(retryParsed);
        const retryCount = Object.entries(retryFlat).filter(
          ([_, v]) => v !== null && v !== undefined && v !== "" && v !== false
        ).length;
        console.log(`[ingest] Retry pass: ${retryCount} fields from ${retryEnd} pages`);
        if (retryCount > fieldCount) {
          formdata = retryFlat;
          fieldCount = retryCount;
        }
      } catch (e) {
        console.warn("[ingest] Retry parse failed:", e);
      }
    }

    // Log a sample of extracted keys for debugging
    const sampleKeys = Object.entries(formdata)
      .filter(([_, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 20)
      .map(([k, v]) => `${k}=${String(v).substring(0, 40)}`);
    console.log(`[ingest] Sample fields: ${sampleKeys.join(", ")}`);

    // ── 5. Inject agency profile ──
    const { data: sub } = await supabase
      .from("business_submissions")
      .select("user_id")
      .eq("id", submission_id)
      .maybeSingle();

    if (sub?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, agency_id, phone, form_defaults")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      if (profile) {
        let agencyName = "";
        if ((profile as any).agency_id) {
          const { data: ag } = await supabase
            .from("agencies").select("name")
            .eq("id", (profile as any).agency_id).maybeSingle();
          if (ag?.name) agencyName = ag.name;
        }
        if (!agencyName && profile.agency_name) agencyName = profile.agency_name;
        if (agencyName) formdata.agency_name = agencyName;
        if (profile.full_name) formdata.producer_name = profile.full_name;
        if (profile.phone) formdata.agency_phone = profile.phone;
        const fd = (profile.form_defaults || {}) as Record<string, any>;
        for (const [k, v] of Object.entries(fd)) {
          if (k === "agency_name" || k === "_training_mode") continue;
          if (v && typeof v === "string" && v.trim() && !formdata[k]) formdata[k] = v;
        }
      }
    }

    // ── 6. Upsert insurance_applications ──
    const { data: appRow } = await supabase
      .from("insurance_applications")
      .select("id, form_data")
      .eq("submission_id", submission_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const merged = mergeFormData((appRow?.form_data as Record<string, any>) ?? {}, formdata);

    if (appRow) {
      await supabase.from("insurance_applications")
        .update({ form_data: merged }).eq("id", appRow.id);
    } else {
      const { data: s } = await supabase
        .from("business_submissions").select("user_id")
        .eq("id", submission_id).single();
      if (s) {
        await supabase.from("insurance_applications").insert({
          submission_id, user_id: s.user_id, form_data: merged, status: "draft",
        });
      }
    }

    // ── 7. Update document record ──
    if (document_id) {
      await supabase.from("client_documents").update({
        extraction_status: fieldCount > 5 ? "complete" : "partial",
        extraction_confidence: fieldCount > 20 ? 0.9 : fieldCount > 5 ? 0.7 : 0.3,
        total_pages: totalPages || null,
        extraction_metadata: {
          model: "google/gemini-2.5-flash",
          field_count: fieldCount,
          pages_scanned: scanEnd || totalPages,
          total_pages: totalPages,
        },
      }).eq("id", document_id);
    }

    const mergedFieldCount = Object.entries(merged).filter(
      ([_, v]) => v !== null && v !== undefined && v !== "" && v !== false
    ).length;
    console.log(`[ingest] Final merged form_data: ${mergedFieldCount} fields`);

    return new Response(
      JSON.stringify({ success: true, fieldCount, mergedFieldCount, pages: totalPages, scanEnd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[ingest-document] Fatal:", err);
    try {
      const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      if (documentId) await sc.from("client_documents")
        .update({ extraction_status: "failed" }).eq("id", documentId);
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ── EXTRACTION PROMPT ──────────────────────────────────────────────────────
// Uses FLAT field keys that directly match ACORD 125/126 form field names.
// This avoids an error-prone nested-to-flat mapping step.

const EXTRACTION_PROMPT = `You are an expert insurance document parser. Extract ALL available data from this insurance document (declarations page, policy packet, application, or certificate).

Return a FLAT JSON object using these exact field keys. Only include fields you find in the document. Set missing fields to null.

CRITICAL: Return ONLY the JSON object. No markdown fences, no prose.

{
  "applicant_name": "Full legal name of the insured/applicant",
  "mailing_address": "Street address line 1",
  "city": "City",
  "state": "State code (2 letter)",
  "zip": "ZIP code",
  "business_phone": "Business phone number",
  "website": "Website URL",
  "fein": "Federal Employer ID Number",
  "sic_code": "SIC code",
  "naics_code": "NAICS code",
  "legal_entity": "Corporation, LLC, Partnership, Individual, etc.",
  "business_description": "Nature/description of business operations",
  "date_business_started": "YYYY-MM-DD",
  "annual_revenues": "Annual gross revenues/sales",
  "full_time_employees": "Number of full-time employees",
  "part_time_employees": "Number of part-time employees",
  
  "carrier": "Insurance company/carrier name",
  "naic_code": "Carrier NAIC code",
  "policy_number": "Policy number",
  "proposed_eff_date": "MM/DD/YYYY effective date",
  "proposed_exp_date": "MM/DD/YYYY expiration date",
  "policy_premium": "Total annual premium amount (number only)",
  "billing_plan": "Direct, Agency, etc.",
  
  "contact_name_1": "Primary contact person name",
  "contact_phone_1": "Primary contact phone",
  "contact_email_1": "Primary contact email",
  
  "premises_address": "Location/premises street address",
  "premises_city": "Location city",
  "premises_state": "Location state",
  "premises_zip": "Location ZIP",
  "occupied_sq_ft": "Occupied square footage",
  "total_building_sq_ft": "Total building square footage",
  "premises_description": "Description of operations at premises",
  "description_of_operations": "Detailed description of business operations",
  
  "gl_each_occurrence_limit": "General liability per occurrence limit (number)",
  "gl_general_aggregate_limit": "General aggregate limit (number)",
  "gl_products_completed_operations_aggregate": "Products/completed ops aggregate (number)",
  "gl_medical_expense_any_one_person_limit": "Medical expense limit (number)",
  "gl_damage_to_premises_rented_limit": "Damage to rented premises limit (number)",
  "gl_personal_advertising_injury_limit": "Personal & advertising injury limit (number)",
  
  "bop_building_limit_1": "Building coverage limit at location 1 (number)",
  "bop_bpp_limit_1": "Business personal property limit (number)",
  "bop_property_deductible_1": "Property deductible amount (number)",
  
  "auto_combined_single_limit": "Auto combined single limit (number)",
  "auto_bodily_injury_per_person": "Auto BI per person limit (number)",
  "auto_bodily_injury_per_accident": "Auto BI per accident limit (number)",
  "auto_property_damage_limit": "Auto property damage limit (number)",
  
  "wc_each_accident_limit": "Workers comp each accident limit (number)",
  "wc_disease_each_employee_limit": "WC disease per employee limit (number)",
  "wc_disease_policy_limit": "WC disease policy limit (number)",
  
  "umbrella_each_occurrence_limit": "Umbrella per occurrence limit (number)",
  "umbrella_aggregate_limit": "Umbrella aggregate limit (number)",
  
  "cyber_aggregate_limit": "Cyber aggregate limit (number)",
  "epli_each_claim_limit": "EPLI per claim limit (number)",
  "epli_aggregate_limit": "EPLI aggregate limit (number)",
  
  "prior_carrier_1": "Current/prior carrier name",
  "prior_policy_number_1": "Current/prior policy number",
  "prior_eff_date_1": "MM/DD/YYYY prior effective date",
  "prior_exp_date_1": "MM/DD/YYYY prior expiration date",
  "prior_gl_premium_1": "Prior premium amount (number)",
  
  "lob_bop": true,
  "lob_gl": true,
  "lob_property": true,
  "lob_auto": true,
  "lob_umbrella": true,
  
  "additional_interest_name_a": "Additional interest/mortgagee name",
  "additional_interest_address_a": "Additional interest address",
  
  "loss_1_date": "MM/DD/YYYY date of loss",
  "loss_1_description": "Description of loss",
  "loss_1_amount": "Loss amount (number)",
  "loss_1_status": "Open or Closed"
}

IMPORTANT RULES:
- Dates: use MM/DD/YYYY format
- Dollar amounts: numbers only, no $ or commas (e.g. 1000000 not "$1,000,000")
- For LOB flags (lob_bop, lob_gl, etc.): set to true ONLY if that line of business is covered in this policy
- Extract from ALL pages, focusing on declarations, schedules, and coverage summaries
- If the document has multiple locations, use the first location for the primary fields
- For limits, use the per-occurrence value (not aggregate) unless the field name specifies aggregate`;

const SYSTEM_PROMPT = `You are an expert insurance document parser for a commercial lines agency management system.
Extract data into STRICT JSON that exactly matches the provided schema.
Rules:
- Return ONLY the JSON object — no prose, no markdown fences.
- If a field is not present in the document, omit it or set to null.
- Never invent data. Only extract what is explicitly stated.
- Dates: MM/DD/YYYY format.
- Dollar amounts: numbers only (no $ or commas).`;

// ── Helpers ────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function callGemini(base64: string, prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const t = await response.text();
    if (response.status === 429) throw new Error("Rate limited");
    if (response.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI extraction failed (${response.status}): ${t.substring(0, 300)}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "{}";
}

function parseJson(text: string): Record<string, any> {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Flatten nested objects into flat keys that match ACORD field maps.
 * Handles both flat responses (ideal) and nested ones (legacy prompts).
 */
function flattenToFormKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (k === "confidence") continue;
    if (v === null || v === undefined) continue;

    if (typeof v === "object" && !Array.isArray(v)) {
      // Nested object — flatten with context-aware key mapping
      const nested = flattenNested(k, v);
      for (const [nk, nv] of Object.entries(nested)) {
        if (nv !== null && nv !== undefined && nv !== "") {
          result[nk] = nv;
        }
      }
    } else if (Array.isArray(v)) {
      // Arrays (locations, vehicles, etc.) — take first item
      if (v.length > 0 && typeof v[0] === "object") {
        const first = v[0];
        for (const [ak, av] of Object.entries(first)) {
          if (av !== null && av !== undefined && av !== "") {
            result[`${k.replace(/s$/, "")}_1_${ak}`] = av;
          }
        }
      }
    } else {
      result[k] = v;
    }
  }

  // Apply common aliases
  applyAliases(result);
  return result;
}

function flattenNested(prefix: string, obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const deeper = flattenNested(`${prefix}_${k}`, v);
      Object.assign(result, deeper);
    } else {
      result[`${prefix}_${k}`] = v;
    }
  }
  return result;
}

/**
 * Map common extraction key variants to canonical ACORD field keys
 */
function applyAliases(data: Record<string, any>) {
  const ALIASES: Record<string, string> = {
    insured_name: "applicant_name",
    named_insured: "applicant_name",
    insured_applicant_name: "applicant_name",
    insured_mailing_address: "mailing_address",
    insured_mailing_city: "city",
    insured_mailing_state: "state",
    insured_mailing_zip: "zip",
    insured_fein: "fein",
    insured_business_description: "business_description",
    insured_legal_entity: "legal_entity",
    carrier_name: "carrier",
    carrier_carrier_name: "carrier",
    carrier_naic_code: "naic_code",
    policy_policy_number: "policy_number",
    policy_policy_effective_date: "proposed_eff_date",
    policy_policy_expiration_date: "proposed_exp_date",
    policy_effective_date: "proposed_eff_date",
    policy_expiration_date: "proposed_exp_date",
    policy_total_annual_premium: "policy_premium",
    total_annual_premium: "policy_premium",
    producer_producer_name: "producer_name",
    producer_producer_phone: "agency_phone",
    producer_agency_code: "agency_code",
    nature_of_business: "description_of_operations",
    liability_each_occurrence_limit: "gl_each_occurrence_limit",
    liability_general_aggregate_limit: "gl_general_aggregate_limit",
    liability_products_completed_ops_aggregate: "gl_products_completed_operations_aggregate",
    liability_medical_expense_limit: "gl_medical_expense_any_one_person_limit",
    liability_damage_to_premises_rented_limit: "gl_damage_to_premises_rented_limit",
    current_carrier: "prior_carrier_1",
    current_premium: "prior_gl_premium_1",
    each_occurrence_limit: "gl_each_occurrence_limit",
    general_aggregate_limit: "gl_general_aggregate_limit",
  };

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (data[alias] && !data[canonical]) {
      data[canonical] = data[alias];
      delete data[alias];
    }
  }
}

function mergeFormData(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const next = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined || v === null) continue;
    const curr = next[k];
    const empty = curr === undefined || curr === null
      || (typeof curr === "string" && !curr.trim())
      || String(curr).toLowerCase() === "na";
    if (empty) next[k] = v;
  }
  return next;
}
