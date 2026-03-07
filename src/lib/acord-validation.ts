/**
 * ACORD Extraction Validation — basic sanity checks on extracted data.
 * 
 * Surfaces warnings in the review UI where values look suspicious.
 */

export interface ValidationWarning {
  field_path: string;
  field_label: string;
  message: string;
  severity: "warning" | "error";
}

const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","VI","GU","AS","MP",
]);

export function validateExtractedData(
  formType: string,
  data: Record<string, any>,
  fieldDefinitions: Array<{ key: string; label: string; type: string; required?: boolean }>
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const field of fieldDefinitions) {
    const val = data[field.key];
    const strVal = val !== undefined && val !== null ? String(val).trim() : "";

    // Required field check
    if (field.required && (!strVal || strVal === "N/A")) {
      warnings.push({
        field_path: field.key,
        field_label: field.label,
        message: "Required field is empty",
        severity: "error",
      });
      continue;
    }

    if (!strVal || strVal === "N/A") continue;

    // Currency validation
    if (field.type === "currency" || field.type === "number") {
      const numVal = Number(strVal.replace(/[$,\s]/g, ""));
      if (isNaN(numVal)) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `Non-numeric value: "${strVal}"`,
          severity: "warning",
        });
      } else if (field.type === "currency" && numVal < 0) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `Negative currency value: ${strVal}`,
          severity: "warning",
        });
      } else if (field.key.includes("premium") && numVal > 10_000_000) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `Unusually high premium: ${strVal}`,
          severity: "warning",
        });
      } else if (field.key.includes("payroll") || field.key.includes("remuneration")) {
        if (numVal > 50_000_000) {
          warnings.push({
            field_path: field.key,
            field_label: field.label,
            message: `Unusually high payroll: ${strVal}`,
            severity: "warning",
          });
        }
      }
    }

    // State code validation
    if (field.key.includes("state") && field.type === "text") {
      const stateVal = strVal.toUpperCase();
      if (stateVal.length === 2 && !US_STATE_CODES.has(stateVal)) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `Invalid state code: "${stateVal}"`,
          severity: "warning",
        });
      }
    }

    // Date validation
    if (field.type === "date" && strVal) {
      const datePatterns = [
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{4}-\d{2}-\d{2}$/,
      ];
      if (!datePatterns.some(p => p.test(strVal))) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `Unexpected date format: "${strVal}"`,
          severity: "warning",
        });
      }
    }

    // VIN validation (ACORD 127)
    if (field.key.includes("vin") && strVal.length > 0) {
      if (strVal.length !== 17 && strVal.length > 5) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `VIN should be 17 characters (got ${strVal.length})`,
          severity: "warning",
        });
      }
    }

    // FEIN validation
    if (field.key === "fein" && strVal) {
      const cleanFein = strVal.replace(/[-\s]/g, "");
      if (!/^\d{9}$/.test(cleanFein) && !strVal.startsWith("XX")) {
        warnings.push({
          field_path: field.key,
          field_label: field.label,
          message: `FEIN should be 9 digits: "${strVal}"`,
          severity: "warning",
        });
      }
    }
  }

  return warnings;
}
