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
  "General Liability":      ["acord-126"],
  "Commercial Auto":        ["acord-127"],
  "Workers Compensation":   ["acord-130"],
  "Commercial Property":    ["acord-140"],
  "Umbrella / Excess":      ["acord-131"],
  "Cyber Liability":        ["acord-75"],
  "Professional Liability": ["acord-126"],
  "Directors & Officers":   ["acord-126"],
  "Employment Practices":   ["acord-126"],
  "Other":                  ["acord-126"],
};


/**
 * Given an array of selected coverage lines, return a deduplicated
 * set of ACORD form IDs that should be generated.
 */
export function getFormsForCoverageLines(lines: string[]): string[] {
  const formIds = new Set<string>();
  for (const line of lines) {
    const forms = COVERAGE_TO_FORMS[line] || ["acord-126"];
    forms.forEach((id) => formIds.add(id));
  }
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
