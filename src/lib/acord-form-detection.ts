/**
 * ACORD Form Detection — identifies form type and version from text/OCR content.
 * 
 * Reuses the same pattern-matching approach used for 125/126 (title block detection)
 * extended to support 127, 130, 131, 140, and 75.
 * 
 * Usage:
 *   const result = detectAcordFormType(ocrText);
 *   // { form_type: "ACORD_127", form_version: "2016/03", confidence: 0.95 }
 */

import type { AcordFormType } from "./acord-schemas";

export interface FormDetectionResult {
  form_type: AcordFormType | null;
  form_version: string | null;
  confidence: number;
  matched_indicators: string[];
}

interface FormPattern {
  form_type: AcordFormType;
  /** Primary regex patterns — match against title blocks */
  title_patterns: RegExp[];
  /** Secondary indicator text that boosts confidence */
  indicator_text: string[];
  /** Negative indicators — if present, REDUCE confidence */
  negative_indicators?: string[];
}

const FORM_PATTERNS: FormPattern[] = [
  {
    form_type: "ACORD_125",
    title_patterns: [
      /ACORD\s*125/i,
      /COMMERCIAL\s+INSURANCE\s+APPLICATION/i,
    ],
    indicator_text: [
      "LINES OF BUSINESS",
      "APPLICANT INFORMATION",
      "PROPOSED EFF DATE",
      "NATURE OF BUSINESS",
      "GENERAL INFORMATION",
    ],
  },
  {
    form_type: "ACORD_126",
    title_patterns: [
      /ACORD\s*126/i,
      /COMMERCIAL\s+GENERAL\s+LIABILITY\s+SECTION/i,
    ],
    indicator_text: [
      "SCHEDULE OF HAZARDS",
      "EACH OCCURRENCE",
      "GENERAL AGGREGATE",
      "PRODUCTS.*COMPLETED",
      "CLAIMS.?MADE",
      "EMPLOYEE BENEFITS LIABILITY",
    ],
    negative_indicators: ["UMBRELLA", "EXCESS", "WORKERS COMP"],
  },
  {
    form_type: "ACORD_127",
    title_patterns: [
      /ACORD\s*127/i,
      /BUSINESS\s+AUTO\s+SECTION/i,
      /COMMERCIAL\s+AUTO/i,
    ],
    indicator_text: [
      "DRIVER INFORMATION",
      "VEHICLE SCHEDULE",
      "VEHICLE DESCRIPTION",
      "GARAGING ADDRESS",
      "VIN",
      "BODY TYPE",
      "RADIUS",
      "GVW",
      "ICC.*PUC",
      "HAZARDOUS MATERIAL",
    ],
  },
  {
    form_type: "ACORD_130",
    title_patterns: [
      /ACORD\s*130/i,
      /WORKERS\s+COMPENSATION\s+APPLICATION/i,
    ],
    indicator_text: [
      "WORKERS COMPENSATION",
      "EMPLOYERS LIABILITY",
      "EACH ACCIDENT",
      "DISEASE.*POLICY LIMIT",
      "DISEASE.*EACH EMPLOYEE",
      "EXPERIENCE MOD",
      "NCCI RISK ID",
      "CLASS CODE",
      "ANNUAL REMUNERATION",
      "PAYROLL",
    ],
    negative_indicators: ["UMBRELLA", "EXCESS", "GENERAL LIABILITY"],
  },
  {
    form_type: "ACORD_131",
    title_patterns: [
      /ACORD\s*131/i,
      /UMBRELLA.*EXCESS\s+LIABILITY/i,
      /COMMERCIAL\s+UMBRELLA/i,
    ],
    indicator_text: [
      "UMBRELLA",
      "EXCESS",
      "UNDERLYING INSURANCE",
      "RETAINED LIMIT",
      "SELF.?INSURED RETENTION",
      "ATTACHMENT POINT",
      "AGGREGATE",
    ],
  },
  {
    form_type: "ACORD_140",
    title_patterns: [
      /ACORD\s*140/i,
      /PROPERTY\s+SECTION/i,
    ],
    indicator_text: [
      "CONSTRUCTION TYPE",
      "YEAR BUILT",
      "PROTECTION CLASS",
      "BUILDING AMOUNT",
      "BUSINESS PERSONAL PROPERTY",
      "CAUSES OF LOSS",
      "COINSURANCE",
      "SPRINKLER",
      "HYDRANT",
      "WIRING.*YEAR",
      "ROOFING.*YEAR",
    ],
    negative_indicators: ["WORKERS COMP", "GENERAL LIABILITY", "AUTO"],
  },
  {
    form_type: "ACORD_75",
    title_patterns: [
      /ACORD\s*75/i,
      /WORKERS\s+COMP.*APPLIED\s+FOR/i,
    ],
    indicator_text: [
      "CLASSIFICATION",
      "ESTIMATED PAYROLL",
      "EXPERIENCE MODIFICATION",
      "WORKERS COMP",
    ],
  },
];

