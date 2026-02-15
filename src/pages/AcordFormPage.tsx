import { useState } from "react";
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

  // Load AI-extracted data if available
  useState(() => {
    if (!submissionId || !user) return;
    supabase
      .from("insurance_applications")
      .select("form_data")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.form_data) {
          // Map AI-extracted fields to ACORD form fields
          const aiData = data.form_data as Record<string, any>;
          const mapped: Record<string, any> = {};
          for (const field of form?.fields || []) {
            if (aiData[field.key]) {
              mapped[field.key] = aiData[field.key];
            }
          }
          // Also try common field name mappings
          if (aiData.applicant_name && !mapped.applicant_name) mapped.applicant_name = aiData.applicant_name;
          if (aiData.applicant_name && !mapped.insured_name) mapped.insured_name = aiData.applicant_name;
          if (aiData.mailing_address && !mapped.mailing_address) mapped.mailing_address = aiData.mailing_address;
          if (aiData.city && !mapped.city) mapped.city = aiData.city;
          if (aiData.state && !mapped.state) mapped.state = aiData.state;
          if (aiData.zip && !mapped.zip) mapped.zip = aiData.zip;
          if (aiData.fein && !mapped.fein) mapped.fein = aiData.fein;
          if (aiData.business_type && !mapped.business_type) mapped.business_type = aiData.business_type;
          if (aiData.description_of_operations && !mapped.description_of_operations) mapped.description_of_operations = aiData.description_of_operations;
          if (aiData.nature_of_business && !mapped.nature_of_business) mapped.nature_of_business = aiData.nature_of_business;
          if (aiData.number_of_employees && !mapped.full_time_employees) mapped.full_time_employees = aiData.number_of_employees;
          if (aiData.annual_revenue && !mapped.annual_revenues) mapped.annual_revenues = aiData.annual_revenue;
          if (aiData.website && !mapped.website) mapped.website = aiData.website;
          if (aiData.phone && !mapped.business_phone) mapped.business_phone = aiData.phone;
          if (aiData.effective_date && !mapped.effective_date) mapped.effective_date = aiData.effective_date;
          if (aiData.effective_date && !mapped.proposed_eff_date) mapped.proposed_eff_date = aiData.effective_date;
          setFormData(mapped);
          setLoadedFromAI(true);
        }
      });
  });

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
