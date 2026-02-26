import { useState, useCallback, useEffect, useRef } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { ACORD_FORM_LIST, type AcordFormDefinition } from "@/lib/acord-forms";
import { FILLABLE_PDF_PATHS, ACORD_INDEX_MAPS } from "@/lib/acord-field-map";
import { getMergedIndexMap } from "@/lib/acord-pdf-fields";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download, Mail, Loader2, FileText, CheckCircle, BrainCircuit,
  Package, FileCheck, StickyNote, Send, Link2, Upload, ShieldCheck,
  FileSearch, ClipboardList, Building2, DollarSign, HardHat, FileSignature, Flame, LucideIcon
} from "lucide-react";
import { toast } from "sonner";

/* ── Client doc category row ── */
function ClientDocCategory({
  icon: Icon,
  label,
  docKey,
  clientDocs,
  setClientDocs,
}: {
  icon: LucideIcon;
  label: string;
  docKey: string;
  clientDocs: Record<string, boolean>;
  setClientDocs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30">
      <Checkbox
        checked={!!clientDocs[docKey]}
        onCheckedChange={(checked) =>
          setClientDocs(prev => ({ ...prev, [docKey]: !!checked }))
        }
        className="h-3.5 w-3.5 shrink-0"
      />
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-xs font-medium flex-1">{label}</p>
      <Badge variant="outline" className="text-[9px]">Pending</Badge>
    </div>
  );
}

interface SubmitPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledFormIds: Set<string>;
  formData: Record<string, any>;
  savedPdfBytesMap: Record<string, Uint8Array>;
  submissionId: string;
  userId?: string;
  triggerSave: () => Promise<void>;
}

