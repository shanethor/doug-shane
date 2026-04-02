/**
 * Lead vertical configurations — maps industry specializations to their
 * specific data sources/triggers for the Lead Generator.
 */

export interface LeadSource {
  key: string;
  label: string;
  icon: "file" | "building" | "target" | "globe" | "zap" | "users" | "rocket" | "trending" | "map";
}

export interface Vertical {
  id: string;
  label: string;
  group: string;          // groups verticals in the multi-select UI
  sources: LeadSource[];
}

/* ── Helper to build source entries concisely ── */
const s = (key: string, label: string, icon: LeadSource["icon"] = "file"): LeadSource => ({ key, label, icon });

/* ══════════════════════════════════════════════
   CORE / SHARED SOURCES (available to all)
   ══════════════════════════════════════════════ */
export const SHARED_SOURCES: LeadSource[] = [
  s("new_business", "Business Filings", "file"),
  s("permits", "Permit Database", "building"),
  s("licensing", "State Licensing", "file"),
  s("court_records", "Court Records", "file"),
  s("sam_gov", "SAM.gov / Fed Contracts", "building"),
  s("sba", "SBA Loan Data", "trending"),
  s("google_places", "Google Places", "map"),
  s("ucc", "UCC Filings", "file"),
  s("social", "Reddit Signals", "users"),
  s("linkedin", "LinkedIn", "globe"),
  s("domains", "New Domains", "globe"),
];

/* ══════════════════════════════════════════════
   VERTICALS
   ══════════════════════════════════════════════ */
