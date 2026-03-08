// ACORD form field definitions — updated to match 2016/2010 edition PDFs

export type AcordFormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "number" | "currency";
  options?: string[];
  required?: boolean;
  section: string;
  default?: string;
};

export type AcordFormDefinition = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  fields: AcordFormField[];
  pages?: string[]; // paths to page images in /public/acord-pages/
};

// ============================================================
// ACORD 125 (2016/03) — Commercial Insurance Application
// ============================================================
const acord125Fields: AcordFormField[] = [
  // Agency Information
  { key: "agency_name", label: "Agency", type: "text", section: "Agency Information", required: true },
  { key: "agency_phone", label: "Phone (A/C, No, Ext)", type: "text", section: "Agency Information" },
  { key: "agency_fax", label: "Fax (A/C, No)", type: "text", section: "Agency Information" },
  { key: "agency_email", label: "E-Mail Address", type: "text", section: "Agency Information" },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Agency Information" },
  { key: "carrier", label: "Carrier", type: "text", section: "Agency Information" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Agency Information" },
  { key: "company_program_name", label: "Company / Policy or Program Name", type: "text", section: "Agency Information" },
  { key: "program_code", label: "Program Code", type: "text", section: "Agency Information" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Agency Information" },
  { key: "contact_name", label: "Contact Name", type: "text", section: "Agency Information" },
  { key: "underwriter", label: "Underwriter", type: "text", section: "Agency Information" },
  { key: "underwriter_office", label: "Underwriter Office", type: "text", section: "Agency Information" },
  { key: "transaction_type", label: "Transaction Type", type: "select", options: ["Quote", "Issue Policy", "Renew", "Cancel"], section: "Agency Information" },
  { key: "transaction_date", label: "Date", type: "date", section: "Agency Information" },

  // Lines of Business
  { key: "lob_commercial_general_liability", label: "Commercial General Liability", type: "checkbox", section: "Lines of Business" },
  { key: "cgl_premium", label: "CGL Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_commercial_property", label: "Commercial Property", type: "checkbox", section: "Lines of Business" },
  { key: "property_premium", label: "Property Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_business_auto", label: "Business Auto", type: "checkbox", section: "Lines of Business" },
  { key: "auto_premium", label: "Business Auto Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_umbrella", label: "Umbrella", type: "checkbox", section: "Lines of Business" },
  { key: "umbrella_premium", label: "Umbrella Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_crime", label: "Crime", type: "checkbox", section: "Lines of Business" },
  { key: "crime_premium", label: "Crime Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_cyber", label: "Cyber and Privacy", type: "checkbox", section: "Lines of Business" },
  { key: "cyber_premium", label: "Cyber and Privacy Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_inland_marine", label: "Commercial Inland Marine", type: "checkbox", section: "Lines of Business" },
  { key: "inland_marine_premium", label: "Inland Marine Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_boiler_machinery", label: "Boiler & Machinery", type: "checkbox", section: "Lines of Business" },
  { key: "boiler_premium", label: "Boiler & Machinery Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_bop", label: "Business Owners", type: "checkbox", section: "Lines of Business" },
  { key: "bop_premium", label: "BOP Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_garage", label: "Garage and Dealers", type: "checkbox", section: "Lines of Business" },
  { key: "garage_premium", label: "Garage Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_liquor_liability", label: "Liquor Liability", type: "checkbox", section: "Lines of Business" },
  { key: "liquor_premium", label: "Liquor Liability Premium", type: "currency", section: "Lines of Business" },
  { key: "lob_other", label: "Other Line of Business", type: "checkbox", section: "Lines of Business" },
  { key: "other_lob_description", label: "Other LOB Description", type: "text", section: "Lines of Business" },
  { key: "other_lob_premium", label: "Other LOB Premium", type: "currency", section: "Lines of Business" },

  // Policy Information
  { key: "proposed_eff_date", label: "Proposed Effective Date", type: "date", section: "Policy Information", required: true },
  { key: "proposed_exp_date", label: "Proposed Expiration Date", type: "date", section: "Policy Information", required: true },
  { key: "billing_plan", label: "Billing Plan", type: "select", options: ["Direct", "Agency"], section: "Policy Information" },
  { key: "payment_plan", label: "Payment Plan", type: "select", options: ["Annual", "Semi-Annual", "Quarterly", "Monthly"], section: "Policy Information" },
  { key: "method_of_payment", label: "Method of Payment", type: "select", options: ["Check", "EFT", "Credit Card", "Premium Finance"], section: "Policy Information" },
  { key: "audit", label: "Audit", type: "select", options: ["Annual", "Semi-Annual", "Quarterly", "Monthly", "N/A"], section: "Policy Information" },
  { key: "deposit_amount", label: "Deposit", type: "currency", section: "Policy Information" },
  { key: "minimum_premium", label: "Minimum Premium", type: "currency", section: "Policy Information" },
  { key: "policy_premium", label: "Policy Premium", type: "currency", section: "Policy Information" },

  // Applicant Information
  { key: "applicant_name", label: "Name (First Named Insured)", type: "text", section: "Applicant Information", required: true },
  { key: "mailing_address", label: "Mailing Address (including ZIP+4)", type: "text", section: "Applicant Information", required: true },
  { key: "city", label: "City", type: "text", section: "Applicant Information", required: true },
  { key: "state", label: "State", type: "text", section: "Applicant Information", required: true },
  { key: "zip", label: "ZIP Code", type: "text", section: "Applicant Information", required: true },
  { key: "gl_code", label: "GL Code", type: "text", section: "Applicant Information" },
  { key: "sic_code", label: "SIC", type: "text", section: "Applicant Information" },
  { key: "naics_code", label: "NAICS", type: "text", section: "Applicant Information" },
  { key: "fein", label: "FEIN or SOC SEC #", type: "text", section: "Applicant Information", required: true },
  { key: "business_phone", label: "Business Phone #", type: "text", section: "Applicant Information" },
  { key: "website", label: "Website Address", type: "text", section: "Applicant Information" },
  { key: "business_type", label: "Business Type", type: "select", options: ["Corporation", "Individual", "LLC", "Joint Venture", "Partnership", "Not For Profit Org", "Subchapter S Corporation", "Trust"], section: "Applicant Information", required: true },
  { key: "llc_members_managers", label: "LLC No. of Members and Managers", type: "text", section: "Applicant Information" },

  // Other Named Insured
  { key: "other_named_insured", label: "Other Named Insured & Address", type: "textarea", section: "Other Named Insured" },
  { key: "other_insured_gl_code", label: "Other Insured GL Code", type: "text", section: "Other Named Insured" },
  { key: "other_insured_sic", label: "Other Insured SIC", type: "text", section: "Other Named Insured" },
  { key: "other_insured_naics", label: "Other Insured NAICS", type: "text", section: "Other Named Insured" },
  { key: "other_insured_fein", label: "Other Insured FEIN", type: "text", section: "Other Named Insured" },

  // Contact Information
  { key: "contact_type_1", label: "Contact Type", type: "text", section: "Contact Information" },
  { key: "contact_name_1", label: "Contact Name", type: "text", section: "Contact Information" },
  { key: "contact_phone_1", label: "Primary Phone #", type: "text", section: "Contact Information" },
  { key: "contact_email_1", label: "Primary E-Mail Address", type: "text", section: "Contact Information" },

  // Premises Information
  { key: "premises_loc_number", label: "LOC #", type: "text", section: "Premises Information" },
  { key: "premises_address", label: "Street Address", type: "text", section: "Premises Information" },
  { key: "premises_city", label: "City", type: "text", section: "Premises Information" },
  { key: "premises_county", label: "County", type: "text", section: "Premises Information" },
  { key: "premises_state", label: "State", type: "text", section: "Premises Information" },
  { key: "premises_zip", label: "ZIP", type: "text", section: "Premises Information" },
  { key: "premises_interest", label: "Interest", type: "select", options: ["Owner", "Tenant"], section: "Premises Information" },
  { key: "full_time_employees", label: "# Full Time Employees", type: "number", section: "Premises Information" },
  { key: "part_time_employees", label: "# Part Time Employees", type: "number", section: "Premises Information" },
  { key: "premises_description", label: "Description of Operations", type: "textarea", section: "Premises Information" },

  // Nature of Business
  { key: "nature_of_business", label: "Nature of Business", type: "text", section: "Nature of Business" },
  { key: "annual_revenues", label: "Annual Revenues", type: "currency", section: "Nature of Business", required: true },
  { key: "occupied_sq_ft", label: "Occupied Area (Sq Ft)", type: "number", section: "Nature of Business" },
  { key: "open_to_public_area", label: "Open to Public Area (Sq Ft)", type: "number", section: "Nature of Business" },
  { key: "total_building_sq_ft", label: "Total Building Area (Sq Ft)", type: "number", section: "Nature of Business" },
  { key: "area_leased_to_others", label: "Any Area Leased to Others?", type: "select", options: ["Yes", "No"], section: "Nature of Business" },
  { key: "business_category", label: "Business Category", type: "select", options: ["Apartments", "Condominiums", "Contractor", "Institutional", "Manufacturing", "Office", "Restaurant", "Retail", "Service", "Wholesale"], section: "Nature of Business" },
  { key: "date_business_started", label: "Date Business Started", type: "date", section: "Nature of Business" },
  { key: "description_of_operations", label: "Description of Primary Operations", type: "textarea", section: "Nature of Business", required: true },

  // General Information
  { key: "subsidiary_of_another", label: "1a. Is applicant a subsidiary of another entity?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "parent_company_name", label: "Parent Company Name", type: "text", section: "General Information" },
  { key: "has_subsidiaries", label: "1b. Does applicant have any subsidiaries?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "safety_program", label: "2. Formal safety program in operation?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "safety_manual", label: "Safety Manual", type: "checkbox", section: "General Information" },
  { key: "safety_position", label: "Safety Position", type: "checkbox", section: "General Information" },
  { key: "monthly_meetings", label: "Monthly Meetings", type: "checkbox", section: "General Information" },
  { key: "osha_compliance", label: "OSHA", type: "checkbox", section: "General Information" },
  { key: "exposure_flammables", label: "3. Exposure to flammables, explosives, chemicals?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "other_insurance_same_company", label: "4. Any other insurance with this company?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "q4_lob_a", label: "Q4 LOB A", type: "text", section: "General Information" },
  { key: "q4_policy_a", label: "Q4 Policy # A", type: "text", section: "General Information" },
  { key: "q4_lob_b", label: "Q4 LOB B", type: "text", section: "General Information" },
  { key: "q4_policy_b", label: "Q4 Policy # B", type: "text", section: "General Information" },
  { key: "q4_lob_c", label: "Q4 LOB C", type: "text", section: "General Information" },
  { key: "q4_policy_c", label: "Q4 Policy # C", type: "text", section: "General Information" },
  { key: "q4_lob_d", label: "Q4 LOB D", type: "text", section: "General Information" },
  { key: "q4_policy_d", label: "Q4 Policy # D", type: "text", section: "General Information" },
  { key: "policy_declined_cancelled", label: "5. Policy declined, cancelled or non-renewed in prior 3 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "past_sexual_abuse_claims", label: "6. Past losses re: sexual abuse, discrimination, negligent hiring?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "fraud_conviction", label: "7. Applicant convicted of fraud, bribery, arson in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "fire_safety_violations", label: "8. Any uncorrected fire/safety code violations?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "bankruptcy", label: "9. Foreclosure, repossession, or bankruptcy in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "judgement_or_lien", label: "10. Judgement or lien in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "business_in_trust", label: "11. Has business been placed in a trust?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "trust_name", label: "Name of Trust", type: "text", section: "General Information" },
  { key: "foreign_operations", label: "12. Any foreign operations or foreign products?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "other_business_ventures", label: "13. Other business ventures not requesting coverage?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "operates_drones", label: "14. Does applicant own/lease/operate any drones?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "hires_drone_operators", label: "15. Does applicant hire others to operate drones?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "general_info_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Information" },

  // Remarks
  { key: "remarks", label: "Remarks / Processing Instructions", type: "textarea", section: "Remarks" },

  // Prior Carrier Information — GL column
  { key: "prior_year_1", label: "Prior Year 1", type: "text", section: "Prior Carrier Information" },
  { key: "prior_carrier_1", label: "Prior GL Carrier", type: "text", section: "Prior Carrier Information" },
  { key: "prior_policy_number_1", label: "Prior GL Policy #", type: "text", section: "Prior Carrier Information" },
  { key: "prior_gl_premium_1", label: "Prior GL Premium", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_eff_date_1", label: "Prior GL Eff Date", type: "date", section: "Prior Carrier Information" },
  { key: "prior_exp_date_1", label: "Prior GL Exp Date", type: "date", section: "Prior Carrier Information" },
  // Prior Carrier Information — Auto column
  { key: "prior_auto_carrier_1", label: "Prior Auto Carrier", type: "text", section: "Prior Carrier Information" },
  { key: "prior_auto_policy_1", label: "Prior Auto Policy #", type: "text", section: "Prior Carrier Information" },
  { key: "prior_auto_premium_1", label: "Prior Auto Premium", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_auto_eff_1", label: "Prior Auto Eff Date", type: "date", section: "Prior Carrier Information" },
  { key: "prior_auto_exp_1", label: "Prior Auto Exp Date", type: "date", section: "Prior Carrier Information" },
  // Prior Carrier Information — Property column
  { key: "prior_prop_carrier_1", label: "Prior Property Carrier", type: "text", section: "Prior Carrier Information" },
  { key: "prior_prop_policy_1", label: "Prior Property Policy #", type: "text", section: "Prior Carrier Information" },
  { key: "prior_prop_premium_1", label: "Prior Property Premium", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_prop_eff_1", label: "Prior Property Eff Date", type: "date", section: "Prior Carrier Information" },
  { key: "prior_prop_exp_1", label: "Prior Property Exp Date", type: "date", section: "Prior Carrier Information" },
  // Prior Carrier Information — Other LOB column (Umbrella/WC)
  { key: "prior_other_lob_1", label: "Prior Other LOB", type: "text", section: "Prior Carrier Information" },
  { key: "prior_other_carrier_1", label: "Prior Other Carrier", type: "text", section: "Prior Carrier Information" },
  { key: "prior_other_policy_1", label: "Prior Other Policy #", type: "text", section: "Prior Carrier Information" },
  { key: "prior_other_premium_1", label: "Prior Other Premium", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_other_eff_1", label: "Prior Other Eff Date", type: "date", section: "Prior Carrier Information" },
  { key: "prior_other_exp_1", label: "Prior Other Exp Date", type: "date", section: "Prior Carrier Information" },
  // Prior Carrier Information — Row 2 (for second Other LOB e.g. WC when Umbrella takes Row 1)
  { key: "prior_other_lob_2", label: "Prior Other LOB (Row 2)", type: "text", section: "Prior Carrier Information" },
  { key: "prior_other_carrier_2", label: "Prior Other Carrier (Row 2)", type: "text", section: "Prior Carrier Information" },
  { key: "prior_other_policy_2", label: "Prior Other Policy # (Row 2)", type: "text", section: "Prior Carrier Information" },
  { key: "prior_other_premium_2", label: "Prior Other Premium (Row 2)", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_other_eff_2", label: "Prior Other Eff Date (Row 2)", type: "date", section: "Prior Carrier Information" },
  { key: "prior_other_exp_2", label: "Prior Other Exp Date (Row 2)", type: "date", section: "Prior Carrier Information" },

  // Loss History
  { key: "no_losses", label: "No losses to report", type: "checkbox", section: "Loss History" },
  { key: "loss_history_years", label: "Loss History (# years)", type: "text", section: "Loss History" },
  { key: "total_losses", label: "Total Losses", type: "currency", section: "Loss History" },
  { key: "loss_history", label: "Loss History Details", type: "textarea", section: "Loss History" },

  // Signature
  { key: "producer_name", label: "Producer's Name", type: "text", section: "Signature" },
  { key: "producer_license_no", label: "State Producer License No.", type: "text", section: "Signature" },
  { key: "national_producer_number", label: "National Producer Number", type: "text", section: "Signature" },
  { key: "signature_date", label: "Date", type: "date", section: "Signature" },
];

// ============================================================
// ACORD 126 (2009/08) — Commercial General Liability Section
// ============================================================
const acord126Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },
  { key: "insured_name", label: "Applicant / First Named Insured", type: "text", section: "Header", required: true },
  { key: "transaction_date", label: "Date (MM/DD/YYYY)", type: "date", section: "Header" },

  // Coverage Checkboxes
  { key: "chk_commercial_general_liability", label: "Commercial General Liability", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_claims_made", label: "Claims Made", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_occurrence", label: "Occurrence", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_owners_contractors", label: "Owner's & Contractor's Protective", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_limit_policy", label: "Limit Applies Per: Policy", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_limit_location", label: "Limit Applies Per: Location", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_limit_project", label: "Limit Applies Per: Project", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_limit_other", label: "Limit Applies Per: Other", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_deductible_pd", label: "Deductible: Property Damage", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_deductible_bi", label: "Deductible: Bodily Injury", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_per_claim", label: "Deductible: Per Claim", type: "checkbox", section: "Coverages / Limits" },
  { key: "chk_per_occurrence", label: "Deductible: Per Occurrence", type: "checkbox", section: "Coverages / Limits" },

  // Coverages / Limits
  { key: "coverage_type", label: "Coverage Type", type: "select", options: ["Occurrence", "Claims-Made"], section: "Coverages / Limits", required: true },
  { key: "general_aggregate", label: "General Aggregate", type: "currency", section: "Coverages / Limits", required: true },
  { key: "aggregate_applies_per", label: "Limit Applies Per", type: "select", options: ["Policy", "Location", "Premises/Operations", "Owner's & Contractor's Protective", "Project", "Other"], section: "Coverages / Limits" },
  { key: "products_aggregate", label: "Products & Completed Ops Aggregate", type: "currency", section: "Coverages / Limits" },
  { key: "personal_adv_injury", label: "Personal & Advertising Injury", type: "currency", section: "Coverages / Limits" },
  { key: "each_occurrence", label: "Each Occurrence", type: "currency", section: "Coverages / Limits", required: true },
  { key: "fire_damage", label: "Damage to Rented Premises (each occurrence)", type: "currency", section: "Coverages / Limits" },
  { key: "medical_payments", label: "Medical Expense (any one person)", type: "currency", section: "Coverages / Limits" },
  { key: "ebl_limit", label: "Employee Benefits", type: "currency", section: "Coverages / Limits" },
  { key: "deductible_pd", label: "Deductible - Property Damage", type: "currency", section: "Coverages / Limits" },
  { key: "deductible_bi", label: "Deductible - Bodily Injury", type: "currency", section: "Coverages / Limits" },
  { key: "premiums_prem_ops", label: "Premiums - Premises/Operations", type: "currency", section: "Coverages / Limits" },
  { key: "premiums_products", label: "Premiums - Products", type: "currency", section: "Coverages / Limits" },
  { key: "premiums_other", label: "Premiums - Other", type: "currency", section: "Coverages / Limits" },
  { key: "premiums_total", label: "Premiums - Total", type: "currency", section: "Coverages / Limits" },

  // Other Coverages
  { key: "other_coverages_endorsements", label: "Other Coverages, Restrictions and/or Endorsements", type: "textarea", section: "Other Coverages" },

  // Schedule of Hazards
  { key: "hazard_loc_1", label: "LOC # (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_haz_1", label: "HAZ # (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_classification_1", label: "Classification (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_code_1", label: "Class Code (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_premium_basis_1", label: "Premium Basis (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_exposure_1", label: "Exposure (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_terr_1", label: "Territory (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_rate_premops_1", label: "Rate Prem/Ops (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_rate_products_1", label: "Rate Products (1)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_premium_premops_1", label: "Premium Prem/Ops (1)", type: "currency", section: "Schedule of Hazards" },
  { key: "hazard_premium_products_1", label: "Premium Products (1)", type: "currency", section: "Schedule of Hazards" },
  { key: "hazard_loc_2", label: "LOC # (2)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_haz_2", label: "HAZ # (2)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_classification_2", label: "Classification (2)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_code_2", label: "Class Code (2)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_premium_basis_2", label: "Premium Basis (2)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_exposure_2", label: "Exposure (2)", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_premium_premops_2", label: "Premium Prem/Ops (2)", type: "currency", section: "Schedule of Hazards" },
  { key: "hazard_premium_products_2", label: "Premium Products (2)", type: "currency", section: "Schedule of Hazards" },

  // Claims-Made
  { key: "retroactive_date", label: "1. Proposed Retroactive Date", type: "date", section: "Claims-Made" },
  { key: "entry_date_claims_made", label: "2. Entry Date into Uninterrupted Claims-Made Coverage", type: "date", section: "Claims-Made" },
  { key: "excluded_from_previous", label: "3. Product/work/accident excluded from previous coverage?", type: "select", options: ["Yes", "No"], section: "Claims-Made" },
  { key: "tail_coverage_purchased", label: "4. Tail coverage purchased under previous policy?", type: "select", options: ["Yes", "No"], section: "Claims-Made" },

  // Employee Benefits Liability
  { key: "ebl_deductible_per_claim", label: "1. Deductible Per Claim", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_num_employees", label: "2. Number of Employees", type: "number", section: "Employee Benefits Liability" },
  { key: "ebl_covered_employees", label: "3. Employees Covered by Benefit Plans", type: "number", section: "Employee Benefits Liability" },
  { key: "ebl_retroactive_date", label: "4. Retroactive Date", type: "date", section: "Employee Benefits Liability" },

  // Contractors
  { key: "draws_plans_for_others", label: "1. Applicant draw plans/designs/specifications for others?", type: "select", options: ["Yes", "No"], section: "Contractors", default: "No" },
  { key: "blasting_explosives", label: "2. Operations include blasting or explosive material?", type: "select", options: ["Yes", "No"], section: "Contractors", default: "No" },
  { key: "excavation_underground", label: "3. Operations include excavation, tunneling, underground work?", type: "select", options: ["Yes", "No"], section: "Contractors", default: "No" },
  { key: "subs_less_coverage", label: "4. Subcontractors carry less coverage/limits than yours?", type: "select", options: ["Yes", "No"], section: "Contractors", default: "No" },
  { key: "subs_without_coi", label: "5. Subcontractors allowed to work without COI?", type: "select", options: ["Yes", "No"], section: "Contractors", default: "No" },
  { key: "leases_equipment", label: "6. Applicant lease equipment to others?", type: "select", options: ["Yes", "No"], section: "Contractors", default: "No" },
  { key: "type_work_subcontracted", label: "Type of Work Subcontracted", type: "textarea", section: "Contractors" },
  { key: "paid_to_subcontractors", label: "$ Paid to Subcontractors", type: "currency", section: "Contractors" },
  { key: "pct_work_subcontracted", label: "% of Work Subcontracted", type: "text", section: "Contractors" },
  { key: "contractor_full_time", label: "# Full-Time Staff", type: "number", section: "Contractors" },
  { key: "contractor_part_time", label: "# Part-Time Staff", type: "number", section: "Contractors" },

  // Products / Completed Operations
  { key: "installs_services_products", label: "1. Applicant install, service or demonstrate products?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "foreign_products_sold", label: "2. Foreign products sold/distributed/used as components?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "rd_new_products", label: "3. R&D conducted or new products planned?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "guarantees_warranties", label: "4. Guarantees, warranties, hold harmless agreements?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "aircraft_space_products", label: "5. Products related to aircraft/space industry?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "products_recalled", label: "6. Products recalled, discontinued, changed?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "products_others_label", label: "7. Products of others sold/re-packaged under applicant label?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "products_under_others_label", label: "8. Products under label of others?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "vendors_coverage_required", label: "9. Vendors coverage required?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "named_insured_sells_to_named", label: "10. Named insured sells to other named insureds?", type: "select", options: ["Yes", "No"], section: "Products / Completed Operations", default: "No" },
  { key: "products_annual_gross_sales", label: "Annual Gross Sales", type: "currency", section: "Products / Completed Operations" },
  { key: "products_num_units", label: "# of Units", type: "text", section: "Products / Completed Operations" },
  { key: "products_time_in_market", label: "Time in Market", type: "text", section: "Products / Completed Operations" },
  { key: "products_expected_life", label: "Expected Life", type: "text", section: "Products / Completed Operations" },
  { key: "products_intended_use", label: "Intended Use", type: "text", section: "Products / Completed Operations" },
  { key: "products_principal_components", label: "Principal Components", type: "text", section: "Products / Completed Operations" },

  // Additional Interest / Certificate Recipient
  { key: "add_interest_type_1", label: "Interest Type (1)", type: "text", section: "Additional Interest" },
  { key: "add_interest_name_1", label: "Name and Address (1)", type: "text", section: "Additional Interest" },
  { key: "add_interest_rank_1", label: "Rank (1)", type: "text", section: "Additional Interest" },
  { key: "add_interest_item_1", label: "Interest in Item Number (1)", type: "text", section: "Additional Interest" },

  // General Information (Page 3)
  { key: "medical_facilities", label: "1. Any medical facilities provided or professionals employed?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "radioactive_exposure", label: "2. Exposure to radioactive/nuclear materials?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "hazardous_material_ops", label: "3. Operations involve hazardous material?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "ops_sold_acquired", label: "4. Operations sold, acquired, or discontinued in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "rent_equipment_to_others", label: "5. Machinery or equipment loaned/rented to others?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "watercraft_docks", label: "6. Watercraft, docks, floats owned, hired or leased?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "parking_facilities", label: "7. Parking facilities owned/rented?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "parking_fee_charged", label: "8. Is a fee charged for parking?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "recreation_facilities", label: "9. Recreation facilities provided?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "swimming_pool", label: "10. Swimming pool on premises?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "social_events", label: "11. Sporting or social events sponsored?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "structural_alterations", label: "12. Structural alterations contemplated?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "demolition_exposure", label: "13. Demolition exposure contemplated?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "joint_ventures", label: "14. Active in joint ventures?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "lease_employees", label: "15. Lease employees to or from other employers?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },

  // General Information Continued (Page 4)
  { key: "labor_interchange", label: "1. Labor interchange with other business/subsidiaries?", type: "select", options: ["Yes", "No"], section: "General Information (cont.)", default: "No" },
  { key: "day_care_facilities", label: "2. Day care facilities operated or controlled?", type: "select", options: ["Yes", "No"], section: "General Information (cont.)", default: "No" },
  { key: "crimes_on_premises", label: "3. Crimes occurred/attempted on premises in last 3 years?", type: "select", options: ["Yes", "No"], section: "General Information (cont.)", default: "No" },
  { key: "safety_security_policy", label: "4. Formal written safety and security policy?", type: "select", options: ["Yes", "No"], section: "General Information (cont.)", default: "No" },
  { key: "safety_claims_in_literature", label: "5. Promotional literature makes safety/security claims?", type: "select", options: ["Yes", "No"], section: "General Information (cont.)", default: "No" },
  { key: "general_questions_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Information (cont.)" },

  // Remarks
  { key: "remarks_126", label: "Remarks", type: "textarea", section: "Remarks" },
];

// ============================================================
// ACORD 127 (2010/05) — Business Auto Section
// ============================================================
const acord127Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },
  { key: "insured_name", label: "Named Insured(s)", type: "text", section: "Header", required: true },

  // Driver Information
  { key: "driver_1_name", label: "Driver 1 Name", type: "text", section: "Driver Information" },
  { key: "driver_1_first_name", label: "Driver 1 First Name", type: "text", section: "Driver Information" },
  { key: "driver_1_last_name", label: "Driver 1 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_1_sex", label: "Driver 1 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_1_marital", label: "Driver 1 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_1_dob", label: "Driver 1 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_1_license", label: "Driver 1 License #", type: "text", section: "Driver Information" },
  { key: "driver_1_license_state", label: "Driver 1 License State", type: "text", section: "Driver Information" },
  { key: "driver_2_name", label: "Driver 2 Name", type: "text", section: "Driver Information" },
  { key: "driver_2_first_name", label: "Driver 2 First Name", type: "text", section: "Driver Information" },
  { key: "driver_2_last_name", label: "Driver 2 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_2_sex", label: "Driver 2 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_2_marital", label: "Driver 2 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_2_dob", label: "Driver 2 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_2_license", label: "Driver 2 License #", type: "text", section: "Driver Information" },
  { key: "driver_2_license_state", label: "Driver 2 License State", type: "text", section: "Driver Information" },

  // General Information
  { key: "vehicles_not_solely_owned", label: "1. Any vehicles not solely owned by applicant?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "over_50pct_employees_use_autos", label: "2. Over 50% of employees use autos in business?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "vehicle_maintenance_program", label: "3. Vehicle maintenance program in operation?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "vehicles_leased_to_others", label: "4. Any vehicles leased to others?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "modified_vehicles", label: "5. Any car modified / special equipment?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "icc_puc_filings", label: "6. ICC, PUC or other filings required?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "transporting_hazmat", label: "7. Operations involve transporting hazardous material?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "hold_harmless_agreements", label: "8. Any hold harmless agreements?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "vehicles_used_by_family", label: "9. Any vehicles used by family members?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "mvr_verifications", label: "10. Does applicant obtain MVR verifications?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "driver_recruiting_method", label: "11. Specific driver recruiting method?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "drivers_no_wc", label: "12. Any drivers not covered by Workers Compensation?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "vehicles_not_scheduled", label: "13. Vehicles owned but not scheduled?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "drivers_with_violations", label: "14. Drivers with moving traffic violations?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "agent_inspected_vehicles", label: "15. Has agent inspected vehicles?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "all_vehicles_in_fleet", label: "16. All vehicles part of a fleet?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "auto_general_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Information" },

  // Garage / Storage
  { key: "garage_storage_description", label: "Description of Garage / Storage Locations", type: "textarea", section: "Garage / Storage" },
  { key: "max_dollar_value_at_risk", label: "Maximum Dollar Value Subject to Loss", type: "currency", section: "Garage / Storage" },

  // Vehicle Description — Vehicle 1
  { key: "vehicle_1_year", label: "Vehicle 1 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_1_make", label: "Vehicle 1 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_1_model", label: "Vehicle 1 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_1_body_type", label: "Vehicle 1 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_1_vin", label: "Vehicle 1 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_1_cost_new", label: "Vehicle 1 Cost New", type: "currency", section: "Vehicle Description" },
  { key: "vehicle_1_type", label: "Vehicle 1 Type", type: "select", options: ["PP", "Spec", "Coml"], section: "Vehicle Description" },
  // Vehicle 2
  { key: "vehicle_2_year", label: "Vehicle 2 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_2_make", label: "Vehicle 2 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_2_model", label: "Vehicle 2 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_2_body_type", label: "Vehicle 2 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_2_vin", label: "Vehicle 2 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_2_cost_new", label: "Vehicle 2 Cost New", type: "currency", section: "Vehicle Description" },
  // Vehicle 3
  { key: "vehicle_3_year", label: "Vehicle 3 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_3_make", label: "Vehicle 3 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_3_model", label: "Vehicle 3 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_3_body_type", label: "Vehicle 3 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_3_vin", label: "Vehicle 3 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_3_cost_new", label: "Vehicle 3 Cost New", type: "currency", section: "Vehicle Description" },
  // Vehicle 4
  { key: "vehicle_4_year", label: "Vehicle 4 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_4_make", label: "Vehicle 4 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_4_model", label: "Vehicle 4 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_4_body_type", label: "Vehicle 4 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_4_vin", label: "Vehicle 4 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_4_cost_new", label: "Vehicle 4 Cost New", type: "currency", section: "Vehicle Description" },
  // Vehicle 5
  { key: "vehicle_5_year", label: "Vehicle 5 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_5_make", label: "Vehicle 5 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_5_model", label: "Vehicle 5 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_5_body_type", label: "Vehicle 5 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_5_vin", label: "Vehicle 5 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_5_cost_new", label: "Vehicle 5 Cost New", type: "currency", section: "Vehicle Description" },
  // Vehicle 6
  { key: "vehicle_6_year", label: "Vehicle 6 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_6_make", label: "Vehicle 6 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_6_model", label: "Vehicle 6 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_6_body_type", label: "Vehicle 6 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_6_vin", label: "Vehicle 6 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_6_cost_new", label: "Vehicle 6 Cost New", type: "currency", section: "Vehicle Description" },
  // Vehicle 7
  { key: "vehicle_7_year", label: "Vehicle 7 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_7_make", label: "Vehicle 7 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_7_model", label: "Vehicle 7 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_7_body_type", label: "Vehicle 7 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_7_vin", label: "Vehicle 7 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_7_cost_new", label: "Vehicle 7 Cost New", type: "currency", section: "Vehicle Description" },
  // Vehicle 8
  { key: "vehicle_8_year", label: "Vehicle 8 Year", type: "text", section: "Vehicle Description" },
  { key: "vehicle_8_make", label: "Vehicle 8 Make", type: "text", section: "Vehicle Description" },
  { key: "vehicle_8_model", label: "Vehicle 8 Model", type: "text", section: "Vehicle Description" },
  { key: "vehicle_8_body_type", label: "Vehicle 8 Body Type", type: "text", section: "Vehicle Description" },
  { key: "vehicle_8_vin", label: "Vehicle 8 V.I.N.", type: "text", section: "Vehicle Description" },
  { key: "vehicle_8_cost_new", label: "Vehicle 8 Cost New", type: "currency", section: "Vehicle Description" },

  // Garaging Address
  { key: "garaging_street", label: "Garaging Street", type: "text", section: "Garaging Address" },
  { key: "garaging_city", label: "Garaging City", type: "text", section: "Garaging Address" },
  { key: "garaging_county", label: "Garaging County", type: "text", section: "Garaging Address" },
  { key: "garaging_state", label: "Garaging State", type: "text", section: "Garaging Address" },
  { key: "garaging_zip", label: "Garaging ZIP", type: "text", section: "Garaging Address" },

  // Vehicle Use / Class
  { key: "vehicle_1_radius", label: "Vehicle 1 Radius (miles)", type: "text", section: "Vehicle Use" },
  { key: "vehicle_1_class", label: "Vehicle 1 Class", type: "text", section: "Vehicle Use" },
  { key: "vehicle_1_sic", label: "Vehicle 1 SIC", type: "text", section: "Vehicle Use" },
  { key: "vehicle_1_gvw", label: "Vehicle 1 GVW / GCW", type: "text", section: "Vehicle Use" },

  // Additional driver fields (3-6)
  { key: "driver_3_name", label: "Driver 3 Name", type: "text", section: "Driver Information" },
  { key: "driver_3_first_name", label: "Driver 3 First Name", type: "text", section: "Driver Information" },
  { key: "driver_3_last_name", label: "Driver 3 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_3_sex", label: "Driver 3 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_3_marital", label: "Driver 3 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_3_dob", label: "Driver 3 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_3_license", label: "Driver 3 License #", type: "text", section: "Driver Information" },
  { key: "driver_3_license_state", label: "Driver 3 License State", type: "text", section: "Driver Information" },
  { key: "driver_4_name", label: "Driver 4 Name", type: "text", section: "Driver Information" },
  { key: "driver_4_first_name", label: "Driver 4 First Name", type: "text", section: "Driver Information" },
  { key: "driver_4_last_name", label: "Driver 4 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_4_sex", label: "Driver 4 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_4_marital", label: "Driver 4 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_4_dob", label: "Driver 4 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_4_license", label: "Driver 4 License #", type: "text", section: "Driver Information" },
  { key: "driver_4_license_state", label: "Driver 4 License State", type: "text", section: "Driver Information" },
  { key: "driver_5_name", label: "Driver 5 Name", type: "text", section: "Driver Information" },
  { key: "driver_5_first_name", label: "Driver 5 First Name", type: "text", section: "Driver Information" },
  { key: "driver_5_last_name", label: "Driver 5 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_5_sex", label: "Driver 5 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_5_marital", label: "Driver 5 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_5_dob", label: "Driver 5 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_5_license", label: "Driver 5 License #", type: "text", section: "Driver Information" },
  { key: "driver_5_license_state", label: "Driver 5 License State", type: "text", section: "Driver Information" },
  { key: "driver_6_name", label: "Driver 6 Name", type: "text", section: "Driver Information" },
  { key: "driver_6_first_name", label: "Driver 6 First Name", type: "text", section: "Driver Information" },
  { key: "driver_6_last_name", label: "Driver 6 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_6_sex", label: "Driver 6 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_6_marital", label: "Driver 6 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_6_dob", label: "Driver 6 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_6_license", label: "Driver 6 License #", type: "text", section: "Driver Information" },
  { key: "driver_6_license_state", label: "Driver 6 License State", type: "text", section: "Driver Information" },
  { key: "driver_7_name", label: "Driver 7 Name", type: "text", section: "Driver Information" },
  { key: "driver_7_first_name", label: "Driver 7 First Name", type: "text", section: "Driver Information" },
  { key: "driver_7_last_name", label: "Driver 7 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_7_sex", label: "Driver 7 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_7_marital", label: "Driver 7 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_7_dob", label: "Driver 7 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_7_license", label: "Driver 7 License #", type: "text", section: "Driver Information" },
  { key: "driver_7_license_state", label: "Driver 7 License State", type: "text", section: "Driver Information" },
  { key: "driver_8_name", label: "Driver 8 Name", type: "text", section: "Driver Information" },
  { key: "driver_8_first_name", label: "Driver 8 First Name", type: "text", section: "Driver Information" },
  { key: "driver_8_last_name", label: "Driver 8 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_8_sex", label: "Driver 8 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_8_marital", label: "Driver 8 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_8_dob", label: "Driver 8 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_8_license", label: "Driver 8 License #", type: "text", section: "Driver Information" },
  { key: "driver_8_license_state", label: "Driver 8 License State", type: "text", section: "Driver Information" },
  { key: "driver_9_name", label: "Driver 9 Name", type: "text", section: "Driver Information" },
  { key: "driver_9_first_name", label: "Driver 9 First Name", type: "text", section: "Driver Information" },
  { key: "driver_9_last_name", label: "Driver 9 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_9_sex", label: "Driver 9 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_9_marital", label: "Driver 9 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_9_dob", label: "Driver 9 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_9_license", label: "Driver 9 License #", type: "text", section: "Driver Information" },
  { key: "driver_9_license_state", label: "Driver 9 License State", type: "text", section: "Driver Information" },
  { key: "driver_10_name", label: "Driver 10 Name", type: "text", section: "Driver Information" },
  { key: "driver_10_first_name", label: "Driver 10 First Name", type: "text", section: "Driver Information" },
  { key: "driver_10_last_name", label: "Driver 10 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_10_sex", label: "Driver 10 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_10_marital", label: "Driver 10 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_10_dob", label: "Driver 10 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_10_license", label: "Driver 10 License #", type: "text", section: "Driver Information" },
  { key: "driver_10_license_state", label: "Driver 10 License State", type: "text", section: "Driver Information" },
  { key: "driver_11_name", label: "Driver 11 Name", type: "text", section: "Driver Information" },
  { key: "driver_11_first_name", label: "Driver 11 First Name", type: "text", section: "Driver Information" },
  { key: "driver_11_last_name", label: "Driver 11 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_11_sex", label: "Driver 11 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_11_marital", label: "Driver 11 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_11_dob", label: "Driver 11 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_11_license", label: "Driver 11 License #", type: "text", section: "Driver Information" },
  { key: "driver_11_license_state", label: "Driver 11 License State", type: "text", section: "Driver Information" },
  { key: "driver_12_name", label: "Driver 12 Name", type: "text", section: "Driver Information" },
  { key: "driver_12_first_name", label: "Driver 12 First Name", type: "text", section: "Driver Information" },
  { key: "driver_12_last_name", label: "Driver 12 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_12_sex", label: "Driver 12 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_12_marital", label: "Driver 12 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_12_dob", label: "Driver 12 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_12_license", label: "Driver 12 License #", type: "text", section: "Driver Information" },
  { key: "driver_12_license_state", label: "Driver 12 License State", type: "text", section: "Driver Information" },
  { key: "driver_13_name", label: "Driver 13 Name", type: "text", section: "Driver Information" },
  { key: "driver_13_first_name", label: "Driver 13 First Name", type: "text", section: "Driver Information" },
  { key: "driver_13_last_name", label: "Driver 13 Last Name", type: "text", section: "Driver Information" },
  { key: "driver_13_sex", label: "Driver 13 Sex", type: "select", options: ["M", "F"], section: "Driver Information" },
  { key: "driver_13_marital", label: "Driver 13 Marital Status", type: "select", options: ["S", "M", "W", "D"], section: "Driver Information" },
  { key: "driver_13_dob", label: "Driver 13 Date of Birth", type: "date", section: "Driver Information" },
  { key: "driver_13_license", label: "Driver 13 License #", type: "text", section: "Driver Information" },
  { key: "driver_13_license_state", label: "Driver 13 License State", type: "text", section: "Driver Information" },

  // Auto coverages
  { key: "auto_liability_limit", label: "Auto Liability Limit", type: "currency", section: "Coverages" },
  { key: "um_uim_limit", label: "UM/UIM Limit", type: "currency", section: "Coverages" },
  { key: "number_of_vehicles", label: "Number of Vehicles", type: "text", section: "Coverages" },
  { key: "number_of_drivers", label: "Number of Drivers", type: "text", section: "Coverages" },
  { key: "radius_of_operations", label: "Radius of Operations", type: "text", section: "Coverages" },

  // Remarks
  { key: "auto_remarks", label: "Remarks", type: "textarea", section: "Remarks" },

  // Signature
  { key: "producer_name", label: "Producer's Name", type: "text", section: "Signature" },
  { key: "producer_license_no", label: "State Producer License No.", type: "text", section: "Signature" },
  { key: "national_producer_number", label: "National Producer Number", type: "text", section: "Signature" },
  { key: "signature_date", label: "Date", type: "date", section: "Signature" },
];

// ============================================================
// ACORD 130 (2013/01) — Workers Compensation Application
// ============================================================
const acord130Fields: AcordFormField[] = [
  // Agency & Contact
  { key: "agency_name", label: "Agency Name and Address", type: "text", section: "Agency & Contact", required: true },
  { key: "agency_phone", label: "Office Phone", type: "text", section: "Agency & Contact" },
  { key: "agency_mobile", label: "Mobile Phone", type: "text", section: "Agency & Contact" },
  { key: "agency_email", label: "E-Mail Address", type: "text", section: "Agency & Contact" },
  { key: "agency_fax", label: "Fax", type: "text", section: "Agency & Contact" },
  { key: "producer_name", label: "Producer Name", type: "text", section: "Agency & Contact" },
  { key: "cs_representative", label: "CS Representative Name", type: "text", section: "Agency & Contact" },
  { key: "carrier", label: "Company", type: "text", section: "Agency & Contact" },
  { key: "underwriter", label: "Underwriter", type: "text", section: "Agency & Contact" },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Agency & Contact" },

  // Applicant Information
  { key: "insured_name", label: "Applicant Name", type: "text", section: "Applicant Information", required: true },
  { key: "applicant_phone", label: "Office Phone", type: "text", section: "Applicant Information" },
  { key: "applicant_mobile", label: "Mobile Phone", type: "text", section: "Applicant Information" },
  { key: "mailing_address", label: "Mailing Address (including ZIP+4)", type: "text", section: "Applicant Information", required: true },
  { key: "city", label: "City", type: "text", section: "Applicant Information" },
  { key: "state", label: "State", type: "text", section: "Applicant Information", required: true },
  { key: "zip", label: "ZIP", type: "text", section: "Applicant Information", required: true },
  { key: "years_in_business", label: "Years in Business", type: "text", section: "Applicant Information" },
  { key: "sic_code", label: "SIC", type: "text", section: "Applicant Information" },
  { key: "naics_code", label: "NAICS", type: "text", section: "Applicant Information" },
  { key: "website", label: "Website", type: "text", section: "Applicant Information" },
  { key: "applicant_email", label: "E-Mail", type: "text", section: "Applicant Information" },

  // Business Structure
  { key: "business_type", label: "Business Structure", type: "select", options: ["Sole Proprietor", "Corporation", "LLC", "Trust", "Partnership", "Subchapter S Corp", "Joint Venture", "Other"], section: "Business Structure", required: true },

  // Credit Information
  { key: "credit_code", label: "Credit Code", type: "text", section: "Credit Information" },
  { key: "sub_code", label: "Sub Code", type: "text", section: "Credit Information" },
  { key: "fein", label: "Federal Employer ID Number", type: "text", section: "Credit Information", required: true },
  { key: "ncci_risk_id", label: "NCCI Risk ID Number", type: "text", section: "Credit Information" },
  { key: "other_bureau_id", label: "Other Rating Bureau ID", type: "text", section: "Credit Information" },

  // Status of Submission
  { key: "submission_status", label: "Status", type: "select", options: ["Quote", "Issue Policy"], section: "Status of Submission" },

  // Billing / Audit
  { key: "billing_plan", label: "Billing Plan", type: "select", options: ["Agency Bill", "Direct Bill"], section: "Billing / Audit" },
  { key: "payment_plan", label: "Payment Plan", type: "select", options: ["Annual", "Semi-Annual", "Quarterly"], section: "Billing / Audit" },
  { key: "pct_down", label: "% Down", type: "text", section: "Billing / Audit" },

  // Locations
  { key: "location_1_address", label: "Location 1 Address", type: "text", section: "Locations" },
  { key: "location_1_floor", label: "Location 1 Floor", type: "text", section: "Locations" },

  // Policy Information
  { key: "effective_date", label: "Proposed Eff Date", type: "date", section: "Policy Information", required: true },
  { key: "expiration_date", label: "Proposed Exp Date", type: "date", section: "Policy Information", required: true },
  { key: "anniversary_rating_date", label: "Normal Anniversary Rating Date", type: "date", section: "Policy Information" },
  { key: "participating", label: "Participating", type: "select", options: ["Yes", "No"], section: "Policy Information" },
  { key: "retro_plan", label: "Retro Plan", type: "select", options: ["Yes", "No"], section: "Policy Information" },

  // Workers Compensation Coverages
  { key: "wc_part1_states", label: "Part 1 - WC States", type: "text", section: "WC Coverages", required: true },
  { key: "wc_each_accident", label: "Part 2 - Each Accident", type: "currency", section: "WC Coverages" },
  { key: "wc_disease_policy_limit", label: "Disease - Policy Limit", type: "currency", section: "WC Coverages" },
  { key: "wc_disease_each_employee", label: "Disease - Each Employee", type: "currency", section: "WC Coverages" },
  { key: "wc_uslh", label: "U.S.L. & H.", type: "checkbox", section: "WC Coverages" },
  { key: "wc_voluntary_comp", label: "Voluntary Comp", type: "checkbox", section: "WC Coverages" },
  { key: "wc_foreign_coverage", label: "Foreign Coverage", type: "checkbox", section: "WC Coverages" },
  { key: "wc_managed_care", label: "Managed Medical Care Option", type: "checkbox", section: "WC Coverages" },
  { key: "deductible_type", label: "Deductible Type", type: "select", options: ["Indemnity", "Medical", "Both", "N/A"], section: "WC Coverages" },
  { key: "deductible_amount", label: "Deductible Amount / %", type: "text", section: "WC Coverages" },
  { key: "additional_endorsements", label: "Specify Additional Coverages / Endorsements", type: "textarea", section: "WC Coverages" },

  // Premiums & Rating Data
  { key: "total_estimated_premium", label: "Total Estimated Annual Premium - All States", type: "currency", section: "Premiums" },
  { key: "total_minimum_premium", label: "Total Minimum Premium - All States", type: "currency", section: "Premiums" },
  { key: "total_deposit_premium", label: "Total Deposit Premium - All States", type: "currency", section: "Premiums" },
  { key: "standard_premium", label: "Standard Premium", type: "currency", section: "Premiums" },
  { key: "modified_premium", label: "Modified Premium", type: "currency", section: "Premiums" },
  { key: "expense_constant", label: "Expense Constant", type: "currency", section: "Premiums" },
  { key: "terrorism_premium", label: "Terrorism Premium", type: "currency", section: "Premiums" },
  { key: "cat_premium", label: "Catastrophe Premium (Other Than Certified)", type: "currency", section: "Premiums" },
  { key: "second_injury_fund", label: "Second Injury Fund Assessment", type: "currency", section: "Premiums" },
  { key: "wc_fund_assessment", label: "WC Fund Assessment", type: "currency", section: "Premiums" },

  // Individuals Included / Excluded
  { key: "officer_1_name", label: "Officer/Partner 1 Name", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_1_dob", label: "Officer 1 Date of Birth", type: "date", section: "Individuals Included / Excluded" },
  { key: "officer_1_title", label: "Officer 1 Title/Relationship", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_1_ownership", label: "Officer 1 Ownership %", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_1_duties", label: "Officer 1 Duties", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_1_inc_exc", label: "Officer 1 Inc/Exc", type: "select", options: ["Included", "Excluded"], section: "Individuals Included / Excluded" },
  { key: "officer_1_class_code", label: "Officer 1 Class Code", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_1_remuneration", label: "Officer 1 Remuneration/Payroll", type: "currency", section: "Individuals Included / Excluded" },
  { key: "officer_2_name", label: "Officer/Partner 2 Name", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_2_title", label: "Officer 2 Title", type: "text", section: "Individuals Included / Excluded" },
  { key: "officer_2_ownership", label: "Officer 2 Ownership %", type: "text", section: "Individuals Included / Excluded" },

  // State Rating Information
  { key: "rating_state", label: "Rating State", type: "text", section: "State Rating Information" },
  { key: "class_code_1", label: "Class Code 1", type: "text", section: "State Rating Information" },
  { key: "class_description_1", label: "Classification Description 1", type: "text", section: "State Rating Information" },
  { key: "num_employees_1", label: "# Employees (Class 1)", type: "number", section: "State Rating Information" },
  { key: "annual_remuneration_1", label: "Est. Annual Remuneration/Payroll (Class 1)", type: "currency", section: "State Rating Information" },
  { key: "est_premium_1", label: "Estimated Premium (Class 1)", type: "currency", section: "State Rating Information" },
  { key: "class_code_2", label: "Class Code 2", type: "text", section: "State Rating Information" },
  { key: "class_description_2", label: "Classification Description 2", type: "text", section: "State Rating Information" },
  { key: "num_employees_2", label: "# Employees (Class 2)", type: "number", section: "State Rating Information" },
  { key: "annual_remuneration_2", label: "Est. Annual Remuneration/Payroll (Class 2)", type: "currency", section: "State Rating Information" },
  { key: "est_premium_2", label: "Estimated Premium (Class 2)", type: "currency", section: "State Rating Information" },
  { key: "class_code_3", label: "Class Code 3", type: "text", section: "State Rating Information" },
  { key: "class_description_3", label: "Classification Description 3", type: "text", section: "State Rating Information" },
  { key: "num_employees_3", label: "# Employees (Class 3)", type: "number", section: "State Rating Information" },
  { key: "annual_remuneration_3", label: "Est. Annual Remuneration/Payroll (Class 3)", type: "currency", section: "State Rating Information" },
  { key: "est_premium_3", label: "Estimated Premium (Class 3)", type: "currency", section: "State Rating Information" },
  { key: "experience_mod", label: "Experience or Merit Modification", type: "text", section: "State Rating Information" },
  { key: "mod_effective_date", label: "Modification Effective Date", type: "date", section: "State Rating Information" },
  { key: "schedule_rating_mod", label: "Schedule Rating Factor", type: "text", section: "State Rating Premiums" },
  { key: "schedule_rating_prem", label: "Schedule Rating Amount", type: "currency", section: "State Rating Premiums" },
  { key: "ccpap_mod", label: "CCPAP Factor", type: "text", section: "State Rating Premiums" },
  { key: "ccpap_prem", label: "CCPAP Amount", type: "currency", section: "State Rating Premiums" },
  { key: "standard_premium_mod", label: "Standard Premium Factor", type: "text", section: "State Rating Premiums" },
  { key: "standard_premium_prem", label: "Standard Premium Amount", type: "currency", section: "State Rating Premiums" },
  { key: "premium_discount_mod", label: "Premium Discount Factor", type: "text", section: "State Rating Premiums" },
  { key: "premium_discount_prem", label: "Premium Discount Amount", type: "currency", section: "State Rating Premiums" },
  { key: "taxes_fees", label: "Taxes / Fees / Assessments", type: "currency", section: "State Rating Premiums" },
  { key: "assigned_risk_mod", label: "Assigned Risk Surcharge Factor", type: "text", section: "State Rating Premiums" },
  { key: "assigned_risk_prem", label: "Assigned Risk Surcharge Amount", type: "currency", section: "State Rating Premiums" },
  { key: "state_total_est_premium", label: "State Total Est. Annual Premium", type: "currency", section: "State Rating Premiums" },
  { key: "state_minimum_premium", label: "State Minimum Premium", type: "currency", section: "State Rating Premiums" },
  { key: "state_deposit_premium", label: "State Deposit Premium", type: "currency", section: "State Rating Premiums" },

  // Other States / Jurisdictions
  { key: "wc_other_states_3a", label: "3.A - Other States Coverage (list)", type: "textarea", section: "Other States" },
  { key: "wc_excluded_states", label: "States Excluded / Monopolistic States", type: "text", section: "Other States" },

  // Waiver of Subrogation
  { key: "waiver_of_subrogation", label: "Waiver of Subrogation", type: "select", options: ["Yes - Blanket", "Yes - Specific", "No"], section: "Endorsements", default: "No" },
  { key: "waiver_endorsement_number", label: "Waiver Endorsement #", type: "text", section: "Endorsements" },

  // Contracting Classification Credit
  { key: "contracting_class_credit", label: "Contracting Classification Credit Applied", type: "select", options: ["Yes", "No"], section: "Endorsements", default: "No" },

  // Prior Carrier / Loss History
  { key: "prior_wc_carrier_1", label: "Prior WC Carrier 1", type: "text", section: "Prior Carrier / Loss History" },
  { key: "prior_wc_policy_1", label: "Prior Policy # 1", type: "text", section: "Prior Carrier / Loss History" },
  { key: "prior_wc_premium_1", label: "Prior Annual Premium 1", type: "currency", section: "Prior Carrier / Loss History" },
  { key: "prior_wc_mod_1", label: "Prior Mod 1", type: "text", section: "Prior Carrier / Loss History" },
  { key: "prior_wc_claims_1", label: "Prior # Claims 1", type: "number", section: "Prior Carrier / Loss History" },
  { key: "prior_wc_paid_1", label: "Prior Amount Paid 1", type: "currency", section: "Prior Carrier / Loss History" },
  { key: "prior_wc_reserve_1", label: "Prior Reserve 1", type: "currency", section: "Prior Carrier / Loss History" },
  { key: "loss_run_attached", label: "Loss Run Attached", type: "checkbox", section: "Prior Carrier / Loss History" },

  // Nature of Business
  { key: "description_of_operations", label: "Description of Business/Operations", type: "textarea", section: "Nature of Business", required: true },

  // General Information
  { key: "wc_aircraft_watercraft", label: "1. Own/operate/lease aircraft/watercraft?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_hazardous_material", label: "2. Operations involve hazardous material?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_underground_above_15ft", label: "3. Work underground or above 15 feet?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_barges_vessels_docks", label: "4. Work on barges, vessels, docks, bridges over water?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_other_business", label: "5. Engaged in any other type of business?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "subcontractors_used", label: "6. Sub-contractors used?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "pct_subcontracted", label: "% of work subcontracted", type: "text", section: "General Information" },
  { key: "wc_work_sublet_no_coi", label: "7. Any work sublet without COI?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "workplace_safety_program", label: "8. Written safety program in operation?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_group_transportation", label: "9. Any group transportation provided?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_under_16_over_60", label: "10. Employees under 16 or over 60?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "seasonal_employees", label: "11. Any seasonal employees?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_volunteer_labor", label: "12. Any volunteer or donated labor?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_physical_handicaps", label: "13. Employees with physical handicaps?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_travel_out_of_state", label: "14. Employees travel out of state?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_athletic_teams", label: "15. Athletic teams sponsored?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_physicals_required", label: "16. Physicals required after employment offers?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_other_insurance_same", label: "17. Other insurance with this insurer?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_prior_declined", label: "18. Coverage declined/cancelled/non-renewed in last 3 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_health_plans", label: "19. Employee health plans provided?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_employees_other_business", label: "20. Employees perform work for other businesses?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_lease_employees", label: "21. Lease employees to or from other employers?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_work_at_home", label: "22. Employees predominantly work at home?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_tax_liens_bankruptcy", label: "23. Tax liens or bankruptcy in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_unpaid_premium", label: "24. Undisputed/unpaid WC premium due?", type: "select", options: ["Yes", "No"], section: "General Information", default: "No" },
  { key: "wc_general_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Information" },

  // Remarks
  { key: "wc_remarks", label: "Remarks", type: "textarea", section: "Remarks" },
];

// ============================================================
// ACORD 131 (2016/04) — Umbrella / Excess Liability Section
// ============================================================
const acord131Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },
  { key: "insured_name", label: "Named Insured(s)", type: "text", section: "Header", required: true },

  // Policy Information
  { key: "umbrella_transaction_type", label: "Transaction Type", type: "select", options: ["New", "Renewal"], section: "Policy Information" },
  { key: "umbrella_or_excess", label: "Type", type: "select", options: ["Umbrella", "Excess"], section: "Policy Information", required: true },
  { key: "coverage_basis", label: "Coverage Basis", type: "select", options: ["Occurrence", "Claims Made"], section: "Policy Information" },
  { key: "each_occurrence_limit", label: "Limit of Liability - Each Occurrence", type: "currency", section: "Policy Information", required: true },
  { key: "aggregate_limit", label: "Limit of Liability - Aggregate", type: "currency", section: "Policy Information" },
  { key: "products_completed_ops_aggregate", label: "Products-Completed Ops Aggregate", type: "currency", section: "Policy Information" },
  { key: "retained_limit_occurrence", label: "Retained Limit - Occurrence", type: "currency", section: "Policy Information" },
  { key: "retained_limit_aggregate", label: "Retained Limit - Aggregate", type: "currency", section: "Policy Information" },
  { key: "self_insured_retention", label: "Self-Insured Retention", type: "currency", section: "Policy Information" },
  { key: "first_dollar_defense", label: "First Dollar Defense", type: "select", options: ["Yes", "No"], section: "Policy Information" },
  { key: "defense_within_limits", label: "Defense Costs", type: "select", options: ["Within Limits", "Outside Limits"], section: "Policy Information" },
  { key: "retroactive_date", label: "Retroactive Date", type: "date", section: "Policy Information" },
  { key: "expiring_policy_number", label: "Expiring Policy #", type: "text", section: "Policy Information" },
  { key: "crisis_mgmt_limit", label: "Crisis Management Expenses Limit", type: "currency", section: "Policy Information" },
  { key: "non_cumulation_occurrence", label: "Non-Cumulation of Occurrence Limit", type: "checkbox", section: "Policy Information" },
  { key: "non_cumulation_endorsement", label: "Non-Cumulation Endorsement #", type: "text", section: "Policy Information" },

  // Named Insureds
  { key: "additional_named_insured_1", label: "Additional Named Insured 1", type: "text", section: "Named Insureds" },
  { key: "additional_named_insured_2", label: "Additional Named Insured 2", type: "text", section: "Named Insureds" },

  // Employee Benefits Liability
  { key: "ebl_each_employee", label: "EBL Limit (Each Employee)", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_aggregate", label: "EBL Aggregate Limit", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_retained_limit", label: "EBL Retained Limit", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_retroactive_date", label: "EBL Retroactive Date", type: "date", section: "Employee Benefits Liability" },
  { key: "benefit_program_name", label: "Name of Benefit Program", type: "text", section: "Employee Benefits Liability" },

  // Primary Location & Subsidiaries
  { key: "primary_location_name", label: "Primary Company Name", type: "text", section: "Primary Location & Subsidiaries" },
  { key: "primary_location_address", label: "Primary Location", type: "text", section: "Primary Location & Subsidiaries" },
  { key: "primary_description", label: "Description of Operations", type: "textarea", section: "Primary Location & Subsidiaries" },
  { key: "annual_payroll", label: "Annual Payroll", type: "currency", section: "Primary Location & Subsidiaries" },
  { key: "annual_gross_sales", label: "Annual Gross Sales", type: "currency", section: "Primary Location & Subsidiaries" },
  { key: "total_employees", label: "# Employees", type: "number", section: "Primary Location & Subsidiaries" },

  // Underlying Insurance
  { key: "underlying_auto_carrier", label: "Auto Liability - Carrier", type: "text", section: "Underlying Insurance" },
  { key: "underlying_auto_policy", label: "Auto Liability - Policy #", type: "text", section: "Underlying Insurance" },
  { key: "underlying_auto_eff_date", label: "Auto Eff Date", type: "date", section: "Underlying Insurance" },
  { key: "underlying_auto_exp_date", label: "Auto Exp Date", type: "date", section: "Underlying Insurance" },
  { key: "underlying_auto_csl", label: "Auto CSL Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_auto_bi_ea_acc", label: "Auto BI Each Accident Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_auto_bi_ea_per", label: "Auto BI Each Person Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_auto_pd", label: "Auto PD Each Accident Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_auto_premium", label: "Auto Annual Premium", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_carrier", label: "GL - Carrier", type: "text", section: "Underlying Insurance" },
  { key: "underlying_gl_policy", label: "GL - Policy #", type: "text", section: "Underlying Insurance" },
  { key: "underlying_gl_eff_date", label: "GL Eff Date", type: "date", section: "Underlying Insurance" },
  { key: "underlying_gl_exp_date", label: "GL Exp Date", type: "date", section: "Underlying Insurance" },
  { key: "underlying_gl_occurrence", label: "GL Each Occurrence Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_aggregate", label: "GL General Aggregate Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_products", label: "GL Products & Comp Ops Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_personal", label: "GL Personal & Adv Injury Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_fire_damage", label: "GL Fire Damage Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_med_expense", label: "GL Med Expense Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_premium", label: "GL Annual Premium", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_gl_type", label: "GL Policy Type", type: "select", options: ["Occurrence", "Claims Made"], section: "Underlying Insurance" },
  { key: "underlying_el_carrier", label: "Employers Liability - Carrier", type: "text", section: "Underlying Insurance" },
  { key: "underlying_el_policy", label: "Employers Liability - Policy #", type: "text", section: "Underlying Insurance" },
  { key: "underlying_el_eff_date", label: "EL Eff Date", type: "date", section: "Underlying Insurance" },
  { key: "underlying_el_exp_date", label: "EL Exp Date", type: "date", section: "Underlying Insurance" },
  { key: "underlying_el_each_accident", label: "EL Each Accident", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_el_disease_employee", label: "EL Disease Each Employee", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_el_disease_policy", label: "EL Disease Policy Limit", type: "currency", section: "Underlying Insurance" },
  { key: "underlying_el_premium", label: "EL Annual Premium", type: "currency", section: "Underlying Insurance" },

  // Underlying Insurance — Other Lines (Property, EPLI, Cyber, etc.)
  { key: "underlying_other_a_type", label: "Other A - Line of Business", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_carrier", label: "Other A - Carrier", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_policy_number", label: "Other A - Policy #", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_eff_date", label: "Other A - Eff Date", type: "date", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_exp_date", label: "Other A - Exp Date", type: "date", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_coverage", label: "Other A - Coverage Description", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_csl", label: "Other A - Limit", type: "currency", section: "Underlying Insurance - Other" },
  { key: "underlying_other_a_premium", label: "Other A - Premium", type: "currency", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_type", label: "Other B - Line of Business", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_carrier", label: "Other B - Carrier", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_policy_number", label: "Other B - Policy #", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_eff_date", label: "Other B - Eff Date", type: "date", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_exp_date", label: "Other B - Exp Date", type: "date", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_coverage", label: "Other B - Coverage Description", type: "text", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_csl", label: "Other B - Limit", type: "currency", section: "Underlying Insurance - Other" },
  { key: "underlying_other_b_premium", label: "Other B - Premium", type: "currency", section: "Underlying Insurance - Other" },

  // Underlying GL Information
  { key: "defense_costs_treatment", label: "Defense Costs", type: "select", options: ["Within Aggregate Limits", "Separate Limit", "Unlimited"], section: "Underlying GL Information" },
  { key: "underlying_iso_edition", label: "ISO Form Edition Date", type: "text", section: "Underlying GL Information" },
  { key: "excluded_from_previous_coverage", label: "Product/work excluded from previous coverage?", type: "select", options: ["Yes", "No"], section: "Underlying GL Information" },

  // Coverage / Exposure Checklist
  { key: "has_any_auto", label: "Any Auto (Symbol 1)", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_cgl_occurrence", label: "CGL - Occurrence", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_cgl_claims_made", label: "CGL - Claims Made", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_aircraft_liability", label: "Aircraft Liability", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_professional_liability", label: "Professional Liability (E&O)", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_pollution_liability", label: "Pollution Liability", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_watercraft_liability", label: "Watercraft Liability", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_liquor_liability", label: "Liquor Liability", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_ebl_coverage", label: "Employee Benefits Liability", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_foreign_liability", label: "Foreign Liability / Travel", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_ccc_coverage", label: "Care, Custody & Control", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_garagekeepers", label: "Garagekeepers", type: "checkbox", section: "Coverage / Exposure Checklist" },
  { key: "has_vendors_coverage", label: "Vendors Coverage", type: "checkbox", section: "Coverage / Exposure Checklist" },

  // Previous Experience / Loss History
  { key: "no_previous_claims", label: "No Such Claims", type: "checkbox", section: "Previous Experience" },
  { key: "previous_experience_details", label: "Claims exceeding $10,000 in past 5 years", type: "textarea", section: "Previous Experience" },
  { key: "loss_date_a", label: "Loss 1 - Date", type: "date", section: "Loss History" },
  { key: "loss_lob_a", label: "Loss 1 - Line of Business", type: "text", section: "Loss History" },
  { key: "loss_description_a", label: "Loss 1 - Description", type: "text", section: "Loss History" },
  { key: "loss_paid_a", label: "Loss 1 - Amount Paid", type: "currency", section: "Loss History" },
  { key: "loss_reserved_a", label: "Loss 1 - Amount Reserved", type: "currency", section: "Loss History" },
  { key: "loss_date_b", label: "Loss 2 - Date", type: "date", section: "Loss History" },
  { key: "loss_lob_b", label: "Loss 2 - Line of Business", type: "text", section: "Loss History" },
  { key: "loss_description_b", label: "Loss 2 - Description", type: "text", section: "Loss History" },
  { key: "loss_paid_b", label: "Loss 2 - Amount Paid", type: "currency", section: "Loss History" },
  { key: "loss_reserved_b", label: "Loss 2 - Amount Reserved", type: "currency", section: "Loss History" },
  { key: "loss_date_c", label: "Loss 3 - Date", type: "date", section: "Loss History" },
  { key: "loss_lob_c", label: "Loss 3 - Line of Business", type: "text", section: "Loss History" },
  { key: "loss_description_c", label: "Loss 3 - Description", type: "text", section: "Loss History" },
  { key: "loss_paid_c", label: "Loss 3 - Amount Paid", type: "currency", section: "Loss History" },
  { key: "loss_reserved_c", label: "Loss 3 - Amount Reserved", type: "currency", section: "Loss History" },

  // Vehicle Fleet Schedule
  { key: "fleet_pp_owned", label: "Private Passenger - # Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_pp_nonowned", label: "Private Passenger - # Non-Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_pp_leased", label: "Private Passenger - # Leased", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_pp_hauled", label: "Private Passenger - Material Hauled", type: "text", section: "Vehicle Fleet" },
  { key: "fleet_pp_local", label: "Private Passenger - Local", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_pp_intermediate", label: "Private Passenger - Intermediate", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_pp_long", label: "Private Passenger - Long Distance", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_lt_owned", label: "Light Trucks - # Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_lt_nonowned", label: "Light Trucks - # Non-Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_lt_leased", label: "Light Trucks - # Leased", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_lt_hauled", label: "Light Trucks - Material Hauled", type: "text", section: "Vehicle Fleet" },
  { key: "fleet_lt_local", label: "Light Trucks - Local", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_lt_intermediate", label: "Light Trucks - Intermediate", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_lt_long", label: "Light Trucks - Long Distance", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_mt_owned", label: "Medium Trucks - # Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_mt_nonowned", label: "Medium Trucks - # Non-Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_mt_leased", label: "Medium Trucks - # Leased", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_ht_owned", label: "Heavy Trucks - # Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_ht_nonowned", label: "Heavy Trucks - # Non-Owned", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_ht_leased", label: "Heavy Trucks - # Leased", type: "number", section: "Vehicle Fleet" },
  { key: "fleet_bus_owned", label: "Buses - # Owned", type: "number", section: "Vehicle Fleet" },

  // Additional Exposures — Auto
  { key: "explosives_hauled", label: "Explosives/flammables/dangerous cargo hauled?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Auto", default: "No" },
  { key: "passengers_for_fee", label: "Passengers carried for a fee?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Auto", default: "No" },
  { key: "hired_non_owned_coverage", label: "Hired and non-owned coverages provided?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Auto", default: "No" },
  { key: "q_units_not_insured_code", label: "Units not insured elsewhere?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Auto", default: "No" },
  { key: "q_vehicles_leased_code", label: "Vehicles leased to others?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Auto", default: "No" },

  // Additional Exposures — Contractors
  { key: "contractor_bridge_dam", label: "Bridge, dam, or marine work performed?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Contractors", default: "No" },
  { key: "contractor_uses_cranes", label: "Own, rent, or use cranes?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Contractors", default: "No" },
  { key: "q_subcontractors_code", label: "Subcontractors carry lower limits?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Contractors", default: "No" },
  { key: "q_subcontractors_explanation", label: "Subcontractor details / % subcontracted", type: "textarea", section: "Additional Exposures - Contractors" },
  { key: "contractors_work_description", label: "Describe typical jobs", type: "textarea", section: "Additional Exposures - Contractors" },
  { key: "contractors_agreement", label: "Independent contractor agreement/description", type: "textarea", section: "Additional Exposures - Contractors" },

  // Additional Exposures — Employers
  { key: "employer_self_insured", label: "Applicant self-insured in any state?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Employers", default: "No" },
  { key: "el_other_description", label: "Other EL exposure description", type: "textarea", section: "Additional Exposures - Employers" },

  // Additional Exposures — Incidental Malpractice
  { key: "q_hospital_code", label: "Hospital or first-aid facility on premises?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Malpractice", default: "No" },
  { key: "q_hospital_explanation", label: "Hospital details", type: "textarea", section: "Additional Exposures - Malpractice" },
  { key: "q_doctors_nurses_code", label: "Coverage for doctors/nurses?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Malpractice", default: "No" },
  { key: "q_doctors_nurses_explanation", label: "Doctors/nurses details", type: "textarea", section: "Additional Exposures - Malpractice" },
  { key: "malpractice_doctor_count", label: "# Doctors", type: "number", section: "Additional Exposures - Malpractice" },
  { key: "malpractice_nurse_count", label: "# Nurses", type: "number", section: "Additional Exposures - Malpractice" },
  { key: "malpractice_bed_count", label: "# Beds", type: "number", section: "Additional Exposures - Malpractice" },

  // Additional Exposures — Pollution
  { key: "pollution_hazardous_disposal", label: "Products require special hazardous disposal?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Pollution", default: "No" },
  { key: "q_hazardous_materials_code", label: "Store/dispose/transport hazardous materials?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Pollution", default: "No" },
  { key: "q_hazardous_materials_explanation", label: "Hazardous materials details", type: "textarea", section: "Additional Exposures - Pollution" },
  { key: "epa_identifier", label: "EPA Identifier", type: "text", section: "Additional Exposures - Pollution" },
  { key: "foreign_operations_131", label: "Foreign operations or foreign products?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Foreign", default: "No" },

  // Additional Exposures — Products
  { key: "q_missiles_engines_code", label: "Products related to missiles/aircraft engines?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Products", default: "No" },
  { key: "q_missiles_engines_explanation", label: "Missiles/engines details", type: "textarea", section: "Additional Exposures - Products" },
  { key: "q_product_loss_code", label: "Product losses in past 5 years?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Products", default: "No" },
  { key: "q_product_loss_explanation", label: "Product loss details", type: "textarea", section: "Additional Exposures - Products" },
  { key: "product_gross_sales_a", label: "Product Gross Sales - Year 1", type: "currency", section: "Additional Exposures - Products" },
  { key: "product_gross_sales_b", label: "Product Gross Sales - Year 2", type: "currency", section: "Additional Exposures - Products" },
  { key: "product_gross_sales_c", label: "Product Gross Sales - Year 3", type: "currency", section: "Additional Exposures - Products" },

  // Additional Exposures — Watercraft
  { key: "q_watercraft_code", label: "Watercraft exposure?", type: "select", options: ["Yes", "No"], section: "Additional Exposures - Watercraft", default: "No" },
  { key: "protective_liability_description", label: "Protective liability description", type: "textarea", section: "Additional Exposures - Watercraft" },

  // Additional Exposures — Advertisers
  { key: "advertisers_media_code", label: "Advertising media exposure?", type: "text", section: "Additional Exposures - Advertisers" },
  { key: "advertisers_annual_cost", label: "Annual advertising cost", type: "currency", section: "Additional Exposures - Advertisers" },

  // Care, Custody & Control
  { key: "ccc_location_id", label: "CCC Location ID", type: "text", section: "Care, Custody & Control" },
  { key: "ccc_property_value", label: "CCC Property Value", type: "currency", section: "Care, Custody & Control" },
  { key: "ccc_occupied_area", label: "CCC Occupied Area (Sq Ft)", type: "number", section: "Care, Custody & Control" },
  { key: "ccc_property_description", label: "CCC Property Description / Occupancy", type: "textarea", section: "Care, Custody & Control" },
  { key: "ccc_insured_liability_other", label: "CCC Insured Liability - Other Description", type: "text", section: "Care, Custody & Control" },

  // Underlying GL Detail
  { key: "gl_form_edition_date", label: "GL Form Edition Date", type: "text", section: "Underlying GL Detail" },
  { key: "gl_claims_retroactive_date", label: "GL Claims-Made Retroactive Date", type: "date", section: "Underlying GL Detail" },
  { key: "gl_claims_entry_date", label: "GL Claims-Made Entry Date", type: "date", section: "Underlying GL Detail" },
  { key: "q_excluded_uninsured_code", label: "Excluded/uninsured products or work?", type: "select", options: ["Yes", "No"], section: "Underlying GL Detail" },
  { key: "q_excluded_uninsured_explanation", label: "Excluded/uninsured details", type: "textarea", section: "Underlying GL Detail" },
  { key: "q_tail_coverage_code", label: "Tail coverage purchased?", type: "select", options: ["Yes", "No"], section: "Underlying GL Detail" },
  { key: "q_tail_coverage_explanation", label: "Tail coverage details", type: "textarea", section: "Underlying GL Detail" },
  { key: "underlying_info_description", label: "Underlying coverage additional description", type: "textarea", section: "Underlying GL Detail" },

  // Premium
  { key: "umbrella_est_annual_premium", label: "Estimated Annual Premium", type: "currency", section: "Premium" },
  { key: "umbrella_deposit_premium", label: "Deposit Premium", type: "currency", section: "Premium" },
  { key: "umbrella_minimum_earned", label: "Minimum Earned Premium", type: "currency", section: "Premium" },

  // UM/UIM Limits
  { key: "uninsured_motorists_limit", label: "Uninsured Motorists Limit", type: "currency", section: "UM/UIM" },
  { key: "underinsured_motorists_limit", label: "Underinsured Motorists Limit", type: "currency", section: "UM/UIM" },
  { key: "medical_payments_limit", label: "Medical Payments Limit", type: "currency", section: "UM/UIM" },

  // Remarks
  { key: "umbrella_remarks", label: "Remarks", type: "textarea", section: "Remarks" },
  { key: "coverage_remarks", label: "Coverage/Exposure Remarks", type: "textarea", section: "Remarks" },

  // Signature
  { key: "applicant_printed_name", label: "Applicant Printed Name", type: "text", section: "Signature" },
  { key: "applicant_title", label: "Applicant Title", type: "text", section: "Signature" },
  { key: "applicant_signature_date", label: "Applicant Signature Date", type: "date", section: "Signature" },
  { key: "producer_name", label: "Producer's Name", type: "text", section: "Signature" },
  { key: "producer_license_no", label: "State Producer License No.", type: "text", section: "Signature" },
  { key: "national_producer_number", label: "National Producer Number", type: "text", section: "Signature" },
  { key: "signature_date", label: "Date", type: "date", section: "Signature" },
];

// ============================================================
// ACORD 140 (2014/12) — Property Section
// ============================================================
const acord140Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency Name", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },
  { key: "insured_name", label: "Named Insured(s)", type: "text", section: "Header", required: true },

  // Blanket Summary
  { key: "blanket_1_number", label: "Blanket # 1", type: "text", section: "Blanket Summary" },
  { key: "blanket_1_amount", label: "Blanket 1 Amount", type: "currency", section: "Blanket Summary" },
  { key: "blanket_1_type", label: "Blanket 1 Type", type: "text", section: "Blanket Summary" },

  // Premises Information
  { key: "premises_number", label: "Premises #", type: "text", section: "Premises Information" },
  { key: "building_street_address", label: "Street Address", type: "text", section: "Premises Information" },
  { key: "building_number", label: "Building #", type: "text", section: "Premises Information" },
  { key: "building_description", label: "Building Description", type: "text", section: "Premises Information" },

  // Subject of Insurance
  { key: "building_amount", label: "Building Amount", type: "currency", section: "Subject of Insurance" },
  { key: "building_coins_pct", label: "Building Coins %", type: "text", section: "Subject of Insurance" },
  { key: "building_valuation", label: "Building Valuation", type: "select", options: ["Replacement Cost", "Actual Cash Value", "Functional Replacement Cost", "Agreed Value"], section: "Subject of Insurance" },
  { key: "building_causes_of_loss", label: "Building Causes of Loss", type: "select", options: ["Basic", "Broad", "Special"], section: "Subject of Insurance" },
  { key: "building_deductible", label: "Building Deductible", type: "currency", section: "Subject of Insurance" },
  { key: "bpp_amount", label: "Business Personal Property Amount", type: "currency", section: "Subject of Insurance" },
  { key: "bpp_valuation", label: "BPP Valuation", type: "select", options: ["Replacement Cost", "Actual Cash Value"], section: "Subject of Insurance" },
  { key: "bpp_causes_of_loss", label: "BPP Causes of Loss", type: "select", options: ["Basic", "Broad", "Special"], section: "Subject of Insurance" },
  { key: "bpp_deductible", label: "BPP Deductible", type: "currency", section: "Subject of Insurance" },
  { key: "business_income_amount", label: "Business Income Amount", type: "currency", section: "Subject of Insurance" },
  { key: "extra_expense_amount", label: "Extra Expense Amount", type: "currency", section: "Subject of Insurance" },
  { key: "rental_value_amount", label: "Rental Value Amount", type: "currency", section: "Subject of Insurance" },
  { key: "inflation_guard_pct", label: "Inflation Guard %", type: "text", section: "Subject of Insurance" },
  { key: "accounts_receivable_limit", label: "Accounts Receivable Limit", type: "currency", section: "Subject of Insurance" },
  { key: "valuable_papers_limit", label: "Valuable Papers Limit", type: "currency", section: "Subject of Insurance" },
  { key: "edp_media_limit", label: "EDP Media Limit", type: "currency", section: "Subject of Insurance" },
  { key: "fine_arts_limit", label: "Fine Arts Limit", type: "currency", section: "Subject of Insurance" },
  { key: "fungus_limit", label: "Fungus/Wet/Dry Rot Limit", type: "currency", section: "Subject of Insurance" },
  { key: "coverage_extensions_limit", label: "Coverage Extensions Limit", type: "currency", section: "Subject of Insurance" },

  // Business Income / Extra Expense
  { key: "bi_ee_type", label: "BI/EE Measurement", type: "select", options: ["Actual Loss Sustained", "Monthly Limit of Indemnity", "Maximum Period of Indemnity"], section: "Business Income" },
  { key: "bi_ee_months", label: "BI/EE - # Months", type: "text", section: "Business Income" },
  { key: "bi_rental_value_included", label: "Rental Value Included", type: "checkbox", section: "Business Income" },
  { key: "bi_ordinary_payroll_included", label: "Ordinary Payroll Included", type: "checkbox", section: "Business Income" },
  { key: "bi_extended_days", label: "Extended BI Days", type: "text", section: "Business Income" },
  { key: "bi_dependent_properties_limit", label: "Dependent Properties Limit", type: "currency", section: "Business Income" },
  { key: "bi_dependent_outside_territory", label: "Dependent Properties Outside Territory", type: "select", options: ["Covered", "Not Covered"], section: "Business Income" },

  // Equipment Breakdown
  { key: "equipment_breakdown_coverage", label: "Equipment Breakdown Coverage", type: "checkbox", section: "Equipment Breakdown" },
  { key: "equipment_breakdown_limit", label: "Equipment Breakdown Limit", type: "currency", section: "Equipment Breakdown" },
  { key: "spoilage_limit", label: "Spoilage Limit", type: "currency", section: "Equipment Breakdown" },
  { key: "expediting_expense_limit", label: "Expediting Expense Limit", type: "currency", section: "Equipment Breakdown" },
  { key: "ammonia_contamination_limit", label: "Ammonia Contamination Limit", type: "currency", section: "Equipment Breakdown" },
  { key: "hazardous_substance_limit", label: "Hazardous Substance Limit", type: "currency", section: "Equipment Breakdown" },

  // Crime / Additional Property Coverages
  { key: "crime_employee_theft", label: "Crime - Employee Theft", type: "checkbox", section: "Crime / Additional Coverages" },
  { key: "crime_forgery", label: "Crime - Forgery", type: "checkbox", section: "Crime / Additional Coverages" },
  { key: "computer_fraud_limit", label: "Computer Fraud/FTF Limit", type: "currency", section: "Crime / Additional Coverages" },
  { key: "ordinance_or_law_limit", label: "Ordinance or Law B/C Limit", type: "currency", section: "Crime / Additional Coverages" },
  { key: "power_pac_blanket_limit", label: "Power Pac / Blanket Extensions Limit", type: "currency", section: "Crime / Additional Coverages" },

  // Premises 2
  { key: "premises_2_number", label: "Premises 2 #", type: "text", section: "Premises 2" },
  { key: "premises_2_address", label: "Premises 2 Address", type: "text", section: "Premises 2" },
  { key: "premises_2_city", label: "Premises 2 City", type: "text", section: "Premises 2" },
  { key: "premises_2_state", label: "Premises 2 State", type: "text", section: "Premises 2" },
  { key: "premises_2_zip", label: "Premises 2 ZIP", type: "text", section: "Premises 2" },
  { key: "premises_2_building_1", label: "P2 Building 1 Description", type: "text", section: "Premises 2" },
  { key: "premises_2_building_2", label: "P2 Building 2 Description", type: "text", section: "Premises 2" },

  // Mortgagee / Loss Payee
  { key: "mortgagee_1_name", label: "Mortgagee / Loss Payee 1", type: "text", section: "Mortgagee / Loss Payee" },
  { key: "mortgagee_1_address", label: "Mortgagee 1 Address", type: "text", section: "Mortgagee / Loss Payee" },
  { key: "mortgagee_1_clause", label: "Mortgagee 1 Clause (ISAOA ATIMA)", type: "text", section: "Mortgagee / Loss Payee" },
  { key: "mortgagee_2_name", label: "Mortgagee / Loss Payee 2", type: "text", section: "Mortgagee / Loss Payee" },
  { key: "mortgagee_2_address", label: "Mortgagee 2 Address", type: "text", section: "Mortgagee / Loss Payee" },
  { key: "mortgagee_3_name", label: "Mortgagee / Loss Payee 3", type: "text", section: "Mortgagee / Loss Payee" },
  { key: "mortgagee_3_address", label: "Mortgagee 3 Address", type: "text", section: "Mortgagee / Loss Payee" },

  // Construction Type
  { key: "construction_type", label: "Construction Type", type: "select", options: ["Frame", "Joisted Masonry", "Non-Combustible", "Masonry Non-Combustible", "Modified Fire Resistive", "Fire Resistive"], section: "Construction" },
  { key: "num_stories", label: "# Stories", type: "number", section: "Construction" },
  { key: "num_basements", label: "# Basements", type: "number", section: "Construction" },
  { key: "year_built", label: "Year Built", type: "text", section: "Construction" },
  { key: "total_area_sq_ft", label: "Total Area (Sq Ft)", type: "number", section: "Construction" },
  { key: "distance_to_hydrant", label: "Distance to Hydrant (ft)", type: "text", section: "Construction" },
  { key: "fire_district", label: "Fire District (mi)", type: "text", section: "Construction" },
  { key: "protection_class", label: "Protection Class", type: "text", section: "Construction" },
  { key: "occupancy_description", label: "Occupancy Description", type: "text", section: "Construction" },

  // Building Improvements
  { key: "roof_type", label: "Roof Type", type: "text", section: "Building Improvements" },
  { key: "wiring_year", label: "Wiring Year", type: "text", section: "Building Improvements" },
  { key: "plumbing_year", label: "Plumbing Year", type: "text", section: "Building Improvements" },
  { key: "roofing_year", label: "Roofing Year", type: "text", section: "Building Improvements" },
  { key: "heating_year", label: "Heating Year", type: "text", section: "Building Improvements" },
  { key: "wind_class", label: "Wind Class", type: "select", options: ["Resistive", "Semi-Resistive"], section: "Building Improvements" },

  // Heating Source
  { key: "primary_heat_type", label: "Primary Heat Type", type: "select", options: ["Boiler", "Solid Fuel", "Other"], section: "Heating Source" },
  { key: "secondary_heat_type", label: "Secondary Heat Type", type: "select", options: ["Boiler", "Solid Fuel", "None"], section: "Heating Source" },
  { key: "woodburning_stove", label: "Woodburning Stove or Fireplace Insert", type: "checkbox", section: "Heating Source" },
  { key: "woodburning_date_installed", label: "Date Installed", type: "text", section: "Heating Source" },

  // Protective Devices
  { key: "burglar_alarm_type", label: "Burglar Alarm Type", type: "select", options: ["Central", "Local", "Station Gong", "With Keys", "None"], section: "Protective Devices" },
  { key: "burglar_alarm_cert", label: "Burglar Alarm Certificate #", type: "text", section: "Protective Devices" },
  { key: "num_guards_watchmen", label: "# Guards / Watchmen", type: "number", section: "Protective Devices" },
  { key: "sprinkler_pct", label: "% Sprinklered", type: "text", section: "Protective Devices" },
  { key: "fire_alarm_manufacturer", label: "Fire Alarm Manufacturer", type: "text", section: "Protective Devices" },
  { key: "fire_alarm_type", label: "Fire Alarm Type", type: "select", options: ["Central Station", "Local Gong", "None"], section: "Protective Devices" },

  // Sinkhole / Mine Subsidence
  { key: "sinkhole_coverage", label: "Sinkhole Coverage", type: "select", options: ["Accept", "Reject"], section: "Special Coverages" },
  { key: "sinkhole_limit", label: "Sinkhole Limit", type: "currency", section: "Special Coverages" },
  { key: "mine_subsidence_coverage", label: "Mine Subsidence Coverage", type: "select", options: ["Accept", "Reject"], section: "Special Coverages" },
  { key: "mine_subsidence_limit", label: "Mine Subsidence Limit", type: "currency", section: "Special Coverages" },

  // Enhancement Flags
  { key: "auto_coverage_plus", label: "Auto Coverage Plus", type: "checkbox", section: "Enhancement Endorsements" },
  { key: "rental_reimbursement", label: "Rental Reimbursement", type: "checkbox", section: "Enhancement Endorsements" },
  { key: "roadside_assistance", label: "Roadside Assistance", type: "checkbox", section: "Enhancement Endorsements" },
  { key: "glass_deductible_waiver", label: "Glass Deductible Waiver", type: "checkbox", section: "Enhancement Endorsements" },
  { key: "hired_auto_pd", label: "Hired Auto Physical Damage", type: "checkbox", section: "Enhancement Endorsements" },
  { key: "gap_coverage", label: "GAP Coverage", type: "checkbox", section: "Enhancement Endorsements" },

  // Remarks
  { key: "property_remarks", label: "Remarks", type: "textarea", section: "Remarks" },

  // Signature
  { key: "producer_name", label: "Producer's Name", type: "text", section: "Signature" },
  { key: "producer_license_no", label: "State Producer License No.", type: "text", section: "Signature" },
  { key: "national_producer_number", label: "National Producer Number", type: "text", section: "Signature" },
  { key: "signature_date", label: "Date", type: "date", section: "Signature" },
];

// ============================================================
// Export all forms
// ============================================================

export const ACORD_FORMS: Record<string, AcordFormDefinition> = {
  "acord-125": {
    id: "acord-125",
    name: "ACORD 125",
    fullName: "Commercial Insurance Application (2016/03)",
    description: "Base commercial application — agency info, lines of business, policy info, applicant, premises, nature of business, general information, prior carrier, loss history.",
    fields: acord125Fields,
    pages: ["/acord-pages/125-page1.jpg", "/acord-pages/125-page2.jpg", "/acord-pages/125-page3.jpg", "/acord-pages/125-page4.jpg"],
  },
  "acord-126": {
    id: "acord-126",
    name: "ACORD 126",
    fullName: "Commercial General Liability Section (2009/08)",
    description: "CGL coverages/limits, schedule of hazards, claims-made, employee benefits liability, contractors, products/completed ops, and general information.",
    fields: acord126Fields,
    pages: [],
  },
  "acord-127": {
    id: "acord-127",
    name: "ACORD 127",
    fullName: "Business Auto Section (2010/05)",
    description: "Driver information, vehicle descriptions, garaging addresses, general information, and coverages/limits.",
    fields: acord127Fields,
    pages: ["/acord-pages/127-page1.jpg", "/acord-pages/127-page2.jpg", "/acord-pages/127-page3.jpg"],
  },
  "acord-130": {
    id: "acord-130",
    name: "ACORD 130",
    fullName: "Workers Compensation Application (2013/01)",
    description: "WC coverages, state rating information, individuals included/excluded, prior carrier/loss history, and 24 general information questions.",
    fields: acord130Fields,
    pages: ["/acord-pages/130-page1.jpg", "/acord-pages/130-page2.jpg", "/acord-pages/130-page3.jpg", "/acord-pages/130-page4.jpg"],
  },
  "acord-131": {
    id: "acord-131",
    name: "ACORD 131",
    fullName: "Umbrella / Excess Liability Section (2016/04)",
    description: "Umbrella/excess policy information, underlying insurance details, coverage/exposure checklist, vehicles, and additional exposures.",
    fields: acord131Fields,
    pages: ["/acord-pages/131-page1.jpg", "/acord-pages/131-page2.jpg", "/acord-pages/131-page3.jpg", "/acord-pages/131-page4.jpg", "/acord-pages/131-page5.jpg"],
  },
  "acord-140": {
    id: "acord-140",
    name: "ACORD 140",
    fullName: "Property Section (2014/12)",
    description: "Building construction, subject of insurance, protective devices, building improvements, heating source, and special coverages.",
    fields: acord140Fields,
    pages: ["/acord-pages/140-page1.jpg", "/acord-pages/140-page2.jpg", "/acord-pages/140-page3.jpg"],
  },
  "acord-75": {
    id: "acord-75",
    name: "ACORD 75",
    fullName: "Schedule of Underlying Insurance (Auto) (2010/07)",
    description: "Vehicle schedule, hired/non-owned auto, driver cross-reference, UM/UIM, carrier NAIC, and enhancement endorsements.",
    fields: [
      // Header
      { key: "agency_name", label: "Agency", type: "text", section: "Header", required: true },
      { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
      { key: "carrier", label: "Carrier", type: "text", section: "Header" },
      { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
      { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
      { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },
      { key: "insured_name", label: "Named Insured", type: "text", section: "Header", required: true },

      // Vehicle Schedule (up to 8)
      ...Array.from({ length: 8 }, (_, i) => {
        const n = i + 1;
        return [
          { key: `vehicle_${n}_year`, label: `Vehicle ${n} Year`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_make`, label: `Vehicle ${n} Make`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_model`, label: `Vehicle ${n} Model`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_vin`, label: `Vehicle ${n} VIN`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_body_type`, label: `Vehicle ${n} Body Type`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_cost_new`, label: `Vehicle ${n} Cost New`, type: "currency" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_garaging_zip`, label: `Vehicle ${n} Garaging ZIP`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_gvw`, label: `Vehicle ${n} GVW/GCW`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_comp_deductible`, label: `Vehicle ${n} Comp Deductible`, type: "currency" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_coll_deductible`, label: `Vehicle ${n} Collision Deductible`, type: "currency" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_territory`, label: `Vehicle ${n} Territory`, type: "text" as const, section: "Vehicle Schedule" },
          { key: `vehicle_${n}_use_class`, label: `Vehicle ${n} Use Class`, type: "text" as const, section: "Vehicle Schedule" },
        ];
      }).flat(),

      // Liability & UM/UIM
      { key: "auto_liability_limit", label: "Liability Limit (CSL)", type: "currency", section: "Coverages", required: true },
      { key: "um_uim_limit", label: "UM/UIM Limit (Each Accident)", type: "currency", section: "Coverages" },
      { key: "number_of_vehicles", label: "Number of Owned Vehicles", type: "text", section: "Coverages" },
      { key: "number_of_drivers", label: "Number of Drivers", type: "text", section: "Coverages" },

      // Hired Auto
      { key: "hired_auto_liability", label: "Hired Auto Liability", type: "select", options: ["Yes", "No"], section: "Hired / Non-Owned" },
      { key: "hired_auto_state", label: "Hired Auto State", type: "text", section: "Hired / Non-Owned" },
      { key: "hired_auto_cost_of_hire", label: "Estimated Annual Cost of Hire", type: "currency", section: "Hired / Non-Owned" },
      { key: "hired_auto_premium", label: "Hired Auto Premium", type: "currency", section: "Hired / Non-Owned" },

      // Non-Owned
      { key: "non_owned_liability", label: "Non-Owned Liability", type: "select", options: ["Yes", "No"], section: "Hired / Non-Owned" },
      { key: "non_owned_class", label: "Non-Owned Class", type: "text", section: "Hired / Non-Owned" },
      { key: "non_owned_num_employees", label: "Non-Owned # Employees", type: "number", section: "Hired / Non-Owned" },
      { key: "non_owned_premium", label: "Non-Owned Premium", type: "currency", section: "Hired / Non-Owned" },

      // Enhancement Endorsements
      { key: "auto_coverage_plus", label: "Auto Coverage Plus", type: "checkbox", section: "Enhancement Endorsements" },
      { key: "rental_reimbursement", label: "Rental Reimbursement", type: "checkbox", section: "Enhancement Endorsements" },
      { key: "roadside_assistance", label: "Roadside Assistance", type: "checkbox", section: "Enhancement Endorsements" },
      { key: "glass_deductible_waiver", label: "Glass Deductible Waiver", type: "checkbox", section: "Enhancement Endorsements" },
      { key: "hired_auto_pd", label: "Hired Auto Physical Damage", type: "checkbox", section: "Enhancement Endorsements" },
      { key: "gap_coverage", label: "GAP Coverage", type: "checkbox", section: "Enhancement Endorsements" },

      // Remarks & Signature
      { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
      { key: "producer_name", label: "Producer's Name", type: "text", section: "Signature" },
      { key: "signature_date", label: "Date", type: "date", section: "Signature" },
    ],
  },
};

export const ACORD_FORM_LIST = Object.values(ACORD_FORMS);
