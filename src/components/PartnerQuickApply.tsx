import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2, Send, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COVERAGE_TYPES = [
  "General Liability",
  "Workers' Compensation",
  "Commercial Auto",
  "Commercial Property",
  "Umbrella / Excess",
  "Professional Liability",
  "Homeowners",
  "Personal Auto",
  "Flood",
  "Cyber Liability",
  "Other / Not Sure",
];

interface PartnerQuickApplyProps {
  slug: string;
  /** Accent color for the card styling */
  accentClass?: string;
  /** Variant: 'light' or 'dark' */
  variant?: "light" | "dark";
  /** Optional callback after successful submission */
  onSuccess?: () => void;
}

export default function PartnerQuickApply({
  slug,
  accentClass = "bg-primary text-primary-foreground",
  variant = "light",
  onSuccess,
}: PartnerQuickApplyProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    coverage: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error("Please enter at least your first name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("borrower-intake", {
        body: {
          slug,
          partner_quick_apply: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            coverage: form.coverage,
          },
        },
      });
      if (error) throw error;
      setSubmitted(true);
      onSuccess?.();
    } catch (e) {
      console.error("Quick apply failed:", e);
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const isDark = variant === "dark";

  if (submitted) {
    return (
      <Card className={isDark ? "bg-white/10 border-white/20" : "border-green-200 bg-green-50"}>
        <CardContent className="py-8 text-center space-y-3">
          <CheckCircle className={`h-10 w-10 mx-auto ${isDark ? "text-green-400" : "text-green-600"}`} />
          <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-foreground"}`}>You're all set!</p>
          <p className={`text-sm ${isDark ? "text-white/60" : "text-muted-foreground"}`}>
            We've received your info and an advisor will reach out shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  const inputClass = isDark
    ? "bg-white/10 border-white/15 text-white placeholder:text-white/30 h-9 text-sm"
    : "h-9 border-border bg-background text-foreground text-sm";

  const labelClass = isDark
    ? "text-xs text-white/60 mb-1 block"
    : "text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block";

  return (
    <Card className={isDark ? "bg-white/5 border-white/10" : "border-border shadow-md"}>
      <CardContent className="p-5 space-y-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className={`h-4 w-4 ${isDark ? "text-yellow-400" : "text-primary"}`} />
            <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-foreground"}`}>Quick Info</h3>
          </div>
          <p className={`text-xs ${isDark ? "text-white/50" : "text-muted-foreground"}`}>
            Fill out the basics and an advisor will contact you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className={labelClass}>First Name *</Label>
            <Input value={form.firstName} onChange={update("firstName")} placeholder="John" className={inputClass} />
          </div>
          <div>
            <Label className={labelClass}>Last Name</Label>
            <Input value={form.lastName} onChange={update("lastName")} placeholder="Doe" className={inputClass} />
          </div>
        </div>
        <div>
          <Label className={labelClass}>Email *</Label>
          <Input type="email" value={form.email} onChange={update("email")} placeholder="john@example.com" className={inputClass} />
        </div>
        <div>
          <Label className={labelClass}>Phone</Label>
          <Input type="tel" value={form.phone} onChange={update("phone")} placeholder="(555) 555-5555" className={inputClass} />
        </div>
        <div>
          <Label className={labelClass}>Coverage Type</Label>
          <Select value={form.coverage} onValueChange={(v) => setForm((f) => ({ ...f, coverage: v }))}>
            <SelectTrigger className={isDark ? "bg-white/10 border-white/15 text-white h-9 text-sm" : "h-9 text-sm"}>
              <SelectValue placeholder="Select coverage type" />
            </SelectTrigger>
            <SelectContent>
              {COVERAGE_TYPES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className={`w-full h-10 gap-2 text-sm font-semibold ${accentClass}`}
          onClick={handleSubmit}
          disabled={submitting || !form.firstName.trim() || !form.email.trim()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting…" : "Get Started"}
        </Button>
      </CardContent>
    </Card>
  );
}
