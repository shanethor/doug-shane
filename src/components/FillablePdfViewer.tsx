import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FILLABLE_PDF_PATHS, ACORD_FIELD_MAPS } from "@/lib/acord-field-map";
import { PDFDocument } from "pdf-lib";

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
    // PDF has no AcroForm — fall through to raw render
  }

  if (form) {
    const pdfFields = form.getFields();
    const pdfFieldNames = new Set(pdfFields.map(f => f.getName()));

    for (const [ourKey, pdfFieldName] of Object.entries(fieldMap)) {
      const rawVal = formData[ourKey];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      const display = formatFieldValue(ourKey, rawVal);
      if (!display) continue;

      // Try exact match first, then substring match
      let matchedName: string | null = null;
      if (pdfFieldNames.has(pdfFieldName)) {
        matchedName = pdfFieldName;
      } else {
        // Fallback: find a PDF field whose name contains the mapped name or vice versa
        for (const pfn of pdfFieldNames) {
          if (pfn.toLowerCase().includes(pdfFieldName.toLowerCase()) ||
              pdfFieldName.toLowerCase().includes(pfn.toLowerCase())) {
            matchedName = pfn;
            break;
          }
        }
      }

      if (!matchedName) continue;

      try {
        const field = form.getField(matchedName);
        const fieldType = field.constructor.name;

        if (fieldType === "PDFTextField") {
          (form.getTextField(matchedName)).setText(display);
        } else if (fieldType === "PDFCheckBox") {
          const isChecked = rawVal === true || rawVal === "true" || rawVal === "Yes" || rawVal === "✓";
          if (isChecked) {
            form.getCheckBox(matchedName).check();
          } else {
            form.getCheckBox(matchedName).uncheck();
          }
        } else if (fieldType === "PDFDropdown") {
          try {
            form.getDropdown(matchedName).select(display);
          } catch {
            // Option not in list — skip
          }
        } else if (fieldType === "PDFRadioGroup") {
          try {
            form.getRadioGroup(matchedName).select(display);
          } catch {
            // Option not available — skip
          }
        }
      } catch {
        // Field type mismatch or not found — skip silently
      }
    }

    // Flatten so values are visible (not editable native AcroForm which may hide values)
    // We keep it unflattenned so the user can still edit natively in the PDF viewer
    try {
      form.updateFieldAppearances();
    } catch {
      // Some PDFs resist appearance updates — ignore
    }
  }

  const filledBytes = await pdfDoc.save({ useObjectStreams: false });
  return URL.createObjectURL(new Blob([filledBytes.buffer as ArrayBuffer], { type: "application/pdf" }));
}

export default function FillablePdfViewer({ formId, formData }: FillablePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  useEffect(() => {
    if (!pdfPath) {
      setError(`No fillable PDF available for form: ${formId}`);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    buildFilledPdfBlobUrl(pdfPath, formId, formData).then((url) => {
      if (cancelled) { URL.revokeObjectURL(url); return; }
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
      prevBlobUrl.current = url;
      setBlobUrl(url);
      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        setError(err?.message || "Failed to load PDF");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [pdfPath, formId, formData]);

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
