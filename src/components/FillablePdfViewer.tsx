import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

// Adobe PDF Embed API client IDs per domain
const ADOBE_CLIENT_IDS: Record<string, string> = {
  "doug-shane.lovable.app": "82d00c65432249999e0daa589ea94dfd",
  "id-preview--002628bd-9af2-4bd3-bfc6-c0546eed53c2.lovable.app": "0e4142db962d4d64b1fee6bf34bc67ac",
  "002628bd-9af2-4bd3-bfc6-c0546eed53c2.lovableproject.com": "f5d0868e6dbf4ee79ef0a26e2157776a",
  "localhost": "600cf411cda548c1ae0978f2b7a685f9",
};

function getAdobeClientId(): string {
  const hostname = window.location.hostname;
  return ADOBE_CLIENT_IDS[hostname] ?? ADOBE_CLIENT_IDS["localhost"];
}

export interface FillablePdfViewerProps {
  /** Pre-generated, filled PDF bytes to display. When this changes, the viewer re-renders. */
  pdfBytes: Uint8Array | null;
  /** True while the parent is generating the PDF — shows a loading spinner */
  isGenerating?: boolean;
  /** Number of fields that were pre-filled (shown in status bar) */
  filledCount?: number;
  /** Display name for the PDF tab title */
  fileName?: string;
  /** Called when the user edits a field inside the Adobe PDF viewer */
  onFieldChange?: (fieldName: string, value: string) => void;
}

declare global {
  interface Window {
    AdobeDC?: any;
  }
}

function loadAdobeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.AdobeDC) { resolve(); return; }
    const existing = document.getElementById("adobe-dc-view-sdk");
    if (existing) {
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

let viewerInstanceCounter = 0;

export default function FillablePdfViewer({
  pdfBytes,
  isGenerating = false,
  filledCount = 0,
  fileName = "ACORD Form.pdf",
  onFieldChange,
}: FillablePdfViewerProps) {
  // Each time pdfBytes changes we want a fresh viewer with a unique divId
  const [viewerKey, setViewerKey] = useState(() => ++viewerInstanceCounter);
  const [adobeError, setAdobeError] = useState<string | null>(null);
  const [adobeLoading, setAdobeLoading] = useState(false);
  const divId = `adobe-pdf-viewer-${viewerKey}`;
  const cancelledRef = useRef(false);
  const onFieldChangeRef = useRef(onFieldChange);
  onFieldChangeRef.current = onFieldChange;

  // When bytes change (new PDF generated), bump the key to force viewer re-mount
  const prevBytesRef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    if (pdfBytes && pdfBytes !== prevBytesRef.current) {
      prevBytesRef.current = pdfBytes;
      setViewerKey(++viewerInstanceCounter);
    }
  }, [pdfBytes]);

  // Initialize the Adobe viewer whenever the viewerKey (= pdfBytes) changes
  useEffect(() => {
    if (!pdfBytes) return;

    cancelledRef.current = false;
    setAdobeError(null);
    setAdobeLoading(true);

    async function initViewer() {
      try {
        await loadAdobeScript();

        // Wait for Adobe DC to be ready
        await new Promise<void>((resolve) => {
          if (window.AdobeDC) { resolve(); return; }
          document.addEventListener("adobe_dc_view_sdk.ready", () => resolve(), { once: true });
        });

        if (cancelledRef.current) return;

        const view = new window.AdobeDC.View({
          clientId: getAdobeClientId(),
          divId,
        });

        // Register event callbacks BEFORE previewFile
        view.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            if (cancelledRef.current) return;
            // Sync field edits from the Adobe viewer back to our left panel
            if (event.type === "FORM_FIELD_CHANGED") {
              const { name, value } = event.data || {};
              if (name && onFieldChangeRef.current) {
                onFieldChangeRef.current(name, value ?? "");
              }
            }
          },
          { enablePDFAnalytics: false }
        );

        // Pass the filled PDF bytes directly via content.promise
        // This avoids cross-origin issues with blob:// URLs
        const pdfBuffer = pdfBytes.buffer.slice(
          pdfBytes.byteOffset,
          pdfBytes.byteOffset + pdfBytes.byteLength
        ) as ArrayBuffer;

        await view.previewFile(
          {
            content: { promise: Promise.resolve(pdfBuffer) },
            metaData: { fileName },
          },
          {
            embedMode: "IN_LINE",
            showAnnotationTools: false,
            showLeftHandPanel: false,
            showPageControls: true,
            showDownloadPDF: true,
            showPrintPDF: true,
            enableFormFilling: true,
            defaultViewMode: "FIT_WIDTH",
          }
        );

        if (!cancelledRef.current) setAdobeLoading(false);
      } catch (err: any) {
        if (!cancelledRef.current) {
          console.error("Adobe PDF Embed error:", err);
          setAdobeError(err?.message || "Failed to initialize PDF viewer");
          setAdobeLoading(false);
        }
      }
    }

    initViewer();

    return () => {
      cancelledRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerKey]);

  const showSpinner = isGenerating || (adobeLoading && !adobeError);

  return (
    <div className="flex flex-col h-full relative bg-muted/20">
      {/* Status bar */}
      {!showSpinner && !adobeError && filledCount > 0 && (
        <div className="px-3 py-1.5 border-b text-xs text-muted-foreground flex items-center gap-1.5 bg-background/80">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          {filledCount} field{filledCount !== 1 ? "s" : ""} pre-filled from extracted data — edit any field on the left to update
        </div>
      )}

      {/* Loading overlay */}
      {showSpinner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground z-10 bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium">
            {isGenerating ? "Generating pre-filled PDF…" : "Loading viewer…"}
          </span>
          {isGenerating && (
            <span className="text-xs text-muted-foreground">Building form with your data</span>
          )}
        </div>
      )}

      {/* Error state */}
      {adobeError && !showSpinner && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">PDF viewer error</p>
          <p className="text-xs text-destructive max-w-sm">{adobeError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Domain: <code className="bg-muted px-1 rounded">{window.location.hostname}</code>
          </p>
        </div>
      )}

      {/* No bytes yet — waiting for generation */}
      {!pdfBytes && !isGenerating && !adobeError && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
          <RefreshCw className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm">Fill in some fields on the left to generate the PDF preview</p>
        </div>
      )}

      {/* Adobe renders into this div — key ensures a fresh div on re-render */}
      <div
        key={viewerKey}
        id={divId}
        className="w-full flex-1"
        style={{ minHeight: "700px" }}
      />
    </div>
  );
}
