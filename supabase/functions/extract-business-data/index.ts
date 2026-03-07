import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

/**
 * ═══════════════════════════════════════════════════════════
 *  AURA 3-Stage Extraction Pipeline
 * ═══════════════════════════════════════════════════════════
 *
 *  Stage 1 — OCR (Google Cloud Vision API)
 *    PDF bytes → structured text + bounding boxes per page.
 *    No LLM involved; deterministic, fast, cheap.
 *
 *  Stage 2 — Schema Mapping (Gemini Flash via Lovable AI)
 *    OCR text (NOT raw PDF) + strict JSON schema → structured data.
 *    ~10x fewer tokens than sending PDF bytes.
 *
 *  Stage 3 — Specialist Review (Claude Opus)
 *    Only invoked when Stage 2 produces < CONFIDENCE_THRESHOLD
 *    meaningful fields. Receives OCR text + Stage 2 partial results
 *    for targeted gap-filling on ambiguous fields.
 *
 *  Fallback: if no Google Cloud API key, sends PDFs directly to
 *  Gemini Pro (legacy path), preserving backward compatibility.
 * ═══════════════════════════════════════════════════════════
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PDF_PAGES = 50;
const MAX_TOTAL_PAGES = 250;
const CONFIDENCE_THRESHOLD = 5; // minimum meaningful fields before triggering specialist

// ── Shared schema prompt (used by Stage 2 and Stage 3) ──
const SCHEMA_PROMPT = `You are an expert insurance underwriter assistant. Extract data from the provided OCR text and return ONLY valid JSON with no markdown fences, no explanation — just raw JSON.

CRITICAL ANTI-HALLUCINATION RULES:
- NEVER fabricate, guess, or invent data. If information is not explicitly present in the provided text, leave the field as an empty string "".
- Do NOT fill in sample/placeholder data like "123 Main St", "Acme Corp", "John Smith", or generic SIC/NAICS codes.
- Do NOT infer employee counts, revenue, addresses, phone numbers, or any other factual data that is not stated.
- Only populate a field if you can point to the specific text in the input that contains that value.

CODES — EXTRACT VERBATIM ONLY, NEVER INFER:
- sic_code, naics_code, naic_code, gl_code, class_code_1, class_code_2, hazard_code_1, hazard_code_2, program_code, ncci_risk_id, wc_class_code, policy_number, prior_policy_number_1, prior_wc_policy_1: these fields must ONLY be populated if the EXACT code/number appears verbatim in the source text.

Return this exact structure:
{
  "form_data": {
    "applicant_name": "", "dba_name": "", "mailing_address": "", "city": "", "state": "", "zip": "",
    "phone": "", "email": "", "website": "", "fein": "", "sic_code": "", "naics_code": "",
    "business_type": "", "year_established": "", "annual_revenue": "", "number_of_employees": "",
    "full_time_employees": "", "part_time_employees": "", "nature_of_business": "",
    "description_of_operations": "", "effective_date": "", "expiration_date": "",
    "current_carrier": "", "current_premium": "", "policy_number": "", "naic_code": "",
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
    "lob_commercial_general_liability": "false",
    "cgl_premium": "",
    "chk_commercial_general_liability": "false",
    "chk_claims_made": "false", "chk_occurrence": "false",
    "chk_owners_contractors": "false",
    "chk_limit_policy": "false", "chk_limit_location": "false",
    "chk_limit_project": "false", "chk_limit_other": "false",
    "chk_deductible_pd": "false", "chk_deductible_bi": "false",
    "chk_per_claim": "false", "chk_per_occurrence": "false",
    "hazard_loc_1": "", "hazard_bldg_1": "", "hazard_code_1": "", "hazard_classification_1": "",
    "hazard_premium_basis_1": "", "hazard_exposure_1": "", "hazard_terr_1": "",
    "hazard_rate_premops_1": "", "hazard_rate_products_1": "",
    "hazard_premium_premops_1": "", "hazard_premium_products_1": "",
    "hazard_loc_2": "", "hazard_bldg_2": "", "hazard_code_2": "", "hazard_classification_2": "",
    "hazard_premium_basis_2": "", "hazard_exposure_2": "", "hazard_terr_2": "",
    "hazard_rate_premops_2": "", "hazard_rate_products_2": "",
    "hazard_premium_premops_2": "", "hazard_premium_products_2": "",
    "hazard_loc_3": "", "hazard_bldg_3": "", "hazard_code_3": "", "hazard_classification_3": "",
    "hazard_premium_basis_3": "", "hazard_exposure_3": "", "hazard_terr_3": "",
    "hazard_rate_premops_3": "", "hazard_rate_products_3": "",
    "hazard_premium_premops_3": "", "hazard_premium_products_3": "",
    "total_premium_premops": "", "total_premium_products": "", "premium_subtotal": "",
    "premium_tax": "", "total_premium": "",
    "retroactive_date": "", "entry_date_claims_made": "",
    "deductible_amount": "", "retention_amount": "", "aggregate_applies_per": "",
    "ebl_limit": "", "ebl_deductible_per_claim": "", "ebl_aggregate": "", "ebl_num_employees": "",
    "audit_period": "", "tria_premium": "", "policy_fee": "",
    "vehicles": [],
    "drivers": []
  },
  "gaps": []
}

EXTRACTION RULES:
- Return ALL fields even if empty string — but ONLY populate with data actually found in input
- All scalar values must be strings — booleans as "true"/"false"
- Dates → MM/DD/YYYY format, currencies → plain number without $ or commas
- lob_* flags: set "true" ONLY if that coverage type is explicitly mentioned
- CHECKBOX FIELDS (chk_*): set "true" if the document indicates that option applies
- SCHEDULE OF HAZARDS: Extract ALL class code rows (hazard_*_1, hazard_*_2, hazard_*_3)
- vehicles[]: include ALL vehicles — each: { year, make, model, vin, body_type, stated_amount, garaging_zip }
- drivers[]: include ALL drivers — each: { name, dob, license, license_state }
- gaps[]: list missing important fields — { field, question, priority: required|recommended|optional }
- If no meaningful data is provided, return all fields as empty strings`;

// ═══════════════════════════════════════════════════════════
//  STAGE 1 — Google Cloud Vision OCR
// ═══════════════════════════════════════════════════════════

interface OcrPage {
  pageNumber: number;
  text: string;
  confidence: number;
}

/**
 * Run Google Cloud Vision DOCUMENT_TEXT_DETECTION on a base64 PDF.
 * Vision API accepts up to 5 pages per sync request, so we chunk.
 */
