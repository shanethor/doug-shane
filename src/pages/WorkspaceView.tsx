import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import FormFillingView from "@/components/FormFillingView";

export default function WorkspaceView() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  if (!submissionId) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No submission ID provided.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout onLogoClick={() => navigate("/clients")}>
      <FormFillingView
        submissionId={submissionId}
        initialMessages={[]}
        onBack={() => navigate("/clients")}
      />
    </AppLayout>
  );
}
