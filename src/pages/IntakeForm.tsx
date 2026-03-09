import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ingestDocument } from "@/services/aiRouter";
import { getQuestionsForCoverage, groupQuestionsBySection, SECTION_LABELS, type AcordQuestion, type AcordSection } from "@/lib/acord-question-defs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Car, Home, Sailboat, Umbrella, Plus, Trash2, CheckCircle, AlertTriangle,
  Loader2, Upload, FileText, X, Shield, Building2, User, Check, AlertCircle as AlertCircleIcon,
  ChevronLeft, ChevronRight, Droplets, Gem, Download,
} from "lucide-react";
import { toast } from "sonner";
import { generateBorPdf, downloadPdf } from "@/lib/bor-pdf-generator";

/* ─── Shared Constants ─── */
const COVERAGE_OPTIONS = [
  "General Liability", "Workers Compensation", "Commercial Auto",
  "Commercial Property", "Umbrella / Excess", "Professional Liability (E&O)",
  "Cyber Liability", "Business Owners Policy (BOP)", "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const DOCUMENT_CHECKLIST = [
  { key: "dec_pages", label: "Current Declaration Pages" },
  { key: "drivers_license", label: "Driver's License (all drivers)" },
  { key: "vehicle_registration", label: "Vehicle Registration" },
  { key: "prior_policy", label: "Prior Insurance Policy" },
  { key: "home_inspection", label: "Home Inspection / 4-Point" },
  { key: "roof_cert", label: "Roof Certification" },
  { key: "flood_elevation", label: "Flood Elevation Certificate" },
  { key: "photos", label: "Property Photos" },
  { key: "loss_runs", label: "Loss Runs" },
  { key: "financials", label: "Financial Statements" },
  { key: "other", label: "Other Documents" },
];

/* ─── Personal Lines Types ─── */
type Driver = { name: string; dob: string; license_number: string; license_state: string; gender: string; marital_status: string; violations: string };
type ExcludedDriver = { name: string; reason: string };
type Vehicle = { year: string; make: string; model: string; vin: string; usage: string; garaging_zip: string; is_rideshare_delivery: "" | "yes" | "no"; rideshare_service: string };
type HomeInfo = { address: string; city: string; state: string; zip: string; year_built: string; square_footage: string; construction_type: string; roof_type: string; roof_year: string; occupancy: string; rent_roll: string; heating_type: string; electrical_update_year: string; plumbing_update_year: string; has_pool: boolean; has_trampoline: boolean; has_dog: boolean; dog_breed: string; alarm_type: string; fire_extinguishers: boolean; smoke_detectors: boolean; deadbolts: boolean; sprinkler_system: boolean; claims_5_years: string };
type Boat = { year: string; make: string; model: string; length: string; hull_type: string; engine_type: string; horsepower: string; value: string; storage_location: string };
type UmbrellaInfo = { wants_umbrella: "" | "yes" | "no"; requested_limit: string; major_violations: "" | "yes" | "no"; has_watercraft_unlisted: "" | "yes" | "no"; has_rental_unlisted: "" | "yes" | "no"; has_pool_trampoline_unlisted: "" | "yes" | "no"; acknowledge_umbrella: boolean };
type FloodInfo = { flood_zone: string; has_flood_insurance: string; current_flood_carrier: string; current_flood_premium: string; flood_policy_number: string; building_coverage: string; contents_coverage: string; elevation_cert: string; foundation_type: string; lowest_floor_elevation: string; num_flood_claims: string; preferred_deductible: string };
type RecreationalVehicle = {
  rec_type: string; year: string; make: string; model: string;
  vin_serial: string; garaging_zip: string; usage_type: string;
  liability_limit: string; wants_comp: "" | "yes" | "no";
  wants_collision: "" | "yes" | "no"; comp_deductible: string;
  collision_deductible: string; trailer_coverage: "" | "yes" | "no";
  accessories_value: string; um_uim: "" | "yes" | "no";
  med_pay: "" | "yes" | "no"; towing: "" | "yes" | "no";
};
type PersonalArticle = { description: string; category: string; estimated_value: string };

interface AutoCoverage {
  liability_type: "" | "split" | "csl";
  bi_limit: string;
  pd_limit: string;
  csl_limit: string;
  um_uim_limit: string;
  med_pay_limit: string;
  pip_limit: string;
  wants_comprehensive: "" | "yes" | "no";
  comp_deductible: string;
  wants_collision: "" | "yes" | "no";
  collision_deductible: string;
  wants_towing: "" | "yes" | "no";
  towing_limit: string;
  wants_rental: "" | "yes" | "no";
  rental_limit: string;
  current_carrier: string;
  policy_expiration: string;
  current_liability_limits: string;
  continuous_coverage: "" | "yes" | "no";
  vehicle_ownership: string;
  lienholder_name: string;
  lienholder_address: string;
  acknowledge_disclosure: boolean;
  authorize_underwriting: boolean;
}

const emptyAutoCoverage = (): AutoCoverage => ({
  liability_type: "", bi_limit: "", pd_limit: "", csl_limit: "",
  um_uim_limit: "", med_pay_limit: "", pip_limit: "",
  wants_comprehensive: "", comp_deductible: "",
  wants_collision: "", collision_deductible: "",
  wants_towing: "", towing_limit: "",
  wants_rental: "", rental_limit: "",
  current_carrier: "", policy_expiration: "", current_liability_limits: "",
  continuous_coverage: "", vehicle_ownership: "",
  lienholder_name: "", lienholder_address: "",
  acknowledge_disclosure: false, authorize_underwriting: false,
});

const emptyDriver = (): Driver => ({ name: "", dob: "", license_number: "", license_state: "", gender: "", marital_status: "", violations: "" });
const emptyExcludedDriver = (): ExcludedDriver => ({ name: "", reason: "" });
const emptyVehicle = (): Vehicle => ({ year: "", make: "", model: "", vin: "", usage: "", garaging_zip: "", is_rideshare_delivery: "", rideshare_service: "" });
const emptyHome = (): HomeInfo => ({ address: "", city: "", state: "", zip: "", year_built: "", square_footage: "", construction_type: "", roof_type: "", roof_year: "", occupancy: "", rent_roll: "", heating_type: "", electrical_update_year: "", plumbing_update_year: "", has_pool: false, has_trampoline: false, has_dog: false, dog_breed: "", alarm_type: "", fire_extinguishers: false, smoke_detectors: false, deadbolts: false, sprinkler_system: false, claims_5_years: "" });
const emptyBoat = (): Boat => ({ year: "", make: "", model: "", length: "", hull_type: "", engine_type: "", horsepower: "", value: "", storage_location: "" });
const emptyUmbrella = (): UmbrellaInfo => ({ wants_umbrella: "", requested_limit: "", major_violations: "", has_watercraft_unlisted: "", has_rental_unlisted: "", has_pool_trampoline_unlisted: "", acknowledge_umbrella: false });
const emptyFlood = (): FloodInfo => ({ flood_zone: "", has_flood_insurance: "", current_flood_carrier: "", current_flood_premium: "", flood_policy_number: "", building_coverage: "", contents_coverage: "", elevation_cert: "", foundation_type: "", lowest_floor_elevation: "", num_flood_claims: "", preferred_deductible: "" });
const emptyRecVehicle = (): RecreationalVehicle => ({ rec_type: "", year: "", make: "", model: "", vin_serial: "", garaging_zip: "", usage_type: "", liability_limit: "", wants_comp: "", wants_collision: "", comp_deductible: "", collision_deductible: "", trailer_coverage: "", accessories_value: "", um_uim: "", med_pay: "", towing: "" });
const emptyArticle = (): PersonalArticle => ({ description: "", category: "", estimated_value: "" });

/* ─── Commercial Lines Types ─── */
type CommercialStepKey = "industry" | "insurance_check" | "owner_experience" | "upload_dec" | "bor_auth" | "full_intake" | "coverage_questions" | "commercial_docs";

const COMMERCIAL_LINES = [
  "General Liability", "Workers Compensation", "Commercial Auto",
  "Property", "Umbrella", "Other",
] as const;

const COMMERCIAL_INDUSTRY_OPTIONS = [
  { key: "nonprofit", label: "Non-Profit", icon: "🏛️" },
  { key: "real_estate", label: "Real Estate", icon: "🏢" },
  { key: "contractor", label: "Contractor", icon: "🔨" },
  { key: "hospitality", label: "Hospitality", icon: "🏨" },
  { key: "trucking", label: "Trucking", icon: "🚛" },
  { key: "retail", label: "Retail", icon: "🛍️" },
  { key: "professional_services", label: "Professional Services", icon: "💼" },
  { key: "other", label: "Other", icon: "📋" },
] as const;

interface LossRunPolicyInfo {
  carrier: string;
  coverage: string;
  policy_number: string;
  effective_date: string;
  expiration_date: string;
}

interface CommercialFormData {
  customer_name: string; customer_email: string; customer_phone: string;
  business_name: string; dba: string; ein: string; business_type: string;
  street_address: string; city: string; state: string; zip: string;
  employee_count: string; annual_revenue: string; years_in_business: string;
  requested_coverage: string; requested_premium: string; additional_notes: string;
  industry: string;
  has_current_insurance: "" | "yes" | "no";
  current_carrier_name: string;
  policy_number: string;
  policy_effective_date: string;
  policy_expiration_date: string;
  lines_in_force: string[];
  has_uploaded_dec_pages: boolean;
  // Loss run request info (when no dec pages uploaded)
  loss_run_authorized_first_name: string;
  loss_run_authorized_last_name: string;
  loss_run_authorized_email: string;
  loss_run_authorized_title: string;
  loss_run_policies: LossRunPolicyInfo[];
  loss_run_consent: boolean;
  // BOR
  has_other_broker: "" | "yes" | "no";
  wants_bor: "" | "yes" | "no";
  bor_lines: string[];
  bor_authorized: boolean;
  carrier_email: string;
  // No-insurance experience flow
  owner_resume_text: string;
  owner_resume_files: string[];
  // Coverage selection + ACORD-driven fields
  selected_coverage_lines: string[];
  acord_data: Record<string, any>;
}

const emptyLossRunPolicy = (): LossRunPolicyInfo => ({
  carrier: "", coverage: "", policy_number: "", effective_date: "", expiration_date: "",
});

const emptyCommercial = (): CommercialFormData => ({
  customer_name: "", customer_email: "", customer_phone: "",
  business_name: "", dba: "", ein: "", business_type: "",
  street_address: "", city: "", state: "", zip: "",
  employee_count: "", annual_revenue: "", years_in_business: "",
  requested_coverage: "", requested_premium: "", additional_notes: "",
  industry: "",
  has_current_insurance: "", current_carrier_name: "", policy_number: "",
  policy_effective_date: "", policy_expiration_date: "",
  lines_in_force: [],
  has_uploaded_dec_pages: false,
  loss_run_authorized_first_name: "", loss_run_authorized_last_name: "",
  loss_run_authorized_email: "", loss_run_authorized_title: "",
  loss_run_policies: [emptyLossRunPolicy()],
  loss_run_consent: false,
  has_other_broker: "", wants_bor: "", bor_lines: [], bor_authorized: false,
  carrier_email: "",
  owner_resume_text: "", owner_resume_files: [],
  selected_coverage_lines: [],
  acord_data: {},
});

/* ─── Personal step keys (dynamic flow) ─── */
type PersonalStep =
  | "coverage_select" | "current_insurance" | "contact_info" | "address" | "household"
  | "homeowners" | "auto" | "flood" | "boat" | "recreational" | "personal_articles" | "umbrella"
  | "prompt_add_auto" | "prompt_add_property" | "prompt_additional_vehicles"
  | "prompt_personal_articles" | "prompt_flood" | "prompt_umbrella"
  | "documents" | "disclosure";

