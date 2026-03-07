import { useEffect, useState, useCallback } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS, ACORD_INDEX_MAPS, type AcordIndexMap } from "@/lib/acord-field-map";

interface FieldInfo {
  index: number;
  type: "TXT" | "CHK" | "OTHER";
  name: string;
}

/** Try AcroForm first; if 0 fields, attempt to enumerate XFA field names from raw XML */
async function loadFields(path: string): Promise<{ fields: FieldInfo[]; xfaNames: string[] }> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
  const form = doc.getForm();
  const acroFields = form.getFields().map((f, i) => ({
    index: i,
    name: f.getName(),
    type: (f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTHER") as "TXT" | "CHK" | "OTHER",
  }));

  // XFA field name extraction — parse raw PDF bytes looking for XFA XML
  const xfaNames: string[] = [];
  if (acroFields.length === 0) {
    try {
      // Try both UTF-8 and Latin-1 decoding to find XML content
      const rawBytes = new Uint8Array(bytes);
      // Search for XML field name patterns in chunks
      const latin1 = new TextDecoder("latin1").decode(rawBytes);
      const patterns = [
        /<(?:xfa:)?field[^>]+name="([^"]+)"/g,
        /name="([A-Za-z][A-Za-z0-9_\s\-\/()#]+)"/g,
        /\/T\s*\(([^)]+)\)/g,  // PDF AcroForm field name objects
        /\/T\s*<([0-9A-Fa-f]+)>/g, // hex-encoded field names
      ];
      const seen = new Set<string>();
      for (const regex of patterns) {
        let m;
        while ((m = regex.exec(latin1)) !== null) {
          const name = m[1].trim();
          if (name.length > 1 && name.length < 80 && !seen.has(name)) {
            seen.add(name);
            xfaNames.push(name);
          }
        }
      }
    } catch (_) { /* ignore */ }
  }

  return { fields: acroFields, xfaNames };
}

/** Fill using an index map — returns [key, idx, ok, fieldType] */
async function runRealFill(
  path: string,
  indexMap: AcordIndexMap,
  sampleData: Record<string, string>
): Promise<{ key: string; idx: number; ok: boolean; fieldType: string }[]> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const allFields = form.getFields();

  const results: { key: string; idx: number; ok: boolean; fieldType: string }[] = [];
  for (const [key, idx] of Object.entries(indexMap)) {
    const val = sampleData[key];
    if (!val) continue;
    const field = allFields[idx];
    if (!field) { results.push({ key, idx, ok: false, fieldType: "MISSING" }); continue; }
    const ft = field instanceof PDFTextField ? "TXT" : field instanceof PDFCheckBox ? "CHK" : "OTHER";
    try {
      if (field instanceof PDFTextField) { field.setText(val); results.push({ key, idx, ok: true, fieldType: ft }); }
      else { results.push({ key, idx, ok: false, fieldType: ft }); }
    } catch { results.push({ key, idx, ok: false, fieldType: ft }); }
  }
  return results;
}

interface AuditResult {
  key: string;
  idx: number;
  written: string;
  readBack: string;
  match: boolean;
  fieldName: string;
}

/** Round-trip audit: fill PDF → save → reload → read back → compare */
async function runRoundTripAudit(
  path: string,
  indexMap: AcordIndexMap,
  sampleData: Record<string, string>
): Promise<{ results: AuditResult[]; pdfBytes: Uint8Array }> {
  // Step 1: Fill the PDF
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const allFields = form.getFields();

  const writtenValues: { key: string; idx: number; value: string; fieldName: string }[] = [];
  for (const [key, idx] of Object.entries(indexMap)) {
    const val = sampleData[key];
    if (!val) continue;
    const field = allFields[idx];
    if (!field) continue;
    if (field instanceof PDFTextField) {
      try {
        field.setText(val);
        writtenValues.push({ key, idx, value: val, fieldName: field.getName() });
      } catch { /* skip */ }
    }
  }

  // Step 2: Save the filled PDF
  const pdfBytes = await doc.save();

  // Step 3: Reload and read back
  const doc2 = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const form2 = doc2.getForm();
  const allFields2 = form2.getFields();

  const results: AuditResult[] = [];
  for (const w of writtenValues) {
    const field2 = allFields2[w.idx];
    let readBack = "";
    if (field2 instanceof PDFTextField) {
      readBack = field2.getText() ?? "";
    }
    results.push({
      key: w.key,
      idx: w.idx,
      written: w.value,
      readBack,
      match: readBack === w.value,
      fieldName: w.fieldName,
    });
  }

  return { results, pdfBytes };
}

