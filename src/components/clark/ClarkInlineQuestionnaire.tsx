import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Loader2, Clock, ChevronRight } from "lucide-react";

interface ClarkInlineQuestionnaireProps {
  submissionId: string;
  missingFields: string[];
  onComplete: (filledData: Record<string, string>) => void;
}

// Human-friendly labels + optional placeholder hints
const FIELD_META: Record<string, { label: string; placeholder: string }> = {
  applicant_name:    { label: "Business / Applicant Name",   placeholder: "e.g. Acme Corp LLC" },
  dba:               { label: "DBA (Doing Business As)",     placeholder: "e.g. Acme Services" },
  mailing_address:   { label: "Mailing Address",             placeholder: "123 Main St" },
  city:              { label: "City",                        placeholder: "e.g. Austin" },
  state:             { label: "State",                       placeholder: "e.g. TX" },
  zip:               { label: "ZIP Code",                    placeholder: "e.g. 78701" },
  business_phone:    { label: "Business Phone",              placeholder: "e.g. (512) 555-0100" },
  fein:              { label: "FEIN / Tax ID",               placeholder: "e.g. 12-3456789" },
  sic_code:          { label: "SIC Code",                    placeholder: "e.g. 5411" },
  naics_code:        { label: "NAICS Code",                  placeholder: "e.g. 445110" },
  business_type:     { label: "Business Type / Operations",  placeholder: "e.g. General contractor" },
  entity_type:       { label: "Entity Type",                 placeholder: "e.g. LLC, Corp, Sole Prop" },
  years_in_business: { label: "Years in Business",           placeholder: "e.g. 8" },
  annual_revenue:    { label: "Annual Revenue ($)",          placeholder: "e.g. 1500000" },
  num_employees:     { label: "Number of Employees",         placeholder: "e.g. 12" },
  effective_date:    { label: "Policy Effective Date",       placeholder: "MM/DD/YYYY" },
  expiration_date:   { label: "Policy Expiration Date",      placeholder: "MM/DD/YYYY" },
  coverage_requested:{ label: "Coverage Requested",          placeholder: "e.g. GL, Property, Auto" },
  prior_carrier:     { label: "Prior Insurance Carrier",     placeholder: "e.g. State Farm" },
  prior_policy_number:{ label: "Prior Policy Number",        placeholder: "e.g. POL-123456" },
  prior_premium:     { label: "Prior Annual Premium ($)",    placeholder: "e.g. 4800" },
};

const getMeta = (field: string) =>
  FIELD_META[field] ?? {
    label: field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    placeholder: "",
  };

export default function ClarkInlineQuestionnaire({ submissionId, missingFields, onComplete }: ClarkInlineQuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    missingFields.forEach((f) => { init[f] = ""; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const filled = Object.values(answers).filter(v => v.trim() !== "").length;
  const progress = missingFields.length > 0 ? Math.round((filled / missingFields.length) * 100) : 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: sub } = await supabase
        .from("clark_submissions")
        .select("extracted_data")
        .eq("id", submissionId)
        .single();

      const filledAnswers: Record<string, string> = {};
      for (const [key, val] of Object.entries(answers)) {
        if (val && val.trim() !== "") filledAnswers[key] = val.trim();
      }

      const merged = { ...((sub?.extracted_data as Record<string, any>) || {}), ...filledAnswers };
      const stillMissing = missingFields.filter(f => !merged[f] || String(merged[f]).trim() === "");

      const { error } = await supabase
        .from("clark_submissions")
        .update({
          extracted_data: merged,
          questionnaire_completed: stillMissing.length === 0,
          status: stillMissing.length === 0 ? "questionnaire_complete" : "needs_info",
          missing_fields: stillMissing,
        })
        .eq("id", submissionId);

      if (error) throw error;
      setDone(true);
      onComplete(filledAnswers);
      toast.success(stillMissing.length === 0 ? "All fields filled — ready to generate forms!" : `Saved! ${stillMissing.length} field(s) still empty.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-4 flex items-center gap-2.5 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <span>Fields saved — you're ready to generate ACORD forms.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">A few quick details needed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clark couldn't find {missingFields.length} field{missingFields.length !== 1 ? "s" : ""} in your documents. Fill what you know — skip the rest.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="gap-1 text-xs font-normal border-muted-foreground/30">
              <Clock className="h-3 w-3" />
              1–2 min
            </Badge>
            <Badge variant="outline" className="text-xs font-normal border-muted-foreground/30">
              {filled}/{missingFields.length} filled
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missingFields.map((field) => {
              const meta = getMeta(field);
              return (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field} className="text-xs font-medium text-foreground/80">
                    {meta.label}
                  </Label>
                  <Input
                    id={field}
                    value={answers[field] || ""}
                    onChange={(e) => setAnswers((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={meta.placeholder || meta.label}
                    className="h-8 text-sm bg-background"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5 flex-1 sm:flex-none">
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><ChevronRight className="h-3.5 w-3.5" /> Save & Continue</>
              }
            </Button>
            <p className="text-xs text-muted-foreground">
              {filled === 0 ? "Skip for now and generate with what we have." : `${missingFields.length - filled} field${missingFields.length - filled !== 1 ? "s" : ""} still empty — that's OK.`}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
