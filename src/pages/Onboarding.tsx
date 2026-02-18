import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ArrowRight, SkipForward } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

const AGENCY_FIELDS = [
  { key: "agency_name", label: "Agency Name", placeholder: "ABC Insurance Agency" },
  { key: "agency_phone", label: "Agency Phone", placeholder: "(555) 123-4567" },
  { key: "agency_fax", label: "Agency Fax", placeholder: "(555) 123-4568" },
  { key: "agency_email", label: "Agency Email", placeholder: "info@agency.com" },
  { key: "producer_name", label: "Producer Name", placeholder: "Jane Smith" },
  { key: "producer_license_no", label: "Producer License No.", placeholder: "LIC-123456" },
  { key: "from_email", label: "Send-From Email", placeholder: "submissions@agency.com" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nonEmpty = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim())
      );

      // Update profile with agency name and form defaults
      const { error } = await supabase
        .from("profiles")
        .update({
          agency_name: nonEmpty.agency_name || null,
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

  const handleSkip = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 aura-subtle-mesh">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <img src={auraLogo} alt="AURA" className="h-8" />
        </div>

        <Card className="aura-glass">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              Set up your agency
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              These details auto-fill on every ACORD form you generate. You can update them anytime in Settings.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGENCY_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </Label>
                  <Input
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="h-10"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? "Saving…" : "Save & Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="gap-2 text-muted-foreground">
                <SkipForward className="h-4 w-4" />
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
