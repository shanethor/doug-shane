import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  onFieldChange?: (key: string, value: string) => void;
}

/**
 * Serves the raw fillable ACORD PDF directly — the browser renders it natively
 * with all AcroForm fields fully interactive. This guarantees the viewer matches
 * downloads exactly.
 */
async function getRawPdfBlobUrl(pdfPath: string): Promise<string> {
  const response = await fetch(pdfPath);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfPath}`);
  const arrayBuffer = await response.arrayBuffer();
  return URL.createObjectURL(new Blob([arrayBuffer], { type: "application/pdf" }));
}

export default function FillablePdfViewer({ formId }: FillablePdfViewerProps) {
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

    getRawPdfBlobUrl(pdfPath).then((url) => {
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
  }, [pdfPath, formId]);

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
        <span className="text-sm">Loading fillable PDF…</span>
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
