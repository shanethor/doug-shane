import { AlertCircle, CheckCircle, Clock, FileText, Loader2 } from "lucide-react";

export const CLARK_SUBMISSION_STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof FileText;
}> = {
  processing: { label: "Processing", variant: "outline", icon: Loader2 },
  failed: { label: "Failed", variant: "destructive", icon: AlertCircle },
  needs_info: { label: "Needs Info", variant: "destructive", icon: AlertCircle },
  extracted: { label: "Ready", variant: "default", icon: CheckCircle },
  questionnaire_sent: { label: "Awaiting Client", variant: "outline", icon: Clock },
  questionnaire_complete: { label: "Client Done", variant: "default", icon: CheckCircle },
  finalized: { label: "Finalized", variant: "secondary", icon: FileText },
};