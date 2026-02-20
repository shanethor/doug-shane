import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";
import type { AcordFormDefinition } from "@/lib/acord-forms";

// Adobe PDF Embed API client ID
const ADOBE_CLIENT_ID = "77a0a7210dba422fa2cd350209ffaabf";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  formDef?: AcordFormDefinition;
  onFieldChange?: (key: string, value: string) => void;
}

declare global {
  interface Window {
    AdobeDC?: any;
  }
}

function loadAdobeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.AdobeDC) {
      resolve();
      return;
    }
    const existing = document.getElementById("adobe-dc-view-sdk");
    if (existing) {
      // Script already injected — wait for it to load
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "adobe-dc-view-sdk";
    script.src = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function FillablePdfViewer({ formId, formData, formDef }: FillablePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adobeViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const divId = `adobe-pdf-${formId}`;

  const pdfPath = FILLABLE_PDF_PATHS[formId];

  useEffect(() => {
    if (!pdfPath) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function initViewer() {
      try {
        setLoading(true);
        setError(null);

        await loadAdobeScript();

        // Adobe SDK fires a ready event before AdobeDC is usable
        await new Promise<void>((resolve) => {
          if (window.AdobeDC) {
            resolve();
          } else {
            document.addEventListener("adobe_dc_view_sdk.ready", () => resolve(), { once: true });
          }
        });

        if (cancelled) return;

        const absoluteUrl = `${window.location.origin}${pdfPath}`;

        const view = new window.AdobeDC.View({
          clientId: ADOBE_CLIENT_ID,
          divId,
        });

        adobeViewRef.current = view;

        await view.previewFile(
          {
            content: { location: { url: absoluteUrl } },
            metaData: { fileName: `ACORD ${formId.replace("acord-", "")}.pdf` },
          },
          {
            embedMode: "IN_LINE",
            showAnnotationTools: false,
            showLeftHandPanel: false,
            showPageControls: true,
            showDownloadPDF: true,
            showPrintPDF: true,
            enableFormFilling: true,
          }
        );

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Adobe PDF Embed error:", err);
          setError(err?.message || "Failed to load PDF viewer");
          setLoading(false);
        }
      }
    }

    initViewer();

    return () => {
      cancelled = true;
    };
    // Re-init when form switches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, pdfPath]);

  if (!pdfPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">No fillable PDF for this form yet</p>
        <p className="text-xs">A fillable PDF for {formId} has not been configured.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground z-10 bg-background/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading PDF viewer…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">PDF viewer error</p>
          <p className="text-xs text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure the domain is registered in your Adobe PDF Embed API credentials.
          </p>
        </div>
      )}

      {/* Adobe renders into this div */}
      <div
        id={divId}
        ref={containerRef}
        className="w-full flex-1"
        style={{ minHeight: "700px" }}
      />
    </div>
  );
}
