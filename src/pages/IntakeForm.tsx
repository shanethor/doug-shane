import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, AlertCircle, Shield } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

const COVERAGE_OPTIONS = [
  "General Liability",
  "Workers Compensation",
  "Commercial Auto",
  "Commercial Property",
  "Umbrella / Excess",
  "Professional Liability (E&O)",
  "Cyber Liability",
  "Business Owners Policy (BOP)",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

interface IntakeFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  business_name: string;
  ein: string;
  business_type: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  employee_count: string;
  annual_revenue: string;
  years_in_business: string;
  requested_coverage: string;
  requested_premium: string;
  additional_notes: string;
}

export default function IntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<IntakeFormData>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    business_name: "",
    ein: "",
    business_type: "",
    street_address: "",
    city: "",
    state: "",
    zip: "",
    employee_count: "",
    annual_revenue: "",
    years_in_business: "",
    requested_coverage: "",
    requested_premium: "",
    additional_notes: "",
  });

  useEffect(() => {
    if (!token) return;
    supabase
      .from("intake_links" as any)
      .select("*")
      .eq("token", token)
      .single()
      .then(({ data, error }: any) => {
        if (error || !data) {
          setExpired(true);
          setLoading(false);
          return;
        }
        if (data.is_used || new Date(data.expires_at) < new Date()) {
          setExpired(true);
        }
        if (data.customer_name) setForm(f => ({ ...f, customer_name: data.customer_name }));
        if (data.customer_email) setForm(f => ({ ...f, customer_email: data.customer_email }));
        setLinkData(data);
        setLoading(false);
      });
  }, [token]);

  const update = (field: keyof IntakeFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /** Build a structured notes block from all fields so process-intake can extract everything */
  const buildStructuredNotes = (): string => {
    const lines: string[] = [];
    if (form.ein) lines.push(`FEIN / EIN: ${form.ein}`);
    if (form.customer_phone) lines.push(`Phone: ${form.customer_phone}`);
    if (form.business_type) lines.push(`Business Type: ${form.business_type}`);
    if (form.street_address) lines.push(`Address: ${form.street_address}`);
    if (form.city || form.state || form.zip) {
      lines.push(`City/State/Zip: ${[form.city, form.state, form.zip].filter(Boolean).join(", ")}`);
    }
    if (form.employee_count) lines.push(`Number of Employees: ${form.employee_count}`);
    if (form.annual_revenue) lines.push(`Annual Revenue: ${form.annual_revenue}`);
    if (form.years_in_business) lines.push(`Years in Business: ${form.years_in_business}`);
    if (form.additional_notes) lines.push(`Notes: ${form.additional_notes}`);
    return lines.join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData) return;
    setSubmitting(true);

    try {
      const structuredNotes = buildStructuredNotes();

      const { error: subError } = await supabase.from("intake_submissions" as any).insert({
        intake_link_id: linkData.id,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        business_name: form.business_name,
        requested_coverage: form.requested_coverage,
        requested_premium: form.requested_premium,
        additional_notes: structuredNotes,
      } as any);
      if (subError) throw subError;

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ intake_link_id: linkData.id }),
      });

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
            This intake form link has expired or has already been used. Please contact your insurance agent for a new link.
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
            Your information has been securely submitted. Your insurance agent will review your details and be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <img src={auraLogo} alt="AURA Risk Group" className="h-7" />
          <span className="ml-2 text-xs text-muted-foreground font-sans flex items-center gap-1">
            <Shield className="h-3 w-3" /> Secure Intake Form
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-4xl mb-1">Insurance Coverage Request</h1>
        <p className="text-muted-foreground text-sm font-sans mb-8">
          Please provide your business details below. This information will help your agent prepare the right coverage options for you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Contact Information</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Name *</Label>
                <Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} required placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email Address *</Label>
                <Input type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} required placeholder="john@company.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                <Input type="tel" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} placeholder="(555) 123-4567" />
              </div>
            </div>
          </fieldset>

          {/* Business Info */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Business Details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Name *</Label>
                <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} required placeholder="Acme Construction LLC" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">FEIN / EIN</Label>
                <Input value={form.ein} onChange={(e) => update("ein", e.target.value)} placeholder="XX-XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Type</Label>
                <Input value={form.business_type} onChange={(e) => update("business_type", e.target.value)} placeholder="e.g. General Contractor, Restaurant" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Street Address</Label>
                <Input value={form.street_address} onChange={(e) => update("street_address", e.target.value)} placeholder="123 Main St, Suite 100" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">City</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Dallas" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">State</Label>
                <Select value={form.state} onValueChange={(v) => update("state", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">ZIP Code</Label>
                <Input value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="75201" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Number of Employees</Label>
                <Input value={form.employee_count} onChange={(e) => update("employee_count", e.target.value)} placeholder="e.g. 25" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Annual Revenue</Label>
                <Input value={form.annual_revenue} onChange={(e) => update("annual_revenue", e.target.value)} placeholder="$1,500,000" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Years in Business</Label>
                <Input value={form.years_in_business} onChange={(e) => update("years_in_business", e.target.value)} placeholder="e.g. 8" />
              </div>
            </div>
          </fieldset>

          {/* Coverage */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Coverage Request</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Requested Coverage</Label>
                <Select value={form.requested_coverage} onValueChange={(v) => update("requested_coverage", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select coverage type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COVERAGE_OPTIONS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Desired Premium Budget</Label>
                <Input value={form.requested_premium} onChange={(e) => update("requested_premium", e.target.value)} placeholder="$5,000 / year" />
              </div>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Additional Notes</Label>
            <Textarea
              value={form.additional_notes}
              onChange={(e) => update("additional_notes", e.target.value)}
              placeholder="Any other details about your business or coverage needs…"
              className="min-h-[80px]"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-11">
            {submitting ? "Submitting…" : "Submit Coverage Request"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground font-sans">
            Your data is encrypted and securely transmitted. It will only be shared with your insurance agent.
          </p>
        </form>
      </main>
    </div>
  );
}
