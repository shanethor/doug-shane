/**
 * Batched Extraction Client
 * 
 * Wraps calls to extract-business-data with automatic PDF batching
 * for large files (up to 200 pages). Shows toast notifications
 * when processing large documents.
 */
import { planExtractionBatches, mergeExtractionResults } from "./pdf-batch-extract";
import { toast } from "sonner";

interface ExtractParams {
  description?: string;
  file_contents?: string;
  pdf_files?: { name: string; base64: string; mimeType: string }[];
  submission_id?: string;
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
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  };
}

/**
 * Call extract-business-data with automatic batching for large PDFs.
 * 
 * - Small files (≤50 pages): single request, same as before
 * - Large files (51-200 pages): splits into batches, shows progress toasts, merges results
 * 
 * @throws Error if extraction fails
 */
export async function extractWithBatching(params: ExtractParams): Promise<ExtractResult> {
  const { description, file_contents, pdf_files, submission_id } = params;
  
  // If no PDFs, just send a single request
  if (!pdf_files || pdf_files.length === 0) {
    return singleExtractCall(params);
  }

  // Plan batches
  const { batches, totalPages, isLargeFile } = await planExtractionBatches(pdf_files);

  // Small file — single request as before
  if (!isLargeFile) {
    return singleExtractCall(params);
  }

  // Large file — batched extraction
  const toastId = toast.loading(
    `Processing large document (${totalPages} pages across ${batches.length} batches)…`,
    { description: "Smart page detection will identify the most data-rich pages.", duration: 180000 }
  );

  const results: ExtractResult[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    const batchStart = batches.slice(0, i).reduce((sum, b) => sum + b.pageCount, 0) + 1;
    const batchEnd = Math.min(batchStart + batch.pageCount - 1, totalPages);

    toast.loading(
      `Processing batch ${i + 1} of ${batches.length}…`,
      { id: toastId, description: `Pages ${batchStart}–${batchEnd} of ${totalPages}` }
    );

    try {
      const result = await singleExtractCall({
        description: `${description || ""}\n[Batch ${i + 1}/${batches.length}, pages ${batchStart}–${batchEnd}]`,
        file_contents: i === 0 ? file_contents : undefined, // only send text content with first batch
        pdf_files: batch.pdfFiles,
        submission_id: i === 0 ? submission_id : undefined, // only save first batch to DB directly
      });
      results.push(result);
    } catch (err: any) {
      console.warn(`[batch-extract] Batch ${i + 1} failed:`, err.message);
      // Continue with remaining batches — partial results are better than none
    }
  }

  toast.dismiss(toastId);

  if (results.length === 0) {
    throw new Error("All extraction batches failed");
  }

  // Merge all batch results
  const merged = mergeExtractionResults(results);

  // If we have a submission_id, update the application with merged results
  if (submission_id && results.length > 1) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Update the latest insurance_application with merged data
      const { data: apps } = await supabase
        .from("insurance_applications")
        .select("id")
        .eq("submission_id", submission_id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (apps && apps.length > 0) {
        await supabase
          .from("insurance_applications")
          .update({ form_data: merged.form_data, gaps: merged.gaps })
          .eq("id", apps[0].id);
      }
    } catch (dbErr) {
      console.warn("[batch-extract] Failed to update merged results in DB:", dbErr);
    }
  }

  toast.success(
    `Extracted from ${totalPages} pages (${batches.length} batches)`,
    { description: `Found ${Object.entries(merged.form_data).filter(([_, v]) => v && String(v).trim() && String(v).trim() !== "false").length} fields.` }
  );

  return merged as ExtractResult;
}

/**
 * Single call to extract-business-data (no batching)
 */
async function singleExtractCall(params: ExtractParams): Promise<ExtractResult> {
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
