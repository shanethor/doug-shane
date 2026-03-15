import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface LossRunPdfData {
  named_insured: string;
  insured_address?: string;
  insured_city?: string;
  insured_state?: string;
  insured_zip?: string;
  insured_phone?: string;
  signer_name: string;
  signer_title?: string;
  signer_email: string;
  producer_email?: string;
  producer_fax?: string;
  carrier_name?: string;
  policy_type?: string;
  policy_number?: string;
  years_requested?: number;
  policies?: {
    carrier_name: string;
    policy_type?: string;
    policy_number: string;
    effective_start?: string;
    effective_end?: string;
  }[];
}

export async function generateLossRunPdf(data: LossRunPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  const margin = 72;
  let y = height - margin;
  const fontSize = 11;
  const lineHeight = 16;

  const drawText = (text: string, options?: { bold?: boolean; size?: number }) => {
    const f = options?.bold ? boldFont : font;
    const s = options?.size || fontSize;
    page.drawText(text, { x: margin, y, font: f, size: s, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  };

  const drawLine = () => { y -= 8; };

  // Date
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  drawText(dateStr);
  drawLine();

  // RE block
  drawText("RE: Loss Run Request", { bold: true, size: 13 });
  y -= 4;
  drawText(`Named Insured: ${data.named_insured}`);

  // If multi-policy, list each
  const policies = data.policies && data.policies.length > 0 ? data.policies : [
    {
      carrier_name: data.carrier_name || "",
      policy_type: data.policy_type || "",
      policy_number: data.policy_number || "",
    },
  ];

  for (const pol of policies) {
    if (pol.carrier_name) drawText(`Insurance Carrier: ${pol.carrier_name}`);
    if (pol.policy_type) drawText(`Policy Type: ${pol.policy_type}`);
    if (pol.policy_number) drawText(`Policy Number: ${pol.policy_number}`);
    if (policies.length > 1) drawLine();
  }

  drawLine();

  // Body
  drawText("To Whom It May Concern,");
  drawLine();

  const yearsStr = String(data.years_requested || 5);
  const bodyParagraphs = [
    `On behalf of ${data.named_insured}, I hereby request a copy of the entire History / a current Loss Run for policies listed above, and any for other policies that pertain to ${data.named_insured} for the past ${yearsStr} years.`,
    "",
    `Please send the requested information to my attention${data.producer_fax ? ` by fax at ${data.producer_fax}` : ""} and by e-mail to ${data.signer_email}${data.producer_email ? ` and ${data.producer_email}` : ""}.`,
    "",
    `Please do not delay in forwarding the requested information. Should any questions arise please contact me immediately${data.insured_phone ? ` at ${data.insured_phone}` : ""}.`,
    "",
    "Thank you in advance,",
  ];

  for (const line of bodyParagraphs) {
    if (line === "") {
      drawLine();
    } else {
      // Word wrap at ~75 chars
      const words = line.split(" ");
      let currentLine = "";
      for (const word of words) {
        if ((currentLine + " " + word).length > 75 && currentLine.length > 0) {
          drawText(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      if (currentLine) drawText(currentLine);
    }
  }

  drawLine();
  drawText("Sincerely,");
  drawLine();
  drawLine();

  // Signature line
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: margin + 200, y: y + 8 },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 4;
  drawText(data.signer_name, { bold: true });
  if (data.signer_title) drawText(data.signer_title);

  return pdfDoc.save();
}

export async function addSignatureToPdf(
  pdfBytes: Uint8Array,
  signatureBase64: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  // Decode signature PNG
  const sigData = signatureBase64.replace(/^data:image\/png;base64,/, "");
  const sigImage = await pdfDoc.embedPng(
    Uint8Array.from(atob(sigData), (c) => c.charCodeAt(0))
  );

  const sigDims = sigImage.scale(0.4);
  const margin = 72;

  // Place signature above the signature line area
  page.drawImage(sigImage, {
    x: margin,
    y: 180,
    width: sigDims.width,
    height: sigDims.height,
  });

  return pdfDoc.save();
}
