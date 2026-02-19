import { useEffect, useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Loader2, AlertCircle } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";
import { formatUSD, CURRENCY_FIELDS } from "@/lib/acord-autofill";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  /** Called when a field is edited directly inside the PDF viewer */
  onFieldChange?: (key: string, value: string) => void;
}

function formatValueForPdf(key: string, val: any): string {
  if (val === null || val === undefined || val === "" || val === "N/A") return "";
  const s = String(val);
  if (s === "false") return "";
  if (CURRENCY_FIELDS.has(key)) return formatUSD(s);
  // Format ISO dates as MM/DD/YYYY
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  return s;
}

/**
 * Fills a fetchable ACORD fillable PDF with our data via pdf-lib,
 * using fuzzy field-name matching against the PDF's actual AcroForm fields.
 * Returns a Blob URL pointing to the filled PDF bytes.
 */
async function buildFilledPdfUrl(
  pdfPath: string,
  formData: Record<string, any>
): Promise<string> {
  const response = await fetch(pdfPath);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfPath}`);
  const arrayBuffer = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  let form: ReturnType<typeof pdfDoc.getForm>;
  try {
    form = pdfDoc.getForm();
  } catch {
    // PDF has no AcroForm — fall back to raw bytes
  const bytes = await pdfDoc.save();
    return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
  }

  const fields = form.getFields();

  // Build a lookup: normalised field name -> field object
  const fieldLookup = new Map<string, typeof fields[0]>();
  for (const field of fields) {
    const name = field.getName();
    fieldLookup.set(name.toLowerCase().replace(/[\s_./-]+/g, ""), field);
    fieldLookup.set(name, field); // also keep exact
  }

  // Helper: find a PDF field by fuzzy matching our key
  const findField = (key: string) => {
    const keyNorm = key.toLowerCase().replace(/[\s_.-]+/g, "");
    // exact normalised match
    if (fieldLookup.has(keyNorm)) return fieldLookup.get(keyNorm)!;
    // substring match: field name contains key fragments
    for (const [norm, field] of fieldLookup) {
      if (norm.includes(keyNorm) || keyNorm.includes(norm)) return field;
    }
    return null;
  };

  // Fill each key we have data for
  for (const [key, rawVal] of Object.entries(formData)) {
    if (!rawVal && rawVal !== false) continue;
    const val = formatValueForPdf(key, rawVal);

    const pdfField = findField(key);
    if (!pdfField) continue;

    try {
      const type = pdfField.constructor.name;
      if (type === "PDFTextField") {
        (pdfField as any).setText(val || "");
      } else if (type === "PDFCheckBox") {
        if (rawVal === true || rawVal === "Yes" || rawVal === "true") {
          (pdfField as any).check();
        } else {
          (pdfField as any).uncheck();
        }
      } else if (type === "PDFDropdown" || type === "PDFOptionList") {
        if (val) {
          try { (pdfField as any).select(val); } catch { /* ignore invalid options */ }
        }
      } else if (type === "PDFRadioGroup") {
        if (val) {
          try { (pdfField as any).select(val); } catch { /* ignore */ }
        }
      }
    } catch {
      // swallow individual field errors
    }
  }

  // Flatten to prevent further in-viewer editing conflicts, but keep interactive
  // (do NOT flatten so user can still type in the iframe)

  const pdfBytes = await pdfDoc.save();
  return URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }));
}

export default function FillablePdfViewer({ formId, formData, onFieldChange }: FillablePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);
  const buildTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  const buildPdf = useCallback(async () => {
    if (!pdfPath) {
      setError(`No fillable PDF available for form: ${formId}`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const url = await buildFilledPdfUrl(pdfPath, formData);

      // Revoke previous blob to avoid memory leaks
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
      prevBlobUrl.current = url;
      setBlobUrl(url);
    } catch (err: any) {
      console.error("FillablePdfViewer error:", err);
      setError(err?.message || "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }, [pdfPath, formData]);

  // Debounce re-builds when formData changes (300ms)
  useEffect(() => {
    if (buildTimeoutRef.current) clearTimeout(buildTimeoutRef.current);
    buildTimeoutRef.current = setTimeout(buildPdf, 300);
    return () => {
      if (buildTimeoutRef.current) clearTimeout(buildTimeoutRef.current);
    };
  }, [buildPdf]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, []);

  if (!pdfPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <AlertCircle className="h-8 w-8 text-yellow-500" />
        <p className="text-sm font-medium">No fillable PDF for this form yet</p>
        <p className="text-xs">Upload a fillable PDF for {formId} to enable interactive editing.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Preparing fillable PDF…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">PDF load error</p>
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <iframe
      key={blobUrl}
      src={blobUrl + "#toolbar=1&navpanes=0&scrollbar=1&zoom=page-width"}
      className="w-full h-full border-0 rounded-b-lg"
      title={`Fillable ACORD Form ${formId}`}
      style={{ minHeight: "600px" }}
    />
  );
}