async function runGoogleOcr(
  apiKey: string,
  pdfBase64: string,
  mimeType: string,
): Promise<OcrPage[]> {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  // For PDFs, use the files:annotate endpoint which handles multi-page
  if (mimeType === "application/pdf") {
    return await runGoogleOcrPdf(apiKey, pdfBase64);
  }

  // For images, use standard annotate
  const body = {
    requests: [{
      image: { content: pdfBase64 },
      features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
    }],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Referer": "https://buildingaura.site" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("[ocr] Vision API error:", resp.status, err);
    try {
      const errJson = JSON.parse(err);
      const errCode = errJson?.error?.status || errJson?.error?.code || "";
      const errMessage = errJson?.error?.message || "";
      if (errCode === "API_KEY_INVALID" || errCode === 403 || String(errCode) === "403") {
        throw new Error("VISION_KEY_INVALID: Your Google Cloud API key is invalid or the Vision API is not enabled.");
      }
      if (errCode === "RESOURCE_EXHAUSTED" || resp.status === 429) {
        throw new Error("VISION_QUOTA_EXCEEDED: Google Cloud Vision API quota exceeded.");
      }
      if (errMessage) {
        throw new Error(`VISION_ERROR: ${errMessage}`);
      }
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message.startsWith("VISION_")) throw parseErr;
    }
    throw new Error(`Vision API error: ${resp.status}`);
  }

  const result = await resp.json();
  const annotation = result.responses?.[0]?.fullTextAnnotation;
  if (!annotation) {
    return [{ pageNumber: 1, text: "", confidence: 0 }];
  }

  return [{
    pageNumber: 1,
    text: annotation.text || "",
    confidence: annotation.pages?.[0]?.confidence || 0.9,
  }];
}

/**
 * Google Cloud Vision files:asyncBatchAnnotate for PDFs.
 * For simplicity, we use the sync files:annotate endpoint (up to 5 pages).
 * For longer PDFs, we split into chunks.
 */
async function runGoogleOcrPdf(apiKey: string, pdfBase64: string): Promise<OcrPage[]> {
  // Split PDF into chunks of 5 pages (Vision API limit)
  const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
  let srcDoc: any;
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch (e) {
    console.warn("[ocr] Failed to load PDF for chunking, trying as single:", e);
    // Try as single image
    return await runGoogleOcrSingleChunk(apiKey, pdfBase64, "application/pdf");
  }

  const totalPages = srcDoc.getPageCount();
  const chunkSize = 5;
  const allPages: OcrPage[] = [];

  for (let start = 0; start < totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalPages);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);

    // Create a sub-PDF for this chunk
    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => chunkDoc.addPage(page));
    const chunkBytes = await chunkDoc.save();
    let chunkB64 = '';
    const bytes = new Uint8Array(chunkBytes);
    for (let i = 0; i < bytes.length; i++) {
      chunkB64 += String.fromCharCode(bytes[i]);
    }
    chunkB64 = btoa(chunkB64);

    const chunkPages = await runGoogleOcrSingleChunk(apiKey, chunkB64, "application/pdf");
    // Adjust page numbers to be global
    chunkPages.forEach((p, idx) => {
      p.pageNumber = start + idx + 1;
    });
    allPages.push(...chunkPages);
  }

  return allPages;
}

