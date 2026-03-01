import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  ChevronLeft, ChevronRight, Droplets,
} from "lucide-react";
import { toast } from "sonner";
import auraLogo from "@/assets/aura-logo.png";

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
type Vehicle = { year: string; make: string; model: string; vin: string; usage: string; garaging_zip: string };
type HomeInfo = { address: string; city: string; state: string; zip: string; year_built: string; square_footage: string; construction_type: string; roof_type: string; roof_year: string; occupancy: string; rent_roll: string; heating_type: string; electrical_update_year: string; plumbing_update_year: string; has_pool: boolean; has_trampoline: boolean; has_dog: boolean; dog_breed: string; alarm_type: string; fire_extinguishers: boolean; smoke_detectors: boolean; deadbolts: boolean; sprinkler_system: boolean; claims_5_years: string };
type Boat = { year: string; make: string; model: string; length: string; hull_type: string; engine_type: string; horsepower: string; value: string; storage_location: string };
type UmbrellaInfo = { wants_umbrella: "" | "yes" | "no"; requested_limit: string; major_violations: "" | "yes" | "no"; has_watercraft_unlisted: "" | "yes" | "no"; has_rental_unlisted: "" | "yes" | "no"; has_pool_trampoline_unlisted: "" | "yes" | "no"; acknowledge_umbrella: boolean };
type FloodInfo = { flood_zone: string; has_flood_insurance: string; current_flood_carrier: string; current_flood_premium: string; flood_policy_number: string; building_coverage: string; contents_coverage: string; elevation_cert: string; foundation_type: string; lowest_floor_elevation: string; num_flood_claims: string; preferred_deductible: string };

interface AutoCoverage {
  liability_type: "" | "split" | "csl";
  bi_limit: string;
  pd_limit: string;
  csl_limit: string;
  um_uim_limit: string;
  med_pay_limit: string;
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
  um_uim_limit: "", med_pay_limit: "",
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
const emptyVehicle = (): Vehicle => ({ year: "", make: "", model: "", vin: "", usage: "", garaging_zip: "" });
const emptyHome = (): HomeInfo => ({ address: "", city: "", state: "", zip: "", year_built: "", square_footage: "", construction_type: "", roof_type: "", roof_year: "", occupancy: "", rent_roll: "", heating_type: "", electrical_update_year: "", plumbing_update_year: "", has_pool: false, has_trampoline: false, has_dog: false, dog_breed: "", alarm_type: "", fire_extinguishers: false, smoke_detectors: false, deadbolts: false, sprinkler_system: false, claims_5_years: "" });
const emptyBoat = (): Boat => ({ year: "", make: "", model: "", length: "", hull_type: "", engine_type: "", horsepower: "", value: "", storage_location: "" });
const emptyUmbrella = (): UmbrellaInfo => ({ wants_umbrella: "", requested_limit: "", major_violations: "", has_watercraft_unlisted: "", has_rental_unlisted: "", has_pool_trampoline_unlisted: "", acknowledge_umbrella: false });
const emptyFlood = (): FloodInfo => ({ flood_zone: "", has_flood_insurance: "", current_flood_carrier: "", current_flood_premium: "", flood_policy_number: "", building_coverage: "", contents_coverage: "", elevation_cert: "", foundation_type: "", lowest_floor_elevation: "", num_flood_claims: "", preferred_deductible: "" });

/* ─── Commercial Lines Types ─── */
type CommercialStepKey = "business_info" | "policy_info" | "bor_auth" | "commercial_docs";

const COMMERCIAL_LINES = [
  "General Liability", "Workers Compensation", "Commercial Auto",
  "Property", "Umbrella", "Other",
] as const;

interface CommercialFormData {
  customer_name: string; customer_email: string; customer_phone: string;
  business_name: string; dba: string; ein: string; business_type: string;
  street_address: string; city: string; state: string; zip: string;
  employee_count: string; annual_revenue: string; years_in_business: string;
  requested_coverage: string; requested_premium: string; additional_notes: string;
  // Step 2: Policy Info
  has_current_insurance: "" | "yes" | "no";
  current_carrier_name: string;
  policy_number: string;
  policy_effective_date: string;
  policy_expiration_date: string;
  lines_in_force: string[];
  // Step 3: BOR
  wants_bor: "" | "yes" | "no";
  bor_lines: string[];
  bor_authorized: boolean;
  carrier_email: string;
}

const emptyCommercial = (): CommercialFormData => ({
  customer_name: "", customer_email: "", customer_phone: "",
  business_name: "", dba: "", ein: "", business_type: "",
  street_address: "", city: "", state: "", zip: "",
  employee_count: "", annual_revenue: "", years_in_business: "",
  requested_coverage: "", requested_premium: "", additional_notes: "",
  has_current_insurance: "", current_carrier_name: "", policy_number: "",
  policy_effective_date: "", policy_expiration_date: "",
  lines_in_force: [], wants_bor: "", bor_lines: [], bor_authorized: false,
  carrier_email: "",
});

/* ─── Step definitions for personal lines ─── */
type StepKey = "info" | "auto" | "home_flood" | "boat_umbrella" | "documents";

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
  const [enableAuto, setEnableAuto] = useState(true);
  const [enableHome, setEnableHome] = useState(true);
  const [enableFlood, setEnableFlood] = useState(false);
  const [enableBoat, setEnableBoat] = useState(false);
  const [enableUmbrella, setEnableUmbrella] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([emptyDriver()]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);
  const [homes, setHomes] = useState<HomeInfo[]>([emptyHome()]);
  const [boats, setBoats] = useState<Boat[]>([emptyBoat()]);
  const [umbrella, setUmbrella] = useState<UmbrellaInfo>(emptyUmbrella());
  const [flood, setFlood] = useState<FloodInfo>(emptyFlood());
  const [autoCoverage, setAutoCoverage] = useState<AutoCoverage>(emptyAutoCoverage());
  const updateCov = (field: keyof AutoCoverage, value: any) => setAutoCoverage(prev => ({ ...prev, [field]: value }));
  const updateFlood = (field: keyof FloodInfo, value: string) => setFlood(prev => ({ ...prev, [field]: value }));

