import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Clock, CheckCircle, AlertCircle, Plus, Download } from "lucide-react";

interface Submission {
  id: string;
  client_name: string | null;
  business_name: string | null;
  status: string;
  acord_forms: string[] | null;
  carriers: string[] | null;
  created_at: string;
  final_zip_url: string | null;
  missing_fields: any;
}

interface ClarkSubmissionsPanelProps {
  activeSubmissionId?: string;
  onSelect: (id: string) => void;
  onNewSubmission: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  needs_info: { label: "Needs Info", variant: "destructive", icon: AlertCircle },
  extracted: { label: "Ready", variant: "default", icon: CheckCircle },
  questionnaire_sent: { label: "Awaiting Client", variant: "outline", icon: Clock },
  questionnaire_complete: { label: "Client Done", variant: "default", icon: CheckCircle },
  finalized: { label: "Finalized", variant: "secondary", icon: FileText },
};

export default function ClarkSubmissionsPanel({ activeSubmissionId, onSelect, onNewSubmission }: ClarkSubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clark_submissions")
      .select("id, client_name, business_name, status, acord_forms, carriers, created_at, final_zip_url, missing_fields")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setSubmissions((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadSubmissions(); }, []);

  const getStatus = (s: string) => STATUS_CONFIG[s] || { label: s, variant: "outline" as const, icon: FileText };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Submissions</h3>
        <Button size="sm" variant="ghost" onClick={onNewSubmission} className="gap-1 h-7 text-xs">
          <Plus className="h-3 w-3" /> New
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">No submissions yet. Upload documents to get started.</div>
        ) : (
          <div className="space-y-1 p-2">
            {submissions.map((sub) => {
              const st = getStatus(sub.status);
              const Icon = st.icon;
              const isActive = sub.id === activeSubmissionId;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSelect(sub.id)}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {sub.business_name || sub.client_name || "Untitled"}
                    </span>
                    <Badge variant={st.variant} className="text-[10px] h-5 shrink-0">
                      <Icon className="h-2.5 w-2.5 mr-1" />
                      {st.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                    {sub.final_zip_url && (
                      <Download
                        className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); window.open(sub.final_zip_url!, "_blank"); }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
