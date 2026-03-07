import { describe, it, expect } from "vitest";
import { buildAutofilledData } from "@/lib/acord-autofill";
import { ACORD_FORMS } from "@/lib/acord-forms";

const acord125 = ACORD_FORMS.find(f => f.id === "acord-125")!;
const acord127 = ACORD_FORMS.find(f => f.id === "acord-127")!;

describe("buildAutofilledData — LOB checkboxes from AI flags", () => {
  it("checks lob_business_auto when lob_auto='true'", () => {
    const result = buildAutofilledData(acord125, { lob_auto: "true" });
    expect(result.lob_business_auto).toBe("true");
  });

  it("checks lob_commercial_property when lob_property='true'", () => {
    const result = buildAutofilledData(acord125, { lob_property: "true" });
    expect(result.lob_commercial_property).toBe("true");
  });

  it("checks lob_umbrella when lob_umbrella='true'", () => {
    const result = buildAutofilledData(acord125, { lob_umbrella: "true" });
    expect(result.lob_umbrella).toBe("true");
  });

  it("checks lob_inland_marine when lob_inland_marine='true'", () => {
    const result = buildAutofilledData(acord125, { lob_inland_marine: "true" });
    expect(result.lob_inland_marine).toBe("true");
  });

  it("checks lob_bop when lob_bop='true'", () => {
    const result = buildAutofilledData(acord125, { lob_bop: "true" });
    expect(result.lob_bop).toBe("true");
  });

  it("auto-checks LOB checkbox when premium value is present", () => {
    const result = buildAutofilledData(acord125, { auto_premium: "5000" });
    expect(result.lob_business_auto).toBe(true);
  });
});

describe("buildAutofilledData — prior_other_carrier_2 with Umbrella + WC", () => {
  const policies = [
    { line_of_business: "COMMERCIAL UMBRELLA", carrier_name: "Travelers", policy_number: "UMB-001", premium: "2500", effective_date: "01/01/2026", expiration_date: "01/01/2027" },
    { line_of_business: "WORKERS COMPENSATION", carrier_name: "Travelers", policy_number: "WC-001", premium: "8000", effective_date: "01/01/2026", expiration_date: "01/01/2027" },
  ];

  it("puts Umbrella in Row 1 and WC in Row 2", () => {
    const result = buildAutofilledData(acord125, { policies });
    expect(result.prior_other_carrier_1).toBe("Travelers");
    expect(result.prior_other_lob_1).toBe("COMMERCIAL UMBRELLA");
    expect(result.prior_other_policy_1).toBe("UMB-001");
    expect(result.prior_other_carrier_2).toBe("Travelers");
    expect(result.prior_other_lob_2).toBe("WORKERS COMPENSATION");
    expect(result.prior_other_policy_2).toBe("WC-001");
  });

  it("populates premiums and dates for both rows", () => {
    const result = buildAutofilledData(acord125, { policies });
    expect(result.prior_other_premium_1).toBeTruthy();
    expect(result.prior_other_premium_2).toBeTruthy();
    expect(result.prior_other_eff_1).toBe("2026-01-01");
    expect(result.prior_other_eff_2).toBe("2026-01-01");
  });

  it("sets Q4 other_insurance_same_company when multiple policies", () => {
    const allPolicies = [
      ...policies,
      { line_of_business: "COMMERCIAL AUTO", carrier_name: "Travelers", policy_number: "AUTO-001", premium: "4000", effective_date: "01/01/2026", expiration_date: "01/01/2027" },
    ];
    const result = buildAutofilledData(acord125, { policies: allPolicies });
    expect(result.other_insurance_same_company).toBe("Yes");
  });
});

describe("buildAutofilledData — ACORD 127 driver name splitting", () => {
  it("splits 'LAST, FIRST' format into first/last name fields", () => {
    const drivers = [
      { name: "ORR, LISA" },
      { name: "WECKMAN, WILLIAM" },
      { name: "ORR, BRADFORD" },
      { name: "OZOLINA, JOHN" },
      { name: "WECKMAN, RICHARD" },
    ];
    const result = buildAutofilledData(acord127, { drivers, state: "CT" });
    expect(result.driver_1_first_name).toBe("LISA");
    expect(result.driver_1_last_name).toBe("ORR");
    expect(result.driver_2_first_name).toBe("WILLIAM");
    expect(result.driver_2_last_name).toBe("WECKMAN");
    expect(result.driver_3_first_name).toBe("BRADFORD");
    expect(result.driver_3_last_name).toBe("ORR");
    expect(result.driver_4_first_name).toBe("JOHN");
    expect(result.driver_4_last_name).toBe("OZOLINA");
    expect(result.driver_5_first_name).toBe("RICHARD");
    expect(result.driver_5_last_name).toBe("WECKMAN");
  });

  it("defaults license_state to insured state when not provided", () => {
    const drivers = [{ name: "ORR, LISA" }];
    const result = buildAutofilledData(acord127, { drivers, state: "CT" });
    expect(result.driver_1_license_state).toBe("CT");
  });
});
