import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";
import { generateAcordPdfAsync } from "@/lib/pdf-generator";
import type { AcordFormDefinition } from "@/lib/acord-forms";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  formDef?: AcordFormDefinition;
  onFieldChange?: (key: string, value: string) => void;
}

/**
 * Loads the official ACORD fillable PDF pre-filled with form data.
 * Uses pdf-lib to write field values before displaying in the iframe.
 */
async function buildFilledPdfBlobUrl(
  formDef: AcordFormDefinition,
  formData: Record<string, any>
): Promise<string> {
  // flatten: false keeps fields interactive in the iframe viewer
  const result = await generateAcordPdfAsync(formDef, formData, { flatten: false });
  const blob = new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

export default function FillablePdfViewer({ formId, formData, formDef }: FillablePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);
  const prevDataRef = useRef<string>("");

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  const buildPdf = (def: AcordFormDefinition, data: Record<string, any>) => {
    setLoading(true);
    setError(null);

    buildFilledPdfBlobUrl(def, data)
      .then((url) => {
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error("PDF fill error:", err);
        setError(err?.message || "Failed to generate PDF");
        setLoading(false);
      });
  };

  // Rebuild whenever formId or formDef changes
  useEffect(() => {
    if (!formDef) {
      setError(`No form definition available for: ${formId}`);
      setLoading(false);
      return;
    }
    if (!pdfPath) {
      setError(`No fillable PDF available for form: ${formId}`);
      setLoading(false);
      return;
    }
    prevDataRef.current = JSON.stringify(formData);
    buildPdf(formDef, formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, formDef]);

  // Rebuild when form data changes (debounced)
  useEffect(() => {
    if (!formDef || !pdfPath) return;
    const serialized = JSON.stringify(formData);
    if (serialized === prevDataRef.current) return;
    prevDataRef.current = serialized;

    const timer = setTimeout(() => {
      buildPdf(formDef, formData);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current); };
  }, []);

  if (!pdfPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">No fillable PDF for this form yet</p>
        <p className="text-xs">A fillable PDF for {formId} has not been configured.</p>
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
        <p className="text-sm font-medium">PDF error</p>
        <p className="text-xs text-destructive">{error}</p>
        {formDef && (
          <button
            onClick={() => buildPdf(formDef, formData)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <iframe
        key={blobUrl}
        src={blobUrl + "#toolbar=1&navpanes=0&scrollbar=1&zoom=100"}
        className="w-full flex-1 border-0"
        title={`Fillable ACORD Form ${formId}`}
        style={{ minHeight: "560px" }}
      />
    </div>
  );
}