export default function SubmitPackageDialog({
  open,
  onOpenChange,
  enabledFormIds,
  formData,
  savedPdfBytesMap,
  submissionId,
  userId,
  triggerSave,
}: SubmitPackageDialogProps) {
  const [narrative, setNarrative] = useState("");
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [activeTab, setActiveTab] = useState("review");
  const [downloading, setDownloading] = useState(false);
  const [generatedPdfMap, setGeneratedPdfMap] = useState<Record<string, Uint8Array>>({});
  const [generatingPdfs, setGeneratingPdfs] = useState(false);

  // Email state
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Client docs state
  const [clientDocChecked, setClientDocChecked] = useState<Record<string, boolean>>({
    signed_supplemental: false,
    loss_runs: false,
    financial_statements: false,
    payroll_records: false,
    safety_manuals: false,
    third_party_contracts: false,
    property_evidence: false,
  });
  const [clientEmail, setClientEmail] = useState("");

  // Merge savedPdfBytesMap (from Adobe viewer) with auto-generated PDFs
  const mergedPdfMap = { ...generatedPdfMap, ...savedPdfBytesMap };

  // Auto-generate PDF bytes for forms not in savedPdfBytesMap when dialog opens
  const hasRunRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hasRunRef.current = false;
      return;
    }
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const formsMissingPdf = ACORD_FORM_LIST.filter(
      f => enabledFormIds.has(f.id) && !savedPdfBytesMap[f.id] && FILLABLE_PDF_PATHS[f.id]
    );
    if (formsMissingPdf.length === 0) return;

    setGeneratingPdfs(true);
    (async () => {
      const { PDFDocument, StandardFonts } = await import("pdf-lib");
      const newMap: Record<string, Uint8Array> = {};

      for (const form of formsMissingPdf) {
        try {
          const pdfPath = FILLABLE_PDF_PATHS[form.id];
          const resp = await fetch(pdfPath);
          const bytes = await resp.arrayBuffer();
          const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
          const helvetica = await doc.embedFont(StandardFonts.Helvetica);
          const pdfForm = doc.getForm();
          const allFields = pdfForm.getFields();

          const indexMap = await getMergedIndexMap(form.id).catch(() => null) || ACORD_INDEX_MAPS[form.id];
          if (indexMap) {
            for (const [internalKey, rawIdx] of Object.entries(indexMap)) {
              const idx = rawIdx as number;
              const val = formData[internalKey];
              if (val === undefined || val === null || val === "") continue;
              const s = String(val).trim();
              if (!s || s === "N/A" || s === "n/a" || s === "[]") continue;
              if (s === "false" && !internalKey.startsWith("chk_")) continue;
              let display = s;
              const isoMatch = display.match(/^(\d{4})-(\d{2})-(\d{2})$/);
              if (isoMatch) display = `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;

              const field = allFields[idx];
              if (!field) continue;
              try {
                const f = field as any;
                if (typeof f.setText === "function") {
                  f.setText(display);
                  try { f.defaultUpdateAppearances(helvetica); } catch (_) {}
                } else if (typeof f.check === "function") {
                  if (display === "true" || display === "Yes" || display === "1") f.check();
                } else if (typeof f.select === "function") {
                  try { f.select(display); } catch (_) {}
                }
              } catch (_) {}
            }
          }

          try { pdfForm.updateFieldAppearances(helvetica); } catch (_) {}
          const savedBytes = await doc.save();
          newMap[form.id] = new Uint8Array(savedBytes);
        } catch (err) {
          console.warn(`Failed to generate PDF for ${form.name}:`, err);
        }
      }

      setGeneratedPdfMap(prev => ({ ...prev, ...newMap }));
      setGeneratingPdfs(false);
    })();
  }, [open, enabledFormIds, savedPdfBytesMap, formData]);

  // Local override: allow users to uncheck forms for this submission only
  const [localEnabledIds, setLocalEnabledIds] = useState<Set<string>>(new Set(enabledFormIds));
  useEffect(() => {
    setLocalEnabledIds(new Set(enabledFormIds));
  }, [enabledFormIds]);

  const enabledFormList = ACORD_FORM_LIST.filter(f => localEnabledIds.has(f.id));

  const companyName = formData.applicant_name || formData.insured_name || "Submission";

  const formStats = enabledFormList.map(form => {
    const filled = form.fields.filter(f => formData[f.key] && String(formData[f.key]).trim()).length;
    return { form, filled, total: form.fields.length };
  });

  const totalFilled = formStats.reduce((s, f) => s + f.filled, 0);
  const totalFields = formStats.reduce((s, f) => s + f.total, 0);

  // Generate narrative with AI
  const generateNarrative = useCallback(async () => {
    setGeneratingNarrative(true);
    try {
      const keyFields: Record<string, string> = {};
      const importantKeys = [
        "applicant_name", "insured_name", "dba_name", "mailing_address", "city", "state", "zip",
        "nature_of_business", "description_of_operations", "business_type", "year_established",
        "annual_revenue", "annual_revenues", "number_of_employees", "full_time_employees",
        "effective_date", "expiration_date", "proposed_eff_date", "proposed_exp_date",
        "carrier", "current_carrier", "policy_number",
        "general_aggregate", "products_aggregate", "each_occurrence", "personal_adv_injury",
        "fire_damage", "medical_payments", "cgl_premium", "property_premium", "auto_premium",
        "umbrella_premium", "each_occurrence_limit", "aggregate_limit",
        "building_amount", "bpp_amount", "business_income_amount",
        "hazard_classification_1", "hazard_classification_2", "hazard_code_1", "hazard_code_2",
        "wc_each_accident", "wc_disease_policy_limit",
        "premises_address", "premises_city", "premises_state", "premises_zip",
        "fein", "sic_code", "naics_code",
      ];

      for (const key of importantKeys) {
        const val = formData[key];
        if (val && String(val).trim() && String(val).trim() !== "false") {
          keyFields[key] = String(val);
        }
      }

      const formsIncluded = enabledFormList.map(f => f.name).join(", ");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an experienced commercial insurance producer writing a professional narrative cover letter for a submission package to an underwriter. Write a thorough, professional narrative (3-5 paragraphs) modeled after industry-standard submission narratives. Include:

1. **Executive Summary / Risk Description**: Who the insured is, what they do, years in business, location, and what coverage is being requested with effective dates and key limits.
2. **Operational Highlights & Risk Management**: Describe the nature of operations, employee count, revenue, industry classification (SIC/NAICS), and any risk management details that can be inferred from the business type.
3. **Coverage Summary**: List the lines of business and key limits/premiums from the forms data.
4. **Conclusion**: A brief closing statement positioning the applicant as a quality risk.

Keep it professional, factual, and specific. Do NOT include placeholders or brackets. Use the actual data provided. If data is missing, simply omit that detail. Do not include a subject line, greeting, or sign-off — just the narrative body.`
            },
            {
              role: "user",
              content: `Write a professional submission narrative for this account.\n\nForms included: ${formsIncluded}\n\nAll form data:\n${JSON.stringify(keyFields, null, 2)}`
            }
          ],
        }),
      });

      if (!resp.ok) throw new Error(`AI request failed: ${resp.status}`);

      const text = await resp.text();
      const lines = text.split("\n");
      let fullText = "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
          fullText += content;
        } catch {}
      }
      setNarrative(fullText || text);

      toast.success("Narrative generated!");
    } catch (err) {
      console.error("Narrative generation error:", err);
      toast.error("Failed to generate narrative");
    }
    setGeneratingNarrative(false);
  }, [formData, enabledFormList]);

  // Download as ZIP
  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await triggerSave();
      await new Promise(r => setTimeout(r, 300));

      if (userId) {
        await supabase
          .from("insurance_applications")
          .update({ form_data: formData })
          .eq("submission_id", submissionId)
          .eq("user_id", userId);
      }

      const zip = new JSZip();
      const date = new Date().toISOString().slice(0, 10);
      let count = 0;

      for (const form of enabledFormList) {
        const hasData = form.fields.some(f => formData[f.key] && String(formData[f.key]).trim());
        if (!hasData) continue;

        const adobeBytes = mergedPdfMap[form.id];
        if (adobeBytes) {
          zip.file(`${form.name.replace(/\s/g, "_")}_${date}.pdf`, adobeBytes);
          count++;
        }
      }

      if (narrative.trim()) {
        zip.file(`Narrative_${companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.txt`, narrative);
      }

      if (count === 0) {
        toast.error("No forms have saved PDF data. Edit a field in each form first to enable download.");
        setDownloading(false);
        return;
      }

      const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Submission_${safeName}_${date}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      toast.success(`${count} form(s)${narrative.trim() ? " + narrative" : ""} bundled into ZIP.`);
      onOpenChange(false);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download package");
    }
    setDownloading(false);
  };

  // Email package
  const handleEmailPackage = async () => {
    if (!emailTo.trim() || !userId) return;
    setSendingEmail(true);
    try {
      await triggerSave();
      await new Promise(r => setTimeout(r, 300));

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, form_defaults")
        .eq("user_id", userId)
        .single();

      const defaults = (profile?.form_defaults || {}) as Record<string, string>;
      const fromEmail = defaults.from_email || undefined;

      const attachments: { filename: string; content: string }[] = [];
      const date = new Date().toISOString().slice(0, 10);

      for (const form of enabledFormList) {
        const adobeBytes = mergedPdfMap[form.id];
        if (!adobeBytes) continue;
        const hasData = form.fields.some(f => formData[f.key] && String(formData[f.key]).trim());
        if (!hasData) continue;

        let binary = "";
        for (let i = 0; i < adobeBytes.length; i++) {
          binary += String.fromCharCode(adobeBytes[i]);
        }
        const base64 = btoa(binary);
        attachments.push({
          filename: `${form.name.replace(/\s/g, "_")}_${date}.pdf`,
          content: base64,
        });
      }

      if (attachments.length === 0) {
        toast.error("No forms have saved PDF data to email.");
        setSendingEmail(false);
        return;
      }

      const subject = `Submission Package - ${companyName}`;

      const bodyHtml = narrative.trim()
        ? `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
            ${narrative.split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("")}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Sent via AURA</p>
          </div>`
        : `<p>Please find the attached submission package for <strong>${companyName}</strong>.</p>
           <p>Please review and let me know if you need any changes.</p>
           <p style="font-size:12px;">Sent via AURA</p>`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          to: emailTo,
          from_email: fromEmail,
          subject,
          html: bodyHtml,
          attachments,
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed to send email");

      toast.success("Submission package emailed!");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Email error:", err);
      toast.error(err.message || "Failed to send email");
    }
    setSendingEmail(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            Submit Package
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review your submission, add a narrative note, then download or email.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="review" className="text-xs gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              Producer
            </TabsTrigger>
            <TabsTrigger value="narrative" className="text-xs gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Narrative
            </TabsTrigger>
            <TabsTrigger value="client" className="text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Client
            </TabsTrigger>
            <TabsTrigger value="send" className="text-xs gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Send
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Producer Forms ── */}
          <TabsContent value="review" className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 pr-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-3">
                  <div>
                    <p className="text-sm font-semibold">{companyName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {totalFilled} of {totalFields} fields filled across {enabledFormList.length} form(s)
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {totalFilled} Fields Filled
                  </Badge>
                </div>

                {/* ACORD Forms */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">ACORD Forms</p>
                  {ACORD_FORM_LIST.filter(f => enabledFormIds.has(f.id)).map((form) => {
                    const filled = form.fields.filter(f => formData[f.key] && String(formData[f.key]).trim()).length;
                    const total = form.fields.length;
                    const isIncluded = localEnabledIds.has(form.id);
                    const hasPdf = !!mergedPdfMap[form.id];
                    return (
                      <div key={form.id} className={`flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 ${!isIncluded ? "opacity-50" : ""}`}>
                        <Checkbox
                          checked={isIncluded}
                          onCheckedChange={(checked) => {
                            setLocalEnabledIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(form.id);
                              else next.delete(form.id);
                              return next;
                            });
                          }}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{form.name}</p>
                          <p className="text-[10px] text-muted-foreground">{form.fullName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={filled >= total * 0.8 ? "default" : filled >= total * 0.4 ? "secondary" : "outline"} className="text-[10px]">
                            {filled}/{total}
                          </Badge>
                          {hasPdf ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : generatingPdfs ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-[9px] text-amber-500">No PDF</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Supplementals */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Supplementals</p>
                  <div className="flex items-center gap-3 py-3 px-3 rounded-md bg-muted/20 border border-dashed border-border">
                    <FileText className="h-4 w-4 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground italic">Supplemental form support coming soon</p>
                  </div>
                </div>

                {/* Narrative Note status */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Narrative Note</p>
                  <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/20">
                    <StickyNote className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    <p className="text-xs text-muted-foreground flex-1">
                      {narrative.trim() ? `${narrative.slice(0, 80)}…` : "No narrative added yet"}
                    </p>
                    {narrative.trim() ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2 text-primary shrink-0"
                        onClick={() => setActiveTab("narrative")}
                      >
                        Add →
                      </Button>
                    )}
                  </div>
                </div>

                {/* Statement of Values */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Statement of Values</p>
                  <div className="flex items-center gap-3 py-3 px-3 rounded-md bg-muted/20 border border-dashed border-border">
                    <Building2 className="h-4 w-4 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground italic">Statement of Values coming soon</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 2: Narrative ── */}
          <TabsContent value="narrative" className="flex-1 overflow-hidden mt-3">
            <div className="flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Narrative Note</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={generateNarrative}
                  disabled={generatingNarrative}
                >
                  {generatingNarrative ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <BrainCircuit className="h-3 w-3" />
                  )}
                  {generatingNarrative ? "Generating…" : "Write with AI"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                This note will be included as a .txt file in ZIP downloads, or as the email body when sending.
              </p>
              <Textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Write a summary of the business and policies for this submission…"
                className="flex-1 text-xs resize-none min-h-0"
              />
            </div>
          </TabsContent>

          {/* ── Tab 3: Client Documents ── */}
          <TabsContent value="client" className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-semibold mb-1">Client Documents</p>
                  <p className="text-[10px] text-muted-foreground">
                    Documents uploaded or received from the client. Check the types you need and send a secure request link.
                  </p>
                </div>

                <div className="space-y-0.5">
                  <ClientDocCategory icon={FileSignature} label="Signed Supplemental" docKey="signed_supplemental" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                  <ClientDocCategory icon={FileSearch} label="Loss Runs" docKey="loss_runs" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                  <ClientDocCategory icon={DollarSign} label="Financial Statements" docKey="financial_statements" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                  <ClientDocCategory icon={ClipboardList} label="Payroll Records" docKey="payroll_records" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                  <ClientDocCategory icon={HardHat} label="Safety Manuals & Programs" docKey="safety_manuals" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                  <ClientDocCategory icon={FileText} label="Third-Party Contracts" docKey="third_party_contracts" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                  <ClientDocCategory icon={Flame} label="Property Evidence" docKey="property_evidence" clientDocs={clientDocChecked} setClientDocs={setClientDocChecked} />
                </div>

                <Separator />

                {/* Request documents section */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Request Documents from Client</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Generate a secure document drop link or email the client directly. Only checked document types above will be requested. AI will audit uploads for completeness and proper signatures.
                  </p>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">Documents are AI-audited for accuracy &amp; signatures</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Client Email (optional)</Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => {
                        const requested = Object.entries(clientDocChecked).filter(([, v]) => v).map(([k]) => k);
                        if (requested.length === 0) {
                          toast.error("Check at least one document type to request");
                          return;
                        }
                        const link = `${window.location.origin}/intake?sub=${submissionId}&docs=${requested.join(",")}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Secure document request link copied!");
                      }}
                    >
                      <Link2 className="h-3 w-3" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      disabled={!clientEmail.trim()}
                      onClick={() => {
                        const requested = Object.entries(clientDocChecked).filter(([, v]) => v).map(([k]) => k);
                        if (requested.length === 0) {
                          toast.error("Check at least one document type to request");
                          return;
                        }
                        toast.success("Document request email sent to client!");
                      }}
                    >
                      <Mail className="h-3 w-3" />
                      Email Client
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 4: Send ── */}
          <TabsContent value="send" className="flex-1 overflow-hidden mt-3">
            <div className="space-y-6 h-[400px]">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Download as ZIP</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bundle all selected ACORD forms{narrative.trim() ? " and narrative note" : ""} into a single ZIP file.
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleDownloadZip}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1.5" />
                  )}
                  Download Package
                </Button>
              </div>

              <Separator />

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Email to Underwriter</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send all forms as PDF attachments.{narrative.trim() ? " The narrative will be used as the email body." : ""}
                </p>
                <div>
                  <Label className="text-xs">Recipient Email</Label>
                  <Input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="underwriter@carrier.com"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleEmailPackage}
                  disabled={!emailTo.trim() || sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Mail className="h-3 w-3 mr-1.5" />
                  )}
                  Send Package
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
