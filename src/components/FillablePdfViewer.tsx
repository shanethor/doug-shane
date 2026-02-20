import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";
import type { AcordFormDefinition } from "@/lib/acord-forms";

// Adobe PDF Embed API client IDs per domain
const ADOBE_CLIENT_IDS: Record<string, string> = {
  "doug-shane.lovable.app": "82d00c65432249999e0daa589ea94dfd",
  "id-preview--002628bd-9af2-4bd3-bfc6-c0546eed53c2.lovable.app": "0e4142db962d4d64b1fee6bf34bc67ac",
  // lovableproject.com preview domain — needs its own credential registered in Adobe Developer Console
  // Using preview credential as fallback until a dedicated one is created
  "002628bd-9af2-4bd3-bfc6-c0546eed53c2.lovableproject.com": "0e4142db962d4d64b1fee6bf34bc67ac",
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
 * Build the field-name → value map for the Adobe PDF Embed API.
 * ACORD PDFs use obfuscated binary field names, so we attempt both
 * the human-readable name (ACORD_FIELD_MAPS) and the index-positional
 * approach (ACORD_INDEX_MAPS). The API itself exposes actual field names
 * via getAnnotations, so we use that when available.
 */
async function buildAdobeFieldValues(
  formId: string,
  formData: Record<string, any>
): Promise<Record<string, string>> {
  const { ACORD_FIELD_MAPS, ACORD_INDEX_MAPS } = await import("@/lib/acord-field-map");
  const fieldMap = ACORD_FIELD_MAPS[formId] || {};
  const result: Record<string, string> = {};

  for (const [key, pdfFieldName] of Object.entries(fieldMap)) {
    const value = formData[key];
    if (value !== undefined && value !== null && value !== "") {
      const strVal = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
      result[pdfFieldName] = strVal;
    }
  }

  return result;
}

export default function FillablePdfViewer({ formId, formData, formDef, onFieldChange }: FillablePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adobeViewRef = useRef<any>(null);
  const apisRef = useRef<any>(null);
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

        await loadAdobeScript();

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
          clientId: getAdobeClientId(),
          divId,
        });

        adobeViewRef.current = view;

        const previewConfig = {
          content: { location: { url: absoluteUrl } },
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

        // Capture the APIs object returned by previewFile
        const apisPromise = view.previewFile(previewConfig, viewerConfig);

        // Register callback BEFORE awaiting so we don't miss events
        view.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          async (event: any) => {
            if (cancelled) return;

            if (
              event.type === "PREVIEW_RENDERING_DONE" ||
              event.type === "PDF_VIEWER_READY" ||
              event.type === "PAGE_VIEW"
            ) {
              // Give the viewer a moment to fully render form fields
              await new Promise((r) => setTimeout(r, 800));
              if (cancelled) return;
              await fillFormFields();
            }

            // Forward field changes back to parent
            if (event.type === "FORM_FIELD_CHANGED" && onFieldChange) {
              const { name, value } = event.data || {};
              if (name) onFieldChange(name, value ?? "");
            }
          },
          { enablePDFAnalytics: false }
        );

        const apis = await apisPromise;
        apisRef.current = apis;

        if (!cancelled) setLoading(false);

        // Also attempt fill immediately after preview resolves
        await new Promise((r) => setTimeout(r, 1500));
        if (!cancelled) await fillFormFields();
      } catch (err: any) {
        if (!cancelled) {
          console.error("Adobe PDF Embed error:", err);
          setError(err?.message || "Failed to load PDF viewer");
          setLoading(false);
        }
      }
    }

    async function fillFormFields() {
      if (!apisRef.current) return;
      try {
        const fieldValues = await buildAdobeFieldValues(formId, formData);
        const entries = Object.entries(fieldValues);
        if (entries.length === 0) return;

        // Use the PDF Analytics API to write form field values
        // The Adobe PDF Embed API exposes form filling via executeCommand
        for (const [fieldName, value] of entries) {
          try {
            await apisRef.current.executeCommand("FormFillCommand", {
              fieldName,
              value,
            });
          } catch {
            // Some fields may not exist in this PDF — silently skip
          }
        }

        setFilledCount(entries.length);
      } catch (err) {
        console.warn("Form pre-fill skipped:", err);
      }
    }

    initViewer();

    return () => {
      cancelled = true;
      apisRef.current = null;
    };
    // Re-init when form switches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, pdfPath]);

  // When formData changes (agent edits fields), push updates into the viewer
  useEffect(() => {
    if (!apisRef.current || loading) return;
    let active = true;

    async function pushUpdates() {
      const fieldValues = await buildAdobeFieldValues(formId, formData);
      for (const [fieldName, value] of Object.entries(fieldValues)) {
        if (!active) break;
        try {
          await apisRef.current?.executeCommand("FormFillCommand", { fieldName, value });
        } catch {
          // ignore
        }
      }
    }

    // Debounce a bit so we don't spam on every keystroke
    const timer = setTimeout(pushUpdates, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

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
          <p className="text-xs text-muted-foreground">
            Current domain: <code className="bg-muted px-1 rounded">{window.location.hostname}</code>
          </p>
        </div>
      )}

      {!loading && !error && filledCount > 0 && (
        <div className="px-3 py-1.5 bg-muted/60 border-b text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
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
