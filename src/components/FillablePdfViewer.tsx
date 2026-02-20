import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FILLABLE_PDF_PATHS, ACORD_FIELD_MAPS } from "@/lib/acord-field-map";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from "pdf-lib";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  onFieldChange?: (key: string, value: string) => void;
}

function formatDateForPdf(val: string): string {
  if (!val) return "";
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  return val;
}

function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val);
  if (s === "false") return "";
  if (key.includes("date") || key.includes("eff_") || key.includes("exp_")) return formatDateForPdf(s);
  return s;
}

async function buildFilledPdfBlobUrl(
  pdfPath: string,
  formId: string,
  formData: Record<string, any>
): Promise<string> {
  const response = await fetch(pdfPath);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfPath}`);
  const arrayBuffer = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const fieldMap = ACORD_FIELD_MAPS[formId] || {};

  let form: ReturnType<typeof pdfDoc.getForm> | null = null;
  try {
    form = pdfDoc.getForm();
  } catch {
    // No AcroForm — serve raw PDF
  }

  if (form) {
    const pdfFields = form.getFields();
    // Build a lookup map: exact name → field, plus lowercased for fallback
    const nameToField = new Map<string, typeof pdfFields[0]>();
    const lowerToField = new Map<string, typeof pdfFields[0]>();
    for (const f of pdfFields) {
      nameToField.set(f.getName(), f);
      lowerToField.set(f.getName().toLowerCase(), f);
    }

    for (const [ourKey, pdfFieldName] of Object.entries(fieldMap)) {
      const rawVal = formData[ourKey];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      const display = formatFieldValue(ourKey, rawVal);
      if (!display) continue;

      // 1. Exact match
      let field = nameToField.get(pdfFieldName);

      // 2. Case-insensitive exact match
      if (!field) {
        field = lowerToField.get(pdfFieldName.toLowerCase());
      }

      // 3. Substring fallback
      if (!field) {
        const lower = pdfFieldName.toLowerCase();
        for (const [name, f] of lowerToField) {
          if (name.includes(lower) || lower.includes(name)) {
            field = f;
            break;
          }
        }
      }

      if (!field) continue;

      try {
        // Use instanceof (safe across bundlers, unlike .constructor.name)
        if (field instanceof PDFTextField) {
          field.setText(display);
        } else if (field instanceof PDFCheckBox) {
          const isChecked = rawVal === true || rawVal === "true" || rawVal === "Yes" || rawVal === "✓";
          if (isChecked) field.check(); else field.uncheck();
        } else if (field instanceof PDFDropdown) {
          try { field.select(display); } catch { /* option not in list */ }
        } else if (field instanceof PDFRadioGroup) {
          try { field.select(display); } catch { /* option unavailable */ }
        }
      } catch {
        // Silently skip unwritable fields
      }
    }

    try {
      form.updateFieldAppearances();
    } catch {
      // Some PDFs block appearance updates — values still saved
    }
  }

  const filledBytes = await pdfDoc.save({ useObjectStreams: false });
  return URL.createObjectURL(
    new Blob([filledBytes.buffer as ArrayBuffer], { type: "application/pdf" })
  );
}

export default function FillablePdfViewer({ formId, formData }: FillablePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);
  const formDataRef = useRef(formData);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether first build for current formId has completed
  const firstBuildDone = useRef(false);

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  // Always sync ref to latest formData
  useEffect(() => {
    formDataRef.current = formData;
  });

  const rebuildPdf = useCallback(
    (cancelled: { value: boolean }) => {
      if (!pdfPath) return;
      setLoading(true);
      setError(null);
      buildFilledPdfBlobUrl(pdfPath, formId, formDataRef.current)
        .then((url) => {
          if (cancelled.value) { URL.revokeObjectURL(url); return; }
          if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
          prevBlobUrl.current = url;
          setBlobUrl(url);
          setLoading(false);
          firstBuildDone.current = true;
        })
        .catch((err) => {
          if (!cancelled.value) {
            console.error("PDF fill error:", err);
            setError(err?.message || "Failed to load PDF");
            setLoading(false);
          }
        });
    },
    [pdfPath, formId]
  );

  // Re-run immediately whenever formId changes (new form selected)
  useEffect(() => {
    if (!pdfPath) {
      setError(`No fillable PDF available for form: ${formId}`);
      setLoading(false);
      return;
    }
    firstBuildDone.current = false;
    setBlobUrl(null);
    setLoading(true);
    const cancelled = { value: false };
    rebuildPdf(cancelled);
    return () => { cancelled.value = true; };
  }, [formId, pdfPath, rebuildPdf]);

  // Debounce re-render when formData changes (field edits) — skip until first build is done
  useEffect(() => {
    if (!firstBuildDone.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const cancelled = { value: false };
    debounceTimer.current = setTimeout(() => rebuildPdf(cancelled), 800);
    return () => {
      cancelled.value = true;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  useEffect(() => {
    return () => { if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current); };
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
        <span className="text-sm">Filling PDF fields…</span>
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
      src={blobUrl + "#toolbar=1&navpanes=0&scrollbar=1&zoom=100"}
      className="w-full h-full border-0"
      title={`Fillable ACORD Form ${formId}`}
      style={{ minHeight: "600px" }}
    />
  );
}
