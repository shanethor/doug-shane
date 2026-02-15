import jsPDF from "jspdf";
import type { AcordFormDefinition } from "./acord-forms";

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
