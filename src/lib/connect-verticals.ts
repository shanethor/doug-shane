/**
 * Master Connect vertical configuration.
 * Each vertical defines sub-verticals, pipeline stages, coverage lines,
 * and Sage context hints for a fully customized Connect experience.
 */

export interface ConnectSubVertical {
  id: string;
  label: string;
  sources: string[];           // lead source keys relevant to this sub-vertical
}

export interface PipelineStageConfig {
  key: string;
  label: string;
  color: string;               // tailwind color token
}

export interface VerticalLeadPricing {
  basePrice: number;           // mid-range $/lead (flat fee, no tier multiplier)
  platinumMax: number;         // highest price at 1.25× for 80-100 score
  bronzeMin: number;           // lowest price at 0.50× for 10-29 score
  avgPremium: number;          // average annual premium in this vertical
  volumePerMonth: number;      // estimated national lead volume/month
  freeLeadsPerMonth: number;   // free leads for subscribers
}

export interface ConnectVerticalConfig {
  id: string;
  label: string;
  description: string;
  icon: string;                // lucide icon name
  subVerticals: ConnectSubVertical[];
  pipelineStages: PipelineStageConfig[];
  coverageLines: string[];
  sageContext: string;         // injected into Sage system prompt
  leadSources: string[];      // top-level lead source descriptions
  pricing: VerticalLeadPricing;
}

/* ── Lead scoring tiers ── */
export const LEAD_SCORE_TIERS = [
  { tier: "Platinum", scoreMin: 80, scoreMax: 100, multiplier: 1.25, ttlDays: 30, color: "text-purple-400" },
  { tier: "Gold",     scoreMin: 55, scoreMax: 79,  multiplier: 1.0,  ttlDays: 60, color: "text-yellow-400" },
  { tier: "Silver",   scoreMin: 30, scoreMax: 54,  multiplier: 0.75, ttlDays: 90, color: "text-gray-400" },
  { tier: "Bronze",   scoreMin: 10, scoreMax: 29,  multiplier: 0.50, ttlDays: 120, color: "text-amber-700" },
] as const;

export function getTierForScore(score: number) {
  return LEAD_SCORE_TIERS.find(t => score >= t.scoreMin && score <= t.scoreMax) ?? LEAD_SCORE_TIERS[3];
}

/* ── Pipeline stage presets ── */
const STANDARD_STAGES: PipelineStageConfig[] = [
  { key: "new_lead", label: "New Lead", color: "blue" },
  { key: "contacted", label: "Contacted", color: "sky" },
  { key: "meeting_set", label: "Meeting Set", color: "amber" },
  { key: "proposal_sent", label: "Proposal Sent", color: "orange" },
  { key: "negotiation", label: "Negotiation", color: "purple" },
  { key: "closed_won", label: "Closed Won", color: "green" },
  { key: "closed_lost", label: "Closed Lost", color: "red" },
];

const CONTRACTOR_STAGES: PipelineStageConfig[] = [
  { key: "new_lead", label: "New Lead", color: "blue" },
  { key: "contacted", label: "Contacted", color: "sky" },
  { key: "site_visit", label: "Site Visit", color: "amber" },
  { key: "quote_sent", label: "Quote Sent", color: "orange" },
  { key: "negotiation", label: "Negotiation", color: "purple" },
  { key: "closed_won", label: "Closed Won", color: "green" },
  { key: "closed_lost", label: "Closed Lost", color: "red" },
];

const TRUCKING_STAGES: PipelineStageConfig[] = [
  { key: "signal_detected", label: "Signal Detected", color: "cyan" },
  { key: "contacted", label: "Contacted", color: "sky" },
  { key: "in_conversation", label: "In Conversation", color: "amber" },
  { key: "quote_sent", label: "Quote Sent", color: "orange" },
  { key: "binding", label: "Binding", color: "purple" },
  { key: "closed_won", label: "Bound", color: "green" },
  { key: "closed_lost", label: "Lost", color: "red" },
];

const REAL_ESTATE_STAGES: PipelineStageConfig[] = [
  { key: "new_lead", label: "New Lead", color: "blue" },
  { key: "showing", label: "Showing", color: "sky" },
  { key: "offer_sent", label: "Offer Sent", color: "amber" },
  { key: "under_contract", label: "Under Contract", color: "orange" },
  { key: "inspection", label: "Inspection", color: "purple" },
  { key: "closed_won", label: "Closed", color: "green" },
  { key: "closed_lost", label: "Lost", color: "red" },
];

const HEALTHCARE_STAGES: PipelineStageConfig[] = [
  { key: "new_provider", label: "New Provider", color: "blue" },
  { key: "contacted", label: "Contacted", color: "sky" },
  { key: "needs_analysis", label: "Needs Analysis", color: "amber" },
  { key: "proposal_sent", label: "Proposal Sent", color: "orange" },
  { key: "credentialing", label: "Credentialing", color: "purple" },
  { key: "closed_won", label: "Closed Won", color: "green" },
  { key: "closed_lost", label: "Closed Lost", color: "red" },
];

const HOSPITALITY_STAGES: PipelineStageConfig[] = [
  { key: "new_lead", label: "New Lead", color: "blue" },
  { key: "contacted", label: "Contacted", color: "sky" },
  { key: "menu_review", label: "Menu / License Review", color: "amber" },
  { key: "proposal_sent", label: "Proposal Sent", color: "orange" },
  { key: "negotiation", label: "Negotiation", color: "purple" },
  { key: "closed_won", label: "Closed Won", color: "green" },
  { key: "closed_lost", label: "Closed Lost", color: "red" },
];

/* ══════════════════════════════════════════════
   VERTICAL DEFINITIONS
   ══════════════════════════════════════════════ */