const SAMPLE_DATA: Record<string, string> = {
  // ═══ COMMON HEADER (all forms) ═══
  agency_name: "AURA AGENCY",
  agency_customer_id: "CUST-001",
  carrier: "HARTFORD FIRE INS CO",
  naic_code: "19682",
  policy_number: "POL-2025-001",
  effective_date: "01/01/2026",
  insured_name: "ACME CORPORATION LLC",
  transaction_date: "12/15/2025",
  completion_date: "12/15/2025",

  // ═══ ACORD 125 — Commercial Insurance Application ═══
  // Agency block
  contact_name: "ROBERT JONES",
  agency_phone: "310-555-0100",
  agency_fax: "310-555-0101",
  agency_email: "robert@auraagency.com",
  // Carrier block
  company_program_name: "PREFERRED COMMERCIAL",
  program_code: "PC-100",
  underwriter: "SARAH WILLIAMS",
  underwriter_office: "LOS ANGELES",
  // LOB premiums
  boiler_premium: "1200",
  auto_premium: "8500",
  bop_premium: "3200",
  cgl_premium: "12500",
  inland_marine_premium: "2100",
  property_premium: "9800",
  crime_premium: "1500",
  cyber_premium: "2800",
  garage_premium: "0",
  liquor_premium: "0",
  umbrella_premium: "5000",
  // Policy info
  proposed_eff_date: "01/01/2026",
  proposed_exp_date: "01/01/2027",
  billing_plan: "MONTHLY",
  method_of_payment: "DIRECT BILL",
  audit: "ANNUAL",
  deposit_amount: "5000",
  minimum_premium: "2500",
  policy_premium: "47400",
  // Applicant
  applicant_name: "ACME CORPORATION LLC",
  mailing_address: "123 MAIN ST",
  city: "LOS ANGELES",
  state: "CA",
  zip: "90001",
  gl_code: "58993",
  sic_code: "1521",
  naics_code: "236220",
  fein: "12-3456789",
  business_phone: "310-555-1234",
  website: "www.acmecorp.com",
  llc_members_managers: "3",
  other_named_insured: "ACME HOLDINGS INC",
  // Page 2 — Contacts
  contact_type_1: "OWNER",
  contact_name_1: "JOHN DOE",
  contact_phone_1: "310-555-5678",
  contact_email_1: "john@acmecorp.com",
  // Premises
  premises_loc_number: "001",
  premises_address: "123 MAIN ST",
  premises_city: "LOS ANGELES",
  premises_county: "LOS ANGELES",
  premises_state: "CA",
  premises_zip: "90001",
  full_time_employees: "8",
  part_time_employees: "2",
  annual_revenues: "$1,500,000",
  occupied_sq_ft: "4000",
  open_to_public_area: "2000",
  total_building_sq_ft: "5000",
  premises_description: "GENERAL CONTRACTING OFFICE & WAREHOUSE",
  // Nature of Business
  date_business_started: "03/15/2010",
  description_of_operations: "GENERAL CONTRACTOR — COMMERCIAL AND RESIDENTIAL",
  // Remarks
  remarks: "REQUESTING RENEWAL WITH INCREASED LIMITS",
  // Prior Coverage — Year 1 GL
  prior_year_1: "2025",
  prior_carrier_1: "TRAVELERS",
  prior_policy_number_1: "TRV-2024-999",
  prior_gl_premium_1: "11000",
  prior_eff_date_1: "01/01/2025",
  prior_exp_date_1: "01/01/2026",
  // Prior Coverage — Year 1 Auto/Property/Other
  prior_auto_carrier_1: "PROGRESSIVE",
  prior_auto_policy_1: "AUTO-2024-100",
  prior_auto_premium_1: "7500",
  prior_auto_eff_1: "01/01/2025",
  prior_auto_exp_1: "01/01/2026",
  prior_prop_carrier_1: "HARTFORD",
  prior_prop_policy_1: "PROP-2024-200",
  prior_prop_premium_1: "8200",
  prior_prop_eff_1: "01/01/2025",
  prior_prop_exp_1: "01/01/2026",
  prior_other_lob_1: "UMBRELLA",
  prior_other_carrier_1: "ZURICH",
  prior_other_policy_1: "UMB-2024-300",
  prior_other_premium_1: "4500",
  prior_other_eff_1: "01/01/2025",
  prior_other_exp_1: "01/01/2026",
  // Prior Coverage — Year 2
  p4_agency_customer_id: "CUST-001",
  prior_year_2: "2024",
  prior_carrier_2: "TRAVELERS",
  prior_policy_number_2: "TRV-2023-888",
  prior_gl_premium_2: "10500",
  prior_eff_date_2: "01/01/2024",
  prior_exp_date_2: "01/01/2025",
  prior_auto_carrier_2: "PROGRESSIVE",
  prior_auto_policy_2: "AUTO-2023-100",
  prior_auto_premium_2: "7200",
  prior_auto_eff_2: "01/01/2024",
  prior_auto_exp_2: "01/01/2025",
  prior_prop_carrier_2: "HARTFORD",
  prior_prop_policy_2: "PROP-2023-200",
  prior_prop_premium_2: "7800",
  prior_prop_eff_2: "01/01/2024",
  prior_prop_exp_2: "01/01/2025",
  prior_other_lob_2: "UMBRELLA",
  prior_other_carrier_2: "ZURICH",
  prior_other_policy_2: "UMB-2023-300",
  prior_other_premium_2: "4200",
  prior_other_eff_2: "01/01/2024",
  prior_other_exp_2: "01/01/2025",
  // Prior Coverage — Year 3
  prior_year_3: "2023",
  prior_carrier_3: "TRAVELERS",
  prior_policy_number_3: "TRV-2022-777",
  prior_gl_premium_3: "10000",
  prior_eff_date_3: "01/01/2023",
  prior_exp_date_3: "01/01/2024",
  prior_auto_carrier_3: "PROGRESSIVE",
  prior_auto_policy_3: "AUTO-2022-100",
  prior_auto_premium_3: "6800",
  prior_auto_eff_3: "01/01/2023",
  prior_auto_exp_3: "01/01/2024",
  prior_prop_carrier_3: "HARTFORD",
  prior_prop_policy_3: "PROP-2022-200",
  prior_prop_premium_3: "7500",
  prior_prop_eff_3: "01/01/2023",
  prior_prop_exp_3: "01/01/2024",
  prior_other_carrier_3: "ZURICH",
  prior_other_policy_3: "UMB-2022-300",
  prior_other_premium_3: "4000",
  prior_other_eff_3: "01/01/2023",
  prior_other_exp_3: "01/01/2024",
  // Loss History
  loss_history_years: "5",
  total_losses: "25000",
  loss_date_a: "03/15/2024",
  loss_lob_a: "GL",
  loss_description_a: "SLIP AND FALL — RESOLVED",
  loss_claim_date_a: "03/20/2024",
  loss_paid_a: "15000",
  loss_reserved_a: "0",
  loss_subrogation_a: "N",
  loss_open_a: "CLOSED",
  loss_date_b: "07/10/2023",
  loss_lob_b: "PROPERTY",
  loss_description_b: "WATER DAMAGE — BURST PIPE",
  loss_claim_date_b: "07/12/2023",
  loss_paid_b: "10000",
  loss_reserved_b: "0",
  loss_subrogation_b: "N",
  loss_open_b: "CLOSED",
  // Premises B
  premises_loc_number_b: "002",
  premises_bldg_number_b: "001",
  premises_address_b: "456 OAK AVE",
  premises_city_b: "PASADENA",
  premises_county_b: "LOS ANGELES",
  premises_state_b: "CA",
  premises_zip_b: "91101",
  city_other_desc_b: "",
  interest_other_desc_b: "",
  full_time_employees_b: "4",
  part_time_employees_b: "1",
  annual_revenues_b: "$750,000",
  occupied_sq_ft_b: "2000",
  open_to_public_area_b: "1000",
  total_building_sq_ft_b: "2500",
  premises_description_b: "SATELLITE OFFICE",
  // Nature of Business
  install_repair_work_pct: "60",
  install_repair_offprem_pct: "40",
  operations_description_b: "SUBCONTRACTED ELECTRICAL AND PLUMBING",
  // Business type description
  biz_other_description: "GENERAL CONTRACTOR",
  // Additional Interest
  addl_interest_other_desc: "WAIVER OF SUBROGATION",
  addl_interest_reason: "LEASE REQUIREMENT",
  addl_interest_rank: "1",
  addl_interest_name: "FIRST NATIONAL BANK",
  addl_interest_address: "789 FINANCE BLVD",
  addl_interest_city: "LOS ANGELES",
  addl_interest_state: "CA",
  addl_interest_zip: "90017",
  addl_interest_country: "US",
  addl_interest_account: "ACCT-12345",
  addl_interest_phone: "213-555-9000",
  addl_interest_email: "loans@firstnational.com",
  // General Info Q1-Q15
  p3_agency_customer_id: "CUST-001",
  q1a_code: "N",
  q1b_code: "N",
  q2_code: "Y",
  safety_other_desc: "WEEKLY TOOLBOX TALKS",
  q3_code: "N",
  q4_code: "N",
  q5_code: "N",
  q6_code: "N",
  q7_code: "N",
  q8_code: "N",
  q9_code: "N",
  q10_code: "N",
  q11_code: "N",
  q12_code: "N",
  q13_code: "N",
  q14_code: "N",
  q15_code: "N",
  // Signature
  insured_initials: "JS",
  producer_name: "ROBERT JONES",
  producer_license_no: "0A12345",
  signature_date: "12/15/2025",
  national_producer_number: "NPN-9876543",

  // ═══ ACORD 126 — Commercial General Liability ═══
  deductible_pd: "1000",
  deductible_bi: "1000",
  deductible_applies_1: "PER OCCURRENCE",
  deductible_applies_2: "PER CLAIM",
  general_aggregate: "$2,000,000",
  aggregate_applies_other: "PER PROJECT",
  products_aggregate: "$2,000,000",
  personal_adv_injury: "$1,000,000",
  each_occurrence: "$1,000,000",
  fire_damage: "$100,000",
  medical_payments: "$5,000",
  ebl_limit: "$1,000,000",
  coverage_subtotal: "12000",
  coverage_total: "12500",
  premiums_prem_ops: "8500",
  premiums_products: "3000",
  premiums_other: "1000",
  premiums_total: "12500",
  other_coverages_endorsements: "ADDITIONAL INSURED — BLANKET",
  // Hazard Schedule — Row 1
  hazard_loc_1: "001",
  hazard_bldg_1: "001",
  hazard_code_1: "91302",
  hazard_premium_basis_1: "PAYROLL",
  hazard_exposure_1: "500000",
  hazard_terr_1: "005",
  hazard_rate_premops_1: "1.250",
  hazard_rate_products_1: "0.500",
  hazard_premium_premops_1: "6250",
  hazard_premium_products_1: "2500",
  hazard_classification_1: "CARPENTRY — INTERIOR ONLY",
  // Hazard Schedule — Row 2
  hazard_loc_2: "001",
  hazard_bldg_2: "001",
  hazard_code_2: "91340",
  hazard_premium_basis_2: "PAYROLL",
  hazard_exposure_2: "250000",
  hazard_terr_2: "005",
  hazard_rate_premops_2: "0.900",
  hazard_rate_products_2: "0.350",
  hazard_premium_premops_2: "2250",
  hazard_premium_products_2: "875",
  hazard_classification_2: "PAINTING — INTERIOR",
  // Hazard Schedule — Row 3
  hazard_loc_3: "002",
  hazard_bldg_3: "001",
  hazard_code_3: "91405",
  hazard_premium_basis_3: "RECEIPTS",
  hazard_exposure_3: "750000",
  hazard_terr_3: "005",
  hazard_rate_premops_3: "0.600",
  hazard_rate_products_3: "0.200",
  hazard_premium_premops_3: "4500",
  hazard_premium_products_3: "1500",
  hazard_classification_3: "PLUMBING — COMMERCIAL",
  // Claims-Made
  retroactive_date: "01/01/2020",
  entry_date_claims_made: "01/01/2018",
  claims_made_q1_code: "N",
  claims_made_q2_code: "N",
  // Employee Benefits
  ebl_deductible_per_claim: "1000",
  ebl_num_employees: "10",
  ebl_num_covered: "10",
  // Contractors
  contractors_q1_code: "N",
  contractors_q2_code: "N",
  contractors_q3_code: "N",
  contractors_q4_code: "N",
  contractors_q5_code: "N",
  contractors_q6_code: "N",
  paid_to_subcontractors: "200000",
  pct_work_subcontracted: "30",
  contractors_ft_employees: "8",
  contractors_pt_employees: "2",
  type_work_subcontracted: "ELECTRICAL AND PLUMBING",
  // Products/Completed Operations
  product_name_a: "CUSTOM CABINETRY",
  product_gross_sales_a: "500000",
  product_units_a: "200",
  product_months_market_a: "60",
  product_expected_life_a: "240",
  product_intended_use_a: "RESIDENTIAL KITCHENS",
  product_components_a: "HARDWOOD, HARDWARE, LAMINATE",
  products_q1_code: "Y",
  products_q1_explanation: "INSTALLATION INCLUDED",
  products_q2_code: "N",
  products_q3_code: "N",
  products_q4_code: "N",
  products_q5_code: "N",
  products_q6_code: "N",
  products_q7_code: "N",
  products_q8_code: "N",
  products_q9_code: "N",
  products_q10_code: "N",
  // Additional Interest (126)
  addl_interest_126_other_desc: "LOSS PAYEE",
  addl_interest_126_rank: "1",
  addl_interest_126_name: "FIRST NATIONAL BANK",
  addl_interest_126_address: "789 FINANCE BLVD",
  addl_interest_126_city: "LOS ANGELES",
  addl_interest_126_state: "CA",
  addl_interest_126_zip: "90017",
  addl_interest_126_country: "US",
  addl_interest_126_account: "ACCT-12345",
  addl_interest_126_item_desc: "ALL LOCATIONS",
  // General Info (126)
  gi_q1_code: "N",
  gi_q2_code: "N",
  gi_q3_code: "N",
  gi_q4_code: "N",
  gi_q5_code: "N",
  gi_q6_code: "N",
  gi_q7_code: "N",
  gi_q8_code: "N",
  gi_q9_code: "N",
  gi_q10_code: "N",
  gi_q11_code: "N",
  gi_q12_code: "N",
  gi_q13_code: "N",
  gi_q14_code: "N",
  gi_q15_code: "N",
  gi_q16_code: "N",
  gi_q17_code: "N",
  gi_q18_code: "N",
  gi_q19_code: "N",
  gi_q20_code: "N",
  gi_q21_code: "N",
  gi_q22_code: "N",
  // Remarks & Signature (126)
  remarks_126: "NO ADDITIONAL REMARKS",
  producer_126_name: "ROBERT JONES",
  producer_126_license: "0A12345",
  signature_126_date: "12/15/2025",
  national_producer_126: "NPN-9876543",

  // ═══ ACORD 127 — Business Auto ═══
  // Driver A
  driver_1_id: "A",
  driver_1_first_name: "JOHN",
  driver_1_middle: "A",
  driver_1_last_name: "DOE",
  driver_1_city: "LOS ANGELES",
  driver_1_state: "CA",
  driver_1_zip: "90001",
  driver_1_sex: "M",
  driver_1_marital: "M",
  driver_1_dob: "01/15/1985",
  driver_1_experience: "20",
  driver_1_licensed_year: "2003",
  driver_1_license: "D1234567",
  driver_1_ssn: "XXX-XX-1234",
  driver_1_license_state: "CA",
  driver_1_hired_date: "06/01/2015",
  driver_1_no_fault: "N",
  driver_1_other_car: "N",
  driver_1_vehicle_id: "1",
  driver_1_vehicle_pct: "100",
  // Driver B
  driver_2_id: "B",
  driver_2_first_name: "JANE",
  driver_2_middle: "B",
  driver_2_last_name: "SMITH",
  driver_2_city: "PASADENA",
  driver_2_state: "CA",
  driver_2_zip: "91101",
  driver_2_sex: "F",
  driver_2_marital: "S",
  driver_2_dob: "05/20/1990",
  driver_2_experience: "14",
  driver_2_licensed_year: "2008",
  driver_2_license: "S7654321",
  driver_2_ssn: "XXX-XX-5678",
  driver_2_license_state: "CA",
  driver_2_hired_date: "09/15/2018",
  driver_2_no_fault: "N",
  driver_2_other_car: "N",
  driver_2_vehicle_id: "2",
  driver_2_vehicle_pct: "100",
  // Vehicle A
  vehicle_1_id: "1",
  vehicle_1_year: "2022",
  vehicle_1_make: "FORD",
  vehicle_1_model: "F-150",
  vehicle_1_body_type: "PICKUP",
  vehicle_1_vin: "1FTFW1ET3NFC12345",
  vehicle_1_symbol: "21",
  vehicle_1_comp_symbol: "21",
  vehicle_1_coll_symbol: "21",
  garaging_street: "123 MAIN ST",
  garaging_city: "LOS ANGELES",
  garaging_county: "LOS ANGELES",
  garaging_state: "CA",
  garaging_zip: "90001",
  vehicle_1_reg_state: "CA",
  vehicle_1_territory: "005",
  vehicle_1_gvw: "6500",
  vehicle_1_rate_class: "7341",
  vehicle_1_sic: "1521",
  vehicle_1_liability_factor: "1.00",
  vehicle_1_seating: "3",
  vehicle_1_radius: "50",
  vehicle_1_farthest_zone: "LOCAL",
  vehicle_1_cost_new: "45000",
  vehicle_1_use_other: "BUSINESS",
  vehicle_1_coverage_other: "FULL",
  vehicle_1_agreed_amount: "40000",
  vehicle_1_comp_deductible: "500",
  vehicle_1_coll_deductible: "1000",
  vehicle_1_net_rating: "1.15",
  vehicle_1_premium: "3200",
  // Vehicle B
  vehicle_2_id: "2",
  vehicle_2_year: "2021",
  vehicle_2_make: "CHEVROLET",
  vehicle_2_model: "SILVERADO",
  vehicle_2_body_type: "PICKUP",
  vehicle_2_vin: "3GCUYDED1MG123456",
  vehicle_2_symbol: "22",
  vehicle_2_comp_symbol: "22",
  vehicle_2_coll_symbol: "22",
  vehicle_2_garaging_street: "456 OAK AVE",
  vehicle_2_garaging_city: "PASADENA",
  vehicle_2_garaging_county: "LOS ANGELES",
  vehicle_2_garaging_state: "CA",
  vehicle_2_garaging_zip: "91101",
  vehicle_2_reg_state: "CA",
  vehicle_2_territory: "005",
  vehicle_2_gvw: "7000",
  vehicle_2_rate_class: "7341",
  vehicle_2_sic: "1521",
  vehicle_2_liability_factor: "1.00",
  vehicle_2_seating: "3",
  vehicle_2_radius: "50",
  vehicle_2_farthest_zone: "LOCAL",
  vehicle_2_cost_new: "42000",
  vehicle_2_use_other: "BUSINESS",
  vehicle_2_coverage_other: "FULL",
  vehicle_2_agreed_amount: "37000",
  vehicle_2_comp_deductible: "500",
  vehicle_2_coll_deductible: "1000",
  vehicle_2_net_rating: "1.10",
  vehicle_2_premium: "2900",
  // Questions
  over_50pct_employees_use_autos: "N",
  vehicle_maintenance_program: "Y",
  vehicle_maintenance_explanation: "MONTHLY INSPECTIONS",
  vehicles_leased_to_others: "N",
  modified_special_equipment: "N",
  icc_puc_filings: "N",
  transporting_hazmat: "N",
  hold_harmless_agreements: "N",
  vehicles_used_by_family: "N",
  mvr_verifications: "Y",
  mvr_explanation: "ALL DRIVERS ANNUALLY",
  driver_recruiting_method: "Y",
  driver_recruiting_explanation: "MVR + BACKGROUND CHECK",
  drivers_not_wc: "N",
  vehicles_not_scheduled: "N",
  driver_moving_violations: "N",
  agent_inspected_vehicles: "Y",
  agent_inspected_explanation: "ALL UNITS INSPECTED Q4 2025",
  fleet_monitoring: "Y",
  fleet_monitoring_device: "GPS",
  fleet_monitored_pct: "100",
  garage_storage_description: "FENCED LOT WITH SECURITY CAMERAS",
  max_dollar_value_at_risk: "250000",
  auto_remarks: "FLEET IN GOOD CONDITION — NO CLAIMS IN 3 YEARS",
  auto_general_remarks: "ALL DRIVERS CDL QUALIFIED",
  p2_agency_customer_id: "CUST-001",

  // ═══ ACORD 130 — Workers Compensation ═══
  agency_address_line1: "500 INSURANCE BLVD",
  agency_address_line2: "SUITE 200",
  agency_city: "LOS ANGELES",
  agency_state: "CA",
  agency_zip: "90017",
  agency_mobile: "310-555-0102",
  cs_representative: "MARY JOHNSON",
  producer_id: "PROD-001",
  sub_producer_id: "SUB-001",
  applicant_phone: "310-555-1234",
  applicant_mobile: "310-555-1235",
  mailing_address_line2: "SUITE 100",
  years_in_business: "15",
  applicant_email: "info@acmecorp.com",
  entity_other_description: "MULTI-MEMBER LLC",
  credit_bureau_name: "D&B",
  credit_bureau_id: "DB-123456",
  ncci_risk_id: "NR-789012",
  rating_bureau_id: "RB-345678",
  proposed_eff_date_130: "01/01/2026",
  payment_plan: "QUARTERLY",
  down_payment_percent: "25",
  audit_frequency: "ANNUAL",
  // Locations
  location_id_a: "001",
  location_floors_a: "2",
  location_address_a: "123 MAIN ST",
  location_address2_a: "BLDG A",
  location_city_a: "LOS ANGELES",
  location_county_a: "LOS ANGELES",
  location_state_a: "CA",
  location_zip_a: "90001",
  location_id_b: "002",
  location_floors_b: "1",
  location_address_b: "456 OAK AVE",
  location_address2_b: "",
  location_city_b: "PASADENA",
  location_county_b: "LOS ANGELES",
  location_state_b: "CA",
  location_zip_b: "91101",
  // Policy dates (proposed_exp_date shared with 125)
  anniversary_rating_date: "01/01/2026",
  retrospective_rating_plan: "NONE",
  // WC Part 1 States
  wc_part1_states: "CA",
  wc_part1_state_b: "NV",
  wc_each_accident: "$1,000,000",
  wc_disease_policy_limit: "$1,000,000",
  wc_disease_each_employee: "$1,000,000",
  deductible_other_desc: "NONE",
  additional_endorsements: "BLANKET WAIVER OF SUBROGATION",
  total_estimated_premium: "35000",
  total_minimum_premium: "15000",
  total_deposit_premium: "8750",
  // Officers
  officer_1_state: "CA",
  officer_1_location: "001",
  officer_1_name: "JANE SMITH",
  officer_1_dob: "03/15/1975",
  officer_1_title: "PRESIDENT",
  officer_1_ownership: "60%",
  officer_1_duties: "MANAGEMENT",
  officer_1_inc_exc: "INCLUDED",
  officer_1_class_code: "8810",
  officer_1_remuneration: "150000",
  officer_2_state: "CA",
  officer_2_location: "001",
  officer_2_name: "MIKE JOHNSON",
  officer_2_dob: "07/22/1980",
  officer_2_title: "VP OPERATIONS",
  officer_2_ownership: "40%",
  officer_2_duties: "OPERATIONS MANAGEMENT",
  officer_2_inc_exc: "INCLUDED",
  officer_2_class_code: "8810",
  officer_2_remuneration: "120000",
  // Rate State / Class Codes
  page2_customer_id: "CUST-001",
  rate_state_page_num: "1",
  rate_state_total_pages: "1",
  rating_state: "CA",
  class_loc_a: "001",
  class_code_1: "5403",
  class_description_1: "CARPENTRY",
  class_duties_1: "FRAMING AND FINISH CARPENTRY",
  class_sic_a: "1751",
  class_naics_a: "238350",
  annual_remuneration_1: "250000",
  rate_1: "8.75",
  est_premium_1: "21875",
  class_loc_b: "001",
  class_code_2: "5474",
  class_description_2: "PAINTING",
  class_duties_2: "INTERIOR AND EXTERIOR PAINTING",
  num_employees_2: "3",
  part_time_employees_2: "1",
  annual_remuneration_2: "120000",
  rate_2: "4.50",
  est_premium_2: "5400",
  // State Coverage Modifiers
  state_coverage_state: "CA",
  total_factored_premium: "27275",
  experience_mod: "0.95",
  experience_prem: "25911",
  state_total_est_premium: "35000",
  state_minimum_premium: "15000",
  state_deposit_premium: "8750",
  state_remarks: "GOOD LOSS EXPERIENCE",
  // Prior Coverage
  page3_customer_id: "CUST-001",
  prior_year_1_130: "2025",
  prior_wc_carrier_1: "TRAVELERS",
  prior_wc_policy_1: "WC-TRV-2024",
  prior_wc_premium_1: "32000",
  prior_mod_1: "0.98",
  prior_claims_1: "1",
  prior_paid_1: "5000",
  prior_reserved_1: "0",
  // Questions
  q_aircraft_watercraft_code: "N",
  q_hazardous_material_code: "N",
  q_underground_above15_code: "N",
  q_other_business_code: "N",
  q_subcontractors_code: "Y",
  q_subcontractors_expl: "ELECTRICAL AND PLUMBING SUBS",
  q_sublet_no_certs_code: "N",
  q_safety_program_code: "Y",
  q_safety_program_expl: "OSHA COMPLIANT SAFETY PROGRAM",
  q_group_transport_code: "N",
  q_under16_over60_code: "N",
  q_seasonal_employees_code: "N",
  q_volunteer_labor_code: "N",
  q_physicals_code: "Y",
  q_physicals_expl: "PRE-EMPLOYMENT PHYSICALS REQUIRED",
  q_other_insurance_code: "N",
  q_declined_cancelled_code: "N",
  q_lease_employees_code: "N",
  q_tax_liens_code: "N",
  q_unpaid_premium_code: "N",
  // Signature
  page4_customer_id: "CUST-001",
  insured_signature: "JANE SMITH",

  // ═══ ACORD 131 — Umbrella / Excess ═══
  transaction_type_other: "RENEWAL",
  expiring_policy_number: "UMB-2024-555",
  proposed_retroactive_date: "01/01/2020",
  current_retroactive_date: "01/01/2020",
  each_occurrence_limit: "$5,000,000",
  aggregate_limit: "$5,000,000",
  other_coverage_limit: "$1,000,000",
  other_coverage_description: "EMPLOYEE BENEFITS",
  retained_limit_occurrence: "10000",
  first_dollar_defense: "YES",
  // EBL
  ebl_each_employee: "$1,000,000",
  ebl_aggregate: "$1,000,000",
  ebl_retained_limit: "10000",
  ebl_retroactive_date: "01/01/2020",
  benefit_program_name: "ACME EMPLOYEE BENEFITS",
  // Location A
  location_id_a_131: "001",
  location_name_a: "ACME MAIN OFFICE",
  location_address_a_131: "123 MAIN ST",
  location_city_a_131: "LOS ANGELES",
  location_state_a_131: "CA",
  location_zip_a_131: "90001",
  operations_description_a: "GENERAL CONTRACTING OPERATIONS",
  total_payroll_a: "500000",
  annual_gross_receipts_a: "1500000",
  foreign_gross_sales_a: "0",
  employee_count_a: "10",
  // Underlying Insurance — Auto
  underlying_auto_carrier: "PROGRESSIVE",
  underlying_auto_policy_number: "AUTO-2025-100",
  underlying_auto_eff_date: "01/01/2026",
  underlying_auto_exp_date: "01/01/2027",
  underlying_auto_csl: "1000000",
  underlying_auto_bi_ea_acc: "500000",
  underlying_auto_bi_ea_per: "500000",
  underlying_auto_pd: "500000",
  underlying_auto_csl_premium: "4500",
  underlying_auto_bi_premium: "3200",
  underlying_auto_pd_premium: "1800",
  underlying_auto_mod_factor: "1.00",
  // Underlying Insurance — GL
  underlying_gl_carrier: "HARTFORD",
  underlying_gl_policy_number: "GL-2025-200",
  underlying_gl_eff_date: "01/01/2026",
  underlying_gl_exp_date: "01/01/2027",
  underlying_gl_occurrence: "$1,000,000",
  underlying_gl_aggregate: "$2,000,000",
  underlying_gl_products: "$2,000,000",
  underlying_gl_personal: "$1,000,000",
  underlying_gl_fire_damage: "$100,000",
  underlying_gl_med_expense: "$5,000",
  underlying_gl_prem_ops_premium: "8500",
  underlying_gl_products_premium: "3000",
  underlying_gl_other_premium: "1000",
  underlying_gl_mod_factor: "1.00",
  // Underlying Insurance — Employers Liability
  underlying_el_carrier: "TRAVELERS",
  underlying_el_policy_number: "WC-2025-300",
  underlying_el_eff_date: "01/01/2026",
  underlying_el_exp_date: "01/01/2027",
  underlying_el_each_accident: "$1,000,000",
  underlying_el_disease_employee: "$1,000,000",
  underlying_el_disease_policy: "$1,000,000",
  underlying_el_premium: "3500",
  underlying_el_mod_factor: "0.95",
  // Loss History
  // loss_date_a etc. defined in ACORD 125 section above
  // Questions
  p2_agency_customer_id_131: "CUST-001",
  gl_form_edition_date: "2013",
  q_excluded_uninsured_code: "N",
  umbrella_remarks: "CLEAN LOSS HISTORY — RENEWAL REQUESTED",
  // Fleet schedule (sample entries)
  fleet_pp_owned: "5",
  fleet_pp_local: "5",
  fleet_lt_owned: "3",
  fleet_lt_local: "3",
  // Page 3 Questions
  p3_agency_customer_id_131: "CUST-001",
  q_aircraft_code: "N",
  q_explosives_code: "N",
  q_passengers_fee_code: "N",
  q_units_not_insured_code: "N",
  q_vehicles_leased_code: "N",
  q_hired_nonowned_code: "Y",
  q_hired_nonowned_explanation: "OCCASIONAL RENTAL VEHICLES",
  q_cranes_code: "N",
  q_subcontractors_code_131: "Y",
  q_subcontractors_explanation: "ELECTRICAL AND PLUMBING",
  q_self_insured_code: "N",
  // Page 4
  p4_agency_customer_id_131: "CUST-001",
  q_hazardous_materials_code: "N",
  q_product_loss_code: "N",
  // Page 5 Signature
  p5_agency_customer_id: "CUST-001",
  uninsured_motorists_limit: "1000000",
  underinsured_motorists_limit: "1000000",
  medical_payments_limit: "5000",
  initials_a: "JS",
  initials_b: "JS",
  initials_c: "JS",
  initials_d: "JS",
  initials_e: "JS",
  producer_signature: "ROBERT JONES",

  // ═══ ACORD 140 — Property Section ═══
  // (premises_city/state/zip shared with 125)
  building_street_address: "123 MAIN ST",
  building_description: "2-STORY OFFICE AND WAREHOUSE",
  building_amount: "$2,000,000",
  building_valuation: "REPLACEMENT COST",
  building_causes_of_loss: "SPECIAL",
  building_deductible: "5000",
  bpp_amount: "$500,000",
  bpp_valuation: "REPLACEMENT COST",
  bpp_causes_of_loss: "SPECIAL",
  bpp_deductible: "2500",
  business_income_amount: "500000",
  extra_expense_amount: "100000",
  rental_value_amount: "50000",
  construction_type: "FRAME",
  num_stories: "2",
  year_built: "1995",
  total_area_sq_ft: "5000",
  distance_to_hydrant: "500 FT",
  protection_class: "4",
  roof_type: "COMPOSITION SHINGLE",
  wiring_year: "2010",
  plumbing_year: "2008",
  roofing_year: "2018",
  heating_year: "2015",
  num_guards_watchmen: "1",
  sprinkler_pct: "100%",
  fire_alarm_type: "CENTRAL STATION",
  property_remarks: "FULLY SPRINKLERED — RECENTLY UPDATED ROOF",

  // ═══ ACORD 75 — Cyber / Privacy ═══
  total_employees: "10",
  each_occurrence_limit_75: "$1,000,000",
  aggregate_limit_75: "$2,000,000",
};

