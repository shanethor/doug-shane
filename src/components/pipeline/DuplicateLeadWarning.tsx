import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DuplicateLeadWarningProps {
  duplicateName: string;
  duplicateId: string;
  onContinue: () => void;
  onCancel: () => void;
}

export function DuplicateLeadWarning({ duplicateName, duplicateId, onContinue, onCancel }: DuplicateLeadWarningProps) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Possible Duplicate Detected</p>
          <p className="text-xs text-muted-foreground mt-1">
            A lead with a similar name already exists: <strong>{duplicateName}</strong>. 
            Do you want to merge or continue creating a new lead?
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={onContinue} className="text-xs">
          Create Anyway
        </Button>
      </div>
    </div>
  );
}
