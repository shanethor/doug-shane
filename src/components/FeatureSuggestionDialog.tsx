import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "forms", label: "ACORD Forms & Filling" },
  { value: "extraction", label: "AI Extraction & Data" },
  { value: "pipeline", label: "Pipeline & Leads" },
  { value: "documents", label: "Documents & Downloads" },
  { value: "ui", label: "UI / UX" },
  { value: "general", label: "Other" },
];

export function FeatureSuggestionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [suggestion, setSuggestion] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!suggestion.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("feature_suggestions" as any).insert({
      user_id: user.id,
      suggestion: suggestion.trim(),
      category,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not submit suggestion. Please try again." });
      return;
    }
    setSubmitted(true);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => { setSuggestion(""); setCategory("general"); setSubmitted(false); }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            Suggest a Feature
          </DialogTitle>
          <DialogDescription>
            Have an idea to make AURA better? Tell us what you'd like to see and our team will review it.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <p className="text-sm font-semibold text-foreground">Thank you!</p>
            <p className="text-xs text-muted-foreground">Your suggestion has been sent to the AURA team. We review every idea.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Idea</Label>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Describe the feature you'd like to see..."
                rows={4}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {submitted ? (
            <Button onClick={() => handleClose(false)} className="w-full">Close</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!suggestion.trim() || submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Submitting…" : "Submit Suggestion"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
