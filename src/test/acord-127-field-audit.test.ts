import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe("ACORD 127 Field Audit", () => {
  it("dump ALL fields with index, type, and name", async () => {
    const bytes = loadPdf("127");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    console.log(`Total 127 fields: ${fields.length}`);
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const t = f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTH";
      console.log(`[${i}] ${t} ${f.getName()}`);
    }
    expect(fields.length).toBeGreaterThan(0);
  });
});
