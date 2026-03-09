import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Users, User, Link2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PersonalIntakeDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (config: { clientEmail: string; teamMemberEmail: string; ccAdvisor: boolean }) => void;
  isLoading?: boolean;
  advisorEmail?: string;
  generatedLink?: string | null;
}

export function PersonalIntakeDialog({ open, onClose, onGenerate, isLoading, advisorEmail, generatedLink }: PersonalIntakeDialogProps) {
  const [clientEmail, setClientEmail] = useState("");
  const [teamMemberEmail, setTeamMemberEmail] = useState("");
  const [ccAdvisor, setCcAdvisor] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const isValidEmail = (e: string) => /^[\w.-]+@[\w.-]+\.\w+$/.test(e.trim());

  const canSubmit = true; // both emails are now optional
  const canSendEmail = isValidEmail(clientEmail) && isValidEmail(teamMemberEmail);

  const handleGenerate = () => {
    if (!canSubmit) return;
    onGenerate({ clientEmail: clientEmail.trim(), teamMemberEmail: teamMemberEmail.trim(), ccAdvisor });
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: "Link copied!", description: "Intake link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Please copy the link manually." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Client Intake Link
          </DialogTitle>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Your intake link has been generated. Copy the link below or close this dialog.</p>
            <div className="flex items-center gap-2">
              <Input value={generatedLink} readOnly className="text-xs" />
              <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Client Email */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Client Email <span className="text-muted-foreground text-[10px] font-normal">(optional)</span>
              </Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">If provided, the intake link will be emailed to the client.</p>
            </div>

            {/* Team Member Email */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Team Member Email <span className="text-muted-foreground text-[10px] font-normal">(optional)</span>
              </Label>
              <Input
                type="email"
                placeholder="team@youragency.com"
                value={teamMemberEmail}
                onChange={(e) => setTeamMemberEmail(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Client info will be delivered here on submission.</p>
            </div>

            {/* CC Producer Toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={ccProducer}
                onCheckedChange={(v) => setCcProducer(!!v)}
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Also send to me</span>
                <p className="text-[11px] text-muted-foreground">
                  CC {producerEmail || "your email"} when client submits
                </p>
              </div>
            </label>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {generatedLink ? "Close" : "Cancel"}
          </Button>
          {!generatedLink && (
            <Button onClick={handleGenerate} disabled={!canSubmit || isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
              ) : canSendEmail ? (
                "Generate & Send Link"
              ) : (
                "Generate Link"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
