/**
 * Field coordinate map for ACORD form PDF overlays.
 * Coordinates are in points (1pt = 1/72 inch) on a letter-size page (612 × 792).
 * Each entry maps a field key to { page, x, y, maxWidth?, fontSize? }.
 * page is 0-indexed relative to the form's pages array.
 */

export type FieldPosition = {
  page: number;
  x: number;
  y: number;
  maxWidth?: number;
  fontSize?: number;
  checkbox?: boolean; // render a check mark instead of text
};

// ─── ACORD 125 — Commercial Insurance Application (4 pages) ───
export const ACORD_125_POSITIONS: Record<string, FieldPosition> = {
  // Page 1 — Header / Agency
  agency_name:          { page: 0, x: 48, y: 100, maxWidth: 180 },
  agency_phone:         { page: 0, x: 48, y: 120, maxWidth: 140 },
  agency_fax:           { page: 0, x: 200, y: 120, maxWidth: 140 },
  agency_email:         { page: 0, x: 48, y: 140, maxWidth: 200 },
  agency_customer_id:   { page: 0, x: 410, y: 80, maxWidth: 160 },
  carrier:              { page: 0, x: 410, y: 100, maxWidth: 160 },
  naic_code:            { page: 0, x: 410, y: 120, maxWidth: 80 },
  policy_number:        { page: 0, x: 490, y: 120, maxWidth: 90 },
  contact_name:         { page: 0, x: 48, y: 160, maxWidth: 180 },
  transaction_date:     { page: 0, x: 410, y: 160, maxWidth: 100 },

  // Applicant Information
  applicant_name:       { page: 0, x: 48, y: 215, maxWidth: 300 },
  mailing_address:      { page: 0, x: 48, y: 235, maxWidth: 300 },
  city:                 { page: 0, x: 48, y: 255, maxWidth: 140 },
  state:                { page: 0, x: 200, y: 255, maxWidth: 50 },
  zip:                  { page: 0, x: 260, y: 255, maxWidth: 80 },
  fein:                 { page: 0, x: 410, y: 215, maxWidth: 160 },
  sic_code:             { page: 0, x: 410, y: 235, maxWidth: 70 },
  naics_code:           { page: 0, x: 490, y: 235, maxWidth: 80 },
  business_phone:       { page: 0, x: 410, y: 255, maxWidth: 160 },
  website:              { page: 0, x: 48, y: 275, maxWidth: 300 },
  business_type:        { page: 0, x: 410, y: 275, maxWidth: 160 },

  // Policy Information
  proposed_eff_date:    { page: 0, x: 48, y: 325, maxWidth: 100 },
  proposed_exp_date:    { page: 0, x: 160, y: 325, maxWidth: 100 },
  billing_plan:         { page: 0, x: 290, y: 325, maxWidth: 100 },
  payment_plan:         { page: 0, x: 410, y: 325, maxWidth: 100 },
  policy_premium:       { page: 0, x: 520, y: 325, maxWidth: 70 },

  // Premises
  premises_address:     { page: 0, x: 48, y: 420, maxWidth: 250 },
  premises_city:        { page: 0, x: 48, y: 440, maxWidth: 140 },
  premises_state:       { page: 0, x: 200, y: 440, maxWidth: 50 },
  premises_zip:         { page: 0, x: 260, y: 440, maxWidth: 80 },
  full_time_employees:  { page: 0, x: 410, y: 420, maxWidth: 60 },
  part_time_employees:  { page: 0, x: 490, y: 420, maxWidth: 60 },
  annual_revenues:      { page: 0, x: 410, y: 440, maxWidth: 120 },

  // Nature of Business
  date_business_started:      { page: 0, x: 48, y: 510, maxWidth: 100 },
  description_of_operations:  { page: 0, x: 48, y: 530, maxWidth: 520, fontSize: 7 },

  // Page 2 — General Information
  subsidiary_of_another:  { page: 1, x: 400, y: 100, maxWidth: 40 },
  has_subsidiaries:       { page: 1, x: 400, y: 120, maxWidth: 40 },
  safety_program:         { page: 1, x: 400, y: 140, maxWidth: 40 },
  exposure_flammables:    { page: 1, x: 400, y: 180, maxWidth: 40 },
  policy_declined_cancelled: { page: 1, x: 400, y: 220, maxWidth: 40 },
  bankruptcy:             { page: 1, x: 400, y: 300, maxWidth: 40 },
  general_info_remarks:   { page: 1, x: 48, y: 420, maxWidth: 520, fontSize: 7 },

  // Page 3 — Prior Carrier / Loss History
  prior_carrier_1:        { page: 2, x: 48, y: 120, maxWidth: 200 },
  prior_policy_number_1:  { page: 2, x: 260, y: 120, maxWidth: 120 },
  prior_gl_premium_1:     { page: 2, x: 400, y: 120, maxWidth: 80 },
  loss_history:           { page: 2, x: 48, y: 300, maxWidth: 520, fontSize: 7 },

  // Page 4 — Remarks / Signature
  remarks:                { page: 3, x: 48, y: 100, maxWidth: 520, fontSize: 7 },
  producer_name:          { page: 3, x: 48, y: 680, maxWidth: 200 },
  signature_date:         { page: 3, x: 410, y: 680, maxWidth: 100 },
};

