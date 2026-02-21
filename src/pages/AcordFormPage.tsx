import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import FormFillingView from "@/components/FormFillingView";

export default function AcordFormPage() {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();

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

  return (
    <AppLayout onLogoClick={handleBack}>
      <div className="animate-slide-in-right">
        <FormFillingView
          submissionId={submissionId || "draft"}
          initialMessages={[]}
          initialFormId={formId}
          onBack={handleBack}
          suppressAutoAnalysis={true}
        />
      </div>
    </AppLayout>
  );
}
