import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe("ACORD 126 tail", () => {
  it("fields 120-255", async () => {
    const bytes = loadPdf("126");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    for (let i = 120; i < fields.length; i++) {
      const f = fields[i];
      const t = f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTH";
      console.log(`[${i}] ${t} ${f.getName()}`);
    }
    expect(true).toBe(true);
  });
});