export const VERTICALS: Vertical[] = [
  // ── Personal Lines P&C ──
  {
    id: "personal_homeowners",
    label: "Homeowners",
    group: "Personal Lines",
    sources: [
      s("property_transfers", "Property Transfers", "building"),
      s("mortgage_originations", "Mortgage Originations", "trending"),
      s("hmda_data", "HMDA Lending Data", "file"),
      s("fema_flood", "FEMA Flood Maps", "zap"),
      s("citizens_nonrenewal", "Citizens Non-Renewals", "zap"),
      s("noaa_hail", "NOAA Hail/Storm Reports", "zap"),
      s("building_permits_res", "Residential Building Permits", "building"),
      s("cat_event_filings", "CAT Event Filings", "zap"),
    ],
  },
  {
    id: "personal_auto",
    label: "Personal Auto",
    group: "Personal Lines",
    sources: [
      s("dmv_registrations", "DMV New Registrations", "file"),
      s("auto_dealer_sales", "Auto Dealer Sales Data", "building"),
      s("dui_court_records", "DUI / SR-22 Court Records", "file"),
      s("lease_expirations", "Lease Expiration Signals", "trending"),
    ],
  },
  {
    id: "personal_renters",
    label: "Renters",
    group: "Personal Lines",
    sources: [
      s("apartment_permits", "New Apartment Permits", "building"),
      s("multifamily_co", "Multifamily CO Issued", "building"),
      s("property_mgmt_listings", "Property Mgmt Listings", "globe"),
    ],
  },
  // ── Life Insurance (7 trigger lanes from build plan) ──
  {
    id: "life_new_llc",
    label: "New LLC / Business Formation",
    group: "Life Insurance",
    sources: [
      s("sos_new_llc", "SOS New LLC / Corp Filings", "file"),
      s("multi_member_llc", "Multi-Member LLC Filings (Buy-Sell)", "building"),
      s("sba", "SBA Loan Recipients", "trending"),
      s("ucc", "UCC Filings (Business Debt)", "file"),
      s("sec_form_d", "SEC Form D (Startup Funding)", "file"),
      s("google_new_listing", "Google Places New Business Listings", "map"),
    ],
  },
  {
    id: "life_home_purchase",
    label: "New Home Purchase",
    group: "Life Insurance",
    sources: [
      s("mortgage_originations", "New Mortgage Originations", "trending"),
      s("property_transfers", "Property Deed Transfers", "building"),
      s("county_recorder", "County Recorder Filings", "file"),
      s("mls_closed", "MLS Closed Sales Data", "building"),
    ],
  },
  {
    id: "life_healthcare_pro",
    label: "New Doctor / Dentist / NPI",
    group: "Life Insurance",
    sources: [
      s("npi_registry", "NPI Registry (Weekly CSV)", "file"),
      s("state_medical_license", "State Medical/Dental License Boards", "file"),
      s("dea_registration", "DEA Controlled Substance Registration", "file"),
      s("cms_enrollment", "CMS Medicare Enrollment", "file"),
      s("residency_match", "NRMP Residency Match Data", "file"),
    ],
  },
  {
    id: "life_attorney",
    label: "New Attorney / Bar Admission",
    group: "Life Insurance",
    sources: [
      s("bar_admissions", "State Bar Admission Lists", "file"),
      s("sos_new_llc", "New Law Firm Entity Filings", "file"),
      s("court_records", "Court Admission Records", "file"),
      s("linkedin", "LinkedIn New Attorney Profiles", "globe"),
    ],
  },
  {
    id: "life_startup_funding",
    label: "Startup Funding / EDGAR Form D",
    group: "Life Insurance",
    sources: [
      s("sec_form_d", "SEC EDGAR Form D Filings", "file"),
      s("crunchbase", "Crunchbase Funding Rounds", "trending"),
      s("sos_new_llc", "New C-Corp / LLC Filings", "file"),
      s("ucc", "UCC Filings (Venture Debt)", "file"),
    ],
  },
  {
    id: "life_new_parent",
    label: "New Parents (Paid Traffic)",
    group: "Life Insurance",
    sources: [
      s("birth_records", "Birth Record Signals", "file"),
      s("facebook_lead_ads", "Facebook Lead Ads (New Parents)", "users"),
      s("google_ads", "Google Search Ads (Life Insurance)", "globe"),
      s("marriage_records", "Marriage License Filings", "file"),
    ],
  },
  {
    id: "life_real_estate_investor",
    label: "Real Estate Investors",
    group: "Life Insurance",
    sources: [
      s("property_transfers", "Multi-Property Deed Transfers", "building"),
      s("rental_registrations", "Rental Property Registrations", "building"),
      s("ucc", "UCC Filings (Property Debt)", "file"),
      s("sos_new_llc", "Real Estate LLC Formations", "file"),
      s("county_recorder", "County Recorder (Multi-Parcel)", "file"),
    ],
  },
  {
    id: "personal_umbrella",
    label: "Umbrella / Excess",
    group: "Personal Lines",
    sources: [
      s("high_value_property", "High-Value Property Sales", "building"),
      s("boat_registrations", "Boat / Watercraft Registrations", "file"),
      s("luxury_auto", "Luxury Auto Registrations", "file"),
    ],
  },
  {
    id: "personal_flood",
    label: "Flood / Earthquake",
    group: "Personal Lines",
    sources: [
      s("fema_flood", "FEMA Flood Zone Maps", "zap"),
      s("nfip_lapse", "NFIP Policy Lapses", "zap"),
      s("noaa_hail", "NOAA Storm/Flood Data", "zap"),
      s("usgs_seismic", "USGS Seismic Activity", "zap"),
    ],
  },

  // ── Commercial Lines P&C ──
  {
    id: "commercial_bop",
    label: "BOP / Small Business",
    group: "Commercial Lines",
    sources: [
      s("new_business", "New SOS Filings", "file"),
      s("google_places", "Google Places (New Listings)", "map"),
      s("sba", "SBA 7(a) / 504 Loans", "trending"),
      s("business_licenses", "County Business Licenses", "file"),
    ],
  },
  {
    id: "commercial_gl",
    label: "General Liability",
    group: "Commercial Lines",
    sources: [
      s("new_business", "New LLC / Corp Filings", "file"),
      s("osha", "OSHA Enforcement", "target"),
      s("permits", "Commercial Permits", "building"),
      s("associations", "Trade Associations", "users"),
    ],
  },
  {
    id: "commercial_wc",
    label: "Workers' Compensation",
    group: "Commercial Lines",
    sources: [
      s("osha", "OSHA Inspections & Citations", "target"),
      s("state_wc", "State WC Employer Databases", "file"),
      s("ncci_emr", "NCCI Experience Mod Data", "trending"),
      s("prevailing_wage", "Prevailing Wage Registries", "file"),
      s("census_bls", "Census CBP / BLS QCEW", "trending"),
    ],
  },
  {
    id: "commercial_auto",
    label: "Commercial Auto",
    group: "Commercial Lines",
    sources: [
      s("fmcsa", "FMCSA / DOT Records", "rocket"),
      s("fmcsa_new_authority", "FMCSA New MC Authority", "rocket"),
      s("dot_inspections", "DOT Inspection Reports", "file"),
      s("ifta_registrations", "IFTA / IRP Registrations", "file"),
    ],
  },
  {
    id: "commercial_property",
    label: "Commercial Property",
    group: "Commercial Lines",
    sources: [
      s("commercial_property_sales", "Commercial Property Sales", "building"),
      s("commercial_co", "Certificate of Occupancy", "building"),
      s("commercial_mortgage", "Commercial Mortgage Filings", "file"),
      s("zoning_changes", "Zoning Changes / Variances", "building"),
      s("fema_flood", "FEMA Flood Data", "zap"),
    ],
  },
  {
    id: "commercial_cyber",
    label: "Cyber / E&O",
    group: "Commercial Lines",
    sources: [
      s("hhs_breach", "HHS OCR Breach Portal", "zap"),
      s("sec_filings", "SEC EDGAR Filings", "file"),
      s("hipaa_covered", "HIPAA Covered Entities", "file"),
      s("pci_merchants", "PCI Merchant Registries", "globe"),
    ],
  },
  {
    id: "commercial_inland_marine",
    label: "Inland Marine",
    group: "Commercial Lines",
    sources: [
      s("ucc", "UCC Equipment Filings", "file"),
      s("permits", "Heavy Equipment Permits", "building"),
      s("construction_permits", "Construction Permits", "building"),
    ],
  },
  {
    id: "commercial_epli",
    label: "EPLI / D&O",
    group: "Commercial Lines",
    sources: [
      s("sec_filings", "SEC EDGAR Filings", "file"),
      s("dol_5500", "DOL 5500 Filings", "file"),
      s("eeoc_complaints", "EEOC Complaint Signals", "target"),
      s("new_business", "New Corp Formations", "file"),
    ],
  },

  // ── Excavation & Site Work (6 sub-verticals, 15+ data pipelines, full v2.0 spec) ──
  {
    id: "excavation_general",
    label: "General Excavation & Site Prep (NCCI 6217 — $5.25/$100 Avg)",
    group: "Contractors",
    sources: [
      s("ex_new_license", "New State Excavation/GC License (FL CU, CA C-12, WA Specialty #18, AZ A-5)", "file"),
      s("ex_license_renewal", "License Expiring Within 60 Days (X-Date Capture)", "zap"),
      s("osha_238910", "OSHA Inspection NAICS 238910 (Trenching NEP — 39 Fatalities 2022)", "target"),
      s("sos_excavation", "SOS New Entity Filings — Excavation/Grading/Site Work Keywords", "file"),
      s("nuca_directories", "NUCA Chapter Directories (~2,000 Firms, 35 Chapters — Free)", "users"),
      s("agc_directories", "AGC Chapter Directories (CSI 31 23 00 Excavation Filter — 27K Firms)", "users"),
      s("dca_directory", "DCA National Directory (~240 Firms — Rich Public Profiles)", "users"),
      s("city_excavation_permits", "City Excavation Permits (NYC DOB, LA, Chicago, Houston, Seattle)", "building"),
      s("batchdata_enrich", "BatchData Skip-Tracing ($0.05/record)", "users"),
      s("google_places_enrich", "Google Places Enrichment ($0.017/call)", "map"),
    ],
  },
  {
    id: "excavation_sewer",
    label: "Sewer Construction (NCCI 6306 — ~$4.10/$100)",
    group: "Contractors",
    sources: [
      s("ex_new_license", "New State Excavation/GC License", "file"),
      s("osha_238910", "OSHA Inspection NAICS 238910", "target"),
      s("nuca_directories", "NUCA Chapter Directories", "users"),
      s("epa_lslr_excavation", "EPA Lead Pipe Replacement Grants ($15B IIJA)", "globe"),
      s("socrata_permits_sewer", "Sewer/Utility Permits", "building"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "excavation_utility",
    label: "Underground Utility / Gas Main (NCCI 6319/6325)",
    group: "Contractors",
    sources: [
      s("ex_new_license", "New State Excavation/GC License", "file"),
      s("osha_238910", "OSHA Inspection NAICS 238910", "target"),
      s("dot_bid_tabs", "State DOT Contract Award Databases (10 States — Free)", "globe"),
      s("sam_gov_238910", "SAM.gov NAICS 238910 — Federal Contractors (Davis-Bacon)", "globe"),
      s("nuca_directories", "NUCA Chapter Directories", "users"),
      s("pcca_directory", "PCCA Power & Communication Contractors", "users"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "excavation_heavy_civil",
    label: "Heavy Civil / Dam / Levee (NCCI 6018/6045/6005 — USACE)",
    group: "Contractors",
    sources: [
      s("usace_awards", "USACE Contract Awards (Dredging, Levee, Dam, Flood Control)", "globe"),
      s("sam_gov_238910", "SAM.gov NAICS 238910/237110/237310", "globe"),
      s("dot_bid_tabs", "State DOT Contract Award Databases", "globe"),
      s("ex_new_license", "New State Excavation/GC License", "file"),
      s("osha_238910", "OSHA Inspection NAICS 238910", "target"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "excavation_environmental",
    label: "Environmental / PFAS Remediation (CPL $5K–$15K/yr Required)",
    group: "Contractors",
    sources: [
      s("epa_pfas_sites", "EPA PFAS/CERCLA Sites (26,000+ Sites, 126 Military Bases)", "globe"),
      s("epa_brownfields", "EPA Brownfields Grants (Site Remediation — 2,000+ Communities)", "globe"),
      s("epa_superfund", "EPA Superfund Sites in Remedial Action Phase", "globe"),
      s("ex_new_license", "New State Excavation/GC License", "file"),
      s("osha_238910", "OSHA Inspection NAICS 238910", "target"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "excavation_traffic_generators",
    label: "Excavation Traffic Generators & Tools",
    group: "Contractors",
    sources: [
      s("xcu_coverage_checker", "XCU Coverage Gap Checker (Explosion/Collapse/Underground Quiz)", "trending"),
      s("wc_code_optimizer_excavation", "WC Code Optimizer — 6217 vs 0042 vs 9102 Split Calculator ($13,550/yr Savings)", "target"),
      s("iija_contract_alert", "IIJA Contract Award Alert Network ($275B Obligated — Free Email)", "trending"),
      s("pfas_cpl_gap_analyzer", "PFAS Contractor Pollution Liability Gap Analyzer", "target"),
      s("trench_safety_audit_tool", "Trench Safety Compliance Audit Tool (OSHA NEP Checklist)", "trending"),
    ],
  },
  // ── Contractors (General + Other Trades) ──
  {
    id: "contractor_general",
    label: "General Contractors",
    group: "Contractors",
    sources: [
      s("permits", "Building Permits", "building"),
      s("licensing", "GC License Database", "file"),
      s("osha", "OSHA Citations", "target"),
      s("buildzoom", "BuildZoom Permits", "building"),
      s("prevailing_wage", "Prevailing Wage", "file"),
      s("surety_bonds", "Surety Bond Filings", "file"),
    ],
  },
  // ── Roofing (4 sub-verticals, 5 buying signals, full v2.0 spec) ──
  {
    id: "roofing_residential",
    label: "Residential Roofing",
    group: "Contractors",
    sources: [
      s("roofing_new_license", "New Roofing License (Signal 1 — 75 base)", "file"),
      s("roofing_license_lapse", "License Lapse / Inactive (Signal 2 — 90 base, IMMEDIATE)", "zap"),
      s("roofing_permits_5k", "Building Permits >$5K (NAICS 238160)", "building"),
      s("osha_238160", "OSHA First Inspection (NAICS 238160, Signal 4 — 60 base)", "target"),
      s("noaa_storm_roofing", "NOAA Storm Events (Signal 5 — 85 base, decays -5/day)", "zap"),
      s("sos_roofing", "SOS New Entity Filings (Roofing Keywords)", "file"),
      s("batchdata_enrich", "BatchData Skip-Tracing ($0.05/record)", "users"),
      s("google_places_enrich", "Google Places Enrichment ($0.017/call)", "map"),
      s("devi_social", "Devi AI Social Monitoring (Facebook/LinkedIn/Reddit)", "users"),
      s("reddit_f5bot", "F5Bot Reddit Alerts (r/Roofing, r/Contractors)", "users"),
    ],
  },
  {
    id: "roofing_commercial",
    label: "Commercial Roofing (TPO, EPDM, Built-Up)",
    group: "Contractors",
    sources: [
      s("roofing_new_license", "New Roofing License (Signal 1)", "file"),
      s("roofing_license_lapse", "License Lapse / Inactive (Signal 2 — IMMEDIATE)", "zap"),
      s("roofing_permit_100k", "Large Permits >$100K (Signal 3 — 80 base, commercial flag)", "building"),
      s("osha_238160", "OSHA First Inspection (NAICS 238160)", "target"),
      s("sos_roofing", "SOS New Entity Filings (Roofing Keywords)", "file"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
      s("linkedin_commercial", "LinkedIn Commercial Contract Signals", "globe"),
    ],
  },
  {
    id: "roofing_storm",
    label: "Storm Restoration Roofing",
    group: "Contractors",
    sources: [
      s("noaa_storm_roofing", "NOAA Storm Events — Hail/Hurricane/Wind >$100K (Signal 5)", "zap"),
      s("roofing_new_license", "New Roofing License (Storm Chasers)", "file"),
      s("cat_event_filings", "CAT Event Filings", "zap"),
      s("osha_238160", "OSHA Roofing Citations Post-Storm", "target"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
      s("devi_storm", "Devi AI Storm Work Keywords (Social)", "users"),
      s("linkedin_storm", "LinkedIn 'Storm Work' / 'Hiring Roofers' Signals", "globe"),
    ],
  },
  {
    id: "roofing_specialty",
    label: "Specialty Roofing (Metal / Solar / Green)",
    group: "Contractors",
    sources: [
      s("roofing_new_license", "New Roofing License", "file"),
      s("solar_permits", "Solar Installation Permits (Dual-Trigger)", "zap"),
      s("roofing_permits_5k", "Building Permits >$5K (Specialty)", "building"),
      s("sos_roofing", "SOS New Entity Filings", "file"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "roofing_gc_compliance",
    label: "GC Subcontractor Compliance (Traffic Generator)",
    group: "Contractors",
    sources: [
      s("gc_compliance_portal", "GC Compliance Portal Leads (Dual Lead Gen)", "users"),
      s("coi_tracker", "COI Expiration Tracker Signups", "trending"),
      s("bid_calculator", "Bid Insurance Calculator Leads", "trending"),
      s("coverage_check", "Does My Policy Cover This Job? Tool Leads", "target"),
      s("storm_seo", "Storm Recovery SEO Guide Leads", "globe"),
      s("wc_audit_tool", "WC Class Code Audit Tool Completions", "target"),
    ],
  },
  // ── HVAC (6 sub-verticals, 8 buying signals, A2L trigger, full spec) ──
  {
    id: "hvac_residential",
    label: "Residential HVAC",
    group: "Contractors",
    sources: [
      s("hvac_new_license", "New HVAC License (Signal 1 — 75 base)", "file"),
      s("hvac_license_lapse", "License Lapse / Inactive (Signal 2 — 90 base, IMMEDIATE)", "zap"),
      s("hvac_a2l_transition", "A2L Refrigerant Transition (Signal 4 — all existing licenses)", "zap"),
      s("hvac_heehra", "HEEHRA/HEAR State Program Registration (Signal 5 — 75 base)", "trending"),
      s("osha_238220", "OSHA First Inspection NAICS 238220 (Signal 6 — 60 base)", "target"),
      s("noaa_heat_cold", "NOAA Extreme Heat/Cold Alert (Signal 7 — 85 base, -10/day decay)", "zap"),
      s("sos_hvac", "SOS New Entity Filings — HVAC Keywords (Signal 8 — 70 base)", "file"),
      s("acca_directory", "ACCA QA Accreditation Directory (Free)", "users"),
      s("phcc_directory", "PHCC Member Directory — 125 Chapters (Free)", "users"),
      s("nate_certs", "NATE Certified Technician List (Free)", "target"),
      s("batchdata_enrich", "BatchData Skip-Tracing ($0.05/record)", "users"),
      s("google_places_enrich", "Google Places Enrichment ($0.017/call)", "map"),
      s("devi_hvac", "Devi AI Social Monitoring (HVAC Keywords)", "users"),
      s("reddit_f5bot_hvac", "F5Bot Reddit Alerts (r/HVAC, r/HVACadvice)", "users"),
    ],
  },
  {
    id: "hvac_commercial",
    label: "Commercial HVAC (Mechanical — $50K+ Permits)",
    group: "Contractors",
    sources: [
      s("hvac_new_license", "New HVAC License (Signal 1)", "file"),
      s("hvac_license_lapse", "License Lapse / Inactive (Signal 2 — IMMEDIATE)", "zap"),
      s("hvac_permit_50k", "Large Mechanical Permit >$50K (Signal 3 — 80 base, +15 if >$250K)", "building"),
      s("hvac_a2l_transition", "A2L Refrigerant Transition (Signal 4)", "zap"),
      s("osha_238220", "OSHA First Inspection NAICS 238220", "target"),
      s("smacna_directory", "SMACNA Member Directory — Commercial Only (Free)", "users"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
      s("linkedin_commercial_hvac", "LinkedIn Commercial Mechanical Contract Signals", "globe"),
    ],
  },
  {
    id: "hvac_refrigeration",
    label: "Commercial Refrigeration (NCCI 3724)",
    group: "Contractors",
    sources: [
      s("hvac_new_license", "New HVAC License (Signal 1)", "file"),
      s("hvac_license_lapse", "License Lapse / Inactive (Signal 2)", "zap"),
      s("osha_238220", "OSHA First Inspection NAICS 238220", "target"),
      s("sos_hvac", "SOS New Entity Filings — Refrigeration Keywords", "file"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hvac_duct_fab",
    label: "Duct Fabrication & Installation (NCCI 5536)",
    group: "Contractors",
    sources: [
      s("hvac_new_license", "New HVAC License (Signal 1)", "file"),
      s("hvac_permit_50k", "Large Mechanical Permit >$50K (Signal 3)", "building"),
      s("smacna_directory", "SMACNA Member Directory (Free)", "users"),
      s("osha_238220", "OSHA First Inspection NAICS 238220", "target"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "hvac_geothermal",
    label: "Specialty: Geothermal / Heat Pump (A2L + HEEHRA)",
    group: "Contractors",
    sources: [
      s("hvac_new_license", "New HVAC License (Signal 1)", "file"),
      s("hvac_a2l_transition", "A2L Refrigerant Transition (Signal 4)", "zap"),
      s("hvac_heehra", "HEEHRA/HEAR State Program Registration (Signal 5)", "trending"),
      s("igshpa_directory", "IGSHPA Member Directory (Free)", "users"),
      s("sos_hvac", "SOS New Entity Filings — Heat Pump Keywords", "file"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "hvac_iaq_duct_cleaning",
    label: "IAQ / Duct Cleaning (NCCI 9014 — Misclassification Target)",
    group: "Contractors",
    sources: [
      s("nadca_directory", "NADCA Member Directory (Free — Highest WC Misclass Rate)", "users"),
      s("hvac_new_license", "New HVAC License (Signal 1)", "file"),
      s("osha_238220", "OSHA First Inspection NAICS 238220", "target"),
      s("sos_hvac", "SOS New Entity Filings — IAQ/Duct Cleaning Keywords", "file"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "hvac_traffic_generators",
    label: "HVAC Traffic Generators & Tools",
    group: "Contractors",
    sources: [
      s("a2l_coverage_checker", "A2L Coverage Gap Checker Tool Leads", "target"),
      s("rebate_navigator", "State Rebate Navigator (DSIRE API) Leads", "trending"),
      s("wc_audit_hvac", "WC Class Code Audit Tool — HVAC (5537/5536/3724/9014/9519)", "target"),
      s("coi_interpreter", "COI Requirement Interpreter Tool Leads", "target"),
      s("seasonal_playbook", "Seasonal Surge Playbook Leads (Summer/Winter)", "globe"),
    ],
  },
  // ── Plumbing (6 sub-verticals, 12 data pipelines, full spec) ──
  {
    id: "plumbing_residential",
    label: "Residential Plumbing (Service/Repair + New Construction)",
    group: "Contractors",
    sources: [
      s("plumbing_new_license", "New State Plumbing License (46 states — highest density free data)", "file"),
      s("plumbing_license_renewal", "License Expiring Within 60 Days (X-Date Capture)", "zap"),
      s("osha_238220_plumbing", "OSHA Inspection NAICS 238220 (WC Distress Signal)", "target"),
      s("sos_plumbing", "SOS New Entity Filings — Plumbing Keywords", "file"),
      s("socrata_permits_plumbing", "Socrata Plumbing Permits (Chicago, Denver, Seattle, Portland)", "building"),
      s("water_heater_permits", "Water Heater / Appliance Permit Pulls (City APIs)", "building"),
      s("phcc_directory_plumbing", "PHCC Member Directory — 125 State/Local Chapters (Free)", "users"),
      s("batchdata_enrich", "BatchData Skip-Tracing ($0.05/record)", "users"),
      s("google_places_enrich", "Google Places Enrichment ($0.017/call)", "map"),
    ],
  },
  {
    id: "plumbing_commercial",
    label: "Commercial Plumbing (Large Permits, SAM.gov, Backflow)",
    group: "Contractors",
    sources: [
      s("plumbing_new_license", "New State Plumbing License", "file"),
      s("plumbing_license_renewal", "License Expiring Within 60 Days", "zap"),
      s("socrata_permits_commercial_plumbing", "Commercial Plumbing Permits >$50K", "building"),
      s("sam_gov_238220", "SAM.gov NAICS 238220 — Federal Plumbing Contractors (~50K entities)", "globe"),
      s("osha_238220_plumbing", "OSHA Inspection NAICS 238220", "target"),
      s("backflow_certs", "Backflow Prevention Certification Registries (CA/TX/FL/WA — Free)", "target"),
      s("nyc_dob_plumbing", "NYC DOB Plumbing Permit API (PL type, 2-3x national premium)", "building"),
      s("phcc_directory_plumbing", "PHCC Member Directory (Free)", "users"),
      s("aspe_directory", "ASPE — American Society of Plumbing Engineers", "users"),
    ],
  },
  {
    id: "plumbing_sewer",
    label: "Sewer & Excavation (NCCI 6325 — 2-3x Higher WC Rate)",
    group: "Contractors",
    sources: [
      s("plumbing_new_license", "New State Plumbing License", "file"),
      s("osha_238220_plumbing", "OSHA Inspection NAICS 238220", "target"),
      s("socrata_permits_plumbing", "Sewer/Excavation Permits", "building"),
      s("sos_plumbing", "SOS New Entity Filings — Sewer/Drain Keywords", "file"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "plumbing_gas",
    label: "Gas Fitting / Gas Appliance (NCCI 5185 + CPL Exposure)",
    group: "Contractors",
    sources: [
      s("plumbing_new_license", "New State Plumbing License (Gas Fitting Classification)", "file"),
      s("epa_permits_gas", "EPA Permit Filings — Gas/Grease Trap", "globe"),
      s("osha_238220_plumbing", "OSHA Inspection NAICS 238220", "target"),
      s("socrata_permits_plumbing_gas", "Gas Appliance Permits", "building"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "plumbing_lslr",
    label: "Lead Service Line Replacement (IIJA $15B Federal Program)",
    group: "Contractors",
    sources: [
      s("epa_lslr_awards", "EPA LSLR Program — County Award Announcements (Free)", "globe"),
      s("sam_gov_238220", "SAM.gov NAICS 238220 — Federal Contractors", "globe"),
      s("plumbing_new_license", "State Plumbing License (County Cross-Reference)", "file"),
      s("lslr_alert_signups", "LSLR Contractor Alert Network Signups (Traffic Generator)", "trending"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "plumbing_traffic_generators",
    label: "Plumbing Traffic Generators & Tools",
    group: "Contractors",
    sources: [
      s("lslr_alert_network", "LSLR Contractor Alert Network (Email Alert — Free Build)", "trending"),
      s("backflow_expiration_monitor", "Backflow Certification Expiration Monitor (90-Day Reminders)", "target"),
      s("wc_audit_plumbing", "WC Class Code Audit Tool — Plumbing (5183/6325/5185/5191/8742/8810)", "target"),
      s("phcc_partner_content", "PHCC Chapter Newsletter Sponsorship / Lead Magnet", "users"),
      s("restoration_crosssell", "Water Damage Restoration Cross-Sell (IICRC Directory)", "users"),
    ],
  },
  // ── Electrical (6 sub-verticals, 15+ data pipelines, full spec) ──
  {
    id: "electrical_residential",
    label: "Residential Electrical (Inside Wiring — NCCI 5190)",
    group: "Contractors",
    sources: [
      s("ec_new_license", "New State Electrical License (44 states — C-10/ECL classifications)", "file"),
      s("ec_license_renewal", "License Expiring Within 60 Days (X-Date Capture)", "zap"),
      s("osha_238210", "OSHA Inspection NAICS 238210 (WC Distress Signal — 10 arc flash/day)", "target"),
      s("sos_electrical", "SOS New Entity Filings — Electrical Keywords", "file"),
      s("socrata_permits_electrical", "Socrata Electrical Permits (NYC/LA/SF/Seattle/Chicago)", "building"),
      s("iec_directory", "IEC National Directory — ~4,300 Members (Employee Count Filter, Free)", "users"),
      s("epa_rrp_electrical", "EPA RRP Certified Firm Database (Pre-1978 Buildings)", "globe"),
      s("batchdata_enrich", "BatchData Skip-Tracing ($0.05/record)", "users"),
      s("google_places_enrich", "Google Places Enrichment ($0.017/call)", "map"),
    ],
  },
  {
    id: "electrical_commercial",
    label: "Commercial Electrical (Large Permits, SAM.gov, NECA)",
    group: "Contractors",
    sources: [
      s("ec_new_license", "New State Electrical License", "file"),
      s("ec_license_renewal", "License Expiring Within 60 Days", "zap"),
      s("socrata_permits_commercial_ec", "Commercial Electrical Permits >$50K", "building"),
      s("sam_gov_238210", "SAM.gov NAICS 238210 — Federal Electrical Contractors", "globe"),
      s("osha_238210", "OSHA Inspection NAICS 238210", "target"),
      s("neca_directories", "NECA Chapter Directories (~4,000 Members — Union Shop, Higher Premium)", "users"),
      s("ibew_signatory", "IBEW Signatory Contractor Lists (Local-by-Local, Thousands)", "users"),
      s("doe_grip", "DOE GRIP/Grid Deployment Awardee List ($10.5B, 105 Projects)", "globe"),
    ],
  },
  {
    id: "electrical_low_voltage",
    label: "Low-Voltage / Data Cabling (NCCI 7600 — 26% WC Savings vs 5190)",
    group: "Contractors",
    sources: [
      s("ec_new_license", "New State Electrical License", "file"),
      s("iec_directory", "IEC National Directory (Free)", "users"),
      s("osha_238210", "OSHA Inspection NAICS 238210", "target"),
      s("socrata_permits_electrical", "Electrical Permits — Low-Voltage Filter", "building"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "electrical_fire_alarm",
    label: "Fire Alarm / Security Systems (NCCI 7605 — ~$1.95 Rate)",
    group: "Contractors",
    sources: [
      s("ec_new_license", "New State Electrical License (Fire Alarm Classification)", "file"),
      s("osha_238210", "OSHA Inspection NAICS 238210", "target"),
      s("socrata_permits_electrical", "Fire Alarm Permits", "building"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "electrical_solar_ev",
    label: "Solar PV / EV Charging (EVITP + NABCEP + IRA Rebates)",
    group: "Contractors",
    sources: [
      s("evitp_list", "EVITP Approved Contractor List (NEVI $5B — Weekly Delta Detect)", "trending"),
      s("nabcep_directory", "NABCEP Professional Directory (Solar Certifications)", "trending"),
      s("ira_rebate_registries", "IRA State Home Energy Rebate Contractor Registries (CO/CA/OR)", "globe"),
      s("ec_new_license", "New State Electrical License", "file"),
      s("osha_238210", "OSHA Inspection NAICS 238210", "target"),
      s("nec_adoption", "NEC 2023 Adoption Tracking (17 States — citel.us)", "globe"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "electrical_outside_line",
    label: "Outside Line Construction (NCCI 7538 — $5.00–$12.00+ Rate)",
    group: "Contractors",
    sources: [
      s("ec_new_license", "New State Electrical License", "file"),
      s("osha_238210", "OSHA Inspection NAICS 238210", "target"),
      s("doe_grip", "DOE GRIP/Grid Deployment Projects", "globe"),
      s("sam_gov_238210", "SAM.gov NAICS 238210", "globe"),
      s("batchdata_enrich", "BatchData Skip-Tracing", "users"),
    ],
  },
  {
    id: "electrical_traffic_generators",
    label: "Electrical Traffic Generators & Tools",
    group: "Contractors",
    sources: [
      s("arc_flash_risk_quiz", "Arc Flash Risk Assessment Quiz (7 Questions → Coverage Gap)", "trending"),
      s("wc_code_optimizer", "WC Code Optimizer Tool — 5190 vs 7600 Split Calculator (26% Savings)", "target"),
      s("evitp_alert_network", "EVITP New Entrant Alert Network (Weekly Email — Free Build)", "trending"),
      s("nec_compliance_checker", "NEC 2023 Compliance Checklist by State (Free Download)", "trending"),
      s("1099_coi_audit_tool", "1099 Subcontractor COI Audit Tool (Audit Exposure Calculator)", "target"),
    ],
  },
  {
    id: "contractor_painting",
    label: "Painting / Drywall",
    group: "Contractors",
    sources: [
      s("epa_rrp", "EPA RRP Certified Firms", "globe"),
      s("painting_licenses", "Painting Contractor Licenses", "file"),
      s("pdca_directory", "PDCA Directory", "users"),
      s("residential_permits", "Residential Rehab Permits", "building"),
    ],
  },
  {
    id: "contractor_masonry",
    label: "Masonry / Concrete",
    group: "Contractors",
    sources: [
      s("masonry_licenses", "Masonry Licenses", "file"),
      s("mcaa_directory", "MCAA Directory", "users"),
      s("commercial_permits", "Commercial Foundation Permits", "building"),
      s("osha", "OSHA Masonry Citations", "target"),
    ],
  },
  {
    id: "contractor_restoration",
    label: "Restoration / Remediation",
    group: "Contractors",
    sources: [
      s("iicrc_certified", "IICRC Certified Firms", "target"),
      s("epa", "EPA Lead/Asbestos Abatement", "globe"),
      s("fire_dept_reports", "Fire Dept Incident Reports", "zap"),
      s("cat_event_filings", "CAT Event Filings", "zap"),
      s("insurance_restoration", "Carrier Preferred Vendor Lists", "users"),
    ],
  },

  // ── CRE (5 segments) ──
  {
    id: "cre_office",
    label: "Office / Mixed-Use",
    group: "Commercial Real Estate",
    sources: [
      s("commercial_property_sales", "Office Property Sales", "building"),
      s("commercial_co", "Certificate of Occupancy", "building"),
      s("sec_filings", "SEC EDGAR (REIT Filings)", "file"),
      s("costar_signals", "CoStar / LoopNet Signals", "globe"),
    ],
  },
  {
    id: "cre_retail",
    label: "Retail / Shopping",
    group: "Commercial Real Estate",
    sources: [
      s("retail_leases", "Retail Lease Filings", "file"),
      s("commercial_property_sales", "Retail Property Sales", "building"),
      s("business_licenses", "Tenant Business Licenses", "file"),
    ],
  },
  {
    id: "cre_industrial",
    label: "Industrial / Warehouse",
    group: "Commercial Real Estate",
    sources: [
      s("epa", "EPA TRI / ECHO Data", "globe"),
      s("commercial_property_sales", "Industrial Property Sales", "building"),
      s("zoning_changes", "Zoning Variances", "building"),
      s("fema_flood", "FEMA Flood Zone", "zap"),
    ],
  },
  {
    id: "cre_multifamily",
    label: "Multifamily / Apartment",
    group: "Commercial Real Estate",
    sources: [
      s("multifamily_sales", "Multifamily Property Sales", "building"),
      s("hud_data", "HUD / Section 8 Data", "file"),
      s("commercial_mortgage", "Multifamily Mortgage Filings", "file"),
    ],
  },
  {
    id: "cre_hospitality",
    label: "Hospitality / Hotel",
    group: "Commercial Real Estate",
    sources: [
      s("hotel_permits", "Hotel Building Permits", "building"),
      s("str_reports", "STR Market Reports", "trending"),
      s("liquor_licenses", "Liquor License Filings", "file"),
      s("commercial_property_sales", "Hotel Property Sales", "building"),
    ],
  },

  // ── Nonprofit P&C ──
  {
    id: "nonprofit",
    label: "Nonprofit P&C",
    group: "Nonprofit",
    sources: [
      s("irs_bmf", "IRS Exempt Org Master File", "file"),
      s("irs_990", "IRS Form 990 Filings", "file"),
      s("irs_revocations", "IRS Exempt Revocations", "zap"),
      s("state_charity_reg", "State Charity Registrations", "file"),
      s("usaspending", "USASpending.gov Grants", "trending"),
      s("ntee_codes", "NTEE Code Classification", "target"),
      s("board_filings", "Board Member Filings", "users"),
      s("volunteer_programs", "Volunteer Program Registrations", "users"),
    ],
  },

  // ── Cannabis ──
  {
    id: "cannabis_dispensary",
    label: "Dispensaries",
    group: "Cannabis",
    sources: [
      s("cannabis_licenses", "State Cannabis Licenses", "file"),
      s("cannabis_renewals", "License Renewals", "file"),
      s("cannabis_enforcement", "Enforcement Actions", "target"),
      s("cannabis_new_apps", "New License Applications", "file"),
    ],
  },
  {
    id: "cannabis_cultivation",
    label: "Cultivation / Grow",
    group: "Cannabis",
    sources: [
      s("cannabis_licenses", "Cultivation Licenses", "file"),
      s("cannabis_crop", "Crop Insurance Signals", "zap"),
      s("epa", "EPA Water/Pesticide Permits", "globe"),
    ],
  },
  {
    id: "cannabis_manufacturing",
    label: "Processing / Extraction",
    group: "Cannabis",
    sources: [
      s("cannabis_licenses", "Processing Licenses", "file"),
      s("osha", "OSHA Extraction Facility Cites", "target"),
      s("fire_dept_reports", "Fire Marshal Inspections", "zap"),
    ],
  },
  {
    id: "cannabis_distribution",
    label: "Distribution / Delivery",
    group: "Cannabis",
    sources: [
      s("cannabis_licenses", "Distribution Licenses", "file"),
      s("commercial_auto_cannabis", "Commercial Auto (Cannabis)", "rocket"),
      s("cannabis_delivery", "Delivery Permit Filings", "file"),
    ],
  },
  {
    id: "cannabis_ancillary",
    label: "Ancillary / Tech",
    group: "Cannabis",
    sources: [
      s("cannabis_tech_filings", "Cannabis Tech SOS Filings", "file"),
      s("cannabis_testing_labs", "Testing Lab Licenses", "target"),
    ],
  },

  // ── Manufacturing (5 segments) ──
  {
    id: "mfg_food_bev",
    label: "Food & Beverage",
    group: "Manufacturing",
    sources: [
      s("fda_facility", "FDA Food Facility Registration", "file"),
      s("usda_inspections", "USDA Inspection Data", "target"),
      s("ttb_permits", "TTB Permits (Brewery/Distillery)", "file"),
      s("osha", "OSHA Manufacturing Citations", "target"),
      s("sba", "SBA Loan Data", "trending"),
    ],
  },
  {
    id: "mfg_metal",
    label: "Metal Fabrication",
    group: "Manufacturing",
    sources: [
      s("osha", "OSHA Metal Fab Citations", "target"),
      s("epa", "EPA TRI Releases", "globe"),
      s("ucc", "UCC Equipment Filings", "file"),
      s("naics_3132", "NAICS 31-33 New Licenses", "file"),
    ],
  },
  {
    id: "mfg_plastics",
    label: "Plastics / Chemicals",
    group: "Manufacturing",
    sources: [
      s("epa_rmp", "EPA RMP Filings", "globe"),
      s("epa", "EPA TRI Chemical Releases", "globe"),
      s("osha_psp", "OSHA PSM Citations", "target"),
      s("state_env_permits", "State Environmental Permits", "file"),
    ],
  },
  {
    id: "mfg_wood",
    label: "Wood Products / Furniture",
    group: "Manufacturing",
    sources: [
      s("osha", "OSHA Wood Product Citations", "target"),
      s("permits", "Industrial Building Permits", "building"),
      s("epa", "EPA Air Quality Permits", "globe"),
    ],
  },
  {
    id: "mfg_electronics",
    label: "Electronics / Precision",
    group: "Manufacturing",
    sources: [
      s("fcc_registrations", "FCC Equipment Registrations", "file"),
      s("fda_device", "FDA Device Registration", "file"),
      s("import_export", "Import/Export Registrations", "globe"),
      s("ucc", "UCC Equipment Filings", "file"),
    ],
  },

  // ── Hospitality (6 segments — full data-source build from PDF) ──
  {
    id: "hospitality_restaurant",
    label: "Full-Service Restaurants (NAICS 722511)",
    group: "Hospitality",
    sources: [
      s("abc_new_license", "New Liquor License Applications", "file"),
      s("abc_cancellation", "Liquor License Cancellations / Lapses", "zap"),
      s("health_inspection", "Health Inspection Failures / Violations", "target"),
      s("sos_naics72", "New SOS Filings (NAICS 72x)", "file"),
      s("building_permits_hosp", "Building Permits (Restaurant)", "building"),
      s("google_new_listing", "Google/Yelp New Listings (0 reviews)", "map"),
      s("ownership_transfer", "ABC Ownership Transfers", "file"),
      s("newspaper_notices", "Public Notice Liquor Applications", "file"),
      s("review_spike", "Google Review Volume Spikes", "trending"),
    ],
  },
  {
    id: "hospitality_bars",
    label: "Bars / Nightclubs / Taverns (NAICS 722410)",
    group: "Hospitality",
    sources: [
      s("abc_new_license", "New Liquor License Applications", "file"),
      s("abc_cancellation", "Liquor License Cancellations / Lapses", "zap"),
      s("health_inspection", "Health Inspection Failures", "target"),
      s("sos_naics72", "New SOS Filings (NAICS 72x)", "file"),
      s("building_permits_hosp", "Commercial Building Permits", "building"),
      s("google_new_listing", "Google/Yelp New Listings", "map"),
      s("ownership_transfer", "Ownership Transfers (SOS + ABC)", "file"),
      s("newspaper_notices", "Public Notice Liquor Applications", "file"),
      s("review_spike", "Negative Review Spikes (Incidents)", "trending"),
    ],
  },
  {
    id: "hospitality_hotels",
    label: "Hotels / Motels (NAICS 721110)",
    group: "Hospitality",
    sources: [
      s("hotel_permits", "Hotel Building / Renovation Permits", "building"),
      s("sos_naics72", "New SOS Filings (NAICS 721)", "file"),
      s("abc_new_license", "Liquor License (On-Premises)", "file"),
      s("osha", "OSHA Hospitality Citations", "target"),
      s("str_reports", "STR Occupancy / Market Reports", "trending"),
      s("commercial_property_sales", "Hotel Property Sales / Transfers", "building"),
      s("google_new_listing", "Google Maps New Hotel Listings", "map"),
      s("ownership_transfer", "Ownership Change (SOS)", "file"),
    ],
  },
  {
    id: "hospitality_events",
    label: "Event Venues / Banquet Halls (NAICS 722320)",
    group: "Hospitality",
    sources: [
      s("event_permits", "Event Venue Permits", "building"),
      s("abc_new_license", "Liquor / Catering Licenses", "file"),
      s("fire_marshal", "Fire Marshal Occupancy Certs", "zap"),
      s("sos_naics72", "New SOS Filings (NAICS 722320)", "file"),
      s("google_new_listing", "Google Maps New Venue Listings", "map"),
      s("building_permits_hosp", "Renovation / Construction Permits", "building"),
    ],
  },
  {
    id: "hospitality_catering",
    label: "Catering / Food Service (NAICS 722320)",
    group: "Hospitality",
    sources: [
      s("health_inspection", "Health Dept Food Service Permits", "target"),
      s("sos_naics72", "New SOS Filings (NAICS 722)", "file"),
      s("abc_new_license", "Liquor License (If Serving)", "file"),
      s("google_new_listing", "Google Maps New Listings", "map"),
      s("mobile_vendor_permits", "Mobile Food Vendor Permits", "file"),
    ],
  },
  {
    id: "hospitality_qsr",
    label: "Fast Casual / QSR (NAICS 722513)",
    group: "Hospitality",
    sources: [
      s("sos_naics72", "New SOS Filings (NAICS 722513)", "file"),
      s("health_inspection", "Health Inspection Data", "target"),
      s("building_permits_hosp", "Restaurant Build-Out Permits", "building"),
      s("google_new_listing", "Google Maps New Listings", "map"),
      s("ttb_permits", "TTB Federal Permits (Brewpubs)", "file"),
    ],
  },
  {
    id: "hospitality_brewery",
    label: "Breweries / Wineries / Distilleries",
    group: "Hospitality",
    sources: [
      s("ttb_permits", "TTB Federal Permit List (Weekly CSV)", "file"),
      s("abc_new_license", "State Liquor License Applications", "file"),
      s("sos_naics72", "New SOS Filings", "file"),
      s("building_permits_hosp", "Production Facility Permits", "building"),
      s("google_new_listing", "Google Maps New Listings", "map"),
    ],
  },

  // ── Healthcare P&C (7 sub-verticals from NPI taxonomy routing) ──
  {
    id: "hc_sv1_high_surgical",
    label: "High-Surgical Physicians (OB/GYN, Neuro, Ortho)",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly", "NPI Weekly Update File (New Enumerations)", "file"),
      s("npi_taxonomy_surgical", "NPI Taxonomy Codes (207V, 207T, 207X)", "target"),
      s("state_medical_boards", "State Medical License Boards", "file"),
      s("care_rrg_pipeline", "CARE RRG Collapse Pipeline (46 States)", "zap"),
      s("proassurance_pipeline", "ProAssurance Merger Pipeline (TX, NY, OH, PA)", "zap"),
      s("curi_cyber_pipeline", "Curi Cyber Gap Pipeline", "zap"),
      s("dea_registration", "DEA Controlled Substance Registration", "file"),
      s("hhs_breach_portal", "HHS OCR Breach Portal (Competitor Alert)", "zap"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hc_sv2_primary_care",
    label: "Primary Care & Non-Surgical MDs",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly", "NPI Weekly Update File (New Enumerations)", "file"),
      s("npi_taxonomy_primary", "NPI Taxonomy Codes (207Q, 207R, 2084)", "target"),
      s("state_medical_boards", "State Medical License Boards", "file"),
      s("care_rrg_pipeline", "CARE RRG Collapse Pipeline", "zap"),
      s("curi_cyber_pipeline", "Curi Cyber Gap Pipeline", "zap"),
      s("dea_registration", "DEA Controlled Substance Registration", "file"),
      s("hhs_breach_portal", "HHS OCR Breach Portal (Competitor Alert)", "zap"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hc_sv3_dental",
    label: "Dentists & Oral Surgeons",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly", "NPI Weekly Update File (New Enumerations)", "file"),
      s("npi_taxonomy_dental", "NPI Taxonomy Codes (1223, 1267)", "target"),
      s("state_dental_boards", "State Dental License Boards", "file"),
      s("dea_registration", "DEA Registration (Oral Surgeons)", "file"),
      s("hhs_breach_portal", "HHS OCR Breach Portal (Competitor Alert)", "zap"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hc_sv4_apps",
    label: "NPs, PAs & Advanced Practice Providers",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly", "NPI Weekly Update File (New Enumerations)", "file"),
      s("npi_taxonomy_app", "NPI Taxonomy Codes (363L, 363A)", "target"),
      s("state_nursing_boards", "State Nursing / APP License Boards", "file"),
      s("correctional_facility", "Correctional Facility APP Contracts", "file"),
      s("hhs_breach_portal", "HHS OCR Breach Portal", "zap"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hc_sv5_allied_health",
    label: "Allied Health (Chiro, PT, OT, Mental Health)",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly", "NPI Weekly Update File (New Enumerations)", "file"),
      s("npi_taxonomy_allied", "NPI Taxonomy Codes (111N, 225X, 225100, 1041C)", "target"),
      s("state_licensing_allied", "State Allied Health License Boards", "file"),
      s("hhs_breach_portal", "HHS OCR Breach Portal (HIPAA Cyber)", "zap"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hc_sv6_med_spa",
    label: "Med Spas & Aesthetics",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly", "NPI Weekly Update File (New Enumerations)", "file"),
      s("sos_new_medspa", "SOS New Entity Filings (Med Spa)", "file"),
      s("state_medical_boards", "State Medical License Boards", "file"),
      s("business_licenses_medspa", "County Business Licenses (Aesthetics)", "file"),
      s("google_new_listing", "Google Places New Med Spa Listings", "map"),
      s("hhs_breach_portal", "HHS OCR Breach Portal", "zap"),
    ],
  },
  {
    id: "hc_sv7_group_facilities",
    label: "Group Practices, ASCs & Facilities",
    group: "Healthcare P&C",
    sources: [
      s("npi_weekly_org", "NPI Weekly File (Entity Type 2 — Organizations)", "file"),
      s("cms_medicare_enrollment", "CMS Medicare Enrollment Trigger", "file"),
      s("state_facility_licensing", "State Facility License Applications", "file"),
      s("care_rrg_pipeline", "CARE RRG Collapse Pipeline", "zap"),
      s("curi_cyber_pipeline", "Curi Cyber Gap Pipeline", "zap"),
      s("proassurance_pipeline", "ProAssurance Merger Pipeline", "zap"),
      s("hhs_oig_exclusion", "HHS OIG Exclusion List", "target"),
      s("google_places_enrich", "Google Places Enrichment", "map"),
    ],
  },
  {
    id: "hc_market_disruption",
    label: "Market Disruption Pipelines (CARE/Curi/ProAssurance)",
    group: "Healthcare P&C",
    sources: [
      s("care_rrg_pipeline", "CARE RRG Liquidation — 1,300 Physicians (46 States)", "zap"),
      s("curi_cyber_pipeline", "Curi Embedded Cyber Exit — 50,000+ Providers", "zap"),
      s("proassurance_pipeline", "ProAssurance Merger — TX, NY, OH, PA, NJ, IN, KY", "zap"),
      s("vermont_dfr", "Vermont DFR Liquidation Docket", "file"),
      s("state_doi_records", "State DOI Carrier Records", "file"),
      s("npi_state_cross_ref", "NPI × State Cross-Reference (Disruption Targeting)", "target"),
    ],
  },

  // ── Auto Dealers ──
  {
    id: "auto_dealers",
    label: "Auto Dealers / Repair",
    group: "Auto Dealers",
    sources: [
      s("dealer_licenses", "Dealer License Applications", "file"),
      s("dealer_renewals", "Dealer License Renewals", "file"),
      s("dealer_suspensions", "Dealer Suspensions", "target"),
      s("auto_repair_licenses", "Auto Repair Shop Licenses", "file"),
      s("ucc", "UCC Floor Plan Filings", "file"),
      s("nhtsa_recalls", "NHTSA Recall Compliance", "target"),
      s("auction_licenses", "Auction House Licenses", "file"),
    ],
  },

  // ── Trucking / Transportation ──
  {
    id: "trucking_bmc35",
    label: "BMC-35 Cancellations",
    group: "Trucking",
    sources: [
      s("bmc35_cancellations", "BMC-35 Insurance Cancellations", "target"),
      s("fmcsa_inshist", "FMCSA InsHist Daily Diff (xkmg-ff2t)", "rocket"),
      s("google_places_enrich", "Google Places Phone Enrichment", "map"),
    ],
  },
  {
    id: "trucking_new_authority",
    label: "New MC Authority",
    group: "Trucking",
    sources: [
      s("fmcsa_new_authority", "FMCSA New MC Authority Grants", "rocket"),
      s("fmcsa_authhist", "FMCSA AuthHist Daily Diff (sn3k-dnx7)", "rocket"),
      s("google_places_enrich", "Google Places Phone Enrichment", "map"),
    ],
  },
  {
    id: "trucking_csa_alert",
    label: "CSA BASIC Alerts",
    group: "Trucking",
    sources: [
      s("csa_basic_scores", "CSA BASIC Score Changes (Month-over-Month)", "trending"),
      s("fmcsa_sms_csv", "FMCSA SMS Monthly CSV Download", "file"),
      s("qcmobile_api", "QCMobile API — Full BASIC Percentiles", "rocket"),
    ],
  },
  {
    id: "trucking_safety_rating",
    label: "Safety Rating Downgrades",
    group: "Trucking",
    sources: [
      s("carrier_safety_ratings", "FMCSA Safety Rating Changes", "target"),
      s("fmcsa_census", "FMCSA Census File Daily Diff (az4n-8mr2)", "rocket"),
    ],
  },
  {
    id: "trucking_general",
    label: "General Trucking / Fleet",
    group: "Trucking",
    sources: [
      s("fmcsa", "FMCSA / DOT Records", "rocket"),
      s("dot_inspections", "DOT Inspection Reports", "file"),
      s("oos_orders", "Out-of-Service Orders", "zap"),
      s("hazmat_endorsements", "Hazmat Endorsements", "zap"),
      s("ifta_registrations", "IFTA / IRP Registrations", "file"),
      s("broker_authority", "Broker Authority Filings", "building"),
      s("cargo_claims", "Cargo Claims", "file"),
    ],
  },

  // ── Financial Advisor (7 lanes) ──
  {
    id: "fa_term_life",
    label: "Term Life",
    group: "Financial Advisor",
    sources: [
      s("marriage_records", "Marriage License Filings", "file"),
      s("birth_records", "Birth Record Signals", "file"),
      s("mortgage_originations", "New Mortgage Originations", "trending"),
      s("new_business", "New LLC/Corp (Key Person)", "file"),
      s("sba", "SBA Loan Recipients", "trending"),
      s("divorce_filings", "Divorce Decree Filings", "file"),
      s("dui_court_records", "DUI / SR-22 Court Records", "file"),
      s("professional_licenses", "Professional License Boards", "file"),
      s("warn_act", "WARN Act Layoff Notices", "zap"),
      s("commercial_leases", "Commercial Lease Filings", "file"),
      s("ucc", "UCC Lien Filings", "file"),
    ],
  },
  {
    id: "fa_whole_life",
    label: "Whole Life / Permanent",
    group: "Financial Advisor",
    sources: [
      s("faa_aircraft", "FAA Aircraft Registry", "rocket"),
      s("high_value_property", "High-Value Property Sales", "building"),
      s("sec_form_d", "SEC Form D (Startup Founders)", "file"),
      s("sec_filings", "SEC EDGAR Officers", "file"),
      s("multi_member_llc", "Multi-Member LLC Filings", "building"),
      s("dol_5500", "DOL 5500 Gap Finder", "file"),
      s("probate_filings", "Probate / Estate Filings", "file"),
      s("trust_filings", "Revocable Trust Filings", "file"),
      s("connelly_buysell", "Buy-Sell (Connelly Signal)", "target"),
      s("boat_registrations", "Luxury Watercraft Registry", "file"),
    ],
  },
  {
    id: "fa_disability",
    label: "Disability / LTC",
    group: "Financial Advisor",
    sources: [
      s("professional_licenses", "Professional License Boards", "file"),
      s("high_income_proxy", "High-Income Proxy Signals", "trending"),
      s("dol_5500", "DOL 5500 (No DI Plan)", "file"),
      s("new_business", "New Business Owners (No DI)", "file"),
      s("physician_licenses", "Physician / Specialist Licenses", "file"),
      s("ltc_partnership", "LTC Partnership Program Data", "trending"),
      s("medicare_signals", "Medicare Aging-In Signals", "trending"),
    ],
  },
  {
    id: "fa_retirement",
    label: "Retirement / 401(k)",
    group: "Financial Advisor",
    sources: [
      s("dol_5500", "DOL 5500 Gap Finder", "file"),
      s("dol_5500_tpa", "DOL 5500 TPA Network Graph", "users"),
      s("multi_member_llc", "Multi-Member LLC (No Plan)", "building"),
      s("sba", "SBA Loan (No Retirement)", "trending"),
      s("pbgc_terminations", "PBGC Plan Terminations", "zap"),
      s("warn_act", "WARN Act (Rollover Signal)", "zap"),
      s("sec_adv", "SEC Form ADV (RIA Gaps)", "file"),
    ],
  },
  {
    id: "fa_wealth",
    label: "Wealth / RIA",
    group: "Financial Advisor",
    sources: [
      s("sec_adv", "SEC Form ADV", "file"),
      s("sec_filings", "SEC EDGAR / 13F Filings", "file"),
      s("finra_brokercheck", "FINRA BrokerCheck", "target"),
      s("finra_crd", "FINRA CRD Transitions", "target"),
      s("faa_aircraft", "FAA Aircraft Registry", "rocket"),
      s("high_value_property", "High Net Worth Property", "building"),
      s("sec_form_d", "SEC Form D Founders", "file"),
      s("hud_maturing", "HUD Maturing Mortgages", "trending"),
    ],
  },
  {
    id: "fa_rollover",
    label: "Rollover / Annuity",
    group: "Financial Advisor",
    sources: [
      s("pbgc_terminations", "PBGC Plan Terminations", "zap"),
      s("warn_act", "WARN Act Layoffs", "zap"),
      s("dol_5500", "DOL 5500 Plan Changes", "file"),
      s("retirement_age", "Retirement Age Signals", "trending"),
      s("sec_adv", "SEC Form ADV (Custodian)", "file"),
      s("dol_rollover_compliance", "DOL Rollover Attestation", "target"),
    ],
  },
  {
    id: "fa_business_owner",
    label: "Business Owner Cross-Sell",
    group: "Financial Advisor",
    sources: [
      s("multi_member_llc", "Multi-Member LLC Filings", "building"),
      s("sba", "SBA Loan Recipients", "trending"),
      s("dol_5500", "DOL 5500 (No Plan Filed)", "file"),
      s("faa_aircraft", "FAA Aircraft Registry", "rocket"),
      s("ucc", "UCC Filings (Buy-Sell)", "file"),
      s("sec_form_d", "SEC Form D (First Capital)", "file"),
      s("succession_signals", "Succession Planning Signals", "trending"),
      s("connelly_buysell", "Connelly Buy-Sell Signal", "target"),
    ],
  },
];

/* ── Map industry to default vertical groups shown ── */
export const INDUSTRY_VERTICAL_GROUPS: Record<string, string[]> = {
  insurance: ["Personal Lines", "Commercial Lines", "Contractors", "Commercial Real Estate", "Nonprofit", "Cannabis", "Manufacturing", "Hospitality", "Auto Dealers", "Trucking", "Life Insurance", "Healthcare P&C"],
  healthcare: ["Healthcare P&C", "Commercial Lines"],
  life_insurance: ["Life Insurance"],
  mortgage: ["Personal Lines", "Life Insurance"],
  real_estate: ["Personal Lines", "Commercial Real Estate", "Life Insurance"],
  property: ["Commercial Real Estate"],
  consulting: ["Commercial Lines", "Manufacturing"],
  general: ["Commercial Lines", "Contractors"],
};

/* ── Get verticals for a given industry ── */
export function getVerticalsForIndustry(industry: string, showAll = false): Vertical[] {
  if (showAll) return [...VERTICALS];
  const groups = INDUSTRY_VERTICAL_GROUPS[industry] || INDUSTRY_VERTICAL_GROUPS.general;
  return VERTICALS.filter(v => groups.includes(v.group));
}

/* ── Get all unique groups ── */
export function getAllGroups(): string[] {
  return [...new Set(VERTICALS.map(v => v.group))];
}

/* ── Get verticals by group ── */
export function getVerticalsByGroup(): Record<string, Vertical[]> {
  const map: Record<string, Vertical[]> = {};
  for (const v of VERTICALS) {
    (map[v.group] ??= []).push(v);
  }
  return map;
}