/* ─── Main Component ─── */
export default function IntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [tokenSource, setTokenSource] = useState<"intake_links" | "personal_intake_submissions" | null>(null);

  const [intakeType, setIntakeType] = useState<"personal" | "commercial" | null>(null);

  // ─── Personal State ───
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [applicantCity, setApplicantCity] = useState("");
  const [applicantState, setApplicantState] = useState("");
  const [applicantZip, setApplicantZip] = useState("");
  const [ownershipStatus, setOwnershipStatus] = useState<"" | "own" | "rent">("");
  const [hasLicensedDrivers, setHasLicensedDrivers] = useState<"" | "yes" | "no">("");
  const [enableAuto, setEnableAuto] = useState(false);
  const [enableHome, setEnableHome] = useState(false);
  const [enableRenters, setEnableRenters] = useState(false);
  const [enableFlood, setEnableFlood] = useState(false);
  const [enableBoat, setEnableBoat] = useState(false);
  const [enableUmbrella, setEnableUmbrella] = useState(false);
  const [enableRecreational, setEnableRecreational] = useState(false);
  const [enableArticles, setEnableArticles] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([emptyDriver()]);
  const [excludedDrivers, setExcludedDrivers] = useState<ExcludedDriver[]>([]);
  const [hasExcludedDrivers, setHasExcludedDrivers] = useState<"" | "yes" | "no">("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);
  const [homes, setHomes] = useState<HomeInfo[]>([emptyHome()]);
  const [boats, setBoats] = useState<Boat[]>([emptyBoat()]);
  const [recVehicles, setRecVehicles] = useState<RecreationalVehicle[]>([emptyRecVehicle()]);
  const [umbrella, setUmbrella] = useState<UmbrellaInfo>(emptyUmbrella());
  const [flood, setFlood] = useState<FloodInfo>(emptyFlood());
  const [autoCoverage, setAutoCoverage] = useState<AutoCoverage>(emptyAutoCoverage());
  const [articles, setArticles] = useState<PersonalArticle[]>([emptyArticle()]);
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);
  const [isCurrentlyInsured, setIsCurrentlyInsured] = useState<"" | "yes" | "no">("");
  const [decExtracting, setDecExtracting] = useState(false);
  const [decExtracted, setDecExtracted] = useState(false);
  const [decFiles, setDecFiles] = useState<File[]>([]);
  const [decDragOver, setDecDragOver] = useState(false);
  const decInputRef = useRef<HTMLInputElement>(null);
  const updateCov = (field: keyof AutoCoverage, value: any) => setAutoCoverage(prev => ({ ...prev, [field]: value }));
  const updateFlood = (field: keyof FloodInfo, value: string) => setFlood(prev => ({ ...prev, [field]: value }));

  // ─── Cross-sell prompt tracking ───
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());
  const dismissPrompt = (key: string) => setDismissedPrompts(prev => new Set(prev).add(key));
  const [showVehicleSubSelect, setShowVehicleSubSelect] = useState(false);

  // ─── Wizard step (personal lines only) ───
  const [currentStep, setCurrentStep] = useState<PersonalStep>("coverage_select");

  // ─── Commercial State ───
  const [commercialForm, setCommercialForm] = useState<CommercialFormData>(emptyCommercial());
  const [commercialStep, setCommercialStep] = useState<CommercialStepKey>("industry");
  const [borGenerated, setBorGenerated] = useState(false);
  const [borSignToken, setBorSignToken] = useState<string | null>(null);
  const [showLossRunModal, setShowLossRunModal] = useState(false);
  const [showDataUsageOverlay, setShowDataUsageOverlay] = useState(false);
  const [lossRunRequested, setLossRunRequested] = useState(false);
  const [borAccepted, setBorAccepted] = useState<boolean | null>(null);

  // ─── Shared State ───
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; category: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Compute dynamic steps ─── */
  const computePersonalSteps = (): PersonalStep[] => {
    const steps: PersonalStep[] = ["coverage_select", "current_insurance", "contact_info", "address", "household"];

    const hasProperty = enableHome || enableRenters;

    // Homeowners / Renters section
    if (hasProperty) {
      steps.push("homeowners");
      // After property: prompt personal articles
      if (!enableArticles && !dismissedPrompts.has("prompt_personal_articles")) {
        steps.push("prompt_personal_articles");
      }
      // After property: prompt flood
      if (!enableFlood && !dismissedPrompts.has("prompt_flood")) {
        steps.push("prompt_flood");
      }
      // After property: prompt auto
      if (!enableAuto && !dismissedPrompts.has("prompt_add_auto")) {
        steps.push("prompt_add_auto");
      }
    }

    // Auto section
    if (enableAuto) {
      steps.push("auto");
      // After auto: prompt property
      if (!hasProperty && !dismissedPrompts.has("prompt_add_property")) {
        steps.push("prompt_add_property");
      }
      // After auto: prompt additional vehicles
      if (!enableBoat && !enableRecreational && !dismissedPrompts.has("prompt_additional_vehicles")) {
        steps.push("prompt_additional_vehicles");
      }
    }

    if (enableFlood) steps.push("flood");
    if (enableBoat) steps.push("boat");
    if (enableRecreational) steps.push("recreational");
    if (enableArticles) steps.push("personal_articles");

    // Umbrella trigger
    if (hasProperty && enableAuto && !enableUmbrella && !dismissedPrompts.has("prompt_umbrella")) {
      steps.push("prompt_umbrella");
    }
    if (enableUmbrella) steps.push("umbrella");

    steps.push("documents");
    steps.push("disclosure");
    return steps;
  };

  const activeSteps = computePersonalSteps();
  const currentStepIndex = activeSteps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeSteps.length - 1;
  const progressPercent = ((currentStepIndex + 1) / activeSteps.length) * 100;

  const stepLabels: Record<PersonalStep, string> = {
    coverage_select: "Coverage",
    current_insurance: "Current Insurance",
    contact_info: "Contact",
    address: "Address",
    household: "Household",
    homeowners: enableRenters ? "Renters" : "Homeowners",
    auto: "Auto",
    flood: "Flood",
    boat: "Boat",
    recreational: "Recreational",
    personal_articles: "Personal Articles",
    umbrella: "Umbrella",
    prompt_add_auto: "Auto Review",
    prompt_add_property: "Property Review",
    prompt_additional_vehicles: "Additional Vehicles",
    prompt_personal_articles: "High Value Items",
    prompt_flood: "Flood Coverage",
    prompt_umbrella: "Umbrella Liability",
    documents: "Documents",
    disclosure: "Review & Submit",
  };

  /* ─── Token Validation ─── */
  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: pData } = await supabase
        .from("personal_intake_submissions")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (pData) {
        if (pData.is_used || pData.status === "submitted") { setSubmitted(true); setLoading(false); return; }
        if (new Date(pData.expires_at) < new Date()) { setExpired(true); setLoading(false); return; }
        setRecord(pData);
        setTokenSource("personal_intake_submissions");
        setLoading(false);
        return;
      }

      const { data: iData, error } = await supabase
        .from("intake_links" as any)
        .select("*")
        .eq("token", token)
        .single() as any;

      if (error || !iData) { setExpired(true); setLoading(false); return; }
      if (iData.is_used || new Date(iData.expires_at) < new Date()) { setExpired(true); setLoading(false); return; }
      if (iData.customer_name) setCommercialForm(f => ({ ...f, customer_name: iData.customer_name }));
      if (iData.customer_email) setCommercialForm(f => ({ ...f, customer_email: iData.customer_email }));
      setRecord(iData);
      setTokenSource("intake_links");
      setLoading(false);
    })();
  }, [token]);

  /* ─── Helpers ─── */
  const addItem = <T,>(arr: T[], setArr: (v: T[]) => void, factory: () => T, max: number) => {
    if (arr.length < max) setArr([...arr, factory()]);
  };
  const removeItem = <T,>(arr: T[], setArr: (v: T[]) => void, idx: number) => {
    if (arr.length > 1) setArr(arr.filter((_, i) => i !== idx));
  };
  const updateItem = <T,>(arr: T[], setArr: (v: T[]) => void, idx: number, field: keyof T, value: any) => {
    const copy = [...arr]; (copy[idx] as any)[field] = value; setArr(copy);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files).map(f => ({ file: f, category: "other" }))]);
  }, []);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!).map(f => ({ file: f, category: "other" }))]);
    e.target.value = "";
  }, []);
  const removeFile = (idx: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  const updateFileCategory = (idx: number, cat: string) => setUploadedFiles(prev => prev.map((f, i) => i === idx ? { ...f, category: cat } : f));

  const updateCommercial = (field: keyof CommercialFormData, value: any) =>
    setCommercialForm(prev => ({ ...prev, [field]: value }));

  /* ─── Step validation ─── */
  const validateCurrentStep = (): boolean => {
    if (currentStep === "coverage_select") {
      const hasAny = enableAuto || enableHome || enableRenters || enableFlood || enableBoat || enableUmbrella || enableRecreational || enableArticles;
      if (!hasAny) { toast.error("Select at least one coverage type"); return false; }
    }
    if (currentStep === "current_insurance") {
      if (!isCurrentlyInsured) { toast.error("Please indicate if you are currently insured"); return false; }
    }
    if (currentStep === "contact_info") {
      if (!applicantName.trim()) { toast.error("Full name is required"); return false; }
      if (!applicantEmail.trim() || !/^[\w.-]+@[\w.-]+\.\w+$/.test(applicantEmail.trim())) { toast.error("A valid email is required"); return false; }
      if (!applicantPhone.trim()) { toast.error("Phone number is required"); return false; }
    }
    if (currentStep === "address") {
      if (!applicantAddress.trim()) { toast.error("Mailing address is required"); return false; }
      if (!applicantCity.trim()) { toast.error("City is required"); return false; }
      if (!applicantState.trim()) { toast.error("State is required"); return false; }
      if (!applicantZip.trim()) { toast.error("ZIP code is required"); return false; }
    }
    if (currentStep === "household") {
      if (!ownershipStatus) { toast.error("Please indicate if you own or rent"); return false; }
      if (!hasLicensedDrivers) { toast.error("Please indicate if there are licensed drivers in the household"); return false; }
    }
    if (currentStep === "auto") {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (!v.year.trim() || !v.make.trim() || !v.model.trim() || !v.vin.trim() || !v.garaging_zip.trim()) {
          toast.error(`Vehicle ${i + 1}: Year, Make, Model, VIN, and Garaging ZIP are required`);
          return false;
        }
      }
    }
    if (currentStep === "umbrella" && umbrella.wants_umbrella === "yes" && !umbrella.acknowledge_umbrella) {
      toast.error("You must acknowledge the umbrella disclosure"); return false;
    }
    if (currentStep === "disclosure") {
      if (!disclosureAcknowledged) { toast.error("You must acknowledge and authorize underwriting review"); return false; }
    }
    return true;
  };

  // Passive check for greying out Continue (no toasts)
  const isPersonalStepValid = (): boolean => {
    if (currentStep === "coverage_select") return enableAuto || enableHome || enableRenters || enableFlood || enableBoat || enableUmbrella || enableRecreational || enableArticles;
    if (currentStep === "current_insurance") return !!isCurrentlyInsured;
    if (currentStep === "contact_info") return !!(applicantName.trim() && applicantEmail.trim() && /^[\w.-]+@[\w.-]+\.\w+$/.test(applicantEmail.trim()) && applicantPhone.trim());
    if (currentStep === "address") return !!(applicantAddress.trim() && applicantCity.trim() && applicantState.trim() && applicantZip.trim());
    if (currentStep === "household") return !!(ownershipStatus && hasLicensedDrivers);
    if (currentStep === "disclosure") return disclosureAcknowledged;
    if (currentStep === "umbrella" && umbrella.wants_umbrella === "yes") return umbrella.acknowledge_umbrella;
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    if (!isLastStep) {
      setCurrentStep(activeSteps[currentStepIndex + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const goBack = () => {
    if (!isFirstStep) {
      setCurrentStep(activeSteps[currentStepIndex - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ─── Handle prompt response ─── */
  const handlePromptYes = (promptKey: string, enableFn: (v: boolean) => void) => {
    enableFn(true);
    dismissPrompt(promptKey);
    // After enabling, re-compute steps and advance past the prompt
    // The prompt will disappear and the section will appear; advance to it
    setTimeout(() => {
      const newSteps = computePersonalSteps();
      const promptIdx = newSteps.indexOf(promptKey as PersonalStep);
      // If prompt is gone (it should be), just advance
      const currentIdx = newSteps.indexOf(currentStep);
      if (currentIdx >= 0 && currentIdx < newSteps.length - 1) {
        setCurrentStep(newSteps[currentIdx + 1]);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const handlePromptNo = (promptKey: string) => {
    dismissPrompt(promptKey);
    // Advance to next step after recompute
    setTimeout(() => {
      const newSteps = computePersonalSteps();
      // Find where we should be
      const currentIdx = newSteps.indexOf(currentStep);
      if (currentIdx >= 0 && currentIdx < newSteps.length - 1) {
        setCurrentStep(newSteps[currentIdx + 1]);
      } else {
        // Current step may have been removed; go to next available
        setCurrentStep(newSteps[Math.min(currentStepIndex, newSteps.length - 1)]);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  /* ─── Dec Page Extraction ─── */
  const handleDecExtraction = async () => {
    if (decFiles.length === 0) return;
    setDecExtracting(true);
    try {
      const filesPayload: { base64: string; mimeType: string }[] = [];
      for (const file of decFiles) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
        filesPayload.push({ base64: b64, mimeType });
      }

      const result = await ingestDocument({
        docType: "dec_page",
        pdfFiles: filesPayload.map(f => ({ base64: f.base64, mimeType: f.mimeType })),
      });

      if (!result.data || Object.keys(result.data).length === 0) {
        toast.error("Could not extract data from your documents. You can still fill out the form manually.");
        setDecExtracting(false);
        return;
      }

      const d = result.data;

      // Pre-fill applicant info
      if (d.applicant_name) setApplicantName(d.applicant_name);
      if (d.applicant_email) setApplicantEmail(d.applicant_email);
      if (d.applicant_phone) setApplicantPhone(d.applicant_phone);
      if (d.applicant_address) setApplicantAddress(d.applicant_address);
      if (d.applicant_city) setApplicantCity(d.applicant_city);
      if (d.applicant_state) setApplicantState(d.applicant_state);
      if (d.applicant_zip) setApplicantZip(d.applicant_zip);

      // Enable detected coverage types
      const detected = d.coverage_types_detected || [];
      if (detected.includes("auto")) setEnableAuto(true);
      if (detected.includes("homeowners")) setEnableHome(true);
      if (detected.includes("renters")) setEnableRenters(true);
      if (detected.includes("flood")) setEnableFlood(true);
      if (detected.includes("boat")) setEnableBoat(true);
      if (detected.includes("umbrella")) setEnableUmbrella(true);

      // Pre-fill drivers
      if (d.drivers?.length > 0) {
        setDrivers(d.drivers.map((dr: any) => ({
          name: dr.name || "", dob: dr.dob || "", license_number: dr.license_number || "",
          license_state: dr.license_state || "", gender: dr.gender || "", marital_status: dr.marital_status || "",
          violations: "",
        })));
        setHasLicensedDrivers("yes");
      }

      // Pre-fill vehicles
      if (d.vehicles?.length > 0) {
        setVehicles(d.vehicles.map((v: any) => ({
          year: v.year || "", make: v.make || "", model: v.model || "",
          vin: v.vin || "", usage: v.usage || "", garaging_zip: v.garaging_zip || "",
          is_rideshare_delivery: "" as const, rideshare_service: "",
        })));
      }

      // Pre-fill home
      if (d.home && (d.home.address || d.home.year_built)) {
        setHomes([{
          address: d.home.address || "", city: d.home.city || "", state: d.home.state || "",
          zip: d.home.zip || "", year_built: d.home.year_built || "", square_footage: d.home.square_footage || "",
          construction_type: d.home.construction_type || "", roof_type: d.home.roof_type || "",
          roof_year: d.home.roof_year || "", occupancy: "", rent_roll: "", heating_type: "",
          electrical_update_year: "", plumbing_update_year: "",
          has_pool: false, has_trampoline: false, has_dog: false, dog_breed: "",
          alarm_type: "", fire_extinguishers: false, smoke_detectors: false, deadbolts: false,
          sprinkler_system: false, claims_5_years: "",
        }]);
      }

      // Pre-fill auto coverage
      if (d.auto_coverage) {
        const ac = d.auto_coverage;
        setAutoCoverage(prev => ({
          ...prev,
          liability_type: ac.liability_type || prev.liability_type,
          bi_limit: ac.bi_limit || prev.bi_limit,
          pd_limit: ac.pd_limit || prev.pd_limit,
          csl_limit: ac.csl_limit || prev.csl_limit,
          um_uim_limit: ac.um_uim_limit || prev.um_uim_limit,
          med_pay_limit: ac.med_pay_limit || prev.med_pay_limit,
          comp_deductible: ac.comp_deductible || prev.comp_deductible,
          collision_deductible: ac.collision_deductible || prev.collision_deductible,
          current_carrier: ac.current_carrier || prev.current_carrier,
          policy_expiration: ac.policy_expiration || prev.policy_expiration,
          wants_comprehensive: ac.comp_deductible ? "yes" as const : prev.wants_comprehensive,
          wants_collision: ac.collision_deductible ? "yes" as const : prev.wants_collision,
        }));
      }

      // Pre-fill flood
      if (d.flood && (d.flood.flood_zone || d.flood.building_coverage)) {
        setFlood(prev => ({
          ...prev,
          flood_zone: d.flood.flood_zone || prev.flood_zone,
          building_coverage: d.flood.building_coverage || prev.building_coverage,
          contents_coverage: d.flood.contents_coverage || prev.contents_coverage,
          current_flood_carrier: d.flood.current_flood_carrier || prev.current_flood_carrier,
          current_flood_premium: d.flood.current_flood_premium || prev.current_flood_premium,
        }));
      }

      // Pre-fill boats
      if (d.boats?.length > 0) {
        setBoats(d.boats.map((b: any) => ({
          year: b.year || "", make: b.make || "", model: b.model || "",
          length: b.length || "", hull_type: b.hull_type || "", engine_type: b.engine_type || "",
          horsepower: b.horsepower || "", value: b.value || "", storage_location: "",
        })));
      }

      // Pre-fill umbrella
      if (d.umbrella?.has_umbrella === "yes") {
        setEnableUmbrella(true);
        setUmbrella(prev => ({ ...prev, wants_umbrella: "yes", requested_limit: d.umbrella.limit || prev.requested_limit }));
      }

      // Pre-fill commercial form fields if in commercial intake mode
      if (intakeType === "commercial") {
        setCommercialForm(prev => ({
          ...prev,
          business_name: d.named_insured || d.company_name || d.business_name || d.applicant_name || prev.business_name,
          dba: d.dba || prev.dba,
          customer_name: d.contact_name || d.applicant_name || prev.customer_name,
          customer_email: d.contact_email || d.applicant_email || prev.customer_email,
          customer_phone: d.contact_phone || d.applicant_phone || prev.customer_phone,
          ein: d.fein || d.ein || prev.ein,
          street_address: d.mailing_address || d.address || d.applicant_address || prev.street_address,
          city: d.city || d.applicant_city || prev.city,
          state: d.state || d.applicant_state || prev.state,
          zip: d.zip || d.applicant_zip || prev.zip,
          employee_count: d.employee_count || d.number_of_employees || prev.employee_count,
          annual_revenue: d.annual_revenue || d.gross_sales || prev.annual_revenue,
          years_in_business: d.years_in_business || prev.years_in_business,
          business_type: d.entity_type || d.business_entity_type || prev.business_type,
          current_carrier_name: d.carrier || d.current_carrier || prev.current_carrier_name,
          policy_number: d.policy_number || prev.policy_number,
        }));
      }

      setDecExtracted(true);
      toast.success("We extracted your policy info! Review and edit as needed.");
    } catch (err: any) {
      console.error("Dec extraction error:", err);
      toast.error("Extraction failed. You can still fill out the form manually.");
    } finally {
      setDecExtracting(false);
    }
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!record || !intakeType) return;

    if (intakeType === "personal" && !validateCurrentStep()) return;

    const name = intakeType === "personal" ? applicantName : commercialForm.customer_name;
    const email = intakeType === "personal" ? applicantEmail : commercialForm.customer_email;
    const phone = intakeType === "personal" ? applicantPhone : commercialForm.customer_phone;
    const fullAddress = intakeType === "personal"
      ? `${applicantAddress}, ${applicantCity}, ${applicantState} ${applicantZip}`
      : commercialForm.street_address;

    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!email.trim() || !/^[\w.-]+@[\w.-]+\.\w+$/.test(email.trim())) { toast.error("A valid email is required"); return; }
    if (!phone.trim()) { toast.error("Phone number is required"); return; }

    if (intakeType === "commercial" && !commercialForm.business_name.trim()) {
      toast.error("Business name is required"); return;
    }

    setSubmitting(true);

    const docMeta = uploadedFiles.map(uf => ({ name: uf.file.name, category: uf.category, size: uf.file.size }));

    try {
      if (intakeType === "personal") {
        const hasProperty = enableHome || enableRenters;
        const formData = {
          intake_type: "personal",
          applicant: {
            name: applicantName, email: applicantEmail, phone: applicantPhone,
            address: applicantAddress, city: applicantCity, state: applicantState, zip: applicantZip,
            ownership_status: ownershipStatus, has_licensed_drivers: hasLicensedDrivers,
          },
          sections: {
            auto: enableAuto ? { drivers, excluded_drivers: hasExcludedDrivers === "yes" ? excludedDrivers : [], vehicles, coverage: autoCoverage } : null,
            home: enableHome ? { properties: homes } : null,
            renters: enableRenters ? { properties: homes } : null,
            flood: enableFlood ? flood : null,
            boat: enableBoat ? { boats } : null,
            umbrella: enableUmbrella ? umbrella : null,
            recreational: enableRecreational ? { vehicles: recVehicles } : null,
            personal_articles: enableArticles ? { items: articles.filter(a => a.description.trim()) } : null,
          },
          documents: docMeta,
          notes,
        };

        if (tokenSource === "personal_intake_submissions") {
          const { data: submitResult, error } = await supabase.functions.invoke("submit-personal-intake", {
            body: { token: record.token, form_data: formData },
          });
          if (error) throw error;
          if (submitResult?.error) throw new Error(submitResult.error);

          // Create pipeline lead + business_submission for personal lines
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-intake`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
              body: JSON.stringify({ personal_intake_id: record.id }),
            });
          } catch { /* pipeline sync failure shouldn't block submission */ }

          try {
            const deliveryEmails = record.delivery_emails;
            if (deliveryEmails?.length > 0) {
              const sectionsList = [enableAuto && "Auto", enableHome && "Homeowners", enableRenters && "Renters", enableFlood && "Flood", enableBoat && "Boat", enableUmbrella && "Umbrella", enableRecreational && "Recreational", enableArticles && "Personal Articles"].filter(Boolean).join(", ");
              await supabase.functions.invoke("send-personal-intake-email", { body: { token: record.token, applicant_name: applicantName, sections: sectionsList } });
            }
          } catch { /* email failure shouldn't block */ }
        } else {
          const structuredNotes = `Intake Type: Personal Lines\nApplicant: ${applicantName}\nEmail: ${applicantEmail}\nPhone: ${applicantPhone}\nAddress: ${fullAddress}\nSections: ${[enableAuto && "Auto", enableHome && "Homeowners", enableRenters && "Renters", enableFlood && "Flood", enableBoat && "Boat", enableUmbrella && "Umbrella", enableRecreational && "Recreational", enableArticles && "Personal Articles"].filter(Boolean).join(", ")}\nNotes: ${notes}`;
          await supabase.from("intake_submissions" as any).insert({
            intake_link_id: record.id,
            customer_name: applicantName,
            customer_email: applicantEmail,
            business_name: applicantName,
            additional_notes: structuredNotes,
          } as any);
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-intake`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ intake_link_id: record.id }),
          });
        }
      } else {
        // Commercial submission
        const buildStructuredNotes = () => {
          const f = commercialForm;
          const lines: string[] = [`Intake Type: Commercial Lines`];
          if (f.ein) lines.push(`FEIN / EIN: ${f.ein}`);
          if (f.dba) lines.push(`DBA: ${f.dba}`);
          if (f.customer_phone) lines.push(`Phone: ${f.customer_phone}`);
          if (f.business_type) lines.push(`Business Type: ${f.business_type}`);
          if (f.street_address) lines.push(`Address: ${f.street_address}`);
          if (f.city || f.state || f.zip) lines.push(`City/State/Zip: ${[f.city, f.state, f.zip].filter(Boolean).join(", ")}`);
          if (f.employee_count) lines.push(`Number of Employees: ${f.employee_count}`);
          if (f.annual_revenue) lines.push(`Annual Revenue: ${f.annual_revenue}`);
          if (f.years_in_business) lines.push(`Years in Business: ${f.years_in_business}`);
          if (f.selected_coverage_lines.length > 0) lines.push(`Requested Coverage Lines: ${f.selected_coverage_lines.join(", ")}`);
          // Include ACORD question answers
          if (Object.keys(f.acord_data).length > 0) {
            lines.push(`--- ACORD Underwriting Data ---`);
            for (const [key, val] of Object.entries(f.acord_data)) {
              if (val !== "" && val !== undefined && val !== null) {
                lines.push(`${key}: ${val}`);
              }
            }
          }
          if (f.has_current_insurance === "yes") {
            lines.push(`Current Carrier: ${f.current_carrier_name}`);
            if (f.policy_number) lines.push(`Policy #: ${f.policy_number}`);
            if (f.policy_effective_date) lines.push(`Effective: ${f.policy_effective_date}`);
            if (f.policy_expiration_date) lines.push(`Expiration: ${f.policy_expiration_date}`);
            if (f.lines_in_force.length > 0) lines.push(`Lines in Force: ${f.lines_in_force.join(", ")}`);
          }
          if (f.wants_bor === "yes") {
            lines.push(`BOR Authorized: Yes`);
            lines.push(`BOR Lines: ${f.bor_lines.join(", ")}`);
            if (f.carrier_email) lines.push(`Carrier Email: ${f.carrier_email}`);
          }
          if (docMeta.length > 0) lines.push(`Documents Attached: ${docMeta.length}`);
          if (f.additional_notes) lines.push(`Notes: ${f.additional_notes}`);
          if (notes) lines.push(`Additional Notes: ${notes}`);
          return lines.join("\n");
        };

        if (tokenSource === "intake_links") {
          await supabase.from("intake_submissions" as any).insert({
            intake_link_id: record.id,
            customer_name: commercialForm.customer_name,
            customer_email: commercialForm.customer_email,
            business_name: commercialForm.business_name,
            requested_coverage: commercialForm.requested_coverage,
            requested_premium: commercialForm.requested_premium,
            additional_notes: buildStructuredNotes(),
          } as any);
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-intake`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ intake_link_id: record.id }),
          });
        } else {
          const formData = {
            intake_type: "commercial",
            commercial: commercialForm,
            documents: docMeta,
            notes,
          };
          const { data: submitResult, error } = await supabase.functions.invoke("submit-personal-intake", {
            body: { token: record.token, form_data: formData },
          });
          if (error) throw error;
          if (submitResult?.error) throw new Error(submitResult.error);

          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-intake`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
              body: JSON.stringify({ personal_intake_id: record.id }),
            });
          } catch { /* pipeline sync failure shouldn't block submission */ }

          try {
            if (record.delivery_emails?.length > 0) {
              await supabase.functions.invoke("send-personal-intake-email", { body: { token: record.token, applicant_name: commercialForm.customer_name, sections: "Commercial Lines" } });
            }
          } catch { /* email failure */ }
        }
      }

      if (intakeType === "commercial") {
        if (commercialForm.wants_bor === "yes" && commercialForm.bor_authorized) {
          try {
            const borFullAddress = [commercialForm.street_address, commercialForm.city, commercialForm.state, commercialForm.zip].filter(Boolean).join(", ");
            const { data: borData } = await (supabase
              .from("bor_signatures" as any)
              .insert({
                agent_id: record.agent_id,
                insured_name: commercialForm.business_name,
                insured_email: commercialForm.customer_email,
                insured_address: borFullAddress,
                carrier_name: commercialForm.current_carrier_name || null,
                policy_number: commercialForm.policy_number || null,
                policy_effective_date: commercialForm.policy_effective_date || null,
                policy_expiration_date: commercialForm.policy_expiration_date || null,
                selected_lines: commercialForm.bor_lines,
                carrier_email: commercialForm.carrier_email || null,
                intake_record_id: record.id,
                lead_id: record.lead_id || null,
              } as any)
              .select("token")
              .single() as any);

            if (borData?.token) {
              setBorSignToken(borData.token);
              try {
                const signingUrl = `${window.location.origin}/bor-sign/${borData.token}`;
                await supabase.functions.invoke("send-email", {
                  body: {
                    to: commercialForm.customer_email,
                    subject: `Broker of Record Authorization – ${commercialForm.business_name}`,
                    body: `<p>Dear ${commercialForm.customer_name},</p><p>Please sign your Broker of Record authorization letter by clicking the link below:</p><p><a href="${signingUrl}" style="display:inline-block;padding:12px 24px;background:#142D5A;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Sign BOR Letter</a></p><p>This link expires in 30 days.</p><p>Best regards,<br/>AURA Risk Group</p>`,
                  },
                });
              } catch { /* email failure non-blocking */ }
            }
          } catch (err) {
            console.error("BOR creation failed:", err);
          }
        }
        setBorGenerated(true);
        toast.success("Submitted successfully!");
      } else {
        setSubmitted(true);
        toast.success("Submitted successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Render States ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
            <h2 className="text-xl font-semibold">Link Expired or Invalid</h2>
            <p className="text-sm text-muted-foreground">This intake link is no longer valid. Please contact your agent for a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Submitted</h2>
            <p className="text-sm text-muted-foreground">Your information has been securely submitted. Your agent will be in touch.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Step Navigation Bar ─── */
  const renderStepNav = () => {
    // Only show non-prompt steps in the nav
    const displaySteps = activeSteps.filter(s => !s.startsWith("prompt_"));
    const displayIdx = displaySteps.indexOf(currentStep);
    const actualDisplayIdx = currentStep.startsWith("prompt_")
      ? displaySteps.findIndex(s => activeSteps.indexOf(s) > currentStepIndex) - 1
      : displayIdx;
    const displayProgress = ((Math.max(0, actualDisplayIdx) + 1) / displaySteps.length) * 100;

    return (
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/50 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {Math.max(1, actualDisplayIdx + 1)} of {displaySteps.length}</span>
            <span>{stepLabels[currentStep]}</span>
          </div>
          <Progress value={displayProgress} className="h-1.5" />
          <div className="flex gap-1 justify-center">
            {displaySteps.map((step, idx) => (
              <button
                key={step}
                onClick={() => {
                  if (idx < actualDisplayIdx) setCurrentStep(step);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === actualDisplayIdx ? "w-8 bg-primary" :
                  idx < actualDisplayIdx ? "w-2 bg-primary/50 cursor-pointer hover:bg-primary/70" :
                  "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ─── Step Buttons ─── */
  const renderStepButtons = () => {
    // Don't show for prompt steps (they have their own buttons)
    if (currentStep.startsWith("prompt_")) return null;

    return (
      <div className="flex gap-3 pt-2">
        {isFirstStep ? (
          <Button variant="outline" className="flex-1 h-11" onClick={() => setIntakeType(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 h-11" onClick={goBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        {isLastStep ? (
          <Button className="flex-1 h-11 text-base" onClick={handleSubmit} disabled={submitting || !isPersonalStepValid()}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit"}
          </Button>
        ) : (
          <Button className="flex-1 h-11" onClick={goNext} disabled={!isPersonalStepValid()}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    );
  };

  /* ─── RENDER: Prompt Screen ─── */
  const renderPromptScreen = (
    promptKey: string,
    title: string,
    question: string,
    enableFn: (v: boolean) => void,
    yesLabel = "Yes",
    noLabel = "No, continue"
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{question}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-11" onClick={() => handlePromptNo(promptKey)}>{noLabel}</Button>
          <Button className="flex-1 h-11" onClick={() => handlePromptYes(promptKey, enableFn)}>{yesLabel}</Button>
        </div>
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Additional Vehicles Prompt (special - has sub-selection) ─── */
  const renderAdditionalVehiclesPrompt = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Additional Vehicles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">Do you own any boats or recreational vehicles?</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-11" onClick={() => handlePromptNo("prompt_additional_vehicles")}>No</Button>
          <Button className="flex-1 h-11" onClick={() => {
            // Show sub-selection
            setShowVehicleSubSelect(true);
          }}>Yes</Button>
        </div>
        {showVehicleSubSelect && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium">Select type</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Boat", action: () => { setEnableBoat(true); dismissPrompt("prompt_additional_vehicles"); goNext(); } },
                { label: "Recreational Vehicle", action: () => { setEnableRecreational(true); dismissPrompt("prompt_additional_vehicles"); goNext(); } },
                { label: "Both", action: () => { setEnableBoat(true); setEnableRecreational(true); dismissPrompt("prompt_additional_vehicles"); goNext(); } },
              ].map(opt => (
                <Button key={opt.label} variant="outline" onClick={opt.action}>{opt.label}</Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Coverage Selection (Screen 1) ─── */
  const renderCoverageSelect = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What would you like reviewed?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {[
          { label: "Auto", icon: Car, enabled: enableAuto, toggle: setEnableAuto },
          { label: "Homeowners", icon: Home, enabled: enableHome, toggle: (v: boolean) => { setEnableHome(v); if (v) setEnableRenters(false); } },
          { label: "Renters", icon: Home, enabled: enableRenters, toggle: (v: boolean) => { setEnableRenters(v); if (v) setEnableHome(false); } },
          { label: "Flood", icon: Droplets, enabled: enableFlood, toggle: setEnableFlood },
          { label: "Umbrella", icon: Umbrella, enabled: enableUmbrella, toggle: setEnableUmbrella },
          { label: "Boat", icon: Sailboat, enabled: enableBoat, toggle: setEnableBoat },
          { label: "Recreational Vehicles", icon: Car, enabled: enableRecreational, toggle: setEnableRecreational },
          { label: "Personal Articles", icon: Gem, enabled: enableArticles, toggle: setEnableArticles },
        ].map(s => (
          <button key={s.label} onClick={() => s.toggle(!s.enabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${s.enabled ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}>
            <s.icon className="h-4 w-4" />{s.label}
          </button>
        ))}
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Current Insurance (after coverage select) ─── */
  const renderCurrentInsurance = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" /> Are you currently insured?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          If you have current coverage, uploading your declaration pages helps us pre-fill much of the form for you.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setIsCurrentlyInsured("yes")}
            className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${isCurrentlyInsured === "yes" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
          >Yes</button>
          <button
            onClick={() => { setIsCurrentlyInsured("no"); setDecFiles([]); setDecExtracted(false); }}
            className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${isCurrentlyInsured === "no" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
          >No</button>
        </div>

        {isCurrentlyInsured === "yes" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Upload your declaration pages</Label>
              <p className="text-[11px] text-muted-foreground">
                We'll extract your policy details and pre-fill the form. You can review and edit everything afterwards.
              </p>
              <div
                onClick={() => decInputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDecDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDecDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDecDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  setDecDragOver(false);
                  const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
                    [".pdf", ".jpg", ".jpeg", ".png"].some(ext => f.name.toLowerCase().endsWith(ext))
                  );
                  if (droppedFiles.length) { setDecFiles(prev => [...prev, ...droppedFiles]); setDecExtracted(false); }
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                  decDragOver
                    ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {decDragOver ? (
                  <>
                    <Download className="h-8 w-8 mx-auto mb-2 text-primary animate-bounce" />
                    <p className="text-sm font-medium text-primary">Drop files here</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click or drag & drop dec pages</p>
                  </>
                )}
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG accepted</p>
                <input
                  ref={decInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setDecFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      setDecExtracted(false);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {decFiles.length > 0 && (
              <div className="space-y-2">
                {decFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      setDecFiles(prev => prev.filter((_, idx) => idx !== i));
                      setDecExtracted(false);
                    }}><X className="h-3 w-3" /></Button>
                  </div>
                ))}

                {!decExtracted && (
                  <Button
                    className="w-full h-11"
                    onClick={handleDecExtraction}
                    disabled={decExtracting}
                  >
                    {decExtracting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Extracting your policy info...</>
                    ) : (
                      <><FileText className="h-4 w-4 mr-2" /> Extract & Pre-Fill Form</>
                    )}
                  </Button>
                )}

                {decExtracted && (
                  <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-md px-3 py-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Policy info extracted! Continue to review and edit.</span>
                  </div>
                )}
              </div>
            )}

            {decFiles.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                You can skip the upload and fill out the form manually.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Contact Info (Screen 2) ─── */
  const renderContactInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div><Label className="text-xs">Full Name *</Label><Input value={applicantName} onChange={e => setApplicantName(e.target.value)} /></div>
        <div><Label className="text-xs">Email *</Label><Input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} /></div>
        <div><Label className="text-xs">Phone *</Label><Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Address (Screen 3) ─── */
  const renderAddress = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Primary Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div><Label className="text-xs">Mailing Address *</Label><Input value={applicantAddress} onChange={e => setApplicantAddress(e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">City *</Label><Input value={applicantCity} onChange={e => setApplicantCity(e.target.value)} /></div>
          <div>
            <Label className="text-xs">State *</Label>
            <Select value={applicantState} onValueChange={setApplicantState}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">ZIP *</Label><Input value={applicantZip} onChange={e => setApplicantZip(e.target.value)} /></div>
        </div>
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Household Overview (Screen 4) ─── */
  const renderHousehold = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Household Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs">Do you own or rent your primary residence? *</Label>
          <div className="flex gap-3">
            <button
              onClick={() => setOwnershipStatus("own")}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${ownershipStatus === "own" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
            >Own</button>
            <button
              onClick={() => setOwnershipStatus("rent")}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${ownershipStatus === "rent" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
            >Rent</button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Are there licensed drivers in the household? *</Label>
          <div className="flex gap-3">
            <button
              onClick={() => setHasLicensedDrivers("yes")}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${hasLicensedDrivers === "yes" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
            >Yes</button>
            <button
              onClick={() => setHasLicensedDrivers("no")}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${hasLicensedDrivers === "no" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
            >No</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /* ─── RENDER: Auto Step Content ─── */
  const renderAutoStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Auto</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Drivers</h3>
              <Badge variant="secondary" className="text-[10px]">{drivers.length}/5</Badge>
            </div>
            {drivers.map((d, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Driver {i + 1}</span>
                  {drivers.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(drivers, setDrivers, i)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Full Name</Label><Input className="h-8 text-sm" value={d.name} onChange={e => updateItem(drivers, setDrivers, i, "name", e.target.value)} /></div>
                  <div><Label className="text-[10px]">Date of Birth</Label><Input className="h-8 text-sm" type="date" value={d.dob} onChange={e => updateItem(drivers, setDrivers, i, "dob", e.target.value)} /></div>
                  <div><Label className="text-[10px]">License #</Label><Input className="h-8 text-sm" value={d.license_number} onChange={e => updateItem(drivers, setDrivers, i, "license_number", e.target.value)} /></div>
                  <div><Label className="text-[10px]">License State</Label><Input className="h-8 text-sm" value={d.license_state} onChange={e => updateItem(drivers, setDrivers, i, "license_state", e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px]">Gender</Label>
                    <Select value={d.gender} onValueChange={v => updateItem(drivers, setDrivers, i, "gender", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Marital Status</Label>
                    <Select value={d.marital_status} onValueChange={v => updateItem(drivers, setDrivers, i, "marital_status", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-[10px]">Violations / Accidents (last 5 years)</Label><Input className="h-8 text-sm" value={d.violations} onChange={e => updateItem(drivers, setDrivers, i, "violations", e.target.value)} placeholder="None, or describe" /></div>
              </div>
            ))}
            {drivers.length < 5 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(drivers, setDrivers, emptyDriver, 5)}><Plus className="h-3 w-3 mr-1" /> Add Driver</Button>}
          </div>

          {/* Excluded Drivers */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Excluded Drivers</h3>
            <div>
              <Label className="text-[10px]">Would you like to exclude any household driver from coverage?</Label>
              <Select value={hasExcludedDrivers} onValueChange={v => {
                setHasExcludedDrivers(v as any);
                if (v === "yes" && excludedDrivers.length === 0) setExcludedDrivers([emptyExcludedDriver()]);
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            {hasExcludedDrivers === "yes" && (
              <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                {excludedDrivers.map((ed, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-end">
                    <div><Label className="text-[10px]">Name</Label><Input className="h-8 text-sm" value={ed.name} onChange={e => updateItem(excludedDrivers, setExcludedDrivers, i, "name", e.target.value)} /></div>
                    <div className="flex gap-1"><div className="flex-1"><Label className="text-[10px]">Reason</Label><Input className="h-8 text-sm" value={ed.reason} onChange={e => updateItem(excludedDrivers, setExcludedDrivers, i, "reason", e.target.value)} /></div>
                      {excludedDrivers.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 self-end" onClick={() => removeItem(excludedDrivers, setExcludedDrivers, i)}><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                ))}
                {excludedDrivers.length < 5 && <Button variant="outline" size="sm" className="text-xs" onClick={() => addItem(excludedDrivers, setExcludedDrivers, emptyExcludedDriver, 5)}><Plus className="h-3 w-3 mr-1" /> Add Excluded Driver</Button>}
              </div>
            )}
          </div>

          {/* Vehicles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Vehicles</h3>
              <Badge variant="secondary" className="text-[10px]">{vehicles.length}/10</Badge>
            </div>
            {vehicles.map((v, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Vehicle {i + 1}</span>
                  {vehicles.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(vehicles, setVehicles, i)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Year *</Label><Input className="h-8 text-sm" value={v.year} onChange={e => updateItem(vehicles, setVehicles, i, "year", e.target.value)} /></div>
                  <div><Label className="text-[10px]">Make *</Label><Input className="h-8 text-sm" value={v.make} onChange={e => updateItem(vehicles, setVehicles, i, "make", e.target.value)} /></div>
                  <div><Label className="text-[10px]">Model *</Label><Input className="h-8 text-sm" value={v.model} onChange={e => updateItem(vehicles, setVehicles, i, "model", e.target.value)} /></div>
                  <div><Label className="text-[10px]">VIN *</Label><Input className="h-8 text-sm" value={v.vin} onChange={e => updateItem(vehicles, setVehicles, i, "vin", e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px]">Primary Use</Label>
                    <Select value={v.usage} onValueChange={val => updateItem(vehicles, setVehicles, i, "usage", val)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commute">Commute</SelectItem>
                        <SelectItem value="pleasure">Pleasure</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="farm">Farm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Garaging ZIP *</Label><Input className="h-8 text-sm" value={v.garaging_zip} onChange={e => updateItem(vehicles, setVehicles, i, "garaging_zip", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Used for rideshare or delivery?</Label>
                    <Select value={v.is_rideshare_delivery} onValueChange={val => updateItem(vehicles, setVehicles, i, "is_rideshare_delivery", val)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {v.is_rideshare_delivery === "yes" && (
                    <div><Label className="text-[10px]">Service Name</Label><Input className="h-8 text-sm" value={v.rideshare_service} onChange={e => updateItem(vehicles, setVehicles, i, "rideshare_service", e.target.value)} placeholder="e.g. Uber, DoorDash" /></div>
                  )}
                </div>
              </div>
            ))}
            {vehicles.length < 10 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(vehicles, setVehicles, emptyVehicle, 10)}><Plus className="h-3 w-3 mr-1" /> Add Vehicle</Button>}
          </div>

          {/* Coverage Details */}
          <div className="space-y-5">
            <h3 className="text-sm font-medium">Coverage Details</h3>

            {/* Liability Type */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Liability</h4>
              <div>
                <Label className="text-[10px]">Liability Limit Type</Label>
                <Select value={autoCoverage.liability_type} onValueChange={v => updateCov("liability_type", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split Limits (BI / PD)</SelectItem>
                    <SelectItem value="csl">Combined Single Limit (CSL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {autoCoverage.liability_type === "split" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-2 border-primary/20">
                  <div>
                    <Label className="text-[10px]">Bodily Injury Limit</Label>
                    <Select value={autoCoverage.bi_limit} onValueChange={v => updateCov("bi_limit", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select BI limit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25/50">$25,000 / $50,000</SelectItem>
                        <SelectItem value="50/100">$50,000 / $100,000</SelectItem>
                        <SelectItem value="100/300">$100,000 / $300,000</SelectItem>
                        <SelectItem value="250/500">$250,000 / $500,000</SelectItem>
                        <SelectItem value="500/500">$500,000 / $500,000</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Property Damage Limit</Label>
                    <Select value={autoCoverage.pd_limit} onValueChange={v => updateCov("pd_limit", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select PD limit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25000">$25,000</SelectItem>
                        <SelectItem value="50000">$50,000</SelectItem>
                        <SelectItem value="100000">$100,000</SelectItem>
                        <SelectItem value="250000">$250,000</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {autoCoverage.liability_type === "csl" && (
                <div className="pl-3 border-l-2 border-primary/20">
                  <Label className="text-[10px]">Combined Single Limit</Label>
                  <Select value={autoCoverage.csl_limit} onValueChange={v => updateCov("csl_limit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select CSL" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100000">$100,000</SelectItem>
                      <SelectItem value="300000">$300,000</SelectItem>
                      <SelectItem value="500000">$500,000</SelectItem>
                      <SelectItem value="1000000">$1,000,000</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* UM/UIM */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uninsured / Underinsured Motorist</h4>
              <div>
                <Label className="text-[10px]">UM/UIM Limit</Label>
                <Select value={autoCoverage.um_uim_limit} onValueChange={v => updateCov("um_uim_limit", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select UM/UIM limit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="state_min">State Minimum</SelectItem>
                    <SelectItem value="25/50">$25,000 / $50,000</SelectItem>
                    <SelectItem value="50/100">$50,000 / $100,000</SelectItem>
                    <SelectItem value="100/300">$100,000 / $300,000</SelectItem>
                    <SelectItem value="250/500">$250,000 / $500,000</SelectItem>
                    <SelectItem value="reject">Reject (where permitted)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Medical Payments */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medical Payments</h4>
              <div>
                <Label className="text-[10px]">Medical Payments Limit</Label>
                <Select value={autoCoverage.med_pay_limit} onValueChange={v => updateCov("med_pay_limit", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select MedPay limit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Coverage</SelectItem>
                    <SelectItem value="1000">$1,000</SelectItem>
                    <SelectItem value="2000">$2,000</SelectItem>
                    <SelectItem value="5000">$5,000</SelectItem>
                    <SelectItem value="10000">$10,000</SelectItem>
                    <SelectItem value="25000">$25,000</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PIP */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Injury Protection (PIP)</h4>
              <div>
                <Label className="text-[10px]">PIP Limit</Label>
                <Select value={autoCoverage.pip_limit} onValueChange={v => updateCov("pip_limit", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select PIP limit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Coverage</SelectItem>
                    <SelectItem value="2500">$2,500</SelectItem>
                    <SelectItem value="5000">$5,000</SelectItem>
                    <SelectItem value="10000">$10,000</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comprehensive */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprehensive Coverage</h4>
              <div>
                <Label className="text-[10px]">Comprehensive Coverage?</Label>
                <Select value={autoCoverage.wants_comprehensive} onValueChange={v => updateCov("wants_comprehensive", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              {autoCoverage.wants_comprehensive === "yes" && (
                <div className="pl-3 border-l-2 border-primary/20">
                  <Label className="text-[10px]">Comprehensive Deductible</Label>
                  <Select value={autoCoverage.comp_deductible} onValueChange={v => updateCov("comp_deductible", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select deductible" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">$100</SelectItem><SelectItem value="250">$250</SelectItem><SelectItem value="500">$500</SelectItem>
                      <SelectItem value="1000">$1,000</SelectItem><SelectItem value="2500">$2,500</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Collision */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collision Coverage</h4>
              <div>
                <Label className="text-[10px]">Collision Coverage?</Label>
                <Select value={autoCoverage.wants_collision} onValueChange={v => {
                  updateCov("wants_collision", v);
                  if (v === "yes" && autoCoverage.wants_comprehensive !== "yes") {
                    updateCov("wants_comprehensive", "yes");
                    toast.info("Comprehensive coverage has been enabled — it is required for Collision.");
                  }
                }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-destructive font-medium">Collision coverage cannot be selected unless Comprehensive is also selected.</p>
              {autoCoverage.wants_collision === "yes" && (
                <div className="pl-3 border-l-2 border-primary/20">
                  <Label className="text-[10px]">Collision Deductible</Label>
                  <Select value={autoCoverage.collision_deductible} onValueChange={v => updateCov("collision_deductible", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select deductible" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">$100</SelectItem><SelectItem value="250">$250</SelectItem><SelectItem value="500">$500</SelectItem>
                      <SelectItem value="1000">$1,000</SelectItem><SelectItem value="2500">$2,500</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Towing */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Towing & Labor</h4>
              <div>
                <Label className="text-[10px]">Towing & Labor Coverage?</Label>
                <Select value={autoCoverage.wants_towing} onValueChange={v => updateCov("wants_towing", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              {autoCoverage.wants_towing === "yes" && (
                <div className="pl-3 border-l-2 border-primary/20">
                  <Label className="text-[10px]">Towing Limit</Label>
                  <Select value={autoCoverage.towing_limit} onValueChange={v => updateCov("towing_limit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select limit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">$50</SelectItem><SelectItem value="75">$75</SelectItem><SelectItem value="100">$100</SelectItem>
                      <SelectItem value="150">$150</SelectItem><SelectItem value="200">$200</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Rental */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rental Reimbursement</h4>
              <div>
                <Label className="text-[10px]">Rental Reimbursement?</Label>
                <Select value={autoCoverage.wants_rental} onValueChange={v => updateCov("wants_rental", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              {autoCoverage.wants_rental === "yes" && (
                <div className="pl-3 border-l-2 border-primary/20">
                  <Label className="text-[10px]">Rental Limit</Label>
                  <Select value={autoCoverage.rental_limit} onValueChange={v => updateCov("rental_limit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select limit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30/900">$30/day — $900 max</SelectItem>
                      <SelectItem value="40/1200">$40/day — $1,200 max</SelectItem>
                      <SelectItem value="50/1500">$50/day — $1,500 max</SelectItem>
                      <SelectItem value="60/1800">$60/day — $1,800 max</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Policy Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Current Insurance Carrier</Label><Input className="h-8 text-sm" value={autoCoverage.current_carrier} onChange={e => updateCov("current_carrier", e.target.value)} /></div>
                <div><Label className="text-[10px]">Policy Expiration Date</Label><Input className="h-8 text-sm" type="date" value={autoCoverage.policy_expiration} onChange={e => updateCov("policy_expiration", e.target.value)} /></div>
                <div><Label className="text-[10px]">Current Liability Limits</Label><Input className="h-8 text-sm" value={autoCoverage.current_liability_limits} onChange={e => updateCov("current_liability_limits", e.target.value)} placeholder="e.g. 100/300/100" /></div>
                <div>
                  <Label className="text-[10px]">Continuous Coverage in Last 3 Years?</Label>
                  <Select value={autoCoverage.continuous_coverage} onValueChange={v => updateCov("continuous_coverage", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Vehicle Ownership</Label>
                  <Select value={autoCoverage.vehicle_ownership} onValueChange={v => updateCov("vehicle_ownership", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="financed">Financed</SelectItem>
                      <SelectItem value="leased">Leased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(autoCoverage.vehicle_ownership === "financed" || autoCoverage.vehicle_ownership === "leased") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-2 border-primary/20">
                  <div><Label className="text-[10px]">Lienholder Name</Label><Input className="h-8 text-sm" value={autoCoverage.lienholder_name} onChange={e => updateCov("lienholder_name", e.target.value)} /></div>
                  <div><Label className="text-[10px]">Lienholder Address</Label><Input className="h-8 text-sm" value={autoCoverage.lienholder_address} onChange={e => updateCov("lienholder_address", e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Homeowners / Renters Step Content ─── */
  const renderHomeStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> {enableRenters ? "Renters" : "Homeowners"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {homes.map((h, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Property {i + 1}</span>
                {homes.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(homes, setHomes, i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2"><Label className="text-[10px]">Address</Label><Input className="h-8 text-sm" value={h.address} onChange={e => updateItem(homes, setHomes, i, "address", e.target.value)} /></div>
                <div><Label className="text-[10px]">City</Label><Input className="h-8 text-sm" value={h.city} onChange={e => updateItem(homes, setHomes, i, "city", e.target.value)} /></div>
                <div><Label className="text-[10px]">State</Label><Input className="h-8 text-sm" value={h.state} onChange={e => updateItem(homes, setHomes, i, "state", e.target.value)} /></div>
                <div><Label className="text-[10px]">ZIP</Label><Input className="h-8 text-sm" value={h.zip} onChange={e => updateItem(homes, setHomes, i, "zip", e.target.value)} /></div>
                <div><Label className="text-[10px]">Year Built</Label><Input className="h-8 text-sm" value={h.year_built} onChange={e => updateItem(homes, setHomes, i, "year_built", e.target.value)} /></div>
                <div><Label className="text-[10px]">Square Footage</Label><Input className="h-8 text-sm" value={h.square_footage} onChange={e => updateItem(homes, setHomes, i, "square_footage", e.target.value)} /></div>
                <div>
                  <Label className="text-[10px]">Construction Type</Label>
                  <Select value={h.construction_type} onValueChange={v => updateItem(homes, setHomes, i, "construction_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frame">Frame</SelectItem><SelectItem value="masonry">Masonry</SelectItem>
                      <SelectItem value="masonry_veneer">Masonry Veneer</SelectItem><SelectItem value="superior">Superior / Fire Resistive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Roof Type</Label>
                  <Select value={h.roof_type} onValueChange={v => updateItem(homes, setHomes, i, "roof_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asphalt_shingle">Asphalt Shingle</SelectItem><SelectItem value="tile">Tile</SelectItem>
                      <SelectItem value="metal">Metal</SelectItem><SelectItem value="slate">Slate</SelectItem><SelectItem value="flat">Flat / Built-Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Roof Year</Label><Input className="h-8 text-sm" value={h.roof_year} onChange={e => updateItem(homes, setHomes, i, "roof_year", e.target.value)} /></div>
                <div>
                  <Label className="text-[10px]">Occupancy</Label>
                  <Select value={h.occupancy} onValueChange={v => updateItem(homes, setHomes, i, "occupancy", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner_occupied">Owner Occupied</SelectItem><SelectItem value="tenant_occupied">Tenant Occupied</SelectItem>
                      <SelectItem value="vacant">Vacant</SelectItem><SelectItem value="seasonal">Seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {h.occupancy === "tenant_occupied" && (
                  <div><Label className="text-[10px]">Rental Income (Monthly)</Label><Input className="h-8 text-sm" value={h.rent_roll} onChange={e => updateItem(homes, setHomes, i, "rent_roll", e.target.value)} placeholder="$2,000" /></div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <div>
                  <Label className="text-[10px]">Heating Type</Label>
                  <Select value={h.heating_type} onValueChange={v => updateItem(homes, setHomes, i, "heating_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Central (Gas/Electric)</SelectItem><SelectItem value="heat_pump">Heat Pump</SelectItem>
                      <SelectItem value="baseboard">Baseboard</SelectItem><SelectItem value="wood_stove">Wood Stove / Fireplace</SelectItem>
                      <SelectItem value="oil">Oil Furnace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Electrical Update Year</Label><Input className="h-8 text-sm" value={h.electrical_update_year} onChange={e => updateItem(homes, setHomes, i, "electrical_update_year", e.target.value)} placeholder="e.g. 2018" /></div>
                <div><Label className="text-[10px]">Plumbing Update Year</Label><Input className="h-8 text-sm" value={h.plumbing_update_year} onChange={e => updateItem(homes, setHomes, i, "plumbing_update_year", e.target.value)} placeholder="e.g. 2020" /></div>
                <div>
                  <Label className="text-[10px]">Alarm System</Label>
                  <Select value={h.alarm_type} onValueChange={v => updateItem(homes, setHomes, i, "alarm_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem><SelectItem value="local">Local Alarm</SelectItem>
                      <SelectItem value="central_station">Central Station</SelectItem><SelectItem value="fire_only">Fire Only</SelectItem>
                      <SelectItem value="full">Full (Fire + Burglar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Protective Devices</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.fire_extinguishers} onCheckedChange={v => updateItem(homes, setHomes, i, "fire_extinguishers", !!v)} /> Fire Extinguishers</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.smoke_detectors} onCheckedChange={v => updateItem(homes, setHomes, i, "smoke_detectors", !!v)} /> Smoke Detectors</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.deadbolts} onCheckedChange={v => updateItem(homes, setHomes, i, "deadbolts", !!v)} /> Deadbolts</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.sprinkler_system} onCheckedChange={v => updateItem(homes, setHomes, i, "sprinkler_system", !!v)} /> Sprinkler System</label>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Liability Exposures</h4>
                <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.has_pool} onCheckedChange={v => updateItem(homes, setHomes, i, "has_pool", !!v)} /> Pool</label>
                <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.has_trampoline} onCheckedChange={v => updateItem(homes, setHomes, i, "has_trampoline", !!v)} /> Trampoline</label>
                <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={h.has_dog} onCheckedChange={v => updateItem(homes, setHomes, i, "has_dog", !!v)} /> Dog(s) on premises</label>
                {h.has_dog && <div><Label className="text-[10px]">Breed(s)</Label><Input className="h-8 text-sm" value={h.dog_breed} onChange={e => updateItem(homes, setHomes, i, "dog_breed", e.target.value)} /></div>}
                <div><Label className="text-[10px]">Claims in last 5 years</Label><Input className="h-8 text-sm" value={h.claims_5_years} onChange={e => updateItem(homes, setHomes, i, "claims_5_years", e.target.value)} placeholder="None, or describe" /></div>
              </div>
            </div>
          ))}
          {homes.length < 5 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(homes, setHomes, emptyHome, 5)}><Plus className="h-3 w-3 mr-1" /> Add Property</Button>}
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Flood Step ─── */
  const renderFloodStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4" /> Flood Insurance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Flood Zone</Label>
              <Select value={flood.flood_zone} onValueChange={v => updateFlood("flood_zone", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Zone A (High Risk)</SelectItem>
                  <SelectItem value="AE">Zone AE (High Risk w/ BFE)</SelectItem>
                  <SelectItem value="AH">Zone AH (Shallow Flooding)</SelectItem>
                  <SelectItem value="AO">Zone AO (Sheet Flow)</SelectItem>
                  <SelectItem value="V">Zone V (Coastal High Risk)</SelectItem>
                  <SelectItem value="VE">Zone VE (Coastal w/ BFE)</SelectItem>
                  <SelectItem value="X">Zone X (Moderate/Low Risk)</SelectItem>
                  <SelectItem value="B">Zone B (Moderate Risk)</SelectItem>
                  <SelectItem value="C">Zone C (Minimal Risk)</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Currently Have Flood Insurance?</Label>
              <Select value={flood.has_flood_insurance} onValueChange={v => updateFlood("has_flood_insurance", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            {flood.has_flood_insurance === "yes" && (
              <>
                <div><Label className="text-[10px]">Current Flood Carrier</Label><Input className="h-8 text-sm" value={flood.current_flood_carrier} onChange={e => updateFlood("current_flood_carrier", e.target.value)} placeholder="NFIP / Private" /></div>
                <div><Label className="text-[10px]">Current Premium</Label><Input className="h-8 text-sm" value={flood.current_flood_premium} onChange={e => updateFlood("current_flood_premium", e.target.value)} placeholder="$1,200" /></div>
                <div><Label className="text-[10px]">Policy Number</Label><Input className="h-8 text-sm" value={flood.flood_policy_number} onChange={e => updateFlood("flood_policy_number", e.target.value)} /></div>
              </>
            )}
            <div><Label className="text-[10px]">Building Coverage Desired</Label><Input className="h-8 text-sm" value={flood.building_coverage} onChange={e => updateFlood("building_coverage", e.target.value)} placeholder="$250,000" /></div>
            <div><Label className="text-[10px]">Contents Coverage Desired</Label><Input className="h-8 text-sm" value={flood.contents_coverage} onChange={e => updateFlood("contents_coverage", e.target.value)} placeholder="$100,000" /></div>
            <div>
              <Label className="text-[10px]">Elevation Certificate Available?</Label>
              <Select value={flood.elevation_cert} onValueChange={v => updateFlood("elevation_cert", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Foundation Type</Label>
              <Select value={flood.foundation_type} onValueChange={v => updateFlood("foundation_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slab">Slab on Grade</SelectItem><SelectItem value="crawlspace">Crawlspace</SelectItem>
                  <SelectItem value="basement">Basement</SelectItem><SelectItem value="elevated">Elevated/Piles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-[10px]">Lowest Floor Elevation</Label><Input className="h-8 text-sm" value={flood.lowest_floor_elevation} onChange={e => updateFlood("lowest_floor_elevation", e.target.value)} placeholder="e.g. 12 ft" /></div>
            <div><Label className="text-[10px]"># Flood Claims (last 10 yrs)</Label><Input className="h-8 text-sm" value={flood.num_flood_claims} onChange={e => updateFlood("num_flood_claims", e.target.value)} placeholder="0" /></div>
            <div>
              <Label className="text-[10px]">Preferred Deductible</Label>
              <Select value={flood.preferred_deductible} onValueChange={v => updateFlood("preferred_deductible", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">$1,000</SelectItem><SelectItem value="2000">$2,000</SelectItem>
                  <SelectItem value="5000">$5,000</SelectItem><SelectItem value="10000">$10,000</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Boat Step ─── */
  const renderBoatStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sailboat className="h-4 w-4" /> Boat / Watercraft</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {boats.map((b, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Boat {i + 1}</span>
                {boats.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(boats, setBoats, i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div><Label className="text-[10px]">Year</Label><Input className="h-8 text-sm" value={b.year} onChange={e => updateItem(boats, setBoats, i, "year", e.target.value)} /></div>
                <div><Label className="text-[10px]">Make</Label><Input className="h-8 text-sm" value={b.make} onChange={e => updateItem(boats, setBoats, i, "make", e.target.value)} /></div>
                <div><Label className="text-[10px]">Model</Label><Input className="h-8 text-sm" value={b.model} onChange={e => updateItem(boats, setBoats, i, "model", e.target.value)} /></div>
                <div><Label className="text-[10px]">Length (ft)</Label><Input className="h-8 text-sm" value={b.length} onChange={e => updateItem(boats, setBoats, i, "length", e.target.value)} /></div>
                <div>
                  <Label className="text-[10px]">Hull Type</Label>
                  <Select value={b.hull_type} onValueChange={v => updateItem(boats, setBoats, i, "hull_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="fiberglass">Fiberglass</SelectItem><SelectItem value="aluminum">Aluminum</SelectItem><SelectItem value="wood">Wood</SelectItem><SelectItem value="inflatable">Inflatable</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Engine Type</Label>
                  <Select value={b.engine_type} onValueChange={v => updateItem(boats, setBoats, i, "engine_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="outboard">Outboard</SelectItem><SelectItem value="inboard">Inboard</SelectItem><SelectItem value="sterndrive">Sterndrive</SelectItem><SelectItem value="jet">Jet</SelectItem><SelectItem value="sail">Sail Only</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Horsepower</Label><Input className="h-8 text-sm" value={b.horsepower} onChange={e => updateItem(boats, setBoats, i, "horsepower", e.target.value)} /></div>
                <div><Label className="text-[10px]">Estimated Value</Label><Input className="h-8 text-sm" value={b.value} onChange={e => updateItem(boats, setBoats, i, "value", e.target.value)} placeholder="$25,000" /></div>
                <div><Label className="text-[10px]">Storage Location</Label><Input className="h-8 text-sm" value={b.storage_location} onChange={e => updateItem(boats, setBoats, i, "storage_location", e.target.value)} placeholder="Marina / Home" /></div>
              </div>
            </div>
          ))}
          {boats.length < 5 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(boats, setBoats, emptyBoat, 5)}><Plus className="h-3 w-3 mr-1" /> Add Boat</Button>}
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Umbrella Step ─── */
  const renderUmbrellaStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Umbrella className="h-4 w-4" /> Umbrella Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-[10px]">Would you like an umbrella liability review?</Label>
            <Select value={umbrella.wants_umbrella} onValueChange={v => setUmbrella({ ...umbrella, wants_umbrella: v as any })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
            </Select>
          </div>
          {umbrella.wants_umbrella === "yes" && (
            <div className="space-y-5 pl-3 border-l-2 border-primary/20">
              <div>
                <Label className="text-[10px]">Desired Umbrella Limit</Label>
                <Select value={umbrella.requested_limit} onValueChange={v => setUmbrella({ ...umbrella, requested_limit: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select limit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000000">$1,000,000</SelectItem>
                    <SelectItem value="2000000">$2,000,000</SelectItem>
                    <SelectItem value="3000000">$3,000,000</SelectItem>
                    <SelectItem value="5000000">$5,000,000</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Any drivers with major violations, DUI, or reckless driving in the last 5 years?</Label>
                <Select value={umbrella.major_violations} onValueChange={v => setUmbrella({ ...umbrella, major_violations: v as any })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Exposures Not Listed Above</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px]">Watercraft</Label>
                    <Select value={umbrella.has_watercraft_unlisted} onValueChange={v => setUmbrella({ ...umbrella, has_watercraft_unlisted: v as any })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Investment / Rental Properties</Label>
                    <Select value={umbrella.has_rental_unlisted} onValueChange={v => setUmbrella({ ...umbrella, has_rental_unlisted: v as any })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Pools or Trampolines</Label>
                    <Select value={umbrella.has_pool_trampoline_unlisted} onValueChange={v => setUmbrella({ ...umbrella, has_pool_trampoline_unlisted: v as any })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Umbrella coverage is subject to underwriting review and requires qualifying underlying liability limits. Coverage is not bound until written confirmation is provided by AURA Risk Group.</p>
                </div>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <Checkbox checked={umbrella.acknowledge_umbrella} onCheckedChange={v => setUmbrella({ ...umbrella, acknowledge_umbrella: !!v })} className="mt-0.5" />
                  <span>I understand umbrella coverage requires qualifying underlying limits and underwriting approval. <span className="text-destructive">*</span></span>
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Recreational Vehicles Step ─── */
  const renderRecreationalStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Recreational Vehicles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recVehicles.map((rv, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Unit {i + 1}</span>
                {recVehicles.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(recVehicles, setRecVehicles, i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Type</Label>
                  <Select value={rv.rec_type} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "rec_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atv">ATV / UTV</SelectItem><SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="snowmobile">Snowmobile</SelectItem><SelectItem value="golf_cart">Golf Cart</SelectItem>
                      <SelectItem value="motorhome">Motorhome / RV</SelectItem><SelectItem value="travel_trailer">Travel Trailer</SelectItem>
                      <SelectItem value="jet_ski">Jet Ski / PWC</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Year</Label><Input className="h-8 text-sm" value={rv.year} onChange={e => updateItem(recVehicles, setRecVehicles, i, "year", e.target.value)} /></div>
                <div><Label className="text-[10px]">Make</Label><Input className="h-8 text-sm" value={rv.make} onChange={e => updateItem(recVehicles, setRecVehicles, i, "make", e.target.value)} /></div>
                <div><Label className="text-[10px]">Model</Label><Input className="h-8 text-sm" value={rv.model} onChange={e => updateItem(recVehicles, setRecVehicles, i, "model", e.target.value)} /></div>
                <div><Label className="text-[10px]">VIN / Serial #</Label><Input className="h-8 text-sm" value={rv.vin_serial} onChange={e => updateItem(recVehicles, setRecVehicles, i, "vin_serial", e.target.value)} /></div>
                <div><Label className="text-[10px]">Garaging ZIP</Label><Input className="h-8 text-sm" value={rv.garaging_zip} onChange={e => updateItem(recVehicles, setRecVehicles, i, "garaging_zip", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Usage</Label>
                  <Select value={rv.usage_type} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "usage_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recreation">Recreation Only</SelectItem><SelectItem value="commute">Commute</SelectItem>
                      <SelectItem value="farm">Farm / Ranch</SelectItem><SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Liability Limit</Label>
                  <Select value={rv.liability_limit} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "liability_limit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25/50">$25,000 / $50,000</SelectItem>
                      <SelectItem value="50/100">$50,000 / $100,000</SelectItem>
                      <SelectItem value="100/300">$100,000 / $300,000</SelectItem>
                      <SelectItem value="250/500">$250,000 / $500,000</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px]">Comprehensive Coverage?</Label>
                  <Select value={rv.wants_comp} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "wants_comp", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                  {rv.wants_comp === "yes" && (
                    <div className="pl-3 border-l-2 border-primary/20">
                      <Label className="text-[10px]">Comprehensive Deductible</Label>
                      <Select value={rv.comp_deductible} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "comp_deductible", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="250">$250</SelectItem><SelectItem value="500">$500</SelectItem>
                          <SelectItem value="1000">$1,000</SelectItem><SelectItem value="2500">$2,500</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px]">Collision Coverage?</Label>
                  <Select value={rv.wants_collision} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "wants_collision", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                  {rv.wants_collision === "yes" && (
                    <div className="pl-3 border-l-2 border-primary/20">
                      <Label className="text-[10px]">Collision Deductible</Label>
                      <Select value={rv.collision_deductible} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "collision_deductible", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="250">$250</SelectItem><SelectItem value="500">$500</SelectItem>
                          <SelectItem value="1000">$1,000</SelectItem><SelectItem value="2500">$2,500</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">Trailer Coverage?</Label>
                  <Select value={rv.trailer_coverage} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "trailer_coverage", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px]">Accessories / Custom Equipment Value</Label>
                  <Input className="h-8 text-sm" value={rv.accessories_value} onChange={e => updateItem(recVehicles, setRecVehicles, i, "accessories_value", e.target.value)} placeholder="$0" />
                </div>
              </div>
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Optional Add-Ons</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">UM/UIM</Label>
                    <Select value={rv.um_uim} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "um_uim", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Medical Payments</Label>
                    <Select value={rv.med_pay} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "med_pay", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Emergency Towing</Label>
                    <Select value={rv.towing} onValueChange={v => updateItem(recVehicles, setRecVehicles, i, "towing", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {recVehicles.length < 10 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(recVehicles, setRecVehicles, emptyRecVehicle, 10)}><Plus className="h-3 w-3 mr-1" /> Add Vehicle</Button>}
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Personal Articles Step ─── */
  const renderPersonalArticlesStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Gem className="h-4 w-4" /> Personal Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">List items that should be separately insured.</p>
          {articles.map((a, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                {articles.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(articles, setArticles, i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Category</Label>
                  <Select value={a.category} onValueChange={v => updateItem(articles, setArticles, i, "category", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                      <SelectItem value="collectibles">Collectibles</SelectItem>
                      <SelectItem value="firearms">Firearms</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="instruments">Musical Instruments</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Description</Label><Input className="h-8 text-sm" value={a.description} onChange={e => updateItem(articles, setArticles, i, "description", e.target.value)} placeholder="e.g. Diamond ring" /></div>
                <div><Label className="text-[10px]">Estimated Value</Label><Input className="h-8 text-sm" value={a.estimated_value} onChange={e => updateItem(articles, setArticles, i, "estimated_value", e.target.value)} placeholder="$5,000" /></div>
              </div>
            </div>
          ))}
          {articles.length < 20 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(articles, setArticles, emptyArticle, 20)}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>}
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Documents Step Content ─── */
  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Upload any of the following if available:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DOCUMENT_CHECKLIST.map(item => {
                const hasFile = uploadedFiles.some(f => f.category === item.key);
                return (
                  <div key={item.key} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${hasFile ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/30 border-border text-muted-foreground"}`}>
                    {hasFile ? <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, JPG, PNG accepted</p>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleFileSelect} />
          </div>
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{uploadedFiles.length} file(s) attached</p>
              {uploadedFiles.map((uf, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate flex-1 min-w-0">{uf.file.name}</span>
                  <Select value={uf.category} onValueChange={v => updateFileCategory(idx, v)}>
                    <SelectTrigger className="h-7 text-[10px] w-[160px] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{DOCUMENT_CHECKLIST.map(c => <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(idx)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else your agent should know" rows={3} />
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Disclosure Step (Final) ─── */
  const renderDisclosureStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review and Authorization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">Coverage is not bound unless confirmed in writing by AURA Risk Group.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Quotes are subject to underwriting approval and eligibility guidelines.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Coverage selections and limits are chosen by the applicant.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Information provided must be complete and accurate.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">By submitting, you authorize AURA Risk Group to obtain necessary underwriting reports where permitted.</p>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox checked={disclosureAcknowledged} onCheckedChange={v => setDisclosureAcknowledged(!!v)} className="mt-0.5" />
            <span>I acknowledge and authorize underwriting review. <span className="text-destructive">*</span></span>
          </label>
        </CardContent>
      </Card>
    </div>
  );

  /* ─── Render current personal step ─── */
  const renderPersonalStep = () => {
    switch (currentStep) {
      case "coverage_select": return renderCoverageSelect();
      case "current_insurance": return renderCurrentInsurance();
      case "contact_info": return renderContactInfo();
      case "address": return renderAddress();
      case "household": return renderHousehold();
      case "homeowners": return renderHomeStep();
      case "auto": return renderAutoStep();
      case "flood": return renderFloodStep();
      case "boat": return renderBoatStep();
      case "recreational": return renderRecreationalStep();
      case "personal_articles": return renderPersonalArticlesStep();
      case "umbrella": return renderUmbrellaStep();
      case "documents": return renderDocumentsStep();
      case "disclosure": return renderDisclosureStep();
      // Prompt screens
      case "prompt_add_auto":
        return renderPromptScreen("prompt_add_auto", "Add Auto Review", "Would you like us to review your auto coverage as well?", setEnableAuto, "Yes, add Auto", "No, continue");
      case "prompt_add_property":
        return renderPromptScreen("prompt_add_property", "Add Property Review", "Would you like us to review your homeowners or renters coverage?", setEnableHome, "Yes, add Property", "No, continue");
      case "prompt_personal_articles":
        return renderPromptScreen("prompt_personal_articles", "High Value Items", "Do you have any items that should be separately insured, such as jewelry, collectibles, firearms, or art?", setEnableArticles, "Yes", "No");
      case "prompt_flood":
        return renderPromptScreen("prompt_flood", "Flood Coverage", "Would you like flood insurance reviewed?", setEnableFlood, "Yes", "No");
      case "prompt_umbrella":
        return renderPromptScreen("prompt_umbrella", "Umbrella Liability", "Would you like us to include an umbrella liability review?", setEnableUmbrella, "Yes", "No");
      case "prompt_additional_vehicles":
        return renderAdditionalVehiclesPrompt();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <span className="text-lg font-bold tracking-tight">AURA</span>
          <span className="ml-1.5 text-[10px] text-muted-foreground font-medium tracking-wide">Risk Group</span>
          <span className="ml-auto text-xs text-muted-foreground font-sans flex items-center gap-1">
            <Shield className="h-3 w-3" /> Secure Intake
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Title + AURA Promise */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">AURA Intake</h1>
          <p className="text-sm text-muted-foreground">Answer a few basics and let AURA pull the rest for you.</p>
        </div>

        {/* ─── Type Selector ─── */}
        {!intakeType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select coverage type</CardTitle>
              <p className="text-sm text-muted-foreground">AURA securely pulls data, loss history, and policy details, then pre-fills your intake so you spend minutes, not hours.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setIntakeType("personal"); setCurrentStep("coverage_select"); }}
                className="flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all border-border hover:border-primary/40"
              >
                <div className="p-2 rounded-lg bg-muted text-muted-foreground"><User className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-sm">Personal Lines</p>
                  <p className="text-xs text-muted-foreground">Auto, Home, Boat, Umbrella & more</p>
                </div>
              </button>
              <button
                onClick={() => setIntakeType("commercial")}
                className="flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all border-border hover:border-primary/40"
              >
                <div className="p-2 rounded-lg bg-muted text-muted-foreground"><Building2 className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-sm">Commercial Lines</p>
                  <p className="text-xs text-muted-foreground">GL, WC, Auto, Property & more</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {/* ─── PERSONAL LINES WIZARD ─── */}
        {intakeType === "personal" && (
          <>
            {renderStepNav()}
            {renderPersonalStep()}
            {renderStepButtons()}
          </>
        )}

        {/* ─── COMMERCIAL LINES WIZARD ─── */}
        {intakeType === "commercial" && !borGenerated && (
          <>
            {/* Commercial Step Progress */}
            {(() => {
              // Dynamic steps based on user choices
              const buildCommSteps = (): CommercialStepKey[] => {
                const steps: CommercialStepKey[] = ["industry", "insurance_check"];
                if (commercialForm.has_current_insurance === "no") {
                  steps.push("owner_experience");
                }
                steps.push("bor_auth");
                steps.push("full_intake");
                steps.push("coverage_questions");
                steps.push("commercial_docs");
                return steps;
              };
              const commSteps = buildCommSteps();
              const commStepLabels: Record<CommercialStepKey, string> = {
                industry: "Industry",
                insurance_check: "Current Insurance",
                owner_experience: "Experience",
                upload_dec: "Upload Dec Pages",
                bor_auth: "Broker of Record",
                full_intake: "Full Intake",
                coverage_questions: "Coverage Details",
                commercial_docs: "Documents & Submit",
              };
              const commIdx = commSteps.indexOf(commercialStep);
              const safeIdx = commIdx >= 0 ? commIdx : 0;
              const commProgress = ((safeIdx + 1) / commSteps.length) * 100;

              const validateCommStep = (): boolean => {
                if (commercialStep === "industry") {
                  if (!commercialForm.industry) { toast.error("Please select your industry"); return false; }
                }
                if (commercialStep === "insurance_check") {
                  if (!commercialForm.has_current_insurance) { toast.error("Please indicate if you currently have insurance"); return false; }
                }
                if (commercialStep === "full_intake") {
                  if (!commercialForm.business_name.trim()) { toast.error("Business name is required"); return false; }
                  if (!commercialForm.customer_name.trim()) { toast.error("Primary contact name is required"); return false; }
                  if (!commercialForm.customer_email.trim() || !/^[\w.-]+@[\w.-]+\.\w+$/.test(commercialForm.customer_email.trim())) { toast.error("A valid email is required"); return false; }
                  if (!commercialForm.customer_phone.trim()) { toast.error("Phone number is required"); return false; }
                  if (commercialForm.selected_coverage_lines.length === 0) { toast.error("Please select at least one coverage line"); return false; }
                }
                return true;
              };

              // Passive check (no toasts) for greying out Continue
              const isCommStepValid = (): boolean => {
                if (commercialStep === "industry") return !!commercialForm.industry;
                if (commercialStep === "insurance_check") return !!commercialForm.has_current_insurance;
                if (commercialStep === "bor_auth") {
                  // BOR is optional — always valid to continue
                  return true;
                }
                if (commercialStep === "full_intake") {
                  return !!(commercialForm.business_name.trim() && commercialForm.customer_name.trim() && commercialForm.customer_email.trim() && /^[\w.-]+@[\w.-]+\.\w+$/.test(commercialForm.customer_email.trim()) && commercialForm.customer_phone.trim() && commercialForm.selected_coverage_lines.length > 0);
                }
                return true;
              };

              const commGoNext = () => {
                if (!validateCommStep()) return;
                const next = commSteps[safeIdx + 1];
                if (next) { setCommercialStep(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
              };
              const commGoBack = () => {
                const prev = commSteps[safeIdx - 1];
                if (prev) { setCommercialStep(prev); window.scrollTo({ top: 0, behavior: "smooth" }); }
              };

              const updateLossRunPolicy = (idx: number, field: keyof LossRunPolicyInfo, value: string) => {
                const updated = [...commercialForm.loss_run_policies];
                updated[idx] = { ...updated[idx], [field]: value };
                updateCommercial("loss_run_policies", updated);
              };

              return (
                <>
                  <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/50 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Step {safeIdx + 1} of {commSteps.length}</span>
                        <span>{commStepLabels[commercialStep]}</span>
                      </div>
                      <Progress value={commProgress} className="h-1.5" />
                    </div>
                  </div>

                  {commercialStep === "industry" && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">What industry is your business in?</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Select the category that best describes your business so we can tailor the underwriting and insurance review.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {COMMERCIAL_INDUSTRY_OPTIONS.map(ind => {
                            const sel = commercialForm.industry === ind.label;
                            return (
                              <button key={ind.key} onClick={() => updateCommercial("industry", ind.label)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${sel ? "bg-primary/10 border-primary shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}>
                                <span className="text-2xl">{ind.icon}</span>
                                <span className={`text-sm font-medium ${sel ? "text-primary" : ""}`}>{ind.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {commercialForm.industry === "Other" && (
                          <div className="pt-2">
                            <Label className="text-xs">Please describe your industry</Label>
                            <Input
                              placeholder="e.g. Manufacturing, Technology, etc."
                              value={commercialForm.business_type}
                              onChange={e => updateCommercial("business_type", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {commercialStep === "insurance_check" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Current Insurance</CardTitle>
                        <p className="text-sm text-muted-foreground">Do you currently have business insurance?</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Yes/No selection */}
                        <div className="grid grid-cols-2 gap-3">
                          {[{ val: "yes", label: "Yes" }, { val: "no", label: "No" }].map(opt => {
                            const sel = commercialForm.has_current_insurance === opt.val;
                            return (
                              <button key={opt.val} onClick={() => updateCommercial("has_current_insurance", opt.val)}
                                className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${sel ? "bg-primary/10 border-primary" : "border-border hover:border-primary/40"}`}>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {commercialForm.has_current_insurance === "yes" && (
                          <div className="space-y-6">
                            {/* Section A - Fast Track */}
                            <div className="space-y-3">
                              <div>
                                <h3 className="text-sm font-semibold">Fast track: drop in your current policy and/or your declaration pages</h3>
                                <p className="text-xs text-muted-foreground mt-1">Upload your declarations pages or policy docs. AURA will read them, pull the important stuff, and fill this in for you.</p>
                              </div>
                              <div
                                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={(e) => { 
                                  e.preventDefault(); 
                                  setDragActive(false); 
                                  const files = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|jpg|jpeg|png)$/i.test(f.name)); 
                                  if (files.length > 0) { 
                                    setUploadedFiles(prev => [...prev, ...files.map(f => ({ file: f, category: "dec_pages" }))]); 
                                    updateCommercial("has_uploaded_dec_pages", true);
                                    setShowLossRunModal(true);
                                  } 
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragActive ? "border-primary bg-primary/5 scale-[1.02] shadow-lg" : "border-border hover:border-primary/50"}`}
                              >
                                <Upload className={`h-8 w-8 mx-auto mb-2 text-muted-foreground transition-transform ${dragActive ? "animate-bounce" : ""}`} />
                                <p className="text-sm font-medium">Click or drag & drop policy docs</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG accepted</p>
                                <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { 
                                  const files = Array.from(e.target.files || []).filter(f => /\.(pdf|jpg|jpeg|png)$/i.test(f.name)); 
                                  if (files.length > 0) { 
                                    setUploadedFiles(prev => [...prev, ...files.map(f => ({ file: f, category: "dec_pages" }))]); 
                                    updateCommercial("has_uploaded_dec_pages", true);
                                    setShowLossRunModal(true);
                                  } 
                                  e.target.value = ""; 
                                }} />
                              </div>
                              
                              {/* Extraction status */}
                              {uploadedFiles.filter(f => f.category === "dec_pages").length > 0 && (
                                <div className="space-y-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
                                  <p className="text-sm font-medium flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" /> {uploadedFiles.filter(f => f.category === "dec_pages").length} file(s) uploaded
                                  </p>
                                  {uploadedFiles.filter(f => f.category === "dec_pages").map((uf, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">{uf.file.name}</span>
                                    </div>
                                  ))}
                                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Reading your declarations pages...
                                  </p>
                                  {lossRunRequested && (
                                    <p className="text-xs text-primary mt-1 flex items-center gap-1.5">
                                      <Check className="h-3 w-3" /> We're requesting your loss runs in the background. Keep going—we'll plug them in when they land.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-xs text-muted-foreground font-medium">OR</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Section B - Manual Entry */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold">Enter your policy details manually</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-2 border-primary/20">
                                <div><Label className="text-xs">Carrier Name</Label><Input value={commercialForm.current_carrier_name} onChange={e => updateCommercial("current_carrier_name", e.target.value)} /></div>
                                <div><Label className="text-xs">Policy Number</Label><Input value={commercialForm.policy_number} onChange={e => updateCommercial("policy_number", e.target.value)} /></div>
                                <div><Label className="text-xs">Effective Date</Label><Input type="date" value={commercialForm.policy_effective_date} onChange={e => updateCommercial("policy_effective_date", e.target.value)} /></div>
                                <div><Label className="text-xs">Expiration Date</Label><Input type="date" value={commercialForm.policy_expiration_date} onChange={e => updateCommercial("policy_expiration_date", e.target.value)} /></div>
                                <div className="sm:col-span-2">
                                  <Label className="text-xs">Current Policies</Label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {COMMERCIAL_LINES.map(line => {
                                      const sel = commercialForm.lines_in_force.includes(line);
                                      return (
                                        <button key={line} onClick={() => updateCommercial("lines_in_force", sel ? commercialForm.lines_in_force.filter(l => l !== line) : [...commercialForm.lines_in_force, line])}
                                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                                          {line}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {commercialStep === "bor_auth" && (
                    <div className="space-y-6">
                      {/* Explainer Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Broker of Record (optional)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                            <p className="text-sm leading-relaxed">
                              A Broker of Record letter does not cancel your policy or change your coverage on its own. It just authorizes <strong>AURA Risk Group</strong> to represent you with the carrier and run the negotiation on your behalf.
                            </p>
                          </div>

                          {/* How this helps you */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">How this helps you</p>
                            <p className="text-sm text-muted-foreground">
                              Carriers ask one question first: "Who controls this account?" When you sign a BOR, the answer is clear. We do. That's what gets your file to the top of the stack and makes them bring real numbers instead of placeholders.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              You get one coordinated strategy instead of three brokers taking random shots in the dark.
                            </p>
                          </div>

                          {/* What happens if you sign */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">What happens if you sign</p>
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> We generate the BOR letter and send it to you to sign electronically.</li>
                              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Once you sign, it lands in your advisor's inbox so we can send it straight to the carrier.</li>
                              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Your current broker will be notified. Most carriers allow a short window to change your mind. That's normal—it's just them confirming this is what you want.</li>
                              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Once the carrier confirms, AURA is on record as your broker. Your coverage stays in place. We just take over the heavy lifting with the carrier.</li>
                            </ul>
                          </div>

                          {/* BOR Accepted State */}
                          {borAccepted === true && (
                            <div className="space-y-4">
                              {/* Select Lines for BOR */}
                              <div>
                                <Label className="text-xs font-medium">Select lines for your BOR</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {(commercialForm.lines_in_force.length > 0 ? commercialForm.lines_in_force : COMMERCIAL_LINES.map(String)).map(line => {
                                    const sel = commercialForm.bor_lines.includes(line);
                                    return (
                                      <button key={line} onClick={() => updateCommercial("bor_lines", sel ? commercialForm.bor_lines.filter(l => l !== line) : [...commercialForm.bor_lines, line])}
                                        className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                                        {line}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* BOR Preview */}
                              <div className="rounded-lg border bg-card p-4 space-y-3">
                                <p className="text-sm font-medium">Here's the letter we'll send to your carrier.</p>
                                <div className="text-xs text-muted-foreground space-y-1 pl-3 border-l-2 border-primary/20">
                                  <p><strong>Insured:</strong> {commercialForm.business_name || "(your business name)"}</p>
                                  <p><strong>Carrier:</strong> {commercialForm.current_carrier_name || "(carrier)"}</p>
                                  <p><strong>Policy:</strong> {commercialForm.policy_number || "(policy number)"}</p>
                                  <p><strong>Lines:</strong> {commercialForm.bor_lines.join(", ") || "(select above)"}</p>
                                </div>
                                <Button className="w-full" disabled={commercialForm.bor_lines.length === 0} onClick={() => updateCommercial("bor_authorized", true)}>
                                  Review and sign electronically
                                </Button>
                                <p className="text-[10px] text-muted-foreground text-center">
                                  Once you sign, your advisor gets this in their inbox and sends it to the carrier. Your coverage stays the same. We just become your point of contact.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* BOR Skipped Message */}
                          {borAccepted === false && (
                            <div className="rounded-lg border border-border bg-muted/30 p-4">
                              <p className="text-sm">No problem. You can finish your intake and decide on the BOR later.</p>
                            </div>
                          )}

                          {/* CTA Buttons - only show if not yet decided */}
                          {borAccepted === null && (
                            <div className="space-y-3">
                              <Button className="w-full h-11" onClick={() => setBorAccepted(true)}>
                                Yes – make AURA my Broker of Record
                              </Button>
                              <Button variant="outline" className="w-full h-11" onClick={() => setBorAccepted(false)}>
                                Not right now – continue without BOR
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {commercialStep === "full_intake" && (
                    <div className="space-y-6">
                      {/* Business Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Full Intake</CardTitle>
                          <p className="text-sm text-muted-foreground">Let's walk through your operations, people, property, and risk.</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><Label className="text-xs">Business Name *</Label><Input value={commercialForm.business_name} onChange={e => updateCommercial("business_name", e.target.value)} /></div>
                            <div><Label className="text-xs">DBA (if applicable)</Label><Input value={commercialForm.dba} onChange={e => updateCommercial("dba", e.target.value)} /></div>
                            <div><Label className="text-xs">Primary Contact Name *</Label><Input value={commercialForm.customer_name} onChange={e => updateCommercial("customer_name", e.target.value)} /></div>
                            <div><Label className="text-xs">Email *</Label><Input type="email" value={commercialForm.customer_email} onChange={e => updateCommercial("customer_email", e.target.value)} /></div>
                            <div><Label className="text-xs">Phone *</Label><Input value={commercialForm.customer_phone} onChange={e => updateCommercial("customer_phone", e.target.value)} /></div>
                            <div><Label className="text-xs">FEIN / EIN</Label><Input value={commercialForm.ein} onChange={e => updateCommercial("ein", e.target.value)} /></div>
                            <div>
                              <Label className="text-xs">Business Entity Type</Label>
                              <Select value={commercialForm.business_type || ""} onValueChange={v => updateCommercial("business_type", v)}>
                                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem><SelectItem value="partnership">Partnership</SelectItem>
                                  <SelectItem value="corporation">Corporation</SelectItem><SelectItem value="llc">LLC</SelectItem>
                                  <SelectItem value="nonprofit">Non-Profit</SelectItem><SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label className="text-xs">Street Address</Label><Input value={commercialForm.street_address} onChange={e => updateCommercial("street_address", e.target.value)} /></div>
                            <div><Label className="text-xs">City</Label><Input value={commercialForm.city} onChange={e => updateCommercial("city", e.target.value)} /></div>
                            <div>
                              <Label className="text-xs">State</Label>
                              <Select value={commercialForm.state} onValueChange={v => updateCommercial("state", v)}>
                                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
                                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label className="text-xs">ZIP</Label><Input value={commercialForm.zip} onChange={e => updateCommercial("zip", e.target.value)} /></div>
                            <div><Label className="text-xs">Number of Employees</Label><Input value={commercialForm.employee_count} onChange={e => updateCommercial("employee_count", e.target.value)} /></div>
                            <div><Label className="text-xs">Annual Revenue</Label><Input value={commercialForm.annual_revenue} onChange={e => updateCommercial("annual_revenue", e.target.value)} /></div>
                            <div><Label className="text-xs">Years in Business</Label><Input value={commercialForm.years_in_business} onChange={e => updateCommercial("years_in_business", e.target.value)} /></div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Coverage Selection */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">What coverage lines do you need?</CardTitle>
                          <p className="text-sm text-muted-foreground">Select all that apply. This helps us ask the right underwriting questions.</p>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {["General Liability", "Workers Compensation", "Commercial Auto", "Commercial Property", "Umbrella / Excess", "Professional Liability", "Cyber Liability", "Other"].map(line => {
                              const sel = commercialForm.selected_coverage_lines.includes(line);
                              return (
                                <button key={line} onClick={() => {
                                  const newLines = sel
                                    ? commercialForm.selected_coverage_lines.filter(l => l !== line)
                                    : [...commercialForm.selected_coverage_lines, line];
                                  updateCommercial("selected_coverage_lines", newLines);
                                }}
                                className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${sel ? "bg-primary/10 border-primary" : "border-border hover:border-primary/40"}`}>
                                  {line}
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {commercialStep === "coverage_questions" && (() => {
                    const questions = getQuestionsForCoverage(commercialForm.selected_coverage_lines);
                    // Filter out questions already answered in business_info step
                    const alreadyCovered = new Set(["business_name", "dba", "years_in_business", "mailing_address", "business_entity_type"]);
                    const activeQuestions = questions.filter(q =>
                      !alreadyCovered.has(q.key) &&
                      (!q.dependsOn || q.dependsOn(commercialForm.acord_data))
                    );
                    const grouped = groupQuestionsBySection(activeQuestions);
                    const sections = Object.keys(grouped) as AcordSection[];

                    const updateAcordField = (key: string, value: any) => {
                      updateCommercial("acord_data", { ...commercialForm.acord_data, [key]: value });
                    };

                    const renderQuestion = (q: AcordQuestion) => {
                      const val = commercialForm.acord_data[q.key] ?? "";
                      switch (q.type) {
                        case "text":
                          return <Input value={val} onChange={e => updateAcordField(q.key, e.target.value)} placeholder={q.placeholder} />;
                        case "number":
                          return <Input type="number" value={val} onChange={e => updateAcordField(q.key, e.target.value)} placeholder={q.placeholder} />;
                        case "currency":
                          return <Input value={val} onChange={e => updateAcordField(q.key, e.target.value)} placeholder={q.placeholder || "$0"} />;
                        case "date":
                          return <Input type="date" value={val} onChange={e => updateAcordField(q.key, e.target.value)} />;
                        case "boolean":
                          return (
                            <Select value={val === true ? "yes" : val === false ? "no" : val || ""} onValueChange={v => updateAcordField(q.key, v)}>
                              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                            </Select>
                          );
                        case "select":
                          return (
                            <Select value={val} onValueChange={v => updateAcordField(q.key, v)}>
                              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{(q.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                          );
                        default:
                          return <Input value={val} onChange={e => updateAcordField(q.key, e.target.value)} />;
                      }
                    };

                    return (
                      <div className="space-y-6">
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <p className="text-sm">These questions help us prefill your ACORD application forms so your agent can start working immediately.</p>
                        </div>
                        {sections.map(section => (
                          <Card key={section}>
                            <CardHeader>
                              <CardTitle className="text-base">{SECTION_LABELS[section] || section}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {grouped[section].map(q => (
                                <div key={q.key} className="space-y-1.5">
                                  <Label className="text-xs font-medium">
                                    {q.label} {q.required && <span className="text-destructive">*</span>}
                                  </Label>
                                  {renderQuestion(q)}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                        {sections.length === 0 && (
                          <Card>
                            <CardContent className="py-8 text-center">
                              <p className="text-sm text-muted-foreground">No additional questions needed for your selected coverage lines. Continue to the next step.</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}

                  {commercialStep === "commercial_docs" && (
                    <div className="space-y-6">
                      {/* Tighten Your File — only show if no docs uploaded earlier */}
                      {!commercialForm.has_uploaded_dec_pages && !lossRunRequested && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Tighten Your File</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Want us to request your loss runs and review any docs you have? It helps underwriters give you better pricing and coverage.
                            </p>
                            <div className="space-y-2">
                              <Button className="w-full h-10 text-sm" onClick={() => {
                                fileInputRef.current?.click();
                                setLossRunRequested(true);
                                toast.success("We're requesting your loss runs in the background.");
                              }}>
                                Upload docs and request loss runs
                              </Button>
                              <Button variant="outline" className="w-full h-10 text-sm" onClick={() => {
                                setLossRunRequested(true);
                                toast.success("We're requesting your loss runs in the background. Keep going!");
                              }}>
                                Request loss runs only
                              </Button>
                              <Button variant="ghost" className="w-full h-10 text-sm text-muted-foreground" onClick={() => { /* skip */ }}>
                                Skip for now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Additional Documents</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div
                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                          >
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium">Drag & drop files here</p>
                            <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, JPG, PNG accepted</p>
                            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleFileSelect} />
                          </div>
                          {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium">{uploadedFiles.length} file(s) attached</p>
                              {uploadedFiles.map((uf, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-xs truncate flex-1 min-w-0">{uf.file.name}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(idx)}><X className="h-3 w-3" /></Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
                        <CardContent>
                          <Textarea value={commercialForm.additional_notes} onChange={e => updateCommercial("additional_notes", e.target.value)} placeholder="Anything else your agent should know" rows={3} />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {commercialStep === "owner_experience" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Ownership & Industry Experience</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                          <p className="text-sm leading-relaxed">
                            New businesses typically do not have prior insurance history. Insurance carriers will review the ownership and management team's experience when evaluating coverage.
                          </p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            You may upload a resume or provide a summary of your experience in this industry.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Upload Resume (optional)</Label>
                          <div
                            onClick={() => {
                              const inp = document.createElement("input");
                              inp.type = "file";
                              inp.accept = ".pdf,.doc,.docx,.txt";
                              inp.onchange = (ev: any) => {
                                const files = Array.from(ev.target.files || []) as File[];
                                if (files.length > 0) {
                                  setUploadedFiles(prev => [...prev, ...files.map(f => ({ file: f, category: "resume" }))]);
                                  updateCommercial("owner_resume_files", [...commercialForm.owner_resume_files, ...files.map(f => f.name)]);
                                }
                              };
                              inp.click();
                            }}
                            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors border-border hover:border-primary/50"
                          >
                            <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-sm font-medium">Click to upload resume</p>
                            <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, TXT accepted</p>
                          </div>
                          {uploadedFiles.filter(f => f.category === "resume").length > 0 && (
                            <div className="space-y-1">
                              {uploadedFiles.filter(f => f.category === "resume").map((uf, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-xs truncate flex-1">{uf.file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Experience Summary (optional)</Label>
                          <Textarea
                            value={commercialForm.owner_resume_text}
                            onChange={e => updateCommercial("owner_resume_text", e.target.value)}
                            placeholder="Describe your experience in this industry — years of experience, relevant roles, certifications, etc."
                            rows={5}
                          />
                          <p className="text-[10px] text-muted-foreground italic">
                            AURA will help format your experience summary so it can be shared with insurance carriers during underwriting.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}


                  <div className="flex gap-3 pt-2">
                    {safeIdx === 0 ? (
                      <Button variant="outline" className="flex-1 h-11" onClick={() => setIntakeType(null)}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                    ) : (
                      <Button variant="outline" className="flex-1 h-11" onClick={commGoBack}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                    )}
                    {safeIdx < commSteps.length - 1 ? (
                      <Button className="flex-1 h-11" onClick={commGoNext} disabled={!isCommStepValid()}>
                        Continue <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button className="flex-1 h-11 text-base" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit"}
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* Commercial BOR Success */}
        {intakeType === "commercial" && borGenerated && (
          <Card>
            <CardContent className="pt-8 text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Submitted</h2>
              <p className="text-sm text-muted-foreground">Your information has been securely submitted. Your agent will be in touch.</p>
              {borSignToken && (
                <div className="pt-4 space-y-2">
                  <p className="text-sm font-medium">A Broker of Record signing link has been sent to your email.</p>
                  <Button variant="outline" onClick={() => window.open(`/bor-sign/${borSignToken}`, "_blank")}>
                    Sign BOR Letter Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center pb-8 pt-4 space-y-1">
          <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase">Insurance runs on <span className="font-semibold">AURA</span></p>
        </div>
      </div>

      {/* ─── Loss Run Authorization Modal ─── */}
      {showLossRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="max-w-lg w-full shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">Let us grab your loss runs for you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Carriers price you off your past claims. That's what loss runs are. Instead of you emailing and calling around, we can pull them for you through our partner, Loss Run Pro.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> We send the requests straight to your current and past carriers.</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> You don't have to lift a finger after this.</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> We use the reports to sharpen pricing and coverage. That's it.</li>
              </ul>
              <label className="flex items-start gap-3 text-sm cursor-pointer p-3 rounded-lg border border-border bg-muted/20">
                <Checkbox checked={commercialForm.loss_run_consent} onCheckedChange={v => updateCommercial("loss_run_consent", !!v)} className="mt-0.5" />
                <span>I'm good with AURA requesting my loss runs from my current and past carriers.</span>
              </label>
              <div className="flex gap-3">
                <Button className="flex-1 h-11" disabled={!commercialForm.loss_run_consent} onClick={() => {
                  setLossRunRequested(true);
                  setShowLossRunModal(false);
                  toast.success("We're requesting your loss runs in the background. Keep going—we'll plug them in when they land.");
                }}>
                  Yep, do it
                </Button>
                <Button variant="outline" className="flex-1 h-11" onClick={() => setShowLossRunModal(false)}>
                  Not right now
                </Button>
              </div>
              <button className="text-xs text-primary hover:underline w-full text-center" onClick={() => { setShowLossRunModal(false); setShowDataUsageOverlay(true); }}>
                How we use your data
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── How We Use Your Data Overlay ─── */}
      {showDataUsageOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">How we use your data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> We only pull what you say we can.</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> We use it to fill in forms, understand your risk, and go to market for you.</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> A human on our team can walk you through anything, line by line.</li>
              </ul>
              <Button className="w-full h-11" onClick={() => { setShowDataUsageOverlay(false); setShowLossRunModal(true); }}>
                Got it
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
