import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";

// Adobe PDF Embed API client IDs per domain
const ADOBE_CLIENT_IDS: Record<string, string> = {
  "buildingaura.site": "683a4afbcd084e728689423a5e747605",
  "www.buildingaura.site": "683a4afbcd084e728689423a5e747605",
  "doug-shane.lovable.app": "82d00c65432249999e0daa589ea94dfd",
  "id-preview--002628bd-9af2-4bd3-bfc6-c0546eed53c2.lovable.app": "0e4142db962d4d64b1fee6bf34bc67ac",
  "002628bd-9af2-4bd3-bfc6-c0546eed53c2.lovableproject.com": "f5d0868e6dbf4ee79ef0a26e2157776a",
  "localhost": "600cf411cda548c1ae0978f2b7a685f9",
};

function getAdobeClientId(): string {
  const hostname = window.location.hostname;
  return ADOBE_CLIENT_IDS[hostname] ?? ADOBE_CLIENT_IDS["localhost"];
}

export interface FillablePdfViewerHandle {
  /** Trigger Adobe's save API to flush current field values into onSaveBytes */
  triggerSave: () => Promise<void>;
  /**
   * Set field values directly inside the Adobe viewer without remounting.
   * Uses Adobe's native APIs to write data into the PDF — preserves 100% original formatting.
   */
  setFieldValues: (fields: Record<string, string>) => Promise<void>;
}