/**
 * Detect ACORD form type from OCR text or page content.
 * Returns best match with confidence score.
 */
export function detectAcordFormType(text: string): FormDetectionResult {
  if (!text || text.trim().length === 0) {
    return { form_type: null, form_version: null, confidence: 0, matched_indicators: [] };
  }

  const upperText = text.toUpperCase();
  let bestMatch: FormDetectionResult = { form_type: null, form_version: null, confidence: 0, matched_indicators: [] };

  for (const pattern of FORM_PATTERNS) {
    let score = 0;
    const matched: string[] = [];

    // Check title patterns (high weight)
    for (const regex of pattern.title_patterns) {
      if (regex.test(text)) {
        score += 0.5;
        matched.push(`title: ${regex.source}`);
      }
    }

    // Check indicator text (lower weight, cumulative)
    for (const indicator of pattern.indicator_text) {
      const indicatorRegex = new RegExp(indicator, "i");
      if (indicatorRegex.test(text)) {
        score += 0.08;
        matched.push(indicator);
      }
    }

    // Apply negative indicators
    if (pattern.negative_indicators) {
      for (const neg of pattern.negative_indicators) {
        if (upperText.includes(neg)) {
          score -= 0.1;
        }
      }
    }

    // Cap at 1.0
    score = Math.min(score, 1.0);

    if (score > bestMatch.confidence) {
      bestMatch = {
        form_type: pattern.form_type,
        form_version: extractFormVersion(text, pattern.form_type),
        confidence: score,
        matched_indicators: matched,
      };
    }
  }

  return bestMatch;
}

/**
 * Extract version/edition string from form text.
 * Looks for patterns like "ACORD 127 (2016/03)" or "(2010/05)"
 */
function extractFormVersion(text: string, formType: AcordFormType): string | null {
  const formNum = formType.replace("ACORD_", "");
  
  // Try "ACORD 127 (2016/03)" pattern
  const versionMatch = text.match(new RegExp(`ACORD\\s*${formNum}\\s*\\(([\\d/]+)\\)`, "i"));
  if (versionMatch) return versionMatch[1];
  
  // Try standalone date format near the form number
  const dateMatch = text.match(new RegExp(`${formNum}[^\\d]*(\\d{4}/\\d{2})`, "i"));
  if (dateMatch) return dateMatch[1];
  
  return null;
}

/**
 * Detect form types for multiple pages in a packet.
 * Returns one detection result per page.
 */
export function detectAcordFormTypes(pages: string[]): FormDetectionResult[] {
  return pages.map(pageText => detectAcordFormType(pageText));
}

/**
 * Group pages by detected form type for routing to extractors.
 */
export function groupPagesByFormType(pages: string[]): Record<string, { pageIndices: number[]; text: string; version: string | null }> {
  const detections = detectAcordFormTypes(pages);
  const groups: Record<string, { pageIndices: number[]; text: string; version: string | null }> = {};

  for (let i = 0; i < detections.length; i++) {
    const det = detections[i];
    if (!det.form_type || det.confidence < 0.3) continue;
    
    const key = det.form_type;
    if (!groups[key]) {
      groups[key] = { pageIndices: [], text: "", version: det.form_version };
    }
    groups[key].pageIndices.push(i);
    groups[key].text += pages[i] + "\n\n";
    if (det.form_version && !groups[key].version) {
      groups[key].version = det.form_version;
    }
  }

  return groups;
}
