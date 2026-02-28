import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// Map of form key → expected PDF Question field name (clean name)
const YN_MAPPINGS_125: Record<string, string> = {
  subsidiary_of_another:      "CommercialPolicy_Question_AAICode_A",
  has_subsidiaries:           "CommercialPolicy_Question_AAJCode_A",
  safety_program:             "CommercialPolicy_Question_KAACode_A",
  exposure_flammables:        "CommercialPolicy_Question_ABCCode_A",
  other_insurance_same_company:"CommercialPolicy_Question_AAHCode_A",
  policy_declined_cancelled:  "CommercialPolicy_Question_AACCode_A",
  fraud_conviction:           "CommercialPolicy_Question_KABCode_A",
  bankruptcy:                 "CommercialPolicy_Question_KAKCode_A",
  foreign_operations:         "CommercialPolicy_Question_KACCode_A",
  operates_drones:            "CommercialPolicy_Question_KANCode_A",
};

describe("ACORD 125 Y/N Field Round-Trip", () => {
  it("should write Yes/No values to Question_*Code text fields and read them back", async () => {
    const bytes = loadPdf("125");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const allFields = doc.getForm().getFields();

    // Build clean name → index map
    const cleanMap: Record<string, number> = {};
    allFields.forEach((f, i) => {
      const clean = f.getName()
        .replace(/^F\[0\]\.P\d+\[0\]\./g, "")
        .replace(/\[\d+\]$/g, "");
      cleanMap[clean] = i;
    });

    const results: { key: string; pdfField: string; idx: number; wrote: string; readBack: string }[] = [];

    for (const [key, pdfCleanName] of Object.entries(YN_MAPPINGS_125)) {
      const idx = cleanMap[pdfCleanName];
      if (idx === undefined) {
        results.push({ key, pdfField: pdfCleanName, idx: -1, wrote: "", readBack: "NOT_FOUND" });
        continue;
      }

      const field = allFields[idx] as any;
      const value = key === "foreign_operations" ? "Yes" : "No";

      if (typeof field.setText === "function") {
        field.setText(value);
        results.push({ key, pdfField: pdfCleanName, idx, wrote: value, readBack: "pending" });
      } else {
        results.push({ key, pdfField: pdfCleanName, idx, wrote: "", readBack: "NOT_TXT" });
      }
    }

    // Save and reload
    const savedBytes = await doc.save();
    const doc2 = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
    const fields2 = doc2.getForm().getFields();

    for (const r of results) {
      if (r.readBack === "pending" && r.idx >= 0) {
        const f2 = fields2[r.idx] as any;
        if (typeof f2.getText === "function") {
          r.readBack = f2.getText() || "";
        }
      }
    }

    console.log("=== ACORD 125 Y/N ROUND-TRIP ===");
    for (const r of results) {
      const status = r.readBack === r.wrote ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} [${r.idx}] ${r.key} → "${r.wrote}" → readBack="${r.readBack}"`);
    }

    const failures = results.filter(r => r.readBack !== r.wrote);
    expect(failures).toHaveLength(0);
  });
});
