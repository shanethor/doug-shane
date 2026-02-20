/**
 * Field coordinate map for ACORD form PDF overlays.
 * Coordinates are in points (1pt = 1/72 inch) on a letter-size page (612 × 792).
 * Each entry maps a field key to { page, x, y, maxWidth?, fontSize? }.
 * page is 0-indexed relative to the form's pages array.
 *
 * Calibrated against the actual ACORD template images in public/acord-pages/.
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
  // Page 1 — Header / Agency block
  agency_name:          { page: 0, x: 22, y: 62, maxWidth: 270 },
  agency_phone:         { page: 0, x: 22, y: 138, maxWidth: 130 },
  agency_fax:           { page: 0, x: 22, y: 152, maxWidth: 130 },
  agency_email:         { page: 0, x: 22, y: 166, maxWidth: 200 },
  agency_customer_id:   { page: 0, x: 22, y: 207, maxWidth: 160 },
  carrier:              { page: 0, x: 312, y: 62, maxWidth: 230 },
  naic_code:            { page: 0, x: 565, y: 62, maxWidth: 40 },
  policy_number:        { page: 0, x: 312, y: 98, maxWidth: 230 },
  contact_name:         { page: 0, x: 22, y: 118, maxWidth: 200 },
  transaction_date:     { page: 0, x: 545, y: 33, maxWidth: 60 },

  // Policy Information (mid-page, below Attachments)
  proposed_eff_date:    { page: 0, x: 22, y: 512, maxWidth: 72 },
  proposed_exp_date:    { page: 0, x: 100, y: 512, maxWidth: 72 },
  billing_plan:         { page: 0, x: 182, y: 525, maxWidth: 70 },
  payment_plan:         { page: 0, x: 270, y: 512, maxWidth: 70 },
  policy_premium:       { page: 0, x: 578, y: 512, maxWidth: 30 },

  // Applicant Information (bottom of page 1)
  applicant_name:       { page: 0, x: 22, y: 568, maxWidth: 390 },
  mailing_address:      { page: 0, x: 22, y: 582, maxWidth: 390 },
  city:                 { page: 0, x: 22, y: 596, maxWidth: 140 },
  state:                { page: 0, x: 170, y: 596, maxWidth: 40 },
  zip:                  { page: 0, x: 220, y: 596, maxWidth: 80 },
  fein:                 { page: 0, x: 565, y: 568, maxWidth: 40, fontSize: 7 },
  sic_code:             { page: 0, x: 480, y: 558, maxWidth: 35 },
  naics_code:           { page: 0, x: 520, y: 558, maxWidth: 40 },
  business_phone:       { page: 0, x: 432, y: 600, maxWidth: 120 },
  website:              { page: 0, x: 432, y: 615, maxWidth: 160 },
  business_type:        { page: 0, x: 432, y: 558, maxWidth: 40 },

  // Page 2 — Premises Information
  premises_address:     { page: 1, x: 60, y: 142, maxWidth: 220 },
  premises_city:        { page: 1, x: 60, y: 162, maxWidth: 110 },
  premises_state:       { page: 1, x: 178, y: 162, maxWidth: 40 },
  premises_zip:         { page: 1, x: 232, y: 162, maxWidth: 60 },
  full_time_employees:  { page: 1, x: 440, y: 142, maxWidth: 50 },
  part_time_employees:  { page: 1, x: 440, y: 162, maxWidth: 50 },
  annual_revenues:      { page: 1, x: 535, y: 142, maxWidth: 60 },

  // Nature of Business (page 2)
  date_business_started:      { page: 1, x: 540, y: 518, maxWidth: 60 },
  description_of_operations:  { page: 1, x: 22, y: 548, maxWidth: 560, fontSize: 7 },

  // Page 3 — General Information (Y/N answers on right)
  subsidiary_of_another:  { page: 2, x: 585, y: 52, maxWidth: 15 },
  has_subsidiaries:       { page: 2, x: 585, y: 95, maxWidth: 15 },
  safety_program:         { page: 2, x: 585, y: 135, maxWidth: 15 },
  exposure_flammables:    { page: 2, x: 585, y: 172, maxWidth: 15 },
  policy_declined_cancelled: { page: 2, x: 585, y: 258, maxWidth: 15 },
  bankruptcy:             { page: 2, x: 585, y: 478, maxWidth: 15 },
  general_info_remarks:   { page: 2, x: 22, y: 702, maxWidth: 560, fontSize: 7 },

  // Page 3 — Prior Carrier Information (bottom)
  prior_carrier_1:        { page: 2, x: 68, y: 758, maxWidth: 100 },
  prior_policy_number_1:  { page: 2, x: 68, y: 770, maxWidth: 100 },
  prior_gl_premium_1:     { page: 2, x: 135, y: 778, maxWidth: 70 },
  loss_history:           { page: 3, x: 22, y: 218, maxWidth: 560, fontSize: 7 },

  // Page 4 — Signature
  remarks:                { page: 2, x: 22, y: 702, maxWidth: 560, fontSize: 7 },
  producer_name:          { page: 3, x: 252, y: 748, maxWidth: 200 },
  signature_date:         { page: 3, x: 445, y: 762, maxWidth: 80 },
};

// ─── ACORD 126 — Commercial General Liability (4 pages) ───
export const ACORD_126_POSITIONS: Record<string, FieldPosition> = {
  agency_name:          { page: 0, x: 22, y: 65, maxWidth: 270 },
  agency_customer_id:   { page: 0, x: 370, y: 18, maxWidth: 160 },
  carrier:              { page: 0, x: 312, y: 65, maxWidth: 230 },
  naic_code:            { page: 0, x: 565, y: 65, maxWidth: 40 },
  policy_number:        { page: 0, x: 22, y: 88, maxWidth: 190 },
  effective_date:       { page: 0, x: 222, y: 88, maxWidth: 80 },
  insured_name:         { page: 0, x: 342, y: 88, maxWidth: 230 },

  // Coverages — Limits (right column, $ values)
  coverage_type:        { page: 0, x: 30, y: 142, maxWidth: 180 },
  general_aggregate:    { page: 0, x: 460, y: 142, maxWidth: 60 },
  products_aggregate:   { page: 0, x: 460, y: 170, maxWidth: 60 },
  personal_adv_injury:  { page: 0, x: 460, y: 185, maxWidth: 60 },
  each_occurrence:      { page: 0, x: 460, y: 200, maxWidth: 60 },
  fire_damage:          { page: 0, x: 460, y: 215, maxWidth: 60 },
  medical_payments:     { page: 0, x: 460, y: 232, maxWidth: 60 },

  // Schedule of Hazards (first row)
  hazard_code_1:          { page: 0, x: 50, y: 368, maxWidth: 35 },
  hazard_classification_1:{ page: 0, x: 22, y: 388, maxWidth: 280 },
  hazard_exposure_1:      { page: 0, x: 220, y: 368, maxWidth: 80 },
  hazard_premium_1:       { page: 0, x: 498, y: 372, maxWidth: 60 },

  remarks_126:            { page: 1, x: 22, y: 100, maxWidth: 560, fontSize: 7 },
};

// ─── ACORD 127 — Business Auto (3 pages) ───
// Page dimensions: 612 × 792 pt (letter). Coordinates calibrated against
// public/acord-pages/127-page1.jpg, 127-page2.jpg, 127-page3.jpg.
export const ACORD_127_POSITIONS: Record<string, FieldPosition> = {
  // ── Page 1 header ──
  agency_name:          { page: 0, x: 22,  y: 58,  maxWidth: 250 },
  agency_customer_id:   { page: 0, x: 410, y: 18,  maxWidth: 160 },
  carrier:              { page: 0, x: 310, y: 58,  maxWidth: 200 },
  naic_code:            { page: 0, x: 568, y: 58,  maxWidth: 38  },
  transaction_date:     { page: 0, x: 545, y: 38,  maxWidth: 60  },
  policy_number:        { page: 0, x: 22,  y: 82,  maxWidth: 190 },
  effective_date:       { page: 0, x: 262, y: 82,  maxWidth: 80  },
  insured_name:         { page: 0, x: 372, y: 82,  maxWidth: 210 },

  // ── Page 1 — Driver Information table (row 1–5, ~14.4pt row spacing) ──
  driver_1_name:        { page: 0, x: 40,  y: 185, maxWidth: 115, fontSize: 7 },
  driver_1_city:        { page: 0, x: 40,  y: 194, maxWidth: 115, fontSize: 6 },
  driver_1_sex:         { page: 0, x: 160, y: 185, maxWidth: 14,  fontSize: 7 },
  driver_1_marital:     { page: 0, x: 177, y: 185, maxWidth: 14,  fontSize: 7 },
  driver_1_dob:         { page: 0, x: 198, y: 185, maxWidth: 55,  fontSize: 7 },
  driver_1_yrs_exp:     { page: 0, x: 257, y: 185, maxWidth: 18,  fontSize: 7 },
  driver_1_license:     { page: 0, x: 300, y: 185, maxWidth: 95,  fontSize: 7 },
  driver_1_state_lic:   { page: 0, x: 400, y: 185, maxWidth: 22,  fontSize: 7 },

  driver_2_name:        { page: 0, x: 40,  y: 199, maxWidth: 115, fontSize: 7 },
  driver_2_sex:         { page: 0, x: 160, y: 199, maxWidth: 14,  fontSize: 7 },
  driver_2_marital:     { page: 0, x: 177, y: 199, maxWidth: 14,  fontSize: 7 },
  driver_2_dob:         { page: 0, x: 198, y: 199, maxWidth: 55,  fontSize: 7 },
  driver_2_yrs_exp:     { page: 0, x: 257, y: 199, maxWidth: 18,  fontSize: 7 },
  driver_2_license:     { page: 0, x: 300, y: 199, maxWidth: 95,  fontSize: 7 },
  driver_2_state_lic:   { page: 0, x: 400, y: 199, maxWidth: 22,  fontSize: 7 },

  driver_3_name:        { page: 0, x: 40,  y: 213, maxWidth: 115, fontSize: 7 },
  driver_3_dob:         { page: 0, x: 198, y: 213, maxWidth: 55,  fontSize: 7 },
  driver_3_license:     { page: 0, x: 300, y: 213, maxWidth: 95,  fontSize: 7 },

  // ── Page 1 — General Information Y/N (right column, questions 1-7) ──
  veh_not_solely_owned:         { page: 0, x: 594, y: 468, maxWidth: 14, fontSize: 7 },
  over_50pct_employees_auto:    { page: 0, x: 594, y: 499, maxWidth: 14, fontSize: 7 },
  vehicle_maintenance_program:  { page: 0, x: 594, y: 527, maxWidth: 14, fontSize: 7 },
  vehicles_leased_to_others:    { page: 0, x: 594, y: 555, maxWidth: 14, fontSize: 7 },
  modified_special_equipment:   { page: 0, x: 594, y: 583, maxWidth: 14, fontSize: 7 },
  icc_puc_filings:              { page: 0, x: 594, y: 614, maxWidth: 14, fontSize: 7 },
  transporting_hazmat:          { page: 0, x: 594, y: 642, maxWidth: 14, fontSize: 7 },

  // ── Page 2 — General Information continued (questions 8-16) ──
  hold_harmless_agreements:     { page: 1, x: 594, y: 52,  maxWidth: 14, fontSize: 7 },
  family_member_vehicles:       { page: 1, x: 594, y: 95,  maxWidth: 14, fontSize: 7 },
  mvr_verifications:            { page: 1, x: 594, y: 128, maxWidth: 14, fontSize: 7 },
  driver_recruiting_method:     { page: 1, x: 594, y: 160, maxWidth: 14, fontSize: 7 },
  drivers_not_wc:               { page: 1, x: 594, y: 195, maxWidth: 14, fontSize: 7 },
  vehicles_owned_not_scheduled: { page: 1, x: 594, y: 228, maxWidth: 14, fontSize: 7 },
  driver_moving_violations:     { page: 1, x: 594, y: 278, maxWidth: 14, fontSize: 7 },
  agent_inspected_vehicles:     { page: 1, x: 594, y: 380, maxWidth: 14, fontSize: 7 },
  vehicles_fleet:               { page: 1, x: 594, y: 410, maxWidth: 14, fontSize: 7 },

  garage_storage_description:   { page: 1, x: 22,  y: 430, maxWidth: 450, fontSize: 7 },
  max_dollar_storage:           { page: 1, x: 490, y: 430, maxWidth: 80,  fontSize: 7 },

  // Additional interest / certificate recipient
  additional_interest_name:     { page: 1, x: 170, y: 488, maxWidth: 250, fontSize: 7 },
  additional_interest_vehicle:  { page: 1, x: 570, y: 488, maxWidth: 38,  fontSize: 7 },

  // Remarks
  remarks:                      { page: 1, x: 22,  y: 620, maxWidth: 565, fontSize: 7 },

  // ── Page 3 — Vehicle Schedule (row 1) ──
  veh_1_year:           { page: 2, x: 22,  y: 52,  maxWidth: 28,  fontSize: 7 },
  veh_1_make:           { page: 2, x: 55,  y: 52,  maxWidth: 80,  fontSize: 7 },
  veh_1_model:          { page: 2, x: 55,  y: 63,  maxWidth: 80,  fontSize: 7 },
  veh_1_vin:            { page: 2, x: 280, y: 58,  maxWidth: 115, fontSize: 7 },
  veh_1_garaging_address: { page: 2, x: 22, y: 78, maxWidth: 140, fontSize: 7 },
  veh_1_garaging_city:  { page: 2, x: 168, y: 78, maxWidth: 90,  fontSize: 7 },
  veh_1_garaging_state: { page: 2, x: 472, y: 78, maxWidth: 22,  fontSize: 7 },
  veh_1_garaging_zip:   { page: 2, x: 498, y: 78, maxWidth: 40,  fontSize: 7 },
  veh_1_cost_new:       { page: 2, x: 553, y: 95,  maxWidth: 50,  fontSize: 7 },

  // Producer / Signature block (page 3 bottom)
  producer_name:        { page: 2, x: 162, y: 718, maxWidth: 200 },
  producer_license:     { page: 2, x: 575, y: 718, maxWidth: 35  },
  national_producer_num:{ page: 2, x: 480, y: 730, maxWidth: 120 },
  signature_date:       { page: 2, x: 448, y: 730, maxWidth: 80  },
};

// ─── ACORD 130 — Workers Compensation (4 pages) ───
export const ACORD_130_POSITIONS: Record<string, FieldPosition> = {
  // Page 1 — Header
  agency_name:            { page: 0, x: 22, y: 62, maxWidth: 265 },
  insured_name:           { page: 0, x: 312, y: 92, maxWidth: 200 },
  effective_date:         { page: 0, x: 312, y: 108, maxWidth: 140 },
  policy_number:          { page: 0, x: 312, y: 55, maxWidth: 200 },
  state_of_operation:     { page: 0, x: 22, y: 478, maxWidth: 85 },

  // Federal Employer ID
  fein:                   { page: 0, x: 260, y: 238, maxWidth: 150 },

  // Policy Information
  proposed_eff_date:      { page: 0, x: 22, y: 435, maxWidth: 72 },
  proposed_exp_date:      { page: 0, x: 168, y: 435, maxWidth: 72 },

  // Part 2 — Employer's Liability limits
  each_accident_limit:    { page: 0, x: 120, y: 492, maxWidth: 70, fontSize: 7 },
  disease_policy_limit:   { page: 0, x: 120, y: 508, maxWidth: 70, fontSize: 7 },
  disease_each_employee:  { page: 0, x: 120, y: 522, maxWidth: 70, fontSize: 7 },

  // Total Estimated Annual Premium
  total_estimated_premium:{ page: 0, x: 22, y: 602, maxWidth: 120 },

  // Individuals Included/Excluded (bottom of page 1)
  officer_1_name:         { page: 0, x: 82, y: 758, maxWidth: 130, fontSize: 7 },
  officer_1_title:        { page: 0, x: 315, y: 758, maxWidth: 60, fontSize: 7 },
  officer_1_ownership:    { page: 0, x: 382, y: 758, maxWidth: 40, fontSize: 7 },
  class_code_1:           { page: 0, x: 502, y: 758, maxWidth: 40, fontSize: 7 },
  annual_remuneration_1:  { page: 0, x: 555, y: 758, maxWidth: 50, fontSize: 7 },

  mod_rate:               { page: 1, x: 22, y: 100, maxWidth: 60 },
};

// ─── ACORD 131 — Umbrella / Excess (5 pages) ───
export const ACORD_131_POSITIONS: Record<string, FieldPosition> = {
  agency_name:            { page: 0, x: 22, y: 82, maxWidth: 270 },
  insured_name:           { page: 0, x: 342, y: 102, maxWidth: 200 },
  effective_date:         { page: 0, x: 222, y: 102, maxWidth: 80 },
  policy_number:          { page: 0, x: 22, y: 102, maxWidth: 190 },

  // Policy Information — Limit of Liability
  each_occurrence_limit:  { page: 0, x: 480, y: 148, maxWidth: 50 },
  aggregate_limit:        { page: 0, x: 480, y: 165, maxWidth: 50 },
  self_insured_retention: { page: 0, x: 558, y: 148, maxWidth: 40 },
  annual_premium:         { page: 0, x: 558, y: 165, maxWidth: 40 },
};

// ─── ACORD 140 — Property (3 pages) ───
export const ACORD_140_POSITIONS: Record<string, FieldPosition> = {
  agency_name:            { page: 0, x: 22, y: 62, maxWidth: 270 },
  insured_name:           { page: 0, x: 342, y: 85, maxWidth: 200 },
  effective_date:         { page: 0, x: 242, y: 85, maxWidth: 80 },
  policy_number:          { page: 0, x: 22, y: 85, maxWidth: 190 },

  // Construction / Building Info (lower section)
  construction_type:      { page: 0, x: 22, y: 540, maxWidth: 100 },
  year_built:             { page: 0, x: 525, y: 540, maxWidth: 45 },
  num_stories:            { page: 0, x: 445, y: 540, maxWidth: 30 },
  total_area_sq_ft:       { page: 0, x: 570, y: 540, maxWidth: 40 },

  // Subjects of Insurance amounts (premises info section)
  building_amount:        { page: 0, x: 148, y: 210, maxWidth: 70, fontSize: 7 },
  bpp_amount:             { page: 0, x: 148, y: 225, maxWidth: 70, fontSize: 7 },
  business_income_amount: { page: 0, x: 148, y: 240, maxWidth: 70, fontSize: 7 },
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
