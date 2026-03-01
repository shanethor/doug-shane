import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface BorData {
  insuredName: string;
  insuredAddress: string;
  carrierName: string;
  policyNumber: string;
  policyEffectiveDate: string;
  policyExpirationDate: string;
  selectedLines: string[];
  producerName: string;
  producerEmail: string;
  producerPhone: string;
  agencyName?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

/**
 * Generate a professional BOR letter PDF matching the Major League BOR format.
 * Returns a Uint8Array of the PDF.
 */
export async function generateBorPdf(data: BorData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Letter size
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const margin = 72;
  const pw = 612 - margin * 2;
  let y = 720;

  const drawText = (text: string, x: number, yPos: number, size = 11, bold = false) => {
    page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
  };

  const drawWrappedText = (text: string, x: number, startY: number, maxWidth: number, size = 11, lineHeight = 16) => {
    const words = text.split(" ");
    let line = "";
    let curY = startY;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(test, size);
      if (testWidth > maxWidth && line) {
        page.drawText(line, { x, y: curY, size, font, color: rgb(0, 0, 0) });
        curY -= lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x, y: curY, size, font, color: rgb(0, 0, 0) });
      curY -= lineHeight;
    }
    return curY;
  };

  // Insured name & address (top)
  drawText(data.insuredName, margin, y, 14, true);
  y -= 18;
  if (data.insuredAddress) {
    drawText(data.insuredAddress, margin, y, 11);
    y -= 18;
  }

  // Date
  const today = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  drawText(today, margin, y, 11);
  y -= 30;

  // Agency block
  const agency = data.agencyName || "AURA Risk Group";
  drawText(agency, margin, y, 12, true);
  y -= 16;
  if (data.producerName) { drawText(data.producerName, margin, y, 11); y -= 14; }
  if (data.producerEmail) { drawText(data.producerEmail, margin, y, 11); y -= 14; }
  if (data.producerPhone) { drawText(data.producerPhone, margin, y, 11); y -= 14; }
  y -= 20;

  // RE line
  drawText(`RE: ${data.insuredName}`, margin, y, 12, true);
  y -= 20;

  // Subject
  drawText("Subject: Broker of Record", margin, y, 12, true);
  y -= 18;

  // Policy details
  if (data.carrierName) { drawText(`Carrier: ${data.carrierName}`, margin, y, 11); y -= 16; }
  const period = [formatDate(data.policyEffectiveDate), formatDate(data.policyExpirationDate)].filter(Boolean).join(" – ");
  if (period) { drawText(`Policy Period: ${period}`, margin, y, 11); y -= 16; }
  if (data.policyNumber) { drawText(`Policy #: ${data.policyNumber}`, margin, y, 11); y -= 16; }
  if (data.selectedLines.length > 0) {
    drawText(`Coverage: ${data.selectedLines.join(", ")}`, margin, y, 11);
    y -= 16;
  }
  y -= 10;

  // Salutation
  drawText("To Whom It May Concern:", margin, y, 11);
  y -= 22;

  // Body paragraph 1
  const effectiveDateStr = formatDate(data.policyEffectiveDate) || "immediately";
  const body1 = `This letter confirms that effective upon renewal, ${effectiveDateStr}, we have appointed ${agency} as our retail agent with respect to the ${data.selectedLines.join(", ") || "insurance program"} with ${data.carrierName || "the current carrier"}.`;
  y = drawWrappedText(body1, margin, y, pw, 11, 16);
  y -= 6;

  // Body paragraph 2
  const body2 = `This appointment of ${agency} rescinds all previous appointments, and this authority shall remain in full force until cancelled by us in writing. ${agency} are hereby authorized to negotiate directly with any insurance company on our behalf and make any and all changes to all existing policies captioned, or binders in effect, including cancellations.`;
  y = drawWrappedText(body2, margin, y, pw, 11, 16);
  y -= 6;

  // Body paragraph 3
  const body3 = `This letter also constitutes the authority to ${agency} with all information that they may request as it pertains to the above referenced insurance.`;
  y = drawWrappedText(body3, margin, y, pw, 11, 16);
  y -= 24;

  // Closing
  drawText("Sincerely,", margin, y, 11);
  y -= 40;

  // Signature line
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 250, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 14;
  drawText("Signature & Date", margin, y, 9);
  y -= 24;

  // Printed name line
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 250, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 14;
  drawText("Printed Name", margin, y, 9);

  return doc.save();
}

/**
 * Apply a signature image (base64 PNG data URL) onto an existing BOR PDF.
 * Overlays the signature on the signature line and adds date + printed name.
 */
export async function applySignatureToBorPdf(
  borPdfBytes: Uint8Array,
  signatureDataUrl: string,
  signerName: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(borPdfBytes);
  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const margin = 72;

  // Decode signature image
  const sigBytes = Uint8Array.from(atob(signatureDataUrl.split(",")[1]), c => c.charCodeAt(0));
  const sigImage = await doc.embedPng(sigBytes);
  const sigDims = sigImage.scale(0.4);

  // Find approximate signature location — we know it's near the bottom
  // The signature line is roughly at y=200 area based on our generation
  const sigY = 195;
  page.drawImage(sigImage, {
    x: margin + 5,
    y: sigY + 2,
    width: Math.min(sigDims.width, 200),
    height: Math.min(sigDims.height, 40),
  });

  // Add date next to signature
  const today = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  page.drawText(today, { x: margin + 260, y: sigY + 10, size: 11, font, color: rgb(0, 0, 0) });

  // Add printed name below signature line
  const nameY = sigY - 38;
  page.drawText(signerName, { x: margin + 5, y: nameY + 16, size: 11, font, color: rgb(0, 0, 0) });

  return doc.save();
}

/**
 * Download a PDF as a file.
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
