import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail, Phone, MapPin, DollarSign, CalendarClock, Zap,
  ArrowUpRight, Target, MoreHorizontal, Trash2, Edit2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import type { EngineLead } from "@/hooks/useLeadEngine";

function ScoreChip({ score }: { score: number }) {
  const color = score >= 80
    ? "bg-destructive/15 text-destructive"
    : score >= 50
    ? "bg-amber-500/15 text-amber-600"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Target className="h-3 w-3" />
      {score}
    </span>
  );
}

type LeadCardProps = {
  lead: EngineLead;
  onAction: (lead: EngineLead, actionType: string) => void;
  onDelete?: (lead: EngineLead) => void;
  onEdit?: (lead: EngineLead) => void;
  compact?: boolean;
};

export function LeadCard({ lead, onAction, onDelete, onEdit, compact }: LeadCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`${compact ? "text-xs" : "text-sm"} font-semibold group-hover:text-primary transition-colors`}>
                {lead.company}
              </h4>
              <ScoreChip score={lead.score} />
              <Badge variant="outline" className="text-[9px]">{lead.status}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {lead.state && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{lead.state}
                </span>
              )}
              {lead.industry && (
                <>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{lead.industry}</span>
                </>
              )}
              {lead.est_premium > 0 && (
                <>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />${(lead.est_premium / 1000).toFixed(0)}K est.
                  </span>
                </>
              )}
              {lead.contact_name && (
                <>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{lead.contact_name}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {lead.email && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAction(lead, "email")}>
                <Mail className="h-3.5 w-3.5" />
              </Button>
            )}
            {lead.phone && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAction(lead, "call")}>
                <Phone className="h-3.5 w-3.5" />
              </Button>
            )}
            {lead.status !== "converted" && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => onAction(lead, "convert")}>
                <ArrowUpRight className="h-3 w-3" />
                {lead.source_url ? "View Post" : "Search"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(lead)}>
                    <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit Lead
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onAction(lead, "dismiss")}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {lead.signal && (
          <div className="rounded-md bg-muted/50 px-3 py-2 mb-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{lead.source}:</span> {lead.signal}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            Detected {formatDistanceToNow(new Date(lead.detected_at), { addSuffix: true })}
          </span>
          {lead.assigned_to && (
            <span className="text-muted-foreground">
              Assigned: <span className="font-medium text-foreground">{lead.assigned_to}</span>
            </span>
          )}
        </div>
        {lead.action && (
          <div className="mt-2 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] font-medium text-amber-600">{lead.action}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
