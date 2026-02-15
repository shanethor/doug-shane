import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Gap = {
  field: string;
  question: string;
  priority: "required" | "recommended" | "optional";
};

const FIELD_LABELS: Record<string, string> = {
  applicant_name: "Applicant Name",
  dba_name: "DBA Name",
  mailing_address: "Mailing Address",
  city: "City",
  state: "State",
  zip: "ZIP Code",
  phone: "Phone",
  email: "Email",
  website: "Website",
  fein: "FEIN",
  sic_code: "SIC Code",
  naics_code: "NAICS Code",
  business_type: "Business Type",
  year_established: "Year Established",
  annual_revenue: "Annual Revenue",
  number_of_employees: "Number of Employees",
  nature_of_business: "Nature of Business",
  description_of_operations: "Description of Operations",
  coverage_types_needed: "Coverage Types Needed",
  effective_date: "Effective Date",
  expiration_date: "Expiration Date",
  current_carrier: "Current Carrier",
  current_premium: "Current Premium",
  premises_address: "Premises Address",
  premises_owned_or_leased: "Owned or Leased",
  square_footage: "Square Footage",
  building_construction: "Building Construction",
  year_built: "Year Built",
  prior_losses_last_5_years: "Prior Losses (5 Years)",
  claims_description: "Claims Description",
  additional_insureds: "Additional Insureds",
  special_conditions: "Special Conditions",
};

const SECTIONS = [
  {
    title: "Applicant Information",
    fields: ["applicant_name", "dba_name", "mailing_address", "city", "state", "zip", "phone", "email", "website", "fein", "sic_code", "naics_code"],
  },
  {
    title: "Business Information",
    fields: ["business_type", "year_established", "annual_revenue", "number_of_employees", "nature_of_business", "description_of_operations"],
  },
  {
    title: "Coverage Information",
    fields: ["coverage_types_needed", "effective_date", "expiration_date", "current_carrier", "current_premium"],
  },
  {
    title: "Location Information",
    fields: ["premises_address", "premises_owned_or_leased", "square_footage", "building_construction", "year_built"],
  },
  {
    title: "Loss History & Additional",
    fields: ["prior_losses_last_5_years", "claims_description", "additional_insureds", "special_conditions"],
  },
];

export default function ApplicationReview() {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fillingGaps, setFillingGaps] = useState(false);
  const [showGaps, setShowGaps] = useState(true);

  useEffect(() => {
    if (!user || !submissionId) return;
    loadApplication();
  }, [user, submissionId]);

  const loadApplication = async () => {
    const { data } = await supabase
      .from("insurance_applications")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setApplication(data);
      setFormData(data.form_data as Record<string, any>);
      setGaps((data.gaps as Gap[]) || []);
    }
    setLoading(false);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveForm = async () => {
    if (!application) return;
    setSaving(true);
    const { error } = await supabase
      .from("insurance_applications")
      .update({ form_data: formData })
      .eq("id", application.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Application saved");
    }
    setSaving(false);
  };

  const submitGapAnswers = async () => {
    if (!application) return;
    const nonEmpty = Object.fromEntries(
      Object.entries(gapAnswers).filter(([, v]) => v.trim())
    );
    if (Object.keys(nonEmpty).length === 0) {
      toast.error("Please answer at least one question.");
      return;
    }

    setFillingGaps(true);
    const { data, error } = await supabase.functions.invoke("fill-gaps", {
      body: { application_id: application.id, answers: nonEmpty },
    });

    if (error) {
      toast.error("Failed to update application");
    } else {
      setFormData(data.form_data);
      setGaps(data.gaps);
      setGapAnswers({});
      setApplication((prev: any) => ({ ...prev, status: data.status }));
      toast.success("Answers applied!");
    }
    setFillingGaps(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!application) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl mb-2">Application Not Found</h2>
          <p className="text-muted-foreground font-sans text-sm">
            The extraction may still be processing. Please refresh in a moment.
          </p>
        </div>
      </AppLayout>
    );
  }

  const requiredGaps = gaps.filter((g) => g.priority === "required");
  const otherGaps = gaps.filter((g) => g.priority !== "required");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl">Insurance Application</h1>
            <p className="text-muted-foreground font-sans text-sm mt-1">
              AI-prefilled from your business plan
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs uppercase tracking-wider font-sans ${
              application.status === "complete"
                ? "bg-success/20 text-success"
                : "bg-warning/20 text-warning"
            }`}
          >
            {application.status}
          </Badge>
        </div>

        {/* Gap filling section */}
        {gaps.length > 0 && showGaps && (
          <Card className="mb-8 border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-lg font-sans flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Missing Information ({gaps.length} question{gaps.length !== 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiredGaps.map((gap) => (
                <div key={gap.field} className="space-y-1.5">
                  <Label className="text-sm font-sans">
                    <Badge variant="destructive" className="text-[10px] mr-2">Required</Badge>
                    {gap.question}
                  </Label>
                  <Input
                    value={gapAnswers[gap.field] || ""}
                    onChange={(e) =>
                      setGapAnswers((prev) => ({ ...prev, [gap.field]: e.target.value }))
                    }
                    placeholder="Your answer…"
                  />
                </div>
              ))}
              {otherGaps.map((gap) => (
                <div key={gap.field} className="space-y-1.5">
                  <Label className="text-sm font-sans">
                    <Badge variant="secondary" className="text-[10px] mr-2 capitalize">
                      {gap.priority}
                    </Badge>
                    {gap.question}
                  </Label>
                  <Input
                    value={gapAnswers[gap.field] || ""}
                    onChange={(e) =>
                      setGapAnswers((prev) => ({ ...prev, [gap.field]: e.target.value }))
                    }
                    placeholder="Your answer…"
                  />
                </div>
              ))}
              <Button onClick={submitGapAnswers} disabled={fillingGaps} className="w-full">
                {fillingGaps ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Submit Answers"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Form sections */}
        {SECTIONS.map((section) => (
          <Card key={section.title} className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg font-sans">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((field) => {
                const value = formData[field];
                const isArray = Array.isArray(value);
                const isFilled = isArray ? value.length > 0 : !!value;
                const isLongField = ["description_of_operations", "claims_description", "special_conditions"].includes(field);

                return (
                  <div key={field} className={`space-y-1.5 ${isLongField ? "md:col-span-2" : ""}`}>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {isFilled ? (
                        <CheckCircle className="h-3 w-3 text-success" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                      )}
                      {FIELD_LABELS[field] || field}
                    </Label>
                    {isLongField ? (
                      <Textarea
                        value={isArray ? value.join(", ") : value || ""}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <Input
                        value={isArray ? value.join(", ") : value || ""}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-3 mt-6 mb-12">
          <Button onClick={saveForm} disabled={saving} className="flex-1 h-12">
            {saving ? "Saving…" : "Save Application"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
