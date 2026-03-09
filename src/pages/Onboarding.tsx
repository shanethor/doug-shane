import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ArrowRight, SkipForward, User, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

const STEPS = [
  {
    title: "Agency Info",
    subtitle: "Let's set up your agency basics",
    icon: Building2,
    fields: [
      { key: "agency_phone", label: "Phone", placeholder: "(555) 123-4567", icon: Phone, type: "tel" },
      { key: "agency_fax", label: "Fax (optional)", placeholder: "(555) 123-4568", icon: Phone, type: "tel" },
      { key: "agency_email", label: "Agency Email", placeholder: "info@agency.com", icon: Mail, type: "email" },
    ],
  },
  {
    title: "Producer Details",
    subtitle: "Your personal producer info",
    icon: User,
    fields: [
      { key: "producer_name", label: "Your Name", placeholder: "Jane Smith", icon: User },
      { key: "producer_license_no", label: "License No.", placeholder: "LIC-123456", icon: FileText },
      { key: "from_email", label: "Send-From Email", placeholder: "submissions@agency.com", icon: Mail, type: "email" },
    ],
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const filledCount = STEPS.flatMap((s) => s.fields).filter((f) => values[f.key]?.trim()).length;
  const totalFields = STEPS.flatMap((s) => s.fields).length;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nonEmpty = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim())
      );

      const { error } = await supabase
        .from("profiles")
        .update({
          phone: nonEmpty.agency_phone || null,
          full_name: nonEmpty.producer_name || user.user_metadata?.full_name || null,
          from_email: nonEmpty.from_email || null,
          form_defaults: nonEmpty,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Agency info saved!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleSave();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 aura-subtle-mesh">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img src={auraLogo} alt="AURA" className="h-7" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step indicator */}
        <p className="text-xs text-muted-foreground mb-1">
          Step {step + 1} of {STEPS.length} · {filledCount}/{totalFields} fields filled
        </p>

        <Card className="aura-glass">
          <CardContent className="pt-6 pb-5 px-5">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <currentStep.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">{currentStep.title}</h2>
                <p className="text-xs text-muted-foreground">{currentStep.subtitle}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3 mt-5">
              {currentStep.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </Label>
                  <div className="relative">
                    <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={values[f.key] || ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      placeholder={f.placeholder}
                      type={(f as any).type || "text"}
                      className="h-12 pl-10 text-base"
                    />
                    {values[f.key]?.trim() && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" onClick={handleBack} className="h-12 px-5">
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 h-12 gap-2 text-base"
              >
                {saving ? "Saving…" : isLast ? "Save & Start" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Skip */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full mt-2 gap-2 text-muted-foreground h-11"
            >
              <SkipForward className="h-4 w-4" />
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
