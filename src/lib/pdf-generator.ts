import jsPDF from "jspdf";
import type { AcordFormDefinition } from "./acord-forms";

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

/**
 * Generate an ACORD PDF that embeds the actual form page images first,
 * then appends structured data pages so the output visually matches the real forms.
 */
export async function generateAcordPdfAsync(
  form: AcordFormDefinition,
  data: Record<string, any>
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Phase 1: Embed actual ACORD form page images
  if (form.pages && form.pages.length > 0) {
    for (let i = 0; i < form.pages.length; i++) {
      if (i > 0) doc.addPage();
      try {
        const imgData = await loadImageAsBase64(form.pages[i]);
        // Fit image to page with proper aspect ratio
        doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      } catch (err) {
        console.warn(`Could not load page image ${form.pages[i]}:`, err);
        // Fallback: blank page with form name
        doc.setFontSize(14);
        doc.setTextColor(150);
        doc.text(`${form.name} — Page ${i + 1}`, pageWidth / 2, pageHeight / 2, { align: "center" });
        doc.setTextColor(0);
      }
    }
  }

  // No structured data pages — the ACORD form images ARE the compliant output.
  // Data is shown in the left-panel fields; the PDF must match the official template.

  return doc;
}