export default function PdfDiagnostic() {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [xfaNames, setXfaNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string>("acord-127");
  const [search, setSearch] = useState("");
  const [formCounts, setFormCounts] = useState<Record<string, number>>({});
  const [fillResults, setFillResults] = useState<{ key: string; idx: number; ok: boolean; fieldType: string }[]>([]);
  const [layoutView, setLayoutView] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [auditPdfUrl, setAuditPdfUrl] = useState<string | null>(null);

  const formIds = Object.keys(FILLABLE_PDF_PATHS);

  useEffect(() => {
    async function loadCounts() {
      const counts: Record<string, number> = {};
      for (const [id, path] of Object.entries(FILLABLE_PDF_PATHS)) {
        try {
          const { fields: f, xfaNames: x } = await loadFields(path);
          counts[id] = f.length > 0 ? f.length : x.length > 0 ? -(x.length) : -1;
        } catch { counts[id] = -1; }
      }
      setFormCounts(counts);
    }
    loadCounts();
  }, []);

  useEffect(() => {
    setFields([]);
    setXfaNames([]);
    setFillResults([]);
    setAuditResults([]);
    if (auditPdfUrl) URL.revokeObjectURL(auditPdfUrl);
    setAuditPdfUrl(null);
    setLayoutView(false);
    setLoading(true);
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) { setLoading(false); return; }
    loadFields(path).then(({ fields: f, xfaNames: x }) => {
      setFields(f);
      setXfaNames(x);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedForm]);

  const applyRealData = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    const indexMap = ACORD_INDEX_MAPS[selectedForm];
    if (!path || !indexMap) { alert("No index map for " + selectedForm); return; }
    setLoading(true);
    const results = await runRealFill(path, indexMap, SAMPLE_DATA);
    setFillResults(results);
    setLoading(false);
  }, [selectedForm]);

  /** Round-trip audit: fill → save → reload → read back → compare */
  const runAudit = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    const indexMap = ACORD_INDEX_MAPS[selectedForm];
    if (!path || !indexMap) { alert("No index map for " + selectedForm); return; }
    setLoading(true);
    setAuditResults([]);
    if (auditPdfUrl) URL.revokeObjectURL(auditPdfUrl);
    setAuditPdfUrl(null);
    try {
      const { results, pdfBytes } = await runRoundTripAudit(path, indexMap, SAMPLE_DATA);
      setAuditResults(results);
      // Create downloadable/viewable URL for the filled PDF
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setAuditPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error("Audit failed:", e);
      alert("Audit failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  }, [selectedForm, auditPdfUrl]);


  const fillAllAndDownload = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) return;
    const resp = await fetch(path);
    const bytes = await resp.arrayBuffer();
    const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
    const form = doc.getForm();
    const allFields = form.getFields();
    allFields.forEach((f, i) => {
      if (f instanceof PDFTextField) {
        try { f.setText(`[${i}]`); } catch {}
      } else if (f instanceof PDFCheckBox) {
        try { f.check(); } catch {}
      }
    });
    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedForm}-FILLED-INDICES.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedForm, fields]);

  /** Download a plain-text file listing all field indices, types, and names */
  const downloadTxtList = useCallback(() => {
    const lines = fields.map(f => `[${f.index}] ${f.type} "${f.name}"`);
    const text = `${selectedForm} — ${fields.length} fields\nTXT: ${fields.filter(f=>f.type==="TXT").length} | CHK: ${fields.filter(f=>f.type==="CHK").length}\n${"─".repeat(60)}\n${lines.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedForm}-field-list.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedForm, fields]);

  const filtered = search
    ? fields.filter(f => String(f.index).includes(search) || f.type.toLowerCase().includes(search.toLowerCase()))
    : fields;

  const currentIndexMap = ACORD_INDEX_MAPS[selectedForm];
  const txtFields = fields.filter(f => f.type === "TXT");
  const chkFields = fields.filter(f => f.type === "CHK");
  const passed = fillResults.filter(r => r.ok).length;
  const failed = fillResults.filter(r => !r.ok);

  // Generate compact layout string for copying
  const layoutSummary = fields.map(f => `[${f.index}] ${f.type}`).join("\n");

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", fontSize: 12, background: "#0f172a", color: "#e2e8f0" }}>
      {/* Left panel */}
      <div style={{ width: 460, overflowY: "auto", borderRight: "1px solid #334155", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: 14, margin: "0 0 6px", color: "#f1f5f9" }}>ACORD Field Mapper — Diagnostic</h2>

        {/* Form tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {formIds.map(id => (
            <button key={id} onClick={() => setSelectedForm(id)}
              style={{ padding: "4px 8px", fontSize: 11, background: id === selectedForm ? "#2563eb" : "#1e293b",
                color: id === selectedForm ? "white" : "#94a3b8",
                border: id === selectedForm ? "1px solid #3b82f6" : "1px solid #334155",
                borderRadius: 4, cursor: "pointer" }}>
              {id.replace("acord-", "")} <span style={{ opacity: 0.7 }}>({formCounts[id] ?? "…"})</span>
            </button>
          ))}
        </div>

        {/* Stats bar */}
        {fields.length > 0 && (
          <div style={{ background: "#1e293b", borderRadius: 6, padding: "6px 10px", fontSize: 11, display: "flex", gap: 16 }}>
            <span>Total: <strong style={{ color: "#f1f5f9" }}>{fields.length}</strong></span>
            <span>TXT: <strong style={{ color: "#60a5fa" }}>{txtFields.length}</strong></span>
            <span>CHK: <strong style={{ color: "#a78bfa" }}>{chkFields.length}</strong></span>
            <span>Mapped: <strong style={{ color: "#4ade80" }}>{currentIndexMap ? Object.keys(currentIndexMap).length : 0}</strong></span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={applyRealData} disabled={loading || !currentIndexMap}
            style={{ flex: 1, padding: "6px 10px", fontSize: 12, background: "#16a34a",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "Running…" : "✅ Run Real Data Fill"}
          </button>
          <button onClick={runAudit} disabled={loading || !currentIndexMap}
            style={{ flex: 1, padding: "6px 10px", fontSize: 12, background: "#dc2626",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "Auditing…" : "🔍 Round-Trip Audit"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={fillAllAndDownload} disabled={loading}
            style={{ padding: "6px 10px", fontSize: 11, background: "#d97706",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            📥 Fill All TXT
          </button>
          <button onClick={downloadTxtList} disabled={loading || fields.length === 0}
            style={{ padding: "6px 10px", fontSize: 11, background: "#0ea5e9",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            📄 TXT List
          </button>
          {auditPdfUrl && (
            <a href={auditPdfUrl} download={`${selectedForm}-AUDIT-FILLED.pdf`}
              style={{ padding: "6px 10px", fontSize: 11, background: "#7c3aed",
                color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold",
                textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              📄 Download Filled PDF
            </a>
          )}
          <button onClick={() => setLayoutView(v => !v)}
            style={{ padding: "6px 10px", fontSize: 11, background: layoutView ? "#7c3aed" : "#334155",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
            📋 Layout
          </button>
        </div>

        {/* Audit results */}
        {auditResults.length > 0 && (
          <div style={{ background: "#1a0a0a", border: `1px solid ${auditResults.every(r=>r.match) ? "#4ade80" : "#f87171"}`, borderRadius: 6, padding: 8, maxHeight: 300, overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 6,
              color: auditResults.every(r=>r.match) ? "#4ade80" : "#f87171" }}>
              🔍 Round-Trip Audit: {auditResults.filter(r=>r.match).length}/{auditResults.length} fields match
              {auditResults.some(r=>!r.match) && ` — ${auditResults.filter(r=>!r.match).length} MISMATCHES`}
            </div>
            {auditResults.filter(r=>!r.match).length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: "#f87171", fontWeight: "bold", marginBottom: 3 }}>❌ MISMATCHES:</div>
                {auditResults.filter(r=>!r.match).map(r => (
                  <div key={r.key} style={{ fontSize: 10, color: "#f87171", lineHeight: "16px", marginBottom: 2 }}>
                    <span style={{ color: "#64748b" }}>[{r.idx}]</span>{" "}
                    <strong>{r.key}</strong>{" "}
                    wrote="{r.written}" → read="{r.readBack || "(empty)"}"
                    <span style={{ color: "#64748b", fontSize: 9 }}> ({r.fieldName})</span>
                  </div>
                ))}
              </div>
            )}
            {auditResults.filter(r=>r.match).length > 0 && (
              <details>
                <summary style={{ fontSize: 10, color: "#4ade80", cursor: "pointer" }}>
                  ✅ {auditResults.filter(r=>r.match).length} matching fields
                </summary>
                {auditResults.filter(r=>r.match).map(r => (
                  <div key={r.key} style={{ fontSize: 10, color: "#86efac", lineHeight: "14px" }}>
                    <span style={{ color: "#64748b" }}>[{r.idx}]</span> {r.key} = "{r.written}"
                  </div>
                ))}
              </details>
            )}
          </div>
        )}

        {/* Fill results */}
        {fillResults.length > 0 && (
          <div style={{ background: "#0f2211", border: `1px solid ${failed.length === 0 ? "#4ade80" : "#f87171"}`, borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, color: failed.length === 0 ? "#4ade80" : "#f87171", marginBottom: 6 }}>
              {passed}/{fillResults.length} fields filled ({Math.round(passed/fillResults.length*100)}%)
            </div>
            {fillResults.map(r => (
              <div key={r.key} style={{ fontSize: 10, color: r.ok ? "#86efac" : "#f87171", display: "flex", gap: 6, lineHeight: "16px" }}>
                <span style={{ minWidth: 14 }}>{r.ok ? "✓" : "✗"}</span>
                <span style={{ minWidth: 26, color: "#64748b" }}>[{r.idx}]</span>
                <span style={{ color: r.ok ? "#e2e8f0" : "#f87171", flex: 1 }}>{r.key}</span>
                {!r.ok && <span style={{ color: "#f59e0b", fontSize: 9 }}>{r.fieldType}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Current index map */}
        {currentIndexMap && (
          <div style={{ background: "#1a1a2e", border: "1px solid #fde047", borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: "#fde047", marginBottom: 4 }}>
              Index Map ({Object.keys(currentIndexMap).length} keys)
            </div>
            {Object.entries(currentIndexMap).map(([key, idx]) => {
              const fieldType = fields[idx]?.type ?? "?";
              const expectedType = key.startsWith("chk_") ? "CHK" : "TXT";
              const isCorrect = fieldType === expectedType;
              return (
                <div key={key} style={{ fontSize: 10, display: "flex", gap: 6, lineHeight: "15px" }}>
                  <span style={{ color: "#64748b", minWidth: 26 }}>[{idx}]</span>
                  <span style={{ color: isCorrect ? "#86efac" : "#f87171", minWidth: 28, fontSize: 9 }}>{fieldType}</span>
                  <span style={{ color: "#e2e8f0" }}>{key}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Layout view */}
        {layoutView && (
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: 8, maxHeight: 300, overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
              Full field layout (TXT only shown first)
            </div>
            {txtFields.map(f => (
              <div key={f.index} style={{ fontSize: 10, color: "#60a5fa", lineHeight: "14px" }}>
                [{f.index}] TXT
              </div>
            ))}
          </div>
        )}

        {/* Field list with type filter */}
        <div style={{ display: "flex", gap: 4 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by index or TXT/CHK…"
            style={{ flex: 1, padding: "4px 6px", background: "#1e293b", border: "1px solid #334155",
              borderRadius: 4, fontSize: 11, color: "#e2e8f0" }} />
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{filtered.length} / {fields.length} fields</div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {filtered.map(f => {
            const isMapped = currentIndexMap && Object.values(currentIndexMap).includes(f.index);
            const mappedKeyForType = currentIndexMap
              ? Object.entries(currentIndexMap).find(([, v]) => v === f.index)?.[0]
              : undefined;
            const expectedType = mappedKeyForType?.startsWith("chk_") ? "CHK" : "TXT";
            const isWrongType = isMapped && f.type !== expectedType;
            return (
              <div key={f.index} style={{
                padding: "1px 4px", fontSize: 10, borderBottom: "1px solid #1e293b",
                background: isWrongType ? "#2d0f0f" : isMapped ? "#0f2211" : "transparent",
                display: "flex", gap: 6, alignItems: "center"
              }}>
                <span style={{ color: "#475569", minWidth: 30 }}>[{f.index}]</span>
                <span style={{ color: f.type === "TXT" ? "#60a5fa" : "#a78bfa", minWidth: 28 }}>{f.type}</span>
                {isMapped && <span style={{ color: isWrongType ? "#f87171" : "#4ade80", fontSize: 9 }}>{isWrongType ? "⚠" : "✓"}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel — TXT-only compact layout for reference */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#0f172a" }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
          <strong style={{ color: "#f1f5f9" }}>TXT field indices for {selectedForm}</strong>
          {" — "}use these to build the index map. Green = already mapped, red = mapped to wrong type.
        </div>

        {fields.length > 0 && (
          <>
            {/* Compact grid of TXT fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 4, marginBottom: 24 }}>
              {fields.map(f => {
                const isMapped = currentIndexMap && Object.values(currentIndexMap).includes(f.index);
                const mappedKeyForGrid = currentIndexMap
                  ? Object.entries(currentIndexMap).find(([, v]) => v === f.index)?.[0]
                  : undefined;
                const expectedTypeGrid = mappedKeyForGrid?.startsWith("chk_") ? "CHK" : "TXT";
                const isWrongType = isMapped && f.type !== expectedTypeGrid;
                const mappedKey = currentIndexMap
                  ? Object.entries(currentIndexMap).find(([, v]) => v === f.index)?.[0]
                  : undefined;
                return (
                  <div key={f.index} style={{
                    padding: "4px 6px", borderRadius: 4, fontSize: 10,
                    background: isWrongType ? "#2d0f0f"
                      : isMapped && f.type === "TXT" ? "#0f2211"
                      : f.type === "TXT" ? "#1e293b"
                      : "#160a29",
                    border: isWrongType ? "1px solid #f87171"
                      : isMapped && f.type === "TXT" ? "1px solid #4ade80"
                      : f.type === "TXT" ? "1px solid #334155"
                      : "1px solid #2d1f4a",
                  }}>
                    <div style={{ color: f.type === "TXT" ? "#60a5fa" : "#a78bfa", fontWeight: "bold" }}>
                      [{f.index}] {f.type}
                    </div>
                    {mappedKey && (
                      <div style={{ color: isWrongType ? "#f87171" : "#4ade80", fontSize: 9, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mappedKey}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TXT-only list for easy copy */}
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8 }}>TXT fields only (for index map building):</div>
            <div style={{ background: "#1e293b", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 10, lineHeight: "18px" }}>
              {txtFields.map(f => {
                const mappedKey = currentIndexMap
                  ? Object.entries(currentIndexMap).find(([, v]) => v === f.index)?.[0]
                  : undefined;
                return (
                  <div key={f.index} style={{ color: mappedKey ? "#4ade80" : "#94a3b8" }}>
                    <span style={{ color: "#60a5fa" }}>[{f.index}]</span>
                    {mappedKey ? ` → ${mappedKey}` : " → (unmapped)"}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* XFA-only PDF: show discovered field names */}
        {fields.length === 0 && xfaNames.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: "#fbbf24", fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>
              ⚠ XFA-only PDF — {xfaNames.length} field names found in XML. AcroForm index mapping not applicable.
            </div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>
              These are the XFA field names. Use them for name-based matching only.
            </div>
            <div style={{ background: "#1e293b", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 10, lineHeight: "18px", maxHeight: 600, overflowY: "auto" }}>
              {xfaNames.map((name, i) => (
                <div key={i} style={{ color: "#94a3b8" }}>
                  <span style={{ color: "#60a5fa", minWidth: 30, display: "inline-block" }}>[{i}]</span>
                  {" "}{name}
                </div>
              ))}
            </div>
          </div>
        )}

        {fields.length === 0 && xfaNames.length === 0 && !loading && (
          <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>
            No AcroForm fields found and no XFA XML detected. PDF may be corrupt or unsupported.
          </div>
        )}

        {loading && (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Loading fields…</div>
        )}
      </div>
    </div>
  );
}
