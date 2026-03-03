import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  PenLine,
  ExternalLink,
  Trash2,
} from "lucide-react";

const STAGES = ["prospect", "quoting", "presenting", "lost"] as const;
const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  quoting: "Quoting",
  presenting: "Presenting",
  lost: "Lost",
};

interface LeadActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    account_name: string;
    contact_name?: string | null;
    stage: string;
    has_approved_policy?: boolean;
  } | null;
  userId: string;
  onStageMove: (leadId: string, newStage: string) => Promise<void>;
  onSchedule: (leadId: string) => void;
  onDelete: (leadId: string) => void;
  onRefresh: () => void;
}

export function LeadActionSheet({
  open,
  onOpenChange,
  lead,
  userId,
  onStageMove,
  onSchedule,
  onDelete,
  onRefresh,
}: LeadActionSheetProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<"actions" | "move" | "note">("actions");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const currentStage = lead.has_approved_policy ? "sold" : lead.stage;
  const availableStages = [...STAGES, "sold" as const].filter(
    (s) => s !== currentStage
  );

  const handleClose = () => {
    setView("actions");
    setNoteText("");
    onOpenChange(false);
  };

  const handleMove = async (stage: string) => {
    await onStageMove(lead.id, stage);
    handleClose();
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      user_id: userId,
      note_text: noteText.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save note");
    } else {
      toast.success("Note added");
      onRefresh();
      handleClose();
    }
  };

  // Haptic feedback when sheet opens
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); else { triggerHaptic(); onOpenChange(true); } }}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-base font-sans">{lead.account_name}</DrawerTitle>
          {lead.contact_name && (
            <DrawerDescription className="font-sans">{lead.contact_name}</DrawerDescription>
          )}
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-2">
          {view === "actions" && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-sm font-sans"
                onClick={() => setView("move")}
              >
                <ArrowRight className="h-4 w-4 text-primary" />
                Move Stage
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-sm font-sans"
                onClick={() => {
                  onSchedule(lead.id);
                  handleClose();
                }}
              >
                <CalendarDays className="h-4 w-4 text-primary" />
                Schedule Presentation
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-sm font-sans"
                onClick={() => setView("note")}
              >
                <PenLine className="h-4 w-4 text-primary" />
                Add Note
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-sm font-sans"
                onClick={() => {
                  navigate(`/pipeline/${lead.id}`);
                  handleClose();
                }}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                View Workspace
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-sm font-sans text-destructive hover:text-destructive"
                onClick={() => {
                  onDelete(lead.id);
                  handleClose();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete Lead
              </Button>
            </>
          )}

          {view === "move" && (
            <>
              <p className="text-xs text-muted-foreground font-sans mb-2">Move to:</p>
              <div className="grid grid-cols-2 gap-2">
                {availableStages.map((stage) => (
                  <Button
                    key={stage}
                    variant="outline"
                    className="h-12 text-sm font-sans"
                    onClick={() => handleMove(stage)}
                  >
                    {STAGE_LABELS[stage] || "Sold"}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-2 text-sm font-sans"
                onClick={() => setView("actions")}
              >
                Back
              </Button>
            </>
          )}

          {view === "note" && (
            <>
              <Textarea
                placeholder="Add a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[100px] font-sans"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 font-sans"
                  onClick={() => setView("actions")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 font-sans"
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || saving}
                >
                  {saving ? "Saving…" : "Save Note"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
