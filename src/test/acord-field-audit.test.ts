import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe("ACORD 125 Field Audit", () => {
  it("should enumerate all fields from index 242 to 551", async () => {
    const bytes = loadPdf("125");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    
    const results: string[] = [];
    for (let i = 242; i < Math.min(fields.length, 552); i++) {
      const f = fields[i];
      const type = f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTHER";
      results.push(`[${i}] ${type} ${f.getName()}`);
    }
    
    console.log("=== ACORD 125 UNMAPPED FIELDS (242-551) ===");
    console.log(results.join("\n"));
    
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("ACORD 126 Field Audit", () => {
  it("should enumerate all fields from index 79 to end", async () => {
    const bytes = loadPdf("126");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    
    const results: string[] = [];
    for (let i = 79; i < fields.length; i++) {
      const f = fields[i];
      const type = f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTHER";
      results.push(`[${i}] ${type} ${f.getName()}`);
    }
    
    console.log("=== ACORD 126 UNMAPPED FIELDS (79-end) ===");
    console.log(results.join("\n"));
    
    expect(results.length).toBeGreaterThan(0);
  });
});