async function runGoogleOcrSingleChunk(
  apiKey: string,
  base64Data: string,
  mimeType: string,
): Promise<OcrPage[]> {
  const url = `https://vision.googleapis.com/v1/files:annotate?key=${apiKey}`;
  const body = {
    requests: [{
      inputConfig: {
        content: base64Data,
        mimeType,
      },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      pages: [1, 2, 3, 4, 5], // Max 5 pages per request
    }],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Referer": "https://buildingaura.site" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("[ocr] Vision files:annotate error:", resp.status, err);
    try {
      const errJson = JSON.parse(err);
      const errCode = errJson?.error?.status || errJson?.error?.code || "";
      const errMessage = errJson?.error?.message || "";
      if (errCode === "API_KEY_INVALID" || errCode === 403 || String(errCode) === "403") {
        throw new Error("VISION_KEY_INVALID: Your Google Cloud API key is invalid or the Vision API is not enabled.");
      }
      if (errCode === "RESOURCE_EXHAUSTED" || resp.status === 429) {
        throw new Error("VISION_QUOTA_EXCEEDED: Google Cloud Vision API quota exceeded.");
      }
      if (errMessage) {
        throw new Error(`VISION_ERROR: ${errMessage}`);
      }
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message.startsWith("VISION_")) throw parseErr;
    }
    throw new Error(`Vision API error: ${resp.status}`);
  }

  const result = await resp.json();

  const getByPath = (obj: any, path: string): any => {
    return path.split(".").reduce((acc: any, key) => {
      if (acc == null) return undefined;
      const m = key.match(/(\w+)\[(\d+)\]/);
      if (m) return acc[m[1]]?.[Number(m[2])];
      return acc[key];
    }, obj);
  };

  const candidatePaths = [
    "responses[0].responses", // files:annotate common wrapper
    "responses", // images:annotate shape
    "result.responses[0].responses", // operation/result wrapper
    "result.responses", // operation/result wrapper (flat)
    "operation.response.responses[0].responses", // async operation wrapper
    "operation.response.responses", // async operation wrapper (flat)
    "operation.result.responses[0].responses", // alternate operation wrapper
    "operation.result.responses", // alternate operation wrapper (flat)
    "response.responses[0].responses", // some SDK wrappers
    "response.responses", // some SDK wrappers (flat)
  ];

  let responses: any[] = [];
  let selectedPath = "";

  for (const path of candidatePaths) {
    const value = getByPath(result, path);
    if (Array.isArray(value) && value.length > 0) {
      responses = value;
      selectedPath = path;
      break;
    }
  }

  const topKeys = Object.keys(result || {});
  const firstResponse = responses[0];
  const firstResponseKeys = firstResponse ? Object.keys(firstResponse) : [];
  console.log(`[ocr-debug] Response keys: ${topKeys.join(",")}`);
  console.log(`[ocr-debug] Selected payload key path: ${selectedPath || "none"}; page responses: ${responses.length}; first response keys: ${firstResponseKeys.join(",") || "N/A"}`);

  // TEMP: dump raw payload sample when OCR finds nothing useful
  if (responses.length === 0 || !firstResponse?.fullTextAnnotation) {
    const raw = JSON.stringify(result).slice(0, 2000);
    console.log(`[ocr-raw-dump] ${raw}`);
  }

  // Flat fallback: single fullTextAnnotation at known wrapper levels
  if (responses.length === 0) {
    const flatCandidates = [
      "responses[0].fullTextAnnotation",
      "result.responses[0].fullTextAnnotation",
      "operation.response.responses[0].fullTextAnnotation",
      "operation.result.responses[0].fullTextAnnotation",
      "response.responses[0].fullTextAnnotation",
    ];

    for (const path of flatCandidates) {
      const annotation = getByPath(result, path);
      if (annotation?.text) {
        console.log(`[ocr-debug] Selected payload key path: ${path}`);
        return [{
          pageNumber: 1,
          text: annotation.text || "",
          confidence: annotation.pages?.[0]?.confidence || 0.9,
        }];
      }
    }
  }

  const pages: OcrPage[] = [];

  for (let i = 0; i < responses.length; i++) {
    const annotation = responses[i]?.fullTextAnnotation;
    const textLen = annotation?.text?.length || 0;
    if (i === 0) {
      console.log(`[ocr-debug] Page ${i + 1}: hasAnnotation=${!!annotation}, textLen=${textLen}, respKeys=${Object.keys(responses[i] || {}).join(",")}`);
    }
    pages.push({
      pageNumber: i + 1,
      text: annotation?.text || "",
      confidence: annotation?.pages?.[0]?.confidence || 0,
    });
  }

  if (pages.length === 0) {
    // Last fallback: top-level annotation
    const topAnnotation = getByPath(result, "responses[0].fullTextAnnotation") ||
      getByPath(result, "result.responses[0].fullTextAnnotation") ||
      getByPath(result, "operation.response.responses[0].fullTextAnnotation") ||
      getByPath(result, "operation.result.responses[0].fullTextAnnotation") ||
      getByPath(result, "response.responses[0].fullTextAnnotation");

    if (topAnnotation) {
      const pageTexts = topAnnotation.text?.split("\f") || [topAnnotation.text || ""];
      for (let i = 0; i < pageTexts.length; i++) {
        pages.push({
          pageNumber: i + 1,
          text: pageTexts[i] || "",
          confidence: topAnnotation.pages?.[i]?.confidence || 0.9,
        });
      }
    }
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, text: "", confidence: 0 }];
}

// ═══════════════════════════════════════════════════════════
//  STAGE 2 — Gemini Flash Schema Mapping
// ═══════════════════════════════════════════════════════════