  // ─── Wizard step (personal lines only) ───
  const [currentStep, setCurrentStep] = useState<StepKey>("info");

  // ─── Commercial State ───
  const [commercialForm, setCommercialForm] = useState<CommercialFormData>(emptyCommercial());
  const [commercialStep, setCommercialStep] = useState<CommercialStepKey>("business_info");
  const [borGenerated, setBorGenerated] = useState(false);

  // ─── Shared State ───
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; category: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Compute active steps based on toggles */
  const getActiveSteps = (): StepKey[] => {
    const steps: StepKey[] = ["info"];
    if (enableAuto) steps.push("auto");
    if (enableHome || enableFlood) steps.push("home_flood");
    if (enableBoat || enableUmbrella) steps.push("boat_umbrella");
    steps.push("documents");
    return steps;
  };
  const activeSteps = getActiveSteps();
  const currentStepIndex = activeSteps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeSteps.length - 1;
  const progressPercent = ((currentStepIndex + 1) / activeSteps.length) * 100;

  const stepLabels: Record<StepKey, string> = {
    info: "Your Info",
    auto: "Auto",
    home_flood: enableHome && enableFlood ? "Home & Flood" : enableFlood ? "Flood" : "Home",
    boat_umbrella: enableBoat && enableUmbrella ? "Boat & Umbrella" : enableUmbrella ? "Umbrella" : "Boat",
    documents: "Documents & Submit",
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
    if (currentStep === "info") {
      if (!applicantName.trim()) { toast.error("Name is required"); return false; }
      if (!applicantEmail.trim() || !/^[\w.-]+@[\w.-]+\.\w+$/.test(applicantEmail.trim())) { toast.error("A valid email is required"); return false; }
      if (!applicantPhone.trim()) { toast.error("Phone number is required"); return false; }
      if (!applicantAddress.trim()) { toast.error("Mailing address is required"); return false; }
    }
    if (currentStep === "auto") {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (!v.year.trim() || !v.make.trim() || !v.model.trim() || !v.vin.trim() || !v.garaging_zip.trim()) {
          toast.error(`Vehicle ${i + 1}: Year, Make, Model, VIN, and Garaging ZIP are required`);
          return false;
        }
      }
      if (!autoCoverage.acknowledge_disclosure) { toast.error("You must acknowledge the auto applicant disclosure"); return false; }
      if (!autoCoverage.authorize_underwriting) { toast.error("You must authorize underwriting reports"); return false; }
    }
    if (currentStep === "boat_umbrella" && enableUmbrella) {
      if (umbrella.wants_umbrella === "yes" && !umbrella.acknowledge_umbrella) {
        toast.error("You must acknowledge the umbrella disclosure"); return false;
      }
    }
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

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!record || !intakeType) return;

    // For personal lines, validate current step first
    if (intakeType === "personal" && !validateCurrentStep()) return;

    // Shared required fields
    const name = intakeType === "personal" ? applicantName : commercialForm.customer_name;
    const email = intakeType === "personal" ? applicantEmail : commercialForm.customer_email;
    const phone = intakeType === "personal" ? applicantPhone : commercialForm.customer_phone;
    const address = intakeType === "personal" ? applicantAddress : commercialForm.street_address;

    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!email.trim() || !/^[\w.-]+@[\w.-]+\.\w+$/.test(email.trim())) { toast.error("A valid email is required"); return; }
    if (!phone.trim()) { toast.error("Phone number is required"); return; }
    if (!address.trim()) { toast.error("Mailing address is required"); return; }

    if (intakeType === "commercial" && !commercialForm.business_name.trim()) {
      toast.error("Business name is required"); return;
    }

    setSubmitting(true);

    const docMeta = uploadedFiles.map(uf => ({ name: uf.file.name, category: uf.category, size: uf.file.size }));

    try {
      if (intakeType === "personal") {
        const formData = {
          intake_type: "personal",
          applicant: { name: applicantName, email: applicantEmail, phone: applicantPhone, address: applicantAddress },
          sections: {
            auto: enableAuto ? { drivers, vehicles, coverage: autoCoverage } : null,
            home: enableHome ? { properties: homes } : null,
            flood: enableFlood ? flood : null,
            boat: enableBoat ? { boats } : null,
            umbrella: enableUmbrella ? umbrella : null,
          },
          documents: docMeta,
          notes,
        };

        if (tokenSource === "personal_intake_submissions") {
          const { error } = await supabase
            .from("personal_intake_submissions")
            .update({ form_data: formData as any, status: "submitted", submitted_at: new Date().toISOString(), is_used: true })
            .eq("id", record.id);
          if (error) throw error;

          try {
            const deliveryEmails = record.delivery_emails;
            if (deliveryEmails?.length > 0) {
              const sections = [enableAuto && "Auto", enableHome && "Home", enableFlood && "Flood", enableBoat && "Boat", enableUmbrella && "Umbrella"].filter(Boolean).join(", ");
              await supabase.functions.invoke("send-personal-intake-email", { body: { token: record.token, applicant_name: applicantName, sections } });
            }
          } catch { /* email failure shouldn't block */ }
        } else {
          const structuredNotes = `Intake Type: Personal Lines\nApplicant: ${applicantName}\nEmail: ${applicantEmail}\nPhone: ${applicantPhone}\nAddress: ${applicantAddress}\nSections: ${[enableAuto && "Auto", enableHome && "Home", enableFlood && "Flood", enableBoat && "Boat", enableUmbrella && "Umbrella"].filter(Boolean).join(", ")}\nNotes: ${notes}`;
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
          const { error } = await supabase
            .from("personal_intake_submissions")
            .update({ form_data: formData as any, status: "submitted", submitted_at: new Date().toISOString(), is_used: true })
            .eq("id", record.id);
          if (error) throw error;

          // Create lead + business_submission so data flows into pipeline & ACORDs
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
            <h2 className="text-xl font-semibold">Thank You!</h2>
            <p className="text-sm text-muted-foreground">Your information has been securely submitted. Your agent will be in touch soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Step Navigation Bar ─── */
  const renderStepNav = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Step {currentStepIndex + 1} of {activeSteps.length}</span>
        <span>{stepLabels[currentStep]}</span>
      </div>
      <Progress value={progressPercent} className="h-1.5" />
      <div className="flex gap-1 justify-center">
        {activeSteps.map((step, idx) => (
          <button
            key={step}
            onClick={() => {
              if (idx < currentStepIndex) setCurrentStep(step);
            }}
            className={`h-2 rounded-full transition-all ${
              idx === currentStepIndex ? "w-8 bg-primary" :
              idx < currentStepIndex ? "w-2 bg-primary/50 cursor-pointer hover:bg-primary/70" :
              "w-2 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );

  /* ─── Step Buttons ─── */
  const renderStepButtons = () => (
    <div className="flex gap-3 pt-2">
      {!isFirstStep && (
        <Button variant="outline" className="flex-1 h-11" onClick={goBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      )}
      {isLastStep ? (
        <Button className="flex-1 h-11 text-base" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Information"}
        </Button>
      ) : (
        <Button className="flex-1 h-11" onClick={goNext}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
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
                <div><Label className="text-[10px]">Violations / Accidents (last 5 years)</Label><Input className="h-8 text-sm" value={d.violations} onChange={e => updateItem(drivers, setDrivers, i, "violations", e.target.value)} placeholder="None, or describe..." /></div>
              </div>
            ))}
            {drivers.length < 5 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(drivers, setDrivers, emptyDriver, 5)}><Plus className="h-3 w-3 mr-1" /> Add Driver</Button>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Vehicles</h3>
              <Badge variant="secondary" className="text-[10px]">{vehicles.length}/5</Badge>
            </div>
            {vehicles.map((v, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Vehicle {i + 1}</span>
                  {vehicles.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(vehicles, setVehicles, i)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Year <span className="text-destructive">*</span></Label><Input className="h-8 text-sm" value={v.year} onChange={e => updateItem(vehicles, setVehicles, i, "year", e.target.value)} placeholder="2024" required /></div>
                  <div><Label className="text-[10px]">Make <span className="text-destructive">*</span></Label><Input className="h-8 text-sm" value={v.make} onChange={e => updateItem(vehicles, setVehicles, i, "make", e.target.value)} placeholder="Toyota" required /></div>
                  <div><Label className="text-[10px]">Model <span className="text-destructive">*</span></Label><Input className="h-8 text-sm" value={v.model} onChange={e => updateItem(vehicles, setVehicles, i, "model", e.target.value)} placeholder="Camry" required /></div>
                  <div><Label className="text-[10px]">VIN <span className="text-destructive">*</span></Label><Input className="h-8 text-sm" value={v.vin} onChange={e => updateItem(vehicles, setVehicles, i, "vin", e.target.value)} required /></div>
                  <div>
                    <Label className="text-[10px]">Usage</Label>
                    <Select value={v.usage} onValueChange={val => updateItem(vehicles, setVehicles, i, "usage", val)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="commute">Commute</SelectItem><SelectItem value="pleasure">Pleasure</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Garaging ZIP <span className="text-destructive">*</span></Label><Input className="h-8 text-sm" value={v.garaging_zip} onChange={e => updateItem(vehicles, setVehicles, i, "garaging_zip", e.target.value)} required /></div>
                </div>
              </div>
            ))}
            {vehicles.length < 5 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(vehicles, setVehicles, emptyVehicle, 5)}><Plus className="h-3 w-3 mr-1" /> Add Vehicle</Button>}
          </div>

          {/* ─── AUTO COVERAGE ELECTION — CONNECTICUT ─── */}
          <div className="border-t pt-6 mt-4 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider">Auto Coverage Election — Connecticut</h3>
              <p className="text-[10px] text-muted-foreground">AURA Risk Group</p>
            </div>

            {/* Liability */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Liability Coverage Selection</h4>
              <p className="text-[10px] text-muted-foreground">Please select one liability structure.</p>
              <div>
                <Label className="text-[10px]">Liability Type</Label>
                <Select value={autoCoverage.liability_type} onValueChange={v => updateCov("liability_type", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select liability structure" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split Limits</SelectItem>
                    <SelectItem value="csl">Combined Single Limit</SelectItem>
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
                        <SelectItem value="25000/50000">$25,000 / $50,000</SelectItem>
                        <SelectItem value="50000/100000">$50,000 / $100,000</SelectItem>
                        <SelectItem value="100000/300000">$100,000 / $300,000</SelectItem>
                        <SelectItem value="250000/500000">$250,000 / $500,000</SelectItem>
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
                        <SelectItem value="500000">$500,000</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:col-span-2">Bodily Injury limits are fixed per person and per accident pairings. Property Damage is selected separately.</p>
                </div>
              )}

              {autoCoverage.liability_type === "csl" && (
                <div className="pl-3 border-l-2 border-primary/20 space-y-2">
                  <div>
                    <Label className="text-[10px]">Combined Single Limit</Label>
                    <Select value={autoCoverage.csl_limit} onValueChange={v => updateCov("csl_limit", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select CSL" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100000">$100,000</SelectItem>
                        <SelectItem value="300000">$300,000</SelectItem>
                        <SelectItem value="500000">$500,000</SelectItem>
                        <SelectItem value="1000000">$1,000,000</SelectItem>
                        <SelectItem value="2000000">$2,000,000</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {autoCoverage.liability_type && (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {autoCoverage.liability_type === "split"
                      ? "Split Limits apply separate caps to injuries and property damage. The first number is the maximum paid for injuries to one person. The second is the maximum for all injuries combined in one accident. Property Damage is selected separately."
                      : "Combined Single Limit provides one total amount available for both bodily injury and property damage combined for a single accident."}
                  </p>
                  <p className="text-[10px] text-destructive mt-2 font-medium">If damages exceed your selected liability limit, you may be personally responsible for the amount above your policy limit.</p>
                </div>
              )}
            </div>

            {/* UM/UIM */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uninsured & Underinsured Motorist Coverage</h4>
              <div>
                <Label className="text-[10px]">UM/UIM Limit</Label>
                {autoCoverage.liability_type === "split" ? (
                  <Select value={autoCoverage.um_uim_limit} onValueChange={v => updateCov("um_uim_limit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select UM/UIM limit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match_bi">Match Bodily Injury Liability</SelectItem>
                      <SelectItem value="25000/50000">$25,000 / $50,000</SelectItem>
                      <SelectItem value="50000/100000">$50,000 / $100,000</SelectItem>
                      <SelectItem value="100000/300000">$100,000 / $300,000</SelectItem>
                      <SelectItem value="250000/500000">$250,000 / $500,000</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={autoCoverage.um_uim_limit} onValueChange={v => updateCov("um_uim_limit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select UM/UIM limit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match_csl">Match Combined Single Limit</SelectItem>
                      <SelectItem value="100000">$100,000</SelectItem>
                      <SelectItem value="300000">$300,000</SelectItem>
                      <SelectItem value="500000">$500,000</SelectItem>
                      <SelectItem value="1000000">$1,000,000</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Protects you if injured by a driver with no or insufficient insurance. In CT, this typically mirrors your Bodily Injury limits.</p>
            </div>

            {/* Med Pay */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medical Payments Coverage</h4>
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
              <p className="text-[10px] text-muted-foreground">Helps pay medical expenses for you and your passengers regardless of fault.</p>
            </div>

            {/* Comprehensive */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprehensive Coverage</h4>
              <div>
                <Label className="text-[10px]">Would you like Comprehensive Coverage?</Label>
                <Select value={autoCoverage.wants_comprehensive} onValueChange={v => updateCov("wants_comprehensive", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">Covers damage from events other than collision: theft, vandalism, fire, weather, animal strikes. Full glass coverage included when available.</p>
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
                <Label className="text-[10px]">Would you like Collision Coverage?</Label>
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
              <p className="text-[10px] text-muted-foreground">Covers damage from impact with another vehicle or object regardless of fault.</p>
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

            {/* Full Glass Note */}
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground"><span className="font-medium">Full Glass Coverage:</span> Included within Comprehensive when available. No separate election required.</p>
            </div>

            {/* Towing */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Towing & Labor Coverage</h4>
              <div>
                <Label className="text-[10px]">Would you like Towing & Labor Coverage?</Label>
                <Select value={autoCoverage.wants_towing} onValueChange={v => updateCov("wants_towing", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">Covers roadside assistance: towing, battery service, lockout, minor repairs.</p>
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rental Reimbursement Coverage</h4>
              <div>
                <Label className="text-[10px]">Would you like Rental Reimbursement Coverage?</Label>
                <Select value={autoCoverage.wants_rental} onValueChange={v => updateCov("wants_rental", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">Helps pay for a rental vehicle while your covered auto is being repaired.</p>
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Current Insurance Carrier</Label><Input className="h-8 text-sm" value={autoCoverage.current_carrier} onChange={e => updateCov("current_carrier", e.target.value)} placeholder="e.g. Progressive, GEICO" /></div>
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

            {/* Disclosure */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto Applicant Disclosure & Acknowledgment</h4>
              <div className="rounded-md bg-muted/50 p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed">By submitting this information to AURA Risk Group, I understand that coverage is not bound, modified, or confirmed until I receive written confirmation from a licensed representative of AURA Risk Group.</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">I understand that all quotes are estimates based on the information provided and are subject to underwriting review, eligibility guidelines, carrier approval, inspection, and verification of motor vehicle and claims history.</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">I certify that the information provided is true, accurate, and complete to the best of my knowledge.</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">I understand that selecting lower liability limits may expose me to personal financial responsibility in the event of a serious accident.</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">I understand that declining Comprehensive, Collision, Rental Reimbursement, Towing and Labor, or Uninsured and Underinsured Motorist coverage may result in no payment for certain types of losses.</p>
              </div>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <Checkbox checked={autoCoverage.acknowledge_disclosure} onCheckedChange={v => updateCov("acknowledge_disclosure", !!v)} className="mt-0.5" />
                <span>I acknowledge and agree to the above terms. <span className="text-destructive">*</span></span>
              </label>
            </div>

            {/* Underwriting Auth */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Underwriting Authorization</h4>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">By submitting this form, I authorize AURA Risk Group and its insurance partners to obtain motor vehicle reports, claims history reports including CLUE, prior insurance verification, insurance scores where permitted by law, and other consumer reports necessary for underwriting and rating purposes.</p>
              </div>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <Checkbox checked={autoCoverage.authorize_underwriting} onCheckedChange={v => updateCov("authorize_underwriting", !!v)} className="mt-0.5" />
                <span>I authorize underwriting reports to be obtained. <span className="text-destructive">*</span></span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /* ─── RENDER: Home & Flood Step Content ─── */
  const renderHomeFloodStep = () => (
    <div className="space-y-6">
      {enableHome && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> Home / Property</CardTitle></CardHeader>
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
                  <div><Label className="text-[10px]">Sq Footage</Label><Input className="h-8 text-sm" value={h.square_footage} onChange={e => updateItem(homes, setHomes, i, "square_footage", e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px]">Construction</Label>
                    <Select value={h.construction_type} onValueChange={v => updateItem(homes, setHomes, i, "construction_type", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="frame">Frame</SelectItem><SelectItem value="masonry">Masonry</SelectItem><SelectItem value="brick">Brick</SelectItem><SelectItem value="stucco">Stucco</SelectItem><SelectItem value="log">Log</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Roof Type</Label>
                    <Select value={h.roof_type} onValueChange={v => updateItem(homes, setHomes, i, "roof_type", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="asphalt_shingle">Asphalt Shingle</SelectItem><SelectItem value="metal">Metal</SelectItem><SelectItem value="tile">Tile</SelectItem><SelectItem value="slate">Slate</SelectItem><SelectItem value="flat">Flat/Built-up</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Roof Year</Label><Input className="h-8 text-sm" value={h.roof_year} onChange={e => updateItem(homes, setHomes, i, "roof_year", e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px]">Occupancy</Label>
                    <Select value={h.occupancy} onValueChange={v => updateItem(homes, setHomes, i, "occupancy", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="owner_occupied">Owner Occupied</SelectItem><SelectItem value="tenant_occupied">Tenant Occupied</SelectItem><SelectItem value="investment">Investment/Rental</SelectItem><SelectItem value="vacant">Vacant</SelectItem><SelectItem value="seasonal">Seasonal</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Heating Type</Label>
                    <Select value={h.heating_type} onValueChange={v => updateItem(homes, setHomes, i, "heating_type", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="forced_air">Forced Air</SelectItem><SelectItem value="baseboard">Baseboard</SelectItem><SelectItem value="radiant">Radiant</SelectItem><SelectItem value="heat_pump">Heat Pump</SelectItem><SelectItem value="wood_stove">Wood Stove</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Electrical Update Year</Label><Input className="h-8 text-sm" value={h.electrical_update_year} onChange={e => updateItem(homes, setHomes, i, "electrical_update_year", e.target.value)} /></div>
                  <div><Label className="text-[10px]">Plumbing Update Year</Label><Input className="h-8 text-sm" value={h.plumbing_update_year} onChange={e => updateItem(homes, setHomes, i, "plumbing_update_year", e.target.value)} /></div>
                </div>
                {h.occupancy === "investment" && (
                  <div><Label className="text-[10px]">Monthly Rent Roll</Label><Input className="h-8 text-sm" value={h.rent_roll} onChange={e => updateItem(homes, setHomes, i, "rent_roll", e.target.value)} placeholder="$2,500" /></div>
                )}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Safety & Disclosures</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { key: "smoke_detectors" as const, label: "Smoke Detectors" },
                      { key: "fire_extinguishers" as const, label: "Fire Extinguishers" },
                      { key: "deadbolts" as const, label: "Deadbolt Locks" },
                      { key: "sprinkler_system" as const, label: "Sprinkler System" },
                      { key: "has_pool" as const, label: "Swimming Pool" },
                      { key: "has_trampoline" as const, label: "Trampoline" },
                    ]).map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={h[item.key]} onCheckedChange={v => updateItem(homes, setHomes, i, item.key, !!v)} />
                        {item.label}
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label className="text-[10px]">Alarm System</Label>
                    <Select value={h.alarm_type} onValueChange={v => updateItem(homes, setHomes, i, "alarm_type", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="local">Local Alarm</SelectItem><SelectItem value="central">Central Station</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={h.has_dog} onCheckedChange={v => updateItem(homes, setHomes, i, "has_dog", !!v)} /> Dog(s) on premises
                  </label>
                  {h.has_dog && <div><Label className="text-[10px]">Breed(s)</Label><Input className="h-8 text-sm" value={h.dog_breed} onChange={e => updateItem(homes, setHomes, i, "dog_breed", e.target.value)} placeholder="Labrador, Golden Retriever" /></div>}
                  <div><Label className="text-[10px]">Claims in last 5 years</Label><Input className="h-8 text-sm" value={h.claims_5_years} onChange={e => updateItem(homes, setHomes, i, "claims_5_years", e.target.value)} placeholder="None, or describe..." /></div>
                </div>
              </div>
            ))}
            {homes.length < 5 && <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(homes, setHomes, emptyHome, 5)}><Plus className="h-3 w-3 mr-1" /> Add Property</Button>}
          </CardContent>
        </Card>
      )}

      {enableFlood && (
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
                    <SelectItem value="slab">Slab on Grade</SelectItem>
                    <SelectItem value="crawlspace">Crawlspace</SelectItem>
                    <SelectItem value="basement">Basement</SelectItem>
                    <SelectItem value="elevated">Elevated/Piles</SelectItem>
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
                    <SelectItem value="1000">$1,000</SelectItem>
                    <SelectItem value="2000">$2,000</SelectItem>
                    <SelectItem value="5000">$5,000</SelectItem>
                    <SelectItem value="10000">$10,000</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  /* ─── RENDER: Boat & Umbrella Step Content ─── */
  const renderBoatUmbrellaStep = () => (
    <div className="space-y-6">
      {enableBoat && (
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
      )}

      {enableUmbrella && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Umbrella className="h-4 w-4" /> Personal Umbrella Liability</CardTitle>
            <p className="text-[10px] text-muted-foreground">AURA Risk Group</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Want umbrella? */}
            <div>
              <Label className="text-[10px]">Would you like a Personal Umbrella quote?</Label>
              <Select value={umbrella.wants_umbrella} onValueChange={v => setUmbrella({ ...umbrella, wants_umbrella: v as any })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>

            {umbrella.wants_umbrella === "yes" && (
              <div className="space-y-5 pl-3 border-l-2 border-primary/20">
                {/* Desired limit */}
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

                {/* Major violations */}
                <div>
                  <Label className="text-[10px]">Any Drivers in the Household with Major Violations, DUI, or Reckless Driving in the Last 5 Years?</Label>
                  <Select value={umbrella.major_violations} onValueChange={v => setUmbrella({ ...umbrella, major_violations: v as any })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>

                {/* Additional exposures */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Do You Own Any Additional Exposures Not Listed Above?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px]">Watercraft</Label>
                      <Select value={umbrella.has_watercraft_unlisted} onValueChange={v => setUmbrella({ ...umbrella, has_watercraft_unlisted: v as any })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Investment or Rental Properties Not Listed</Label>
                      <Select value={umbrella.has_rental_unlisted} onValueChange={v => setUmbrella({ ...umbrella, has_rental_unlisted: v as any })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Pools or Trampolines Not Listed</Label>
                      <Select value={umbrella.has_pool_trampoline_unlisted} onValueChange={v => setUmbrella({ ...umbrella, has_pool_trampoline_unlisted: v as any })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="rounded-md bg-muted/50 p-3 space-y-2">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Personal Umbrella Liability provides excess liability protection above your underlying home and auto policies. Most carriers require minimum underlying limits of $250,000/$500,000 and $100,000 Property Damage (or $300,000 Combined Single Limit) on auto, and $300,000 personal liability on home.</p>
                </div>

                {/* Disclosure */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Umbrella Disclosure</h4>
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
      )}
    </div>
  );

  /* ─── RENDER: Documents Step Content ─── */
  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Please upload any of the following if available:</p>
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
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else your agent should know..." rows={3} />
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground">Your information is transmitted securely. By submitting, you authorize your agent to use this data for quoting purposes.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <img src={auraLogo} alt="AURA Risk Group" className="h-7" />
          <span className="ml-2 text-xs text-muted-foreground font-sans flex items-center gap-1">
            <Shield className="h-3 w-3" /> Secure Intake Form
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Insurance Intake</h1>
          <p className="text-sm text-muted-foreground">Please provide your information below to get started.</p>
        </div>

        {/* ─── Type Selector (FIRST QUESTION) ─── */}
        <Card>
          <CardHeader><CardTitle className="text-base">What type of coverage are you looking for?</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { setIntakeType("personal"); setCurrentStep("info"); }}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${intakeType === "personal" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
            >
              <div className={`p-2 rounded-lg ${intakeType === "personal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Personal Lines</p>
                <p className="text-xs text-muted-foreground">Auto, Home, Flood, Boat, Umbrella</p>
              </div>
            </button>
            <button
              onClick={() => setIntakeType("commercial")}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${intakeType === "commercial" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
            >
              <div className={`p-2 rounded-lg ${intakeType === "commercial" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Commercial Lines</p>
                <p className="text-xs text-muted-foreground">GL, WC, Auto, Property & more</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* ─── PERSONAL LINES WIZARD ─── */}
        {intakeType === "personal" && (
          <>
            {/* Step progress */}
            {renderStepNav()}

            {/* Step: Info */}
            {currentStep === "info" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Your Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Full Name *</Label><Input value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="John Doe" /></div>
                    <div><Label className="text-xs">Email *</Label><Input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} placeholder="john@example.com" /></div>
                    <div><Label className="text-xs">Phone *</Label><Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
                    <div><Label className="text-xs">Mailing Address *</Label><Input value={applicantAddress} onChange={e => setApplicantAddress(e.target.value)} placeholder="123 Main St, City, ST 12345" /></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Coverage Sections</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    {[
                      { label: "Auto", icon: Car, enabled: enableAuto, toggle: setEnableAuto },
                      { label: "Home", icon: Home, enabled: enableHome, toggle: setEnableHome },
                      { label: "Flood", icon: Droplets, enabled: enableFlood, toggle: setEnableFlood },
                      { label: "Boat", icon: Sailboat, enabled: enableBoat, toggle: setEnableBoat },
                      { label: "Umbrella", icon: Umbrella, enabled: enableUmbrella, toggle: setEnableUmbrella },
                    ].map(s => (
                      <button key={s.label} onClick={() => s.toggle(!s.enabled)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${s.enabled ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}>
                        <s.icon className="h-4 w-4" />{s.label}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step: Auto */}
            {currentStep === "auto" && renderAutoStep()}

            {/* Step: Home & Flood */}
            {currentStep === "home_flood" && renderHomeFloodStep()}

            {/* Step: Boat & Umbrella */}
            {currentStep === "boat_umbrella" && renderBoatUmbrellaStep()}

            {/* Step: Documents & Submit */}
            {currentStep === "documents" && renderDocumentsStep()}

            {/* Step navigation buttons */}
            {renderStepButtons()}
          </>
        )}

        {/* ─── COMMERCIAL LINES WIZARD ─── */}
        {intakeType === "commercial" && !borGenerated && (
          <>
            {/* Commercial Step Progress */}
            {(() => {
              const commSteps: CommercialStepKey[] = ["business_info", "policy_info", "bor_auth", "commercial_docs"];
              const commStepLabels: Record<CommercialStepKey, string> = {
                business_info: "Business Info",
                policy_info: "Current Policy",
                bor_auth: "Broker of Record",
                commercial_docs: "Documents & Submit",
              };
              const commIdx = commSteps.indexOf(commercialStep);
              const commProgress = ((commIdx + 1) / commSteps.length) * 100;

              const validateCommStep = (): boolean => {
                if (commercialStep === "business_info") {
                  if (!commercialForm.customer_name.trim()) { toast.error("Primary contact name is required"); return false; }
                  if (!commercialForm.customer_email.trim() || !/^[\w.-]+@[\w.-]+\.\w+$/.test(commercialForm.customer_email.trim())) { toast.error("A valid email is required"); return false; }
                  if (!commercialForm.customer_phone.trim()) { toast.error("Phone is required"); return false; }
                  if (!commercialForm.business_name.trim()) { toast.error("Legal business name is required"); return false; }
                  if (!commercialForm.street_address.trim()) { toast.error("Business address is required"); return false; }
                }
                if (commercialStep === "bor_auth") {
                  if (commercialForm.wants_bor === "yes" && !commercialForm.bor_authorized) {
                    toast.error("You must authorize AURA Risk Group as Broker of Record"); return false;
                  }
                  if (commercialForm.wants_bor === "yes" && commercialForm.bor_lines.length === 0) {
                    toast.error("Please select at least one line of coverage for BOR"); return false;
                  }
                }
                return true;
              };

              const goCommNext = () => {
                if (!validateCommStep()) return;
                if (commIdx < commSteps.length - 1) {
                  setCommercialStep(commSteps[commIdx + 1]);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              };
              const goCommBack = () => {
                if (commIdx > 0) {
                  setCommercialStep(commSteps[commIdx - 1]);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              };

              const toggleLine = (line: string, field: "lines_in_force" | "bor_lines") => {
                setCommercialForm(prev => ({
                  ...prev,
                  [field]: prev[field].includes(line)
                    ? prev[field].filter((l: string) => l !== line)
                    : [...prev[field], line],
                }));
              };

              return (
                <>
                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Step {commIdx + 1} of {commSteps.length}</span>
                      <span>{commStepLabels[commercialStep]}</span>
                    </div>
                    <Progress value={commProgress} className="h-1.5" />
                    <div className="flex gap-1 justify-center">
                      {commSteps.map((step, idx) => (
                        <button key={step} onClick={() => { if (idx < commIdx) setCommercialStep(step); }}
                          className={`h-2 rounded-full transition-all ${idx === commIdx ? "w-8 bg-primary" : idx < commIdx ? "w-2 bg-primary/50 cursor-pointer hover:bg-primary/70" : "w-2 bg-muted"}`} />
                      ))}
                    </div>
                  </div>

                  {/* ── STEP 1: BUSINESS INFORMATION ── */}
                  {commercialStep === "business_info" && (
                    <div className="space-y-6">
                      <div className="text-center space-y-1">
                        <h2 className="text-lg font-bold uppercase tracking-wider">Required Business Information</h2>
                        <p className="text-xs text-muted-foreground">This is the minimum information required to begin structuring and negotiating your insurance program.</p>
                      </div>

                      <Card>
                        <CardHeader><CardTitle className="text-base">Primary Contact</CardTitle></CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2"><Label className="text-xs">Primary Contact Name <span className="text-destructive">*</span></Label><Input value={commercialForm.customer_name} onChange={e => updateCommercial("customer_name", e.target.value)} placeholder="John Smith" /></div>
                          <div><Label className="text-xs">Phone <span className="text-destructive">*</span></Label><Input type="tel" value={commercialForm.customer_phone} onChange={e => updateCommercial("customer_phone", e.target.value)} placeholder="(555) 123-4567" /></div>
                          <div><Label className="text-xs">Email <span className="text-destructive">*</span></Label><Input type="email" value={commercialForm.customer_email} onChange={e => updateCommercial("customer_email", e.target.value)} placeholder="john@company.com" /></div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle className="text-base">Business Entity</CardTitle></CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2"><Label className="text-xs">Legal Business Name <span className="text-destructive">*</span></Label><Input value={commercialForm.business_name} onChange={e => updateCommercial("business_name", e.target.value)} placeholder="Acme Construction LLC" /></div>
                          <div><Label className="text-xs">DBA (if applicable)</Label><Input value={commercialForm.dba} onChange={e => updateCommercial("dba", e.target.value)} placeholder="Acme Builders" /></div>
                          <div><Label className="text-xs">FEIN</Label><Input value={commercialForm.ein} onChange={e => updateCommercial("ein", e.target.value)} placeholder="XX-XXXXXXX" /></div>
                          <div className="sm:col-span-2"><Label className="text-xs">Business Address <span className="text-destructive">*</span></Label><Input value={commercialForm.street_address} onChange={e => updateCommercial("street_address", e.target.value)} placeholder="123 Main St, Suite 100" /></div>
                          <div><Label className="text-xs">City</Label><Input value={commercialForm.city} onChange={e => updateCommercial("city", e.target.value)} placeholder="Dallas" /></div>
                          <div>
                            <Label className="text-xs">State</Label>
                            <Select value={commercialForm.state} onValueChange={v => updateCommercial("state", v)}>
                              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                              <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><Label className="text-xs">ZIP Code</Label><Input value={commercialForm.zip} onChange={e => updateCommercial("zip", e.target.value)} placeholder="75201" /></div>
                          <div><Label className="text-xs">Business Type</Label><Input value={commercialForm.business_type} onChange={e => updateCommercial("business_type", e.target.value)} placeholder="e.g. General Contractor" /></div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ── STEP 2: CURRENT POLICY INFORMATION ── */}
                  {commercialStep === "policy_info" && (
                    <div className="space-y-6">
                      <div className="text-center space-y-1">
                        <h2 className="text-lg font-bold uppercase tracking-wider">Current Policy Information</h2>
                        <p className="text-xs text-muted-foreground">We cannot negotiate what we cannot see.</p>
                      </div>

                      <Card>
                        <CardHeader><CardTitle className="text-base">Do you currently carry insurance?</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex gap-3">
                            {(["yes", "no"] as const).map(v => (
                              <button key={v} onClick={() => updateCommercial("has_current_insurance", v)}
                                className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${commercialForm.has_current_insurance === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                                {v === "yes" ? "Yes" : "No"}
                              </button>
                            ))}
                          </div>

                          {commercialForm.has_current_insurance === "yes" && (
                            <div className="space-y-4 pt-2">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div><Label className="text-xs">Current Carrier Name</Label><Input value={commercialForm.current_carrier_name} onChange={e => updateCommercial("current_carrier_name", e.target.value)} placeholder="The Hartford" /></div>
                                <div><Label className="text-xs">Policy Number</Label><Input value={commercialForm.policy_number} onChange={e => updateCommercial("policy_number", e.target.value)} placeholder="31 SBA BC20AJ" /></div>
                                <div><Label className="text-xs">Policy Effective Date</Label><Input type="date" value={commercialForm.policy_effective_date} onChange={e => updateCommercial("policy_effective_date", e.target.value)} /></div>
                                <div><Label className="text-xs">Policy Expiration Date</Label><Input type="date" value={commercialForm.policy_expiration_date} onChange={e => updateCommercial("policy_expiration_date", e.target.value)} /></div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Lines Currently in Force</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {COMMERCIAL_LINES.map(line => (
                                    <button key={line} onClick={() => toggleLine(line, "lines_in_force")}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${commercialForm.lines_in_force.includes(line) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}>
                                      {commercialForm.lines_in_force.includes(line) ? <Check className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border" />}
                                      {line}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Upload Dec Pages */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Upload Current Declaration Pages</Label>
                                <div
                                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                  onDragLeave={() => setDragActive(false)}
                                  onDrop={handleFileDrop}
                                  onClick={() => fileInputRef.current?.click()}
                                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                  <p className="text-xs font-medium">Drag & drop or click to upload</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">PDF, JPG, PNG accepted</p>
                                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleFileSelect} />
                                </div>
                                {uploadedFiles.length > 0 && (
                                  <div className="space-y-1">
                                    {uploadedFiles.map((uf, idx) => (
                                      <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-xs truncate flex-1">{uf.file.name}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(idx)}><X className="h-3 w-3" /></Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="rounded-md bg-muted/50 p-4">
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Why this matters:</span> Underwriters prioritize submissions that are controlled. If multiple brokers are involved or the account is being loosely marketed, leverage weakens and pricing suffers. If we are going to negotiate aggressively, we need clarity and authority.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: BROKER OF RECORD AUTHORIZATION ── */}
                  {commercialStep === "bor_auth" && (
                    <div className="space-y-6">
                      <div className="text-center space-y-1">
                        <h2 className="text-lg font-bold uppercase tracking-wider">Broker of Record Authorization</h2>
                        <p className="text-xs text-muted-foreground">Broker of Record is how we take control of the negotiation.</p>
                      </div>

                      <Card>
                        <CardContent className="pt-6 space-y-4">
                          <div className="rounded-md bg-muted/50 p-4 space-y-2">
                            <p className="text-xs font-semibold">When AURA Risk Group is Broker of Record:</p>
                            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-none">
                              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> We control the negotiation path.</li>
                              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> We communicate directly with underwriters.</li>
                              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> We request underwriting information and loss history.</li>
                              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> We prevent the account from being shopped inefficiently.</li>
                              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> We protect your reputation in the marketplace.</li>
                            </ul>
                            <p className="text-[10px] text-muted-foreground pt-2 border-t">This does not cancel your existing coverage. It authorizes us to represent you while we work on your program.</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Would you like AURA Risk Group to send a Broker of Record letter?</Label>
                            <div className="flex gap-3">
                              {(["yes", "no"] as const).map(v => (
                                <button key={v} onClick={() => updateCommercial("wants_bor", v)}
                                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${commercialForm.wants_bor === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                                  {v === "yes" ? "Yes" : "No"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {commercialForm.wants_bor === "yes" && (
                            <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Select Lines of Coverage</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {[...COMMERCIAL_LINES.filter(l => l !== "Other"), "All Lines"].map(line => (
                                    <button key={line} onClick={() => {
                                      if (line === "All Lines") {
                                        const allSelected = COMMERCIAL_LINES.filter(l => l !== "Other").every(l => commercialForm.bor_lines.includes(l));
                                        setCommercialForm(prev => ({
                                          ...prev,
                                          bor_lines: allSelected ? [] : [...COMMERCIAL_LINES.filter(l => l !== "Other")],
                                        }));
                                      } else {
                                        toggleLine(line, "bor_lines");
                                      }
                                    }}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                        line === "All Lines"
                                          ? (COMMERCIAL_LINES.filter(l => l !== "Other").every(l => commercialForm.bor_lines.includes(l)) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50")
                                          : (commercialForm.bor_lines.includes(line) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50")
                                      }`}>
                                      {(line === "All Lines" ? COMMERCIAL_LINES.filter(l => l !== "Other").every(l => commercialForm.bor_lines.includes(l)) : commercialForm.bor_lines.includes(line))
                                        ? <Check className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border" />}
                                      {line}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div><Label className="text-xs">Carrier Email (optional — for automatic BOR delivery)</Label><Input value={commercialForm.carrier_email} onChange={e => updateCommercial("carrier_email", e.target.value)} placeholder="underwriter@carrier.com" /></div>

                              <div className="space-y-3 border-t pt-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <Checkbox checked={commercialForm.bor_authorized} onCheckedChange={v => setCommercialForm(prev => ({ ...prev, bor_authorized: !!v }))} className="mt-0.5" />
                                  <span className="text-xs leading-relaxed">
                                    I authorize <span className="font-semibold">AURA Risk Group</span> to act as Broker of Record for the selected lines of coverage. <span className="text-destructive">*</span>
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ── STEP 4: DOCUMENTS & SUBMIT ── */}
                  {commercialStep === "commercial_docs" && renderDocumentsStep()}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-2">
                    {commIdx > 0 && (
                      <Button variant="outline" className="flex-1 h-11" onClick={goCommBack}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                    )}
                    {commIdx < commSteps.length - 1 ? (
                      <Button className="flex-1 h-11" onClick={goCommNext}>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button className="flex-1 h-11 text-base" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit & Generate BOR"}
                      </Button>
                    )}
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">Your information is transmitted securely. By submitting, you authorize your agent to use this data for quoting and negotiation purposes.</p>
                </>
              );
            })()}
          </>
        )}

        {/* ─── POST-BOR SUCCESS SCREEN ─── */}
        {intakeType === "commercial" && borGenerated && (
          <div className="space-y-6">
            <Card className="border-primary/30">
              <CardContent className="pt-8 text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-4 inline-block">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">
                  {commercialForm.wants_bor === "yes" ? "Broker of Record Successfully Executed" : "Submission Complete"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {commercialForm.wants_bor === "yes"
                    ? "Your BOR authorization has been recorded. A signed copy will be generated and sent for execution."
                    : "Your information has been securely submitted. Your agent will be in touch shortly."}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  // Reset to allow continuing with full review
                  setBorGenerated(false);
                  setCommercialStep("commercial_docs");
                }}
                className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-border hover:border-primary/40 transition-all text-center">
                <Building2 className="h-6 w-6 text-primary" />
                <p className="text-sm font-semibold">Continue & Complete Full Insurance Review</p>
                <p className="text-[10px] text-muted-foreground">Proceed with your complete insurance program review</p>
              </button>
              <button
                onClick={() => setSubmitted(true)}
                className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-border hover:border-primary/40 transition-all text-center">
                <Shield className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-semibold">Close</p>
                <p className="text-[10px] text-muted-foreground">We will begin working on your account immediately</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