export const CONNECT_VERTICALS: ConnectVerticalConfig[] = [
  {
    id: "contractors",
    label: "Contractors",
    description: "Roofing, HVAC, plumbing, electrical, painting, restoration & general contractors",
    icon: "HardHat",
    subVerticals: [
      { id: "roofing_residential", label: "Residential Roofing", sources: ["licensing", "permits", "osha", "noaa_storm", "batchdata"] },
      { id: "roofing_commercial", label: "Commercial Roofing", sources: ["licensing", "permits_100k", "osha", "batchdata"] },
      { id: "roofing_storm", label: "Storm Restoration Roofing", sources: ["noaa_storm", "licensing", "osha", "batchdata"] },
      { id: "roofing_specialty", label: "Specialty Roofing (Metal/Solar/Green)", sources: ["licensing", "permits", "solar_permits"] },
      { id: "hvac_residential", label: "Residential HVAC", sources: ["licensing", "permits", "noaa_heat_cold", "a2l_transition", "heehra"] },
      { id: "hvac_commercial", label: "Commercial HVAC (Mechanical)", sources: ["licensing", "permits_50k", "osha_238220", "a2l_transition"] },
      { id: "hvac_refrigeration", label: "Commercial Refrigeration (NCCI 3724)", sources: ["licensing", "permits", "osha_238220"] },
      { id: "hvac_duct_fab", label: "Duct Fabrication & Installation (NCCI 5536)", sources: ["licensing", "permits", "smacna"] },
      { id: "hvac_geothermal", label: "Specialty: Geothermal / Heat Pump", sources: ["licensing", "permits", "igshpa", "heehra", "a2l_transition"] },
      { id: "hvac_iaq", label: "IAQ / Duct Cleaning (NCCI 9014)", sources: ["licensing", "nadca", "permits"] },
      { id: "plumbing_residential", label: "Residential Plumbing (Service/Repair + New Construction)", sources: ["licensing", "permits", "osha_238220", "sos_filings"] },
      { id: "plumbing_commercial", label: "Commercial Plumbing (NCCI 5183 — Large Permits)", sources: ["licensing", "permits_50k", "osha_238220", "sam_gov", "backflow"] },
      { id: "plumbing_sewer", label: "Sewer & Excavation (NCCI 6325)", sources: ["licensing", "permits", "osha_238220"] },
      { id: "plumbing_gas", label: "Gas Fitting / Gas Appliance (NCCI 5185)", sources: ["licensing", "permits", "epa"] },
      { id: "plumbing_lslr", label: "Lead Service Line Replacement (IIJA/BIL)", sources: ["epa_lslr", "licensing", "sam_gov"] },
      { id: "plumbing_irrigation", label: "Irrigation / Sprinkler (NCCI 5191)", sources: ["licensing", "permits"] },
      { id: "electrical", label: "Electrical", sources: ["licensing", "permits"] },
      { id: "painting", label: "Painting", sources: ["licensing", "permits"] },
      { id: "general_contractor", label: "General Contractor", sources: ["licensing", "permits", "osha"] },
      { id: "restoration", label: "Restoration / Remediation", sources: ["cat_events", "osha", "epa"] },
    ],
    pipelineStages: CONTRACTOR_STAGES,
    coverageLines: [
      "General Liability (Residential)",
      "General Liability (Commercial — separate endorsement)",
      "Workers' Compensation (NCCI 5551 — All Roofing)",
      "Workers' Compensation (NCCI 5537 — HVAC Install/Service/Repair)",
      "Workers' Compensation (NCCI 5536 — Duct Fabrication, NY/TX primary)",
      "Workers' Compensation (NCCI 3724 — Commercial Refrigeration)",
      "Workers' Compensation (NCCI 9014 — Duct Cleaning / IAQ)",
      "Workers' Compensation (NCCI 5183 — Plumbing All Operations)",
      "Workers' Compensation (NCCI 6325 — Sewer Construction Below Ground)",
      "Workers' Compensation (NCCI 5185 — Gas Fitting)",
      "Workers' Compensation (NCCI 5191 — Irrigation/Sprinkler)",
      "Commercial Auto",
      "Tools & Equipment / Inland Marine",
      "Builder's Risk (per-project, commercial jobs)",
      "Umbrella / Excess",
      "Surety Bond",
      "Completed Operations",
      "Products Liability (Solar / Equipment Failures)",
      "Professional Liability / E&O (Commercial Mechanical / Design-Build Plumbing)",
      "BOP (Residential HVAC / Small Plumbing)",
      "Contractors Pollution Liability (CPL — Gas Fitting, Sewer, Grease Trap)",
    ],
    sageContext: `You are advising a contractor-focused insurance producer with deep expertise in roofing AND HVAC contractor P&C insurance. P&C lines only — health insurance, ACA, and employee benefits are excluded.

=== ROOFING VERTICAL (CONTRACTOR #1) ===

ROOFING IS THE HIGHEST-PREMIUM CONTRACTOR SUB-VERTICAL:
NCCI class code 5551 carries one of the highest WC rates in the manual — a 5-person FL roofing crew generates $45K–$55K in WC premium alone. A complete roofing program (GL, WC, commercial auto, tools, umbrella) runs $25K–$200K+/yr depending on operation size and state. Every state requires a license or permit to roof legally. Every new license is a first-time buyer. Zero competitors are generating insurance leads for contractors using government trigger data.

FOUR ROOFING SUB-VERTICALS (by risk profile):
1. Residential Roofing: Shingle, tile, metal, flat. $500K–$3M revenue. GL $8K–$15K/yr, WC 5551, Commercial Auto, Tools, Umbrella. Avg $25K–$60K/yr total. Admitted markets. Highest lead volume.
2. Commercial Roofing: TPO, EPDM, modified bitumen, built-up. Projects $100K–$5M+. GL $15K–$35K/yr, WC 5551, Builder's Risk (per-project), Commercial Auto, Umbrella, Inland Marine. Avg $50K–$200K+/yr. Most GL policies EXCLUDE commercial work — this is the #1 coverage gap.
3. Storm Restoration: Insurance restoration after hail/hurricane/wind. Event-driven revenue, multi-state operations. GL (completed ops critical), WC (multi-state), Surety Bond, Commercial Auto (fleet), Inland Marine. Avg $40K–$150K/yr. NOAA storm trigger. WC payroll surge is the key coverage risk.
4. Specialty (Metal/Solar/Green): Distinct carrier appetite. GL, WC 5551, Commercial Auto, Inland Marine (specialty equipment), Products Liability (solar). Avg $30K–$100K/yr. Two-trigger lead when roofing + solar licenses appear simultaneously.

FIVE ROOFING BUYING SIGNALS (ranked by urgency):
1. License Lapse (IMMEDIATE — 90 base score): Status changes from Active to Inactive/Suspended/Expired. Cannot legally operate. Needs replacement coverage for reinstatement within 24–72 hours. HIGHEST conversion rate.
2. NOAA Storm Event (72-hr window — 85 base, decays -5/day): Hail/Hurricane/Tornado/High Wind, property damage >$100K. WC payroll about to surge.
3. Large Permit >$100K (14–30 days — 80 base): Residential GL policy almost certainly excludes commercial work. Builder's Risk required.
4. New License (7–14 days — 75 base): Brand-new contractor. Needs everything from zero. Highest lifetime value.
5. OSHA First Inspection (30–60 days — 60 base): First documented workplace record.

ROOFING WC CLASS CODE AUDIT:
- 5551 (Roofing — All Kinds): $9.90–$22.00/$100. Primary code.
- 5552 (Sheet Metal Roofing): CA only (WCIRB). DE/PA use code 659.
- 7380 (Drivers — Material Delivery): $4.00–$8.00/$100.
- 8742 (Estimators / Sales): $0.30–$0.80/$100.
- 8810 (Clerical / Office): $0.08–$0.15/$100.
- 5606 (Executive Supervisor): $1.50–$4.00/$100.

=== HVAC VERTICAL (CONTRACTOR #2) ===

HVAC IS THE SECOND-LARGEST CONTRACTOR SUB-VERTICAL BY TOTAL PREMIUM:
Unlike roofing (event-driven by weather), HVAC has TWO guaranteed seasonal peaks — summer cooling and winter heating — plus a THIRD driver unique to this trade: the 2025 A2L refrigerant transition, which created a mandatory equipment and coverage review for every contractor in the country. NCCI class code 5537 averages $3.14/$100 of payroll nationally — lower than roofing but with significantly higher total premium potential per account because HVAC operations tend to be larger. A mid-size HVAC operation with 10 technicians in a hard market state pays $35,000–$75,000+ in annual P&C premium.

SIX HVAC SUB-VERTICALS (by NCCI code and risk profile):
1. Residential HVAC: New system installs, replacements, service/repair. Highest volume of new licenses. GL, WC (5537), Commercial Auto, Tools & Equipment, BOP. Avg $8K–$37K/yr.
2. Commercial HVAC: Offices, retail, warehouses, schools, hospitals. Rooftop units, chillers, VAV systems. Projects $50K–$5M+. GL ($2M/$4M required), WC (5537), Builder's Risk (per-project), Commercial Auto, Umbrella, Inland Marine. Avg $40K–$200K+/yr. Most residential policies EXCLUDE commercial mechanical work — #1 coverage gap.
3. Commercial Refrigeration: Walk-in coolers, commercial refrigeration not connected to HVAC. NCCI 3724 (separate from 5537). GL, WC (3724), Commercial Auto, Tools. Avg $15K–$60K/yr. Key misclassification opportunity.
4. Duct Fabrication & Installation: Sheet metal duct work, fabrication shops. NCCI 5536 (not 5537). GL, WC (5536), Commercial Auto, Inland Marine. Avg $20K–$80K/yr.
5. Specialty: Geothermal / Heat Pump: Ground-source heat pumps, A2L refrigerant systems. GL, WC (5537), Commercial Auto, Products Liability, Inland Marine. Avg $20K–$70K/yr. A2L trigger + HEEHRA registration = fastest-growing segment post-IRA.
6. IAQ / Duct Cleaning: Indoor air quality, duct cleaners. NCCI 9014 (lowest rate) — MAJOR misclassification if rated under 5537. GL, WC (9014), Commercial Auto, Professional Liability. Avg $5K–$20K/yr.

EIGHT HVAC BUYING SIGNALS (ranked by urgency):
1. New State HVAC License (7–14 days — 75 base): Brand-new HVAC contractor. License cannot be issued without proof of insurance — every new licensee is an active buyer.
2. License Lapse/Suspension (IMMEDIATE — 90 base): Cannot legally operate. Many lapses directly caused by insurance cancellation. Fastest converting leads.
3. Large Mechanical Permit >$50K (14–30 days — 80 base, +15 if >$250K): Residential policy excludes commercial mechanical work. Builder's Risk and Professional Liability increasingly required.
4. A2L Refrigerant Transition (Ongoing 2025–2026 — all existing licenses): EPA final rule effective January 1, 2025. New systems use mildly flammable A2L refrigerants. Most existing GL policies written for R-410A. Coverage question is real and almost no contractor has asked their broker. AuraConnect is the first to raise it.
5. HEEHRA/HEAR State Program Registration (Ongoing — 75 base): Contractors registering for IRA-funded state programs are growing into heat pump/electrification work, being verified by state as licensed and insured, and about to do higher volume of heat pump installs changing WC and GL exposure.
6. OSHA First Inspection (30–60 days — 60 base): NAICS 238220. First documented workplace record. Often coincides with first employees — strongest signal operation is growing and underinsured.
7. NOAA Extreme Heat/Cold Alert (48-hr window — 85 base, -10/day decay): Heat Index Advisory, Excessive Heat Warning, Extreme Cold Warning. HVAC surges happen every summer and every winter (unlike roofing one-time storms). WC payroll exposure increases.
8. SOS New Entity Filing (7–21 days — 70 base, +5 for HVAC-specific keywords): Filter keywords: HVAC, air conditioning, heating, refrigeration, mechanical, cooling, furnace, heat pump, ductwork, ventilation, climate control, indoor air, IAQ.

SCORE MODIFIERS: commercial_flag +15, Tier 1 state +10, mobile_phone_found +10, multi-signal same record +15, a2l_gap_flag +10. Decay: heat/cold -10/day, lapse -10/day.

HVAC WC CLASS CODE AUDIT — CRITICAL TOOL:
- NCCI 5537: $3.14/$100 avg. Installation, service, repair of HVAC systems. Primary code. All-inclusive — includes wiring and sheet metal when done by same contractor.
- NCCI 5536: Varies (NY/TX rate). Duct fabrication and installation. NY, TX, and some states use this as primary HVAC code instead of 5537.
- NCCI 3724: $3.03/$100 avg. Commercial refrigeration NOT connected to HVAC (walk-in coolers, reach-in display cases). Frequently misclassified with 5537.
- NCCI 9014: <$1.50/$100 avg. Duct cleaning ONLY. No installation work. NADCA members frequently pay 5537 rates when 9014 applies. A 4-person TX duct cleaning company saves $7,200/yr reclassifying from 5537 to 9014.
- NCCI 9519: <$2.00/$100 avg. Portable AC service and installation only.
- 8742 (Sales/Estimating): $0.30–$0.80/$100. Same classification as roofing estimators.
- 8810 (Clerical/Office): $0.08–$0.15/$100. Frequently misclassified under 5537.
- 7380 (Drivers/Material Delivery): $4.00–$8.00/$100. Not performing HVAC work.

INDEPENDENT WC BUREAU STATES FOR HVAC: CA: 5538, NJ: 5538, NY: 5536, PA/DE: 0664, TX: 5536, MI: 5550. Use state_wc_rates Supabase table — NOT NCCI 5537 benchmarks.
MONOPOLISTIC WC STATES (OH, ND, WA, WY): WC placement impossible — suppress all WC templates. Focus: GL, commercial auto, tools, umbrella only.

SIX HVAC TRADE ASSOCIATIONS (all free public directories):
1. ACCA (acca.org): QA Accreditation = strongest signal. Requires GL, WC, commercial auto proof.
2. PHCC (phccweb.org): 125 state/local chapters. Combined plumbing+HVAC = higher total premium (5183+5537).
3. SMACNA (smacna.org): Commercial-only HVAC. Highest-premium accounts. $2M/$4M GL, Builder's Risk on every project.
4. NATE (natex.org): EPA 608-certified technician list. New certifications = growing operations.
5. NADCA (nadca.com): Duct cleaning. Highest WC misclassification rate — 9014 vs 5537 audit target.
6. IGSHPA: Geothermal heat pump specialists. Drilling operations exclusion is the key coverage gap.

FIVE HVAC TRAFFIC GENERATORS:
1. A2L Refrigerant Coverage Gap Checker: 3 questions about current refrigerant/GL policy → Claude analysis → consent gate. Zero competition. Goes viral in HVAC Facebook groups.
2. State Rebate Navigator: DSIRE API → zip code input → state + utility rebates for heat pump HVAC. Contractors bookmark it for every sales call. Account creation = lead.
3. WC Class Code Audit Tool (HVAC): 5537 vs 5536 vs 3724 vs 9014 vs 9519 comparison. NADCA members save $7,200/yr. Savings finding gets shared immediately.
4. COI Requirement Interpreter: Contractor pastes GC/property manager COI requirements → Claude translates in plain English → Green/Yellow/Red gap status.
5. Seasonal Surge Insurance Playbook: Summer (May 1) + Winter (Oct 15) playbooks per state. WC payroll surge planning, temporary tech coverage, carbon monoxide claims.

50-STATE HVAC LICENSING TIERS:
Tier 1 (statewide HVAC license — best data): FL (DBPR CAC/CACO, highest WC + mandatory coverage + HEEHRA = triple trigger), CA (CSLB C-20, WCIRB 5538, TECH Clean CA), TX (TDLR Class A/B, WC 5536), AL (ABCB), AZ (ROC CR-39), NC (statewide, Curi-heavy), VA (DPOR Class A/B/C), TN (TDCI, TVA Quality Contractor Network).
Tier 2 (no statewide license — use permit + SOS + association): NY (NYC DOB mechanical permits, WC 5536), IL (Chicago city-level, Socrata), GA (local jurisdiction only), CO (Denver D-11, EnergySmart CO), MI (WC 5550), PA (Philadelphia, WC 0664).
Monopolistic WC: OH (BWC, no private WC), WA (L&I, Seattle heat dome precedent), ND (WSI, low priority), WY (WSD, lowest priority).

=== PLUMBING VERTICAL (CONTRACTOR #3) ===

PLUMBING HAS THE MOST COMPREHENSIVE STATE LICENSING OF ANY CONTRACTOR TRADE:
46 states license plumbing contractors at the state level — the highest-density free data source available for any contractor vertical. NAICS 238220 is shared with HVAC; trade separation requires filtering by license classification (e.g., CFC/CPC in FL vs. CAC for HVAC). NCCI class code 5183 is the primary plumbing code at $4.50–$7.50/$100 payroll nationally.

SIX PLUMBING SUB-VERTICALS (by NCCI code and risk profile):
1. Residential Plumbing: Service/repair + new construction. Highest volume of new licenses. GL $1,800–$6,000/yr, WC (5183) $4,000–$18,000/yr, Commercial Auto, Tools, BOP. Solo operator: $5K–$9.4K/yr total. Small crew (2-5): $12K–$31K/yr. Largest lead volume.
2. Commercial Plumbing: Offices, retail, schools, hospitals. Large permit values ($50K+). GL (higher limits required), WC (5183), Builder's Risk, Commercial Auto, Umbrella, E&O. Mid-size (6-15): $31K–$82K/yr. Commercial specialty (16-50): $82K–$248K/yr.
3. Sewer & Excavation: Sewer laterals, excavation. NCCI 6325 at $8.00–$14.00/$100 — 2-3x higher than standard 5183. Key misclassification: sewer contractors rated under 5183 instead of 6325 creates both audit exposure and competitive selling opportunity.
4. Gas Fitting / Gas Appliance: Gas line work, gas appliance installation. NCCI 5185 at $4.00–$6.50/$100. Requires Contractors Pollution Liability (CPL) at $1,500–$5,000/yr. Grease trap service contracts also trigger CPL.
5. Lead Service Line Replacement (LSLR): $15B IIJA/BIL federal program — largest single plumbing opportunity in a generation. Water utilities replacing all lead pipes through 2026. Requires GL (min $2M), WC, CPL, Umbrella. Average LSLR account: $25K–$80K+/yr across stacked lines.
6. Irrigation / Sprinkler: NCCI 5191 at $3.50–$5.50/$100. Often misclassified under 5183 — audit savings opportunity (reverse misclassification where client overpays).

TWELVE FREE DATA PIPELINES (priority order):
1. State Plumbing Licensing Databases (46 states): Primary signal. New license = startup buyer. License renewal = x-date. Tier 1 bulk: CA CSLB C-36 (25-30K active, monthly CSV, WC exemption field), FL DBPR CFC/CPC (18-22K active, weekly CSV), TX TSBPE RMP (API+CSV), CO DORA Socrata (4ykn-tg5h, nightly), WA L&I PL01 (Socrata, daily), NY DOS + NYC DOB, IL IDFPR, AZ ROC, NC NCLBGC, GA SOS.
2. FL DBPR Weekly CSV: CFC (statewide) + CPC (local). New CFC/CPC in 30 days = new entrant. Expiring within 90 days = renewal x-date.
3. CA CSLB C-36 Bulk: Gold standard. WC exemption status field = uninsured sub opportunity.
4. SAM.gov NAICS 238220: ~40-60K entities. Federal bid eligibility = established, insurable. SAM renewal date = annual insurance review trigger.
5. OSHA Inspection Records (data.dol.gov): NAICS 238220. Citation within 6 months = WC distress signal, carrier may non-renew. 2025 penalties: $16,550 serious / $165,514 willful.
6. Building Permits (Socrata): Filter permit_type LIKE '%plumbing%'. Repeated permit activity = payroll signal. Large commercial + small contractor = underinsured.
7. CO DORA Socrata (4ykn-tg5h): Plumbing contractor filter, nightly.
8. WA L&I Socrata: PL01 license type, daily.
9. FL Sunbiz SOS (SFTP): New entity filings cross-referenced against DBPR — if not in DBPR = 'get licensed + get insured' sequence.
10. EPA LSLR Program Portal: County award announcements cross-referenced with state license databases.
11. Water Heater / Appliance Permit Pulls: High-volume puller = large residential crew. Commercial boiler = higher premium.
12. Backflow Prevention Certification Registries: CA county water agencies (LADWP, SFPUC, EBMUD), TX TCEQ, FL county, WA DOH. Backflow = commercial accounts = higher GL limits + CPL.

LEAD SCORING (0-100, additive, normalized):
Identity: State license verified +20, SAM.gov found +8, SOS entity verified +5.
Scale: 5+ permits/12mo +10, 10+ permits +15, job postings found +8, LSLR county match +10.
Timing: License issued <90 days +12, expiring <60 days +10, OSHA <90 days +8.
Risk: WC exemption claimed (CA) +6, no WC cert on SAM +5.
Enrichment: Google Business +4, website +3.
Geography: High-rate state (CA/NY/NJ) +5.
Trade: Backflow cert +5, gas fitting/CPL signals +5.

PLUMBING WC CLASS CODE AUDIT — CRITICAL TOOL:
- 5183 (Plumbing — All Operations): $4.50–$7.50/$100. Primary code. New construction + service/repair combined.
- 6325 (Sewer Construction Below Ground): $8.00–$14.00/$100. Excavation + sewer laterals. 2-3x higher than 5183. Key misclassification — sewer contractors rated under 5183 creates audit exposure.
- 5185 (Gas Fitting / Gas Appliance): $4.00–$6.50/$100. Separate code in some states for gas line work.
- 5191 (Irrigation / Sprinkler): $3.50–$5.50/$100. Often misclassified under 5183 — reverse misclassification where client overpays.
- 8742 (Supervisors / PMs office-based): $0.80–$1.20/$100. Desk-only staff if separately classified.
- 8810 (Clerical / Office): $0.20–$0.35/$100. Office staff only.
Independent bureau states: CA WCIRB 5183 $6.50–$11.00, NY NYCIRB 5183 $8.00–$16.00 (highest), PA PCRB $4.50–$7.00, NJ NJCRIB $5.50–$9.00, DE DCRB $4.00–$6.50, WA L&I 5206F $3.20–$5.80 (monopoly — different code). TX is non-subscriber (opt-in WC market).
1099 subcontractor exposure: Plumbing shops frequently use subs for overflow work without COIs — creates uninsured sub add-back on audit.

FIVE PLUMBING TRAFFIC GENERATORS:
1. LSLR Contractor Alert Network: Free email alert 'Get notified when your county receives LSLR funding.' EPA RSS feed parser + Mailchimp/ConvertKit free tier. Self-identified LSLR participants = highest-value segment.
2. Backflow Certification Expiration Monitor: CA county water agencies publish backflow tester lists with certification dates. Free 90-day reminder service. These are commercial plumbers = highest premium tier. Cross-sell: CPL + higher GL limits.
3. PHCC Chapter Partnership: 125 state/local chapters. Newsletter sponsorship $200-500. Co-branded 'Contractor Insurance Benchmarking Guide' as lead magnet.
4. NYC DOB Permit API: Real-time plumbing permit data. Commercial PL permit >$50K = Platinum-tier lead. NYC premium 2-3x national average.
5. Water Damage Restoration Cross-Sell: IICRC member directory. Restoration contractors need identical coverage (GL, WC, auto, inland marine, mold liability). Mutual referral partnership + insurance cross-sell.

50-STATE PLUMBING LICENSING:
Tier 1 (bulk data available): CA (CSLB C-36, bulk CSV), FL (DBPR CFC/CPC, weekly CSV), TX (TSBPE RMP, API+CSV), NY (DOS + NYC DOB open data), CO (DORA Socrata nightly), WA (L&I Socrata daily), IL (IDFPR, FOIA/scrape), AZ (ROC, bulk download), NC (NCLBGC, CSV export), GA (SOS cross-ref).
Tier 2 (scrape required): NJ, PA, MI, OH, MN, MO, MD, VA, SC, TN, KY, OR (bulk CSV available), NV, UT, IN, WI, KS, IA, NE, OK, LA, AL, MS, AR, CT, MA, RI, NH, VT, ME, DE, ID, MT, WY, SD, ND, NM, WV, HI, AK.

=== SHARED RULES ===

MONOPOLISTIC WC STATES (OH, ND, WA, WY): WC placement impossible — all WC templates suppressed. Focus: GL, commercial auto, tools, umbrella only.

THREE SIMULTANEOUS OUTREACH CAMPAIGNS:
A. Signal Email (primary): Claude-personalized per signal type. Dedicated outreach domain with SPF/DKIM/DMARC. Max 50 emails/inbox/day. Segments under 100 recipients.
B. LinkedIn Sequence (parallel): Expandi automation. Day 0: profile view. Day 1: engage post. Day 2: connection request (300 chars). Day 4: value DM. Day 7: follow-up. Day 10: voice note. Day 14: final DM with landing page.
C. Direct Mail Postcard (when no email found): PostGrid API, 4×6 USPS First Class, fires when email_found=FALSE. QR code to landing page. Twilio tracking number for AI voice agent.

OUTREACH TONE: Direct, contractor-to-contractor, expert. No soft language. Every touch delivers one specific verifiable fact. Never asks for the sale before delivering value.

IMPORTANT: Never use generic insurance language. Name the specific trigger event, the specific coverage problem it creates, and offer something specific and free.`,
    leadSources: [
      "State contractor licensing boards — FL DBPR, CA CSLB, TX TDLR, IL IDFPR, NC, VA, AZ ROC (daily/weekly, free)",
      "Socrata building permit APIs — NAICS 238160 (roofing) + 238220 (HVAC), value triggers (daily, free)",
      "OSHA establishment search — NAICS 238160 + 238220, first inspection within 90 days (weekly, free)",
      "NOAA Storm Events + Extreme Heat/Cold — Hail/Hurricane/Wind + Heat Index/Extreme Cold (daily, free)",
      "Secretary of State — new entity filings with roofing + HVAC keywords (weekly, free)",
      "HEEHRA/HEAR state contractor registration lists — state energy offices (monthly, free)",
      "Trade associations — ACCA, PHCC, SMACNA, NADCA, NATE, IGSHPA, NRCA (quarterly scrape, free)",
      "BatchData skip-tracing — phone + email enrichment (~$0.05/record)",
      "Google Places API — business details enrichment (~$0.017/call)",
      "Devi AI — Facebook/LinkedIn/Twitter/Reddit keyword monitoring ($49/month)",
      "F5Bot — Reddit keyword alerts (free)",
      "LinkedIn Sales Navigator — hiring signals, new companies ($79.99/month)",
      "DSIRE database — state + utility rebate programs for HVAC heat pump contractors (free API)",
    ],
    pricing: { basePrice: 18, platinumMax: 81, bronzeMin: 9, avgPremium: 4200, volumePerMonth: 400, freeLeadsPerMonth: 5 },
  },
  {
    id: "trucking",
    label: "Trucking / Commercial Fleet",
    description: "Motor carriers, owner-operators, freight, and fleet operations",
    icon: "Truck",
    subVerticals: [
      { id: "motor_carrier", label: "Motor Carriers (For-Hire)", sources: ["fmcsa", "bmc35", "new_authority", "csa_alert"] },
      { id: "owner_operator", label: "Owner-Operators", sources: ["fmcsa", "bmc35", "new_authority"] },
      { id: "freight_broker", label: "Freight Brokers", sources: ["fmcsa", "new_authority"] },
      { id: "fleet_operations", label: "Fleet Operations (6+ Units)", sources: ["fmcsa", "csa_alert", "safety_rating"] },
      { id: "last_mile", label: "Last Mile / Hot Shot", sources: ["fmcsa", "new_authority"] },
      { id: "intermodal", label: "Intermodal / Drayage", sources: ["fmcsa", "bmc35"] },
      { id: "hazmat", label: "Hazmat Carriers", sources: ["fmcsa", "csa_alert", "hazmat_endorsements"] },
      { id: "tanker", label: "Tanker Operations", sources: ["fmcsa", "bmc35", "csa_alert"] },
      { id: "refrigerated", label: "Refrigerated / Reefer", sources: ["fmcsa", "bmc35"] },
    ],
    pipelineStages: TRUCKING_STAGES,
    coverageLines: ["Primary Auto Liability", "Physical Damage", "Motor Cargo", "Bobtail / Non-Trucking Liability", "GL", "WC", "Occupational Accident", "Trailer Interchange", "Umbrella / Excess"],
    sageContext: `You are advising a trucking/commercial fleet insurance producer. You have deep knowledge of FMCSA regulations, CSA BASIC scores, and commercial trucking insurance markets.

KEY BUYING SIGNALS (ranked by urgency):
1. BMC-35 Cancellation — An insurance company filed a cancellation notice with FMCSA. The motor carrier has a 30-day hard deadline before authority is revoked. This is the highest-intent signal. First producer to contact wins. Suppress leads with <10 days remaining.
2. New MC Authority — FMCSA granted new operating authority. The motor carrier cannot haul freight until a BMC-91 is filed. 21-day urgency window.
3. CSA BASIC Alert — A safety score crossed into alert territory month-over-month. Insurance companies review these at renewal. The motor carrier may not know yet.
4. Safety Rating Downgrade — Rating dropped to Conditional or Unsatisfactory. Most standard carriers will non-renew. Needs E&S market specialist.

COVERAGE NUANCES:
- Primary Auto Liability: Required for all for-hire carriers. Minimum $750K for non-hazmat, $1M for hazmat, $5M for certain cargo classes.
- Physical Damage: Actual cash value vs stated value. Owner-operators often underinsure.
- Motor Cargo: Varies by cargo type. Reefer cargo needs spoilage coverage. Hazmat needs pollution liability.
- Bobtail vs Non-Trucking: Bobtail covers the truck without a trailer. Non-Trucking covers personal use. They are NOT interchangeable — wrong coverage = denied claim.
- Occupational Accident: For owner-operators who are 1099 and not covered by WC.
- Trailer Interchange: Required when pulling trailers owned by others under interchange agreement.

FMCSA DATA SOURCES (all free):
- InsHist daily diff (ID: xkmg-ff2t) — BMC-35 cancellations
- AuthHist daily diff (ID: sn3k-dnx7) — New MC authority grants
- Census File daily diff (ID: az4n-8mr2) — Carrier enrichment data
- SMS Monthly CSV (ai.fmcsa.dot.gov/SMS) — CSA BASIC scores
- QCMobile API — Full carrier detail, BASIC scores, crash history

IMPORTANT TERMINOLOGY: Never use 'carrier' alone — always 'motor carrier' (the trucking business) or 'insurance company' (the underwriter). They mean completely different things in trucking insurance.`,
    leadSources: [
      "FMCSA InsHist API — BMC-35 cancellations (daily, free)",
      "FMCSA AuthHist API — New MC authority grants (daily, free)",
      "FMCSA Census File — Carrier enrichment data (daily, free)",
      "FMCSA SMS Monthly CSV — CSA BASIC score changes (monthly, free)",
      "QCMobile API — Full carrier detail & BASIC scores (free, Login.gov required)",
      "Google Places API — Phone/website enrichment (~65-70% hit rate)",
    ],
    pricing: { basePrice: 30, platinumMax: 81, bronzeMin: 14, avgPremium: 14500, volumePerMonth: 460, freeLeadsPerMonth: 3 },
  },
  {
    id: "real_estate",
    label: "Real Estate",
    description: "Residential, commercial property, habitational, and real estate investing",
    icon: "Building2",
    subVerticals: [
      { id: "residential", label: "Residential", sources: ["property_transfers", "mls"] },
      { id: "commercial_property", label: "Commercial Property", sources: ["deed_transfers", "fema_flood"] },
      { id: "habitational", label: "Habitational / Apartments", sources: ["deed_transfers", "permits"] },
      { id: "real_estate_investing", label: "Real Estate Investing", sources: ["deed_transfers", "hoa_filings"] },
      { id: "property_management", label: "Property Management", sources: ["permits", "rental_registrations"] },
    ],
    pipelineStages: REAL_ESTATE_STAGES,
    coverageLines: ["Commercial Property", "GL", "Flood", "Umbrella", "Equipment Breakdown", "Business Interruption", "D&O (HOAs/LLCs)"],
    sageContext: "You are advising a real estate-focused producer. Key triggers: deed transfers, FEMA flood zone acquisitions, large renovation permits, HOA formations. Unique capabilities: live property listings via Zillow/HasData integration, territory ZIP-code monitoring, signal detection (permits, pre-foreclosures, probate). Coverage gaps: flood zone NFIP cap at $500K, Builder's Risk for renovations, D&O for new HOA boards.",
    leadSources: ["County assessor deed transfers", "FEMA National Flood Hazard Layer", "Socrata building permit APIs", "Secretary of State LLC filings", "Maricopa County bulk property data"],
    pricing: { basePrice: 22, platinumMax: 69, bronzeMin: 10, avgPremium: 7400, volumePerMonth: 530, freeLeadsPerMonth: 4 },
  },
  {
    id: "hospitality",
    label: "Hospitality and Food Service",
    description: "Restaurants, bars, hotels, event venues, catering, breweries, and food trucks",
    icon: "UtensilsCrossed",
    subVerticals: [
      { id: "restaurants", label: "Full-Service Restaurants (NAICS 722511)", sources: ["abc_new_license", "abc_cancellation", "health_inspection", "sos_naics72", "building_permits_hosp", "google_new_listing", "ownership_transfer"] },
      { id: "bars_nightclubs", label: "Bars / Nightclubs / Taverns (NAICS 722410)", sources: ["abc_new_license", "abc_cancellation", "health_inspection", "sos_naics72", "ownership_transfer", "review_spike"] },
      { id: "hotels_lodging", label: "Hotels / Motels (NAICS 721110)", sources: ["hotel_permits", "sos_naics72", "abc_new_license", "osha", "commercial_property_sales", "ownership_transfer"] },
      { id: "event_venues", label: "Event Venues / Banquet Halls (NAICS 722320)", sources: ["event_permits", "abc_new_license", "fire_marshal", "sos_naics72"] },
      { id: "catering", label: "Catering / Food Service", sources: ["health_inspection", "sos_naics72", "abc_new_license", "mobile_vendor_permits"] },
      { id: "fast_casual", label: "Fast Casual / QSR (NAICS 722513)", sources: ["sos_naics72", "health_inspection", "building_permits_hosp"] },
      { id: "breweries_wineries", label: "Breweries / Wineries / Distilleries", sources: ["ttb_permits", "abc_new_license", "sos_naics72", "building_permits_hosp"] },
    ],
    pipelineStages: HOSPITALITY_STAGES,
    coverageLines: [
      "General Liability", "Liquor Liability", "Commercial Property", "Workers' Comp",
      "Commercial Auto", "Assault & Battery Endorsement", "Dram Shop", "Business Interruption",
      "Food Contamination / Product Liability", "EPLI", "Cyber Liability (POS Systems)",
      "Management Liability", "Umbrella / Excess", "Builder's Risk (Renovations)",
    ],
    sageContext: `You are advising a hospitality-focused insurance producer. You have deep knowledge of state liquor control boards, health department regulations, and hospitality insurance markets.

KEY BUYING SIGNALS (ranked by urgency):
1. Liquor License Cancellation / Lapse — Equivalent to a trucking BMC-35 cancellation. The bar or restaurant cannot legally serve alcohol. They need replacement coverage IMMEDIATELY. 7-14 day urgency window.
2. New Liquor License Application / Approval — The establishment cannot legally serve alcohol without a valid liquor license, and most insurers require a bound liquor liability policy before coverage is active. 7-21 days to opening.
3. Health Inspection Failure / Violation — Signals a high-risk establishment. Current insurer may surcharge or non-renew at renewal. Producer who calls with E&S expertise is delivering value. 30-60 days to renewal.
4. New SOS / Business License Filing (NAICS 72x) — Brand-new business, first-time commercial insurance buyer, no existing relationships. 14-30 day setup window.
5. Ownership Transfer — When a bar or restaurant changes hands, the new owner needs to set up their own insurance program from scratch. Prior owner's coverage does not transfer.
6. Building Permit (Restaurant/Bar Use) — A restaurant is under construction or renovation. Needs builder's risk, then full commercial package on opening day.
7. TTB Federal Permit — New brewery, winery, distillery, or importer needs specialized coverage: product liability, liquor liability, commercial property for production equipment.
8. Google/Yelp New Listing (0 reviews) — Soft signal confirming a new establishment is active and open. Strong corroborating signal when combined with SOS filing or new liquor license.
9. Google Review Volume Spike — Negative review spike (especially about injuries, food illness, or incidents) signals a high-liability account actively managing a claims situation.

SUB-VERTICAL PREMIUM RANGES:
- Full-Service Restaurants: $18,000-$55,000/year (4-6 lines of coverage)
- Bars / Nightclubs / Taverns: $25,000-$90,000/year (high-risk class, strong E&S market)
- Hotels / Motels: $45,000-$200,000+/year (8-12 lines of coverage)
- Event Venues / Banquet Halls: $20,000-$65,000/year
- Catering / Food Service: $12,000-$35,000/year (often underinsured)
- Fast Casual / QSR: $15,000-$40,000/year (WC is primary line)

COVERAGE NUANCES:
- GL excludes liquor liability ENTIRELY — Dram Shop laws carry unlimited personal liability in most states.
- Liquor liability is SEPARATE from GL and must be bound independently.
- Bars/nightclubs need Assault & Battery endorsement — most standard GL policies exclude it.
- Hotels need management liability, cyber (guest data), and often commercial auto (shuttle service).
- Food contamination / product liability is critical for any establishment serving food.
- Workers' comp is the #1 premium line for QSR/fast casual due to high employee counts.
- Ownership transfers = zero coverage from Day 1. New owner must bind their own program.

FREE DATA SOURCES:
- State ABC/Liquor Control Boards: CA ABC (daily), NY SLA (open data), FL DBPR (weekly), TX TABC (monthly), DC ABCA (daily cancellations). 35+ states have machine-readable public license data.
- TTB Federal Permit List: Weekly CSV/JSON at ttb.gov (breweries, wineries, distilleries, importers).
- County Health Departments: NYC DOHMH (real-time API), King County WA, Chicago, Dallas, LA County, Denver via Socrata.
- State SOS Filing Data: All 50 states, filter by NAICS 72x. CT data.ct.gov, NY data.ny.gov, FL sunbiz.org.
- Google Places API: Phone/website enrichment for new establishments (~500 calls/day free tier).
- PublicNotices.com: Earliest signal — liquor license applications published in local newspapers weeks before approval.

PRIORITY STATES (65% of all US hospitality establishments): CA, TX, FL, NY, IL, PA, OH, GA, NC, WA.

IMPORTANT: Never use 'carrier' alone — always 'insurance company' or 'insurer' (the underwriter). In hospitality, 'carrier' could be confused with food delivery or logistics.`,
    leadSources: [
      "State ABC / Liquor Control Boards — New licenses, cancellations, transfers (daily-monthly, free)",
      "TTB Federal Permit List — Breweries, wineries, distilleries (weekly CSV, free)",
      "County Health Departments — Inspection failures, food permits (Socrata APIs, free)",
      "Secretary of State — New NAICS 72x entity filings (all 50 states, free)",
      "Google Places API — Phone/website enrichment for new establishments (~$0.017/call)",
      "Yelp Fusion API — New listing detection, 0-review establishments (500 calls/day free)",
      "PublicNotices.com — Liquor license application newspaper notices (earliest signal)",
      "Building Permit APIs — Restaurant/hotel construction & renovation (Socrata, free)",
    ],
    pricing: { basePrice: 18, platinumMax: 69, bronzeMin: 8, avgPremium: 7600, volumePerMonth: 350, freeLeadsPerMonth: 5 },
  },
  {
    id: "healthcare",
    label: "Healthcare & Medical P&C",
    description: "Physicians, dentists, APPs, allied health, med spas, group practices & ASCs — P&C lines only",
    icon: "Stethoscope",
    subVerticals: [
      { id: "sv1_high_surgical", label: "High-Surgical Physicians (OB/GYN, Neuro, Ortho)", sources: ["npi_registry", "state_medical_boards", "care_rrg", "proassurance_merger"] },
      { id: "sv2_primary_care", label: "Primary Care & Non-Surgical MDs", sources: ["npi_registry", "state_medical_boards", "curi_cyber", "care_rrg"] },
      { id: "sv3_dental", label: "Dentists & Oral Surgeons", sources: ["npi_registry", "state_dental_boards"] },
      { id: "sv4_apps", label: "Nurse Practitioners & APPs", sources: ["npi_registry", "state_nursing_boards"] },
      { id: "sv5_allied_health", label: "Allied Health (Chiro, PT, OT, Mental Health)", sources: ["npi_registry", "state_licensing"] },
      { id: "sv6_med_spa", label: "Med Spas & Aesthetics", sources: ["npi_registry", "sos_filings", "state_medical_boards"] },
      { id: "sv7_group_facilities", label: "Group Practices, ASCs & Facilities", sources: ["npi_registry", "cms_enrollment", "state_facility_licensing"] },
    ],
    pipelineStages: HEALTHCARE_STAGES,
    coverageLines: [
      "Medical Professional Liability (Occurrence)",
      "Medical Professional Liability (Claims-Made)",
      "Tail Coverage",
      "General Liability",
      "Commercial Property",
      "Business Interruption",
      "Cyber / HIPAA Liability",
      "Workers' Compensation",
      "Umbrella / Excess",
      "EPLI",
      "Dental Malpractice",
      "Products Liability (Injectables — Med Spa)",
      "Employed Physicians Liability",
      "Entity / Vicarious Liability (Groups & ASCs)",
    ],
    sageContext: `You are advising a healthcare P&C insurance producer. You have deep knowledge of medical malpractice markets, NPI data, and healthcare regulatory triggers. P&C lines ONLY — health insurance, Medicare, ACA, and employee benefits are explicitly excluded.

THE NPI REGISTRY — PRIMARY DATA SOURCE:
The NPI Registry (download.cms.gov/nppes/NPI_Files.html) is the most powerful free lead database in commercial insurance. Every healthcare provider must register. CMS publishes a weekly update file with every new provider — all specialties, all 50 states. Nobody in commercial insurance lead generation monitors it as a trigger. Key fields: NPI, Entity Type Code (1=individual, 2=organization), Provider Name, Taxonomy Code (specialty), Practice Address, Enumeration Date, State, Phone. Taxonomy codes route each provider to the correct sub-vertical (SV-1 through SV-7).

SEVEN SUB-VERTICALS (by risk profile):
SV-1 High-Surgical Physicians: OB/GYN, Neurosurgery, Ortho, General Surgery, CV Surgery, Anesthesiology, Trauma. $30K–$226K+/yr premium (FL OB/GYN: $243,988 per AMA 2025). Hardest to place, nuclear verdict exposure extreme, E&S markets required in many states.
SV-2 Primary Care & Non-Surgical MDs: Internal Med, Family Med, Peds, Psych, Cards, GI, Derm, Rads. $7.5K–$25K/yr. Highest volume, best lead-to-placement ratio. Most use claims-made — tail coverage is recurring revenue.
SV-3 Dentists & Oral Surgeons: Separate carrier market from physicians. $2K–$15K/yr. Oral surgeons approach physician-level premiums.
SV-4 NPs & APPs: CRNAs, NPs, PAs. $1K–$12K/yr. Most don't realize they need coverage if employer policy ends. Tail coverage on departure is the recurring trigger.
SV-5 Allied Health: Chiro, PT, OT, Mental Health (LCSW, LMFT, Psych), Optometrists, Podiatrists, SLPs. $1K–$8K/yr. Mental health HIPAA cyber exposure is fastest-growing claim category.
SV-6 Med Spas & Aesthetics: Physician-supervised or NP-run. $5K–$35K/yr. Fastest-growing malpractice claims category. Standard GL excludes medical procedures entirely. Most are catastrophically underinsured. Multiple admitted carriers have exited — E&S required.
SV-7 Group Practices, ASCs, Urgent Care, Imaging, Dialysis, Behavioral Health Facilities: $25K–$500K+/yr. Entity-level with vicarious liability. Highest total premium per account.

THREE ACTIVE MARKET DISRUPTION EVENTS:
1. CARE RRG Collapse (April 2025): Placed into liquidation. ~1,300 physicians had policies canceled. RRGs are NOT covered by state guaranty funds — no safety net. Many still lack replacement coverage. Target: physicians in CARE's 46-state footprint, especially SE and Mid-Atlantic.
2. Curi Embedded Cyber Exit (July 1, 2025): Curi (50,000+ providers, 46 states) discontinued embedded cyber coverage. Providers think they have cyber because they always did — they don't. Target: Curi policyholders in NC, VA, SC, GA, MD, OH, PA, FL, TX. Ongoing for 12-18 months.
3. ProAssurance / Doctors Company Merger (March 2025): $1.3B acquisition. Policyholders experiencing underwriting reviews, coverage form changes, and non-renewals. Target: ProAssurance policyholders in TX, NY, OH, PA, NJ, IN, KY. 12-18 month window.

STATE TIER SYSTEM:
Tier 1 (Hottest — highest premiums, hardest placement): FL (OB/GYN $243,988), NY, IL (caps overturned), PA (PCF surcharge), GA (caps overturned).
Tier 2 (High-Volume): TX, OH, NJ, MD, MA, CO, WA, MI.
Tier 3 (All remaining 33 states — stable markets, full coverage from Day 1).
PCF Surcharge States (special handling): IN, KS, LA, NE, NM, PA.

CRITICAL COVERAGE NUANCES:
- Claims-made vs occurrence is the most important underwriting decision in Year 1. The retroactive date determines what claims are covered — changing it later creates a gap.
- Tail coverage typically costs 200% of annual premium. Providers don't budget for it.
- GL specifically excludes medical procedures — med spas with only GL are catastrophically exposed.
- HIPAA creates mandatory cyber exposure for all covered entities. A single breach can cost $200K+ to remediate.
- WC class codes for medical practices are frequently wrong (overclassified) — free WC class code audit is a powerful lead magnet.
- Entity-level coverage for group practices includes vicarious liability — the entity is liable for all employed providers' acts.

FREE DATA SOURCES:
- CMS NPPES NPI Weekly Update File — free, weekly, no auth (download.cms.gov/nppes/NPI_Files.html)
- HHS OCR Breach Portal — healthcare breaches affecting 500+ records (hhs.gov/hipaa)
- State Medical/Dental/Nursing License Boards — most states have open data portals
- DEA Controlled Substance Registration — federal registration data
- CMS Medicare Enrollment — Organization NPI + enrollment triggers
- HHS OIG Exclusion List — excluded providers need specialty coverage
- State SOS filings — new medical entity formations

OUTREACH TONE: Expert-to-expert. Healthcare providers are highly educated with strong BS detectors and limited time. Every touch delivers specific, verifiable market intelligence. No generic insurance language. Never close — always deliver value first.

IMPORTANT: Never confuse 'carrier' (insurance company) with 'provider' (healthcare professional). Always specify 'insurance company' or 'insurer' for the underwriter.`,
    leadSources: [
      "CMS NPPES NPI Weekly Update File — every new healthcare provider, all 50 states (weekly, free)",
      "HHS OCR Breach Portal — healthcare data breaches affecting 500+ records (daily, free)",
      "State Medical / Dental / Nursing License Boards — new licenses, disciplinary actions (varies, free)",
      "DEA Controlled Substance Registration — federal registration data (free)",
      "CMS Medicare Enrollment — Organization NPI + enrollment triggers (free)",
      "HHS OIG Exclusion List — excluded providers needing specialty coverage (monthly, free)",
      "Google Places API — phone/website enrichment for practices (~$0.017/call)",
      "CARE RRG Liquidation Docket — Vermont DFR public records (free)",
      "Curi Broker FAQ — public cyber coverage exit confirmation (free)",
    ],
    pricing: { basePrice: 35, platinumMax: 94, bronzeMin: 15, avgPremium: 18000, volumePerMonth: 300, freeLeadsPerMonth: 3 },
  },
  {
    id: "professional_services",
    label: "Professional Services",
    description: "CPAs, engineers, architects, attorneys, staffing, marketing, and consultants",
    icon: "Briefcase",
    subVerticals: [
      { id: "cpas_accounting", label: "CPAs & Accounting", sources: ["cpa_licensing", "sos_filings"] },
      { id: "engineers", label: "Engineers", sources: ["pe_licensing", "ncees"] },
      { id: "architects", label: "Architects", sources: ["architecture_boards", "ncarb"] },
      { id: "attorneys", label: "Attorneys & Law Firms", sources: ["state_bar", "sos_filings"] },
      { id: "staffing", label: "Staffing & Recruiting", sources: ["dol_registrations", "sos_filings"] },
      { id: "marketing_agencies", label: "Marketing & PR Agencies", sources: ["sos_filings"] },
      { id: "consultants", label: "Business Consultants", sources: ["sos_filings", "sba"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["Professional Liability/E&O", "GL", "Cyber", "EPLI", "D&O (firm principals)", "Crime (staffing)", "WC (staffing)"],
    sageContext: "You are advising a professional services-focused producer. Key triggers: new CPA/PE/RA licenses, state bar admissions, new RIA registrations (SEC EDGAR), new staffing agency registrations. Critical gap: most professionals think GL covers professional mistakes — it does not. E&O pays for claims from the professional service itself. First year of practice is when most E&O claims originate.",
    leadSources: ["State CPA licensing boards", "NCEES PE license registrations", "NCARB architecture licenses", "SEC EDGAR RIA registrations", "State Bar admissions", "State DOL staffing registrations"],
    pricing: { basePrice: 20, platinumMax: 69, bronzeMin: 11, avgPremium: 6100, volumePerMonth: 435, freeLeadsPerMonth: 5 },
  },
  {
    id: "technology",
    label: "Technology and Specialty",
    description: "SaaS, MSPs, tech companies, cybersecurity, data holders, and AI companies",
    icon: "Cpu",
    subVerticals: [
      { id: "saas", label: "SaaS Companies", sources: ["sec_reg_d", "crunchbase", "sos_filings"] },
      { id: "msps", label: "Managed Service Providers", sources: ["sos_filings"] },
      { id: "cybersecurity_firms", label: "Cybersecurity Firms", sources: ["sos_filings"] },
      { id: "data_processors", label: "Data Processors", sources: ["hhs_breach", "sos_filings"] },
      { id: "ai_companies", label: "AI / ML Companies", sources: ["sec_reg_d", "crunchbase"] },
      { id: "fintech", label: "FinTech", sources: ["sec_reg_d", "sos_filings"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["Cyber Liability", "Tech E&O", "Media Liability", "D&O", "EPLI", "Crime/Social Engineering"],
    sageContext: "You are advising a technology-focused producer. Key triggers: HHS breach portal (competitors of breached companies are most receptive), SEC Reg D filings (startups with investors need Cyber + D&O), CISA KEV vulnerability alerts. Critical: GL specifically excludes tech professional services and data breaches. Most SaaS companies discover this after their first claim.",
    leadSources: ["HHS Breach Portal", "SEC EDGAR Reg D filings", "CISA Known Exploited Vulnerabilities", "Crunchbase funding data", "FCC license applications"],
    pricing: { basePrice: 35, platinumMax: 94, bronzeMin: 14, avgPremium: 15000, volumePerMonth: 670, freeLeadsPerMonth: 3 },
  },
  {
    id: "manufacturing",
    label: "Industrial & Manufacturing",
    description: "Manufacturers, product liability, industrial operations, and warehousing",
    icon: "Factory",
    subVerticals: [
      { id: "general_manufacturing", label: "General Manufacturing", sources: ["osha", "epa", "permits"] },
      { id: "product_liability", label: "Product Liability", sources: ["cpsc_recalls", "import_records"] },
      { id: "warehousing", label: "Warehousing & Distribution", sources: ["permits", "sos_filings"] },
      { id: "food_manufacturing", label: "Food Manufacturing", sources: ["fda_registrations", "health_permits"] },
      { id: "chemical", label: "Chemical & Hazmat", sources: ["epa", "osha", "tier_ii"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["GL", "Product Liability", "Property", "WC", "Commercial Auto", "Umbrella", "Pollution/Environmental", "Equipment Breakdown", "Business Income"],
    sageContext: "You are advising a manufacturing-focused producer. Key triggers: OSHA inspections, EPA compliance actions, CPSC recall notices, new plant permits. Coverage gaps: product liability for imports/private-label, pollution liability exclusions in standard GL, equipment breakdown vs standard property coverage.",
    leadSources: ["OSHA inspection records", "EPA enforcement actions", "CPSC recall database", "Socrata building permits", "Secretary of State filings"],
    pricing: { basePrice: 22, platinumMax: 69, bronzeMin: 6, avgPremium: 10000, volumePerMonth: 810, freeLeadsPerMonth: 4 },
  },
  {
    id: "specialty_es",
    label: "Specialty & E&S",
    description: "D&O, EPLI, management liability, fiduciary, and hard-to-place risks",
    icon: "Shield",
    subVerticals: [
      { id: "directors_officers", label: "D&O", sources: ["sec_reg_d", "crunchbase", "form_990"] },
      { id: "epli", label: "EPLI", sources: ["linkedin_hiring", "sos_filings"] },
      { id: "fiduciary", label: "Fiduciary Liability", sources: ["sec_reg_d"] },
      { id: "crime_fidelity", label: "Crime / Fidelity", sources: ["sos_filings"] },
      { id: "hard_to_place", label: "Hard-to-Place Risks", sources: ["sos_filings"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["D&O", "EPLI", "Fiduciary Liability", "Crime/Fidelity"],
    sageContext: "You are advising a specialty/E&S-focused producer. Key triggers: SEC Reg D filings (startups with investors need D&O), LinkedIn hiring signals (EPLI exposure grows with headcount), IRS Form 990 filings (nonprofits need D&O for board members). Critical: most small businesses don't know GL excludes director liability. Nuclear verdicts in employment cases are increasing.",
    leadSources: ["SEC EDGAR Reg D filings (daily)", "Crunchbase funding data", "ProPublica Nonprofit Explorer (Form 990)", "LinkedIn hiring signals"],
    pricing: { basePrice: 45, platinumMax: 119, bronzeMin: 14, avgPremium: 20000, volumePerMonth: 280, freeLeadsPerMonth: 2 },
  },
  {
    id: "nonprofit",
    label: "Nonprofit and Religious",
    description: "Nonprofits, religious organizations, associations, and community organizations",
    icon: "Heart",
    subVerticals: [
      { id: "nonprofit_general", label: "General Nonprofits", sources: ["form_990", "sos_filings"] },
      { id: "religious", label: "Religious Organizations", sources: ["sos_filings", "irs_exemptions"] },
      { id: "associations", label: "Associations & Memberships", sources: ["sos_filings"] },
      { id: "community", label: "Community Organizations", sources: ["form_990", "sos_filings"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["D&O", "GL", "Property", "WC", "Sexual Abuse & Molestation", "Volunteer Accident", "Event Liability"],
    sageContext: "You are advising a nonprofit/religious-focused producer. Key triggers: Form 990 filings (1.8M nonprofits, board members personally exposed without D&O), new IRS tax-exempt determinations, Secretary of State filings. Critical: volunteer board members are personally liable without D&O coverage. Sexual abuse & molestation coverage is essential for youth-serving organizations.",
    leadSources: ["ProPublica Nonprofit Explorer (Form 990)", "IRS Tax Exempt Organization Search", "Secretary of State filings"],
    pricing: { basePrice: 22, platinumMax: 69, bronzeMin: 10, avgPremium: 9200, volumePerMonth: 530, freeLeadsPerMonth: 4 },
  },
  {
    id: "agriculture",
    label: "Agriculture and Agribusiness",
    description: "Farms, ranches, vineyards, agribusiness operations, and agricultural services",
    icon: "Wheat",
    subVerticals: [
      { id: "farms_ranches", label: "Farms & Ranches", sources: ["usda_data", "county_ag"] },
      { id: "vineyards", label: "Vineyards & Orchards", sources: ["usda_data", "ttb_permits"] },
      { id: "ag_services", label: "Agricultural Services", sources: ["sos_filings", "usda_data"] },
      { id: "livestock", label: "Livestock Operations", sources: ["usda_data"] },
      { id: "cannabis", label: "Cannabis / Hemp", sources: ["state_cannabis_licenses"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["Farm Owners", "Crop Insurance", "Livestock Mortality", "GL", "WC", "Commercial Auto", "Equipment/Inland Marine", "Pollution"],
    sageContext: "You are advising an agriculture-focused producer. Key triggers: USDA census data, new farm entity filings, state cannabis license approvals, TTB winery/distillery permits. Coverage nuances: crop insurance (MPCI vs private), livestock mortality, pollution from agricultural runoff, equipment floaters for farm machinery.",
    leadSources: ["USDA Census of Agriculture", "County agricultural assessor data", "TTB permits (wineries)", "State cannabis licensing boards"],
    pricing: { basePrice: 28, platinumMax: 81, bronzeMin: 15, avgPremium: 15000, volumePerMonth: 400, freeLeadsPerMonth: 3 },
  },
  {
    id: "transportation_hire",
    label: "Transportation for Hire",
    description: "Livery, taxis, ride-share fleets, school buses, ambulances, and charter services",
    icon: "Car",
    subVerticals: [
      { id: "livery_taxi", label: "Livery & Taxi", sources: ["tlc_licenses", "sos_filings"] },
      { id: "rideshare_fleets", label: "Ride-Share Fleets", sources: ["sos_filings"] },
      { id: "school_buses", label: "School Bus Operations", sources: ["dot_registrations"] },
      { id: "ambulance", label: "Ambulance / Medical Transport", sources: ["state_ems_licensing"] },
      { id: "charter", label: "Charter & Tour Services", sources: ["fmcsa", "sos_filings"] },
    ],
    pipelineStages: TRUCKING_STAGES,
    coverageLines: ["Commercial Auto", "GL", "WC", "Hired & Non-Owned Auto", "Umbrella", "Passenger Liability"],
    sageContext: "You are advising a transportation-for-hire producer. Key triggers: new TLC/livery licenses, FMCSA passenger carrier authorities, school bus contract awards, EMS licensing. Coverage nuances: passenger liability limits, hired & non-owned auto for subcontracted vehicles, DOT compliance requirements.",
    leadSources: ["TLC / livery licensing boards", "FMCSA passenger carrier authorities", "State EMS licensing", "DOT registrations"],
    pricing: { basePrice: 22, platinumMax: 81, bronzeMin: 11, avgPremium: 9600, volumePerMonth: 420, freeLeadsPerMonth: 4 },
  },
  {
    id: "life_sciences",
    label: "Life Sciences and Biotech",
    description: "Biotech startups, pharma, clinical trials, medical devices, and research labs",
    icon: "FlaskConical",
    subVerticals: [
      { id: "biotech", label: "Biotech Startups", sources: ["sec_reg_d", "fda_registrations"] },
      { id: "pharma", label: "Pharmaceutical", sources: ["fda_registrations", "sec_filings"] },
      { id: "clinical_trials", label: "Clinical Trials", sources: ["clinicaltrials_gov"] },
      { id: "medical_devices", label: "Medical Devices", sources: ["fda_510k", "sec_reg_d"] },
      { id: "research_labs", label: "Research Labs", sources: ["nih_grants", "sos_filings"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["Product Liability", "Professional Liability/E&O", "Clinical Trial Insurance", "D&O", "Cyber", "Property", "WC", "Pollution/Environmental"],
    sageContext: "You are advising a life sciences/biotech-focused producer. Key triggers: SEC Reg D filings (biotech fundraising), FDA device registrations, new clinical trial registrations, NIH grant awards. Coverage nuances: clinical trial liability, product liability for medical devices, D&O for venture-backed startups.",
    leadSources: ["SEC EDGAR Reg D filings", "FDA device registrations (510k)", "ClinicalTrials.gov", "NIH grant awards", "Crunchbase biotech funding"],
    pricing: { basePrice: 50, platinumMax: 119, bronzeMin: 21, avgPremium: 38000, volumePerMonth: 230, freeLeadsPerMonth: 2 },
  },
  {
    id: "energy",
    label: "Energy and Utilities",
    description: "Solar, wind, oil & gas, utilities, EV infrastructure, and energy services",
    icon: "Zap",
    subVerticals: [
      { id: "solar", label: "Solar", sources: ["permits", "utility_interconnection"] },
      { id: "wind", label: "Wind", sources: ["ferc_filings", "permits"] },
      { id: "oil_gas", label: "Oil & Gas", sources: ["state_oil_gas_commissions"] },
      { id: "utilities", label: "Utilities", sources: ["puc_filings"] },
      { id: "ev_infrastructure", label: "EV Infrastructure", sources: ["permits", "doe_grants"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["GL", "Property", "WC", "Pollution/Environmental", "Professional Liability", "Builder's Risk", "Equipment Breakdown", "Business Interruption"],
    sageContext: "You are advising an energy/utilities-focused producer. Key triggers: solar/wind installation permits, FERC regulatory filings, new oil & gas well permits, DOE grant awards for EV infrastructure. Coverage nuances: pollution/environmental liability, equipment breakdown for generation assets, builder's risk during construction.",
    leadSources: ["State oil & gas commissions", "FERC regulatory filings", "Solar/wind building permits", "DOE grant awards", "Utility interconnection applications"],
    pricing: { basePrice: 50, platinumMax: 119, bronzeMin: 21, avgPremium: 42000, volumePerMonth: 175, freeLeadsPerMonth: 2 },
  },
  {
    id: "moving_storage",
    label: "Moving and Storage",
    description: "Moving companies, self-storage facilities, logistics, and relocation services",
    icon: "PackageOpen",
    subVerticals: [
      { id: "moving_companies", label: "Moving Companies", sources: ["fmcsa", "dot", "sos_filings"] },
      { id: "self_storage", label: "Self-Storage Facilities", sources: ["permits", "sos_filings"] },
      { id: "relocation", label: "Relocation Services", sources: ["sos_filings"] },
    ],
    pipelineStages: TRUCKING_STAGES,
    coverageLines: ["Commercial Auto", "Cargo/Goods in Transit", "GL", "Property", "WC", "Inland Marine", "Bailee's Customer"],
    sageContext: "You are advising a moving/storage-focused producer. Key triggers: new FMCSA household goods mover registrations, new self-storage facility permits, DOT inspections. Coverage nuances: bailee's customer coverage (liability for stored goods), cargo/goods-in-transit for movers, inland marine for valuable items.",
    leadSources: ["FMCSA household goods mover registrations", "Self-storage building permits", "DOT inspection records", "Secretary of State filings"],
    pricing: { basePrice: 25, platinumMax: 65, bronzeMin: 14, avgPremium: 11400, volumePerMonth: 350, freeLeadsPerMonth: 4 },
  },
  {
    id: "franchise",
    label: "Franchise Operations",
    description: "Franchise owners, multi-unit operators, and franchise development",
    icon: "Store",
    subVerticals: [
      { id: "qsr", label: "Quick Service Restaurants", sources: ["ftc_fdd", "sos_filings"] },
      { id: "retail_franchise", label: "Retail Franchises", sources: ["ftc_fdd", "sos_filings"] },
      { id: "service_franchise", label: "Service Franchises", sources: ["ftc_fdd", "sos_filings"] },
      { id: "multi_unit", label: "Multi-Unit Operators", sources: ["sos_filings", "permits"] },
    ],
    pipelineStages: STANDARD_STAGES,
    coverageLines: ["GL", "Property", "WC", "Commercial Auto", "Umbrella", "EPLI", "Franchise-Specific E&O", "Business Income"],
    sageContext: "You are advising a franchise-focused producer. Key triggers: new FTC Franchise Disclosure Document (FDD) filings, new franchise entity formations, multi-unit expansion permits. Coverage nuances: franchise agreements often mandate specific coverage minimums, multi-location property schedules, EPLI exposure increases with unit count.",
    leadSources: ["FTC Franchise Disclosure Documents", "Secretary of State franchise entity filings", "Multi-unit building permits"],
    pricing: { basePrice: 20, platinumMax: 60, bronzeMin: 11, avgPremium: 7800, volumePerMonth: 400, freeLeadsPerMonth: 5 },
  },
  {
    id: "life_insurance",
    label: "Life Insurance",
    description: "Life insurance leads via 7 trigger lanes — new LLCs, home purchases, NPI professionals, attorneys, startup funding, new parents, and real estate investors",
    icon: "HeartPulse",
    subVerticals: [
      { id: "new_llc", label: "New LLC / Business Formation", sources: ["sos_new_llc", "multi_member_llc", "sba", "ucc", "sec_form_d"] },
      { id: "home_purchase", label: "New Home Purchase", sources: ["mortgage_originations", "property_transfers", "county_recorder", "mls_closed"] },
      { id: "healthcare_pro", label: "New Doctor / Dentist / NPI", sources: ["npi_registry", "state_medical_license", "dea_registration", "cms_enrollment"] },
      { id: "attorney", label: "New Attorney / Bar Admission", sources: ["bar_admissions", "sos_new_llc", "court_records"] },
      { id: "startup_funding", label: "Startup Funding / EDGAR Form D", sources: ["sec_form_d", "crunchbase", "sos_new_llc"] },
      { id: "new_parent", label: "New Parents", sources: ["birth_records", "facebook_lead_ads", "marriage_records"] },
      { id: "real_estate_investor", label: "Real Estate Investors", sources: ["property_transfers", "rental_registrations", "ucc", "sos_new_llc"] },
    ],
    pipelineStages: [
      { key: "trigger_detected", label: "Trigger Detected", color: "cyan" },
      { key: "pre_consent", label: "Pre-Consent Outreach", color: "sky" },
      { key: "consent_captured", label: "Consent Captured", color: "green" },
      { key: "quiz_completed", label: "Quiz Completed", color: "emerald" },
      { key: "fa_assigned", label: "FA Assigned", color: "purple" },
      { key: "meeting_set", label: "Meeting Set", color: "yellow" },
      { key: "application", label: "Application", color: "orange" },
      { key: "issued", label: "Policy Issued", color: "green" },
    ],
    coverageLines: [
      "Term Life (10/15/20/30-year)", "Whole Life", "Universal Life", "Indexed Universal Life",
      "Key Person Life", "Buy-Sell Funding (Cross-Purchase / Entity)", "Disability Income (DI)",
      "Group Term / Voluntary Benefits", "Final Expense", "Premium Finance (Large Cases)",
    ],
    sageContext: `You are advising a life insurance-focused financial advisor or producer. You specialize in trigger-based lead generation and consultative sales for life and disability insurance.

TRIGGER LANES (7 unique lead sources):
1. New LLC / Business Formation — SOS filings across all 50 states. Multi-member LLCs need buy-sell funding (whole life). Sole owners need income replacement (term). The gap: no LLC attorney tells new owners what happens to their ownership stake the day they die.
2. New Home Purchase — Mortgage originations create an immediate, quantifiable gap. 30-year term matching mortgage duration. Hook: "Your lender is protected by a 30-year mortgage. You are not."
3. New Doctor / Dentist / NPI — NPI Registry (weekly bulk CSV) is the most powerful free trigger. Healthcare professionals are 3x more likely to become disabled than die before retirement. Income worth $4M+ over career. Employer coverage is not portable.
4. New Attorney / Bar Admission — State bar admission lists. A law license is worth $3M–$8M over a 30-year career. 100% uninsured at admission. Hook: "You passed the bar. Your license is protected. Your income is not."
5. Startup Funding / EDGAR Form D — SEC filings. Investors are protected by portfolio diversification. Founders are all-in. Key person insurance + estate liquidity planning.
6. New Parents — Birth signals + paid traffic. The most emotional trigger. "Your income is the only thing standing between them and nothing." 20-year term, $500K–$1M face value.
7. Real Estate Investors — Multi-property owners. Policy loans as investment capital. Estate planning. "Who collects the rent? Who manages the properties? Who services the mortgages?"

PRODUCT ROUTING:
Term Life triggers: New home purchase, new parent (sole earner), sole-owner LLC, new professional (employed), new FMCSA authority, quiz answer showing <3 months runway + dependents.
Whole Life triggers: Multi-partner LLC (buy-sell), physician/dentist private practice, EDGAR Form D (startup funding + key person), real estate investor (multiple properties), age 40-60 targeting (legacy planning).

COMPLIANCE (CRITICAL):
- Cold outreach legal channels: Email (CAN-SPAM), live human calls (DNC scrub, 8AM-9PM local), physical mail, LinkedIn/social DM.
- Requires PRIOR EXPRESS WRITTEN CONSENT (PEWC): Automated SMS/text, Voice AI calls, ringless voicemail.
- Tier 4 (Red) states — NO cold automated outreach: Florida (FTSA), California (CCPA), Texas (SB 140), Oklahoma (mini-TCPA), Maryland (mini-TCPA). Email + live calls + mail ONLY.
- Voice AI post-consent: Legal in all 50 states. Must disclose as automated. Hours: 8AM-9PM (CT: 9AM-8PM). Offer opt-out during call.
- STOP from ANY channel must suppress ALL channels immediately (FCC April 2025 rule).

CONSENT GATE:
The landing page captures phone number + TCPA consent language + TrustedForm documentation. Two entry points: (A) 4-minute voice AI call, (B) live chat quiz. Both capture consent and fire the same analysis pipeline. Once consent is captured, the full 48-hour cadence fires: email + SMS + voice AI.

CADENCE:
Phase 1 (pre-consent): Email + live human calls only. Days 0-21. 5 emails, 3 live calls, 1 LinkedIn DM, 1 direct mail piece.
Phase 2 (post-consent): Full 48-hour rotation — email, SMS, voice AI. Runs indefinitely until prospect opts out, responds, or is assigned to FA.
LATER keyword: Pauses cadence 30 days without revoking consent. Reduces opt-outs.

CREATIVE FUNNELS (7):
1. The Gap Calculator (Facebook + Instagram) — Calculator UI, not an ad.
2. The Public Record Mirror (SOS + NPI triggers) — Personalized email referencing specific public filing.
3. Call This Number (Direct mail QR + SMS) — Phone call CTA, not a link.
4. LinkedIn Article as Bait — Organic content targeting trigger-specific keywords.
5. What Would Actually Happen (YouTube + Reels) — 45-60 second advisor-to-camera videos.
6. The Referral Partner Send — Co-branded links via real estate agents, CPAs, attorneys.
7. The 48-Hour Postcard + Text Sequence — Physical mail + SMS hit same day.

PREMIUM RANGES:
- New LLC (sole owner): $800–$2,500/year (term)
- New LLC (multi-partner buy-sell): $3,000–$15,000/year (whole life)
- New Home Purchase: $600–$1,800/year (30-year term)
- New Physician/Dentist: $2,000–$8,000/year (whole life + DI)
- New Attorney: $1,200–$4,000/year (term or whole)
- Startup Funding (key person): $5,000–$25,000/year (whole + premium finance)
- New Parents: $400–$1,200/year (20-year term)
- Real Estate Investors: $3,000–$12,000/year (whole life + estate planning)

FREE DATA SOURCES:
- Secretary of State (all 50 states) — new LLC/Corp filings, NAICS codes.
- NPI Registry (NPPES) — weekly bulk CSV at cms.gov. Every new provider nationally.
- SEC EDGAR Form D — new startup funding filings, free API.
- State Bar Admission Lists — published quarterly/annually by state bars.
- County Recorder/Assessor — deed transfers, mortgage recordings.
- FMCSA — new motor carrier authority (trucking crossover).

MONTHLY INFRASTRUCTURE COSTS (at scale):
Supabase Pro $25 | Claude API $20-40 | Resend $40-80 | Twilio $80-150 | ElevenLabs $22 | TrustedForm $99-199 | DNCScrub $50-100 | Direct mail $1,350-1,950 | Paid ads $3,500-7,000 | Total: $5,200-$9,600/month (drops to $2,000 without paid ads).`,
    leadSources: [
      "Secretary of State — New LLC/Corp filings, all 50 states (free, daily-weekly)",
      "NPI Registry (NPPES) — Weekly bulk CSV of new healthcare providers (free)",
      "SEC EDGAR Form D — New startup funding filings (free API)",
      "State Bar Admission Lists — New attorneys (free, quarterly-annual)",
      "County Recorder / Assessor — Deed transfers, mortgage recordings (free)",
      "FMCSA — New motor carrier authority filings (free)",
      "Facebook Lead Ads — New parent targeting ($15-30 CPL)",
      "Google Search Ads — Life insurance intent keywords ($25-60 CPL)",
    ],
    pricing: { basePrice: 22, platinumMax: 75, bronzeMin: 10, avgPremium: 4200, volumePerMonth: 500, freeLeadsPerMonth: 5 },
  },
];

/* ── Lookup helpers ── */
export function getVerticalConfig(verticalId: string): ConnectVerticalConfig | undefined {
  return CONNECT_VERTICALS.find(v => v.id === verticalId);
}

export function getVerticalLabel(verticalId: string): string {
  return getVerticalConfig(verticalId)?.label ?? verticalId;
}

export function getAllVerticalIds(): string[] {
  return CONNECT_VERTICALS.map(v => v.id);
}

/** For master accounts — returns all verticals */
export function getAllVerticals(): ConnectVerticalConfig[] {
  return CONNECT_VERTICALS;
}
