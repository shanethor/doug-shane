import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

import {
  detectDocType,
  buildGeminiPrompt,
  extractPageRange,
  mapBopExtractionToFormData,
  GEMINI_SYSTEM_PROMPT,
  LARGE_PDF_CONFIG,
  AcordDocType,
} from "../_shared/acord-extraction-helpers.ts";

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
    const { document_id, submission_id, storage_path } = await req.json();
    documentId = document_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Mark as processing ──────────────────────────────────────────────
    await supabase
      .from("client_documents")
      .update({ extraction_status: "processing" })
      .eq("id", document_id);

    // ── 2. Download the PDF ────────────────────────────────────────────────
    const { data: pdfData, error: dlError } = await supabase.storage
      .from("documents")
      .download(storage_path);

    if (dlError || !pdfData) throw new Error("Failed to download PDF: " + dlError?.message);

    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());

    // ── 3. Count pages ─────────────────────────────────────────────────────
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    console.log(`[ingest] totalPages=${totalPages} document_id=${document_id}`);

    // ── 4. Extract first-page text for doc type detection ──────────────────
    const firstPageSlice = await extractPageRange(pdfBytes, 1, 1);
    const firstPageText = await extractTextFromPdfBytes(firstPageSlice);
    const docType: AcordDocType = detectDocType(firstPageText);
    console.log(`[ingest] docType=${docType}`);

    // ── 5. Chunked extraction for large files ──────────────────────────────
    const CHUNK_SIZE = 15; // pages per chunk
    const MAX_CHUNKS = 10; // safety limit (150 pages max)

    const isLarge = totalPages > 20;
    const chunksToProcess = Math.min(
      Math.ceil(totalPages / CHUNK_SIZE),
      MAX_CHUNKS
    );

    console.log(`[ingest] Processing ${chunksToProcess} chunks (${totalPages} pages, chunk_size=${CHUNK_SIZE})`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = buildGeminiPrompt(docType);

    const chunkExtractions: Array<{ data: Record<string, any>; confidence: number; pages: string }> = [];

    // ── 6. Process each chunk ──────────────────────────────────────────────
    for (let i = 0; i < chunksToProcess; i++) {
      const startPage = i * CHUNK_SIZE + 1;
      const endPage = Math.min(startPage + CHUNK_SIZE - 1, totalPages);

      console.log(`[ingest] Chunk ${i + 1}/${chunksToProcess}: pages ${startPage}-${endPage}`);

      try {
        const chunkBytes = await extractPageRange(pdfBytes, startPage, endPage);
        const chunkBase64 = btoa(String.fromCharCode(...chunkBytes));

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: GEMINI_SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: { url: `data:application/pdf;base64,${chunkBase64}` },
                  },
                ],
              },
            ],
          }),
          signal: AbortSignal.timeout(45_000),
        });

        if (!response.ok) {
          console.warn(`[ingest] Chunk ${i + 1} failed: ${response.status}`);
          continue; // Skip failed chunks, process what we can
        }

        const aiResult = await response.json();
        const rawText = aiResult.choices?.[0]?.message?.content || "{}";

        const cleaned = rawText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();

        const chunkData = JSON.parse(cleaned);
        const chunkConfidence = typeof chunkData.confidence === "number" ? chunkData.confidence : 0.7;

        chunkExtractions.push({
          data: chunkData,
          confidence: chunkConfidence,
          pages: `${startPage}-${endPage}`,
        });

        console.log(`[ingest] Chunk ${i + 1} extracted ${Object.keys(chunkData).length} keys, confidence=${chunkConfidence}`);

      } catch (chunkErr) {
        console.error(`[ingest] Chunk ${i + 1} error:`, chunkErr);
        // Continue processing other chunks
      }
    }

    // ── 7. Merge all chunk extractions ─────────────────────────────────────
    let extracted: Record<string, any> = {};
    let confidence = 0;

    if (chunkExtractions.length === 0) {
      console.error("[ingest] No chunks successfully extracted");
      extracted = {};
      confidence = 0;
    } else {
      confidence = chunkExtractions.reduce((sum, c) => sum + c.confidence, 0) / chunkExtractions.length;

      for (const chunk of chunkExtractions) {
        extracted = mergeChunkData(extracted, chunk.data);
      }

      const fieldCount = Object.keys(extracted).filter(k =>
        extracted[k] !== undefined &&
        extracted[k] !== null &&
        extracted[k] !== ""
      ).length;

      console.log(`[ingest] Merged extraction: ${fieldCount} non-empty fields, avg confidence=${confidence.toFixed(2)}`);
    }

    // ── 10. Map to formdata keys ───────────────────────────────────────────
    let formdata: Record<string, any> = {};
    if (docType === "BOP") {
      formdata = mapBopExtractionToFormData(extracted);
    } else {
      formdata = flattenExtraction(extracted);
    }

    // ── 10b. Inject user's agency profile (agencies table is source of truth) ──
    {
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
          // Resolve canonical agency name from agencies table
          let agencyName = "";
          if ((profile as any).agency_id) {
            const { data: agencyData } = await supabase
              .from("agencies")
              .select("name")
              .eq("id", (profile as any).agency_id)
              .maybeSingle();
            if (agencyData?.name) agencyName = agencyData.name;
          }
          if (!agencyName && profile.agency_name) agencyName = profile.agency_name;

          // Always override agency/producer fields with user's profile
          if (agencyName) formdata.agency_name = agencyName;
          if (profile.full_name) formdata.producer_name = profile.full_name;
          if (profile.phone) formdata.agency_phone = profile.phone;

          // Merge form_defaults (agency_email, agency_fax, license_no, etc.)
          const fd = (profile.form_defaults || {}) as Record<string, any>;
          for (const [k, v] of Object.entries(fd)) {
            if (k === "agency_name" || k === "_training_mode") continue;
            if (v && typeof v === "string" && v.trim() && !formdata[k]) {
              formdata[k] = v;
            }
          }
          console.log(`[ingest] Injected agency defaults: agency_name="${agencyName}", producer="${profile.full_name}"`);
        }
      }
    }

    // ── 11. Upsert into insurance_applications ─────────────────────────────
    const { data: appRow } = await supabase
      .from("insurance_applications")
      .select("id, form_data")
      .eq("submission_id", submission_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingFormData = (appRow?.form_data as Record<string, any>) ?? {};
    const mergedFormData = mergeExtractedIntoFormData(existingFormData, formdata);

    if (appRow) {
      await supabase
        .from("insurance_applications")
        .update({ form_data: mergedFormData })
        .eq("id", appRow.id);
    } else {
      // Need user_id from submission
      const { data: sub } = await supabase
        .from("business_submissions")
        .select("user_id")
        .eq("id", submission_id)
        .single();

      if (sub) {
        await supabase
          .from("insurance_applications")
          .insert({
            submission_id,
            user_id: sub.user_id,
            form_data: mergedFormData,
            status: "draft",
          });
      }
    }

    // ── 12. Update document record ────────────────────────────────────────
    await supabase
      .from("client_documents")
      .update({
        extraction_status: confidence > 0.4 ? "complete" : "partial",
        extraction_confidence: confidence,
        doc_type: docType,
        total_pages: totalPages,
        extraction_metadata: {
          model: "google/gemini-2.5-flash",
          pages_sent: pagesToSend,
          total_pages: totalPages,
          large_file: isLarge,
          retry_used: retryUsed,
        },
      })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, docType, confidence, pages: totalPages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[ingest-document] Fatal error:", err);

    // Mark document as failed so it doesn't stay stuck in "processing"
    try {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      if (documentId) {
        await serviceClient
          .from("client_documents")
          .update({ extraction_status: "failed" })
          .eq("id", documentId);
      }
    } catch (updateErr) {
      console.error("[ingest-document] Could not update failure status:", updateErr);
    }

    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function extractTextFromPdfBytes(pdfBytes: Uint8Array): Promise<string> {
  // Simple text extraction: decode PDF content streams for docType sniffing
  // This is a lightweight approach that avoids pdf-parse dependency issues in Deno
  try {
    const text = new TextDecoder().decode(pdfBytes);
    // Extract readable text between BT/ET blocks (PDF text operators)
    const matches = text.match(/BT[\s\S]*?ET/g) ?? [];
    const extracted = matches
      .join(" ")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .substring(0, 2000);
    return extracted.length > 50 ? extracted : text.replace(/[^\x20-\x7E]/g, " ").substring(0, 2000);
  } catch {
    return "";
  }
}

function mergeExtractedIntoFormData(
  existing: Record<string, any>,
  extracted: Record<string, any>
): Record<string, any> {
  const next = { ...existing };
  for (const [k, v] of Object.entries(extracted)) {
    if (v === undefined || v === null) continue;
    const curr = next[k];
    const isEmpty =
      curr === undefined ||
      curr === null ||
      (typeof curr === "string" && !curr.trim()) ||
      String(curr).toLowerCase() === "na";
    if (isEmpty) next[k] = v;
  }
  return next;
}

function flattenExtraction(
  obj: Record<string, any>,
  prefix = "",
  result: Record<string, any> = {}
): Record<string, any> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}_${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flattenExtraction(v, key, result);
    } else {
      result[key] = v;
    }
  }
  return result;
}