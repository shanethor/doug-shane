/**
 * Generates realistic dummy data for Restaurant Supplement, Contractor Supplement forms,
 * and provides real extracted policy data from actual insurance policies.
 */

// ─── REAL POLICY TRAINING DOCUMENTS ───────────────────────────────────────────
// Extracted from actual submitted insurance policies — used for AI training benchmarks

export const REAL_POLICY_DOCUMENTS: Record<string, any>[] = [
  {
    // ── Business Auto Policy — Kapura General Contractors Inc ──────────────────
    // Source: Progressive Casualty Insurance Co, Policy 995259848
    form_type: "real_policy_auto",
    display_name: "Kapura General Contractors Inc – Business Auto",

    // Named insured & contact
    named_insured: "Kapura General Contractors Inc",
    business_name: "Kapura General Contractors Inc",
    company_name: "Kapura General Contractors Inc",
    mailing_address: "339 Cooke Street",
    street_address: "339 Cooke Street",
    city: "Plainville",
    state: "CT",
    zip: "06062",
    city_state_zip: "Plainville, CT 06062",
    organization_type: "Corporation",
    business_type: "Corporation",

    // Agent / broker
    agent_name: "Abbate Ins Assoc Inc",
    agent_address: "671 State St, New Haven, CT 06511",
    agent_phone: "1-203-777-7229",

    // Policy info
    policy_number: "995259848",
    current_carrier: "Progressive Casualty Insurance Company",
    carrier_name: "Progressive Casualty Insurance Company",
    effective_date: "2025-04-09",
    expiration_date: "2026-04-09",
    policy_period: "Apr 9, 2025 – Apr 9, 2026",
    state_of_domicile: "CT",

    // Coverage & premiums
    auto_liability_limit: "1000000",
    auto_liability_premium: "107851",
    um_uim_limit: "1000000",
    um_uim_premium: "7610",
    med_pay_limit: "5000",
    med_pay_premium: "1733",
    comp_premium: "6628",
    collision_premium: "21165",
    total_annual_premium: "145137",
    blanket_waiver_of_subrogation: "Yes",
    additional_insured_blanket: "Yes",

    // Business profile (AI-inferred)
    description_of_operations: "General contracting services – commercial and residential construction",
    industry: "General Contractor",
    business_category: "Contractor",
    has_auto_exposure: "Yes",
    number_of_vehicles: "28",
    fleet_size: "28",
    radius_of_operations: "100 miles",
    garaging_state: "CT",
    garaging_zip: "06062",
    personal_use_of_vehicles: "No",

    // Vehicles (first several — full fleet of 28)
    vehicle_1_year: "2003",
    vehicle_1_make: "GMC",
    vehicle_1_model: "New Sierra",
    vehicle_1_vin: "1GDJK34193E317698",
    vehicle_1_body_type: "Pickup Truck",
    vehicle_1_stated_amount: "27305",
    vehicle_1_comp_deductible: "1000",
    vehicle_1_collision_deductible: "1000",

    vehicle_2_year: "2003",
    vehicle_2_make: "GMC",
    vehicle_2_model: "C6500",
    vehicle_2_vin: "1GDJ6J1373F513695",
    vehicle_2_body_type: "Flatbed Truck",
    vehicle_2_stated_amount: "15000",
    vehicle_2_comp_deductible: "1000",
    vehicle_2_collision_deductible: "1000",

    vehicle_3_year: "2005",
    vehicle_3_make: "Chevrolet",
    vehicle_3_model: "Silverado",
    vehicle_3_vin: "1GBJK39U25E319372",
    vehicle_3_body_type: "Pickup Truck",
    vehicle_3_stated_amount: "31560",
    vehicle_3_comp_deductible: "1000",
    vehicle_3_collision_deductible: "1000",

    vehicle_4_year: "2005",
    vehicle_4_make: "Chevrolet",
    vehicle_4_model: "Express G3500",
    vehicle_4_vin: "1GBJG31U951161245",
    vehicle_4_body_type: "Cargo Van",

    vehicle_5_year: "2011",
    vehicle_5_make: "GMC",
    vehicle_5_model: "Sierra",
    vehicle_5_vin: "1GD522CL0BZ312041",
    vehicle_5_body_type: "Pickup Truck",
    vehicle_5_stated_amount: "34955",
    vehicle_5_comp_deductible: "1000",
    vehicle_5_collision_deductible: "1000",

    vehicle_6_year: "2014",
    vehicle_6_make: "GMC",
    vehicle_6_model: "Savana",
    vehicle_6_vin: "1GTW7FCA1E1904597",
    vehicle_6_body_type: "Cargo Van",
    vehicle_6_comp_deductible: "1000",
    vehicle_6_collision_deductible: "1000",

    // Drivers
    driver_1_name: "Dean Benoit",
    driver_2_name: "Christopher Brandt",
    driver_3_name: "Joseph Canas",
    driver_4_name: "Derrick Cardona",
    driver_5_name: "Joshua Celano",
    driver_6_name: "Ralph Chambrello",
    driver_7_name: "Brandon Chartier",
    driver_8_name: "Christopher Collins",
    driver_9_name: "Bruce Fleahman",
    driver_10_name: "Matthew Harrington",
    driver_11_name: "Glenn Holt",
    driver_12_name: "Michael Iarusso",
    driver_13_name: "Wilfred Kapura",
    driver_14_name: "Dean Kapura",
    driver_15_name: "Roman Liss",
    driver_16_name: "Stanley Mazur",
    driver_17_name: "Jesse Mockler",
    driver_18_name: "Adam Rutherford",
    driver_19_name: "Keith Bailey",
    driver_20_name: "Angel Ortega",
    number_of_drivers: "28",

    // AI-inferred from contractor business type
    has_workers_comp: "Yes",
    lob_auto: true,
    lob_gl: true,
    auto_premium: "145137",
    inland_marine_premium: "0",
    cyber_premium: "0",
    crime_premium: "0",
    liquor_premium: "0",
    garage_premium: "0",
  },

  {
    // ── Commercial Property Policy — Kapura General Contractors Inc ────────────
    // Source: Hadron Specialty Insurance Company, Policy H0054PR002096-00, via LYNX Specialty
    form_type: "real_policy_property",
    display_name: "Kapura General Contractors Inc – Commercial Property",

    // Named insured
    named_insured: "Kapura General Contractors Inc",
    business_name: "Kapura General Contractors Inc",
    company_name: "Kapura General Contractors Inc",
    mailing_address: "339 Cooke St",
    street_address: "339 Cooke St",
    city: "Plainville",
    state: "CT",
    zip: "06062",
    city_state_zip: "Plainville, CT 06062",
    organization_type: "Corporation",
    business_type: "Corporation",

    // Carrier / broker
    current_carrier: "Hadron Specialty Insurance Company",
    carrier_name: "Hadron Specialty Insurance Company",
    broker_name: "RT Specialty – New York",
    broker_address: "1345 Avenue of the Americas, 4th Floor, New York City, NY 10105",
    surplus_lines: "Yes",

    // Policy info
    policy_number: "H0054PR002096-00",
    effective_date: "2025-04-09",
    expiration_date: "2026-04-09",
    policy_period: "Apr 9, 2025 – Apr 9, 2026",
    state_of_domicile: "CT",
    renewal_or_replacement: "New Policy",
    date_issued: "2025-04-29",

    // Premises
    premises_1_address: "339 Cooke Street, Plainville, Connecticut 06062",
    premises_1_street: "339 Cooke Street",
    premises_1_city: "Plainville",
    premises_1_state: "CT",
    premises_1_zip: "06062",
    description_of_business: "Warehousing – Light to Medium Hazard",
    description_of_operations: "General contracting — warehousing and storage operations",
    industry: "General Contractor",
    business_category: "Contractor",

    // Coverages
    building_limit: "7100000",
    bpp_limit: "1900000",
    business_income_limit: "1000000",
    total_insured_value: "10000000",
    causes_of_loss: "Special Form",
    building_valuation: "Replacement Cost",
    bpp_valuation: "Replacement Cost",
    business_income_valuation: "Actual Loss Sustained",
    building_coinsurance: "0%",
    business_income_coinsurance: "100%",
    equipment_breakdown_premium: "1075",
    property_premium: "49500",
    total_annual_premium: "51575",

    // Deductibles
    property_deductible: "25000",
    wind_hail_deductible_pct: "1%",
    wind_hail_deductible_minimum: "100000",
    deductible_notes: "$25,000 All Other Perils; 1% subject to $100,000 minimum Wind/Hail",

    // AI-inferred
    has_equipment_breakdown: "Yes",
    lob_property: true,
    lob_bop: false,
    lob_gl: true,
    inland_marine_premium: "0",
    cyber_premium: "0",
    crime_premium: "0",
    liquor_premium: "0",
    has_workers_comp: "Yes",
  },

  {
    // ── Excess Liability Policy — Dos Santos Restoration LLC ──────────────────
    // Source: Benchmark Specialty Insurance Company / Magnolia Grove Insurance Services
    // Policy MNGR-X-2001322 — Follow-Form Excess, Surplus Lines CT
    form_type: "real_policy_excess",
    display_name: "Dos Santos Restoration LLC – Excess Liability",

    // Named insured
    named_insured: "Dos Santos Restoration LLC",
    business_name: "Dos Santos Restoration LLC",
    company_name: "Dos Santos Restoration LLC",
    mailing_address: "115 Newfield Street",
    street_address: "115 Newfield Street",
    city: "Hartford",
    state: "CT",
    zip: "06106",
    city_state_zip: "Hartford, CT 06106",
    organization_type: "LLC",
    business_type: "LLC",

    // Carrier / broker
    current_carrier: "Benchmark Specialty Insurance Company",
    carrier_name: "Benchmark Specialty Insurance Company",
    broker_name: "Magnolia Grove Insurance Services",
    broker_address: "850 New Burton Rd #201, Dover, DE 19904",
    third_party_claims_admin: "North American Risk Services (NARS)",
    claims_phone: "1-800-315-6090",
    claims_email: "reportaclaim@narisk.com",
    surplus_lines: "Yes",

    // Policy info
    policy_number: "MNGR-X-2001322",
    effective_date: "2025-12-23",
    expiration_date: "2026-12-23",
    policy_period: "Dec 23, 2025 – Dec 23, 2026",
    state_of_domicile: "CT",
    coverage_type: "Follow-Form Excess Liability",

    // Coverages
    umbrella_each_occurrence: "1000000",
    umbrella_aggregate: "1000000",
    excess_each_claim_limit: "1000000",
    excess_aggregate_limit: "1000000",
    umbrella_premium: "5000",
    total_annual_premium: "5608",
    broker_fee: "250",
    carrier_policy_fee: "158",
    surplus_lines_tax: "200",
    minimum_earned_premium_pct: "25%",
    pay_plan: "Agency Bill – Annual",
    terrorism_premium: "N/A",

    // AI-inferred from restoration contractor + excess policy
    industry: "Restoration Contractor",
    business_category: "Contractor",
    description_of_operations: "Restoration contracting services",
    has_underlying_gl: "Yes",
    lob_umbrella: true,
    lob_gl: true,
    lob_auto: false,
    inland_marine_premium: "0",
    cyber_premium: "0",
    crime_premium: "0",
    liquor_premium: "0",
    auto_premium: "0",
    bop_premium: "0",
  },
];

