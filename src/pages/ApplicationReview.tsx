import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, FileText, CheckSquare, Download, Settings2, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ACORD_FORMS, ACORD_FORM_LIST } from "@/lib/acord-forms";
import { COVERAGE_LINES, getFormsForCoverageLines } from "@/lib/coverage-form-map";
import { generateAcordPdf } from "@/lib/pdf-generator";
import { buildAutofilledData } from "@/lib/acord-autofill";

type Gap = {
  field: string;
  question: string;
  priority: "required" | "recommended" | "optional";
};

const DEFAULT_FIELDS = [
  { key: "agency_name", label: "Agency Name" },
  { key: "agency_phone", label: "Agency Phone" },
  { key: "agency_email", label: "Agency Email" },
  { key: "billing_plan", label: "Default Billing Plan" },
  { key: "payment_plan", label: "Default Payment Plan" },
  { key: "producer_name", label: "Producer Name" },
  { key: "producer_license_no", label: "Producer License No." },
];

export default function ApplicationReview() {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState<any>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fillingGaps, setFillingGaps] = useState(false);
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const [selectedCoverageLines, setSelectedCoverageLines] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const [agentDefaults, setAgentDefaults] = useState<Record<string, string>>({});
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [narrative, setNarrative] = useState("");

  useEffect(() => {
    if (!user || !submissionId) return;
    loadApplication();
    loadAgentDefaults();
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
      setGaps((data.gaps as Gap[]) || []);
    }
    setLoading(false);
  };

  const loadAgentDefaults = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("form_defaults, full_name, agency_name, phone")
      .eq("user_id", user.id)
      .single();
    if (data?.form_defaults) {
      setAgentDefaults(data.form_defaults as Record<string, string>);
    } else if (data) {
      // Pre-populate from profile
      const defaults: Record<string, string> = {};
      if (data.agency_name) defaults.agency_name = data.agency_name;
      if (data.phone) defaults.agency_phone = data.phone;
      if (data.full_name) defaults.producer_name = data.full_name;
      setAgentDefaults(defaults);
    }
  };

  const saveAgentDefaults = async () => {
    if (!user) return;
    setSavingDefaults(true);
    const { error } = await supabase
      .from("profiles")
      .update({ form_defaults: agentDefaults })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to save defaults");
    else toast.success("Defaults saved! These will apply to all future forms.");
    setSavingDefaults(false);
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
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fill-gaps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ application_id: application.id, answers: nonEmpty }),
        }
      );

      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const result = await response.json();
      setGaps(result.gaps);
      setGapAnswers({});

      const previousFieldCount = Object.keys(application.form_data || {}).filter(
        (k) => (application.form_data as Record<string, any>)[k]
      ).length;
      const newFieldCount = Object.keys(result.form_data || {}).filter(
        (k) => result.form_data[k]
      ).length;
      const inferredCount = newFieldCount - previousFieldCount - Object.keys(nonEmpty).length;

      setApplication((prev: any) => ({ ...prev, status: result.status, form_data: result.form_data }));

      if (result.gaps.length > 0) {
        toast.success(
          `Answers applied! ${inferredCount > 0 ? `AI inferred ${inferredCount} additional fields. ` : ""}${result.gaps.length} question${result.gaps.length !== 1 ? "s" : ""} remaining.`
        );
      } else {
        toast.success(`All fields complete!${inferredCount > 0 ? ` AI inferred ${inferredCount} additional fields.` : ""} Ready to download forms.`);
      }
    } catch (err: any) {
      console.error("fill-gaps error:", err);
      toast.error("Failed to update application");
    }
    setFillingGaps(false);
  };

  const auditAndDownload = async () => {
    if (!user || !application) return;
    setDownloading(true);

    try {
      const aiData = (application.form_data || {}) as Record<string, any>;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, phone")
        .eq("user_id", user.id)
        .single();

      const selected = ACORD_FORM_LIST.filter((f) => selectedForms.has(f.id));

      for (let i = 0; i < selected.length; i++) {
        const form = selected[i];
        let filled = buildAutofilledData(form, aiData, profile);

        // Apply agent defaults
        for (const [k, v] of Object.entries(agentDefaults)) {
          if (v && (!filled[k] || (typeof filled[k] === "string" && !filled[k].trim()))) {
            filled[k] = v;
          }
        }

        // Inject narrative into remarks for ACORD 125
        if (form.id === "acord-125" && narrative.trim()) {
          filled.remarks = narrative.trim() + (filled.remarks ? `\n\n${filled.remarks}` : "");
        }

        // Run AI audit for this form
        try {
          const auditResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-form`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                form_data: filled,
                form_id: form.id,
                agent_defaults: agentDefaults,
              }),
            }
          );

          if (auditResponse.ok) {
            const auditResult = await auditResponse.json();
            // Merge audited data
            filled = { ...filled, ...auditResult.audited_data };
            if (auditResult.audit_notes) {
              console.log(`${form.name} audit:`, auditResult.audit_notes);
            }
          }
        } catch (auditErr) {
          console.warn("Audit failed for", form.name, auditErr);
          // Continue with non-audited data
        }

        const pdf = generateAcordPdf(form, filled);
        pdf.save(`${form.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);

        if (i < selected.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      toast.success(`Downloaded ${selected.length} AI-audited PDF${selected.length !== 1 ? "s" : ""}!`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download forms");
    }
    setDownloading(false);
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
            <h1 className="text-4xl">Client Application</h1>
            <p className="text-muted-foreground font-sans text-sm mt-1">
              AI-extracted data from the client's business plan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDefaults(!showDefaults)}
              className="gap-1.5 text-xs"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Agent Defaults
            </Button>
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
        </div>

        {/* Agent Defaults Panel */}
        {showDefaults && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg font-sans flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Agent Defaults
              </CardTitle>
              <p className="text-xs text-muted-foreground font-sans">
                Set values that auto-fill on every form you generate.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEFAULT_FIELDS.map((df) => (
                  <div key={df.key} className="space-y-1">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{df.label}</Label>
                    <Input
                      value={agentDefaults[df.key] || ""}
                      onChange={(e) =>
                        setAgentDefaults((prev) => ({ ...prev, [df.key]: e.target.value }))
                      }
                      placeholder={df.label}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
              <Button onClick={saveAgentDefaults} disabled={savingDefaults} size="sm" className="mt-2">
                {savingDefaults ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : null}
                Save Defaults
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Gap filling section */}
        {gaps.length > 0 && (
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

        {/* Underwriter Narrative */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-sans flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Underwriter Narrative
            </CardTitle>
            <p className="text-xs text-muted-foreground font-sans">
              Tell the story of this business for the underwriter. Describe operations, risk profile, and why this is a good account.
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g. ABC Plumbing is a 15-year-old residential and light commercial plumbing contractor based in Phoenix, AZ. They employ 9 field technicians and 3 office staff. Revenue has grown 12% YoY with zero claims in the last 3 years…"
              rows={6}
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* Coverage Line Selection → Auto-selects ACORD Forms */}
        <h2 className="text-2xl mb-4">Lines of Coverage</h2>
        <p className="text-muted-foreground font-sans text-sm mb-4">
          Select the coverage lines needed — the correct ACORD forms will be selected automatically.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {COVERAGE_LINES.map((line) => {
            const isActive = selectedCoverageLines.has(line);
            return (
              <button
                key={line}
                type="button"
                onClick={() => {
                  setSelectedCoverageLines((prev) => {
                    const next = new Set(prev);
                    if (next.has(line)) next.delete(line);
                    else next.add(line);
                    // Auto-select forms
                    const formIds = getFormsForCoverageLines(Array.from(next));
                    setSelectedForms(new Set(formIds));
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium border transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/30"
                }`}
              >
                {line}
              </button>
            );
          })}
        </div>

        {/* ACORD Form Selection */}
        <h2 className="text-2xl mb-4">ACORD Forms</h2>
        <p className="text-muted-foreground font-sans text-sm mb-6">
          Auto-selected based on coverage lines above. You can also manually add or remove forms.
        </p>
        <div className="grid gap-3 mb-6">
          {ACORD_FORM_LIST.map((form) => {
            const isSelected = selectedForms.has(form.id);
            return (
              <div
                key={form.id}
                onClick={() => {
                  setSelectedForms((prev) => {
                    const next = new Set(prev);
                    if (next.has(form.id)) next.delete(form.id);
                    else next.add(form.id);
                    return next;
                  });
                }}
                className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-card hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                  <div className="rounded-full bg-primary/10 p-2.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm font-sans">{form.name}</span>
                      <span className="text-xs text-muted-foreground font-sans">— {form.fullName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">
                      {form.fields.length} fields · {form.description.slice(0, 80)}…
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Badge className="bg-primary/10 text-primary text-[10px] border-0">
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {selectedForms.size > 0 && (
          <div className="space-y-4 mb-12">
            <p className="text-sm font-sans text-muted-foreground">
              {selectedForms.size} form{selectedForms.size !== 1 ? "s" : ""} selected
            </p>

            <Button
              className="w-full h-12 gap-2"
              onClick={auditAndDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI Auditing & Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <Download className="h-4 w-4" />
                  AI Audit & Download {selectedForms.size} PDF{selectedForms.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>

            <div className="flex flex-wrap gap-2">
              {ACORD_FORM_LIST.filter((f) => selectedForms.has(f.id)).map((form) => (
                <Link key={form.id} to={`/acord/${form.id}/${submissionId}`}>
                  <Button size="sm" variant="outline" className="gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Edit {form.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
