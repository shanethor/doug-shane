import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe("ACORD 125 Field Audit - Part 2", () => {
  it("should enumerate fields 370-551", async () => {
    const bytes = loadPdf("125");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    
    const results: string[] = [];
    for (let i = 370; i < Math.min(fields.length, 552); i++) {
      const f = fields[i];
      const type = f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTHER";
      results.push(`[${i}] ${type} ${f.getName()}`);
    }
    
    console.log("=== ACORD 125 FIELDS (370-551) ===");
    console.log(results.join("\n"));
    
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("ACORD 126 Field Audit - Full", () => {
  it("should enumerate ALL fields", async () => {
    const bytes = loadPdf("126");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    
    const results: string[] = [];
    for (let i = 79; i < fields.length; i++) {
      const f = fields[i];
      const type = f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTHER";
      results.push(`[${i}] ${type} ${f.getName()}`);
    }
    
    console.log(`=== ACORD 126 FIELDS (79-${fields.length - 1}) total=${fields.length} ===`);
    console.log(results.join("\n"));
    
    expect(results.length).toBeGreaterThan(0);
  });
});
