import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function ClarkQuestionnaire() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    supabase
      .from("clark_submissions")
      .select("*")
      .eq("questionnaire_token", token)
      .eq("questionnaire_completed", false)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Invalid or expired questionnaire link.");
        } else {
          setSubmission(data);
          // Pre-fill answers with empty strings
          const missing = (data.missing_fields as string[]) || [];
          const initial: Record<string, string> = {};
          missing.forEach(f => { initial[f] = ""; });
          setAnswers(initial);
        }
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;
    setSubmitting(true);
    try {
      // Merge answers into extracted_data
      const merged = { ...(submission.extracted_data || {}), ...answers };
      const { error } = await supabase
        .from("clark_submissions")
        .update({
          extracted_data: merged,
          questionnaire_completed: true,
          status: "questionnaire_complete",
          missing_fields: [],
        })
        .eq("id", submission.id);

      if (error) throw error;
      setSubmitted(true);
      toast.success("Thank you! Your responses have been submitted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Responses Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your insurance agent will use this information to complete your application. You can close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <h2 className="text-xl font-semibold">Link Not Found</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This questionnaire link is invalid or has already been completed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const missingFields = (submission.missing_fields as string[]) || [];
  const formatLabel = (field: string) =>
    field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Application</CardTitle>
            <CardDescription>
              {submission.business_name ? `For ${submission.business_name} — ` : ""}
              Your insurance agent needs a few more details to finish your submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {missingFields.map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>{formatLabel(field)}</Label>
                  <Input
                    id={field}
                    value={answers[field] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={`Enter ${formatLabel(field).toLowerCase()}`}
                  />
                </div>
              ))}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Responses"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
