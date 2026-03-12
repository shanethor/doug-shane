import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail, GitBranch, FileText, ClipboardList, Shield, CheckCircle,
  Clock, XCircle, MessageSquare, Send, Upload
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface TimelineEvent {
  id: string;
  type: "email" | "pipeline" | "document" | "policy" | "intake" | "note" | "submission";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  email: { icon: Mail, color: "text-blue-400", label: "Email" },
  pipeline: { icon: GitBranch, color: "text-accent", label: "Pipeline" },
  document: { icon: FileText, color: "text-primary", label: "Document" },
  policy: { icon: Shield, color: "text-emerald-400", label: "Policy" },
  intake: { icon: ClipboardList, color: "text-amber-400", label: "Intake" },
  note: { icon: MessageSquare, color: "text-muted-foreground", label: "Note" },
  submission: { icon: Upload, color: "text-violet-400", label: "Submission" },
};

export function ClientCorrespondenceHistory({ leadId }: { leadId: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !leadId) return;

    const fetchAll = async () => {
      setLoading(true);
      const timeline: TimelineEvent[] = [];

      // 1. Emails linked to this client
      const { data: emails } = await supabase
        .from("synced_emails")
        .select("id, subject, from_name, from_address, received_at, is_read")
        .eq("user_id", user.id)
        .eq("client_id", leadId)
        .order("received_at", { ascending: false })
        .limit(100);

      for (const e of emails || []) {
        timeline.push({
          id: `email-${e.id}`,
          type: "email",
          title: e.subject || "(no subject)",
          description: `From: ${e.from_name || e.from_address}`,
          timestamp: e.received_at,
        });
      }

      // 2. Audit log events for this lead (pipeline moves, policy actions)
      const { data: auditLogs } = await supabase
        .from("audit_log")
        .select("id, action, metadata, created_at")
        .eq("object_id", leadId)
        .eq("object_type", "lead")
        .order("created_at", { ascending: false })
        .limit(100);

      for (const log of auditLogs || []) {
        const meta = log.metadata as any;
        let title = log.action;
        if (log.action === "stage_move") {
          title = `Pipeline moved to ${meta?.new_stage || "unknown"}`;
        } else {
          title = log.action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
        timeline.push({
          id: `audit-${log.id}`,
          type: "pipeline",
          title,
          timestamp: log.created_at,
          metadata: meta,
        });
      }

      // 3. Policies
      const { data: policies } = await supabase
        .from("policies")
        .select("id, carrier, line_of_business, policy_number, status, annual_premium, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      for (const p of policies || []) {
        timeline.push({
          id: `policy-${p.id}`,
          type: "policy",
          title: `${p.carrier} — ${p.line_of_business}`,
          description: `#${p.policy_number} · $${Number(p.annual_premium).toLocaleString()} · ${p.status}`,
          timestamp: p.created_at,
        });
      }

      // 4. Documents
      const { data: docs } = await supabase
        .from("client_documents")
        .select("id, file_name, document_type, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      for (const d of docs || []) {
        timeline.push({
          id: `doc-${d.id}`,
          type: "document",
          title: d.file_name,
          description: d.document_type,
          timestamp: d.created_at,
        });
      }

      // 5. Business submissions
      const { data: subs } = await supabase
        .from("business_submissions")
        .select("id, company_name, status, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      for (const s of subs || []) {
        timeline.push({
          id: `sub-${s.id}`,
          type: "submission",
          title: s.company_name || "Submission",
          description: `Status: ${s.status}`,
          timestamp: s.created_at,
        });
      }

      // 6. Notes
      const { data: notes } = await supabase
        .from("lead_notes")
        .select("id, note_text, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(50);

      for (const n of notes || []) {
        timeline.push({
          id: `note-${n.id}`,
          type: "note",
          title: n.note_text.length > 80 ? n.note_text.slice(0, 80) + "…" : n.note_text,
          timestamp: n.created_at,
        });
      }

      // 7. Intake links
      const { data: intakes } = await supabase
        .from("intake_links")
        .select("id, customer_name, customer_email, line_type, is_used, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      for (const il of intakes || []) {
        timeline.push({
          id: `intake-${il.id}`,
          type: "intake",
          title: `Intake sent${il.customer_name ? ` to ${il.customer_name}` : ""}`,
          description: `${il.line_type || "General"} · ${il.is_used ? "Completed" : "Pending"}`,
          timestamp: il.created_at,
        });
      }

      // Sort all by timestamp descending
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(timeline);
      setLoading(false);
    };

    fetchAll();
  }, [user, leadId]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-sans">No correspondence history yet</p>
        <p className="text-xs mt-1">Emails, pipeline changes, documents, and intake forms will appear here.</p>
      </div>
    );
  }

  // Group events by date
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const ev of events) {
    const dateKey = format(parseISO(ev.timestamp), "MMM d, yyyy");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(ev);
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-6 py-2">
        {Object.entries(grouped).map(([dateLabel, dayEvents]) => (
          <div key={dateLabel}>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{dateLabel}</p>
            </div>
            <div className="space-y-1 mt-1">
              {dayEvents.map((ev) => {
                const config = TYPE_CONFIG[ev.type] || TYPE_CONFIG.note;
                const Icon = config.icon;
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{ev.title}</span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                      {ev.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ev.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {format(parseISO(ev.timestamp), "h:mm a")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
