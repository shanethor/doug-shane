/**
 * Runtime PDF field discovery — auto-generates complete index maps from PDF files.
 * 
 * Instead of hand-coding thousands of field indices, this module:
 * 1. Loads each ACORD PDF and enumerates ALL fields (TXT + CHK)
 * 2. Builds a name→index map using cleaned field names as keys
 * 3. Merges with our semantic alias maps for AI extraction compatibility
 * 
 * This ensures every single field on every form is addressable.
 */

import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS } from "./acord-field-map";

export interface FieldEntry {
  index: number;
  type: "TXT" | "CHK" | "OTHER";
  rawName: string;
  cleanName: string;
}

/** Clean a raw PDF field name into a usable key */
export function cleanFieldName(rawName: string): string {
  return rawName
    .replace(/^F\[0\]\.P\d+\[0\]\./g, "")   // Strip F[0].P1[0]. prefix
    .replace(/\[\d+\]$/g, "")                 // Strip trailing [0]
    .replace(/\s+/g, "_");                     // Spaces → underscores
}

/** Cache for loaded field maps */
const fieldMapCache: Record<string, Record<string, number>> = {};
const fieldEntriesCache: Record<string, FieldEntry[]> = {};

/**
 * Load a PDF and build a complete index map (cleanName → index) for ALL fields.
 * Results are cached per formId.
 */
export async function getFullIndexMap(formId: string): Promise<Record<string, number>> {
  if (fieldMapCache[formId]) return fieldMapCache[formId];

  const path = FILLABLE_PDF_PATHS[formId];
  if (!path) return {};

  try {
    const resp = await fetch(path);
    const bytes = await resp.arrayBuffer();
    const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
    const form = doc.getForm();
    const map: Record<string, number> = {};
    const entries: FieldEntry[] = [];

    form.getFields().forEach((f, i) => {
      const rawName = f.getName();
      const cleanName = cleanFieldName(rawName);
      const type = f instanceof PDFTextField ? "TXT" 
                 : f instanceof PDFCheckBox ? "CHK" 
                 : "OTHER";
      
      map[cleanName] = i;
      // Also add lowercase version for case-insensitive matching
      map[cleanName.toLowerCase()] = i;
      entries.push({ index: i, type: type as FieldEntry["type"], rawName, cleanName });
    });

    fieldMapCache[formId] = map;
    fieldEntriesCache[formId] = entries;
    return map;
  } catch (err) {
    console.warn(`[acord-pdf-fields] Failed to load ${formId}:`, err);
    return {};
  }
}

/** Get all field entries (for diagnostics) */
export async function getFieldEntries(formId: string): Promise<FieldEntry[]> {
  if (!fieldEntriesCache[formId]) await getFullIndexMap(formId);
  return fieldEntriesCache[formId] || [];
}

/** Clear cache (useful after PDF replacement) */
export function clearFieldCache(formId?: string) {
  if (formId) {
    delete fieldMapCache[formId];
    delete fieldEntriesCache[formId];
  } else {
    Object.keys(fieldMapCache).forEach(k => delete fieldMapCache[k]);
    Object.keys(fieldEntriesCache).forEach(k => delete fieldEntriesCache[k]);
  }
}

/**
 * Semantic alias maps — map our AI extraction keys to PDF field names.
 * These are small and maintainable. They DON'T need to cover every field,
 * just the ones that AI extraction produces with different names.
 * 
 * The full index map from getFullIndexMap() covers every field by its PDF name.
 */