const COMPANY_NAMES = [
  "Bella Cucina Italian Bistro", "Dragon Palace Chinese Kitchen", "The Rustic Spoon",
  "Harbor View Grill & Bar", "Golden Fork Eatery", "Casa de Sol Mexican Restaurant",
  "The Flying Pig BBQ", "Neptune's Catch Seafood", "Alpine Meadow Café", "Smokehouse 55",
  "Thompson Brothers Construction", "Pacific Ridge Builders", "Summit Contracting Group",
  "Ironworks General Contractors", "BlueLine Construction Co.", "Apex Building Solutions",
  "Cornerstone Structural Inc.", "Valley Forge Builders", "Pinnacle Construction LLC",
  "Heritage Masonry & Concrete"
];

const CONTACT_NAMES = [
  "Maria Rodriguez", "James Chen", "Sarah Thompson", "Michael O'Brien", "Lisa Patel",
  "Robert Kim", "Jennifer Williams", "David Martinez", "Amanda Foster", "Brian Nguyen"
];

const CITIES = [
  { city: "Austin", state: "TX", zip: "78701" },
  { city: "Denver", state: "CO", zip: "80202" },
  { city: "Portland", state: "OR", zip: "97201" },
  { city: "Nashville", state: "TN", zip: "37203" },
  { city: "Charlotte", state: "NC", zip: "28202" },
  { city: "Phoenix", state: "AZ", zip: "85004" },
  { city: "Tampa", state: "FL", zip: "33602" },
  { city: "Minneapolis", state: "MN", zip: "55401" },
];

