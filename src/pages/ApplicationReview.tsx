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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, FileText, CheckSquare, Download } from "lucide-react";
import { toast } from "sonner";
import { ACORD_FORMS, ACORD_FORM_LIST } from "@/lib/acord-forms";
import { generateAcordPdf } from "@/lib/pdf-generator";
import { buildAutofilledData } from "@/lib/acord-autofill";

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
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());

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
            <h1 className="text-4xl">Client Application</h1>
            <p className="text-muted-foreground font-sans text-sm mt-1">
              AI-extracted data from the client's business plan
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
        <h2 className="text-2xl mb-4">Select ACORD Forms</h2>
        <p className="text-muted-foreground font-sans text-sm mb-6">
          Choose the forms you need for this client. The extracted data will be automatically mapped to each form.
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

            {/* Batch download all selected forms */}
            <Button
              className="w-full h-12 gap-2"
              onClick={async () => {
                if (!user || !application) return;
                const aiData = (application.form_data || {}) as Record<string, any>;
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, agency_name, phone")
                  .eq("user_id", user.id)
                  .single();

                const selected = ACORD_FORM_LIST.filter((f) => selectedForms.has(f.id));
                for (const form of selected) {
                  const filled = buildAutofilledData(form, aiData, profile);
                  const pdf = generateAcordPdf(form, filled);
                  pdf.save(`${form.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
                }
                toast.success(`Downloaded ${selected.length} PDF${selected.length !== 1 ? "s" : ""}!`);
              }}
            >
              <Download className="h-4 w-4" />
              Download All {selectedForms.size} PDFs (Pre-filled)
            </Button>

            {/* Individual form links */}
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
