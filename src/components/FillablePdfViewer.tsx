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
          function (_metaData: any, _content: any) {
            // Wrap EVERYTHING — Adobe internally accesses .metaData on the
            // return value and on callback arguments; if anything is undefined
            // it throws "Cannot read properties of undefined (reading 'metaData')".
            try {
              const args = Array.prototype.slice.call(arguments);
              let bytes: Uint8Array | null = null;
              for (const arg of args) {
                if (arg == null) continue;
                if (arg instanceof ArrayBuffer) { bytes = new Uint8Array(arg); break; }
                if (arg instanceof Uint8Array) { bytes = arg; break; }
                if (typeof arg === "object" && arg.buffer instanceof ArrayBuffer) {
                  bytes = new Uint8Array(arg.buffer); break;
                }
              }
              if (!cancelledRef.current && onSaveBytesRef.current && bytes) {
                onSaveBytesRef.current(bytes);
              }
            } catch (e) {
              // Swallow — never let this propagate to Adobe internals
            }
            // Return object Adobe expects — include metaData to prevent the
            // "Cannot read properties of undefined (reading 'metaData')" error
            return Promise.resolve({
              code: window.AdobeDC?.View?.Enum?.ApiResponseCode?.SUCCESS ?? 0,
              data: { metaData: { fileName: fileName } },
            });
          },
          {
            autoSaveFrequency: 3,
            enableFocusPolling: true,
            showSaveButton: true,
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
            const { PDFDocument, StandardFonts, PDFName } = await import("pdf-lib");
            const doc = await PDFDocument.load(new Uint8Array(pdfBuffer), { ignoreEncryption: true });
            const helvetica = await doc.embedFont(StandardFonts.Helvetica);
            const form = doc.getForm();
            const allFields = form.getFields();
            console.warn(`[pdf-lib] PDF has ${allFields.length} form fields`);
            let filled = 0;
            const checkboxIndices: number[] = [];
            for (const [idxStr, value] of prefillEntries) {
              const idx = Number(idxStr);
              const field = allFields[idx];
              if (!field || !value) continue;
              try {
                const f = field as any;
                // Detect if this value is a checkbox signal ("On", "true", "Yes", etc.)
                const isCheckboxValue = (() => {
                  const lower = String(value).toLowerCase();
                  return lower === "on" || lower === "true" || lower === "yes" || lower === "y" || lower === "x" || lower === "1";
                })();
                // Use method-existence checks instead of constructor.name
                // (ACORD PDFs often have non-standard constructor names like PDFTextField2)
                if (typeof f.check === "function") {
                  // Native checkbox field — check it if value is truthy
                  if (isCheckboxValue) {
                    try {
                      f.check();
                      checkboxIndices.push(idx);
                    } catch (chkErr) {
                      console.warn(`[pdf-lib] check() failed for field ${idx}, trying manual approach:`, chkErr);
                    }
                    // Ensure the checkbox has its appearance state set to "on"
                    try {
                      const widgets = f.acroField?.getWidgets?.() || [];
                      for (const widget of widgets) {
                        const ap = widget.dict.get(PDFName.of("AP"));
                        if (ap) {
                          const normalDict = (ap as any).get?.(PDFName.of("N"));
                          if (normalDict && typeof normalDict.entries === "function") {
                            for (const [key] of normalDict.entries()) {
                              const keyName = key instanceof PDFName ? key.decodeText() : String(key);
                              if (keyName !== "Off") {
                                widget.dict.set(PDFName.of("AS"), PDFName.of(keyName));
                                widget.dict.set(PDFName.of("V"), PDFName.of(keyName));
                                break;
                              }
                            }
                          } else {
                            widget.dict.set(PDFName.of("AS"), PDFName.of("Yes"));
                            widget.dict.set(PDFName.of("V"), PDFName.of("Yes"));
                          }
                        } else {
                          widget.dict.set(PDFName.of("AS"), PDFName.of("Yes"));
                          widget.dict.set(PDFName.of("V"), PDFName.of("Yes"));
                        }
                      }
                    } catch (apErr) {
                      console.warn(`[pdf-lib] Checkbox appearance fix failed for ${idx}:`, apErr);
                    }
                    filled++;
                  }
                } else if (typeof f.setText === "function") {
                  // Text field — but if value is a checkbox signal AND maxLen=1, write "X"
                  let textVal = String(value);
                  const maxLen = f.getMaxLength?.();
                  if (isCheckboxValue && maxLen === 1) {
                    // ACORD PDFs sometimes use text fields with maxLen=1 as pseudo-checkboxes
                    textVal = "X";
                  } else if (isCheckboxValue && !maxLen) {
                    // If it's a checkbox value going into a text field without maxLen, skip it
                    // (likely a mapping issue — don't write "On" as text)
                    continue;
                  } else if (maxLen && textVal.length > maxLen) {
                    if (maxLen === 1) {
                      const lower = textVal.toLowerCase();
                      if (lower === "yes" || lower === "true" || lower === "y") textVal = "Y";
                      else if (lower === "no" || lower === "false" || lower === "n") textVal = "N";
                      else textVal = textVal.substring(0, 1);
                    } else {
                      textVal = textVal.substring(0, maxLen);
                    }
                  }
                  f.setText(textVal);
                  try { f.defaultUpdateAppearances(helvetica); } catch (_) {}
                  filled++;
                } else if (typeof f.select === "function") {
                  try { f.select(String(value)); filled++; } catch (_) {}
                }
              } catch (fieldErr) {
                console.warn(`[pdf-lib] Failed to set field ${idx} (${field.getName()}):`, fieldErr);
              }
            }
            // Force appearance streams for TEXT fields only — skip checkboxes
            // updateFieldAppearances overwrites checkbox AP streams, breaking them
            try {
              for (const [idxStr] of prefillEntries) {
                const idx = Number(idxStr);
                if (checkboxIndices.includes(idx)) continue;
                const field = allFields[idx];
                if (field && typeof (field as any).setText === "function") {
                  try { (field as any).defaultUpdateAppearances(helvetica); } catch (_) {}
                }
              }
            } catch (_) {}
            console.warn(`[pdf-lib] Pre-filled ${filled} fields (${checkboxIndices.length} checkboxes) into PDF`);
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

          // ── Auto-save polling: trigger save every 3s to capture PDF field edits ──
          // This ensures onSaveBytes fires periodically so the parent can extract
          // current field values via pdf-lib and sync them back to the left panel.
          const pollId = setInterval(() => {
            if (cancelledRef.current || !adobeApisRef.current) {
              clearInterval(pollId);
              return;
            }
            try {
              adobeApisRef.current.triggerFileEvent("SAVE").catch(() => {});
            } catch (_) {}
          }, 3000);
          // Store for cleanup
          (window as any).__adobePollId = pollId;
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
      // Clear auto-save poll
      if ((window as any).__adobePollId) {
        clearInterval((window as any).__adobePollId);
        (window as any).__adobePollId = undefined;
      }
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