export interface FillablePdfViewerProps {
  pdfUrl: string;
  fileName?: string;
  onFieldChange?: (fieldName: string, value: string) => void;
  onSaveBytes?: (bytes: Uint8Array) => void;
  onReady?: () => void;
  /**
   * Pre-fill data: map of field INDEX (0-based position in form.getFields()) → string value.
   * pdf-lib fills these into the PDF before passing to Adobe viewer.
   */
  prefillByIndex?: Record<number, string>;
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

const FillablePdfViewer = forwardRef<FillablePdfViewerHandle, FillablePdfViewerProps>(function FillablePdfViewer({
  pdfUrl,
  fileName = "ACORD Form.pdf",
  onFieldChange,
  onSaveBytes,
  onReady,
  prefillByIndex,
}, ref) {
  const [viewerKey] = useState(() => ++viewerInstanceCounter);
  const [adobeError, setAdobeError] = useState<string | null>(null);
  const [adobeLoading, setAdobeLoading] = useState(true);
  const divId = `adobe-pdf-viewer-${viewerKey}`;
  const cancelledRef = useRef(false);
  const onFieldChangeRef = useRef(onFieldChange);
  onFieldChangeRef.current = onFieldChange;
  const onSaveBytesRef = useRef(onSaveBytes);
  onSaveBytesRef.current = onSaveBytes;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const adobeApisRef = useRef<any>(null);
  const adobeViewRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    triggerSave: async () => {
      const apis = adobeApisRef.current;
      if (!apis) return;
      try {
        await apis.triggerFileEvent("SAVE");
      } catch (e) {
        console.warn("[Adobe] triggerSave failed:", e);
      }
    },
    // No-op: we now pre-fill via pdf-lib instead
    setFieldValues: async () => {},
  }), []);

  useEffect(() => {
    cancelledRef.current = false;
    setAdobeError(null);
    setAdobeLoading(true);

    async function initViewer() {
      try {
        await loadAdobeScript();

        await new Promise<void>((resolve) => {
          if (window.AdobeDC) { resolve(); return; }
          document.addEventListener("adobe_dc_view_sdk.ready", () => resolve(), { once: true });
        });

        if (cancelledRef.current) return;

        // Wait for the div to actually be present in the DOM
        await new Promise<void>((resolve) => {
          const check = () => {
            if (document.getElementById(divId)) { resolve(); return; }
            requestAnimationFrame(check);
          };
          check();
        });

        if (cancelledRef.current) return;

        const view = new window.AdobeDC.View({
          clientId: getAdobeClientId(),
          divId,
        });
        adobeViewRef.current = view;

        // ── SAVE_API: capture bytes whenever Adobe saves ──
        // These bytes come from Adobe's native engine with full XFA/AcroForm
        // formatting intact — 100% original ACORD visual layout preserved.
        view.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.SAVE_API,
          (metaData: any, content: any) => {
            try {
              // Adobe may pass content as ArrayBuffer or as second arg
              const bytes = content instanceof ArrayBuffer
                ? new Uint8Array(content)
                : (metaData instanceof ArrayBuffer ? new Uint8Array(metaData) : null);
              if (!cancelledRef.current && onSaveBytesRef.current && bytes) {
                onSaveBytesRef.current(bytes);
              }
            } catch (e) {
              console.warn("[Adobe] SAVE_API callback error:", e);
            }
            return new Promise((resolve) => {
              resolve({ code: window.AdobeDC?.View?.Enum?.ApiResponseCode?.SUCCESS ?? 0 });
            });
          },
          {
            autoSaveFrequency: 0,
            enableFocusPolling: true,
            showSaveButton: false,
          }
        );

        // ── EVENT_LISTENER: sync field edits from viewer → left panel ──
        view.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            if (cancelledRef.current) return;
            if (event.type === "FORM_FIELD_CHANGED") {
              const fieldData = event.data?.fieldData || event.data || {};
              const name = fieldData.name ?? event.data?.name;
              const value = fieldData.value ?? event.data?.value ?? "";
              if (name && onFieldChangeRef.current) {
                onFieldChangeRef.current(name, String(value));
              }
            }
          },
          { enablePDFAnalytics: true, listenOn: ["FORM_FIELD_CHANGED"] }
        );

        // ── Load PDF and pre-fill with pdf-lib if prefillByIndex is provided ──
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfUrl}`);
        let pdfBuffer = await response.arrayBuffer();

        // Pre-fill fields using pdf-lib before passing to Adobe
        const prefillEntries = prefillByIndex ? Object.entries(prefillByIndex) : [];
        console.warn(`[pdf-lib] prefillByIndex has ${prefillEntries.length} entries`);
        if (prefillEntries.length > 0) {
          try {
            const { PDFDocument, StandardFonts } = await import("pdf-lib");
            const doc = await PDFDocument.load(new Uint8Array(pdfBuffer), { ignoreEncryption: true });
            const helvetica = await doc.embedFont(StandardFonts.Helvetica);
            const form = doc.getForm();
            const allFields = form.getFields();
            console.warn(`[pdf-lib] PDF has ${allFields.length} form fields`);
            let filled = 0;
            for (const [idxStr, value] of prefillEntries) {
              const idx = Number(idxStr);
              const field = allFields[idx];
              if (!field || !value) continue;
              try {
                const typeName = field.constructor.name;
                if (typeName.startsWith("PDFTextField")) {
                  const tf = field as any;
                  tf.setText(String(value));
                  tf.defaultUpdateAppearances(helvetica);
                  filled++;
                } else if (typeName.startsWith("PDFCheckBox")) {
                  if (value === "true" || value === "Yes" || value === "1") (field as any).check();
                } else if (typeName.startsWith("PDFDropdown")) {
                  try { (field as any).select(String(value)); filled++; } catch (_) {}
                }
              } catch (fieldErr) {
                console.warn(`[pdf-lib] Failed to set field ${idx} (${field.getName()}):`, fieldErr);
              }
            }
            // Force appearance streams to be generated for all fields
            try { form.updateFieldAppearances(helvetica); } catch (_) {}
            console.warn(`[pdf-lib] Pre-filled ${filled} fields into PDF`);
            const savedBytes = await doc.save();
            pdfBuffer = savedBytes.buffer as ArrayBuffer;
            console.warn(`[pdf-lib] Saved PDF: ${savedBytes.length} bytes`);
          } catch (e) {
            console.warn("[pdf-lib] Pre-fill failed, using raw PDF:", e);
          }
        }

        const previewFilePromise = view.previewFile(
          {
            content: { promise: Promise.resolve(pdfBuffer) },
            metaData: { fileName },
          },
          {
            embedMode: "FULL_WINDOW",
            enableFormFilling: true,
            showAnnotationTools: false,
            showLeftHandPanel: false,
            showThumbnails: false,
            showBookmarks: false,
            showDownloadPDF: true,
            showPrintPDF: true,
            defaultViewMode: "FIT_WIDTH",
          }
        );

        // Get the APIs object from the preview result (not the view)
        try {
          const adobeViewer = await previewFilePromise;
          if (adobeViewer && typeof adobeViewer.getAPIs === "function") {
            const apis = await adobeViewer.getAPIs();
            adobeApisRef.current = apis;
            console.warn("[Adobe] APIs acquired successfully");
          } else {
            console.warn("[Adobe] previewFile did not return a valid viewer object");
          }
        } catch (e) {
          console.warn("[Adobe] Could not get APIs:", e);
        }

        if (!cancelledRef.current) {
          setAdobeLoading(false);
          // Notify parent that Adobe is ready so it can inject initial field values
          if (onReadyRef.current) onReadyRef.current();
        }
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
  // Only re-mount when the PDF URL changes (i.e. form switch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  return (
    <div className="flex flex-col relative bg-muted/20" style={{ height: "100%", minHeight: "600px" }}>
      {/* Loading overlay */}
      {adobeLoading && !adobeError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground z-10 bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading viewer…</span>
        </div>
      )}

      {/* Error state */}
      {adobeError && !adobeLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">PDF viewer error</p>
          <p className="text-xs text-destructive max-w-sm">{adobeError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Domain: <code className="bg-muted px-1 rounded">{window.location.hostname}</code>
          </p>
        </div>
      )}

      {/* Adobe renders into this div */}
      <div
        id={divId}
        style={{ width: "100%", height: "100%", minHeight: "600px" }}
      />
    </div>
  );
});

export default FillablePdfViewer;
