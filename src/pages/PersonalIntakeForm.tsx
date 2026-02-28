import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, AlertCircle, Shield, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

interface Driver {
  full_name: string;
  dob: string;
  license_number: string;
}

interface Vehicle {
  year: string;
  make: string;
  model: string;
  vin: string;
}

interface Boat {
  year: string;
  make: string;
  model: string;
  hull_id: string;
  length: string;
  engine_type: string;
}

const emptyDriver = (): Driver => ({ full_name: "", dob: "", license_number: "" });
const emptyVehicle = (): Vehicle => ({ year: "", make: "", model: "", vin: "" });
const emptyBoat = (): Boat => ({ year: "", make: "", model: "", hull_id: "", length: "", engine_type: "" });

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function PersonalIntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);

  // Basic info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Coverage selections
  const [wantAuto, setWantAuto] = useState(false);
  const [wantHome, setWantHome] = useState(false);
  const [wantBoat, setWantBoat] = useState(false);
  const [wantUmbrella, setWantUmbrella] = useState(false);

  // Auto
  const [drivers, setDrivers] = useState<Driver[]>([emptyDriver()]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);

  // Boat
  const [boats, setBoats] = useState<Boat[]>([emptyBoat()]);

  // Home
  const [homeNames, setHomeNames] = useState("");
  const [homeDobs, setHomeDobs] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeState, setHomeState] = useState("");
  const [homeZip, setHomeZip] = useState("");
  const [addressLessThan2Years, setAddressLessThan2Years] = useState(false);
  const [priorAddress, setPriorAddress] = useState("");
  const [hasTrampoline, setHasTrampoline] = useState(false);
  const [hasDog, setHasDog] = useState(false);
  const [dogBreeds, setDogBreeds] = useState("");
  const [occupancy, setOccupancy] = useState<string[]>([]);
  const [investmentType, setInvestmentType] = useState("");
  const [annualRentRoll, setAnnualRentRoll] = useState("");

  // Umbrella
  const [umbrellaLimit, setUmbrellaLimit] = useState("");
  const [coverUmUim, setCoverUmUim] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from("personal_intake_submissions" as any)
      .select("*")
      .eq("token", token)
      .single()
      .then(({ data, error }: any) => {
        if (error || !data) { setExpired(true); setLoading(false); return; }
        if (data.is_used || new Date(data.expires_at) < new Date()) setExpired(true);
        setLinkData(data);
        setLoading(false);
      });
  }, [token]);

  const addDriver = () => { if (drivers.length < 5) setDrivers([...drivers, emptyDriver()]); };
  const removeDriver = (i: number) => setDrivers(drivers.filter((_, idx) => idx !== i));
  const updateDriver = (i: number, field: keyof Driver, value: string) => {
    const copy = [...drivers];
    copy[i] = { ...copy[i], [field]: value };
    setDrivers(copy);
  };

  const addVehicle = () => { if (vehicles.length < 5) setVehicles([...vehicles, emptyVehicle()]); };
  const removeVehicle = (i: number) => setVehicles(vehicles.filter((_, idx) => idx !== i));
  const updateVehicle = (i: number, field: keyof Vehicle, value: string) => {
    const copy = [...vehicles];
    copy[i] = { ...copy[i], [field]: value };
    setVehicles(copy);
  };

  const addBoat = () => { if (boats.length < 5) setBoats([...boats, emptyBoat()]); };
  const removeBoat = (i: number) => setBoats(boats.filter((_, idx) => idx !== i));
  const updateBoat = (i: number, field: keyof Boat, value: string) => {
    const copy = [...boats];
    copy[i] = { ...copy[i], [field]: value };
    setBoats(copy);
  };

  const toggleOccupancy = (val: string) => {
    setOccupancy(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData) return;
    setSubmitting(true);

    const formData = {
      full_name: fullName,
      email,
      phone,
      coverages: {
        auto: wantAuto,
        home: wantHome,
        boat: wantBoat,
        umbrella: wantUmbrella,
      },
      auto: wantAuto ? { drivers, vehicles } : null,
      boat: wantBoat ? { boats } : null,
      home: wantHome ? {
        names: homeNames,
        dobs: homeDobs,
        address: homeAddress,
        city: homeCity,
        state: homeState,
        zip: homeZip,
        address_less_than_2_years: addressLessThan2Years,
        prior_address: addressLessThan2Years ? priorAddress : null,
        trampoline: hasTrampoline,
        dog: hasDog,
        dog_breeds: hasDog ? dogBreeds : null,
        occupancy,
        investment_type: occupancy.includes("Investment Property") ? investmentType : null,
        annual_rent_roll: occupancy.includes("Investment Property") ? annualRentRoll : null,
      } : null,
      umbrella: wantUmbrella ? {
        limit: umbrellaLimit,
        cover_um_uim: coverUmUim,
      } : null,
    };

    try {
      const { error } = await supabase
        .from("personal_intake_submissions" as any)
        .update({
          form_data: formData,
          is_used: true,
          submitted_at: new Date().toISOString(),
          status: "submitted",
        } as any)
        .eq("id", linkData.id);
      if (error) throw error;

      // Trigger email delivery
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-personal-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ submission_id: linkData.id }),
      }).catch(err => console.warn("Email delivery failed:", err));

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (expired || !linkData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl mb-2">Link Expired</h1>
          <p className="text-muted-foreground text-sm font-sans">
            This intake form link has expired or has already been used. Please contact your agent for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="rounded-full bg-accent/10 p-4 inline-block mb-4">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl mb-2">Thank You!</h1>
          <p className="text-muted-foreground text-sm font-sans">
            Your personal lines information has been securely submitted. Your agent will review it and be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <img src={auraLogo} alt="AURA" className="h-7" />
          <span className="ml-2 text-xs text-muted-foreground font-sans flex items-center gap-1">
            <Shield className="h-3 w-3" /> Personal Lines Intake
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-4xl mb-1">Personal Lines Insurance Intake</h1>
        <p className="text-muted-foreground text-sm font-sans mb-8">
          Please provide your information below. Select the coverage types you need and fill in the relevant sections.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Contact Info */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Contact Information</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="John A. Smith" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email Address *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
            </div>
          </fieldset>

          {/* Coverage Selection */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-2">What coverage do you need?</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Auto", checked: wantAuto, toggle: () => setWantAuto(!wantAuto) },
                { label: "Home", checked: wantHome, toggle: () => setWantHome(!wantHome) },
                { label: "Boat", checked: wantBoat, toggle: () => setWantBoat(!wantBoat) },
                { label: "Umbrella", checked: wantUmbrella, toggle: () => setWantUmbrella(!wantUmbrella) },
              ].map(({ label, checked, toggle }) => (
                <button
                  key={label}
                  type="button"
                  onClick={toggle}
                  className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
                    checked
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Auto Section */}
          {wantAuto && (
            <CollapsibleSection title="🚗 Auto Information" defaultOpen>
              {/* Drivers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Drivers</Label>
                  {drivers.length < 5 && (
                    <Button type="button" variant="ghost" size="sm" onClick={addDriver} className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Add Driver
                    </Button>
                  )}
                </div>
                {drivers.map((d, i) => (
                  <div key={i} className="border border-border rounded-md p-3 space-y-3 relative">
                    {drivers.length > 1 && (
                      <button type="button" onClick={() => removeDriver(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <p className="text-xs font-medium text-muted-foreground">Driver {i + 1}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <Input value={d.full_name} onChange={e => updateDriver(i, "full_name", e.target.value)} placeholder="John Smith" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                        <Input type="date" value={d.dob} onChange={e => updateDriver(i, "dob", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Driver's License #</Label>
                        <Input value={d.license_number} onChange={e => updateDriver(i, "license_number", e.target.value)} placeholder="DL12345678" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vehicles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vehicles</Label>
                  {vehicles.length < 5 && (
                    <Button type="button" variant="ghost" size="sm" onClick={addVehicle} className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Add Vehicle
                    </Button>
                  )}
                </div>
                {vehicles.map((v, i) => (
                  <div key={i} className="border border-border rounded-md p-3 space-y-3 relative">
                    {vehicles.length > 1 && (
                      <button type="button" onClick={() => removeVehicle(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <p className="text-xs font-medium text-muted-foreground">Vehicle {i + 1}</p>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Year</Label>
                        <Input value={v.year} onChange={e => updateVehicle(i, "year", e.target.value)} placeholder="2024" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Make</Label>
                        <Input value={v.make} onChange={e => updateVehicle(i, "make", e.target.value)} placeholder="Toyota" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Input value={v.model} onChange={e => updateVehicle(i, "model", e.target.value)} placeholder="Camry" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">VIN #</Label>
                        <Input value={v.vin} onChange={e => updateVehicle(i, "vin", e.target.value)} placeholder="1HGBH41JXMN109186" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Home Section */}
          {wantHome && (
            <CollapsibleSection title="🏠 Home Information" defaultOpen>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Names (all insured persons)</Label>
                  <Input value={homeNames} onChange={e => setHomeNames(e.target.value)} placeholder="John Smith, Jane Smith" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dates of Birth</Label>
                  <Input value={homeDobs} onChange={e => setHomeDobs(e.target.value)} placeholder="01/15/1985, 03/22/1987" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address</Label>
                  <Input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="123 Oak Street" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">City</Label>
                  <Input value={homeCity} onChange={e => setHomeCity(e.target.value)} placeholder="Dallas" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">State</Label>
                  <Select value={homeState} onValueChange={setHomeState}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">ZIP</Label>
                  <Input value={homeZip} onChange={e => setHomeZip(e.target.value)} placeholder="75201" />
                </div>
              </div>

              {/* Prior address */}
              <div className="flex items-center gap-2 mt-2">
                <Checkbox checked={addressLessThan2Years} onCheckedChange={(v) => setAddressLessThan2Years(!!v)} id="prior-addr" />
                <Label htmlFor="prior-addr" className="text-sm text-foreground cursor-pointer">Current address is less than 2 years</Label>
              </div>
              {addressLessThan2Years && (
                <div className="space-y-2 ml-6">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prior Address</Label>
                  <Input value={priorAddress} onChange={e => setPriorAddress(e.target.value)} placeholder="456 Elm St, City, ST 12345" />
                </div>
              )}

              {/* Trampoline */}
              <div className="flex items-center gap-2">
                <Checkbox checked={hasTrampoline} onCheckedChange={(v) => setHasTrampoline(!!v)} id="trampoline" />
                <Label htmlFor="trampoline" className="text-sm text-foreground cursor-pointer">Trampoline on property?</Label>
              </div>

              {/* Dog */}
              <div className="flex items-center gap-2">
                <Checkbox checked={hasDog} onCheckedChange={(v) => setHasDog(!!v)} id="dog" />
                <Label htmlFor="dog" className="text-sm text-foreground cursor-pointer">Dog on property?</Label>
              </div>
              {hasDog && (
                <div className="space-y-2 ml-6">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dog Breed(s)</Label>
                  <Input value={dogBreeds} onChange={e => setDogBreeds(e.target.value)} placeholder="e.g. Golden Retriever, German Shepherd" />
                </div>
              )}

              {/* Occupancy */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Occupancy</Label>
                <div className="flex flex-wrap gap-3">
                  {["Primary", "Secondary", "Investment Property"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={occupancy.includes(opt)} onCheckedChange={() => toggleOccupancy(opt)} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {occupancy.includes("Investment Property") && (
                <div className="space-y-4 ml-6 border-l-2 border-primary/20 pl-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Property Type</Label>
                    <Select value={investmentType} onValueChange={setInvestmentType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Family</SelectItem>
                        <SelectItem value="2-family">2 Family</SelectItem>
                        <SelectItem value="3-family">3 Family</SelectItem>
                        <SelectItem value="4-family">4 Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Annual Rent Roll</Label>
                    <Input value={annualRentRoll} onChange={e => setAnnualRentRoll(e.target.value)} placeholder="$24,000" />
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Boat Section */}
          {wantBoat && (
            <CollapsibleSection title="⛵ Boat Information" defaultOpen>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Boats</Label>
                  {boats.length < 5 && (
                    <Button type="button" variant="ghost" size="sm" onClick={addBoat} className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Add Boat
                    </Button>
                  )}
                </div>
                {boats.map((b, i) => (
                  <div key={i} className="border border-border rounded-md p-3 space-y-3 relative">
                    {boats.length > 1 && (
                      <button type="button" onClick={() => removeBoat(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <p className="text-xs font-medium text-muted-foreground">Boat {i + 1}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Year</Label>
                        <Input value={b.year} onChange={e => updateBoat(i, "year", e.target.value)} placeholder="2022" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Make</Label>
                        <Input value={b.make} onChange={e => updateBoat(i, "make", e.target.value)} placeholder="Boston Whaler" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Input value={b.model} onChange={e => updateBoat(i, "model", e.target.value)} placeholder="Montauk 170" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Hull ID</Label>
                        <Input value={b.hull_id} onChange={e => updateBoat(i, "hull_id", e.target.value)} placeholder="BWC12345A222" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Length (ft)</Label>
                        <Input value={b.length} onChange={e => updateBoat(i, "length", e.target.value)} placeholder="17" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Engine Type</Label>
                        <Input value={b.engine_type} onChange={e => updateBoat(i, "engine_type", e.target.value)} placeholder="Outboard" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Umbrella Section */}
          {wantUmbrella && (
            <CollapsibleSection title="☂️ Umbrella Coverage" defaultOpen>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Umbrella Limit</Label>
                  <div className="flex flex-wrap gap-2">
                    {["1,000,000", "2,000,000", "5,000,000"].map(limit => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => setUmbrellaLimit(limit)}
                        className={`rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors ${
                          umbrellaLimit === limit
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        ${limit}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={coverUmUim} onCheckedChange={(v) => setCoverUmUim(!!v)} id="um-uim" />
                  <Label htmlFor="um-uim" className="text-sm text-foreground cursor-pointer">Cover UM/UIM?</Label>
                </div>
              </div>
            </CollapsibleSection>
          )}

          <Button type="submit" disabled={submitting} className="w-full h-11">
            {submitting ? "Submitting…" : "Submit Intake Form"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground font-sans">
            Your data is encrypted and securely transmitted. It will only be shared with your insurance agent.
          </p>
        </form>
      </main>
    </div>
  );
}
