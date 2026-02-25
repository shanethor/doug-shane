import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";
import { ACORD_INDEX_MAPS } from "../lib/acord-field-map";
import { buildAutofilledData } from "../lib/acord-autofill";
import { ACORD_FORMS, ACORD_FORM_LIST } from "../lib/acord-forms";

function loadPdf(formId: string): Uint8Array {
  const filePath = join(process.cwd(), "public", "acord-fillable", `${formId}.pdf`);
  const buf = readFileSync(filePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// Simulated AI extraction data from the 5 uploaded policy documents
const PATRICIAN_GL_DATA: Record<string, any> = {
  applicant_name: "Patrician Construction Corp",
  insured_name: "Patrician Construction Corp",
  mailing_address: "10 Hickory Hill Road",
  city: "Brookfield",
  state: "CT",
  zip: "06804",
  carrier: "Allied World Surplus Lines Insurance Company",
  policy_number: "5061-0745-00",
  effective_date: "4/12/2024",
  expiration_date: "4/12/2025",
  each_occurrence: "$1,000,000",
  fire_damage: "$50,000",
  medical_payments: "$5,000",
  personal_adv_injury: "$1,000,000",
  general_aggregate: "$2,000,000",
  products_aggregate: "$2,000,000",
  business_description: "97050 Lawn landscaping",
  annual_revenue: "$2,000,000",
  coverage_type: "Occurrence",
  chk_occurrence: true,
  chk_claims_made: false,
  chk_commercial_general_liability: true,
  total_annual_premium: "$25,000",
  cgl_premium: "$25,000",
  hazard_classification_1: "Lawn landscaping",
  hazard_code_1: "97050",
  hazard_exposure_1: "$2,000,000",
  hazard_rate_premops_1: "$12.50",
  hazard_premium_premops_1: "$25,000",
};

const RCR_RUSSO_BA_DATA: Record<string, any> = {
  applicant_name: "RCR RUSSO CORP",
  carrier: "Progressive Casualty Insurance Co",
  policy_number: "865651552",
  effective_date: "11/12/2025",
  expiration_date: "11/12/2026",
  business_type: "Corporation",
  each_occurrence: "$1,000,000",
  drivers: [
    { name: "Christopher Russo" },
    { name: "Matthew Murchinson" },
  ],
  vehicles: [
    { year: "2015", make: "CHEVROLET", model: "SILVERADO", vin: "1GC3KYCGXFZ514800", body_type: "Pickup Truck", stated_amount: "$33,000" },
    { year: "2004", make: "FORD", model: "F350", vin: "1FDSX35P54EB87588", body_type: "Pickup Truck", stated_amount: "$28,000" },
  ],
  auto_premium: "$16,316",
};

const WALTON_PROPERTY_DATA: Record<string, any> = {
  applicant_name: "2357 Walton LLC",
  mailing_address: "Po Box 394",
  city: "Bronx",
  state: "NY",
  zip: "10457",
  carrier: "Northfield Insurance Company",
  policy_number: "WH026030",
  effective_date: "12/12/2025",
  expiration_date: "12/12/2026",
  business_type: "LLC",
  property_premium: "$36,000",
  policy_premium: "$36,575",
};

const TEST_CASES = [
  { name: "Patrician GL", data: PATRICIAN_GL_DATA },
  { name: "RCR Russo BA", data: RCR_RUSSO_BA_DATA },
  { name: "2357 Walton Property", data: WALTON_PROPERTY_DATA },
];

describe("ACORD 125 Autofill → PDF Round-Trip", () => {
  const form125 = ACORD_FORMS["acord-125"];
  const map125 = ACORD_INDEX_MAPS["acord-125"];

  for (const tc of TEST_CASES) {
    it(`should correctly fill 125 for ${tc.name}`, async () => {
      const filled = buildAutofilledData(form125, tc.data, null, null);
      const bytes = loadPdf("125");
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const fields = doc.getForm().getFields();

      const results: { key: string; value: any; index: number; wrote: boolean; readBack: string | boolean }[] = [];

      for (const [key, value] of Object.entries(filled)) {
        if (!value && value !== true) continue;
        const idx = map125[key];
        if (idx === undefined) continue;

        const field = fields[idx];
        if (!field) {
          results.push({ key, value, index: idx, wrote: false, readBack: "" });
          continue;
        }

        try {
          if (typeof value === "boolean" && value === true) {
            if (typeof (field as any).check === "function") {
              (field as any).check();
              results.push({ key, value, index: idx, wrote: true, readBack: "checked" });
            }
          } else if (typeof (field as any).setText === "function") {
            (field as any).setText(String(value));
            results.push({ key, value, index: idx, wrote: true, readBack: String(value) });
          }
        } catch (e) {
          results.push({ key, value, index: idx, wrote: false, readBack: `ERROR: ${e}` });
        }
      }

      // Save and reload to verify
      const savedBytes = await doc.save();
      const doc2 = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
      const fields2 = doc2.getForm().getFields();

      const failures: string[] = [];
      for (const r of results) {
        if (!r.wrote) {
          failures.push(`${r.key}[${r.index}]: WRITE_FAILED`);
          continue;
        }
        const f2 = fields2[r.index];
        if (typeof r.value === "boolean") {
          const isChecked = typeof (f2 as any).isChecked === "function" && (f2 as any).isChecked();
          if (!isChecked) failures.push(`${r.key}[${r.index}]: CHK not persisted`);
        } else {
          const text = typeof (f2 as any).getText === "function" ? (f2 as any).getText() : "";
          if (text !== String(r.value)) {
            failures.push(`${r.key}[${r.index}]: expected "${r.value}" got "${text}"`);
          }
        }
      }

      console.log(`=== ACORD 125 — ${tc.name} ===`);
      console.log(`Fields written: ${results.filter(r => r.wrote).length}, Failures: ${failures.length}`);
      if (failures.length > 0) console.log(failures.join("\n"));

      expect(failures).toHaveLength(0);
    });
  }
});

describe("ACORD 126 Autofill → PDF Round-Trip", () => {
  const form126 = ACORD_FORMS["acord-126"];
  const map126 = ACORD_INDEX_MAPS["acord-126"];

  // Only GL-relevant data for 126
  it("should correctly fill 126 for Patrician GL", async () => {
    const filled = buildAutofilledData(form126, PATRICIAN_GL_DATA, null, null);
    const bytes = loadPdf("126");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();

    const results: { key: string; value: any; index: number; wrote: boolean }[] = [];

    for (const [key, value] of Object.entries(filled)) {
      if (!value && value !== true) continue;
      const idx = map126[key];
      if (idx === undefined) continue;

      const field = fields[idx];
      if (!field) {
        results.push({ key, value, index: idx, wrote: false });
        continue;
      }

      try {
        if (typeof value === "boolean" && value === true) {
          if (typeof (field as any).check === "function") {
            (field as any).check();
            results.push({ key, value, index: idx, wrote: true });
          } else {
            results.push({ key, value, index: idx, wrote: false });
          }
        } else if (typeof (field as any).setText === "function") {
          (field as any).setText(String(value));
          results.push({ key, value, index: idx, wrote: true });
        }
      } catch (e) {
        results.push({ key, value, index: idx, wrote: false });
      }
    }

    // Save and reload
    const savedBytes = await doc.save();
    const doc2 = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
    const fields2 = doc2.getForm().getFields();

    const failures: string[] = [];
    for (const r of results) {
      if (!r.wrote) {
        failures.push(`${r.key}[${r.index}]: WRITE_FAILED`);
        continue;
      }
      const f2 = fields2[r.index];
      if (typeof r.value === "boolean") {
        const isChecked = typeof (f2 as any).isChecked === "function" && (f2 as any).isChecked();
        if (!isChecked) failures.push(`${r.key}[${r.index}]: CHK not persisted`);
      } else {
        const text = typeof (f2 as any).getText === "function" ? (f2 as any).getText() : "";
        if (text !== String(r.value)) {
          failures.push(`${r.key}[${r.index}]: expected "${r.value}" got "${text}"`);
        }
      }
    }

    console.log("=== ACORD 126 — Patrician GL ===");
    console.log(`Fields written: ${results.filter(r => r.wrote).length}, Failures: ${failures.length}`);
    if (failures.length > 0) console.log(failures.join("\n"));

    // Also verify checkbox state
    const chkOccurrence = filled.chk_occurrence;
    const chkClaimsMade = filled.chk_claims_made;
    console.log(`chk_occurrence=${chkOccurrence}, chk_claims_made=${chkClaimsMade}`);
    
    // Occurrence should be true, claims_made should NOT be true
    expect(chkOccurrence).toBe(true);
    expect(chkClaimsMade).toBeFalsy();

    expect(failures).toHaveLength(0);
  });

  it("should NOT set checkbox fields from boolean false values", () => {
    const form126 = ACORD_FORMS["acord-126"];
    const testData = {
      chk_occurrence: true,
      chk_claims_made: false,
      chk_deductible_pd: false,
      chk_deductible_bi: false,
      chk_per_claim: false,
      chk_per_occurrence: false,
    };
    const filled = buildAutofilledData(form126, testData, null, null);

    // Only occurrence should be set
    expect(filled.chk_occurrence).toBe(true);
    // False values should be filtered out by normalizeValue
    expect(filled.chk_claims_made).toBeFalsy();
    expect(filled.chk_deductible_pd).toBeFalsy();
    expect(filled.chk_deductible_bi).toBeFalsy();
  });
});

describe("ACORD 126 Checkbox Key Alignment", () => {
  it("should have matching keys between acord-forms.ts and acord-field-map.ts index map", () => {
    const form126def = ACORD_FORMS["acord-126"];
    const map126 = ACORD_INDEX_MAPS["acord-126"];
    
    const checkboxFields = form126def.fields.filter(f => f.type === "checkbox");
    const missingInMap: string[] = [];
    
    for (const field of checkboxFields) {
      if (map126[field.key] === undefined) {
        missingInMap.push(field.key);
      }
    }
    
    console.log("=== ACORD 126 Checkbox Key Alignment ===");
    console.log(`Total checkbox fields in form: ${checkboxFields.length}`);
    console.log(`Missing from index map: ${missingInMap.length}`);
    if (missingInMap.length > 0) console.log(`Missing: ${missingInMap.join(", ")}`);
    
    // All checkbox fields in form definition should have an index mapping
    expect(missingInMap).toHaveLength(0);
  });
});
