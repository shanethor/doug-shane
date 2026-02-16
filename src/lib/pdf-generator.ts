import jsPDF from "jspdf";
import type { AcordFormDefinition } from "./acord-forms";
import { FIELD_POSITION_MAP } from "./acord-field-positions";
import { formatUSD, CURRENCY_FIELDS } from "./acord-autofill";

/**
 * Load an image from a URL and return as base64 data URL
 */
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

/** Format a date string as MM/DD/YYYY for PDF display */
function formatDateForPdf(val: string): string {
  if (!val) return "";
  // Handle YYYY-MM-DD
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  return val;
}

/** Format a value for PDF overlay display */
function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val);
  if (s === "true") return "✓";
  if (s === "false") return "";
  if (CURRENCY_FIELDS.has(key)) return formatUSD(s);
  if (key.includes("date") || key.includes("eff_") || key.includes("exp_")) return formatDateForPdf(s);
  return s;
}

/**
 * Generate an ACORD PDF that embeds actual form page images
 * and overlays filled field values at correct positions.
 */
export async function generateAcordPdfAsync(
  form: AcordFormDefinition,
  data: Record<string, any>
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const positions = FIELD_POSITION_MAP[form.id] || {};

  // Phase 1: Embed actual ACORD form page images
  if (form.pages && form.pages.length > 0) {
    for (let i = 0; i < form.pages.length; i++) {
      if (i > 0) doc.addPage();
      try {
        const imgData = await loadImageAsBase64(form.pages[i]);
        doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      } catch (err) {
        console.warn(`Could not load page image ${form.pages[i]}:`, err);
        doc.setFontSize(14);
        doc.setTextColor(150);
        doc.text(`${form.name} — Page ${i + 1}`, pageWidth / 2, pageHeight / 2, { align: "center" });
        doc.setTextColor(0);
      }
    }
  }

  // Phase 2: Overlay field data at mapped positions
  doc.setTextColor(0, 0, 140); // Dark blue for filled values
  for (const [key, pos] of Object.entries(positions)) {
    const raw = data[key];
    if (raw === undefined || raw === null || raw === "") continue;

    const display = formatFieldValue(key, raw);
    if (!display) continue;

    const pageIdx = pos.page;
    if (pageIdx >= (form.pages?.length || 0)) continue;

    doc.setPage(pageIdx + 1);
    const fontSize = pos.fontSize || 8;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");

    if (pos.checkbox) {
      // Render check mark
      if (display === "✓" || raw === true || raw === "Yes") {
        doc.setFontSize(12);
        doc.text("✓", pos.x, pos.y);
      }
    } else {
      const maxW = pos.maxWidth || 200;
      const lines = doc.splitTextToSize(display, maxW);
      doc.text(lines, pos.x, pos.y);
    }
  }

  doc.setTextColor(0);
  return doc;
}
