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
import {
  Car, Home, Sailboat, Umbrella, Plus, Trash2, CheckCircle, AlertTriangle,
  Loader2, Upload, FileText, X, Shield, Building2, User, Check, AlertCircle as AlertCircleIcon,
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
type UmbrellaInfo = { requested_limit: string; num_drivers_household: string; num_vehicles_household: string; num_watercraft: string; rental_properties: string; has_business: boolean; business_description: string };

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
const emptyUmbrella = (): UmbrellaInfo => ({ requested_limit: "", num_drivers_household: "", num_vehicles_household: "", num_watercraft: "", rental_properties: "", has_business: false, business_description: "" });

/* ─── Commercial Lines Types ─── */
interface CommercialFormData {
  customer_name: string; customer_email: string; customer_phone: string;
  business_name: string; ein: string; business_type: string;
  street_address: string; city: string; state: string; zip: string;
  employee_count: string; annual_revenue: string; years_in_business: string;
  requested_coverage: string; requested_premium: string; additional_notes: string;
}

const emptyCommercial = (): CommercialFormData => ({
  customer_name: "", customer_email: "", customer_phone: "",
  business_name: "", ein: "", business_type: "",
  street_address: "", city: "", state: "", zip: "",
  employee_count: "", annual_revenue: "", years_in_business: "",
  requested_coverage: "", requested_premium: "", additional_notes: "",
});

/* ─── Main Component ─── */
export default function IntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [record, setRecord] = useState<any>(null);
  // Which table does this token belong to?
  const [tokenSource, setTokenSource] = useState<"intake_links" | "personal_intake_submissions" | null>(null);

  // Type selector — null means not chosen yet
  const [intakeType, setIntakeType] = useState<"personal" | "commercial" | null>(null);

  // ─── Personal State ───
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [enableAuto, setEnableAuto] = useState(true);
  const [enableHome, setEnableHome] = useState(true);
  const [enableBoat, setEnableBoat] = useState(false);
  const [enableUmbrella, setEnableUmbrella] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([emptyDriver()]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);
  const [homes, setHomes] = useState<HomeInfo[]>([emptyHome()]);
  const [boats, setBoats] = useState<Boat[]>([emptyBoat()]);
  const [umbrella, setUmbrella] = useState<UmbrellaInfo>(emptyUmbrella());
  const [autoCoverage, setAutoCoverage] = useState<AutoCoverage>(emptyAutoCoverage());
  const updateCov = (field: keyof AutoCoverage, value: any) => setAutoCoverage(prev => ({ ...prev, [field]: value }));

  // ─── Commercial State ───
  const [commercialForm, setCommercialForm] = useState<CommercialFormData>(emptyCommercial());

  // ─── Shared State ───
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; category: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Token Validation ─── */
  useEffect(() => {
    if (!token) return;
    (async () => {
      // Try personal_intake_submissions first
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

      // Try intake_links
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

  const updateCommercial = (field: keyof CommercialFormData, value: string) =>
    setCommercialForm(prev => ({ ...prev, [field]: value }));

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!record || !intakeType) return;

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

    // Validate vehicle required fields (personal auto)
    if (intakeType === "personal" && enableAuto) {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (!v.year.trim() || !v.make.trim() || !v.model.trim() || !v.vin.trim() || !v.garaging_zip.trim()) {
          toast.error(`Vehicle ${i + 1}: Year, Make, Model, VIN, and Garaging ZIP are required`);
          return;
        }
      }
      if (!autoCoverage.acknowledge_disclosure) {
        toast.error("You must acknowledge the auto applicant disclosure"); return;
      }
      if (!autoCoverage.authorize_underwriting) {
        toast.error("You must authorize underwriting reports"); return;
      }
    }

    setSubmitting(true);

    // Build doc metadata (skip base64 for form_data to keep it small)
    const docMeta = uploadedFiles.map(uf => ({ name: uf.file.name, category: uf.category, size: uf.file.size }));

    try {
      if (intakeType === "personal") {
        const formData = {
          intake_type: "personal",
          applicant: { name: applicantName, email: applicantEmail, phone: applicantPhone, address: applicantAddress },
          sections: {
            auto: enableAuto ? { drivers, vehicles, coverage: autoCoverage } : null,
            home: enableHome ? { properties: homes } : null,
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

          // Trigger email
          try {
            const deliveryEmails = record.delivery_emails;
            if (deliveryEmails?.length > 0) {
              const sections = [enableAuto && "Auto", enableHome && "Home", enableBoat && "Boat", enableUmbrella && "Umbrella"].filter(Boolean).join(", ");
              await supabase.functions.invoke("send-personal-intake-email", { body: { token: record.token, applicant_name: applicantName, sections } });
            }
          } catch { /* email failure shouldn't block */ }
        } else {
          // Commercial token but user chose personal — store in intake_submissions with structured notes
          const structuredNotes = `Intake Type: Personal Lines\nApplicant: ${applicantName}\nEmail: ${applicantEmail}\nPhone: ${applicantPhone}\nAddress: ${applicantAddress}\nSections: ${[enableAuto && "Auto", enableHome && "Home", enableBoat && "Boat", enableUmbrella && "Umbrella"].filter(Boolean).join(", ")}\nNotes: ${notes}`;
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
          if (f.customer_phone) lines.push(`Phone: ${f.customer_phone}`);
          if (f.business_type) lines.push(`Business Type: ${f.business_type}`);
          if (f.street_address) lines.push(`Address: ${f.street_address}`);
          if (f.city || f.state || f.zip) lines.push(`City/State/Zip: ${[f.city, f.state, f.zip].filter(Boolean).join(", ")}`);
          if (f.employee_count) lines.push(`Number of Employees: ${f.employee_count}`);
          if (f.annual_revenue) lines.push(`Annual Revenue: ${f.annual_revenue}`);
          if (f.years_in_business) lines.push(`Years in Business: ${f.years_in_business}`);
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
          // Personal token but user chose commercial — store in personal_intake_submissions
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
          try {
            if (record.delivery_emails?.length > 0) {
              await supabase.functions.invoke("send-personal-intake-email", { body: { token: record.token, applicant_name: commercialForm.customer_name, sections: "Commercial Lines" } });
            }
          } catch { /* email failure */ }
        }
      }

      setSubmitted(true);
      toast.success("Submitted successfully!");
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
              onClick={() => setIntakeType("personal")}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${intakeType === "personal" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
            >
              <div className={`p-2 rounded-lg ${intakeType === "personal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Personal Lines</p>
                <p className="text-xs text-muted-foreground">Auto, Home, Boat, Umbrella</p>
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

        {/* ─── PERSONAL LINES FORM ─── */}
        {intakeType === "personal" && (
          <>
            {/* Applicant */}
            <Card>
              <CardHeader><CardTitle className="text-base">Your Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Full Name *</Label><Input value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="John Doe" /></div>
                <div><Label className="text-xs">Email *</Label><Input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} placeholder="john@example.com" /></div>
                <div><Label className="text-xs">Phone *</Label><Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
                <div><Label className="text-xs">Mailing Address *</Label><Input value={applicantAddress} onChange={e => setApplicantAddress(e.target.value)} placeholder="123 Main St, City, ST 12345" /></div>
              </CardContent>
            </Card>

            {/* Coverage toggles */}
            <Card>
              <CardHeader><CardTitle className="text-base">Coverage Sections</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {[
                  { label: "Auto", icon: Car, enabled: enableAuto, toggle: setEnableAuto },
                  { label: "Home", icon: Home, enabled: enableHome, toggle: setEnableHome },
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

            {/* Auto */}
            {enableAuto && (
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

                    {/* Liability Coverage Selection */}
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
                          <p className="text-[10px] text-muted-foreground sm:col-span-2">Bodily Injury limits are fixed per person and per accident pairings and cannot be altered independently. Property Damage is selected separately.</p>
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
                              ? "Split Limits apply separate caps to injuries and property damage. The first number is the maximum paid for injuries to one person. The second number is the maximum paid for all injuries combined in one accident. Property Damage is the maximum paid for damage to another person's vehicle or property."
                              : "Combined Single Limit provides one total amount available for both bodily injury and property damage combined for a single accident. There are no separate per person or property damage caps within that total."}
                          </p>
                          <p className="text-[10px] text-destructive mt-2 font-medium">If damages exceed your selected liability limit, you may be personally responsible for the amount above your policy limit.</p>
                        </div>
                      )}
                    </div>

                    {/* Uninsured / Underinsured Motorist */}
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
                      <p className="text-[10px] text-muted-foreground">Uninsured and Underinsured Motorist coverage protects you if you are injured by a driver who has no insurance or insufficient insurance. In Connecticut, this coverage typically mirrors your Bodily Injury limits unless you elect otherwise.</p>
                    </div>

                    {/* Medical Payments */}
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
                      <p className="text-[10px] text-muted-foreground">Medical Payments coverage helps pay medical expenses for you and your passengers regardless of fault.</p>
                    </div>

                    {/* Comprehensive */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprehensive Coverage</h4>
                      <div>
                        <Label className="text-[10px]">Would you like Comprehensive Coverage?</Label>
                        <Select value={autoCoverage.wants_comprehensive} onValueChange={v => updateCov("wants_comprehensive", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Comprehensive covers damage to your vehicle caused by events other than collision. This includes theft, vandalism, fire, falling objects, weather damage, and animal strikes. Full glass coverage, when available, is included within Comprehensive.</p>
                      {autoCoverage.wants_comprehensive === "yes" && (
                        <div className="pl-3 border-l-2 border-primary/20">
                          <Label className="text-[10px]">Comprehensive Deductible</Label>
                          <Select value={autoCoverage.comp_deductible} onValueChange={v => updateCov("comp_deductible", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select deductible" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="100">$100</SelectItem>
                              <SelectItem value="250">$250</SelectItem>
                              <SelectItem value="500">$500</SelectItem>
                              <SelectItem value="1000">$1,000</SelectItem>
                              <SelectItem value="2500">$2,500</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
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
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-destructive font-medium">Collision coverage cannot be selected unless Comprehensive coverage is also selected.</p>
                      <p className="text-[10px] text-muted-foreground">Collision covers damage to your vehicle resulting from impact with another vehicle or object regardless of fault.</p>
                      {autoCoverage.wants_collision === "yes" && (
                        <div className="pl-3 border-l-2 border-primary/20">
                          <Label className="text-[10px]">Collision Deductible</Label>
                          <Select value={autoCoverage.collision_deductible} onValueChange={v => updateCov("collision_deductible", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select deductible" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="100">$100</SelectItem>
                              <SelectItem value="250">$250</SelectItem>
                              <SelectItem value="500">$500</SelectItem>
                              <SelectItem value="1000">$1,000</SelectItem>
                              <SelectItem value="2500">$2,500</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Full Glass Note */}
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-[10px] text-muted-foreground"><span className="font-medium">Full Glass Coverage:</span> Full glass coverage, if available by carrier, is included within Comprehensive coverage. No separate election is required unless a carrier-specific endorsement applies.</p>
                    </div>

                    {/* Towing and Labor */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Towing & Labor Coverage</h4>
                      <div>
                        <Label className="text-[10px]">Would you like Towing & Labor Coverage?</Label>
                        <Select value={autoCoverage.wants_towing} onValueChange={v => updateCov("wants_towing", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Towing and Labor helps cover roadside assistance expenses such as towing, battery service, lockout assistance, and minor roadside repairs.</p>
                      {autoCoverage.wants_towing === "yes" && (
                        <div className="pl-3 border-l-2 border-primary/20">
                          <Label className="text-[10px]">Towing Limit</Label>
                          <Select value={autoCoverage.towing_limit} onValueChange={v => updateCov("towing_limit", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select limit" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="50">$50</SelectItem>
                              <SelectItem value="75">$75</SelectItem>
                              <SelectItem value="100">$100</SelectItem>
                              <SelectItem value="150">$150</SelectItem>
                              <SelectItem value="200">$200</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Rental Reimbursement */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rental Reimbursement Coverage</h4>
                      <div>
                        <Label className="text-[10px]">Would you like Rental Reimbursement Coverage?</Label>
                        <Select value={autoCoverage.wants_rental} onValueChange={v => updateCov("wants_rental", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Rental Reimbursement helps pay for a rental vehicle while your covered auto is being repaired due to a covered claim.</p>
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

                    {/* Additional Information */}
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
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
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
                        <p className="text-[10px] text-muted-foreground leading-relaxed">I certify that the information provided is true, accurate, and complete to the best of my knowledge. I understand that inaccurate, incomplete, or omitted information may affect eligibility, premium, coverage terms, or claims payment.</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">I understand that selecting lower liability limits may expose me to personal financial responsibility in the event of a serious accident.</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">I understand that declining Comprehensive, Collision, Rental Reimbursement, Towing and Labor, or Uninsured and Underinsured Motorist coverage may result in no payment for certain types of losses.</p>
                      </div>
                      <label className="flex items-start gap-2 text-xs cursor-pointer">
                        <Checkbox checked={autoCoverage.acknowledge_disclosure} onCheckedChange={v => updateCov("acknowledge_disclosure", !!v)} className="mt-0.5" />
                        <span>I acknowledge and agree to the above terms. <span className="text-destructive">*</span></span>
                      </label>
                    </div>

                    {/* Underwriting Authorization */}
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
            )}

            {/* Home */}
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

            {/* Boat */}
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

            {/* Umbrella */}
            {enableUmbrella && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Umbrella className="h-4 w-4" /> Umbrella / Excess Liability</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Requested Limit</Label>
                      <Select value={umbrella.requested_limit} onValueChange={v => setUmbrella({ ...umbrella, requested_limit: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="1000000">$1,000,000</SelectItem><SelectItem value="2000000">$2,000,000</SelectItem><SelectItem value="3000000">$3,000,000</SelectItem><SelectItem value="5000000">$5,000,000</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px]"># Drivers in Household</Label><Input className="h-8 text-sm" value={umbrella.num_drivers_household} onChange={e => setUmbrella({ ...umbrella, num_drivers_household: e.target.value })} /></div>
                    <div><Label className="text-[10px]"># Vehicles in Household</Label><Input className="h-8 text-sm" value={umbrella.num_vehicles_household} onChange={e => setUmbrella({ ...umbrella, num_vehicles_household: e.target.value })} /></div>
                    <div><Label className="text-[10px]"># Watercraft</Label><Input className="h-8 text-sm" value={umbrella.num_watercraft} onChange={e => setUmbrella({ ...umbrella, num_watercraft: e.target.value })} /></div>
                    <div><Label className="text-[10px]"># Rental Properties</Label><Input className="h-8 text-sm" value={umbrella.rental_properties} onChange={e => setUmbrella({ ...umbrella, rental_properties: e.target.value })} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={umbrella.has_business} onCheckedChange={v => setUmbrella({ ...umbrella, has_business: !!v })} /> Do you own or operate a business?
                  </label>
                  {umbrella.has_business && <div><Label className="text-[10px]">Business Description</Label><Input className="h-8 text-sm" value={umbrella.business_description} onChange={e => setUmbrella({ ...umbrella, business_description: e.target.value })} /></div>}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ─── COMMERCIAL LINES FORM ─── */}
        {intakeType === "commercial" && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Your Name *</Label><Input value={commercialForm.customer_name} onChange={e => updateCommercial("customer_name", e.target.value)} placeholder="John Smith" /></div>
                <div><Label className="text-xs">Email *</Label><Input type="email" value={commercialForm.customer_email} onChange={e => updateCommercial("customer_email", e.target.value)} placeholder="john@company.com" /></div>
                <div><Label className="text-xs">Phone *</Label><Input type="tel" value={commercialForm.customer_phone} onChange={e => updateCommercial("customer_phone", e.target.value)} placeholder="(555) 123-4567" /></div>
                <div><Label className="text-xs">Mailing Address *</Label><Input value={commercialForm.street_address} onChange={e => updateCommercial("street_address", e.target.value)} placeholder="123 Main St, Suite 100" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Business Details</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label className="text-xs">Business Name *</Label><Input value={commercialForm.business_name} onChange={e => updateCommercial("business_name", e.target.value)} placeholder="Acme Construction LLC" /></div>
                <div><Label className="text-xs">FEIN / EIN</Label><Input value={commercialForm.ein} onChange={e => updateCommercial("ein", e.target.value)} placeholder="XX-XXXXXXX" /></div>
                <div><Label className="text-xs">Business Type</Label><Input value={commercialForm.business_type} onChange={e => updateCommercial("business_type", e.target.value)} placeholder="e.g. General Contractor" /></div>
                
                <div><Label className="text-xs">City</Label><Input value={commercialForm.city} onChange={e => updateCommercial("city", e.target.value)} placeholder="Dallas" /></div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Select value={commercialForm.state} onValueChange={v => updateCommercial("state", v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">ZIP Code</Label><Input value={commercialForm.zip} onChange={e => updateCommercial("zip", e.target.value)} placeholder="75201" /></div>
                <div><Label className="text-xs"># of Employees</Label><Input value={commercialForm.employee_count} onChange={e => updateCommercial("employee_count", e.target.value)} placeholder="25" /></div>
                <div><Label className="text-xs">Annual Revenue</Label><Input value={commercialForm.annual_revenue} onChange={e => updateCommercial("annual_revenue", e.target.value)} placeholder="$1,500,000" /></div>
                <div><Label className="text-xs">Years in Business</Label><Input value={commercialForm.years_in_business} onChange={e => updateCommercial("years_in_business", e.target.value)} placeholder="8" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Coverage Request</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Requested Coverage</Label>
                  <Select value={commercialForm.requested_coverage} onValueChange={v => updateCommercial("requested_coverage", v)}>
                    <SelectTrigger><SelectValue placeholder="Select coverage type" /></SelectTrigger>
                    <SelectContent>{COVERAGE_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Desired Premium Budget</Label><Input value={commercialForm.requested_premium} onChange={e => updateCommercial("requested_premium", e.target.value)} placeholder="$5,000 / year" /></div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ─── SHARED: Documents + Notes + Submit (only after type is chosen) ─── */}
        {intakeType && (
          <>
            {/* Document Upload */}
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

            {/* Notes */}
            <Card>
              <CardHeader><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else your agent should know..." rows={3} />
              </CardContent>
            </Card>

            {/* Submit */}
            <Button className="w-full h-11 text-base" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Information"}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">Your information is transmitted securely. By submitting, you authorize your agent to use this data for quoting purposes.</p>
          </>
        )}
      </div>
    </div>
  );
}
