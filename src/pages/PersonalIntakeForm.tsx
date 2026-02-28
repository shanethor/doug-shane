import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Home, Sailboat, Umbrella, Plus, Trash2, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Driver = { name: string; dob: string; license_number: string; license_state: string; gender: string; marital_status: string; violations: string };
type Vehicle = { year: string; make: string; model: string; vin: string; usage: string; annual_miles: string; garaging_zip: string };
type HomeInfo = { address: string; city: string; state: string; zip: string; year_built: string; square_footage: string; construction_type: string; roof_type: string; roof_year: string; occupancy: string; rent_roll: string; heating_type: string; electrical_update_year: string; plumbing_update_year: string; has_pool: boolean; has_trampoline: boolean; has_dog: boolean; dog_breed: string; alarm_type: string; fire_extinguishers: boolean; smoke_detectors: boolean; deadbolts: boolean; sprinkler_system: boolean; claims_5_years: string };
type Boat = { year: string; make: string; model: string; length: string; hull_type: string; engine_type: string; horsepower: string; value: string; storage_location: string };
type UmbrellaInfo = { requested_limit: string; num_drivers_household: string; num_vehicles_household: string; num_watercraft: string; rental_properties: string; has_business: boolean; business_description: string };

const emptyDriver = (): Driver => ({ name: "", dob: "", license_number: "", license_state: "", gender: "", marital_status: "", violations: "" });
const emptyVehicle = (): Vehicle => ({ year: "", make: "", model: "", vin: "", usage: "", annual_miles: "", garaging_zip: "" });
const emptyHome = (): HomeInfo => ({ address: "", city: "", state: "", zip: "", year_built: "", square_footage: "", construction_type: "", roof_type: "", roof_year: "", occupancy: "", rent_roll: "", heating_type: "", electrical_update_year: "", plumbing_update_year: "", has_pool: false, has_trampoline: false, has_dog: false, dog_breed: "", alarm_type: "", fire_extinguishers: false, smoke_detectors: false, deadbolts: false, sprinkler_system: false, claims_5_years: "" });
const emptyBoat = (): Boat => ({ year: "", make: "", model: "", length: "", hull_type: "", engine_type: "", horsepower: "", value: "", storage_location: "" });
const emptyUmbrella = (): UmbrellaInfo => ({ requested_limit: "", num_drivers_household: "", num_vehicles_household: "", num_watercraft: "", rental_properties: "", has_business: false, business_description: "" });