export const SEMANTIC_ALIASES: Record<string, Record<string, string>> = {
  "acord-125": {
    // Our extraction key → PDF field clean name
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    agency_address:         "Producer_MailingAddress_LineOne_A",
    agency_city:            "Producer_MailingAddress_CityName_A",
    agency_state:           "Producer_MailingAddress_StateOrProvinceCode_A",
    agency_zip:             "Producer_MailingAddress_PostalCode_A",
    contact_name:           "Producer_ContactPerson_FullName_A",
    agency_phone:           "Producer_ContactPerson_PhoneNumber_A",
    agency_fax:             "Producer_FaxNumber_A",
    agency_email:           "Producer_ContactPerson_EmailAddress_A",
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    carrier:                "Insurer_FullName_A",
    naic_code:              "Insurer_NAICCode_A",
    company_program_name:   "Insurer_ProductDescription_A",
    program_code:           "Insurer_ProductCode_A",
    policy_number:          "Policy_PolicyNumberIdentifier_A",
    underwriter:            "Insurer_Underwriter_FullName_A",
    underwriter_office:     "Insurer_Underwriter_OfficeIdentifier_A",
    proposed_eff_date:      "Policy_EffectiveDate_A",
    proposed_exp_date:      "Policy_ExpirationDate_A",
    payment_plan:           "Policy_Payment_PaymentScheduleCode_A",
    method_of_payment:      "Policy_PaymentMethod_MethodDescription_A",
    audit:                  "Policy_Audit_FrequencyCode_A",
    deposit_amount:         "Policy_Payment_DepositAmount_A",
    minimum_premium:        "Policy_Payment_MinimumPremiumAmount_A",
    policy_premium:         "Policy_Payment_EstimatedTotalAmount_A",
    applicant_name:         "NamedInsured_FullName_A",
    insured_name:           "NamedInsured_FullName_A",
    mailing_address:        "NamedInsured_MailingAddress_LineOne_A",
    city:                   "NamedInsured_MailingAddress_CityName_A",
    state:                  "NamedInsured_MailingAddress_StateOrProvinceCode_A",
    zip:                    "NamedInsured_MailingAddress_PostalCode_A",
    gl_code:                "NamedInsured_GeneralLiabilityCode_A",
    sic_code:               "NamedInsured_SICCode_A",
    naics_code:             "NamedInsured_NAICSCode_A",
    fein:                   "NamedInsured_TaxIdentifier_A",
    business_phone:         "NamedInsured_Primary_PhoneNumber_A",
    website:                "NamedInsured_Primary_WebsiteAddress_A",
    // LOB checkboxes
    lob_commercial_general_liability: "Policy_LineOfBusiness_CommercialGeneralLiability_A",
    lob_commercial_property: "Policy_LineOfBusiness_CommercialProperty_A",
    lob_business_auto:      "Policy_LineOfBusiness_BusinessAutoIndicator_A",
    lob_umbrella:           "Policy_LineOfBusiness_UmbrellaIndicator_A",
    lob_crime:              "Policy_LineOfBusiness_CrimeIndicator_A",
    lob_cyber:              "Policy_LineOfBusiness_CyberAndPrivacy_A",
    lob_inland_marine:      "Policy_LineOfBusiness_CommercialInlandMarineIndicator_A",
    lob_boiler_machinery:   "Policy_LineOfBusiness_BoilerAndMachineryIndicator_A",
    lob_bop:                "Policy_LineOfBusiness_BusinessOwnersIndicator_A",
    // LOB "Other" (used for WC on ACORD 125)
    lob_other:              "Policy_LineOfBusiness_OtherIndicator_A",
    other_lob_description:  "Policy_LineOfBusiness_OtherLineOfBusinessDescription_A",
    other_lob_premium:      "Policy_SectionAttached_OtherPremiumAmount_A",
    // LOB premiums
    cgl_premium:            "GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A",
    property_premium:       "CommercialPropertyLineOfBusiness_PremiumAmount_A",
    auto_premium:           "CommercialVehicleLineOfBusiness_PremiumAmount_A",
    umbrella_premium:       "CommercialUmbrellaLineOfBusiness_PremiumAmount_A",
    // Nature of Business (distinct from description_of_operations)
    nature_of_business:     "NatureOfBusiness_NatureOfBusinessDescription_A",
    // Premises city limits & interest
    chk_inside_city:        "PremisesInformation_CityLimitsIndicator_InsideIndicator_A",
    chk_outside_city:       "PremisesInformation_CityLimitsIndicator_OutsideIndicator_A",
    chk_owner:              "PremisesInformation_InterestCode_OwnerIndicator_A",
    chk_tenant:             "PremisesInformation_InterestCode_TenantIndicator_A",
    premises_loc_number:    "PremisesInformation_LocationNumber_A",
    // Premises
    full_time_employees:    "BusinessInformation_FullTimeEmployeeCount_A",
    part_time_employees:    "BusinessInformation_PartTimeEmployeeCount_A",
    annual_revenues:        "CommercialStructure_AnnualRevenueAmount_A",
    premises_address:       "CommercialStructure_PhysicalAddress_LineOne_A",
    premises_city:          "CommercialStructure_PhysicalAddress_CityName_A",
    premises_state:         "CommercialStructure_PhysicalAddress_StateOrProvinceCode_A",
    premises_zip:           "CommercialStructure_PhysicalAddress_PostalCode_A",
    description_of_operations: "BuildingOccupancy_OperationsDescription_A",
    // ── General Information Y/N Questions (Page 3) ──
    subsidiary_of_another:      "CommercialPolicy_Question_AAICode_A",
    has_subsidiaries:           "CommercialPolicy_Question_AAJCode_A",
    safety_program:             "CommercialPolicy_Question_KAACode_A",
    exposure_flammables:        "CommercialPolicy_Question_ABCCode_A",
    other_insurance_same_company:"CommercialPolicy_Question_AAHCode_A",
    policy_declined_cancelled:  "CommercialPolicy_Question_AACCode_A",
    past_sexual_abuse_claims:   "CommercialPolicy_Question_AADCode_A",
    fraud_conviction:           "CommercialPolicy_Question_KABCode_A",
    fire_safety_violations:     "CommercialPolicy_Question_AAFCode_A",
    bankruptcy:                 "CommercialPolicy_Question_KAKCode_A",
    judgement_or_lien:          "CommercialPolicy_Question_KALCode_A",
    business_in_trust:          "CommercialPolicy_Question_ABBCode_A",
    foreign_operations:         "CommercialPolicy_Question_KACCode_A",
    other_business_ventures:    "CommercialPolicy_Question_KAMCode_A",
    operates_drones:            "CommercialPolicy_Question_KANCode_A",
    hires_drone_operators:      "CommercialPolicy_Question_KAOCode_A",
    general_info_remarks:       "CommercialPolicy_RemarkText_A",
    // Parent / Subsidiary detail fields
    parent_company_name:        "BusinessInformation_ParentOrganizationName_A",
  },
  "acord-126": {
    form_edition:           "Form_EditionIdentifier_A",
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    policy_number:          "Policy_PolicyNumberIdentifier_A",
    effective_date:         "Policy_EffectiveDate_A",
    carrier:                "Insurer_FullName_A",
    naic_code:              "Insurer_NAICCode_A",
    insured_name:           "NamedInsured_FullName_A",
    applicant_name:         "NamedInsured_FullName_A",
    // Coverages
    chk_commercial_general_liability: "GeneralLiability_CoverageIndicator_A",
    chk_claims_made:        "GeneralLiability_ClaimsMadeIndicator_A",
    chk_occurrence:         "GeneralLiability_OccurrenceIndicator_A",
    chk_owners_contractors: "GeneralLiability_OwnersAndContractorsProtectiveIndicator_A",
    coverage_type_other:    "GeneralLiability_OtherCoverageDescription_A",
    deductible_pd:          "GeneralLiability_PropertyDamage_DeductibleAmount_A",
    deductible_bi:          "GeneralLiability_BodilyInjury_DeductibleAmount_A",
    deductible_other_desc:  "GeneralLiability_OtherDeductibleDescription_A",
    deductible_other_amt:   "GeneralLiability_OtherDeductibleAmount_A",
    general_aggregate:      "GeneralLiability_GeneralAggregate_LimitAmount_A",
    aggregate_applies_other:"GeneralLiability_GeneralAggregate_LimitAppliesToCode_A",
    products_aggregate:     "GeneralLiability_ProductsAndCompletedOperations_AggregateLimitAmount_A",
    personal_adv_injury:    "GeneralLiability_PersonalAndAdvertisingInjury_LimitAmount_A",
    each_occurrence:        "GeneralLiability_EachOccurrence_LimitAmount_A",
    fire_damage:            "GeneralLiability_FireDamageRentedPremises_EachOccurrenceLimitAmount_A",
    medical_payments:       "GeneralLiability_MedicalExpense_EachPersonLimitAmount_A",
    ebl_limit:              "GeneralLiability_EmployeeBenefits_LimitAmount_A",
    premiums_prem_ops:      "GeneralLiability_PremisesOperations_PremiumAmount_A",
    premiums_products:      "GeneralLiability_Products_PremiumAmount_A",
    premiums_other:         "GeneralLiability_OtherCoveragePremiumAmount_A",
    premiums_total:         "GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A",
    total_premium:          "GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A",
    other_coverages_endorsements: "GeneralLiabilityLineOfBusiness_RemarkText_A",
    // Limit applies per checkboxes
    chk_limit_policy:       "GeneralLiability_GeneralAggregate_LimitAppliesPerPolicyIndicator_A",
    chk_limit_project:      "GeneralLiability_GeneralAggregate_LimitAppliesPerProjectIndicator_A",
    chk_limit_location:     "GeneralLiability_GeneralAggregate_LimitAppliesPerLocationIndicator_A",
    chk_limit_other:        "GeneralLiability_GeneralAggregate_LimitAppliesToOtherIndicator_A",
    // Deductible checkboxes
    chk_deductible_pd:      "GeneralLiability_PropertyDamage_DeductibleIndicator_A",
    chk_deductible_bi:      "GeneralLiability_BodilyInjury_DeductibleIndicator_A",
    chk_per_claim:          "GeneralLiability_DeductiblePerClaimIndicator_A",
    chk_per_occurrence:     "GeneralLiability_DeductiblePerOccurrenceIndicator_A",
    // Schedule of Hazards — Row 1
    hazard_loc_1:           "GeneralLiability_Hazard_LocationProducerIdentifier_A",
    hazard_bldg_1:          "GeneralLiability_Hazard_HazardProducerIdentifier_A",
    hazard_code_1:          "GeneralLiability_Hazard_ClassCode_A",
    hazard_premium_basis_1: "GeneralLiability_Hazard_PremiumBasisCode_A",
    hazard_exposure_1:      "GeneralLiability_Hazard_Exposure_A",
    hazard_terr_1:          "GeneralLiability_Hazard_TerritoryCode_A",
    hazard_rate_premops_1:  "GeneralLiability_Hazard_PremisesOperationsRate_A",
    hazard_rate_products_1: "GeneralLiability_Hazard_ProductsRate_A",
    hazard_premium_premops_1:"GeneralLiability_Hazard_PremisesOperationsPremiumAmount_A",
    hazard_premium_products_1:"GeneralLiability_Hazard_ProductsPremiumAmount_A",
    hazard_classification_1:"GeneralLiability_Hazard_Classification_A",
    // Row 2
    hazard_loc_2:           "GeneralLiability_Hazard_LocationProducerIdentifier_B",
    hazard_bldg_2:          "GeneralLiability_Hazard_HazardProducerIdentifier_B",
    hazard_code_2:          "GeneralLiability_Hazard_ClassCode_B",
    hazard_premium_basis_2: "GeneralLiability_Hazard_PremiumBasisCode_B",
    hazard_exposure_2:      "GeneralLiability_Hazard_Exposure_B",
    hazard_terr_2:          "GeneralLiability_Hazard_TerritoryCode_B",
    hazard_rate_premops_2:  "GeneralLiability_Hazard_PremisesOperationsRate_B",
    hazard_rate_products_2: "GeneralLiability_Hazard_ProductsRate_B",
    hazard_premium_premops_2:"GeneralLiability_Hazard_PremisesOperationsPremiumAmount_B",
    hazard_premium_products_2:"GeneralLiability_Hazard_ProductsPremiumAmount_B",
    hazard_classification_2:"GeneralLiability_Hazard_Classification_B",
    // Row 3
    hazard_loc_3:           "GeneralLiability_Hazard_LocationProducerIdentifier_C",
    hazard_bldg_3:          "GeneralLiability_Hazard_HazardProducerIdentifier_C",
    hazard_code_3:          "GeneralLiability_Hazard_ClassCode_C",
    hazard_premium_basis_3: "GeneralLiability_Hazard_PremiumBasisCode_C",
    hazard_exposure_3:      "GeneralLiability_Hazard_Exposure_C",
    hazard_terr_3:          "GeneralLiability_Hazard_TerritoryCode_C",
    hazard_rate_premops_3:  "GeneralLiability_Hazard_PremisesOperationsRate_C",
    hazard_rate_products_3: "GeneralLiability_Hazard_ProductsRate_C",
    hazard_premium_premops_3:"GeneralLiability_Hazard_PremisesOperationsPremiumAmount_C",
    hazard_premium_products_3:"GeneralLiability_Hazard_ProductsPremiumAmount_C",
    hazard_classification_3:"GeneralLiability_Hazard_Classification_C",
    // Claims-Made
    retroactive_date:       "GeneralLiability_ClaimsMade_ProposedRetroactiveDate_A",
    entry_date_claims_made: "GeneralLiability_ClaimsMade_UninterruptedCoverageEntryDate_A",
    // Employee Benefits
    ebl_deductible_per_claim:"GeneralLiability_EmployeeBenefits_PerClaimDeductibleAmount_A",
    ebl_num_employees:      "GeneralLiability_EmployeeBenefits_EmployeeCount_A",
    ebl_retroactive_date:   "GeneralLiability_EmployeeBenefits_RetroactiveDate_A",
    // Contractors
    type_work_subcontracted:"GeneralLiabilityLineOfBusiness_TypeOfWorkSubcontractedDescription_A",
    paid_to_subcontractors: "Contractors_SubcontractorsPaidAmount_A",
    pct_work_subcontracted: "Contractors_WorkSubcontractedPercent_A",
    // Remarks & Signature
    remarks_126:            "GeneralLiabilityLineOfBusiness_RemarkText_B",
    producer_name:          "Producer_AuthorizedRepresentative_FullName_A",
    producer_license_no:    "Producer_StateLicenseIdentifier_A",
    national_producer_number:"Producer_NationalIdentifier_A",
    // ── ACORD 126 Y/N Questions — Contractors ──
    draws_plans_for_others:     "Contractors_Question_AABCode_A",
    blasting_explosives:        "Contractors_Question_AAICode_A",
    excavation_underground:     "Contractors_Question_AACCode_A",
    subs_less_coverage:         "Contractors_Question_ABBCode_A",
    subs_without_coi:           "Contractors_Question_AADCode_A",
    leases_equipment:           "Contractors_Question_AAECode_A",
    // ── ACORD 126 Y/N Questions — Products / Completed Operations ──
    installs_services_products: "GeneralLiabilityLineOfBusiness_Question_AAJCode_A",
    foreign_products_sold:      "GeneralLiabilityLineOfBusiness_Question_ABACode_A",
    rd_new_products:            "GeneralLiabilityLineOfBusiness_Question_ABBCode_A",
    guarantees_warranties:      "GeneralLiabilityLineOfBusiness_Question_ABCCode_A",
    aircraft_space_products:    "GeneralLiabilityLineOfBusiness_Question_ABDCode_A",
    products_recalled:          "GeneralLiabilityLineOfBusiness_Question_ABECode_A",
    products_others_label:      "GeneralLiabilityLineOfBusiness_Question_ABFCode_A",
    products_under_others_label:"GeneralLiabilityLineOfBusiness_Question_ABGCode_A",
    vendors_coverage_required:  "GeneralLiabilityLineOfBusiness_Question_ABHCode_A",
    named_insured_sells_to_named:"GeneralLiabilityLineOfBusiness_Question_ABICode_A",
    // ── ACORD 126 Y/N Questions — General Information (Page 3) ──
    medical_facilities:         "GeneralLiabilityLineOfBusiness_Question_AAHCode_A",
    radioactive_exposure:       "GeneralLiabilityLineOfBusiness_Question_AAICode_A",
    hazardous_material_ops:     "GeneralLiabilityLineOfBusiness_Question_ABJCode_A",
    ops_sold_acquired:          "GeneralLiabilityLineOfBusiness_Question_ACACode_A",
    rent_equipment_to_others:   "GeneralLiabilityLineOfBusiness_Question_ACJCode_A",
    watercraft_docks:           "GeneralLiabilityLineOfBusiness_Question_ACBCode_A",
    parking_facilities:         "GeneralLiabilityLineOfBusiness_Question_ACCCode_A",
    parking_fee_charged:        "Contractors_Question_AAHCode_A",
    recreation_facilities:      "GeneralLiabilityLineOfBusiness_Question_ACDCode_A",
    swimming_pool:              "GeneralLiabilityLineOfBusiness_Question_KAGCode_A",
    social_events:              "GeneralLiabilityLineOfBusiness_Question_ACECode_A",
    structural_alterations:     "GeneralLiabilityLineOfBusiness_Question_KAACode_A",
    demolition_exposure:        "GeneralLiabilityLineOfBusiness_Question_KAHCode_A",
    joint_ventures:             "GeneralLiabilityLineOfBusiness_Question_ACFCode_A",
    lease_employees:            "GeneralLiabilityLineOfBusiness_Question_KABCode_A",
    // ── ACORD 126 Y/N Questions — General Information (Page 4) ──
    labor_interchange:          "GeneralLiabilityLineOfBusiness_Question_ACGCode_A",
    day_care_facilities:        "GeneralLiabilityLineOfBusiness_Question_ACHCode_A",
    crimes_on_premises:         "GeneralLiabilityLineOfBusiness_Question_AABCode_A",
    safety_security_policy:     "GeneralLiabilityLineOfBusiness_Question_AACCode_A",
    safety_claims_in_literature:"GeneralLiabilityLineOfBusiness_Question_AADCode_A",
  },
  "acord-127": {
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    policy_number:          "Policy_PolicyNumberIdentifier_A",
    effective_date:         "Policy_EffectiveDate_A",
    carrier:                "Insurer_FullName_A",
    naic_code:              "Insurer_NAICCode_A",
    insured_name:           "NamedInsured_FullName_A",
    applicant_name:         "NamedInsured_FullName_A",
    driver_1_name:          "Driver_GivenName_A",
    driver_1_first_name:    "Driver_GivenName_A",
    driver_1_last_name:     "Driver_Surname_A",
    driver_1_dob:           "Driver_BirthDate_A",
    driver_1_license:       "Driver_LicenseNumberIdentifier_A",
    driver_1_state_lic:     "Driver_LicensedStateOrProvinceCode_A",
    driver_1_license_state: "Driver_LicensedStateOrProvinceCode_A",
    driver_1_sex:           "Driver_GenderCode_A",
    driver_1_marital:       "Driver_MaritalStatusCode_A",

    driver_2_name:          "Driver_GivenName_B",
    driver_2_first_name:    "Driver_GivenName_B",
    driver_2_last_name:     "Driver_Surname_B",
    driver_2_dob:           "Driver_BirthDate_B",
    driver_2_license:       "Driver_LicenseNumberIdentifier_B",
    driver_2_state_lic:     "Driver_LicensedStateOrProvinceCode_B",
    driver_2_license_state: "Driver_LicensedStateOrProvinceCode_B",
    driver_2_sex:           "Driver_GenderCode_B",
    driver_2_marital:       "Driver_MaritalStatusCode_B",

    driver_3_name:          "Driver_GivenName_C",
    driver_3_first_name:    "Driver_GivenName_C",
    driver_3_last_name:     "Driver_Surname_C",
    driver_3_dob:           "Driver_BirthDate_C",
    driver_3_license:       "Driver_LicenseNumberIdentifier_C",
    driver_3_state_lic:     "Driver_LicensedStateOrProvinceCode_C",
    driver_3_license_state: "Driver_LicensedStateOrProvinceCode_C",
    driver_3_sex:           "Driver_GenderCode_C",
    driver_3_marital:       "Driver_MaritalStatusCode_C",

    driver_4_name:          "Driver_GivenName_D",
    driver_4_first_name:    "Driver_GivenName_D",
    driver_4_last_name:     "Driver_Surname_D",
    driver_4_dob:           "Driver_BirthDate_D",
    driver_4_license:       "Driver_LicenseNumberIdentifier_D",
    driver_4_state_lic:     "Driver_LicensedStateOrProvinceCode_D",
    driver_4_license_state: "Driver_LicensedStateOrProvinceCode_D",
    driver_4_sex:           "Driver_GenderCode_D",
    driver_4_marital:       "Driver_MaritalStatusCode_D",

    driver_5_name:          "Driver_GivenName_E",
    driver_5_first_name:    "Driver_GivenName_E",
    driver_5_last_name:     "Driver_Surname_E",
    driver_5_dob:           "Driver_BirthDate_E",
    driver_5_license:       "Driver_LicenseNumberIdentifier_E",
    driver_5_state_lic:     "Driver_LicensedStateOrProvinceCode_E",
    driver_5_license_state: "Driver_LicensedStateOrProvinceCode_E",
    driver_5_sex:           "Driver_GenderCode_E",
    driver_5_marital:       "Driver_MaritalStatusCode_E",

    driver_6_name:          "Driver_GivenName_F",
    driver_6_first_name:    "Driver_GivenName_F",
    driver_6_last_name:     "Driver_Surname_F",
    driver_6_dob:           "Driver_BirthDate_F",
    driver_6_license:       "Driver_LicenseNumberIdentifier_F",
    driver_6_state_lic:     "Driver_LicensedStateOrProvinceCode_F",
    driver_6_license_state: "Driver_LicensedStateOrProvinceCode_F",
    driver_6_sex:           "Driver_GenderCode_F",
    driver_6_marital:       "Driver_MaritalStatusCode_F",
    // ── ACORD 127 Y/N Questions — General Information ──
    vehicles_not_solely_owned:    "CommercialVehicleLineOfBusiness_Question_AAJCode_A",
    over_50pct_employees_use_autos:"CommercialVehicleLineOfBusiness_Question_ABACode_A",
    vehicle_maintenance_program:  "CommercialVehicleLineOfBusiness_Question_KADCode_A",
    vehicles_leased_to_others:    "CommercialVehicleLineOfBusiness_Question_ABCCode_A",
    modified_vehicles:            "CommercialVehicleLineOfBusiness_Question_AAGCode_A",
    icc_puc_filings:              "CommercialVehicleLineOfBusiness_Question_AAECode_A",
    transporting_hazmat:          "CommercialVehicleLineOfBusiness_Question_AAFCode_A",
    hold_harmless_agreements:     "CommercialVehicleLineOfBusiness_Question_AABCode_A",
    vehicles_used_by_family:      "CommercialVehicleLineOfBusiness_Question_AACCode_A",
    mvr_verifications:            "CommercialVehicleLineOfBusiness_Question_KAECode_A",
    driver_recruiting_method:     "CommercialVehicleLineOfBusiness_Question_KAFCode_A",
    drivers_no_wc:                "CommercialVehicleLineOfBusiness_Question_AAHCode_A",
    vehicles_not_scheduled:       "CommercialVehicleLineOfBusiness_Question_AADCode_A",
    drivers_with_violations:      "CommercialVehicleLineOfBusiness_Question_AAICode_A",
    agent_inspected_vehicles:     "CommercialVehicleLineOfBusiness_Question_ABBCode_A",
    all_vehicles_in_fleet:        "CommercialVehicleLineOfBusiness_Question_KAGCode_A",
    // ── Vehicle Description fields ──
    vehicle_1_year:     "Vehicle_ModelYear_A",
    vehicle_1_make:     "Vehicle_Make_A",
    vehicle_1_model:    "Vehicle_Model_A",
    vehicle_1_body_type:"Vehicle_BodyStyleCode_A",
    vehicle_1_vin:      "Vehicle_VehicleIdentificationNumber_A",
    vehicle_1_cost_new: "Vehicle_OriginalCostNewAmount_A",
    vehicle_1_gvw:      "Vehicle_GrossVehicleWeight_A",
    vehicle_1_radius:   "Vehicle_OperatingRadiusMilesCount_A",

    vehicle_2_year:     "Vehicle_ModelYear_B",
    vehicle_2_make:     "Vehicle_Make_B",
    vehicle_2_model:    "Vehicle_Model_B",
    vehicle_2_body_type:"Vehicle_BodyStyleCode_B",
    vehicle_2_vin:      "Vehicle_VehicleIdentificationNumber_B",
    vehicle_2_cost_new: "Vehicle_OriginalCostNewAmount_B",
    vehicle_2_gvw:      "Vehicle_GrossVehicleWeight_B",
    vehicle_2_radius:   "Vehicle_OperatingRadiusMilesCount_B",

    vehicle_3_year:     "Vehicle_ModelYear_C",
    vehicle_3_make:     "Vehicle_Make_C",
    vehicle_3_model:    "Vehicle_Model_C",
    vehicle_3_body_type:"Vehicle_BodyStyleCode_C",
    vehicle_3_vin:      "Vehicle_VehicleIdentificationNumber_C",
    vehicle_3_cost_new: "Vehicle_OriginalCostNewAmount_C",
    vehicle_3_gvw:      "Vehicle_GrossVehicleWeight_C",
    vehicle_3_radius:   "Vehicle_OperatingRadiusMilesCount_C",

    vehicle_4_year:     "Vehicle_ModelYear_D",
    vehicle_4_make:     "Vehicle_Make_D",
    vehicle_4_model:    "Vehicle_Model_D",
    vehicle_4_body_type:"Vehicle_BodyStyleCode_D",
    vehicle_4_vin:      "Vehicle_VehicleIdentificationNumber_D",
    vehicle_4_cost_new: "Vehicle_OriginalCostNewAmount_D",
    vehicle_4_gvw:      "Vehicle_GrossVehicleWeight_D",
    vehicle_4_radius:   "Vehicle_OperatingRadiusMilesCount_D",

    vehicle_5_year:     "Vehicle_ModelYear_E",
    vehicle_5_make:     "Vehicle_Make_E",
    vehicle_5_model:    "Vehicle_Model_E",
    vehicle_5_body_type:"Vehicle_BodyStyleCode_E",
    vehicle_5_vin:      "Vehicle_VehicleIdentificationNumber_E",
    vehicle_5_cost_new: "Vehicle_OriginalCostNewAmount_E",
    vehicle_5_gvw:      "Vehicle_GrossVehicleWeight_E",
    vehicle_5_radius:   "Vehicle_OperatingRadiusMilesCount_E",

    vehicle_6_year:     "Vehicle_ModelYear_F",
    vehicle_6_make:     "Vehicle_Make_F",
    vehicle_6_model:    "Vehicle_Model_F",
    vehicle_6_body_type:"Vehicle_BodyStyleCode_F",
    vehicle_6_vin:      "Vehicle_VehicleIdentificationNumber_F",
    vehicle_6_cost_new: "Vehicle_OriginalCostNewAmount_F",
    vehicle_6_gvw:      "Vehicle_GrossVehicleWeight_F",
    vehicle_6_radius:   "Vehicle_OperatingRadiusMilesCount_F",

    vehicle_7_year:     "Vehicle_ModelYear_G",
    vehicle_7_make:     "Vehicle_Make_G",
    vehicle_7_model:    "Vehicle_Model_G",
    vehicle_7_body_type:"Vehicle_BodyStyleCode_G",
    vehicle_7_vin:      "Vehicle_VehicleIdentificationNumber_G",
    vehicle_7_cost_new: "Vehicle_OriginalCostNewAmount_G",
    vehicle_7_gvw:      "Vehicle_GrossVehicleWeight_G",
    vehicle_7_radius:   "Vehicle_OperatingRadiusMilesCount_G",

    vehicle_8_year:     "Vehicle_ModelYear_H",
    vehicle_8_make:     "Vehicle_Make_H",
    vehicle_8_model:    "Vehicle_Model_H",
    vehicle_8_body_type:"Vehicle_BodyStyleCode_H",
    vehicle_8_vin:      "Vehicle_VehicleIdentificationNumber_H",
    vehicle_8_cost_new: "Vehicle_OriginalCostNewAmount_H",
    vehicle_8_gvw:      "Vehicle_GrossVehicleWeight_H",
    vehicle_8_radius:   "Vehicle_OperatingRadiusMilesCount_H",
  },
  "acord-130": {
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    contact_name:           "Producer_ContactPerson_FullName_A",
    agency_phone:           "Producer_ContactPerson_PhoneNumber_A",
    agency_fax:             "Producer_FaxNumber_A",
    agency_email:           "Producer_ContactPerson_EmailAddress_A",
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    carrier:                "Insurer_FullName_A",
    underwriter:            "Insurer_Underwriter_FullName_A",
    insured_name:           "NamedInsured_FullName_A",
    applicant_name:         "NamedInsured_FullName_A",
    mailing_address:        "NamedInsured_MailingAddress_LineOne_A",
    city:                   "NamedInsured_MailingAddress_CityName_A",
    state:                  "NamedInsured_MailingAddress_StateOrProvinceCode_A",
    zip:                    "NamedInsured_MailingAddress_PostalCode_A",
    sic_code:               "NamedInsured_SICCode_A",
    naics_code:             "NamedInsured_NAICSCode_A",
    fein:                   "NamedInsured_TaxIdentifier_A",
    proposed_eff_date:      "Policy_EffectiveDate_A",
    proposed_exp_date:      "Policy_ExpirationDate_A",
    wc_each_accident:       "WorkersCompensationEmployersLiability_EmployersLiability_EachAccidentLimitAmount_A",
    wc_disease_policy_limit:"WorkersCompensationEmployersLiability_EmployersLiability_DiseasePolicyLimitAmount_A",
    wc_disease_each_employee:"WorkersCompensationEmployersLiability_EmployersLiability_DiseaseEachEmployeeLimitAmount_A",
    total_estimated_premium:"WorkersCompensationLineOfBusiness_TotalEstimatedAnnualPremiumAllStatesAmount_A",
    // ── ACORD 130 Y/N Questions — General Information ──
    wc_aircraft_watercraft:     "WorkersCompensationLineOfBusiness_Question_ABECode_A",
    wc_hazardous_material:      "WorkersCompensationLineOfBusiness_Question_ACDCode_A",
    wc_underground_above_15ft:  "WorkersCompensationLineOfBusiness_Question_AADCode_A",
    wc_barges_vessels_docks:    "WorkersCompensationLineOfBusiness_Question_KARCode_A",
    wc_other_business:          "WorkersCompensationLineOfBusiness_Question_KASCode_A",
    subcontractors_used:        "WorkersCompensationLineOfBusiness_Question_KATCode_A",
    wc_work_sublet_no_coi:      "WorkersCompensationLineOfBusiness_Question_KAUCode_A",
    workplace_safety_program:   "WorkersCompensationLineOfBusiness_Question_ABCCode_A",
    wc_group_transportation:    "WorkersCompensationLineOfBusiness_Question_ABICode_A",
    wc_under_16_over_60:        "WorkersCompensationLineOfBusiness_Question_AAECode_A",
    seasonal_employees:         "WorkersCompensationLineOfBusiness_Question_KAVCode_A",
    wc_volunteer_labor:         "WorkersCompensationLineOfBusiness_Question_AAFCode_A",
    wc_physical_handicaps:      "WorkersCompensationLineOfBusiness_Question_ABJCode_A",
    wc_travel_out_of_state:     "WorkersCompensationLineOfBusiness_Question_ABHCode_A",
    wc_athletic_teams:          "WorkersCompensationLineOfBusiness_Question_AABCode_A",
    wc_physicals_required:      "WorkersCompensationLineOfBusiness_Question_ACBCode_A",
    wc_other_insurance_same:    "WorkersCompensationLineOfBusiness_Question_ABACode_A",
    wc_prior_declined:          "WorkersCompensationLineOfBusiness_Question_AAICode_A",
    wc_health_plans:            "WorkersCompensationLineOfBusiness_Question_ABFCode_A",
    wc_employees_other_business:"WorkersCompensationLineOfBusiness_Question_KAWCode_A",
    wc_lease_employees:         "WorkersCompensationLineOfBusiness_Question_AAGCode_A",
    wc_work_at_home:            "WorkersCompensationLineOfBusiness_Question_ABGCode_A",
    wc_tax_liens_bankruptcy:    "WorkersCompensationLineOfBusiness_Question_KAXCode_A",
    wc_unpaid_premium:          "WorkersCompensationLineOfBusiness_Question_KAYCode_A",
  },
  "acord-131": {
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    policy_number:          "Policy_PolicyNumberIdentifier_A",
    effective_date:         "Policy_EffectiveDate_A",
    carrier:                "Insurer_FullName_A",
    naic_code:              "Insurer_NAICCode_A",
    insured_name:           "NamedInsured_FullName_A",
    applicant_name:         "NamedInsured_FullName_A",
    each_occurrence_limit:  "ExcessUmbrella_Umbrella_EachOccurrenceAmount_A",
    aggregate_limit:        "ExcessUmbrella_Umbrella_AggregateAmount_A",
    self_insured_retention: "ExcessUmbrella_Umbrella_DeductibleOrRetentionAmount_A",
  },
  "acord-140": {
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    policy_number:          "Policy_PolicyNumberIdentifier_A",
    effective_date:         "Policy_EffectiveDate_A",
    carrier:                "Insurer_FullName_A",
    naic_code:              "Insurer_NAICCode_A",
    insured_name:           "NamedInsured_FullName_A",
    applicant_name:         "NamedInsured_FullName_A",
    construction_type:      "Construction_ConstructionCode_A",
    year_built:             "CommercialStructure_BuiltYear_A",
    num_stories:            "Construction_StoreyCount_A",
    total_area_sq_ft:       "Construction_BuildingArea_A",
    building_amount:        "CommercialProperty_Premises_LimitAmount_A",
    protection_class:       "BuildingFireProtection_ProtectionClassCode_A",
    distance_to_hydrant:    "BuildingFireProtection_HydrantDistanceFeetCount_A",
    wiring_year:            "BuildingImprovement_WiringYear_A",
    roofing_year:           "BuildingImprovement_RoofingYear_A",
    plumbing_year:          "BuildingImprovement_PlumbingYear_A",
    heating_year:           "BuildingImprovement_HeatingYear_A",
    roof_type:              "Construction_RoofMaterialCode_A",
  },
  "acord-75": {
    transaction_date:       "Form_CompletionDate_A",
    agency_name:            "Producer_FullName_A",
    agency_phone:           "Producer_ContactPerson_PhoneNumber_A",
    agency_customer_id:     "Producer_CustomerIdentifier_A",
    insured_name:           "NamedInsured_FullName_A",
    applicant_name:         "NamedInsured_FullName_A",
    carrier:                "Insurer_FullName_A",
    each_occurrence:        "GeneralLiability_EachOccurrence_LimitAmount_A",
    general_aggregate:      "GeneralLiability_GeneralAggregate_LimitAmount_A",
  },
};

