import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { ACORD_FORM_LIST } from "@/lib/acord-forms";

type Gap = {
  field: string;
  question: string;
  priority: "required" | "recommended" | "optional";
};

export default function ApplicationReview() {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState<any>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fillingGaps, setFillingGaps] = useState(false);

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
      setGaps((data.gaps as Gap[]) || []);
    }
    setLoading(false);
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

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }

      const result = await response.json();
      setGaps(result.gaps);
      setGapAnswers({});
      setApplication((prev: any) => ({ ...prev, status: result.status, form_data: result.form_data }));
      toast.success("Answers applied!");
    } catch (err: any) {
      console.error("fill-gaps error:", err);
      toast.error("Failed to update application");
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
            <h1 className="text-4xl">Application Overview</h1>
            <p className="text-muted-foreground font-sans text-sm mt-1">
              AI-extracted data from your business plan
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

        {/* ACORD Form Selection */}
        <h2 className="text-2xl mb-4">Fill ACORD Forms</h2>
        <p className="text-muted-foreground font-sans text-sm mb-6">
          Select a form to fill out. Your business plan data will be automatically mapped to the form fields.
        </p>
        <div className="grid gap-3 mb-12">
          {ACORD_FORM_LIST.map((form) => (
            <Link
              key={form.id}
              to={`/acord/${form.id}/${submissionId}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
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
              <Button variant="ghost" size="sm" className="text-xs">
                Fill Form →
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
