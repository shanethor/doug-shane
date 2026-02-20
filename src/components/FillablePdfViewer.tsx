import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";
import type { AcordFormDefinition } from "@/lib/acord-forms";

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

/**
 * Pre-fill the PDF using pdf-lib and the index-based field maps.
 * ACORD PDFs use binary-obfuscated field names — we use positional index access.
 * Returns a blob URL for the pre-filled PDF and a reverse map (pdfFieldName → internalKey).
 */
async function prefillPdfWithData(
  pdfPath: string,
  formId: string,
  formData: Record<string, any>
): Promise<{ blobUrl: string; reverseMap: Record<string, string>; filledCount: number }> {
  const { ACORD_INDEX_MAPS, ACORD_FIELD_MAPS } = await import("@/lib/acord-field-map");

  const absoluteUrl = `${window.location.origin}${pdfPath}`;
  const response = await fetch(absoluteUrl);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
  const pdfBytes = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBytes), {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const reverseMap: Record<string, string> = {};
  let filledCount = 0;

  // Strategy 1: Index-based (primary — bypasses obfuscated field names)
  const indexMap = ACORD_INDEX_MAPS[formId];
  if (indexMap && fields.length > 0) {
    for (const [key, idx] of Object.entries(indexMap)) {
      const field = fields[idx];
      if (!field) continue;

      // Build reverse map while we have the real field name
      reverseMap[field.getName()] = key;

      const value = formData[key];
      if (value === undefined || value === null || value === "") continue;

      const strVal = typeof value === "boolean"
        ? (value ? "Yes" : "No")
        : String(value);

      try {
        if (field instanceof PDFTextField) {
          field.setText(strVal);
          filledCount++;
        } else if (field instanceof PDFCheckBox) {
          const isChecked = value === true || strVal === "Yes" || strVal === "true" || strVal === "X";
          if (isChecked) field.check();
          else field.uncheck();
          filledCount++;
        }
      } catch {
        // skip read-only or otherwise inaccessible fields
      }
    }
  }

  // Strategy 2: Name-based fallback (for forms without an index map, e.g. ACORD 125, 25)
  if (!indexMap || filledCount === 0) {
    const nameMap = ACORD_FIELD_MAPS[formId] || {};
    for (const [key, pdfFieldName] of Object.entries(nameMap)) {
      const value = formData[key];
      if (value === undefined || value === null || value === "") continue;

      const strVal = typeof value === "boolean"
        ? (value ? "Yes" : "No")
        : String(value);

      try {
        const field = form.getFieldMaybe(pdfFieldName);
        if (!field) continue;
        reverseMap[field.getName()] = key;

        if (field instanceof PDFTextField) {
          field.setText(strVal);
          filledCount++;
        } else if (field instanceof PDFCheckBox) {
          const isChecked = value === true || strVal === "Yes" || strVal === "true" || strVal === "X";
          if (isChecked) field.check();
          else field.uncheck();
          filledCount++;
        }
      } catch {
        // field name not found or read-only
      }
    }
  }

  const filledBytes = await pdfDoc.save();
  const blob = new Blob([filledBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);

  return { blobUrl, reverseMap, filledCount };
}

export default function FillablePdfViewer({ formId, formData, formDef, onFieldChange }: FillablePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adobeViewRef = useRef<any>(null);
  const reverseMapRef = useRef<Record<string, string>>({});
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filledCount, setFilledCount] = useState(0);
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

        // Step 1: Pre-fill the PDF using pdf-lib (index-based, bypasses obfuscated names)
        let pdfUrl: string;
        let count = 0;
        try {
          const result = await prefillPdfWithData(pdfPath, formId, formData);
          pdfUrl = result.blobUrl;
          count = result.filledCount;
          reverseMapRef.current = result.reverseMap;

          // Clean up old blob URL
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          blobUrlRef.current = pdfUrl;
        } catch (fillErr) {
          console.warn("pdf-lib pre-fill failed, using original PDF:", fillErr);
          pdfUrl = `${window.location.origin}${pdfPath}`;
        }

        if (cancelled) return;

        // Step 2: Load the Adobe PDF Embed SDK
        await loadAdobeScript();

        await new Promise<void>((resolve) => {
          if (window.AdobeDC) {
            resolve();
          } else {
            document.addEventListener("adobe_dc_view_sdk.ready", () => resolve(), { once: true });
          }
        });

        if (cancelled) return;

        const view = new window.AdobeDC.View({
          clientId: getAdobeClientId(),
          divId,
        });

        adobeViewRef.current = view;

        const previewConfig = {
          content: { location: { url: pdfUrl } },
          metaData: { fileName: `ACORD ${formId.replace("acord-", "")}.pdf` },
        };

        const viewerConfig = {
          embedMode: "IN_LINE",
          showAnnotationTools: false,
          showLeftHandPanel: false,
          showPageControls: true,
          showDownloadPDF: true,
          showPrintPDF: true,
          enableFormFilling: true,
        };

        // Register callback for field change sync BEFORE previewFile
        view.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            if (cancelled) return;

            // Sync edits made in the Adobe viewer back to the left panel
            if (event.type === "FORM_FIELD_CHANGED" && onFieldChange) {
              const { name, value } = event.data || {};
              if (name) {
                // Try to reverse-map from the PDF's real field name to our internal key
                const internalKey = reverseMapRef.current[name] || name;
                onFieldChange(internalKey, value ?? "");
              }
            }
          },
          { enablePDFAnalytics: false }
        );

        await view.previewFile(previewConfig, viewerConfig);

        if (cancelled) return;
        setLoading(false);
        setFilledCount(count);
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
    // Re-init when form switches — formData captured at mount time for initial fill
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, pdfPath]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
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

  return (
    <div className="flex flex-col h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground z-10 bg-background/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Preparing pre-filled PDF…</span>
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
          <p className="text-xs text-muted-foreground">
            Current domain: <code className="bg-muted px-1 rounded">{window.location.hostname}</code>
          </p>
        </div>
      )}

      {!loading && !error && filledCount > 0 && (
        <div className="px-3 py-1.5 bg-muted/60 border-b text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          Pre-filled {filledCount} field{filledCount !== 1 ? "s" : ""} from extracted data
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
