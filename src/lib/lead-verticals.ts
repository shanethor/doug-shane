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
  {
    id: "personal_life",
    label: "Life Insurance",
    group: "Personal Lines",
    sources: [
      s("marriage_records", "Marriage License Filings", "file"),
      s("birth_records", "Birth Record Signals", "file"),
      s("mortgage_originations", "New Mortgage Signals", "trending"),
      s("business_ownership", "New Business Owners", "building"),
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

  // ── Contractors (8 trades) ──
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
  {
    id: "contractor_roofing",
    label: "Roofing",
    group: "Contractors",
    sources: [
      s("roofing_licenses", "Roofing Licenses", "file"),
      s("noaa_hail", "NOAA Hail/Storm", "zap"),
      s("nrca_directory", "NRCA Directory", "users"),
      s("storm_permits", "Storm Restoration Permits", "building"),
      s("gaf_certainteed", "GAF/CertainTeed Certified", "target"),
      s("roofing_wc", "Roofing WC 5551/5552", "file"),
      s("cat_event_filings", "CAT Event Filings", "zap"),
    ],
  },
  {
    id: "contractor_hvac",
    label: "HVAC",
    group: "Contractors",
    sources: [
      s("nate_certs", "NATE Certified", "target"),
      s("mfr_dealers", "Manufacturer Dealers", "building"),
      s("utility_rebate", "Utility Rebate Lists", "zap"),
      s("epa", "EPA 608 Certifications", "globe"),
      s("smacna_phcc", "SMACNA Directories", "users"),
      s("pace_programs", "PACE Programs", "trending"),
    ],
  },
  {
    id: "contractor_plumbing",
    label: "Plumbing",
    group: "Contractors",
    sources: [
      s("plumbing_licenses", "Plumbing Licenses", "file"),
      s("backflow_certs", "Backflow Certifications", "target"),
      s("phcc_directory", "PHCC Directory", "users"),
      s("ua_local_unions", "UA Local Unions", "users"),
      s("med_gas_certs", "Medical Gas Certs", "target"),
      s("water_sewer_permits", "Water/Sewer Permits", "building"),
      s("plumbing_wc", "Plumbing WC 5183", "file"),
    ],
  },
  {
    id: "contractor_electrical",
    label: "Electrical",
    group: "Contractors",
    sources: [
      s("electrical_licenses", "Electrical Licenses", "file"),
      s("neca_directory", "NECA / IBEW Directory", "users"),
      s("solar_permits", "Solar Installation Permits", "zap"),
      s("ev_charger_permits", "EV Charger Permits", "zap"),
      s("fire_alarm_permits", "Fire Alarm Permits", "file"),
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

  // ── Hospitality (5 segments) ──
  {
    id: "hospitality_restaurant",
    label: "Restaurants / Bars",
    group: "Hospitality",
    sources: [
      s("food_permits", "Food Service Permits", "file"),
      s("liquor_licenses", "Liquor License Applications", "file"),
      s("abc_transfers", "ABC License Transfers", "file"),
      s("health_violations", "Health Dept Violations", "target"),
      s("grease_fire_permits", "Grease Trap / Fire Permits", "zap"),
    ],
  },
  {
    id: "hospitality_hotels",
    label: "Hotels / Resorts",
    group: "Hospitality",
    sources: [
      s("hotel_permits", "Hotel Building Permits", "building"),
      s("str_reports", "STR Occupancy Reports", "trending"),
      s("liquor_licenses", "Liquor Licenses", "file"),
      s("osha", "OSHA Hospitality Citations", "target"),
    ],
  },
  {
    id: "hospitality_events",
    label: "Event Venues / Banquets",
    group: "Hospitality",
    sources: [
      s("event_permits", "Event Venue Permits", "building"),
      s("liquor_licenses", "Liquor/Catering Licenses", "file"),
      s("fire_marshal", "Fire Marshal Occupancy Certs", "zap"),
    ],
  },
  {
    id: "hospitality_recreation",
    label: "Recreation / Fitness",
    group: "Hospitality",
    sources: [
      s("recreation_permits", "Recreation Facility Permits", "building"),
      s("amusement_licenses", "Amusement Ride Licenses", "file"),
      s("pool_permits", "Pool / Aquatic Permits", "building"),
      s("osha", "OSHA Amusement Citations", "target"),
    ],
  },
  {
    id: "hospitality_cannabis_adj",
    label: "Cannabis (Hospitality)",
    group: "Hospitality",
    sources: [
      s("cannabis_licenses", "Cannabis Consumption Lounges", "file"),
      s("liquor_licenses", "Associated Liquor Licenses", "file"),
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
    id: "trucking",
    label: "Trucking / Transportation",
    group: "Trucking",
    sources: [
      s("fmcsa", "FMCSA / DOT Records", "rocket"),
      s("fmcsa_new_authority", "FMCSA New MC Authority", "rocket"),
      s("bmc35_cancellations", "BMC-35 Cancellations", "target"),
      s("csa_basic_scores", "CSA / BASIC Scores", "trending"),
      s("oos_orders", "Out-of-Service Orders", "zap"),
      s("carrier_safety_ratings", "Carrier Safety Ratings", "target"),
      s("dot_inspections", "DOT Inspection Reports", "file"),
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
  insurance: ["Personal Lines", "Commercial Lines", "Contractors", "Commercial Real Estate", "Nonprofit", "Cannabis", "Manufacturing", "Hospitality", "Auto Dealers", "Trucking"],
  mortgage: ["Personal Lines"],
  real_estate: ["Personal Lines", "Commercial Real Estate"],
  property: ["Commercial Real Estate"],
  consulting: ["Commercial Lines", "Manufacturing"],
  general: ["Commercial Lines", "Contractors"],
};

/* ── Get verticals for a given industry ── */
export function getVerticalsForIndustry(industry: string): Vertical[] {
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
