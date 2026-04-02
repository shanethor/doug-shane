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
    description: "Roofing, HVAC, plumbing, electrical, painting & general contractors",
    icon: "HardHat",
    subVerticals: [
      { id: "roofing", label: "Roofing", sources: ["licensing", "permits", "osha"] },
      { id: "hvac", label: "HVAC", sources: ["licensing", "permits"] },
      { id: "plumbing", label: "Plumbing", sources: ["licensing", "permits"] },
      { id: "electrical", label: "Electrical", sources: ["licensing", "permits"] },
      { id: "painting", label: "Painting", sources: ["licensing", "permits"] },
      { id: "general_contractor", label: "General Contractor", sources: ["licensing", "permits", "osha"] },
    ],
    pipelineStages: CONTRACTOR_STAGES,
    coverageLines: ["GL", "WC", "Commercial Auto", "Tools & Equipment", "Builder's Risk", "Umbrella"],
    sageContext: "You are advising a contractor-focused insurance producer. Key triggers: new contractor licenses, building permits (especially >$250K), OSHA inspections, and permit volume growth. Coverage gaps to highlight: Builder's Risk for large jobs, adequate WC for subcontractors, equipment floaters for tools.",
    leadSources: ["State contractor licensing boards", "Socrata building permit APIs", "OSHA inspection records", "Secretary of State filings", "NRCA/ACCA/PHCC member databases"],
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
    description: "Restaurants, bars, hotels, breweries, catering, and food trucks",
    icon: "UtensilsCrossed",
    subVerticals: [
      { id: "restaurants", label: "Restaurants", sources: ["liquor_license", "health_permits", "sos_filings"] },
      { id: "bars_nightclubs", label: "Bars & Nightclubs", sources: ["liquor_license"] },
      { id: "hotels_lodging", label: "Hotels & Lodging", sources: ["sos_filings", "permits"] },
      { id: "breweries_wineries", label: "Breweries & Wineries", sources: ["ttb_permits", "liquor_license"] },
      { id: "catering", label: "Catering & Food Trucks", sources: ["health_permits", "sos_filings"] },
    ],
    pipelineStages: HOSPITALITY_STAGES,
    coverageLines: ["GL", "Liquor Liability", "Property", "WC", "Commercial Auto", "Assault & Battery", "Dram Shop", "Business Income"],
    sageContext: "You are advising a hospitality-focused producer. Key triggers: new liquor license approvals, health department food service permits, TTB federal brewery/winery permits, Google Maps listings with zero reviews (soft opens). Critical coverage gap: GL excludes liquor liability entirely — Dram Shop laws carry unlimited personal liability in most states. Ownership transfers mean no coverage from Day 1.",
    leadSources: ["State Liquor Control Boards", "County health department food permits", "TTB Federal Permit database", "Secretary of State filings", "Google Maps / Yelp new listings"],
    pricing: { basePrice: 18, platinumMax: 69, bronzeMin: 8, avgPremium: 7600, volumePerMonth: 350, freeLeadsPerMonth: 5 },
  },
  {
    id: "healthcare",
    label: "Healthcare",
    description: "Medical, dental, allied health, mental health, med spas, and home health",
    icon: "Stethoscope",
    subVerticals: [
      { id: "physicians", label: "Physicians", sources: ["npi_registry", "state_medical_boards"] },
      { id: "dental", label: "Dental", sources: ["npi_registry", "state_dental_boards"] },
      { id: "mental_health", label: "Mental Health", sources: ["npi_registry"] },
      { id: "chiropractic_pt", label: "Chiropractic & PT", sources: ["npi_registry"] },
      { id: "med_spa", label: "Med Spas & Aesthetics", sources: ["npi_registry", "sos_filings"] },
      { id: "home_health", label: "Home Health Agencies", sources: ["npi_registry", "cms_enrollment"] },
      { id: "nurse_practitioner", label: "Nurse Practitioners", sources: ["npi_registry"] },
    ],
    pipelineStages: HEALTHCARE_STAGES,
    coverageLines: ["Medical Malpractice (Occurrence vs Claims-Made)", "GL", "Cyber/HIPAA", "WC", "Property", "Business Interruption", "Employed Physicians", "Tail Coverage"],
    sageContext: "You are advising a healthcare-focused producer. The NPI Registry is the most powerful free lead database — updated weekly with every new provider. Key triggers: new NPI enumeration dates (first-time malpractice buyers), DEA registrations, CMS Medicare enrollment. Critical: occurrence vs claims-made choice follows providers for life. Med spas have the fastest-growing malpractice claims rate. HIPAA creates mandatory cyber exposure.",
    leadSources: ["NPI Registry (weekly bulk CSV)", "State medical/dental licensing boards", "DEA Controlled Substance Registration", "CMS Medicare Enrollment", "HHS OIG Exclusion List"],
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