async function callGeminiFlash(
  apiKey: string,
  ocrText: string,
  additionalContext: string,
): Promise<string> {
  const userPrompt = `Extract all insurance data from the following OCR text extracted from insurance documents.

${additionalContext ? `Additional context:\n${additionalContext}\n\n` : ""}OCR TEXT:
${ocrText}`;

  const t0 = Date.now();
  console.log(`[stage2] Calling Gemini Flash for schema mapping (${ocrText.length} chars OCR text)...`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SCHEMA_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  console.log(`[stage2] Gemini Flash responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const t = await response.text();
    console.error("[stage2] Gemini Flash error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limited, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Gemini Flash error: ${response.status}`);
  }

  const aiResult = await response.json();
  return aiResult.choices?.[0]?.message?.content || "{}";
}

// ═══════════════════════════════════════════════════════════
//  STAGE 3 — Claude Opus Specialist (low-confidence fields)
// ═══════════════════════════════════════════════════════════

async function callClaudeOpus(
  apiKey: string,
  ocrText: string,
  partialResults: Record<string, any>,
  additionalContext: string,
): Promise<string> {
  const emptyFields = Object.entries(partialResults)
    .filter(([k, v]) => !["vehicles", "drivers", "coverage_types_needed", "gaps"].includes(k) && (!v || String(v).trim() === "" || String(v).trim() === "false"))
    .map(([k]) => k);

  const specialistPrompt = `You are a specialist insurance document analyst reviewing OCR text that a previous extraction pass could not fully parse.

PREVIOUS EXTRACTION found ${Object.entries(partialResults).filter(([k, v]) => v && String(v).trim() && String(v).trim() !== "false").length} fields but left ${emptyFields.length} fields empty.

Your job: carefully re-read the OCR text and fill in any fields the previous pass missed. Focus especially on:
- Names, addresses, policy numbers buried in dense text
- Table data (vehicles, drivers, class codes, limits)
- Ambiguous abbreviations or formatting

CRITICAL: Do NOT hallucinate. Only fill fields with data you can directly quote from the OCR text.

Return the COMPLETE form_data JSON (all fields, including the ones already filled), merging your findings with the previous results. Keep existing values unless you find a more accurate/complete version.

Return ONLY valid JSON with this structure:
{
  "form_data": { ... all fields ... },
  "gaps": [ ... remaining gaps ... ]
}`;

  const userPrompt = `Previous partial extraction:
${JSON.stringify(partialResults, null, 2).substring(0, 3000)}

${additionalContext ? `Context: ${additionalContext}\n\n` : ""}OCR TEXT:
${ocrText}`;

  const t0 = Date.now();
  console.log(`[stage3] Calling Claude Opus for specialist review (${emptyFields.length} empty fields)...`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 8192,
      system: specialistPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  console.log(`[stage3] Claude Opus responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[stage3] Claude Opus error:", response.status, errText);
    throw new Error(`Claude Opus error: ${response.status}`);
  }

  const result = await response.json();
  const blocks = Array.isArray(result?.content) ? result.content : [];
  const text = blocks
    .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();

  console.log(`[stage3] Claude Opus usage: ${JSON.stringify(result?.usage || {})}`);

  if (!text) throw new Error("Claude Opus returned empty content");
  return text;
}

// ═══════════════════════════════════════════════════════════
//  LEGACY FALLBACK — Direct PDF-to-LLM (no OCR key)
// ═══════════════════════════════════════════════════════════

async function callGeminiWithPdfs(
  apiKey: string,
  systemPrompt: string,
  userPromptText: string,
  pdfFiles: any[],
  model = "google/gemini-2.5-pro",
): Promise<string> {
  type ContentPart = { type: string; text?: string; image_url?: { url: string } };
  const userContent: ContentPart[] = [{ type: "text", text: userPromptText }];
  for (const pf of pdfFiles) {
    if (pf.base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${pf.mimeType || "application/pdf"};base64,${pf.base64}` },
      });
    }
  }

  const t0 = Date.now();
  console.log(`[legacy] Calling ${model} with raw PDFs...`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  console.log(`[legacy] ${model} responded in ${Date.now() - t0}ms (status: ${response.status})`);

  if (!response.ok) {
    const t = await response.text();
    console.error("[legacy] error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limited, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI extraction failed (${response.status})`);
  }

  const aiResult = await response.json();
  return aiResult.choices?.[0]?.message?.content || "{}";
}

// ═══════════════════════════════════════════════════════════
//  PDF UTILITIES
// ═══════════════════════════════════════════════════════════

async function truncatePdf(base64Data: string, maxPages: number): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();
    if (pageCount <= maxPages) return base64Data;

    console.log(`[pdf] Truncating from ${pageCount} to ${maxPages} pages`);
    const newDoc = await PDFDocument.create();
    const indices = Array.from({ length: maxPages }, (_, i) => i);
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));

    const newBytes = await newDoc.save();
    let binary = '';
    const bytes = new Uint8Array(newBytes);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn("[pdf] Truncation failed, using original:", err);
    return base64Data;
  }
}

function countMeaningfulFields(fd: Record<string, any>): number {
  const IGNORE = new Set(["vehicles", "drivers", "coverage_types_needed", "gaps"]);
  return Object.entries(fd).filter(
    ([k, v]) => !IGNORE.has(k) && v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]"
  ).length;
}

