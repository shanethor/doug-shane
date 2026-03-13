import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

import {
  detectDocType,
  buildGeminiPrompt,
  extractPageRange,
  mapBopExtractionToFormData,
  GEMINI_SYSTEM_PROMPT,
  AcordDocType,
} from "../_shared/acord-extraction-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prescan config ──────────────────────────────────────────────────────────
const PRESCAN_DEFAULT_PAGES = 10;
const PRESCAN_MAX_PAGES     = 25;
const PRESCAN_MIN_TEXT_LEN  = 60;

const BOILERPLATE_RE = new RegExp(
  "Copyright.*ISO Properties|ISO Properties.*Inc|" +
  "Page \\d+ of \\d+.*ISO|" +
  "PrivacyNotice|Privacy Notice To Our Customers|" +
  "Various provisions in this policy restrict coverage|" +
  "BUSINESSOWNERS COVERAGE FORM|" +
  "COMMERCIAL GENERAL LIABILITY COVERAGE FORM|" +
  "THIS ENDORSEMENT CHANGES THE POLICY|" +
  "THIS ENDORSEMENT IS ATTACHED|" +
  "Terrorism Risk Insurance Act",
  "i"
);

const DEC_DATA_RE = new RegExp(
  "named insured|insured copy|declarations page|policy period|" +
  "total annual premium|annual premium for policy|" +
  "each occurrence|per occurrence|" +
  "replacement cost|deductible.*\\$|" +
  "mortgagee|loss payable|" +
  "BILL TO|Access Code|Four Pay|Monthly Pay|Annual Pay",
  "i"
);

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

    // ── 1. Mark as processing (if document_id provided) ────────────────────
    if (document_id) {
      await supabase
        .from("client_documents")
        .update({ extraction_status: "processing" })
        .eq("id", document_id);
    }

    // ── 2. Get PDF bytes — from base64 payload or storage ──────────────────
    let pdfBytes: Uint8Array;

    if (pdf_base64) {
      // Direct base64 upload (preferred — no storage needed)
      const binaryStr = atob(pdf_base64);
      pdfBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) pdfBytes[i] = binaryStr.charCodeAt(i);
    } else if (storage_path) {
      // Legacy: download from storage
      const { data: pdfData, error: dlError } = await supabase.storage
        .from("documents")
        .download(storage_path);
      if (dlError || !pdfData) throw new Error("Failed to download PDF: " + dlError?.message);
      pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    } else {
      throw new Error("Either pdf_base64 or storage_path is required");
    }

    // ── 3. Load + count pages ──────────────────────────────────────────────
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    console.log(`[ingest] totalPages=${totalPages} doc=${document_id}`);

    // ── 4. Determine scan range ──────────────────────────────────────────
    // For large docs, skip expensive per-page prescan — just send first N pages.
    // The per-page prescan was iterating all pages with pdf-lib which burns CPU
    // and times out on 100+ page documents.
    const FAST_SCAN_PAGES = 10;
    const RETRY_SCAN_PAGES = 25;
    let scanEnd = Math.min(FAST_SCAN_PAGES, totalPages);

    // ── 5. Detect doc type from filename hint ─────────────────────────────
    const pathHint = (storage_path || file_name || "").toUpperCase();
    let docType: AcordDocType = "UNKNOWN";

    if (/\bBO\d{5,}|CPKG|BUSINESSOWNER|BOP\b/.test(pathHint)) docType = "BOP";
    else if (/\bWC\b|WORKERS.COMP|ACORD.?130/.test(pathHint)) docType = "ACORD_130";
    else if (/AUTO|ACORD.?127|VEHICLE/.test(pathHint)) docType = "ACORD_127";
    else if (/UMBRELLA|EXCESS/.test(pathHint)) docType = "UMBRELLA";

    // If still unknown, try reading first page text (quick single-page extract)
    if (docType === "UNKNOWN") {
      try {
        const firstSlice = await extractPageRange(pdfBytes, 1, 1);
        const firstText = new TextDecoder().decode(firstSlice)
          .replace(/[^\x20-\x7E]/g, " ").substring(0, 3000);
        docType = detectDocType(firstText);
      } catch { /* ignore, will use default prompt */ }
    }

    console.log(`[ingest] docType=${docType} scanEnd=${scanEnd}/${totalPages}`);

    // ── 6. Slice PDF to scan range ────────────────────────────────────────
    const pdfToSend = scanEnd < totalPages
      ? await extractPageRange(pdfBytes, 1, scanEnd)
      : pdfBytes;

    const pdfBase64 = uint8ToBase64(pdfToSend);
    console.log(`[ingest] Sending pages 1-${scanEnd}/${totalPages} to Gemini`);

    // ── 7. Single Gemini call ──────────────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = buildGeminiPrompt(docType);
    const rawText = await callGemini(pdfBase64, prompt, LOVABLE_API_KEY);
    console.log(`[ingest] Gemini response length: ${rawText.length} chars`);

    // ── 8. Parse response ──────────────────────────────────────────────────
    let extracted: Record<string, any> = {};
    let confidence = 0;
    let retryUsed = false;

    try {
      extracted = parseJson(rawText);
      confidence = typeof extracted.confidence === "number" ? extracted.confidence : 0.8;
    } catch (parseErr) {
      console.error("[ingest] JSON parse failed:", parseErr, "Raw (first 500):", rawText.substring(0, 500));
      confidence = 0;
    }

    // Count non-empty fields to decide if retry is needed
    const countFields = (obj: Record<string, any>, prefix = ""): number => {
      let count = 0;
      for (const [k, v] of Object.entries(obj)) {
        if (k === "confidence") continue;
        if (v !== null && v !== undefined && v !== "" && v !== false) {
          if (typeof v === "object" && !Array.isArray(v)) {
            count += countFields(v, `${prefix}${k}.`);
          } else if (Array.isArray(v) && v.length > 0) {
            count += v.length;
          } else {
            count++;
          }
        }
      }
      return count;
    };

    const fieldCount = countFields(extracted);
    console.log(`[ingest] First pass: ${fieldCount} fields, confidence=${confidence}`);

    // ── 9. One retry if too few fields — widen to 25 pages ────────────────
    if (fieldCount < 10 && totalPages > scanEnd) {
      retryUsed = true;
      const retryEnd = Math.min(RETRY_SCAN_PAGES, totalPages);
      console.log(`[ingest] Low fields (${fieldCount}), retrying with pages 1-${retryEnd}...`);
      try {
        const widerSlice = await extractPageRange(pdfBytes, 1, retryEnd);
        const widerBase64 = uint8ToBase64(widerSlice);
        const retryRaw = await callGemini(widerBase64, prompt, LOVABLE_API_KEY);
        const retryData = parseJson(retryRaw);
        const retryFields = countFields(retryData);
        console.log(`[ingest] Retry: ${retryFields} fields`);
        if (retryFields > fieldCount) {
          extracted = retryData;
          confidence = typeof retryData.confidence === "number" ? retryData.confidence : 0.8;
        }
      } catch (e) {
        console.error("[ingest] Retry failed:", e);
      }
    }

    // ── 10. Map to form fields ─────────────────────────────────────────────
    const formdata: Record<string, any> = docType === "BOP"
      ? mapBopExtractionToFormData(extracted)
      : flattenExtraction(extracted);

    // ── 11. Inject agency profile ──────────────────────────────────────────
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

    // ── 12. Upsert insurance_applications ─────────────────────────────────
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

    // ── 13. Update document record ─────────────────────────────────────────
    if (document_id) {
      await supabase.from("client_documents").update({
        extraction_status: confidence > 0.4 ? "complete" : "partial",
        extraction_confidence: confidence,
        doc_type: docType,
        total_pages: totalPages,
        extraction_metadata: {
          model: "google/gemini-2.5-flash",
          pages_sent: scanEnd,
          total_pages: totalPages,
          last_dec_page: lastDecPage,
          extended_scan: isExtended,
          retry_used: retryUsed,
          prescan_doc_type_hint: docTypeHint,
        },
      }).eq("id", document_id);
    }

    return new Response(
      JSON.stringify({ success: true, docType, confidence, pages: totalPages, scanEnd }),
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

// ── PRESCAN ────────────────────────────────────────────────────────────────

interface PrescanResult {
  lastDecPage: number;
  scanEnd: number;
  isExtended: boolean;
  firstPageText: string;
  docTypeHint: AcordDocType;
  pageMap: Array<{ page: number; type: "DEC" | "BOILERPLATE" | "BLANK" | "OTHER"; textLen: number }>;
}

async function prescanPages(
  pdfBytes: Uint8Array,
  totalPages: number
): Promise<PrescanResult> {
  const pageMap: PrescanResult["pageMap"] = [];
  let lastDecPage = 0;
  let firstPageText = "";
  let docTypeHint: AcordDocType = "UNKNOWN";

  for (let i = 0; i < totalPages; i++) {
    const pageSlice = await extractPageRange(pdfBytes, i + 1, i + 1);
    const text = extractTextFromBytes(pageSlice);
    const L = text.length;

    if (i === 0) firstPageText = text;

    let type: "DEC" | "BOILERPLATE" | "BLANK" | "OTHER";

    if (L < PRESCAN_MIN_TEXT_LEN) {
      type = "BLANK";
    } else if (BOILERPLATE_RE.test(text)) {
      type = L > 2500 ? "BOILERPLATE" : "OTHER";
    } else if (DEC_DATA_RE.test(text) && L < 3500) {
      type = "DEC";
      lastDecPage = i + 1;

      if (docTypeHint === "UNKNOWN") {
        const tu = text.toUpperCase();
        if (tu.includes("BUSINESSOWNERS") || tu.includes("BOP") || /\bBO\s+\d{5}/.test(tu)) {
          docTypeHint = "BOP";
        } else if (tu.includes("GENERAL LIABILITY") || tu.includes("CGL")) {
          docTypeHint = "GL";
        } else if (tu.includes("WORKERS COMP")) {
          docTypeHint = "ACORD_130";
        } else if (tu.includes("COMMERCIAL AUTO") || tu.includes("BUSINESS AUTO")) {
          docTypeHint = "ACORD_127";
        } else if (tu.includes("UMBRELLA") || tu.includes("EXCESS LIABILITY")) {
          docTypeHint = "UMBRELLA";
        } else if (tu.includes("HOMEOWNERS") || tu.includes("DWELLING")) {
          docTypeHint = "DEC_PAGE";
        }
      }
    } else {
      type = "OTHER";
    }

    pageMap.push({ page: i + 1, type, textLen: L });

    // Early exit after 5 consecutive boilerplate/blank pages past last DEC
    if (lastDecPage > 0 && i >= lastDecPage + 4) {
      const recentPages = pageMap.slice(-5);
      const allBoilerplate = recentPages.every(p => p.type === "BOILERPLATE" || p.type === "BLANK");
      if (allBoilerplate) {
        console.log(`[prescan] Early exit at page ${i + 1} — 5 consecutive boilerplate after DEC page ${lastDecPage}`);
        break;
      }
    }
  }

  const isExtended = lastDecPage > PRESCAN_DEFAULT_PAGES;
  let scanEnd: number;

  if (lastDecPage === 0) {
    scanEnd = Math.min(PRESCAN_DEFAULT_PAGES, totalPages);
  } else if (isExtended) {
    scanEnd = Math.min(lastDecPage + 1, PRESCAN_MAX_PAGES, totalPages);
  } else {
    scanEnd = Math.min(PRESCAN_DEFAULT_PAGES, totalPages);
  }

  return { lastDecPage, scanEnd, isExtended, firstPageText, docTypeHint, pageMap };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractTextFromBytes(pdfBytes: Uint8Array): string {
  try {
    const text = new TextDecoder().decode(pdfBytes);
    const matches = text.match(/BT[\s\S]*?ET/g) ?? [];
    const extracted = matches.join(" ").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").substring(0, 3000);
    return extracted.length > 50 ? extracted : text.replace(/[^\x20-\x7E]/g, " ").substring(0, 3000);
  } catch {
    return "";
  }
}

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
        { role: "system", content: GEMINI_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const t = await response.text();
    if (response.status === 429) throw new Error("Rate limited");
    if (response.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI extraction failed (${response.status}): ${t.substring(0, 200)}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "{}";
}

function parseJson(text: string): Record<string, any> {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
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

function flattenExtraction(obj: Record<string, any>, prefix = "", result: Record<string, any> = {}): Record<string, any> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}_${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) flattenExtraction(v, key, result);
    else result[key] = v;
  }
  return result;
}