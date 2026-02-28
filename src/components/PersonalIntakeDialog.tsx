import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Users, User } from "lucide-react";

interface PersonalIntakeDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (config: { clientEmail: string; teamMemberEmail: string; ccProducer: boolean }) => void;
  isLoading?: boolean;
  producerEmail?: string;
}

export function PersonalIntakeDialog({ open, onClose, onGenerate, isLoading, producerEmail }: PersonalIntakeDialogProps) {
  const [clientEmail, setClientEmail] = useState("");
  const [teamMemberEmail, setTeamMemberEmail] = useState("");
  const [ccProducer, setCcProducer] = useState(true);

  const isValidEmail = (e: string) => /^[\w.-]+@[\w.-]+\.\w+$/.test(e.trim());

  const canSubmit = isValidEmail(clientEmail) && isValidEmail(teamMemberEmail);

  const handleGenerate = () => {
    if (!canSubmit) return;
    onGenerate({ clientEmail: clientEmail.trim(), teamMemberEmail: teamMemberEmail.trim(), ccProducer });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Personal Lines Intake Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client Email */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Client Email
            </Label>
            <Input
              type="email"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">The intake link will be sent to this email.</p>
          </div>

          {/* Team Member Email */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Team Member Email
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={!canSubmit || isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : "Generate & Send Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
