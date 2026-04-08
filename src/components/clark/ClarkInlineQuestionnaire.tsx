import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

interface ClarkInlineQuestionnaireProps {
  submissionId: string;
  missingFields: string[];
  onComplete: (filledData: Record<string, string>) => void;
}

const formatLabel = (field: string) =>
  field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ClarkInlineQuestionnaire({ submissionId, missingFields, onComplete }: ClarkInlineQuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    missingFields.forEach((f) => { init[f] = ""; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: sub } = await supabase
        .from("clark_submissions")
        .select("extracted_data")
        .eq("id", submissionId)
        .single();

      const merged = { ...((sub?.extracted_data as Record<string, any>) || {}), ...answers };
      const { error } = await supabase
        .from("clark_submissions")
        .update({
          extracted_data: merged,
          questionnaire_completed: true,
          status: "questionnaire_complete",
          missing_fields: [],
        })
        .eq("id", submissionId);

      if (error) throw error;
      setDone(true);
      onComplete(answers);
      toast.success("Missing fields filled!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-4 flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          All missing fields have been filled. You can now generate ACORD forms.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Fill Missing Fields ({missingFields.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missingFields.map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field} className="text-xs">{formatLabel(field)}</Label>
                <Input
                  id={field}
                  value={answers[field] || ""}
                  onChange={(e) => setAnswers((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={formatLabel(field)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Save & Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
