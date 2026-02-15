/**
 * Maps coverage line selections to the correct ACORD forms.
 * ACORD 125 is always included as the base application.
 */

export type CoverageLine =
  | "General Liability"
  | "Commercial Auto"
  | "Workers Compensation"
  | "Commercial Property"
  | "Umbrella / Excess"
  | "Cyber Liability"
  | "Professional Liability"
  | "Directors & Officers"
  | "Employment Practices"
  | "Other";

/** Which ACORD form IDs are required for each coverage line */
const COVERAGE_TO_FORMS: Record<string, string[]> = {
  "General Liability":      ["acord-125", "acord-126"],
  "Commercial Auto":        ["acord-125", "acord-127"],
  "Workers Compensation":   ["acord-125", "acord-130"],
  "Commercial Property":    ["acord-125", "acord-140"],
  "Umbrella / Excess":      ["acord-125", "acord-131"],
  // These default to just 125 since we don't have specific supplement forms yet
  "Cyber Liability":        ["acord-125"],
  "Professional Liability": ["acord-125"],
  "Directors & Officers":   ["acord-125"],
  "Employment Practices":   ["acord-125"],
  "Other":                  ["acord-125"],
};

/**
 * Given an array of selected coverage lines, return a deduplicated
 * set of ACORD form IDs that should be generated.
 */
export function getFormsForCoverageLines(lines: string[]): string[] {
  const formIds = new Set<string>();
  for (const line of lines) {
    const forms = COVERAGE_TO_FORMS[line] || ["acord-125"];
    forms.forEach((id) => formIds.add(id));
  }
  // Always include 125 as the base
  formIds.add("acord-125");
  return Array.from(formIds);
}

/** All available coverage lines */
export const COVERAGE_LINES: CoverageLine[] = [
  "General Liability",
  "Commercial Auto",
  "Workers Compensation",
  "Commercial Property",
  "Umbrella / Excess",
  "Cyber Liability",
  "Professional Liability",
  "Directors & Officers",
  "Employment Practices",
  "Other",
];