/**
 * Resolve a semantic key to a field index for a given form.
 * 1. Check if the key directly matches a PDF field name in the full map
 * 2. Check semantic aliases → PDF field name → full map
 * 3. Return undefined if not found
 */
export async function resolveFieldIndex(
  formId: string,
  semanticKey: string
): Promise<number | undefined> {
  const fullMap = await getFullIndexMap(formId);
  
  // Direct match against PDF field names
  if (fullMap[semanticKey] !== undefined) return fullMap[semanticKey];
  if (fullMap[semanticKey.toLowerCase()] !== undefined) return fullMap[semanticKey.toLowerCase()];
  
  // Check aliases
  const aliases = SEMANTIC_ALIASES[formId];
  if (aliases && aliases[semanticKey]) {
    const pdfName = aliases[semanticKey];
    if (fullMap[pdfName] !== undefined) return fullMap[pdfName];
    if (fullMap[pdfName.toLowerCase()] !== undefined) return fullMap[pdfName.toLowerCase()];
  }
  
  return undefined;
}

/**
 * Build a complete index map for a form, merging PDF field names with semantic aliases.
 * Returns Record<string, number> where keys include both PDF names and our semantic aliases.
 */
export async function getMergedIndexMap(formId: string): Promise<Record<string, number>> {
  const fullMap = await getFullIndexMap(formId);
  const merged = { ...fullMap };
  
  // Add semantic aliases
  const aliases = SEMANTIC_ALIASES[formId];
  if (aliases) {
    for (const [semanticKey, pdfName] of Object.entries(aliases)) {
      const idx = fullMap[pdfName] ?? fullMap[pdfName.toLowerCase()];
      if (idx !== undefined) {
        merged[semanticKey] = idx;
      }
    }
  }
  
  return merged;
}
