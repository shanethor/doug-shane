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
 * PDFs → ingest-document (prescan + smart slice + single Gemini call)
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

  // Images still go through extract-business-data (no prescan needed)
  if (pdfs.length === 0 && images.length > 0) {
    return legacyExtractCall(params);
  }

  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  const userId = params.user_id || session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const toastId = toast.loading("Prescanning document…", {
    description: "Identifying data-rich pages",
  });

  try {
    const headers = await getAuthHeaders();

    // ── Process each PDF through ingest-document ──
    for (let i = 0; i < pdfs.length; i++) {
      const pdf = pdfs[i];
      const label = pdf.name || `Document ${i + 1}`;

      if (pdfs.length > 1) {
        toast.loading(`Processing ${label}…`, {
          id: toastId,
          description: `Document ${i + 1} of ${pdfs.length}`,
        });
      }

      // Create client_document row for tracking
      const insertData: Record<string, any> = {
        user_id: userId,
        file_name: pdf.name,
        file_url: `inline://${pdf.name}`,
        document_type: "application",
        extraction_status: "pending",
      };
      if (submission_id) insertData.submission_id = submission_id;
      if (params.lead_id) insertData.lead_id = params.lead_id;

      const { data: doc } = await supabase
        .from("client_documents")
        .insert(insertData as any)
        .select("id")
        .single();

      const documentId = doc?.id;

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-document`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              document_id: documentId,
              submission_id: submission_id || "",
              pdf_base64: pdf.base64,
              file_name: pdf.name,
            }),
            signal: AbortSignal.timeout(90_000),
          }
        );

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          console.warn(`[ingest] ingest-document failed for ${label}:`, errBody);
          // Fall back to legacy for this file
          try {
            await legacyExtractCall({
              description,
              pdf_files: [pdf],
              submission_id,
            });
          } catch (e) {
            console.warn(`[ingest] Legacy fallback also failed for ${label}:`, e);
          }
        } else {
          const result = await resp.json();
          const scanMsg = result.scanEnd && result.pages
            ? `Scanned ${result.scanEnd} of ${result.pages} pages`
            : "";
          toast.loading(`Extracted from ${label}`, {
            id: toastId,
            description: `${scanMsg}${result.docType ? ` • ${result.docType}` : ""}`.trim(),
          });
        }
      } catch (err: any) {
        console.warn(`[ingest] ingest-document call failed for ${label}:`, err.message);
      }
    }

    // ── Also process any text content or images via legacy ──
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

    // ── Read merged form_data from insurance_applications ──
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
    toast.success("Extraction complete", {
      description: `Found ${fieldCount} fields from ${pdfs.length} document${pdfs.length !== 1 ? "s" : ""}`,
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
