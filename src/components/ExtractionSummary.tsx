import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACORD_FORM_LIST, type AcordFormDefinition } from "@/lib/acord-forms";
import { buildAutofilledDataWithAI } from "@/lib/acord-autofill";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, FileText, ArrowRight, Loader2, Sparkles, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface FormStat {
  form: AcordFormDefinition;
  filled: number;
  total: number;
  pct: number;
}

interface ExtractionSummaryProps {
  submissionId: string;
  requestedFormIds?: string[];
  onContinue: (formId?: string) => void;
  onFormsChanged?: (formIds: string[]) => void;
}

export default function ExtractionSummary({ submissionId, requestedFormIds = [], onContinue, onFormsChanged }: ExtractionSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<FormStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filling, setFilling] = useState(false);
  const [totalFilled, setTotalFilled] = useState(0);
  const [totalFields, setTotalFields] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAddForms, setSelectedAddForms] = useState<Set<string>>(new Set());

  // Determine which forms to process
  const scopedForms = requestedFormIds.length > 0
    ? ACORD_FORM_LIST.filter(f => requestedFormIds.includes(f.id))
    : ACORD_FORM_LIST;

  const computeStats = async (appData: Record<string, any>, appIdParam?: string) => {
    const idToUse = appIdParam || applicationId;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, agency_name, phone, form_defaults")
      .eq("user_id", user!.id)
      .single();

    const defaults = (profile?.form_defaults || {}) as Record<string, string>;

    // Helper: check if a value is meaningful (not empty, not "N/A", not just "false"/"0")
    const isMeaningful = (v: any): boolean => {
      if (v === undefined || v === null) return false;
      const s = String(v).trim();
      return s !== "" && s !== "N/A" && s !== "n/a" && s !== "[]";
    };

    // Run AI field mapping for all forms in PARALLEL (not sequentially) — major speed gain
    const results = await Promise.all(
      scopedForms.map(async (form) => {
        const { data: filled } = await buildAutofilledDataWithAI(form, appData, profile, defaults);
        for (const [k, v] of Object.entries(defaults)) {
          if (v && !filled[k]) filled[k] = v;
        }
        // Apply form-definition defaults (e.g. Y/N → "No") for fields with no value yet
        for (const field of form.fields) {
          if (field.default && !isMeaningful(filled[field.key])) {
            filled[field.key] = field.default;
          }
        }
        const total = form.fields.length;
        // Only count fields with meaningful data (exclude N/A)
        const filledCount = form.fields.filter(
          (f) => isMeaningful(filled[f.key])
        ).length;
        return { form, filled, total, filledCount, pct: Math.round((filledCount / total) * 100) };
      })
    );

    const mergedAllForms: Record<string, any> = {};
    const formStats: FormStat[] = [];
    let tFilled = 0;
    let tTotal = 0;

    for (const { form, filled, total, filledCount, pct } of results) {
      // Only merge meaningful values — never overwrite existing data with "N/A"
      for (const [k, v] of Object.entries(filled)) {
        if (isMeaningful(v)) {
          mergedAllForms[k] = v;
        }
      }
      formStats.push({ form, filled: filledCount, total, pct });
      tFilled += filledCount;
      tTotal += total;
    }

    // Persist AI-inferred data back to DB so FormFillingView doesn't re-run inference
    if (idToUse && Object.keys(mergedAllForms).length > 0) {
      const { data: existing } = await supabase
        .from("insurance_applications")
        .select("form_data")
        .eq("id", idToUse)
        .single();
      const existingData = (existing?.form_data || {}) as Record<string, any>;
      // Merge: existing real data takes priority over AI-mapped data
      // AI-mapped data only fills gaps (keys not yet in existingData)
      const updatedData = { ...existingData };
      for (const [k, v] of Object.entries(mergedAllForms)) {
        // Only set if existing value is empty/missing/N/A
        if (!isMeaningful(updatedData[k])) {
          updatedData[k] = v;
        }
      }
      await supabase
        .from("insurance_applications")
        .update({ form_data: updatedData })
        .eq("id", idToUse);
    }

    formStats.sort((a, b) => (b.filled > 0 ? 1 : 0) - (a.filled > 0 ? 1 : 0) || b.pct - a.pct);
    setStats(formStats);
    setTotalFilled(tFilled);
    setTotalFields(tTotal);
  };

  useEffect(() => {
    if (!user || !submissionId) return;

    const load = async () => {
      let attempts = 0;
      let appData: Record<string, any> | null = null;
      let appId: string | null = null;

      while (attempts < 6) {
        const { data } = await supabase
          .from("insurance_applications")
          .select("id, form_data")
          .eq("submission_id", submissionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.form_data && Object.keys(data.form_data as object).length > 2) {
          appData = data.form_data as Record<string, any>;
          appId = data.id;
          break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (!appData) {
        onContinue();
        return;
      }

      setApplicationId(appId);
      await computeStats(appData, appId);
      setLoading(false);
    };

    load();
  }, [user, submissionId, requestedFormIds.join(",")]);

  const handleFillGaps = async () => {
    if (!applicationId) return;
    setFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("fill-gaps", {
        body: { application_id: applicationId, answers: {} },
      });
      if (error) throw error;
      if (data?.form_data) {
        await computeStats(data.form_data);
        toast({ title: "Gaps filled", description: "AURA inferred additional field values." });
      }
    } catch (err) {
      console.error("Fill gaps error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to fill gaps. Please try again." });
    } finally {
      setFilling(false);
    }
  };

  const handleAddForms = async () => {
    if (selectedAddForms.size === 0) return;
    const newIds = [...requestedFormIds, ...Array.from(selectedAddForms)];
    onFormsChanged?.(newIds);
    setShowAddForm(false);
    setSelectedAddForms(new Set());
    toast({ title: "Forms added", description: `${selectedAddForms.size} form(s) added to your package.` });

    // Re-run stats computation immediately for the new forms using cached app data
    if (applicationId) {
      const { data } = await supabase
        .from("insurance_applications")
        .select("form_data")
        .eq("id", applicationId)
        .single();
      if (data?.form_data) {
        // Temporarily override scopedForms by computing stats with new IDs
        const newScopedForms = ACORD_FORM_LIST.filter(f => newIds.includes(f.id));
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, agency_name, phone, form_defaults")
          .eq("user_id", user!.id)
          .single();
        const defaults = (profile?.form_defaults || {}) as Record<string, string>;
        const appData = data.form_data as Record<string, any>;

        const isMeaningful = (v: any): boolean => {
          if (v === undefined || v === null) return false;
          const s = String(v).trim();
          return s !== "" && s !== "N/A" && s !== "n/a" && s !== "[]";
        };

        const results = await Promise.all(
          newScopedForms.map(async (form) => {
            const { data: filled } = await buildAutofilledDataWithAI(form, appData, profile, defaults);
            for (const [k, v] of Object.entries(defaults)) {
              if (v && !filled[k]) filled[k] = v;
            }
            for (const field of form.fields) {
              if (field.default && !isMeaningful(filled[field.key])) {
                filled[field.key] = field.default;
              }
            }
            const total = form.fields.length;
            const filledCount = form.fields.filter((f) => isMeaningful(filled[f.key])).length;
            return { form, filled: filledCount, total, pct: Math.round((filledCount / total) * 100) };
          })
        );

        const formStats: FormStat[] = results.map(r => ({ form: r.form, filled: r.filled, total: r.total, pct: r.pct }));
        formStats.sort((a, b) => (b.filled > 0 ? 1 : 0) - (a.filled > 0 ? 1 : 0) || b.pct - a.pct);
        setStats(formStats);
        let tFilled = 0, tTotal = 0;
        for (const s of formStats) { tFilled += s.filled; tTotal += s.total; }
        setTotalFilled(tFilled);
        setTotalFields(tTotal);
      }
    }
  };

  const availableToAdd = ACORD_FORM_LIST.filter(f => !requestedFormIds.includes(f.id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-page-enter">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Extracting data from your conversation…</p>
      </div>
    );
  }

  const formsWithData = stats.filter((s) => s.filled > 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-8 animate-page-enter">
      <div className="text-center space-y-2">
        <CheckCircle className="h-10 w-10 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold tracking-tight">Extraction Complete</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          AURA extracted <span className="font-semibold text-foreground">{totalFilled}</span> of{" "}
          <span className="font-semibold text-foreground">{totalFields}</span> fields
          across <span className="font-semibold text-foreground">{scopedForms.length}</span> requested form{scopedForms.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-3">
        {stats.map((s) => {
          const hasData = s.filled > 0;
          return (
            <Card
              key={s.form.id}
              onClick={() => hasData && onContinue(s.form.id)}
              className={`transition-all ${hasData ? "border-primary/30 bg-card cursor-pointer hover:border-primary/60 hover:shadow-md" : "opacity-50 bg-muted/30"}`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-4 w-4 ${hasData ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{s.form.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono ${hasData ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.filled}/{s.total}
                    </span>
                    {hasData && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <Progress value={s.pct} className="h-2" />
                <p className="text-[11px] text-muted-foreground">{s.form.description}</p>
              </CardContent>
            </Card>
          );
        })}

        {/* Add Form button */}
        {availableToAdd.length > 0 && (
          <Card
            onClick={() => setShowAddForm(true)}
            className="border-dashed border-muted-foreground/30 bg-transparent cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all"
          >
            <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add another form</span>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <Button
          size="lg"
          variant="outline"
          onClick={handleFillGaps}
          disabled={filling}
          className="gap-2"
        >
          {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {filling ? "Filling gaps…" : "Fill Remaining Gaps"}
        </Button>
        <Button size="lg" onClick={() => onContinue()} className="gap-2">
          Continue to Forms <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Add Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add ACORD Forms</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {availableToAdd.map((f) => (
              <label key={f.id} className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                <Checkbox
                  checked={selectedAddForms.has(f.id)}
                  onCheckedChange={(checked) => {
                    setSelectedAddForms((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(f.id);
                      else next.delete(f.id);
                      return next;
                    });
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddForms} disabled={selectedAddForms.size === 0}>
              Add {selectedAddForms.size > 0 ? `${selectedAddForms.size} form(s)` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