// ─── ACORD 126 — Commercial General Liability (4 pages) ───
export const ACORD_126_POSITIONS: Record<string, FieldPosition> = {
  agency_name:          { page: 0, x: 48, y: 100, maxWidth: 180 },
  agency_customer_id:   { page: 0, x: 410, y: 80, maxWidth: 160 },
  carrier:              { page: 0, x: 410, y: 100, maxWidth: 160 },
  naic_code:            { page: 0, x: 410, y: 120, maxWidth: 80 },
  policy_number:        { page: 0, x: 490, y: 120, maxWidth: 90 },
  effective_date:       { page: 0, x: 48, y: 140, maxWidth: 100 },
  insured_name:         { page: 0, x: 48, y: 170, maxWidth: 300 },

  // Coverages
  coverage_type:        { page: 0, x: 48, y: 220, maxWidth: 100 },
  general_aggregate:    { page: 0, x: 410, y: 220, maxWidth: 120 },
  products_aggregate:   { page: 0, x: 410, y: 240, maxWidth: 120 },
  each_occurrence:      { page: 0, x: 410, y: 260, maxWidth: 120 },
  personal_adv_injury:  { page: 0, x: 410, y: 280, maxWidth: 120 },
  fire_damage:          { page: 0, x: 410, y: 300, maxWidth: 120 },
  medical_payments:     { page: 0, x: 410, y: 320, maxWidth: 120 },

  // Hazards
  hazard_code_1:          { page: 0, x: 48, y: 400, maxWidth: 80 },
  hazard_classification_1:{ page: 0, x: 140, y: 400, maxWidth: 200 },
  hazard_exposure_1:      { page: 0, x: 360, y: 400, maxWidth: 100 },
  hazard_premium_1:       { page: 0, x: 480, y: 400, maxWidth: 80 },

  remarks_126:            { page: 1, x: 48, y: 100, maxWidth: 520, fontSize: 7 },
};

// ─── ACORD 127 — Business Auto (3 pages) ───
export const ACORD_127_POSITIONS: Record<string, FieldPosition> = {
  agency_name:          { page: 0, x: 48, y: 100, maxWidth: 180 },
  insured_name:         { page: 0, x: 48, y: 170, maxWidth: 300 },
  effective_date:       { page: 0, x: 48, y: 140, maxWidth: 100 },
  policy_number:        { page: 0, x: 490, y: 120, maxWidth: 90 },

  // Vehicles
  vehicle_1_year:       { page: 0, x: 48, y: 340, maxWidth: 50 },
  vehicle_1_make:       { page: 0, x: 110, y: 340, maxWidth: 80 },
  vehicle_1_model:      { page: 0, x: 200, y: 340, maxWidth: 100 },
  vehicle_1_vin:        { page: 0, x: 310, y: 340, maxWidth: 180 },

  // Drivers
  driver_1_name:        { page: 1, x: 48, y: 120, maxWidth: 200 },
  driver_1_dob:         { page: 1, x: 260, y: 120, maxWidth: 80 },
  driver_1_license:     { page: 1, x: 360, y: 120, maxWidth: 120 },
};

