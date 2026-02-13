import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";

const coverageTypes = [
  "General Liability",
  "Professional Liability",
  "Workers Compensation",
  "Commercial Property",
  "Commercial Auto",
  "Cyber Liability",
  "Directors & Officers",
  "Employment Practices",
  "Umbrella / Excess",
  "Other",
];

const industries = [
  "Construction",
  "Technology",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Restaurant / Hospitality",
  "Real Estate",
  "Professional Services",
  "Transportation",
  "Non-Profit",
  "Other",
];

export default function NewQuote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    industry: "",
    annual_revenue: "",
    employee_count: "",
    coverage_type: "",
    effective_date: "",
    expiration_date: "",
    current_carrier: "",
    current_premium: "",
    coverage_limits: "",
    deductible: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quote_requests")
        .insert({
          ...form,
          agent_id: user.id,
          status: "submitted",
          effective_date: form.effective_date || null,
          expiration_date: form.expiration_date || null,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Upload files
      for (const file of files) {
        const path = `${user.id}/${quote.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("quote-documents")
          .upload(path, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        await supabase.from("quote_documents").insert({
          quote_id: quote.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          uploaded_by: user.id,
        });
      }

      toast.success("Quote submitted successfully");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-4xl mb-1">New Quote Request</h1>
        <p className="text-muted-foreground text-sm font-sans mb-8">
          Fill in the details below to submit a new insurance quote request.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <section>
            <h2 className="text-2xl mb-4 pb-2 border-b">Company Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company Name *</Label>
                <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Name</Label>
                <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Industry</Label>
                <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Annual Revenue</Label>
                <Input value={form.annual_revenue} onChange={(e) => update("annual_revenue", e.target.value)} placeholder="$500,000" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Employee Count</Label>
                <Input value={form.employee_count} onChange={(e) => update("employee_count", e.target.value)} placeholder="25" />
              </div>
            </div>
          </section>

          {/* Coverage Details */}
          <section>
            <h2 className="text-2xl mb-4 pb-2 border-b">Coverage Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Coverage Type *</Label>
                <Select value={form.coverage_type} onValueChange={(v) => update("coverage_type", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select coverage…" /></SelectTrigger>
                  <SelectContent>
                    {coverageTypes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Effective Date</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => update("effective_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Expiration Date</Label>
                <Input type="date" value={form.expiration_date} onChange={(e) => update("expiration_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Current Carrier</Label>
                <Input value={form.current_carrier} onChange={(e) => update("current_carrier", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Current Premium</Label>
                <Input value={form.current_premium} onChange={(e) => update("current_premium", e.target.value)} placeholder="$10,000" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Coverage Limits</Label>
                <Input value={form.coverage_limits} onChange={(e) => update("coverage_limits", e.target.value)} placeholder="$1M / $2M" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Deductible</Label>
                <Input value={form.deductible} onChange={(e) => update("deductible", e.target.value)} placeholder="$5,000" />
              </div>
            </div>
          </section>

          {/* Documents */}
          <section>
            <h2 className="text-2xl mb-4 pb-2 border-b">Documents</h2>
            <div
              className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-sans font-medium">Click to upload documents</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">PDF, DOCX, XLSX — up to 20MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
                onChange={handleFiles}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-sans truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground font-sans shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <h2 className="text-2xl mb-4 pb-2 border-b">Additional Notes</h2>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional information for the underwriter…"
              className="min-h-[100px]"
            />
          </section>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="px-8">
              {submitting ? "Submitting…" : "Submit Quote"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
