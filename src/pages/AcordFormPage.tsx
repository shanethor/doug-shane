import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import FormFillingView from "@/components/FormFillingView";

import { getFormsForCoverageLines } from "@/lib/coverage-form-map";
import { Loader2 } from "lucide-react";

export default function AcordFormPage() {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [resolvedFormIds, setResolvedFormIds] = useState<string[]>([]);
  const [activeFormId, setActiveFormId] = useState(formId || "acord-125");

  // Load coverage lines from submission to determine which forms to show
  useEffect(() => {
    if (!submissionId || submissionId === "draft") {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Check if there's an insurance_application with form_data
        const { data: app } = await supabase
          .from("insurance_applications")
          .select("form_data")
          .eq("submission_id", submissionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get coverage lines from the submission
        const { data: sub } = await supabase
          .from("business_submissions")
          .select("coverage_lines")
          .eq("id", submissionId)
          .maybeSingle();

        const coverageLines = (sub?.coverage_lines || []) as string[];
        const formIds = coverageLines.length > 0
          ? getFormsForCoverageLines(coverageLines)
          : [formId || "acord-125"];

        setResolvedFormIds(formIds);
        if (formIds.length > 0 && !formIds.includes(activeFormId)) {
          setActiveFormId(formIds[0]);
        }

        // If we have form_data with meaningful content, show ExtractionSummary first
        const hasData = app?.form_data && typeof app.form_data === "object" &&
          Object.keys(app.form_data as object).length > 3;

        if (hasData) {
          setShowSummary(true);
        }
      } catch (err) {
        console.error("[AcordFormPage] Error loading submission data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [submissionId, formId]);

  if (!formId) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl mb-2">Form Not Found</h2>
          <p className="text-muted-foreground font-sans text-sm">Invalid form ID.</p>
        </div>
      </AppLayout>
    );
  }

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Show ExtractionSummary gate so AI-inferred data gets persisted
  if (showSummary && submissionId && submissionId !== "draft") {
    return (
      <AppLayout onLogoClick={handleBack}>
        <ExtractionSummary
          submissionId={submissionId}
          requestedFormIds={resolvedFormIds}
          onContinue={(selectedFormId) => {
            if (selectedFormId) setActiveFormId(selectedFormId);
            setShowSummary(false);
          }}
          onFormsChanged={(ids) => setResolvedFormIds(ids)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout onLogoClick={handleBack}>
      <div className="animate-slide-in-right">
        <FormFillingView
          submissionId={submissionId || "draft"}
          initialMessages={[]}
          initialFormId={activeFormId}
          initialFormIds={resolvedFormIds.length > 0 ? resolvedFormIds : undefined}
          onBack={handleBack}
          suppressAutoAnalysis={true}
        />
      </div>
    </AppLayout>
  );
}