const STREETS = [
  "123 Main St", "456 Oak Ave", "789 Commerce Blvd", "1010 Industrial Pkwy",
  "555 Market St", "222 Elm Dr", "777 Broadway", "3300 Harbor Way"
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDollar(min: number, max: number) { return `$${randInt(min, max).toLocaleString()}`; }
function randPhone() {
  return `(${randInt(200,999)}) ${randInt(200,999)}-${randInt(1000,9999)}`;
}
function randDate(yearOffset = 0) {
  const y = new Date().getFullYear() + yearOffset;
  return `${String(randInt(1,12)).padStart(2,'0')}/${String(randInt(1,28)).padStart(2,'0')}/${y}`;
}
function yesNo() { return Math.random() > 0.5 ? "Yes" : "No"; }

export function generateRestaurantSupplement(): Record<string, any> {
  const loc = pick(CITIES);
  const hasLiquor = Math.random() > 0.3;
  return {
    form_type: "restaurant_supplement",
    agency_customer_id: `RC-${randInt(10000, 99999)}`,
    loc_number: String(randInt(1, 5)),
    date: randDate(),
    named_insured: pick(COMPANY_NAMES.slice(0, 10)),
    contact_name: pick(CONTACT_NAMES),
    contact_number: randPhone(),
    establishment_name: pick(COMPANY_NAMES.slice(0, 10)),
    location_street: pick(STREETS),
    city_state: `${loc.city}, ${loc.state}`,
    zip: loc.zip,
    applicant_type: pick(["Individual", "Partnership", "Corporation", "LLC"]),
    total_sales: randDollar(250000, 3000000),
    food_sales: randDollar(150000, 2000000),
    has_liquor_sales: hasLiquor,
    building_age_over_20: yesNo(),
    roof_update_year: String(randInt(2005, 2024)),
    electrical_update_year: String(randInt(2005, 2024)),
    hvac_update_year: String(randInt(2010, 2024)),
    plumbing_update_year: String(randInt(2008, 2024)),
    wood_frame: yesNo(),
    fully_sprinklered: yesNo(),
    ul300_system: "Yes",
    k_class_extinguishers: "Yes",
    suppression_service_frequency: pick(["Annually", "Semi Annually", "Quarterly"]),
    suppression_vendor: pick(["FireGuard Services", "SafeFlame Inc.", "National Fire Solutions"]),
    last_suppression_service: randDate(),
    cooking_under_hood: "Yes",
    num_fryers: String(randInt(1, 6)),
    num_woks: String(randInt(0, 4)),
    hood_professionally_cleaned: "Yes",
    hood_cleaning_frequency: pick(["Semi Annually", "Quarterly"]),
    hood_vendor: pick(["CleanVent Pro", "Hood Masters LLC", "AirDuct Specialists"]),
    last_hood_cleaning: randDate(),
    // Liquor section
    ...(hasLiquor ? {
      liquor_license_name: pick(CONTACT_NAMES),
      liquor_license_number: `LQ-${randInt(100000, 999999)}`,
      years_at_location: String(randInt(1, 20)),
      hours_mon_thu: `${randInt(10,11)}AM - ${randInt(10,11)}PM`,
      hours_fri: `${randInt(10,11)}AM - ${randInt(11,12)}PM`,
      hours_sat: `${randInt(10,11)}AM - ${randInt(11,12)}PM`,
      hours_sun: `${randInt(11,12)}PM - ${randInt(9,10)}PM`,
      business_type: pick(["Restaurant", "Bar/Tavern", "Night club"]),
      seating_restaurant: String(randInt(40, 200)),
      seating_bar: String(randInt(10, 60)),
      food_receipts_est: randDollar(200000, 1500000),
      hard_liquor_receipts_est: randDollar(50000, 500000),
      beer_receipts_est: randDollar(30000, 300000),
      wine_receipts_est: randDollar(20000, 200000),
      num_servers: String(randInt(4, 20)),
      num_bartenders: String(randInt(1, 8)),
      entertainment: yesNo(),
      dancing_permitted: yesNo(),
      drink_specials: yesNo(),
      id_checked: "Yes",
      staff_training: "Yes",
    } : {}),
  };
}

export function generateContractorSupplement(): Record<string, any> {
  const loc = pick(CITIES);
  const workTypes = ["Carpentry", "Electrical", "Plumbing", "HVAC", "Roofing", "Concrete", "Drywall", "Painting", "Masonry", "Landscaping"];
  const selectedWork = workTypes.filter(() => Math.random() > 0.6);
  
  return {
    form_type: "contractor_supplement",
    applicant_name: pick(COMPANY_NAMES.slice(10)),
    address: pick(STREETS),
    city: loc.city,
    state: loc.state,
    zip_code: loc.zip,
    telephone: randPhone(),
    website: `www.${pick(COMPANY_NAMES.slice(10)).toLowerCase().replace(/[^a-z]/g, '')}.com`,
    states_of_operation: loc.state,
    licensed_states: loc.state,
    years_in_business: String(randInt(3, 35)),
    contractor_license: `CL-${randInt(100000, 999999)}`,
    industry_experience: `${randInt(5, 40)} years in commercial and residential construction`,
    description_of_operations: pick([
      "General contracting services for commercial and residential projects",
      "Specialty subcontractor for electrical and HVAC installations",
      "Full-service roofing and waterproofing contractor",
      "Residential remodeling and new construction",
    ]),
    business_type: pick(["General Contractor", "Subcontractor", "Developer", "Construction Manager"]),
    // Historical receipts
    payroll_current: randDollar(500000, 5000000),
    receipts_current: randDollar(1000000, 15000000),
    subcontractor_costs_current: randDollar(200000, 5000000),
    payroll_prior_1: randDollar(400000, 4500000),
    receipts_prior_1: randDollar(900000, 13000000),
    subcontractor_costs_prior_1: randDollar(180000, 4500000),
    payroll_prior_2: randDollar(350000, 4000000),
    receipts_prior_2: randDollar(800000, 11000000),
    subcontractor_costs_prior_2: randDollar(150000, 4000000),
    owner_payroll: randDollar(80000, 250000),
    employee_payroll: randDollar(300000, 3000000),
    // Work breakdown
    commercial_new_pct: `${randInt(10, 50)}%`,
    commercial_remodel_pct: `${randInt(5, 30)}%`,
    residential_new_pct: `${randInt(10, 40)}%`,
    residential_remodel_pct: `${randInt(5, 25)}%`,
    work_types_performed: selectedWork,
    // Safety
    has_safety_program: "Yes",
    safety_rules: "Yes",
    fall_protection: "Yes",
    sub_safety_requirements: "Yes",
    safety_meetings: "Yes",
    ppe_mandated: "Yes",
    osha_violations: "No",
    uses_scaffolding: yesNo(),
    max_height_ft: `${randInt(15, 80)}`,
    // Liability
    requires_sub_contracts: "Yes",
    indemnification_agreements: "Yes",
    named_additional_insured: "Yes",
    waiver_of_subrogation: "Yes",
    sub_limits_required: randDollar(500000, 2000000),
    sub_workers_comp_required: "Yes",
    certificates_obtained: "Yes",
    has_workers_comp: "Yes",
    uses_written_customer_contracts: "Yes",
    // Projects
    largest_projects: [
      { description: pick(["Office complex renovation", "Municipal building construction", "Warehouse expansion", "Hospital wing addition", "School gymnasium"]), value: randDollar(500000, 5000000) },
      { description: pick(["Retail storefront buildout", "Residential subdivision", "Church renovation", "Restaurant buildout"]), value: randDollar(300000, 3000000) },
      { description: pick(["Parking garage repair", "Condo interior fit-out", "Library expansion"]), value: randDollar(200000, 2000000) },
    ],
    // Claims
    pending_claims: "No",
    breach_of_contract: "No",
    fired_from_job: "No",
    faulty_construction_litigation: "No",
    lapse_in_gl: "No",
    owns_other_business: yesNo(),
    bankruptcy: "No",
  };
}

// ─── BUILDING OWNER SUPPLEMENT ────────────────────────────────────────────────

const BUILDING_TYPES = ["Office Building", "Retail Strip Mall", "Industrial Warehouse", "Mixed-Use", "Medical Office", "Multi-Tenant Office", "Shopping Center"];
const CONSTRUCTION_TYPES = ["Fire Resistive", "Masonry Non-Combustible", "Joisted Masonry", "Frame", "Modified Fire Resistive"];
const ROOF_TYPES = ["Built-Up", "Modified Bitumen", "EPDM / Rubber Membrane", "Metal", "TPO Single-Ply", "Shingle"];
const HEATING_TYPES = ["Gas Forced Air", "Electric Heat Pump", "Oil Boiler", "Radiant", "Rooftop Package Unit"];
const SPRINKLER_TYPES = ["Full Wet Pipe", "Partial Wet Pipe", "Dry Pipe", "Pre-Action", "None"];

export function generateBuildingOwnerSupplement(): Record<string, any> {
  const loc = pick(CITIES);
  const numBuildings = randInt(1, 4);
  const buildingAge = randInt(1960, 2020);
  const stories = randInt(1, 12);
  const sqft = randInt(5000, 150000);
  const numTenants = randInt(1, 30);

  return {
    form_type: "building_owner_supplement",
    named_insured: pick(COMPANY_NAMES),
    contact_name: pick(CONTACT_NAMES),
    contact_number: randPhone(),
    mailing_address: `${pick(STREETS)}, ${loc.city}, ${loc.state} ${loc.zip}`,
    city: loc.city,
    state: loc.state,
    zip: loc.zip,
    organization_type: pick(["LLC", "Corporation", "Partnership", "Trust", "Individual"]),

    // Building details
    building_type: pick(BUILDING_TYPES),
    construction_type: pick(CONSTRUCTION_TYPES),
    year_built: String(buildingAge),
    number_of_stories: String(stories),
    total_square_footage: String(sqft),
    number_of_buildings: String(numBuildings),

    // Systems & updates
    roof_type: pick(ROOF_TYPES),
    roof_update_year: String(randInt(Math.max(buildingAge, 2005), 2025)),
    electrical_update_year: String(randInt(Math.max(buildingAge, 2000), 2025)),
    plumbing_update_year: String(randInt(Math.max(buildingAge, 2000), 2025)),
    hvac_type: pick(HEATING_TYPES),
    hvac_update_year: String(randInt(Math.max(buildingAge, 2005), 2025)),
    sprinkler_type: pick(SPRINKLER_TYPES),
    fire_alarm: yesNo(),
    burglar_alarm: yesNo(),
    central_station_monitoring: yesNo(),
    emergency_generator: yesNo(),
    elevator: stories >= 3 ? "Yes" : yesNo(),
    number_of_elevators: stories >= 3 ? String(randInt(1, 4)) : "0",

    // Occupancy & tenants
    owner_occupied_pct: `${randInt(0, 100)}%`,
    vacancy_pct: `${randInt(0, 25)}%`,
    number_of_tenants: String(numTenants),
    tenant_types: pick(["Office", "Retail", "Medical", "Industrial", "Mixed"]),
    annual_rental_income: randDollar(100000, 3000000),
    require_tenant_insurance: yesNo(),

    // Values
    building_value: randDollar(500000, 15000000),
    bpp_value: randDollar(50000, 500000),
    business_income_value: randDollar(50000, 1000000),
    building_valuation: pick(["Replacement Cost", "Actual Cash Value", "Agreed Value"]),
    property_deductible: pick(["$1,000", "$2,500", "$5,000", "$10,000", "$25,000"]),

    // Exposure
    parking_lot: yesNo(),
    swimming_pool: yesNo(),
    playground: "No",
    hazardous_materials_on_site: "No",
    prior_losses_3yr: yesNo(),
    loss_details: Math.random() > 0.7 ? `Water damage ${randDate(-1)}, paid ${randDollar(5000, 50000)}` : "None",

    // Maintenance
    has_maintenance_program: "Yes",
    snow_removal_contract: loc.state === "FL" || loc.state === "AZ" ? "No" : "Yes",
    janitorial_service: yesNo(),
    pest_control: "Yes",
  };
}

// ─── REAL DEC (DECLARATION) FORM DATA ─────────────────────────────────────────

export const REAL_DEC_DOCUMENTS: Record<string, any>[] = [
  {
    form_type: "dec_cgl",
    display_name: "Lyndsey Roofing LLC – CGL Declaration",

    // Named insured & address
    named_insured: "Lyndsey Roofing LLC",
    business_name: "Lyndsey Roofing LLC",
    company_name: "Lyndsey Roofing LLC",
    mailing_address: "29 Firemens Way, Poughkeepsie, NY 12603",
    street_address: "29 Firemens Way",
    city: "Poughkeepsie",
    state: "NY",
    zip: "12603",
    city_state_zip: "Poughkeepsie, NY 12603",

    // Carrier / Producer
    current_carrier: "Accelerant Specialty Insurance Company",
    carrier_name: "Accelerant Specialty Insurance Company",
    carrier_address: "400 Northridge Road, Suite 800, Sandy Spring, GA 30350",
    broker_name: "RT Specialty - New York",
    broker_address: "1166 Avenue of the Americas, 18th Floor, New York, NY 10036",
    managing_general_agent: "Accelerant Underwriting Managers, Inc. administered by Mission Underwriting Managers, LLC – Quantum Specialty Series",

    // Policy info
    policy_number: "SGL183R0083300",
    effective_date: "06/27/2025",
    expiration_date: "06/27/2026",
    policy_period: "06/27/2025 – 06/27/2026",
    coverage_type: "Commercial General Liability",

    // Limits
    each_occurrence_limit: "2000000",
    personal_advertising_injury_limit: "1000000",
    general_aggregate_limit: "4000000",
    products_completed_ops_aggregate: "4000000",
    damage_to_premises_rented: "100000",
    medical_expense_limit: "5000",

    // Premium
    estimated_premium: "81000",
    tria_premium: "N/A",
    policy_fee: "1075",
    total_amount_payable: "82075",

    // Classification
    class_code: "98678",
    class_description: "Roofing--Residential--Three Stories & Under",
    premium_basis: "Gross Sales per $1,000",
    exposure: "6000000",
    rate: "13.500",
    class_premium: "81000",

    // Audit
    audit_period: "Policy Term",

    // Key endorsements
    additional_insured_scheduled: "CG 20 10 (12-19)",
    additional_insured_completed_ops: "CG 20 37 (12-19)",
    waiver_of_subrogation: "CG 24 04 (12-19)",
    total_pollution_exclusion: "CG 21 65 (12-04)",
    per_project_aggregate: "Yes",

    // AI-inferred
    industry: "Roofing Contractor",
    business_category: "Contractor",
    description_of_operations: "Residential roofing services, three stories and under",
    lob_gl: true,
    organization_type: "LLC",
    business_type: "LLC",
    surplus_lines: "Yes",
  },
];