// ─── ACORD 130 — Workers Compensation (4 pages) ───
export const ACORD_130_POSITIONS: Record<string, FieldPosition> = {
  agency_name:            { page: 0, x: 48, y: 100, maxWidth: 180 },
  insured_name:           { page: 0, x: 48, y: 170, maxWidth: 300 },
  effective_date:         { page: 0, x: 48, y: 140, maxWidth: 100 },
  policy_number:          { page: 0, x: 490, y: 120, maxWidth: 90 },
  state_of_operation:     { page: 0, x: 410, y: 170, maxWidth: 80 },

  // Class codes
  class_code_1:           { page: 0, x: 48, y: 320, maxWidth: 80 },
  class_description_1:    { page: 0, x: 140, y: 320, maxWidth: 200 },
  annual_remuneration_1:  { page: 0, x: 360, y: 320, maxWidth: 100 },
  est_premium_1:          { page: 0, x: 480, y: 320, maxWidth: 80 },

  // Officers
  officer_1_name:         { page: 1, x: 48, y: 120, maxWidth: 200 },
  officer_1_title:        { page: 1, x: 260, y: 120, maxWidth: 100 },
  officer_1_ownership:    { page: 1, x: 380, y: 120, maxWidth: 60 },

  mod_rate:               { page: 0, x: 410, y: 300, maxWidth: 80 },
  total_estimated_premium:{ page: 0, x: 480, y: 400, maxWidth: 80 },
};

// ─── ACORD 131 — Umbrella / Excess (5 pages) ───
export const ACORD_131_POSITIONS: Record<string, FieldPosition> = {
  agency_name:            { page: 0, x: 48, y: 100, maxWidth: 180 },
  insured_name:           { page: 0, x: 48, y: 170, maxWidth: 300 },
  effective_date:         { page: 0, x: 48, y: 140, maxWidth: 100 },
  policy_number:          { page: 0, x: 490, y: 120, maxWidth: 90 },

  each_occurrence_limit:  { page: 0, x: 410, y: 220, maxWidth: 120 },
  aggregate_limit:        { page: 0, x: 410, y: 240, maxWidth: 120 },
  self_insured_retention: { page: 0, x: 410, y: 260, maxWidth: 120 },
  annual_premium:         { page: 0, x: 410, y: 280, maxWidth: 120 },
};

// ─── ACORD 140 — Property (3 pages) ───
export const ACORD_140_POSITIONS: Record<string, FieldPosition> = {
  agency_name:            { page: 0, x: 48, y: 100, maxWidth: 180 },
  insured_name:           { page: 0, x: 48, y: 170, maxWidth: 300 },
  effective_date:         { page: 0, x: 48, y: 140, maxWidth: 100 },
  policy_number:          { page: 0, x: 490, y: 120, maxWidth: 90 },

  construction_type:      { page: 0, x: 48, y: 300, maxWidth: 120 },
  year_built:             { page: 0, x: 200, y: 300, maxWidth: 60 },
  num_stories:            { page: 0, x: 280, y: 300, maxWidth: 40 },
  total_area_sq_ft:       { page: 0, x: 340, y: 300, maxWidth: 80 },

  building_amount:        { page: 0, x: 410, y: 340, maxWidth: 100 },
  bpp_amount:             { page: 0, x: 410, y: 360, maxWidth: 100 },
  business_income_amount: { page: 0, x: 410, y: 380, maxWidth: 100 },
};

/** Master lookup by form ID */
export const FIELD_POSITION_MAP: Record<string, Record<string, FieldPosition>> = {
  "acord-125": ACORD_125_POSITIONS,
  "acord-126": ACORD_126_POSITIONS,
  "acord-127": ACORD_127_POSITIONS,
  "acord-130": ACORD_130_POSITIONS,
  "acord-131": ACORD_131_POSITIONS,
  "acord-140": ACORD_140_POSITIONS,
};
