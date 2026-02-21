import { Badge } from "@/components/ui/badge";

type LossRunStatus = "not_requested" | "requested" | "sent" | "partial_received" | "complete_received" | "not_needed";

const STATUS_CONFIG: Record<LossRunStatus, { label: string; color: string; short: string }> = {
  not_requested: { label: "Not Requested", short: "LR", color: "bg-muted text-muted-foreground" },
  requested: { label: "Requested", short: "LR", color: "bg-warning/20 text-warning" },
  sent: { label: "Sent", short: "LR", color: "bg-primary/10 text-primary" },
  partial_received: { label: "Partial", short: "LR", color: "bg-accent/20 text-accent-foreground" },
  complete_received: { label: "Complete", short: "✓ LR", color: "bg-success/20 text-success" },
  not_needed: { label: "N/A", short: "—", color: "bg-muted/50 text-muted-foreground" },
};

interface LossRunBadgeProps {
  status: string | null;
  compact?: boolean;
}

export function LossRunBadge({ status, compact = true }: LossRunBadgeProps) {
  const s = (status as LossRunStatus) || "not_requested";
  const config = STATUS_CONFIG[s] || STATUS_CONFIG.not_requested;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-semibold font-sans uppercase tracking-wider ${config.color}`}
        title={`Loss Runs: ${config.label}`}
      >
        {config.short}
      </span>
    );
  }

  return (
    <Badge className={`${config.color} text-[10px] uppercase tracking-wider font-sans border-0`}>
      {config.label}
    </Badge>
  );
}
