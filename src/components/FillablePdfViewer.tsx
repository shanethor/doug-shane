import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  onFieldChange?: (key: string, value: string) => void;
}

/**
 * Loads the official ACORD fillable PDF in an editable iframe.
 *
 * WHY NOT PRE-FILLED: The official ACORD PDFs use binary-obfuscated AcroForm
 * field names that cannot be matched to human-readable keys by any string-based
 * approach (confirmed via diagnostic — field names are encrypted byte sequences).
 * The PDF is therefore shown as a blank fillable form the user can type into
 * directly. All data is managed via the left panel and included in downloads.
 */
async function loadRawPdfBlobUrl(pdfPath: string): Promise<string> {
  const response = await fetch(pdfPath);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfPath}`);
  const arrayBuffer = await response.arrayBuffer();
  return URL.createObjectURL(
    new Blob([arrayBuffer], { type: "application/pdf" })
  );
}

export default function FillablePdfViewer({ formId }: FillablePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  // Load PDF once per formId change
  useEffect(() => {
    if (!pdfPath) {
      setError(`No fillable PDF available for form: ${formId}`);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    loadRawPdfBlobUrl(pdfPath)
      .then((url) => {
        if (cancelled) { URL.revokeObjectURL(url); return; }
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("PDF load error:", err);
          setError(err?.message || "Failed to load PDF");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [formId, pdfPath]);

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
        <span className="text-sm">Loading PDF…</span>
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
    <div className="flex flex-col h-full">
      <div className="flex items-start gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <span>
          This is a blank editable form — type directly into the fields below.
          Data from the left panel is included in your download.
        </span>
      </div>
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
