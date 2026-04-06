// ─── Lead Scoring, Validation, and Metadata Maps ───

import type { ScanSource } from "./lead-scan.ts";

// ── Score leads based on real data completeness ──
export function calculateLeadScore(lead: any): number {
  let score = 50;

  if (lead.email) score += 15;
  if (lead.phone && !/555-\d{4}/.test(lead.phone)) score += 10;
  if (lead.contact_name) score += 10;
  if (lead.website) score += 5;
  if (lead.state) score += 3;
  if (lead.industry) score += 2;

  if (!lead.email) score -= 10;
  if (!lead.phone) score -= 5;
  if (!lead.contact_name) score -= 5;

  if (lead.phone && /555-\d{4}/.test(lead.phone)) score -= 15;

  return Math.max(1, Math.min(99, score));
}

// ── Tier mapping by source ──
export const tierMap: Record<string, number> = {
  LinkedIn: 1, "FEMA Flood Zones": 1, "OpenFEMA NFIP": 1, "NOAA Storm Events": 1,
  "Property Records": 1, "Building Permits": 1, "Tax Delinquency": 1,
  "FL Citizens Non-Renewal": 1, "ATTOM Data": 1, "State Socrata Portals": 1,
  "County ArcGIS": 1, "CT Property Transfers": 1, "NYC ACRIS": 1,
  "MassGIS Parcels": 1, "NJ MOD-IV / Sales": 1, "RI Coastal (FEMA)": 1,
  "Google Maps": 1,
  Reddit: 2, "Business Filings": 2, "Permit Database": 2, "NHTSA Vehicles": 2,
  "HUD Housing Data": 2, "RentCast": 2, "Regrid Parcels": 2, "BatchData": 2,
  "Census / ACS Data": 3, "Google Trends": 3,
};

// ── Activity type mapping by source ──
export const activityTypeMap: Record<string, string> = {
  LinkedIn: "linkedin", Reddit: "reddit", "Business Filings": "filing",
  "Permit Database": "filing", "FEMA Flood Zones": "flood", "NOAA Storm Events": "storm",
  "Census / ACS Data": "filing", "NHTSA Vehicles": "filing", "OpenFEMA NFIP": "flood",
  "HUD Housing Data": "property", "Property Records": "property", "Building Permits": "property",
  "Tax Delinquency": "property", "Google Trends": "filing", "ATTOM Data": "property",
  "RentCast": "property", "Regrid Parcels": "property", "BatchData": "property",
  "FL Citizens Non-Renewal": "property", "State Socrata Portals": "property",
  "County ArcGIS": "property", "CT Property Transfers": "property", "NYC ACRIS": "property",
  "MassGIS Parcels": "property", "NJ MOD-IV / Sales": "property", "RI Coastal (FEMA)": "flood",
  "Google Maps": "google_maps",
};

// ── Validate extracted leads (remove fakes) ──
export function validateExtractedLeads(leads: any[]): any[] {
  return leads.filter((l: any) => {
    if (!l.company || l.company === "Unknown Business") return false;
    if (l.phone && /555-\d{4}/.test(l.phone)) {
      l.phone = null;
    }
    return true;
  });
}
