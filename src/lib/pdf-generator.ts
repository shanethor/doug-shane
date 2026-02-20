import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from "pdf-lib";
import type { AcordFormDefinition } from "./acord-forms";
import { ACORD_FIELD_MAPS, ACORD_INDEX_MAPS, FILLABLE_PDF_PATHS } from "./acord-field-map";
import { formatUSD, CURRENCY_FIELDS } from "./acord-autofill";

export type PdfGenerateOptions = {
  /** If true, flatten the form (bake fields in) for download. If false, keep interactive. Default: true */
  flatten?: boolean;
};

/** Format a date string as MM/DD/YYYY for PDF display */
function formatDateForPdf(val: string): string {
  if (!val) return "";
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  return val;
}

/** Format a value for PDF field entry */
function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val);
  if (s === "false") return "";
  if (CURRENCY_FIELDS.has(key)) return formatUSD(s);
  if (key.includes("date") || key.includes("eff_") || key.includes("exp_") || key.endsWith("_dob")) {
    return formatDateForPdf(s);
  }
  return s;
}

/** Fetch the fillable PDF bytes from /public/acord-fillable/ */
async function fetchPdfBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${path} (${response.status})`);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Build a lookup map of PDF field names → field objects.
 * Includes both exact names and normalized (uppercase, trimmed) for fuzzy matching.
 */
function buildFieldLookup(form: ReturnType<PDFDocument["getForm"]>) {
  const fields = form.getFields();
  const exact: Map<string, typeof fields[0]> = new Map();
  const normalized: Map<string, typeof fields[0]> = new Map();

  for (const field of fields) {
    const name = field.getName();
    exact.set(name, field);
    // Normalized: uppercase, collapse whitespace, strip special chars for fuzzy matching
    const norm = name.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    normalized.set(norm, field);
  }

  return { exact, normalized, all: fields };
}

/**
 * Attempt to set a field value. Handles TextField, CheckBox, Dropdown, RadioGroup.
 */
function trySetField(field: any, value: string, key: string): boolean {
  try {
    if (field instanceof PDFTextField) {
      field.setText(value || "");
      // Do NOT call enableReadOnly() — keeps field editable by user in viewer
      return true;
    }
    if (field instanceof PDFCheckBox) {
      const checked = value === "true" || value === "Yes" || value === "✓" || value === "1";
      if (checked) field.check();
      else field.uncheck();
      return true;
    }
    if (field instanceof PDFDropdown) {
      const opts = field.getOptions();
      // Try exact match first, then case-insensitive
      const match = opts.find(o => o === value) || opts.find(o => o.toLowerCase() === value.toLowerCase());
      if (match) {
        field.select(match);
        return true;
      }
      // Fall back to setting as text if possible
      return false;
    }
    if (field instanceof PDFRadioGroup) {
      const opts = field.getOptions();
      const match = opts.find(o => o === value) || opts.find(o => o.toLowerCase() === value.toLowerCase());
      if (match) {
        field.select(match);
        return true;
      }
      return false;
    }
  } catch (e) {
    // Silently ignore field errors — partial fill is better than failure
  }
  return false;
}

/**
 * Main PDF generator.
 *
 * TWO PATHS intentionally split:
 *   flatten=false  (interactive viewer)  → pdf-lib AcroForm fill
 *                                           Strips /Encrypt so Adobe shows "Unprotected"
 *                                           and allows in-viewer editing.
 *   flatten=true   (download)            → jsPDF image-overlay
 *                                           Renders page screenshots as PDF background
 *                                           and overlays text at calibrated positions.
 *                                           This preserves 100% of the original ACORD
 *                                           visual formatting — no XFA loss.
 */
export async function generateAcordPdfAsync(
  form: AcordFormDefinition,
  data: Record<string, any>,
  options: PdfGenerateOptions = {}
): Promise<{ save: (filename: string) => void; bytes: Uint8Array }> {
  const { flatten = true } = options;
  const pdfPath = FILLABLE_PDF_PATHS[form.id];
  const fieldMap = ACORD_FIELD_MAPS[form.id] || {};

  // ── DOWNLOAD path: jsPDF image overlay (preserves original ACORD formatting) ──
  // pdf-lib strips XFA data which is responsible for form layout/appearance.
  // For download we render the original page screenshot as a background and
  // overlay the filled values at calibrated pixel positions.
  if (flatten && form.pages && form.pages.length > 0) {
    return generateJsPdfOverlay(form, data);
  }

  // ── VIEWER path: pdf-lib AcroForm fill (keeps fields interactive) ──
  if (pdfPath) {
    try {
      const pdfBytes = await fetchPdfBytes(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      // ── Strip the /Encrypt entry from the trailer so Adobe does NOT show
      //    the "Protected" badge. pdf-lib loads the encrypted PDF fine but
      //    preserves the /Encrypt object in the saved output unless we remove it.
      try {
        const ctx = (pdfDoc as any).context;
        // Remove from trailerInfo (used during serialization)
        if (ctx?.trailerInfo) ctx.trailerInfo.Encrypt = undefined;
        // Also remove from the trailer PDFDict directly
        if (ctx?.trailer) {
          const { PDFName } = await import("pdf-lib");
          ctx.trailer.delete(PDFName.of("Encrypt"));
        }
      } catch (_) { /* best-effort */ }

      const pdfForm = pdfDoc.getForm();
      const allFields = pdfForm.getFields();

      // Remove read-only flag from every field so Adobe viewer allows editing
      for (const field of allFields) {
        try { field.disableReadOnly(); } catch (_) { /* ignore */ }
        // Also clear the ProtectMDP/DocMDP transform reference if present
        try {
          const fieldDict = (field as any).acroField?.dict;
          if (fieldDict) {
            const { PDFName } = await import("pdf-lib");
            fieldDict.delete(PDFName.of("Lock"));
          }
        } catch (_) { /* best-effort */ }
      }

      console.log(`[PDF Fields] ${form.name}: ${allFields.length} fields total`);

      const indexMap = ACORD_INDEX_MAPS[form.id];
      const { exact, normalized } = buildFieldLookup(pdfForm);

      let filled = 0;
      let missed = 0;
      const missedKeys: string[] = [];

      for (const [ourKey, value] of Object.entries(data)) {
        if (value === undefined || value === null || value === "") continue;
        const displayVal = formatFieldValue(ourKey, value);
        if (!displayVal) continue;

        let field: (typeof allFields)[0] | undefined;

        // ── Strategy 1: index-based (primary for ACORD PDFs with obfuscated names) ──
        if (indexMap && ourKey in indexMap) {
          const idx = indexMap[ourKey];
          if (idx >= 0 && idx < allFields.length) {
            field = allFields[idx];
          }
        }

        // ── Strategy 2: exact name match ──
        if (!field) {
          const pdfFieldName = fieldMap[ourKey];
          if (pdfFieldName) field = exact.get(pdfFieldName);
        }

        // ── Strategy 3: normalized fuzzy match on our key ──
        if (!field) {
          const normKey = ourKey.toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
          field = normalized.get(normKey);
        }

        // ── Strategy 4: normalized fuzzy match on mapped name ──
        if (!field) {
          const pdfFieldName = fieldMap[ourKey];
          if (pdfFieldName) {
            const normTarget = pdfFieldName.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
            field = normalized.get(normTarget);
          }
        }

        if (field) {
          const success = trySetField(field, displayVal, ourKey);
          if (success) filled++;
          else missed++;
        } else {
          missed++;
          if (indexMap && ourKey in indexMap) missedKeys.push(`${ourKey} → index ${indexMap[ourKey]} (out of range?)`);
          else if (fieldMap[ourKey]) missedKeys.push(`${ourKey} → "${fieldMap[ourKey]}"`);
        }
      }

      console.log(`[PDF Fill] ${form.name}: ${filled} filled, ${missed} missed`);
      if (missedKeys.length) console.log(`[PDF Misses]`, missedKeys);

      // Flatten the form so fields are baked in (skip for interactive viewer)
      if (flatten) {
        try {
          pdfForm.flatten();
        } catch (flattenErr) {
          console.warn("[PDF Fill] Could not flatten:", flattenErr);
        }
      }

      // Also remove DocMDP / MarkInfo / Perms entries from the catalog — these are
      // a second source of the "Protected" badge independent of /Encrypt.
      try {
        const { PDFName } = await import("pdf-lib");
        const catalog = pdfDoc.catalog;
        catalog.delete(PDFName.of("Perms"));
        catalog.delete(PDFName.of("MarkInfo"));
        // Remove AcroForm/SigFlags which lock the form
        const acroForm = catalog.lookup(PDFName.of("AcroForm")) as any;
        if (acroForm?.delete) {
          acroForm.delete(PDFName.of("SigFlags"));
          acroForm.delete(PDFName.of("XFA")); // strip XFA so Adobe uses AcroForm rendering
        }
      } catch (_) { /* best-effort */ }

      // useObjectStreams: false produces a more broadly compatible PDF that Adobe
      // Embed API can parse correctly even after XFA data has been stripped.
      const savedBytes = await pdfDoc.save({ useObjectStreams: false });
      return {
        bytes: savedBytes,
        save: (filename: string) => {
          const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        },
      };
    } catch (err) {
      console.error("[PDF Fill] pdf-lib fill failed, falling back to image overlay:", err);
    }
  }

  // Final fallback if pdf-lib failed and no pages exist
  return generateJsPdfOverlay(form, data);
}

/**
 * jsPDF image-overlay renderer.
 * Uses the ACORD page screenshots as PDF backgrounds and overlays field values
 * at calibrated positions. Produces a visually identical download with filled data.
 */
async function generateJsPdfOverlay(
  form: AcordFormDefinition,
  data: Record<string, any>
): Promise<{ save: (filename: string) => void; bytes: Uint8Array }> {
  const jsPDF = (await import("jspdf")).default;
  const { FIELD_POSITION_MAP } = await import("./acord-field-positions");

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const positions = FIELD_POSITION_MAP[form.id] || {};

  // Render each page as a background image
  for (let i = 0; i < (form.pages?.length || 0); i++) {
    if (i > 0) doc.addPage();
    try {
      const imgData = await loadImageAsBase64(form.pages![i]);
      doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
    } catch {
      doc.setFontSize(14);
      doc.setTextColor(150);
      doc.text(`${form.name} — Page ${i + 1}`, pageWidth / 2, pageHeight / 2, { align: "center" });
      doc.setTextColor(0);
    }
  }

  // Overlay filled values in dark navy (matches ACORD form ink colour)
  doc.setTextColor(10, 20, 80);
  for (const [key, pos] of Object.entries(positions)) {
    const raw = data[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const display = formatFieldValue(key, raw);
    if (!display || display === "N/A") continue;
    if (pos.page >= (form.pages?.length || 0)) continue;
    doc.setPage(pos.page + 1);
    const fontSize = pos.fontSize || 8;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    if (pos.checkbox) {
      if (display === "✓" || raw === true || raw === "Yes") {
        doc.setFontSize(11);
        doc.text("✓", pos.x, pos.y);
      }
    } else {
      const maxW = pos.maxWidth || 200;
      const lines = doc.splitTextToSize(display, maxW);
      doc.text(lines, pos.x, pos.y);
    }
  }
  doc.setTextColor(0);

  const outBytes = doc.output("arraybuffer");
  return {
    bytes: new Uint8Array(outBytes),
    save: (filename: string) => doc.save(filename),
  };
}

async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
