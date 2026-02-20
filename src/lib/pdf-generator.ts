import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { AcordFormDefinition } from "./acord-forms";
import { FILLABLE_PDF_PATHS } from "./acord-field-map";
import { FIELD_POSITION_MAP } from "./acord-field-positions";
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

/** Format a value for PDF text overlay */
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

/** Fetch the PDF bytes from /public/acord-fillable/ */
async function fetchPdfBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${path} (${response.status})`);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Primary strategy: load the original ACORD PDF and draw text directly onto
 * each page at our calibrated (x, y) coordinates using pdf-lib's page.drawText().
 *
 * This completely bypasses AcroForm / XFA field detection — we treat the PDF
 * as a background canvas and paint text on top, exactly like the reportlab/pdfrw
 * approach described at https://stackoverflow.com/questions/1180115
 *
 * pdf-lib uses bottom-left origin, so: pdfY = pageHeight - ourY
 */
export async function generateAcordPdfAsync(
  form: AcordFormDefinition,
  data: Record<string, any>,
  _options: PdfGenerateOptions = {}
): Promise<{ save: (filename: string) => void; bytes: Uint8Array; isAcroForm?: boolean }> {
  const pdfPath = FILLABLE_PDF_PATHS[form.id];
  const positions = FIELD_POSITION_MAP[form.id] || {};

  // ── Strategy: draw text directly onto original PDF pages ──
  if (pdfPath && Object.keys(positions).length > 0) {
    try {
      const pdfBytes = await fetchPdfBytes(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
        // Suppress XFA warning — we don't need it, we draw on pages directly
      });

      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Text color: dark navy blue (matching the image overlay color)
      const textColor = rgb(0.05, 0.1, 0.55);

      let drawn = 0;

      for (const [key, pos] of Object.entries(positions)) {
        const raw = data[key];
        if (raw === undefined || raw === null || raw === "") continue;

        let display = formatFieldValue(key, raw);
        if (!display || display === "N/A") continue;

        // Handle booleans / checkboxes
        if (pos.checkbox) {
          const checked = raw === true || raw === "Yes" || raw === "true" || display === "✓";
          if (!checked) continue;
          display = "✓";
        } else {
          if (display === "true") display = "Yes";
          if (display === "false") continue;
        }

        const pageIdx = pos.page;
        if (pageIdx >= pages.length) continue;

        const page = pages[pageIdx];
        const { height: pageHeight } = page.getSize();
        const fontSize = pos.fontSize || 8;

        // Convert our top-left y → pdf-lib bottom-left y
        // Our y is "distance from top", pdf-lib y is "distance from bottom"
        const pdfY = pageHeight - pos.y;

        // Truncate text to fit maxWidth
        const maxW = pos.maxWidth || 200;
        let text = display;
        // Simple truncation: measure and cut
        let textWidth = font.widthOfTextAtSize(text, fontSize);
        while (textWidth > maxW && text.length > 1) {
          text = text.slice(0, -1);
          textWidth = font.widthOfTextAtSize(text + "…", fontSize);
          if (textWidth <= maxW) { text = text + "…"; break; }
        }

        page.drawText(text, {
          x: pos.x,
          y: pdfY,
          size: fontSize,
          font: pos.checkbox ? fontBold : font,
          color: textColor,
          maxWidth: maxW,
          lineHeight: fontSize * 1.2,
        });

        drawn++;
      }

      console.log(`[PDF Overlay] ${form.name}: drew ${drawn} field values onto ${pages.length} pages`);

      const savedBytes = await pdfDoc.save();
      return {
        isAcroForm: true, // treat as "fillable" — center panel will use iframe
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
      console.error("[PDF Overlay] pdf-lib draw failed, falling back to jsPDF:", err);
    }
  }

  // ── Fallback: jsPDF image overlay (for forms with no fillable PDF) ──
  const jsPDF = (await import("jspdf")).default;
  const { formatUSD: fmtUSD } = await import("./acord-autofill");

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (form.pages && form.pages.length > 0) {
    for (let i = 0; i < form.pages.length; i++) {
      if (i > 0) doc.addPage();
      try {
        const imgData = await loadImageAsBase64(form.pages[i]);
        doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      } catch {
        doc.setFontSize(14);
        doc.setTextColor(150);
        doc.text(`${form.name} — Page ${i + 1}`, pageWidth / 2, pageHeight / 2, { align: "center" });
        doc.setTextColor(0);
      }
    }
  }

  doc.setTextColor(13, 25, 140);
  for (const [key, pos] of Object.entries(positions)) {
    const raw = data[key];
    if (raw === undefined || raw === null || raw === "") continue;
    let display = formatFieldValue(key, raw);
    if (!display || display === "N/A") continue;
    const pageIdx = pos.page;
    if (pageIdx >= (form.pages?.length || 0)) continue;
    doc.setPage(pageIdx + 1);
    const fontSize = pos.fontSize || 8;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    if (pos.checkbox) {
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

  const fallbackBytes = doc.output("arraybuffer");
  return {
    isAcroForm: false,
    bytes: new Uint8Array(fallbackBytes),
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
