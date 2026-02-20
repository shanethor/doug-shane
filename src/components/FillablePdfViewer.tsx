import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";
import { FIELD_POSITION_MAP } from "@/lib/acord-field-positions";
import { generateAcordPdfAsync } from "@/lib/pdf-generator";
import { formatUSD, CURRENCY_FIELDS } from "@/lib/acord-autofill";
import type { AcordFormDefinition } from "@/lib/acord-forms";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  formDef?: AcordFormDefinition;
  onFieldChange?: (key: string, value: string) => void;
}

/**
 * Loads the original ACORD PDF and draws field values directly onto each page
 * using pdf-lib's page.drawText() — bypasses AcroForm/XFA entirely.
 * This matches the approach from https://stackoverflow.com/questions/1180115
 */
async function buildFilledPdfBlobUrl(
  formDef: AcordFormDefinition,
  formData: Record<string, any>
): Promise<{ url: string; isAcroForm: boolean }> {
  const result = await generateAcordPdfAsync(formDef, formData, {});
  const blob = new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  return { url, isAcroForm: result.isAcroForm ?? true };
}

/** Image overlay viewer for XFA / non-AcroForm PDFs */
function ImageOverlayViewer({
  formDef,
  formData,
}: {
  formDef: AcordFormDefinition;
  formData: Record<string, any>;
}) {
  const positions = FIELD_POSITION_MAP[formDef.id] || {};
  const pages = formDef.pages || [];

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">No page images for this form</p>
      </div>
    );
  }

  const PAGE_W = 612;
  const PAGE_H = 792;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full bg-muted/30">
      {pages.map((pageUrl, pageIdx) => (
        <div
          key={pageIdx}
          className="relative mx-auto shadow-md rounded overflow-hidden"
          style={{ width: "100%", maxWidth: "900px", aspectRatio: `${PAGE_W}/${PAGE_H}`, containerType: "inline-size" }}
        >
          <img
            src={pageUrl}
            alt={`${formDef.name} page ${pageIdx + 1}`}
            className="w-full h-full object-cover block"
            draggable={false}
          />
          {/* Data overlay — position each field value at its calibrated coordinate */}
          {Object.entries(positions)
            .filter(([, pos]) => pos.page === pageIdx)
            .map(([key, pos]) => {
              const raw = formData[key];
              if (raw === undefined || raw === null || raw === "") return null;
              let display = String(raw);
              if (display === "false") return null;
              if (display === "N/A") return null;
              if (display === "true") display = "✓";
              if (CURRENCY_FIELDS.has(key)) display = formatUSD(display);
              // Format ISO dates
              const isoMatch = display.match(/^(\d{4})-(\d{2})-(\d{2})$/);
              if (isoMatch) display = `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;

              const leftPct = (pos.x / PAGE_W) * 100;
              const topPct = (pos.y / PAGE_H) * 100;
              const maxWPct = ((pos.maxWidth || 200) / PAGE_W) * 100;
              const fontScale = (pos.fontSize || 8) / 8;

              return (
                <span
                  key={key}
                  className="absolute leading-tight pointer-events-none whitespace-pre-wrap break-words z-10"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    maxWidth: `${maxWPct}%`,
                    fontSize: `clamp(6px, ${0.58 * fontScale}cqw, ${(pos.fontSize || 8) * 1.5}px)`,
                    fontFamily: "Helvetica, Arial, sans-serif",
                    color: "hsl(230 80% 28%)",
                    fontWeight: 500,
                  }}
                >
                  {pos.checkbox
                    ? raw === true || raw === "Yes" || display === "✓" ? "✓" : ""
                    : display}
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export default function FillablePdfViewer({ formId, formData, formDef }: FillablePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isAcroForm, setIsAcroForm] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);
  const prevDataRef = useRef<string>("");

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  const buildPdf = (def: AcordFormDefinition, data: Record<string, any>) => {
    setLoading(true);
    setError(null);

    buildFilledPdfBlobUrl(def, data)
      .then(({ url, isAcroForm: acro }) => {
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = url;
        setBlobUrl(url);
        setIsAcroForm(acro);
        setLoading(false);
      })
      .catch((err) => {
        console.error("PDF fill error:", err);
        // If we have page images, fall back to image overlay instead of error
        if (def.pages && def.pages.length > 0) {
          setIsAcroForm(false);
          setLoading(false);
        } else {
          setError(err?.message || "Failed to generate PDF");
          setLoading(false);
        }
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
      // No fillable PDF — go straight to image overlay if pages exist
      if (formDef.pages && formDef.pages.length > 0) {
        setIsAcroForm(false);
        setLoading(false);
      } else {
        setError(`No fillable PDF available for form: ${formId}`);
        setLoading(false);
      }
      return;
    }
    prevDataRef.current = JSON.stringify(formData);
    buildPdf(formDef, formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, formDef]);

  // Rebuild when form data changes (debounced) — only for AcroForm PDFs
  useEffect(() => {
    if (!formDef || !pdfPath) return;
    // Image overlay re-renders automatically via React props — no rebuild needed
    if (isAcroForm === false) return;
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

  // ── XFA / non-AcroForm: use image overlay renderer ──
  if (isAcroForm === false && formDef) {
    return <ImageOverlayViewer formDef={formDef} formData={formData} />;
  }

  // ── AcroForm: render the pre-filled interactive PDF in an iframe ──
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
