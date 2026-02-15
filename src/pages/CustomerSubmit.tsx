import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Check, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CustomerLink = Tables<"customer_links">;

export default function CustomerSubmit() {
  const { token } = useParams<{ token: string }>();
  const [link, setLink] = useState<CustomerLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    business_description: "",
    years_in_business: "",
    annual_revenue: "",
    employee_count: "",
    additional_info: "",
  });

  useEffect(() => {
    if (!token) return;
    supabase
      .from("customer_links")
      .select("*")
      .eq("token", token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setExpired(true);
          setLoading(false);
          return;
        }
        if (data.is_used || new Date(data.expires_at) < new Date()) {
          setExpired(true);
        }
        setLink(data);
        setLoading(false);
      });
  }, [token]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("customer_submissions").insert({
        link_id: link.id,
        quote_id: link.quote_id,
        data: form,
      });
      if (error) throw error;

      // Mark link as used
      await supabase
        .from("customer_links")
        .update({ is_used: true })
        .eq("id", link.id);

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message);
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

  if (expired || !link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl mb-2">Link Expired</h1>
          <p className="text-muted-foreground text-sm font-sans">
            This submission link has expired or has already been used. Please contact your insurance agent for a new link.
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
          <h1 className="text-3xl mb-2">Submitted Successfully</h1>
          <p className="text-muted-foreground text-sm font-sans">
            Your information has been securely submitted. Your insurance agent will be in touch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <span className="font-semibold tracking-tight text-sm">EPOCH Risk Group</span>
          <span className="ml-2 text-xs text-muted-foreground font-sans">Secure Submission</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-4xl mb-1">Company Information</h1>
        <p className="text-muted-foreground text-sm font-sans mb-8">
          Please fill in your business details below. This information will be securely shared with your insurance agent.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Name *</Label>
              <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Name *</Label>
              <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Email *</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
              <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Years in Business</Label>
              <Input value={form.years_in_business} onChange={(e) => update("years_in_business", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Annual Revenue</Label>
              <Input value={form.annual_revenue} onChange={(e) => update("annual_revenue", e.target.value)} placeholder="$500,000" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Employee Count</Label>
              <Input value={form.employee_count} onChange={(e) => update("employee_count", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Description</Label>
            <Textarea
              value={form.business_description}
              onChange={(e) => update("business_description", e.target.value)}
              placeholder="Describe your business operations…"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Additional Information</Label>
            <Textarea
              value={form.additional_info}
              onChange={(e) => update("additional_info", e.target.value)}
              placeholder="Any other details you'd like to share…"
              className="min-h-[80px]"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-11">
            {submitting ? "Submitting…" : "Submit Information"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground font-sans">
            Your data is encrypted and securely transmitted. It will only be shared with your insurance agent.
          </p>
        </form>
      </main>
    </div>
  );
}
