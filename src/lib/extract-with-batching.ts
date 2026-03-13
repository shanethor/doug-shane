/**
 * Document Extraction Client — Prescan Pipeline
 * 
 * Routes PDF uploads through the ingest-document edge function which uses
 * local prescan + smart page slicing (10-25 pages max) for fast extraction.
 * Non-PDF files (text, images) fall back to extract-business-data.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractParams {
  description?: string;
  file_contents?: string;
  pdf_files?: { name: string; base64: string; mimeType: string }[];
  submission_id?: string;
  lead_id?: string;
  user_id?: string;
}

interface ExtractResult {
  form_data: Record<string, any>;
  gaps?: any[];
  [key: string]: any;
}

/**
 * Get auth headers for edge function calls
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  };
}

/**
 * Extract data from uploaded files using the prescan-first ingest pipeline.
 * 
 * PDFs → upload to storage → ingest-document (prescan + smart slice + single Gemini call)
 * Non-PDFs → extract-business-data (direct)
 */
export async function extractWithBatching(params: ExtractParams): Promise<ExtractResult> {
  const { description, file_contents, pdf_files, submission_id } = params;

  // If no PDFs, just send text content to extract-business-data
  if (!pdf_files || pdf_files.length === 0) {
    return legacyExtractCall(params);
  }

  // Separate PDFs from images
  const pdfs = pdf_files.filter(f => f.mimeType === "application/pdf");
  const images = pdf_files.filter(f => f.mimeType !== "application/pdf");

  // Images still go through extract-business-data (no storage upload needed)
  if (pdfs.length === 0 && images.length > 0) {
    return legacyExtractCall(params);
  }

  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  const userId = params.user_id || session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const toastId = toast.loading("Uploading documents…");

  try {
    // ── 1. Upload each PDF to storage and create client_document rows ──
    const documentIds: string[] = [];
    const storagePaths: string[] = [];

    for (const pdf of pdfs) {
      const fileName = pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${submission_id || "unsorted"}/${Date.now()}_${fileName}`;

      // Decode base64 to Uint8Array
      const binaryStr = atob(pdf.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });

      if (uploadErr) {
        console.warn(`[ingest] Storage upload failed for ${pdf.name}:`, uploadErr.message);
        // Fall back to legacy for this file
        continue;
      }

      // Create client_document row
      const insertData: Record<string, any> = {
        user_id: userId,
        file_name: pdf.name,
        file_url: storagePath,
        document_type: "application",
        file_size: bytes.length,
        extraction_status: "pending",
      };
      if (submission_id) insertData.submission_id = submission_id;
      if (params.lead_id) insertData.lead_id = params.lead_id;

      const { data: doc, error: docErr } = await supabase
        .from("client_documents")
        .insert(insertData)
        .select("id")
        .single();

      if (docErr || !doc) {
        console.warn(`[ingest] client_documents insert failed:`, docErr?.message);
        continue;
      }

      documentIds.push(doc.id);
      storagePaths.push(storagePath);
    }

    // If no PDFs were uploaded successfully, fall back to legacy
    if (documentIds.length === 0) {
      toast.dismiss(toastId);
      return legacyExtractCall(params);
    }

    // ── 2. Call ingest-document for each PDF (prescan pipeline) ──
    toast.loading("Prescanning pages…", { id: toastId, description: "Identifying data-rich pages" });

    const headers = await getAuthHeaders();

    for (let i = 0; i < documentIds.length; i++) {
      const label = pdfs[i]?.name || `Document ${i + 1}`;
      
      if (documentIds.length > 1) {
        toast.loading(`Processing ${label}…`, {
          id: toastId,
          description: `Document ${i + 1} of ${documentIds.length}`,
        });
      }

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-document`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              document_id: documentIds[i],
              submission_id: submission_id || "",
              storage_path: storagePaths[i],
            }),
            signal: AbortSignal.timeout(90_000),
          }
        );

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          console.warn(`[ingest] ingest-document failed for ${label}:`, errBody);
        } else {
          const result = await resp.json();
          const pagesMsg = result.scanEnd
            ? `Scanned ${result.scanEnd} of ${result.pages} pages`
            : `${result.pages} pages`;
          toast.loading(`Extracted from ${label}`, {
            id: toastId,
            description: `${pagesMsg} • ${result.docType || "document"}`,
          });
        }
      } catch (err: any) {
        console.warn(`[ingest] ingest-document call failed for ${label}:`, err.message);
      }
    }

    // ── 3. Also process any text content or images via legacy ──
    if (file_contents || images.length > 0) {
      try {
        await legacyExtractCall({
          description,
          file_contents,
          pdf_files: images.length > 0 ? images : undefined,
          submission_id,
        });
      } catch (e) {
        console.warn("[ingest] Legacy extract for text/images failed:", e);
      }
    }

    // ── 4. Read merged form_data from insurance_applications ──
    toast.loading("Finalizing extraction…", { id: toastId });

    const { data: appRow } = await supabase
      .from("insurance_applications")
      .select("form_data, gaps")
      .eq("submission_id", submission_id || "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const formData = (appRow?.form_data as Record<string, any>) || {};
    const gaps = (appRow?.gaps as any[]) || [];
    const fieldCount = Object.entries(formData).filter(
      ([_, v]) => v && String(v).trim() && String(v).trim() !== "false"
    ).length;

    toast.dismiss(toastId);
    toast.success(`Extraction complete`, {
      description: `Found ${fieldCount} fields from ${documentIds.length} document${documentIds.length !== 1 ? "s" : ""}`,
    });

    return { form_data: formData, gaps };

  } catch (err: any) {
    toast.dismiss(toastId);
    throw err;
  }
}

/**
 * Legacy call to extract-business-data (for text content, images, or fallback)
 */
async function legacyExtractCall(params: ExtractParams): Promise<ExtractResult> {
  const headers = await getAuthHeaders();
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-business-data`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        description: params.description,
        file_contents: params.file_contents || undefined,
        pdf_files: params.pdf_files && params.pdf_files.length > 0 ? params.pdf_files : undefined,
        submission_id: params.submission_id,
      }),
    }
  );

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error || `Extraction failed (${resp.status})`);
  }

  return resp.json();
}
