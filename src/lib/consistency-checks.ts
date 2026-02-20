/**
 * AI consistency checks for insurance submission data.
 * Runs client-side validation before the AI audit to flag obvious issues.
 */

export type ConsistencyWarning = {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
};

/**
 * Check for inconsistencies across form data before submission.
 */
export function runConsistencyChecks(
  formData: Record<string, any>,
  selectedFormIds: string[]
): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = [];

  // 1. Payroll vs class codes
  const remuneration1 = parseFloat(String(formData.annual_remuneration_1 || "0").replace(/[$,]/g, ""));
  const classCode1 = formData.class_code_1;
  const numEmployees1 = parseInt(formData.num_employees_1 || "0");

  if (selectedFormIds.includes("acord-130")) {
    if (!classCode1 && remuneration1 > 0) {
      warnings.push({
        severity: "error",
        field: "class_code_1",
        message: "WC class code is missing but payroll is provided. Every class code needs a matching remuneration.",
      });
    }
    if (classCode1 && remuneration1 === 0) {
      warnings.push({
        severity: "error",
        field: "annual_remuneration_1",
        message: "WC class code is set but annual remuneration is $0. Verify payroll amount.",
      });
    }
    if (numEmployees1 > 0 && remuneration1 > 0) {
      const avgSalary = remuneration1 / numEmployees1;
      if (avgSalary < 15000) {
        warnings.push({
          severity: "warning",
          field: "annual_remuneration_1",
          message: `Average salary per employee ($${avgSalary.toLocaleString()}) seems low. Verify employee count and payroll.`,
        });
      }
      if (avgSalary > 500000) {
        warnings.push({
          severity: "warning",
          field: "annual_remuneration_1",
          message: `Average salary per employee ($${avgSalary.toLocaleString()}) seems high. Verify employee count and payroll.`,
        });
      }
    }
  }

  // 2. Employee count mismatches across forms
  const ftEmployees = parseInt(formData.full_time_employees || "0");
  const ptEmployees = parseInt(formData.part_time_employees || "0");
  const totalEmployees = parseInt(formData.total_employees || "0");
  const numEmployeesWC = parseInt(formData.num_employees_1 || "0");

  if (ftEmployees + ptEmployees > 0 && totalEmployees > 0) {
    if (ftEmployees + ptEmployees !== totalEmployees) {
      warnings.push({
        severity: "warning",
        field: "total_employees",
        message: `Full-time (${ftEmployees}) + part-time (${ptEmployees}) = ${ftEmployees + ptEmployees} but total employees shows ${totalEmployees}.`,
      });
    }
  }

  if (numEmployeesWC > 0 && totalEmployees > 0 && numEmployeesWC !== totalEmployees) {
    warnings.push({
      severity: "info",
      field: "num_employees_1",
      message: `WC employee count (${numEmployeesWC}) differs from total employees (${totalEmployees}). This may be intentional if some are excluded.`,
    });
  }

  // 3. Date checks
  const effDate = formData.proposed_eff_date || formData.effective_date;
  const expDate = formData.proposed_exp_date || formData.expiration_date;
  if (effDate && expDate) {
    const eff = new Date(effDate);
    const exp = new Date(expDate);
    if (exp <= eff) {
      warnings.push({
        severity: "error",
        field: "expiration_date",
        message: "Expiration date must be after the effective date.",
      });
    }
    const diffDays = (exp.getTime() - eff.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 400) {
      warnings.push({
        severity: "warning",
        field: "expiration_date",
        message: `Policy term is ${Math.round(diffDays)} days. Standard is 365 days.`,
      });
    }
  }

  // 4. Missing required fields check
  const requiredMap: Record<string, string[]> = {
    "acord-126": ["insured_name", "effective_date", "coverage_type", "general_aggregate", "each_occurrence"],
    "acord-127": ["insured_name", "effective_date"],
    "acord-130": ["insured_name", "effective_date", "expiration_date", "state_of_operation", "fein", "business_type", "nature_of_business"],
    "acord-131": ["insured_name", "effective_date", "expiration_date", "each_occurrence_limit", "aggregate_limit"],
    "acord-140": ["insured_name", "effective_date", "building_address", "construction_type", "year_built"],
  };

  for (const formId of selectedFormIds) {
    const required = requiredMap[formId] || [];
    const missing = required.filter((f) => !formData[f] || (typeof formData[f] === "string" && !formData[f].trim()));
    if (missing.length > 0) {
      warnings.push({
        severity: "error",
        field: formId,
        message: `${formId.toUpperCase().replace("-", " ")}: Missing ${missing.length} required field${missing.length !== 1 ? "s" : ""} — ${missing.join(", ")}`,
      });
    }
  }

  // 5. Revenue sanity check
  const revenue = parseFloat(String(formData.annual_revenues || formData.annual_revenue || "0").replace(/[$,]/g, ""));
  if (revenue > 0 && numEmployees1 > 0) {
    const revenuePerEmployee = revenue / numEmployees1;
    if (revenuePerEmployee < 10000) {
      warnings.push({
        severity: "info",
        field: "annual_revenues",
        message: `Revenue per employee ($${revenuePerEmployee.toLocaleString()}) is very low. Verify revenue and employee count.`,
      });
    }
  }

  // 6. Subcontractor checks
  if (formData.subcontractors_used?.toLowerCase() === "yes" && formData.subcontractor_certs?.toLowerCase() !== "yes") {
    warnings.push({
      severity: "warning",
      field: "subcontractor_certs",
      message: "Subcontractors are used but certificates of insurance are not obtained. This is a common underwriting concern.",
    });
  }

  return warnings;
}
