import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ACORD_FORMS, type AcordFormDefinition, type AcordFormField } from "@/lib/acord-forms";
import { generateAcordPdf } from "@/lib/pdf-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AcordFormPage() {
  const { formId, submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const form = ACORD_FORMS[formId || ""];
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loadedFromAI, setLoadedFromAI] = useState(false);

  // ── Smart parsing utilities ──────────────────────────────────────

  /** Parse natural-language dates ("March 1, 2026", "3/1/2026", etc.) into YYYY-MM-DD */
  const parseDate = (raw: string): string => {
    if (!raw) return "";
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return raw; // fallback unchanged
  };

  /** Auto-calculate expiration = effective + 1 year */
  const calcExpiration = (effDateStr: string): string => {
    const d = new Date(effDateStr);
    if (isNaN(d.getTime())) return "";
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  /** Clean currency strings: "$600,000" → "600000" */
  const cleanCurrency = (raw: string): string => {
    if (!raw) return "";
    return String(raw).replace(/[$,\s]/g, "");
  };

  /** Split "9 (2 Full Time, 7 Part Time)" into { full_time: "2", part_time: "7", total: "9" } */
  const splitEmployees = (raw: string): { full_time: string; part_time: string; total: string } => {
    const s = String(raw);
    const ftMatch = s.match(/(\d+)\s*full[\s-]?time/i);
    const ptMatch = s.match(/(\d+)\s*part[\s-]?time/i);
    const totalMatch = s.match(/^(\d+)/);
    return {
      full_time: ftMatch?.[1] || "",
      part_time: ptMatch?.[1] || "",
      total: totalMatch?.[1] || s.replace(/\D/g, "") || "",
    };
  };

  // Comprehensive mapping from AI-extracted keys to form field keys
  const AI_TO_FORM_ALIASES: Record<string, string[]> = {
    applicant_name: ["applicant_name", "insured_name", "named_insured"],
    dba_name: ["dba_name"],
    mailing_address: ["mailing_address", "premises_address"],
    city: ["city", "premises_city", "garaging_city"],
    state: ["state", "premises_state", "state_of_operation", "garaging_state"],
    zip: ["zip", "premises_zip", "garaging_zip"],
    phone: ["business_phone", "phone", "contact_phone"],
    email: ["email", "agency_email", "contact_email"],
    website: ["website"],
    fein: ["fein"],
    sic_code: ["sic_code"],
    naics_code: ["naics_code"],
    business_type: ["business_type"],
    year_established: ["date_business_started"],
    annual_revenue: ["annual_revenues", "annual_revenue", "gross_sales"],
    nature_of_business: ["nature_of_business", "business_category"],
    description_of_operations: ["description_of_operations", "operations_description"],
    effective_date: ["effective_date", "proposed_eff_date"],
    expiration_date: ["expiration_date", "proposed_exp_date"],
    current_carrier: ["prior_carrier_name", "current_carrier", "carrier"],
    current_premium: ["current_premium"],
    premises_address: ["premises_address"],
    premises_owned_or_leased: ["premises_interest"],
    square_footage: ["occupied_sq_ft", "total_building_sq_ft"],
    prior_losses_last_5_years: ["loss_history"],
    claims_description: ["loss_history"],
    coverage_types_needed: ["lines_of_business"],
  };

  // Fields that should be treated as dates
  const DATE_FIELDS = new Set([
    "proposed_eff_date", "proposed_exp_date", "effective_date", "expiration_date",
    "date_business_started", "prior_eff_date", "prior_exp_date", "retroactive_date",
    "pending_litigation_date", "signature_date",
  ]);

  // Fields that should be treated as currency
  const CURRENCY_FIELDS = new Set([
    "annual_revenues", "annual_revenue", "gross_sales", "current_premium",
    "cgl_premium", "property_premium", "auto_premium", "umbrella_premium",
    "crime_premium", "cyber_premium", "general_aggregate", "products_aggregate",
    "each_occurrence", "personal_adv_injury", "fire_damage", "medical_payments",
    "deductible_amount", "prior_gl_premium", "prior_auto_premium", "prior_property_premium",
    "total_losses", "ebl_each_employee", "ebl_aggregate", "ebl_deductible",
    "annual_remuneration_1", "annual_remuneration_2", "est_premium_1", "est_premium_2",
    "hazard_premium_1", "hazard_premium_2",
  ]);

  // Fields that are employee counts
  const EMPLOYEE_FIELDS = new Set(["full_time_employees", "part_time_employees", "num_employees_1", "ebl_num_employees", "total_employees"]);

  /** Apply smart normalisation to a value based on its target field */
  const normalizeValue = (fieldKey: string, value: any): any => {
    const s = String(value ?? "");
    if (!s) return s;
    if (DATE_FIELDS.has(fieldKey)) return parseDate(s);
    if (CURRENCY_FIELDS.has(fieldKey)) return cleanCurrency(s);
    return Array.isArray(value) ? value.join(", ") : s;
  };

  // Load AI-extracted data and agent profile to auto-fill as much as possible
  useEffect(() => {
    if (!submissionId || !user) return;

    const formFieldKeys = new Set((form?.fields || []).map((f) => f.key));

    Promise.all([
      supabase
        .from("insurance_applications")
        .select("form_data")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("profiles")
        .select("full_name, agency_name, phone")
        .eq("user_id", user.id)
        .single(),
    ]).then(([appResult, profileResult]) => {
      const mapped: Record<string, any> = {};

      // 1. Auto-fill agent profile data
      const profile = profileResult.data;
      if (profile) {
        if (profile.agency_name && formFieldKeys.has("agency_name")) mapped.agency_name = profile.agency_name;
        if (profile.full_name && formFieldKeys.has("producer_name")) mapped.producer_name = profile.full_name;
        if (profile.phone && formFieldKeys.has("agency_phone")) mapped.agency_phone = profile.phone;
      }

      // 2. Map AI-extracted data with smart normalisation
      const aiData = (appResult.data?.form_data || {}) as Record<string, any>;

      // Handle employee count splitting specially
      const rawEmployees = aiData.number_of_employees;
      if (rawEmployees) {
        const emp = splitEmployees(String(rawEmployees));
        if (formFieldKeys.has("full_time_employees") && emp.full_time) mapped.full_time_employees = emp.full_time;
        if (formFieldKeys.has("part_time_employees") && emp.part_time) mapped.part_time_employees = emp.part_time;
        if (formFieldKeys.has("num_employees_1") && emp.total) mapped.num_employees_1 = emp.total;
        if (formFieldKeys.has("ebl_num_employees") && emp.total) mapped.ebl_num_employees = emp.total;
        if (formFieldKeys.has("total_employees") && emp.total) mapped.total_employees = emp.total;
      }

      // Alias mapping with normalisation
      for (const [aiKey, formKeys] of Object.entries(AI_TO_FORM_ALIASES)) {
        const value = aiData[aiKey];
        if (!value) continue;
        for (const formKey of formKeys) {
          if (formFieldKeys.has(formKey) && !mapped[formKey]) {
            mapped[formKey] = normalizeValue(formKey, value);
          }
        }
      }

      // Direct matches
      for (const [aiKey, value] of Object.entries(aiData)) {
        if (formFieldKeys.has(aiKey) && !mapped[aiKey] && value) {
          mapped[aiKey] = normalizeValue(aiKey, value);
        }
      }

      // 3. Auto-calculate expiration date if we have effective but not expiration
      const effKey = formFieldKeys.has("proposed_exp_date") ? "proposed_eff_date" : "effective_date";
      const expKey = formFieldKeys.has("proposed_exp_date") ? "proposed_exp_date" : "expiration_date";
      if (mapped[effKey] && !mapped[expKey] && formFieldKeys.has(expKey)) {
        mapped[expKey] = calcExpiration(mapped[effKey]);
      }

      // 4. Auto-set signature date to today
      if (formFieldKeys.has("signature_date") && !mapped.signature_date) {
        mapped.signature_date = new Date().toISOString().slice(0, 10);
      }

      // 5. Default "no losses" based on prior_losses
      if (formFieldKeys.has("no_losses") && aiData.prior_losses_last_5_years) {
        const loss = String(aiData.prior_losses_last_5_years).toLowerCase();
        if (loss === "no" || loss === "none" || loss === "n/a") {
          mapped.no_losses = true;
        }
      }

      if (Object.keys(mapped).length > 0) {
        setFormData(mapped);
        setLoadedFromAI(true);
      }
    });
  }, [submissionId, user]);

  if (!form) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl mb-2">Form Not Found</h2>
          <p className="text-muted-foreground font-sans text-sm">Invalid form ID.</p>
        </div>
      </AppLayout>
    );
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const filledCount = form.fields.filter((f) => {
    const v = formData[f.key];
    return v && (typeof v === "string" ? v.trim() : true);
  }).length;
  const requiredFields = form.fields.filter((f) => f.required);
  const requiredFilled = requiredFields.filter((f) => {
    const v = formData[f.key];
    return v && (typeof v === "string" ? v.trim() : true);
  }).length;
  const allRequiredFilled = requiredFilled === requiredFields.length;

  const downloadPdf = () => {
    const pdf = generateAcordPdf(form, formData);
    pdf.save(`${form.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF downloaded!");
  };

  const saveToDatabase = async () => {
    if (!user || !submissionId) return;
    setSaving(true);

    const { error } = await supabase
      .from("insurance_applications")
      .update({ form_data: formData })
      .eq("submission_id", submissionId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved!");
    }
    setSaving(false);
  };

  // Group fields by section
  const sections: { name: string; fields: AcordFormField[] }[] = [];
  const seen = new Set<string>();
  for (const field of form.fields) {
    if (!seen.has(field.section)) {
      seen.add(field.section);
      sections.push({ name: field.section, fields: form.fields.filter((f) => f.section === field.section) });
    }
  }

  const renderField = (field: AcordFormField) => {
    const value = formData[field.key];

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            rows={3}
          />
        );
      case "select":
        return (
          <Select value={value || ""} onValueChange={(v) => handleChange(field.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.key, checked)}
            />
            <span className="text-sm font-sans">{field.label}</span>
          </div>
        );
      default:
        return (
          <Input
            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
            value={value || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.type === "currency" ? "$0.00" : ""}
          />
        );
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl">{form.name}</h1>
            <p className="text-muted-foreground font-sans text-sm mt-1">{form.fullName}</p>
            {loadedFromAI && (
              <Badge variant="secondary" className="mt-2 text-[10px] uppercase tracking-wider">
                AI-prefilled from business plan
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans text-muted-foreground">
              {filledCount}/{form.fields.length} fields
            </span>
            {allRequiredFilled && (
              <Badge className="bg-success/20 text-success text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(filledCount / form.fields.length) * 100}%` }}
          />
        </div>

        {/* Form sections */}
        {sections.map((section) => (
          <Card key={section.name} className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg font-sans">{section.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((field) => {
                const isFull = field.type === "textarea" || field.type === "checkbox";
                return (
                  <div key={field.key} className={`space-y-1.5 ${isFull ? "md:col-span-2" : ""}`}>
                    {field.type !== "checkbox" && (
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        {field.required && <span className="text-destructive">*</span>}
                        {field.label}
                      </Label>
                    )}
                    {renderField(field)}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Actions */}
        <div className="flex gap-3 mt-6 mb-12">
          {submissionId && (
            <Button variant="outline" onClick={saveToDatabase} disabled={saving} className="flex-1 h-12">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving…" : "Save Progress"}
            </Button>
          )}
          <Button onClick={downloadPdf} disabled={!allRequiredFilled} className="flex-1 h-12">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {!allRequiredFilled && (
          <p className="text-center text-xs text-muted-foreground font-sans mb-8">
            Complete all required fields (*) to download the PDF.
            ({requiredFilled}/{requiredFields.length} required fields filled)
          </p>
        )}
      </div>
    </AppLayout>
  );
}