export default function PersonalIntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [record, setRecord] = useState<any>(null);

  // Applicant info
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");

  // Coverage sections
  const [enableAuto, setEnableAuto] = useState(true);
  const [enableHome, setEnableHome] = useState(true);
  const [enableBoat, setEnableBoat] = useState(false);
  const [enableUmbrella, setEnableUmbrella] = useState(false);

  // Auto
  const [drivers, setDrivers] = useState<Driver[]>([emptyDriver()]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);

  // Home
  const [homes, setHomes] = useState<HomeInfo[]>([emptyHome()]);

  // Boat
  const [boats, setBoats] = useState<Boat[]>([emptyBoat()]);

  // Umbrella
  const [umbrella, setUmbrella] = useState<UmbrellaInfo>(emptyUmbrella());

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from("personal_intake_submissions")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setExpired(true);
        setLoading(false);
        return;
      }

      if (data.is_used || data.status === "submitted") {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setRecord(data);
      setLoading(false);
    })();
  }, [token]);

  const addItem = <T,>(arr: T[], setArr: (v: T[]) => void, factory: () => T, max: number) => {
    if (arr.length < max) setArr([...arr, factory()]);
  };

  const removeItem = <T,>(arr: T[], setArr: (v: T[]) => void, idx: number) => {
    if (arr.length > 1) setArr(arr.filter((_, i) => i !== idx));
  };

  const updateItem = <T,>(arr: T[], setArr: (v: T[]) => void, idx: number, field: keyof T, value: any) => {
    const copy = [...arr];
    (copy[idx] as any)[field] = value;
    setArr(copy);
  };

  const handleSubmit = async () => {
    if (!record || !applicantName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSubmitting(true);

    const formData = {
      applicant: { name: applicantName, email: applicantEmail, phone: applicantPhone, address: applicantAddress },
      sections: {
        auto: enableAuto ? { drivers, vehicles } : null,
        home: enableHome ? { properties: homes } : null,
        boat: enableBoat ? { boats } : null,
        umbrella: enableUmbrella ? umbrella : null,
      },
      notes,
    };

    const { error } = await supabase
      .from("personal_intake_submissions")
      .update({
        form_data: formData as any,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        is_used: true,
      })
      .eq("id", record.id);

    if (error) {
      toast.error("Failed to submit — please try again");
      setSubmitting(false);
      return;
    }

    // Trigger email notification
    try {
      const deliveryEmails = record.delivery_emails;
      if (deliveryEmails && deliveryEmails.length > 0) {
        const sections = [enableAuto && "Auto", enableHome && "Home", enableBoat && "Boat", enableUmbrella && "Umbrella"].filter(Boolean).join(", ");
        await supabase.functions.invoke("send-personal-intake-email", {
          body: { token: record.token, applicant_name: applicantName, sections },
        });
      }
    } catch {
      // Email failure shouldn't block submission
    }

    setSubmitted(true);
    setSubmitting(false);
    toast.success("Submitted successfully!");
  };

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
            <CheckCircle className="h-10 w-10 text-success mx-auto" />
            <h2 className="text-xl font-semibold">Thank You!</h2>
            <p className="text-sm text-muted-foreground">Your personal lines information has been submitted. Your agent will be in touch soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Personal Lines Intake</h1>
          <p className="text-sm text-muted-foreground">Please fill out the sections that apply to you.</p>
        </div>

        {/* Applicant Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Your Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Full Name *</Label><Input value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="John Doe" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} placeholder="john@example.com" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
            <div><Label className="text-xs">Mailing Address</Label><Input value={applicantAddress} onChange={e => setApplicantAddress(e.target.value)} placeholder="123 Main St, City, ST 12345" /></div>
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
              <button
                key={s.label}
                onClick={() => s.toggle(!s.enabled)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${s.enabled ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Auto Section */}
        {enableAuto && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Auto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drivers */}
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
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Marital Status</Label>
                        <Select value={d.marital_status} onValueChange={v => updateItem(drivers, setDrivers, i, "marital_status", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label className="text-[10px]">Violations / Accidents (last 5 years)</Label><Input className="h-8 text-sm" value={d.violations} onChange={e => updateItem(drivers, setDrivers, i, "violations", e.target.value)} placeholder="None, or describe..." /></div>
                  </div>
                ))}
                {drivers.length < 5 && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(drivers, setDrivers, emptyDriver, 5)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Driver
                  </Button>
                )}
              </div>

              {/* Vehicles */}
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
                      <div><Label className="text-[10px]">Year</Label><Input className="h-8 text-sm" value={v.year} onChange={e => updateItem(vehicles, setVehicles, i, "year", e.target.value)} placeholder="2024" /></div>
                      <div><Label className="text-[10px]">Make</Label><Input className="h-8 text-sm" value={v.make} onChange={e => updateItem(vehicles, setVehicles, i, "make", e.target.value)} placeholder="Toyota" /></div>
                      <div><Label className="text-[10px]">Model</Label><Input className="h-8 text-sm" value={v.model} onChange={e => updateItem(vehicles, setVehicles, i, "model", e.target.value)} placeholder="Camry" /></div>
                      <div><Label className="text-[10px]">VIN</Label><Input className="h-8 text-sm" value={v.vin} onChange={e => updateItem(vehicles, setVehicles, i, "vin", e.target.value)} /></div>
                      <div>
                        <Label className="text-[10px]">Usage</Label>
                        <Select value={v.usage} onValueChange={val => updateItem(vehicles, setVehicles, i, "usage", val)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="commute">Commute</SelectItem>
                            <SelectItem value="pleasure">Pleasure</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-[10px]">Annual Miles</Label><Input className="h-8 text-sm" value={v.annual_miles} onChange={e => updateItem(vehicles, setVehicles, i, "annual_miles", e.target.value)} placeholder="12000" /></div>
                      <div><Label className="text-[10px]">Garaging ZIP</Label><Input className="h-8 text-sm" value={v.garaging_zip} onChange={e => updateItem(vehicles, setVehicles, i, "garaging_zip", e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                {vehicles.length < 5 && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(vehicles, setVehicles, emptyVehicle, 5)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Vehicle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Home Section */}
        {enableHome && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> Home / Property</CardTitle>
            </CardHeader>
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
                        <SelectContent>
                          <SelectItem value="frame">Frame</SelectItem>
                          <SelectItem value="masonry">Masonry</SelectItem>
                          <SelectItem value="brick">Brick</SelectItem>
                          <SelectItem value="stucco">Stucco</SelectItem>
                          <SelectItem value="log">Log</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Roof Type</Label>
                      <Select value={h.roof_type} onValueChange={v => updateItem(homes, setHomes, i, "roof_type", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asphalt_shingle">Asphalt Shingle</SelectItem>
                          <SelectItem value="metal">Metal</SelectItem>
                          <SelectItem value="tile">Tile</SelectItem>
                          <SelectItem value="slate">Slate</SelectItem>
                          <SelectItem value="flat">Flat/Built-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px]">Roof Year</Label><Input className="h-8 text-sm" value={h.roof_year} onChange={e => updateItem(homes, setHomes, i, "roof_year", e.target.value)} /></div>
                    <div>
                      <Label className="text-[10px]">Occupancy</Label>
                      <Select value={h.occupancy} onValueChange={v => updateItem(homes, setHomes, i, "occupancy", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner_occupied">Owner Occupied</SelectItem>
                          <SelectItem value="tenant_occupied">Tenant Occupied</SelectItem>
                          <SelectItem value="investment">Investment/Rental</SelectItem>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Heating Type</Label>
                      <Select value={h.heating_type} onValueChange={v => updateItem(homes, setHomes, i, "heating_type", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forced_air">Forced Air</SelectItem>
                          <SelectItem value="baseboard">Baseboard</SelectItem>
                          <SelectItem value="radiant">Radiant</SelectItem>
                          <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          <SelectItem value="wood_stove">Wood Stove</SelectItem>
                        </SelectContent>
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
                      {[
                        { key: "smoke_detectors" as const, label: "Smoke Detectors" },
                        { key: "fire_extinguishers" as const, label: "Fire Extinguishers" },
                        { key: "deadbolts" as const, label: "Deadbolt Locks" },
                        { key: "sprinkler_system" as const, label: "Sprinkler System" },
                        { key: "has_pool" as const, label: "Swimming Pool" },
                        { key: "has_trampoline" as const, label: "Trampoline" },
                      ].map(item => (
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
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="local">Local Alarm</SelectItem>
                          <SelectItem value="central">Central Station</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={h.has_dog} onCheckedChange={v => updateItem(homes, setHomes, i, "has_dog", !!v)} />
                      Dog(s) on premises
                    </label>
                    {h.has_dog && (
                      <div><Label className="text-[10px]">Breed(s)</Label><Input className="h-8 text-sm" value={h.dog_breed} onChange={e => updateItem(homes, setHomes, i, "dog_breed", e.target.value)} placeholder="Labrador, Golden Retriever" /></div>
                    )}
                    <div><Label className="text-[10px]">Claims in last 5 years</Label><Input className="h-8 text-sm" value={h.claims_5_years} onChange={e => updateItem(homes, setHomes, i, "claims_5_years", e.target.value)} placeholder="None, or describe..." /></div>
                  </div>
                </div>
              ))}
              {homes.length < 5 && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(homes, setHomes, emptyHome, 5)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Property
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Boat Section */}
        {enableBoat && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sailboat className="h-4 w-4" /> Boat / Watercraft</CardTitle>
            </CardHeader>
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
                        <SelectContent>
                          <SelectItem value="fiberglass">Fiberglass</SelectItem>
                          <SelectItem value="aluminum">Aluminum</SelectItem>
                          <SelectItem value="wood">Wood</SelectItem>
                          <SelectItem value="inflatable">Inflatable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Engine Type</Label>
                      <Select value={b.engine_type} onValueChange={v => updateItem(boats, setBoats, i, "engine_type", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outboard">Outboard</SelectItem>
                          <SelectItem value="inboard">Inboard</SelectItem>
                          <SelectItem value="sterndrive">Sterndrive</SelectItem>
                          <SelectItem value="jet">Jet</SelectItem>
                          <SelectItem value="sail">Sail Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px]">Horsepower</Label><Input className="h-8 text-sm" value={b.horsepower} onChange={e => updateItem(boats, setBoats, i, "horsepower", e.target.value)} /></div>
                    <div><Label className="text-[10px]">Estimated Value</Label><Input className="h-8 text-sm" value={b.value} onChange={e => updateItem(boats, setBoats, i, "value", e.target.value)} placeholder="$25,000" /></div>
                    <div><Label className="text-[10px]">Storage Location</Label><Input className="h-8 text-sm" value={b.storage_location} onChange={e => updateItem(boats, setBoats, i, "storage_location", e.target.value)} placeholder="Marina / Home" /></div>
                  </div>
                </div>
              ))}
              {boats.length < 5 && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addItem(boats, setBoats, emptyBoat, 5)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Boat
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Umbrella Section */}
        {enableUmbrella && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Umbrella className="h-4 w-4" /> Umbrella / Excess Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Requested Limit</Label>
                  <Select value={umbrella.requested_limit} onValueChange={v => setUmbrella({ ...umbrella, requested_limit: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000000">$1,000,000</SelectItem>
                      <SelectItem value="2000000">$2,000,000</SelectItem>
                      <SelectItem value="3000000">$3,000,000</SelectItem>
                      <SelectItem value="5000000">$5,000,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]"># Drivers in Household</Label><Input className="h-8 text-sm" value={umbrella.num_drivers_household} onChange={e => setUmbrella({ ...umbrella, num_drivers_household: e.target.value })} /></div>
                <div><Label className="text-[10px]"># Vehicles in Household</Label><Input className="h-8 text-sm" value={umbrella.num_vehicles_household} onChange={e => setUmbrella({ ...umbrella, num_vehicles_household: e.target.value })} /></div>
                <div><Label className="text-[10px]"># Watercraft</Label><Input className="h-8 text-sm" value={umbrella.num_watercraft} onChange={e => setUmbrella({ ...umbrella, num_watercraft: e.target.value })} /></div>
                <div><Label className="text-[10px]"># Rental Properties</Label><Input className="h-8 text-sm" value={umbrella.rental_properties} onChange={e => setUmbrella({ ...umbrella, rental_properties: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={umbrella.has_business} onCheckedChange={v => setUmbrella({ ...umbrella, has_business: !!v })} />
                Do you own or operate a business?
              </label>
              {umbrella.has_business && (
                <div><Label className="text-[10px]">Business Description</Label><Input className="h-8 text-sm" value={umbrella.business_description} onChange={e => setUmbrella({ ...umbrella, business_description: e.target.value })} /></div>
              )}
            </CardContent>
          </Card>
        )}

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
      </div>
    </div>
  );
}
