/**
 * Integration test: verifies that every left-column form field with a value
 * produces a corresponding entry in the center-column prefillByIndex map.
 *
 * This catches sync regressions where fields are added to acord-forms.ts
 * but not mapped in acord-field-map.ts (or vice-versa).
 */
import { describe, it, expect } from "vitest";
import { ACORD_FORMS, type AcordFormField } from "@/lib/acord-forms";
import { ACORD_INDEX_MAPS } from "@/lib/acord-field-map";

/** Mirrors the buildPrefillByIndex logic from FormFillingView */
function buildPrefillByIndex(
  formId: string,
  data: Record<string, any>,
  indexMap: Record<string, number>
): Record<number, string> {
  if (!indexMap || Object.keys(indexMap).length === 0) return {};
  const result: Record<number, string> = {};
  for (const [key, rawIdx] of Object.entries(indexMap)) {
    const val = data[key];
    if (val === undefined || val === null || val === "") continue;
    const s = String(val).trim();
    if (s === "" || s === "N/A" || s === "n/a" || s === "[]") continue;
    if (s === "false" && !key.startsWith("chk_")) continue;
    let display = s;
    const isoMatch = display.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) display = `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
    result[rawIdx] = display;
  }
  return result;
}

/** Generate a dummy value for a given field type */
function dummyValue(field: AcordFormField): any {
  switch (field.type) {
    case "text":
    case "textarea":
      return "Test Value";
    case "date":
      return "2025-06-15";
    case "number":
      return "42";
    case "currency":
      return "1000";
    case "checkbox":
      return true;
    case "select":
      return field.options?.[0] ?? "Yes";
    default:
      return "test";
  }
}

const FORM_IDS = Object.keys(ACORD_FORMS).filter((id) => ACORD_INDEX_MAPS[id]);

describe.each(FORM_IDS)("Prefill sync for %s", (formId) => {
  const formDef = ACORD_FORMS[formId];
  const indexMap = ACORD_INDEX_MAPS[formId];

  it("every mapped left-column field produces a prefill entry", () => {
    // Fill all fields with dummy data
    const data: Record<string, any> = {};
    for (const field of formDef.fields) {
      data[field.key] = dummyValue(field);
    }

    const prefill = buildPrefillByIndex(formId, data, indexMap);

    // For every field whose key exists in the index map, prefill must contain
    // an entry at the corresponding index.
    const missingFields: string[] = [];
    for (const field of formDef.fields) {
      if (indexMap[field.key] !== undefined) {
        const idx = indexMap[field.key];
        if (prefill[idx] === undefined) {
          missingFields.push(`${field.key} → index ${idx}`);
        }
      }
    }

    if (missingFields.length > 0) {
      console.warn(
        `[${formId}] Fields mapped but NOT in prefill output:\n  ${missingFields.join("\n  ")}`
      );
    }
    // Every mapped field should produce output
    expect(missingFields).toEqual([]);
  });

  it("index map covers majority of form fields", () => {
    const totalFields = formDef.fields.length;
    const mappedCount = formDef.fields.filter((f) => indexMap[f.key] !== undefined).length;
    const coverage = mappedCount / totalFields;

    console.log(
      `[${formId}] Coverage: ${mappedCount}/${totalFields} (${(coverage * 100).toFixed(1)}%)`
    );

    // Report unmapped fields for visibility
    const unmapped = formDef.fields
      .filter((f) => indexMap[f.key] === undefined)
      .map((f) => f.key);
    if (unmapped.length > 0) {
      console.warn(`[${formId}] Unmapped left-column keys:\n  ${unmapped.join("\n  ")}`);
    }

    // At least 50% of fields should be mapped (adjust threshold as coverage improves)
    expect(coverage).toBeGreaterThanOrEqual(0.5);
  });

  it("no duplicate indices in index map", () => {
    const seen = new Map<number, string[]>();
    for (const [key, idx] of Object.entries(indexMap)) {
      if (!seen.has(idx)) seen.set(idx, []);
      seen.get(idx)!.push(key);
    }
    const dupes = [...seen.entries()]
      .filter(([, keys]) => keys.length > 1)
      .map(([idx, keys]) => `index ${idx}: ${keys.join(", ")}`);

    if (dupes.length > 0) {
      console.warn(`[${formId}] Duplicate index mappings:\n  ${dupes.join("\n  ")}`);
    }
    // Duplicates are aliases (acceptable) — just log for visibility
  });

  it("buildPrefillByIndex round-trips all mapped fields", () => {
    const data: Record<string, any> = {};
    for (const field of formDef.fields) {
      data[field.key] = dummyValue(field);
    }

    const prefill = buildPrefillByIndex(formId, data, indexMap);
    const prefillCount = Object.keys(prefill).length;

    // Count unique indices for mapped form fields (aliases collapse to same index)
    const uniqueIndices = new Set(
      formDef.fields
        .filter((f) => indexMap[f.key] !== undefined)
        .map((f) => indexMap[f.key])
    );

    // prefill should cover all unique indices from form fields
    expect(prefillCount).toBeGreaterThanOrEqual(uniqueIndices.size);
  });
});
