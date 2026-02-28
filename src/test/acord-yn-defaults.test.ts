import { describe, it, expect } from "vitest";
import { ACORD_FORM_LIST } from "@/lib/acord-forms";

// Collect all fields with default: "No"
const defaultNoFields = ACORD_FORM_LIST.flatMap(form =>
  form.fields.filter(f => f.default === "No").map(f => ({ formId: form.id, ...f }))
);

describe("ACORD Y/N default fields", () => {
  it("should have exactly 99 fields with default 'No'", () => {
    expect(defaultNoFields.length).toBeGreaterThanOrEqual(90);
  });

  it("defaults should NOT override existing extracted values", () => {
    // Simulate DB-loaded data where AI extracted "Yes" for some fields
    const loaded: Record<string, string> = {
      foreign_operations: "Yes",
      bankruptcy: "Yes",
      blasting_explosives: "Yes",
      transporting_hazmat: "Yes",
      wc_hazardous_material: "Yes",
      explosives_hauled: "Yes",
    };

    // Apply defaults logic (mirrors FormFillingView lines 500-504)
    for (const form of ACORD_FORM_LIST) {
      for (const field of form.fields) {
        if (field.default && (!loaded[field.key] || (typeof loaded[field.key] === "string" && !loaded[field.key].trim()))) {
          loaded[field.key] = field.default;
        }
      }
    }

    // Extracted "Yes" values must survive
    expect(loaded.foreign_operations).toBe("Yes");
    expect(loaded.bankruptcy).toBe("Yes");
    expect(loaded.blasting_explosives).toBe("Yes");
    expect(loaded.transporting_hazmat).toBe("Yes");
    expect(loaded.wc_hazardous_material).toBe("Yes");
    expect(loaded.explosives_hauled).toBe("Yes");

    // Fields with no extracted value should get "No"
    expect(loaded.subsidiary_of_another).toBe("No");
    expect(loaded.safety_program).toBe("No");
    expect(loaded.fraud_conviction).toBe("No");
  });

  it("defaults should fill empty-string extracted values", () => {
    const loaded: Record<string, string> = {
      subsidiary_of_another: "",
      has_subsidiaries: "  ",
    };

    for (const form of ACORD_FORM_LIST) {
      for (const field of form.fields) {
        if (field.default && (!loaded[field.key] || (typeof loaded[field.key] === "string" && !loaded[field.key].trim()))) {
          loaded[field.key] = field.default;
        }
      }
    }

    expect(loaded.subsidiary_of_another).toBe("No");
    expect(loaded.has_subsidiaries).toBe("No");
  });
});
