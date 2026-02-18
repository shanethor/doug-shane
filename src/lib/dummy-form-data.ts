/**
 * Generates realistic dummy data for Restaurant Supplement and Contractor Supplement forms.
 */

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
