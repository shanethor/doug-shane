import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import SubmissionReviewPanel from "@/components/SubmissionReviewPanel";

export default function ApplicationReview() {
  const { submissionId } = useParams();

  if (!submissionId) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl mb-2">No Submission ID</h2>
          <p className="text-muted-foreground font-sans text-sm">Missing submission identifier.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SubmissionReviewPanel submissionId={submissionId} />
    </AppLayout>
  );
}
