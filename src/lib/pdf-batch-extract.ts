/**
 * PDF Batch Extraction Utility
 * 
 * Splits large PDFs into batches of pages, sends each batch to the
 * extract-business-data edge function, and merges results.
 * Supports up to 200 pages total across all files.
 */
import { PDFDocument } from "pdf-lib";

const BATCH_PAGE_LIMIT = 50; // pages per request batch
const MAX_TOTAL_PAGES = 200;

interface PdfFile {
  name: string;
  base64: string;
  mimeType: string;
}

interface BatchResult {
  form_data: Record<string, any>;
  gaps?: any[];
}

/**
 * Count pages in a base64-encoded PDF
 */
async function countPdfPages(base64: string): Promise<number> {
  try {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 1; // assume 1 page for non-PDF or unreadable
  }
}

/**
 * Extract a range of pages from a PDF and return as base64
 */
async function slicePdf(base64: string, startPage: number, endPage: number): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const actualEnd = Math.min(endPage, totalPages);
  
  if (startPage === 0 && actualEnd >= totalPages) return base64; // no slicing needed

  const newDoc = await PDFDocument.create();
  const indices = Array.from({ length: actualEnd - startPage }, (_, i) => startPage + i);
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  copiedPages.forEach(page => newDoc.addPage(page));
  
  const newBytes = await newDoc.save();
  let binary = '';
  const arr = new Uint8Array(newBytes);
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

export interface ExtractionBatch {
  pdfFiles: PdfFile[];
  pageCount: number;
  batchIndex: number;
  totalBatches: number;
}

/**
 * Plan how to batch PDFs for extraction.
 * Returns an array of batches, each containing PDF files/slices
 * that fit within the page budget.
 */
export async function planExtractionBatches(
  pdfFiles: PdfFile[],
): Promise<{ batches: ExtractionBatch[]; totalPages: number; isLargeFile: boolean }> {
  // First, count pages in all files
  const fileSizes: { file: PdfFile; pages: number }[] = [];
  let totalPages = 0;

  for (const file of pdfFiles) {
    if (file.mimeType === "application/pdf") {
      const pages = await countPdfPages(file.base64);
      fileSizes.push({ file, pages: Math.min(pages, MAX_TOTAL_PAGES) });
      totalPages += pages;
    } else {
      // Images count as 1 page
      fileSizes.push({ file, pages: 1 });
      totalPages += 1;
    }
  }

  const cappedTotal = Math.min(totalPages, MAX_TOTAL_PAGES);
  const isLargeFile = cappedTotal > BATCH_PAGE_LIMIT;

  // If everything fits in one batch, return as-is
  if (cappedTotal <= BATCH_PAGE_LIMIT) {
    return {
      batches: [{
        pdfFiles,
        pageCount: cappedTotal,
        batchIndex: 0,
        totalBatches: 1,
      }],
      totalPages: cappedTotal,
      isLargeFile: false,
    };
  }

  // Split into batches
  const batches: ExtractionBatch[] = [];
  let pagesUsed = 0;

  for (const { file, pages } of fileSizes) {
    if (pagesUsed >= MAX_TOTAL_PAGES) break;

    const remainingBudget = MAX_TOTAL_PAGES - pagesUsed;
    const pagesToProcess = Math.min(pages, remainingBudget);

    if (file.mimeType !== "application/pdf" || pagesToProcess <= BATCH_PAGE_LIMIT) {
      // Small file or image — find or create a batch with room
      let slicedBase64 = file.base64;
      if (file.mimeType === "application/pdf" && pagesToProcess < pages) {
        slicedBase64 = await slicePdf(file.base64, 0, pagesToProcess);
      }

      const slicedFile = { ...file, base64: slicedBase64 };

      // Try to add to last batch if there's room
      const lastBatch = batches[batches.length - 1];
      if (lastBatch && lastBatch.pageCount + pagesToProcess <= BATCH_PAGE_LIMIT) {
        lastBatch.pdfFiles.push(slicedFile);
        lastBatch.pageCount += pagesToProcess;
      } else {
        batches.push({
          pdfFiles: [slicedFile],
          pageCount: pagesToProcess,
          batchIndex: batches.length,
          totalBatches: 0, // will be set later
        });
      }
      pagesUsed += pagesToProcess;
    } else {
      // Large PDF — split into multiple batches
      let pageOffset = 0;
      while (pageOffset < pagesToProcess) {
        const chunkSize = Math.min(BATCH_PAGE_LIMIT, pagesToProcess - pageOffset);
        const slicedBase64 = await slicePdf(file.base64, pageOffset, pageOffset + chunkSize);
        
        batches.push({
          pdfFiles: [{ ...file, base64: slicedBase64, name: `${file.name} (pages ${pageOffset + 1}-${pageOffset + chunkSize})` }],
          pageCount: chunkSize,
          batchIndex: batches.length,
          totalBatches: 0,
        });
        pageOffset += chunkSize;
        pagesUsed += chunkSize;
      }
    }
  }

  // Set totalBatches on all entries
  for (const b of batches) {
    b.totalBatches = batches.length;
    b.batchIndex = batches.indexOf(b);
  }

  return { batches, totalPages: pagesUsed, isLargeFile };
}