function parseAiJson(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

// ═══════════════════════════════════════════════════════════
//  POST-PROCESSING (shared across all paths)
// ═══════════════════════════════════════════════════════════

function classifyVehicleBodyType(make: string, model: string): string {
  const combined = `${make} ${model}`.toLowerCase().trim();
  if (/trailer|flatbed|lowboy|reefer|tanker|semi[- ]?trailer|drop[- ]?deck|gooseneck|car\s*hauler|dump\s*trailer/i.test(combined)) return "Trailer";
  if (/f[- ]?[5-9]\d{2}|peterbilt|kenworth|mack|freightliner|international\s*(4[0-9]|work|dura|pay)|hino|isuzu\s*n[prq]r|volvo\s*v[hn]|western\s*star/i.test(combined)) return "Truck";
  if (/f[- ]?[1-4]50|silverado|sierra|ram\s*[1-5]\d{3}|tundra|titan|tacoma|ranger|colorado|canyon|frontier|ridgeline|maverick|gladiator/i.test(combined)) return "Pickup";
  if (/sprinter|transit|promaster|express|savana|metris|nv\s*\d|e[- ]?\d{3}/i.test(combined)) return "Van";
  if (/suburban|tahoe|yukon|expedition|explorer|4runner|sequoia|armada|pathfinder|pilot|highlander|durango|wrangler|bronco|defender/i.test(combined)) return "SUV";
  if (/sedan|camry|accord|civic|altima|malibu|fusion|corolla|jetta|passat|sonata|elantra|mazda[36]|impreza|legacy/i.test(combined)) return "Sedan";
  return "";
}

function postProcess(fd: Record<string, any>, sourceText: string, hasPdfs: boolean): void {
  // Strip potentially hallucinated code fields
  const CODE_FIELDS = [
    "sic_code", "naics_code", "naic_code", "gl_code", "class_code_1", "class_code_2",
    "hazard_code_1", "hazard_code_2", "hazard_code_3", "program_code", "ncci_risk_id", "wc_class_code",
  ];
  for (const cf of CODE_FIELDS) {
    if (fd[cf]) {
      const val = String(fd[cf]).trim();
      if (val && !hasPdfs && !sourceText.includes(val)) fd[cf] = "";
    }
  }

  // Flatten vehicles[] → vehicle_N_*
  const vehicles: any[] = Array.isArray(fd.vehicles) ? fd.vehicles : [];
  vehicles.forEach((v: any, idx: number) => {
    const n = idx + 1;
    if (v.year && !fd[`vehicle_${n}_year`]) fd[`vehicle_${n}_year`] = String(v.year);
    if (v.make && !fd[`vehicle_${n}_make`]) fd[`vehicle_${n}_make`] = String(v.make);
    if (v.model && !fd[`vehicle_${n}_model`]) fd[`vehicle_${n}_model`] = String(v.model);
    if ((v.vin || v.VIN) && !fd[`vehicle_${n}_vin`]) fd[`vehicle_${n}_vin`] = String(v.vin || v.VIN);
    if ((v.body_type || v.bodyType || v.type) && !fd[`vehicle_${n}_body_type`])
      fd[`vehicle_${n}_body_type`] = String(v.body_type || v.bodyType || v.type);
    if ((v.stated_amount || v.cost_new) && !fd[`vehicle_${n}_stated_amount`])
      fd[`vehicle_${n}_stated_amount`] = String(v.stated_amount || v.cost_new);
    if ((v.garaging_zip || v.zip) && !fd[`vehicle_${n}_garaging_zip`])
      fd[`vehicle_${n}_garaging_zip`] = String(v.garaging_zip || v.zip);
    if ((v.gvw || v.gcw || v.gross_vehicle_weight) && !fd[`vehicle_${n}_gvw`])
      fd[`vehicle_${n}_gvw`] = String(v.gvw || v.gcw || v.gross_vehicle_weight);
    if ((v.comp_deductible || v.comprehensive_deductible) && !fd[`vehicle_${n}_comp_deductible`])
      fd[`vehicle_${n}_comp_deductible`] = String(v.comp_deductible || v.comprehensive_deductible);
    if ((v.coll_deductible || v.collision_deductible) && !fd[`vehicle_${n}_coll_deductible`])
      fd[`vehicle_${n}_coll_deductible`] = String(v.coll_deductible || v.collision_deductible);
  });
  if (vehicles.length > 0 && !fd.number_of_vehicles) fd.number_of_vehicles = String(vehicles.length);

  // Auto-classify vehicle body types from make/model
  for (let n = 1; n <= 15; n++) {
    const make = fd[`vehicle_${n}_make`] || "";
    const model = fd[`vehicle_${n}_model`] || "";
    if (!make && !model) break;
    if (!fd[`vehicle_${n}_body_type`]) {
      fd[`vehicle_${n}_body_type`] = classifyVehicleBodyType(make, model);
    }
  }

  // Flatten drivers[] → driver_N_*
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
  if (drivers.length > 0 && !fd.number_of_drivers) fd.number_of_drivers = String(drivers.length);

  if (vehicles.length > 0 && fd.lob_auto !== "true") fd.lob_auto = "true";

  // Normalize business_type
  const BT_MAP: Record<string, string> = {
    "limited liability company": "LLC", "limit liability comp": "LLC", "llc": "LLC",
    "corporation": "Corporation", "corp": "Corporation",
    "s corporation": "S Corporation", "s corp": "S Corporation",
    "c corporation": "C Corporation", "c corp": "C Corporation",
    "partnership": "Partnership", "sole proprietor": "Sole Proprietor",
    "sole proprietorship": "Sole Proprietor", "joint venture": "Joint Venture",
    "trust": "Trust", "not for profit": "Not For Profit",
    "non-profit": "Not For Profit", "nonprofit": "Not For Profit",
    "individual": "Individual", "subchapter s corporation": "Subchapter S Corporation",
  };
  if (fd.business_type) {
    const btLower = String(fd.business_type).trim().toLowerCase();
    if (BT_MAP[btLower]) {
      fd.business_type = BT_MAP[btLower];
    } else {
      const entityKw = ["llc", "corp", "partnership", "proprietor", "venture", "trust", "individual", "liability"];
      if (!entityKw.some(kw => btLower.includes(kw)) && !fd.nature_of_business) {
        fd.nature_of_business = fd.business_type;
        fd.business_type = "";
      }
    }
  }

  // Auto-detect occurrence vs claims-made
  if (fd.lob_gl === "true" || fd.lob_commercial_general_liability === "true" || fd.chk_commercial_general_liability === "true") {
    if (fd.chk_occurrence !== "true" && fd.chk_claims_made !== "true") {
      if (fd.retroactive_date || fd.entry_date_claims_made) fd.chk_claims_made = "true";
      else fd.chk_occurrence = "true";
    }
  }

  // Auto-set aggregate applies per
  if (!fd.aggregate_applies_per && (fd.chk_limit_policy === "true" || fd.chk_limit_project === "true" || fd.chk_limit_location === "true")) {
    if (fd.chk_limit_policy === "true") fd.aggregate_applies_per = "Policy";
    else if (fd.chk_limit_project === "true") fd.aggregate_applies_per = "Project";
    else if (fd.chk_limit_location === "true") fd.aggregate_applies_per = "Location";
  }
  if (fd.lob_gl === "true" && fd.chk_limit_policy !== "true" && fd.chk_limit_project !== "true" && fd.chk_limit_location !== "true") {
    fd.chk_limit_policy = "true";
    if (!fd.aggregate_applies_per) fd.aggregate_applies_per = "Policy";
  }

  // Infer entity type from company name
  if (!fd.business_type && fd.applicant_name) {
    const name = String(fd.applicant_name).trim();
    if (/\bLLC\b/i.test(name)) fd.business_type = "LLC";
    else if (/\bInc\.?\b/i.test(name)) fd.business_type = "Corporation";
    else if (/\bCorp\.?\b/i.test(name)) fd.business_type = "Corporation";
    else if (/\bLLP\b/i.test(name)) fd.business_type = "Partnership";
    else if (/\bLP\b/i.test(name)) fd.business_type = "Partnership";
  }
}

// ═══════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { description, file_contents, pdf_files, submission_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Service temporarily unavailable");

    const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const hasPdfs = Array.isArray(pdf_files) && pdf_files.length > 0;
    const additionalContext = `${description || ""}${file_contents ? `\n${file_contents}` : ""}`;

    const t0 = Date.now();
    let extracted: any;
    let pipelineUsed = "unknown";

    // ────────────────────────────────────────────────
    //  3-STAGE PIPELINE (when Google Cloud Vision key exists)
    // ────────────────────────────────────────────────
    if (GOOGLE_CLOUD_API_KEY && hasPdfs) {
      pipelineUsed = "3-stage";
      console.log(`[pipeline] Starting 3-stage extraction (${pdf_files.length} file(s))`);

      // ── Stage 1: OCR ──
      let allOcrText = "";
      let totalPagesProcessed = 0;

      for (let fi = 0; fi < pdf_files.length; fi++) {
        const pf = pdf_files[fi];
        if (!pf.base64) continue;

        // Budget check
        if (totalPagesProcessed >= MAX_TOTAL_PAGES) {
          console.log(`[stage1] Page budget exhausted (${totalPagesProcessed}/${MAX_TOTAL_PAGES}), skipping file ${fi + 1}`);
          break;
        }

        const mimeType = pf.mimeType || "application/pdf";
        const remainingBudget = MAX_TOTAL_PAGES - totalPagesProcessed;

        // Truncate PDF if needed
        let processBase64 = pf.base64;
        if (mimeType === "application/pdf") {
          processBase64 = await truncatePdf(pf.base64, Math.min(MAX_PDF_PAGES, remainingBudget));
        }

        try {
          const t1 = Date.now();
          const ocrPages = await runGoogleOcr(GOOGLE_CLOUD_API_KEY, processBase64, mimeType);
          const ocrTime = Date.now() - t1;
          const pageTexts = ocrPages.map(p => p.text).filter(t => t.trim());
          const avgConfidence = ocrPages.length > 0
            ? (ocrPages.reduce((s, p) => s + p.confidence, 0) / ocrPages.length).toFixed(2)
            : "0";

          console.log(`[stage1] File ${fi + 1}: ${ocrPages.length} pages OCR'd in ${ocrTime}ms, avg confidence=${avgConfidence}, ${pageTexts.join("").length} chars`);
          totalPagesProcessed += ocrPages.length;

          if (pageTexts.length > 0) {
            allOcrText += `\n--- FILE ${fi + 1} ---\n${pageTexts.join("\n--- PAGE BREAK ---\n")}`;
          }
        } catch (ocrErr: any) {
          const errMsg = ocrErr?.message || "";
          if (errMsg.startsWith("VISION_KEY_INVALID") || errMsg.startsWith("VISION_QUOTA_EXCEEDED") || errMsg.startsWith("VISION_ERROR")) {
            throw ocrErr;
          }
          console.error(`[stage1] OCR failed for file ${fi + 1}:`, ocrErr);
          // Continue with other files for transient errors
        }
      }

      console.log(`[stage1] Total OCR: ${totalPagesProcessed} pages, ${allOcrText.length} chars`);

      if (allOcrText.trim().length < 20) {
        // OCR produced no useful text — fall back to legacy
        console.warn("[stage1] OCR produced insufficient text, falling back to legacy pipeline");
        pipelineUsed = "legacy-ocr-empty";
        const legacyResult = await runLegacyPipeline(LOVABLE_API_KEY, ANTHROPIC_API_KEY, pdf_files, additionalContext, hasPdfs);
        extracted = legacyResult;
      } else {
        // ── Stage 2: Gemini Flash Schema Mapping ──
        try {
          const stage2Raw = await callGeminiFlash(LOVABLE_API_KEY, allOcrText, additionalContext);
          extracted = parseAiJson(stage2Raw);
          const stage2Count = countMeaningfulFields(extracted.form_data || {});
          console.log(`[stage2] Gemini Flash extracted ${stage2Count} meaningful fields`);

          // ── Stage 3: Claude Opus Specialist (if confidence is low) ──
          if (stage2Count < CONFIDENCE_THRESHOLD && ANTHROPIC_API_KEY) {
            console.log(`[stage3] Low confidence (${stage2Count} < ${CONFIDENCE_THRESHOLD}), invoking Claude Opus specialist`);
            try {
              const stage3Raw = await callClaudeOpus(
                ANTHROPIC_API_KEY,
                allOcrText,
                extracted.form_data || {},
                additionalContext,
              );
              const stage3Extracted = parseAiJson(stage3Raw);
              const stage3Count = countMeaningfulFields(stage3Extracted.form_data || {});
              console.log(`[stage3] Claude Opus extracted ${stage3Count} meaningful fields`);

              if (stage3Count > stage2Count) {
                extracted = stage3Extracted;
                pipelineUsed = "3-stage+opus";
                console.log(`[stage3] Using Opus results (${stage3Count}) over Flash (${stage2Count})`);
              }
            } catch (stage3Err) {
              console.warn("[stage3] Claude Opus failed, using Stage 2 results:", stage3Err);
            }
          }
        } catch (stage2Err) {
          console.error("[stage2] Gemini Flash failed:", stage2Err);
          // Fall back to legacy
          pipelineUsed = "legacy-stage2-fail";
          const legacyResult = await runLegacyPipeline(LOVABLE_API_KEY, ANTHROPIC_API_KEY, pdf_files, additionalContext, hasPdfs);
          extracted = legacyResult;
        }
      }
    }
    // ────────────────────────────────────────────────
    //  LEGACY PIPELINE (no Google Cloud key, or text-only)
    // ────────────────────────────────────────────────
    else {
      pipelineUsed = hasPdfs ? "legacy-no-ocr-key" : "text-only";
      console.log(`[pipeline] Using ${pipelineUsed} path`);

      if (!hasPdfs) {
        // Text-only: just use Gemini Flash directly
        const textPrompt = `Extract all insurance data from the following information.\n\n${additionalContext}`;
        const raw = await callGeminiFlash(LOVABLE_API_KEY, additionalContext, "");
        extracted = parseAiJson(raw);
      } else {
        const legacyResult = await runLegacyPipeline(LOVABLE_API_KEY, ANTHROPIC_API_KEY, pdf_files, additionalContext, hasPdfs);
        extracted = legacyResult;
      }
    }

    const totalTime = Date.now() - t0;
    console.log(`[pipeline] ${pipelineUsed} completed in ${totalTime}ms`);

    // ── Post-processing ──
    const fd: Record<string, any> = extracted.form_data || {};
    postProcess(fd, (description || "") + (file_contents || ""), hasPdfs);
    extracted.form_data = fd;

    // Debug log
    const fdKeys = Object.entries(fd).filter(([_, v]) => v && String(v).trim() && String(v).trim() !== "false" && String(v).trim() !== "No" && String(v).trim() !== "[]");
    console.log(`[result] ${fdKeys.length} non-empty fields. pipeline=${pipelineUsed}, time=${totalTime}ms. Key: applicant_name="${fd.applicant_name}", city="${fd.city}", state="${fd.state}"`);

    // Save to database
    if (submission_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: submission, error: subError } = await supabase
        .from("business_submissions")
        .select("user_id")
        .eq("id", submission_id)
        .single();

      if (subError) {
        console.error("[db] Failed to fetch submission:", subError);
      }

      if (submission) {
        const { data: insertData, error: insertError } = await supabase.from("insurance_applications").insert({
          submission_id,
          user_id: submission.user_id,
          form_data: extracted.form_data,
          gaps: extracted.gaps,
          status: "draft",
        }).select("id").single();

        if (insertError) {
          console.error("[db] Insert FAILED:", insertError);
        } else {
          console.log(`[db] Insert SUCCESS: id=${insertData?.id}, fields=${fdKeys.length}, pipeline=${pipelineUsed}`);
        }

        await supabase
          .from("business_submissions")
          .update({ status: "extracted" })
          .eq("id", submission_id);
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("extract error:", e);
    const errMsg = e?.message || "";
    let userError = "An error occurred processing your request";
    let statusCode = 500;

    if (errMsg.startsWith("VISION_KEY_INVALID")) {
      userError = "Google Cloud API key is invalid or the Vision API is not enabled. Please update your API key in settings.";
      statusCode = 400;
    } else if (errMsg.startsWith("VISION_QUOTA_EXCEEDED")) {
      userError = "Google Cloud Vision API quota exceeded. Please wait a few minutes or increase your quota.";
      statusCode = 429;
    } else if (errMsg.startsWith("VISION_ERROR")) {
      userError = errMsg.replace("VISION_ERROR: ", "");
      statusCode = 400;
    } else if (errMsg.includes("Rate limited")) {
      userError = "AI service is rate limited. Please try again in a moment.";
      statusCode = 429;
    } else if (errMsg.includes("AI credits exhausted")) {
      userError = "AI credits have been exhausted. Please check your plan.";
      statusCode = 402;
    }

    return new Response(
      JSON.stringify({ error: userError }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════════════
//  LEGACY PIPELINE HELPER
// ═══════════════════════════════════════════════════════════

async function runLegacyPipeline(
  lovableKey: string,
  anthropicKey: string | undefined,
  pdfFiles: any[],
  additionalContext: string,
  hasPdfs: boolean,
): Promise<any> {
  // Truncate with page budget
  const truncated: any[] = [];
  let totalPages = 0;

  for (const pf of pdfFiles) {
    if (!pf.base64) continue;
    if (totalPages >= MAX_TOTAL_PAGES) break;

    if (pf.mimeType === "application/pdf" || !pf.mimeType?.startsWith("image/")) {
      const remaining = MAX_TOTAL_PAGES - totalPages;
      const maxForFile = Math.min(MAX_PDF_PAGES, remaining);
      const trunc = await truncatePdf(pf.base64, maxForFile);

      let pages = maxForFile;
      try {
        const tmpBytes = Uint8Array.from(atob(pf.base64), c => c.charCodeAt(0));
        const tmpDoc = await PDFDocument.load(tmpBytes, { ignoreEncryption: true });
        pages = Math.min(tmpDoc.getPageCount(), maxForFile);
      } catch (_) {}

      totalPages += pages;
      truncated.push({ ...pf, base64: trunc });
    } else {
      truncated.push(pf);
    }
  }

  const userPrompt = `Extract all insurance data from the following document(s).\n\n${additionalContext}`;

  // Try Gemini Pro first (best for large multimodal)
  let rawContent: string;
  try {
    rawContent = await callGeminiWithPdfs(lovableKey, SCHEMA_PROMPT, userPrompt, truncated, "google/gemini-2.5-pro");
  } catch (e1) {
    console.warn("[legacy] Gemini Pro failed:", e1);
    try {
      rawContent = await callGeminiWithPdfs(lovableKey, SCHEMA_PROMPT, userPrompt, truncated, "google/gemini-2.5-flash");
    } catch (e2) {
      console.warn("[legacy] Gemini Flash also failed:", e2);
      throw e2;
    }
  }

  const extracted = parseAiJson(rawContent);
  const count = countMeaningfulFields(extracted.form_data || {});

  // If poor results and we have Claude, try enhancement
  if (count < CONFIDENCE_THRESHOLD && anthropicKey) {
    console.log(`[legacy] Only ${count} fields, trying Claude enhancement`);
    try {
      const claudeContent: any[] = [];
      for (const pf of truncated) {
        if (pf.base64) {
          const mt = pf.mimeType === "application/pdf" ? "application/pdf"
            : pf.mimeType?.startsWith("image/") ? pf.mimeType : "application/pdf";
          if (mt === "application/pdf") {
            claudeContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pf.base64 } });
          } else {
            claudeContent.push({ type: "image", source: { type: "base64", media_type: mt, data: pf.base64 } });
          }
        }
      }
      claudeContent.push({ type: "text", text: userPrompt });

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "pdfs-2024-09-25",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-20250514",
          max_tokens: 8192,
          system: SCHEMA_PROMPT,
          messages: [{ role: "user", content: claudeContent }],
        }),
      });

      if (resp.ok) {
        const result = await resp.json();
        const text = (result.content || [])
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text)
          .join("\n").trim();
        if (text) {
          const claudeExtracted = parseAiJson(text);
          const claudeCount = countMeaningfulFields(claudeExtracted.form_data || {});
          if (claudeCount > count) {
            console.log(`[legacy] Using Claude Opus (${claudeCount} fields) over Gemini (${count} fields)`);
            return claudeExtracted;
          }
        }
      } else {
        const errText = await resp.text();
        console.warn("[legacy] Claude Opus error:", resp.status, errText);
      }
    } catch (claudeErr) {
      console.warn("[legacy] Claude enhancement failed:", claudeErr);
    }
  }

  return extracted;
}
