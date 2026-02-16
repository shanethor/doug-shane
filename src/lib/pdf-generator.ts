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

  // Phase 2: Append structured data pages
  doc.addPage();
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Data header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 45, 90);
  doc.text(`${form.name} — Field Data`, margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(form.fullName, margin, y);
  y += 12;
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0);
  y += 18;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Group fields by section
  const sections: Record<string, typeof form.fields> = {};
  for (const field of form.fields) {
    if (!sections[field.section]) sections[field.section] = [];
    sections[field.section].push(field);
  }

  for (const [sectionName, fields] of Object.entries(sections)) {
    checkPage(40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 120);
    doc.text(sectionName.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(30, 60, 120);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setTextColor(0);
    doc.setDrawColor(200);
    y += 14;

    for (const field of fields) {
      checkPage(32);
      const value = data[field.key];
      const displayValue = value
        ? Array.isArray(value)
          ? value.join(", ")
          : String(value)
        : "";

      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100);
      doc.text(field.label.toUpperCase(), margin, y);
      y += 10;

      // Value
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);

      if (field.type === "textarea" && displayValue.length > 80) {
        const lines = doc.splitTextToSize(displayValue, contentWidth);
        for (const line of lines) {
          checkPage(14);
          doc.text(line, margin, y);
          y += 13;
        }
      } else {
        doc.text(displayValue || "—", margin, y);
        y += 13;
      }

      // Field underline
      doc.setDrawColor(230);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    y += 6;
  }

  return doc;
}

/**
 * Synchronous fallback (no images) — used when async isn't suitable.
 */
export function generateAcordPdf(
  form: AcordFormDefinition,
  data: Record<string, any>
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(form.name, margin, y);
  y += 18;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(form.fullName, margin, y);
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0);
  y += 20;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Group fields by section
  const sections: Record<string, typeof form.fields> = {};
  for (const field of form.fields) {
    if (!sections[field.section]) sections[field.section] = [];
    sections[field.section].push(field);
  }

  for (const [sectionName, fields] of Object.entries(sections)) {
    checkPage(40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 120);
    doc.text(sectionName.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(30, 60, 120);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setTextColor(0);
    doc.setDrawColor(200);
    y += 14;

    for (const field of fields) {
      checkPage(32);
      const value = data[field.key];
      const displayValue = value
        ? Array.isArray(value)
          ? value.join(", ")
          : String(value)
        : "";

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100);
      doc.text(field.label.toUpperCase(), margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);

      if (field.type === "textarea" && displayValue.length > 80) {
        const lines = doc.splitTextToSize(displayValue, contentWidth);
        for (const line of lines) {
          checkPage(14);
          doc.text(line, margin, y);
          y += 13;
        }
      } else {
        doc.text(displayValue || "—", margin, y);
        y += 13;
      }

      doc.setDrawColor(230);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    y += 6;
  }

  return doc;
}