/**
 * Merge multiple extraction results, preferring non-empty values from later batches
 * but keeping values from earlier batches if later ones are empty.
 */
export function mergeExtractionResults(results: BatchResult[]): BatchResult {
  if (results.length === 0) return { form_data: {}, gaps: [] };
  if (results.length === 1) return results[0];

  const merged: Record<string, any> = {};
  const allGaps: any[] = [];
  
  // Array fields that should be concatenated, not overwritten
  const ARRAY_FIELDS = new Set([
    "vehicles", "drivers", "policies", "underlying_insurance",
    "wc_classifications", "cgl_hazards", "locations", "mortgagees", "endorsements",
  ]);

  // Object fields that should be deep-merged
  const OBJECT_FIELDS = new Set(["cgl_limits"]);

  for (const result of results) {
    const fd = result.form_data || {};
    
    for (const [key, value] of Object.entries(fd)) {
      if (ARRAY_FIELDS.has(key)) {
        // Concatenate arrays
        const existing = Array.isArray(merged[key]) ? merged[key] : [];
        const incoming = Array.isArray(value) ? value : [];
        merged[key] = [...existing, ...incoming];
      } else if (OBJECT_FIELDS.has(key) || (typeof value === "object" && value !== null && !Array.isArray(value))) {
        // Merge objects (like cgl_limits) — new non-empty values fill gaps
        const existing = merged[key] || {};
        const incoming = value || {};
        const mergedObj = { ...existing };
        for (const [ok, ov] of Object.entries(incoming as Record<string, any>)) {
          const existingVal = mergedObj[ok];
          const isExistingEmpty = !existingVal || (typeof existingVal === "string" && !existingVal.trim());
          if (isExistingEmpty && ov) mergedObj[ok] = ov;
        }
        merged[key] = mergedObj;
      } else {
        // Scalars: keep first non-empty value, but allow later batches to fill gaps
        const existing = merged[key];
        const isExistingEmpty = !existing || (typeof existing === "string" && (!existing.trim() || existing.trim() === "false"));
        const isNewNonEmpty = value && (typeof value !== "string" || (value.trim() && value.trim() !== "false"));
        
        if (isExistingEmpty && isNewNonEmpty) {
          merged[key] = value;
        }
      }
    }

    if (result.gaps) {
      allGaps.push(...result.gaps);
    }
  }

  // Deduplicate gaps by field name
  const seenGapFields = new Set<string>();
  const uniqueGaps = allGaps.filter(g => {
    if (seenGapFields.has(g.field)) return false;
    seenGapFields.add(g.field);
    // Remove gaps that were filled in merged data
    const val = merged[g.field];
    if (val && typeof val === "string" && val.trim() && val.trim() !== "false") return false;
    return true;
  });

  return { form_data: merged, gaps: uniqueGaps };
}
