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
    cgl_premium:            "GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A",
    property_premium:       "CommercialPropertyLineOfBusiness_PremiumAmount_A",
    auto_premium:           "CommercialVehicleLineOfBusiness_PremiumAmount_A",
    umbrella_premium:       "CommercialUmbrellaLineOfBusiness_PremiumAmount_A",
    // Premises
    full_time_employees:    "BusinessInformation_FullTimeEmployeeCount_A",
    part_time_employees:    "BusinessInformation_PartTimeEmployeeCount_A",
    annual_revenues:        "CommercialStructure_AnnualRevenueAmount_A",
    premises_address:       "CommercialStructure_PhysicalAddress_LineOne_A",
    premises_city:          "CommercialStructure_PhysicalAddress_CityName_A",
    premises_state:         "CommercialStructure_PhysicalAddress_StateOrProvinceCode_A",
    premises_zip:           "CommercialStructure_PhysicalAddress_PostalCode_A",
    description_of_operations: "BuildingOccupancy_OperationsDescription_A",
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
    driver_1_last_name:     "Driver_Surname_A",
    driver_1_dob:           "Driver_BirthDate_A",
    driver_1_license:       "Driver_LicenseNumberIdentifier_A",
    driver_1_state_lic:     "Driver_LicensedStateOrProvinceCode_A",
    driver_1_sex:           "Driver_GenderCode_A",
    driver_1_marital:       "Driver_MaritalStatusCode_A",
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
