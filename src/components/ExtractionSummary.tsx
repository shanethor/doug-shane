import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACORD_FORM_LIST, type AcordFormDefinition } from "@/lib/acord-forms";
import { buildAutofilledData } from "@/lib/acord-autofill";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, FileText, ArrowRight, Loader2 } from "lucide-react";

interface FormStat {
  form: AcordFormDefinition;
  filled: number;
  total: number;
  pct: number;
}

interface ExtractionSummaryProps {
  submissionId: string;
  onContinue: () => void;
}

export default function ExtractionSummary({ submissionId, onContinue }: ExtractionSummaryProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<FormStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFilled, setTotalFilled] = useState(0);
  const [totalFields, setTotalFields] = useState(0);

  useEffect(() => {
    if (!user || !submissionId) return;

    const load = async () => {
      // Poll briefly for data (extraction may still be running)
      let attempts = 0;
      let appData: Record<string, any> | null = null;

      while (attempts < 6) {
        const { data } = await supabase
          .from("insurance_applications")
          .select("form_data")
          .eq("submission_id", submissionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.form_data && Object.keys(data.form_data as object).length > 2) {
          appData = data.form_data as Record<string, any>;
          break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (!appData) {
        // No data yet — just continue to form view
        onContinue();
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, phone, form_defaults")
        .eq("user_id", user.id)
        .single();

      const defaults = (profile?.form_defaults || {}) as Record<string, string>;
      const formStats: FormStat[] = [];
      let tFilled = 0;
      let tTotal = 0;

      for (const form of ACORD_FORM_LIST) {
        const filled = buildAutofilledData(form, appData, profile);
        // Apply defaults
        for (const [k, v] of Object.entries(defaults)) {
          if (v && !filled[k]) filled[k] = v;
        }

        const total = form.fields.length;
        const filledCount = form.fields.filter(
          (f) => filled[f.key] && String(filled[f.key]).trim()
        ).length;

        formStats.push({ form, filled: filledCount, total, pct: Math.round((filledCount / total) * 100) });
        tFilled += filledCount;
        tTotal += total;
      }

      // Sort: forms with data first, then by completion %
      formStats.sort((a, b) => (b.filled > 0 ? 1 : 0) - (a.filled > 0 ? 1 : 0) || b.pct - a.pct);

      setStats(formStats);
      setTotalFilled(tFilled);
      setTotalFields(tTotal);
      setLoading(false);
    };

    load();
  }, [user, submissionId]);

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
          AURA extracted <span className="font-semibold text-foreground">{totalFilled}</span> fields
          across <span className="font-semibold text-foreground">{formsWithData.length}</span> ACORD form{formsWithData.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-3">
        {stats.map((s) => {
          const hasData = s.filled > 0;
          return (
            <Card
              key={s.form.id}
              className={`transition-all ${hasData ? "border-primary/30 bg-card" : "opacity-50 bg-muted/30"}`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-4 w-4 ${hasData ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{s.form.name}</span>
                  </div>
                  <span className={`text-sm font-mono ${hasData ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.filled}/{s.total}
                  </span>
                </div>
                <Progress value={s.pct} className="h-2" />
                <p className="text-[11px] text-muted-foreground">{s.form.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button size="lg" onClick={onContinue} className="mt-2 gap-2">
        Continue to Forms <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
