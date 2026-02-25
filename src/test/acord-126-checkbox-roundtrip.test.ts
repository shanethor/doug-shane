import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";
import { ACORD_INDEX_MAPS } from "../lib/acord-field-map";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

const CHECKBOX_KEYS_126 = [
  "chk_commercial_general_liability",
  "chk_claims_made",
  "chk_occurrence",
  "chk_owners_contractors",
  "chk_other_coverage",
  "chk_deductible_pd",
  "chk_deductible_bi",
  "chk_other_deductible",
  "chk_per_claim",
  "chk_per_occurrence",
  "chk_limit_policy",
  "chk_limit_project",
  "chk_limit_location",
  "chk_limit_other",
] as const;

describe("ACORD 126 Checkbox Round-Trip", () => {
  it("should write and read back each checkbox correctly", async () => {
    const bytes = loadPdf("126");
    const map = ACORD_INDEX_MAPS["acord-126"];
    const results: { key: string; index: number | string; wrote: boolean; readBack: boolean }[] = [];

    for (const key of CHECKBOX_KEYS_126) {
      const idx = map[key];
      if (idx === undefined) {
        results.push({ key, index: -1, wrote: false, readBack: false });
        continue;
      }

      // Load fresh copy, check the field at this index, save, reload, verify
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const fields = doc.getForm().getFields();
      const field = fields[idx];

      if (!field || typeof (field as any).check !== "function") {
        results.push({ key, index: idx, wrote: false, readBack: false });
        continue;
      }

      (field as any).check();
      const savedBytes = await doc.save();

      // Reload and verify
      const doc2 = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
      const field2 = doc2.getForm().getFields()[idx];
      const isChecked = typeof (field2 as any).isChecked === "function" && (field2 as any).isChecked();

      results.push({ key, index: idx, wrote: true, readBack: isChecked });
    }

    console.log("=== ACORD 126 CHECKBOX ROUND-TRIP ===");
    for (const r of results) {
      const status = !r.wrote ? "❌ NOT_FOUND" : r.readBack ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} [${r.index}] ${r.key}`);
    }

    const failures = results.filter((r) => !r.readBack);
    expect(failures).toHaveLength(0);
  });
});
