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

export default function IntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    business_name: "",
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
        // Pre-fill customer info if available
        if (data.customer_name) setForm(f => ({ ...f, customer_name: data.customer_name }));
        if (data.customer_email) setForm(f => ({ ...f, customer_email: data.customer_email }));
        setLinkData(data);
        setLoading(false);
      });
  }, [token]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData) return;
    setSubmitting(true);

    try {
      // 1. Insert the intake submission
      const { error: subError } = await supabase.from("intake_submissions" as any).insert({
        intake_link_id: linkData.id,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        business_name: form.business_name,
        requested_coverage: form.requested_coverage,
        requested_premium: form.requested_premium,
        additional_notes: form.additional_notes,
      } as any);
      if (subError) throw subError;

      // 2. Process intake via edge function (creates lead + submission + marks link used, with service role)
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Name *</Label>
              <Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} required placeholder="John Smith" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email Address *</Label>
              <Input type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} required placeholder="john@company.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Name *</Label>
              <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} required placeholder="Acme Construction LLC" />
            </div>
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
