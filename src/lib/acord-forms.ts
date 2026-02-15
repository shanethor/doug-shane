// ACORD form field definitions for common commercial insurance forms

export type AcordFormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "number" | "currency";
  options?: string[];
  required?: boolean;
  section: string;
};

export type AcordFormDefinition = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  fields: AcordFormField[];
};

// ============================================================
// ACORD 125 — Commercial Insurance Application
// ============================================================
const acord125Fields: AcordFormField[] = [
  // Agency Information
  { key: "agency_name", label: "Agency Name", type: "text", section: "Agency Information", required: true },
  { key: "agency_phone", label: "Agency Phone", type: "text", section: "Agency Information" },
  { key: "agency_fax", label: "Agency Fax", type: "text", section: "Agency Information" },
  { key: "agency_email", label: "Agency Email", type: "text", section: "Agency Information" },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Agency Information" },
  { key: "carrier", label: "Carrier", type: "text", section: "Agency Information" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Agency Information" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Agency Information" },

  // Policy Information
  { key: "proposed_eff_date", label: "Proposed Effective Date", type: "date", section: "Policy Information", required: true },
  { key: "proposed_exp_date", label: "Proposed Expiration Date", type: "date", section: "Policy Information", required: true },
  { key: "billing_plan", label: "Billing Plan", type: "select", options: ["Direct", "Agency"], section: "Policy Information" },
  { key: "payment_plan", label: "Payment Plan", type: "select", options: ["Annual", "Semi-Annual", "Quarterly", "Monthly"], section: "Policy Information" },
  { key: "method_of_payment", label: "Method of Payment", type: "select", options: ["Check", "EFT", "Credit Card", "Premium Finance"], section: "Policy Information" },
  { key: "audit", label: "Audit", type: "select", options: ["Annual", "Semi-Annual", "Quarterly", "Monthly", "N/A"], section: "Policy Information" },

  // Applicant Information
  { key: "applicant_name", label: "Applicant Name (First Named Insured)", type: "text", section: "Applicant Information", required: true },
  { key: "mailing_address", label: "Mailing Address", type: "text", section: "Applicant Information", required: true },
  { key: "city", label: "City", type: "text", section: "Applicant Information", required: true },
  { key: "state", label: "State", type: "text", section: "Applicant Information", required: true },
  { key: "zip", label: "ZIP Code", type: "text", section: "Applicant Information", required: true },
  { key: "business_phone", label: "Business Phone", type: "text", section: "Applicant Information" },
  { key: "website", label: "Website Address", type: "text", section: "Applicant Information" },
  { key: "fein", label: "FEIN or SSN", type: "text", section: "Applicant Information", required: true },
  { key: "sic_code", label: "SIC Code", type: "text", section: "Applicant Information" },
  { key: "naics_code", label: "NAICS Code", type: "text", section: "Applicant Information" },
  { key: "gl_code", label: "GL Code", type: "text", section: "Applicant Information" },
  { key: "business_type", label: "Business Type", type: "select", options: ["Corporation", "LLC", "Partnership", "Sole Proprietor", "Joint Venture", "Not For Profit", "Subchapter S Corp", "Trust", "Individual"], section: "Applicant Information", required: true },

  // Lines of Business
  { key: "lines_of_business", label: "Lines of Business", type: "textarea", section: "Lines of Business" },
  { key: "cgl_premium", label: "Commercial General Liability Premium", type: "currency", section: "Lines of Business" },
  { key: "property_premium", label: "Commercial Property Premium", type: "currency", section: "Lines of Business" },
  { key: "auto_premium", label: "Business Auto Premium", type: "currency", section: "Lines of Business" },
  { key: "umbrella_premium", label: "Umbrella Premium", type: "currency", section: "Lines of Business" },
  { key: "crime_premium", label: "Crime Premium", type: "currency", section: "Lines of Business" },
  { key: "cyber_premium", label: "Cyber & Privacy Premium", type: "currency", section: "Lines of Business" },

  // Premises Information
  { key: "premises_address", label: "Premises Street Address", type: "text", section: "Premises Information" },
  { key: "premises_city", label: "Premises City", type: "text", section: "Premises Information" },
  { key: "premises_state", label: "Premises State", type: "text", section: "Premises Information" },
  { key: "premises_zip", label: "Premises ZIP", type: "text", section: "Premises Information" },
  { key: "premises_interest", label: "Interest", type: "select", options: ["Owner", "Tenant"], section: "Premises Information" },
  { key: "full_time_employees", label: "# Full Time Employees", type: "number", section: "Premises Information" },
  { key: "part_time_employees", label: "# Part Time Employees", type: "number", section: "Premises Information" },
  { key: "annual_revenues", label: "Annual Revenues", type: "currency", section: "Premises Information", required: true },
  { key: "occupied_sq_ft", label: "Occupied Area (Sq Ft)", type: "number", section: "Premises Information" },
  { key: "total_building_sq_ft", label: "Total Building Area (Sq Ft)", type: "number", section: "Premises Information" },

  // Nature of Business
  { key: "date_business_started", label: "Date Business Started", type: "date", section: "Nature of Business" },
  { key: "business_category", label: "Business Category", type: "select", options: ["Apartments", "Condominiums", "Contractor", "Institutional", "Manufacturing", "Office", "Restaurant", "Retail", "Service", "Wholesale", "Other"], section: "Nature of Business" },
  { key: "description_of_operations", label: "Description of Primary Operations", type: "textarea", section: "Nature of Business", required: true },

  // General Information
  { key: "subsidiary_of_another", label: "Is applicant a subsidiary of another entity?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "has_subsidiaries", label: "Does applicant have any subsidiaries?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "safety_program", label: "Is a formal safety program in operation?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "exposure_flammables", label: "Any exposure to flammables, explosives, chemicals?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "policy_declined_cancelled", label: "Any policy declined, cancelled or non-renewed in prior 3 years?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "past_sexual_abuse_claims", label: "Past losses relating to sexual abuse, discrimination, negligent hiring?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "fraud_conviction", label: "Any applicant convicted of fraud, bribery, arson in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "fire_safety_violations", label: "Any uncorrected fire/safety code violations?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "bankruptcy", label: "Foreclosure, repossession, or bankruptcy in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "foreign_operations", label: "Any foreign operations or foreign products?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "operates_drones", label: "Does applicant own/lease/operate any drones?", type: "select", options: ["Yes", "No"], section: "General Information" },
  { key: "general_info_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Information" },

  // Prior Carrier Information
  { key: "prior_carrier_name", label: "Prior Carrier Name", type: "text", section: "Prior Carrier Information" },
  { key: "prior_policy_number", label: "Prior Policy Number", type: "text", section: "Prior Carrier Information" },
  { key: "prior_eff_date", label: "Prior Effective Date", type: "date", section: "Prior Carrier Information" },
  { key: "prior_exp_date", label: "Prior Expiration Date", type: "date", section: "Prior Carrier Information" },
  { key: "prior_gl_premium", label: "Prior GL Premium", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_auto_premium", label: "Prior Auto Premium", type: "currency", section: "Prior Carrier Information" },
  { key: "prior_property_premium", label: "Prior Property Premium", type: "currency", section: "Prior Carrier Information" },

  // Loss History
  { key: "no_losses", label: "No losses to report", type: "checkbox", section: "Loss History" },
  { key: "loss_history", label: "Loss History Details", type: "textarea", section: "Loss History" },
  { key: "total_losses", label: "Total Losses", type: "currency", section: "Loss History" },

  // Signature
  { key: "producer_name", label: "Producer's Name", type: "text", section: "Signature" },
  { key: "producer_license_no", label: "State Producer License No.", type: "text", section: "Signature" },
  { key: "national_producer_number", label: "National Producer Number", type: "text", section: "Signature" },
  { key: "signature_date", label: "Date", type: "date", section: "Signature" },

  // Remarks
  { key: "remarks", label: "Remarks / Processing Instructions", type: "textarea", section: "Remarks" },
];

// ============================================================
// ACORD 126 — Commercial General Liability Section
// ============================================================
const acord126Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency Name", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "insured_name", label: "Insured Name", type: "text", section: "Header", required: true },
  { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },

  // Coverage
  { key: "coverage_type", label: "Coverage Type", type: "select", options: ["Occurrence", "Claims-Made"], section: "Coverage", required: true },
  { key: "general_aggregate", label: "General Aggregate Limit", type: "currency", section: "Coverage", required: true },
  { key: "products_aggregate", label: "Products/Completed Ops Aggregate", type: "currency", section: "Coverage" },
  { key: "each_occurrence", label: "Each Occurrence Limit", type: "currency", section: "Coverage", required: true },
  { key: "personal_adv_injury", label: "Personal & Advertising Injury", type: "currency", section: "Coverage" },
  { key: "fire_damage", label: "Fire Damage (any one fire)", type: "currency", section: "Coverage" },
  { key: "medical_payments", label: "Medical Payments (any one person)", type: "currency", section: "Coverage" },
  { key: "aggregate_applies_per", label: "Aggregate Applies Per", type: "select", options: ["Policy", "Project", "Location"], section: "Coverage" },
  { key: "deductible_amount", label: "Deductible Amount", type: "currency", section: "Coverage" },
  { key: "deductible_applies_to", label: "Deductible Applies To", type: "select", options: ["BI", "PD", "BI & PD"], section: "Coverage" },

  // Schedule of Hazards
  { key: "hazard_classification_1", label: "Classification Description 1", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_code_1", label: "Classification Code 1", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_exposure_1", label: "Exposure 1", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_premium_1", label: "Premium 1", type: "currency", section: "Schedule of Hazards" },
  { key: "hazard_classification_2", label: "Classification Description 2", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_code_2", label: "Classification Code 2", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_exposure_2", label: "Exposure 2", type: "text", section: "Schedule of Hazards" },
  { key: "hazard_premium_2", label: "Premium 2", type: "currency", section: "Schedule of Hazards" },

  // Employee Benefits Liability
  { key: "ebl_each_employee", label: "EBL Each Employee Limit", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_aggregate", label: "EBL Aggregate", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_deductible", label: "EBL Deductible", type: "currency", section: "Employee Benefits Liability" },
  { key: "ebl_num_employees", label: "Number of Employees", type: "number", section: "Employee Benefits Liability" },

  // Claims-Made (if applicable)
  { key: "retroactive_date", label: "Retroactive Date", type: "date", section: "Claims-Made Details" },
  { key: "pending_litigation_date", label: "Pending/Prior Litigation Date", type: "date", section: "Claims-Made Details" },
  { key: "extended_reporting_period", label: "Extended Reporting Period", type: "select", options: ["Yes", "No"], section: "Claims-Made Details" },

  // General Questions
  { key: "any_work_underground", label: "Any work performed underground or involving underpinning?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "hazardous_waste_involved", label: "Any hazardous waste involvement?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "athletic_participants", label: "Any athletic/sports participants involved?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "swimming_pool", label: "Swimming pool on premises?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "products_sold", label: "Any products manufactured, sold, or distributed?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "watercraft_operations", label: "Any watercraft operations?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "professional_services", label: "Any professional services rendered?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "alcohol_served", label: "Any alcohol sold, served, or distributed?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "general_questions_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Questions" },

  // Remarks
  { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
];

// ============================================================
// ACORD 130 — Workers Compensation Application
// ============================================================
const acord130Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency Name", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "insured_name", label: "Insured Name", type: "text", section: "Header", required: true },

  // Policy Information
  { key: "effective_date", label: "Effective Date", type: "date", section: "Policy Information", required: true },
  { key: "expiration_date", label: "Expiration Date", type: "date", section: "Policy Information", required: true },
  { key: "state_of_operation", label: "State(s) of Operation", type: "text", section: "Policy Information", required: true },

  // Applicant Information
  { key: "mailing_address", label: "Mailing Address", type: "text", section: "Applicant Information", required: true },
  { key: "city", label: "City", type: "text", section: "Applicant Information", required: true },
  { key: "state", label: "State", type: "text", section: "Applicant Information", required: true },
  { key: "zip", label: "ZIP", type: "text", section: "Applicant Information", required: true },
  { key: "fein", label: "FEIN", type: "text", section: "Applicant Information", required: true },
  { key: "business_type", label: "Business Type", type: "select", options: ["Corporation", "LLC", "Partnership", "Sole Proprietor", "Individual", "Joint Venture", "Trust"], section: "Applicant Information", required: true },
  { key: "nature_of_business", label: "Nature of Business", type: "text", section: "Applicant Information", required: true },
  { key: "sic_code", label: "SIC Code", type: "text", section: "Applicant Information" },
  { key: "description_of_operations", label: "Description of Operations", type: "textarea", section: "Applicant Information", required: true },

  // Rating Information
  { key: "class_code_1", label: "Class Code 1", type: "text", section: "Rating Information" },
  { key: "class_description_1", label: "Class Description 1", type: "text", section: "Rating Information" },
  { key: "num_employees_1", label: "Number of Employees (Class 1)", type: "number", section: "Rating Information" },
  { key: "annual_remuneration_1", label: "Annual Remuneration (Class 1)", type: "currency", section: "Rating Information" },
  { key: "rate_1", label: "Rate (Class 1)", type: "text", section: "Rating Information" },
  { key: "est_premium_1", label: "Estimated Premium (Class 1)", type: "currency", section: "Rating Information" },
  { key: "class_code_2", label: "Class Code 2", type: "text", section: "Rating Information" },
  { key: "class_description_2", label: "Class Description 2", type: "text", section: "Rating Information" },
  { key: "num_employees_2", label: "Number of Employees (Class 2)", type: "number", section: "Rating Information" },
  { key: "annual_remuneration_2", label: "Annual Remuneration (Class 2)", type: "currency", section: "Rating Information" },
  { key: "rate_2", label: "Rate (Class 2)", type: "text", section: "Rating Information" },
  { key: "est_premium_2", label: "Estimated Premium (Class 2)", type: "currency", section: "Rating Information" },
  { key: "total_estimated_premium", label: "Total Estimated Annual Premium", type: "currency", section: "Rating Information" },

  // Experience Modification
  { key: "experience_mod_rate", label: "Experience Modification Rate", type: "text", section: "Experience Modification" },
  { key: "mod_effective_date", label: "Mod Effective Date", type: "date", section: "Experience Modification" },
  { key: "interstate_rating", label: "Interstate Rating?", type: "select", options: ["Yes", "No"], section: "Experience Modification" },

  // Officers/Partners
  { key: "officer_1_name", label: "Officer/Partner 1 Name", type: "text", section: "Officers/Partners" },
  { key: "officer_1_title", label: "Officer/Partner 1 Title", type: "text", section: "Officers/Partners" },
  { key: "officer_1_ownership", label: "Officer/Partner 1 % Ownership", type: "text", section: "Officers/Partners" },
  { key: "officer_1_included", label: "Officer/Partner 1 Included/Excluded", type: "select", options: ["Included", "Excluded"], section: "Officers/Partners" },
  { key: "officer_1_remuneration", label: "Officer/Partner 1 Remuneration", type: "currency", section: "Officers/Partners" },
  { key: "officer_2_name", label: "Officer/Partner 2 Name", type: "text", section: "Officers/Partners" },
  { key: "officer_2_title", label: "Officer/Partner 2 Title", type: "text", section: "Officers/Partners" },
  { key: "officer_2_ownership", label: "Officer/Partner 2 % Ownership", type: "text", section: "Officers/Partners" },
  { key: "officer_2_included", label: "Officer/Partner 2 Included/Excluded", type: "select", options: ["Included", "Excluded"], section: "Officers/Partners" },
  { key: "officer_2_remuneration", label: "Officer/Partner 2 Remuneration", type: "currency", section: "Officers/Partners" },

  // General Questions
  { key: "subcontractors_used", label: "Are subcontractors used?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "subcontractor_certs", label: "Certificates of insurance obtained from subcontractors?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "employees_travel_out_of_state", label: "Do employees travel out of state?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "seasonal_employees", label: "Any seasonal employees?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "leased_employees", label: "Any leased employees?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "workplace_safety_program", label: "Workplace safety program in effect?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "prior_workers_comp_carrier", label: "Prior Workers Comp Carrier", type: "text", section: "General Questions" },
  { key: "wc_general_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Questions" },

  // Loss History
  { key: "wc_loss_history", label: "Workers Comp Loss History (5 Years)", type: "textarea", section: "Loss History" },
  { key: "total_wc_claims", label: "Total Claims (5 years)", type: "number", section: "Loss History" },
  { key: "total_wc_incurred", label: "Total Incurred (5 years)", type: "currency", section: "Loss History" },

  // Remarks
  { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
];

// ============================================================
// ACORD 131 — Umbrella/Excess Liability
// ============================================================
const acord131Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency Name", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "insured_name", label: "Insured Name", type: "text", section: "Header", required: true },

  // Policy Information
  { key: "effective_date", label: "Effective Date", type: "date", section: "Policy Information", required: true },
  { key: "expiration_date", label: "Expiration Date", type: "date", section: "Policy Information", required: true },
  { key: "policy_type", label: "Policy Type", type: "select", options: ["Umbrella", "Excess"], section: "Policy Information", required: true },
  { key: "coverage_basis", label: "Coverage Basis", type: "select", options: ["Occurrence", "Claims-Made"], section: "Policy Information" },

  // Limits
  { key: "each_occurrence_limit", label: "Each Occurrence Limit", type: "currency", section: "Limits", required: true },
  { key: "aggregate_limit", label: "Aggregate Limit", type: "currency", section: "Limits", required: true },
  { key: "self_insured_retention", label: "Self-Insured Retention", type: "currency", section: "Limits" },
  { key: "annual_premium", label: "Annual Premium", type: "currency", section: "Limits" },

  // Underlying Insurance
  { key: "underlying_gl_carrier", label: "Underlying GL Carrier", type: "text", section: "Underlying Insurance" },
  { key: "underlying_gl_policy_number", label: "Underlying GL Policy Number", type: "text", section: "Underlying Insurance" },
  { key: "underlying_gl_limits", label: "Underlying GL Limits", type: "text", section: "Underlying Insurance" },
  { key: "underlying_auto_carrier", label: "Underlying Auto Carrier", type: "text", section: "Underlying Insurance" },
  { key: "underlying_auto_policy_number", label: "Underlying Auto Policy Number", type: "text", section: "Underlying Insurance" },
  { key: "underlying_auto_limits", label: "Underlying Auto Limits", type: "text", section: "Underlying Insurance" },
  { key: "underlying_employers_carrier", label: "Underlying Employers Liability Carrier", type: "text", section: "Underlying Insurance" },
  { key: "underlying_employers_policy_number", label: "Underlying EL Policy Number", type: "text", section: "Underlying Insurance" },
  { key: "underlying_employers_limits", label: "Underlying EL Limits", type: "text", section: "Underlying Insurance" },

  // Business Info
  { key: "annual_revenues", label: "Annual Revenues", type: "currency", section: "Business Information" },
  { key: "total_employees", label: "Total Employees", type: "number", section: "Business Information" },
  { key: "num_vehicles", label: "Number of Vehicles", type: "number", section: "Business Information" },
  { key: "description_of_operations", label: "Description of Operations", type: "textarea", section: "Business Information" },

  // General Questions
  { key: "any_umbrella_claims", label: "Any umbrella/excess claims in last 5 years?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "any_professional_liability", label: "Any professional liability exposure?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "foreign_operations_umbrella", label: "Any foreign operations?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "watercraft_aircraft", label: "Any watercraft or aircraft exposure?", type: "select", options: ["Yes", "No"], section: "General Questions" },
  { key: "umbrella_general_remarks", label: "Explain all Yes responses", type: "textarea", section: "General Questions" },

  // Loss History
  { key: "umbrella_loss_history", label: "Umbrella/Excess Loss History", type: "textarea", section: "Loss History" },

  // Remarks
  { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
];

// ============================================================
// ACORD 140 — Property Section
// ============================================================
const acord140Fields: AcordFormField[] = [
  // Header
  { key: "agency_name", label: "Agency Name", type: "text", section: "Header", required: true },
  { key: "agency_customer_id", label: "Agency Customer ID", type: "text", section: "Header" },
  { key: "carrier", label: "Carrier", type: "text", section: "Header" },
  { key: "naic_code", label: "NAIC Code", type: "text", section: "Header" },
  { key: "policy_number", label: "Policy Number", type: "text", section: "Header" },
  { key: "insured_name", label: "Insured Name", type: "text", section: "Header", required: true },
  { key: "effective_date", label: "Effective Date", type: "date", section: "Header", required: true },

  // Coverage
  { key: "coverage_form", label: "Coverage Form", type: "select", options: ["Basic", "Broad", "Special"], section: "Coverage", required: true },
  { key: "valuation", label: "Valuation", type: "select", options: ["Replacement Cost", "Actual Cash Value", "Agreed Value", "Functional Replacement Cost"], section: "Coverage", required: true },
  { key: "coinsurance", label: "Coinsurance %", type: "select", options: ["80%", "90%", "100%", "Agreed Amount"], section: "Coverage" },
  { key: "inflation_guard", label: "Inflation Guard %", type: "text", section: "Coverage" },
  { key: "blanket_coverage", label: "Blanket Coverage", type: "select", options: ["Yes", "No"], section: "Coverage" },

  // Building Information
  { key: "location_number", label: "Location Number", type: "text", section: "Building Information" },
  { key: "building_number", label: "Building Number", type: "text", section: "Building Information" },
  { key: "building_address", label: "Building Address", type: "text", section: "Building Information", required: true },
  { key: "building_city", label: "City", type: "text", section: "Building Information", required: true },
  { key: "building_state", label: "State", type: "text", section: "Building Information", required: true },
  { key: "building_zip", label: "ZIP", type: "text", section: "Building Information", required: true },
  { key: "construction_type", label: "Construction Type", type: "select", options: ["Frame", "Joisted Masonry", "Non-Combustible", "Masonry Non-Combustible", "Modified Fire Resistive", "Fire Resistive"], section: "Building Information", required: true },
  { key: "num_stories", label: "Number of Stories", type: "number", section: "Building Information" },
  { key: "year_built", label: "Year Built", type: "text", section: "Building Information", required: true },
  { key: "total_area_sq_ft", label: "Total Area (Sq Ft)", type: "number", section: "Building Information" },
  { key: "occupancy", label: "Occupancy", type: "text", section: "Building Information" },
  { key: "area_occupied_by_insured", label: "% Occupied by Insured", type: "text", section: "Building Information" },

  // Amounts of Insurance
  { key: "building_amount", label: "Building Amount", type: "currency", section: "Amounts of Insurance" },
  { key: "bpp_amount", label: "Business Personal Property Amount", type: "currency", section: "Amounts of Insurance" },
  { key: "business_income_amount", label: "Business Income Amount", type: "currency", section: "Amounts of Insurance" },
  { key: "extra_expense_amount", label: "Extra Expense Amount", type: "currency", section: "Amounts of Insurance" },
  { key: "rental_value_amount", label: "Rental Value Amount", type: "currency", section: "Amounts of Insurance" },
  { key: "building_deductible", label: "Building Deductible", type: "currency", section: "Amounts of Insurance" },
  { key: "bpp_deductible", label: "BPP Deductible", type: "currency", section: "Amounts of Insurance" },

  // Protective Devices
  { key: "sprinkler_system", label: "Automatic Sprinkler System", type: "select", options: ["Yes - Full", "Yes - Partial", "No"], section: "Protective Devices" },
  { key: "fire_alarm", label: "Fire Alarm", type: "select", options: ["Central Station", "Local", "None"], section: "Protective Devices" },
  { key: "burglar_alarm", label: "Burglar Alarm", type: "select", options: ["Central Station", "Local", "None"], section: "Protective Devices" },
  { key: "fire_extinguishers", label: "Fire Extinguishers", type: "select", options: ["Yes", "No"], section: "Protective Devices" },
  { key: "deadbolts", label: "Deadbolt Locks", type: "select", options: ["Yes", "No"], section: "Protective Devices" },

  // Roof Information
  { key: "roof_type", label: "Roof Type", type: "select", options: ["Built-Up", "Single Ply Membrane", "Metal", "Tile/Slate", "Shingle", "Other"], section: "Roof Information" },
  { key: "roof_age", label: "Roof Age (years)", type: "number", section: "Roof Information" },
  { key: "roof_condition", label: "Roof Condition", type: "select", options: ["Excellent", "Good", "Fair", "Poor"], section: "Roof Information" },
  { key: "roof_last_updated", label: "Year of Last Update", type: "text", section: "Roof Information" },

  // Updates
  { key: "electrical_update_year", label: "Electrical Update Year", type: "text", section: "Building Updates" },
  { key: "plumbing_update_year", label: "Plumbing Update Year", type: "text", section: "Building Updates" },
  { key: "heating_update_year", label: "Heating/AC Update Year", type: "text", section: "Building Updates" },

  // Remarks
  { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
];

// ============================================================
// Export all form definitions
// ============================================================
export const ACORD_FORMS: Record<string, AcordFormDefinition> = {
  "acord-125": {
    id: "acord-125",
    name: "ACORD 125",
    fullName: "Commercial Insurance Application",
    description: "General commercial insurance application covering applicant info, business details, premises, general information, prior carrier info, and loss history.",
    fields: acord125Fields,
  },
  "acord-126": {
    id: "acord-126",
    name: "ACORD 126",
    fullName: "Commercial General Liability Section",
    description: "CGL section covering occurrence/claims-made coverage, schedule of hazards, employee benefits liability, and liability-specific questions.",
    fields: acord126Fields,
  },
  "acord-130": {
    id: "acord-130",
    name: "ACORD 130",
    fullName: "Workers Compensation Application",
    description: "Workers compensation application covering classification codes, experience modification, officers/partners, and workers comp loss history.",
    fields: acord130Fields,
  },
  "acord-131": {
    id: "acord-131",
    name: "ACORD 131",
    fullName: "Umbrella / Excess Liability",
    description: "Umbrella/excess liability section covering underlying insurance, limits, self-insured retention, and excess liability questions.",
    fields: acord131Fields,
  },
  "acord-140": {
    id: "acord-140",
    name: "ACORD 140",
    fullName: "Property Section",
    description: "Property section covering building information, construction details, protective devices, amounts of insurance, roof information, and building updates.",
    fields: acord140Fields,
  },
};

export const ACORD_FORM_LIST = Object.values(ACORD_FORMS);
