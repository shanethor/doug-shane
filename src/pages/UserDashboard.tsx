import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePlus, FileText, MoreVertical, Copy, Pencil, Trash2, Search, Edit3, ArrowRight } from "lucide-react";
import { ClientDocuments } from "@/components/ClientDocuments";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-primary/10 text-primary",
  extracted: "bg-accent/20 text-accent-foreground",
  complete: "bg-success/20 text-success",
};

const stageLabel: Record<string, string> = {
  prospect: "Prospect",
  quoting: "Quoting",
  presenting: "Presenting",
  lost: "Lost",
};

const stageColor: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  quoting: "bg-primary/10 text-primary",
  presenting: "bg-accent/20 text-accent-foreground",
  lost: "bg-destructive/10 text-destructive",
};

type LeadInfo = {
  id: string;
  stage: string;
  account_name: string;
  submission_id: string | null;
};

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<LeadInfo[]>([]);
  const [soldLeadIds, setSoldLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [subRes, leadRes] = await Promise.all([
      supabase
        .from("business_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, stage, account_name, submission_id")
        .eq("owner_user_id", user.id),
    ]);
    setSubmissions(subRes.data ?? []);
    const leadsData = (leadRes.data ?? []) as LeadInfo[];
    setLeads(leadsData);

    // Check which leads have approved policies (= Sold)
    if (leadsData.length > 0) {
      const { data: policies } = await supabase
        .from("policies")
        .select("lead_id")
        .in("lead_id", leadsData.map(l => l.id))
        .eq("status", "approved");
      setSoldLeadIds(new Set((policies ?? []).map(p => p.lead_id)));
    }

    setLoading(false);
  };

  const getLeadForSubmission = (submissionId: string): LeadInfo | undefined => {
    return leads.find(l => l.submission_id === submissionId);
  };

  const getPipelineStage = (lead: LeadInfo): { label: string; colorClass: string } => {
    if (soldLeadIds.has(lead.id)) {
      return { label: "Sold", colorClass: "bg-green-500/10 text-green-600" };
    }
    return {
      label: stageLabel[lead.stage] || lead.stage,
      colorClass: stageColor[lead.stage] || "bg-muted text-muted-foreground",
    };
  };

  const duplicateSubmission = async (submission: any) => {
    if (!user) return;
    try {
      const { data: newSub, error: subError } = await supabase
        .from("business_submissions")
        .insert({
          user_id: user.id,
          company_name: `${submission.company_name || "Untitled"} (Copy)`,
          description: submission.description,
          file_urls: submission.file_urls,
          status: submission.status,
          narrative: submission.narrative,
          coverage_lines: submission.coverage_lines,
        })
        .select()
        .single();

      if (subError) throw subError;

      // 2. Duplicate the associated application data
      const { data: appData } = await supabase
        .from("insurance_applications")
        .select("*")
        .eq("submission_id", submission.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (appData) {
        await supabase.from("insurance_applications").insert({
          user_id: user.id,
          submission_id: newSub.id,
          form_data: appData.form_data,
          gaps: appData.gaps,
          status: appData.status,
        });
      }

      toast.success("Account duplicated!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate");
    }
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase
      .from("business_submissions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Submission deleted");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const renameSubmission = async (id: string, currentName: string) => {
    const newName = prompt("Rename client:", currentName || "");
    if (!newName || newName === currentName) return;
    const { error } = await supabase
      .from("business_submissions")
      .update({ company_name: newName })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) toast.error("Failed to rename");
    else {
      toast.success("Renamed!");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, company_name: newName } : s))
      );
    }
  };

  const filtered = submissions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.company_name || "").toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-4xl">My Clients</h1>
          <p className="text-muted-foreground font-sans text-sm mt-1">
            {submissions.length} account{submissions.length !== 1 ? "s" : ""} — save, duplicate, and manage submissions.
          </p>
        </div>
        <Link to="/submit-plan">
          <Button size="sm" className="gap-2">
            <FilePlus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      {submissions.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="pl-9 h-10"
          />
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl mb-1">No clients yet</h3>
          <p className="text-muted-foreground text-sm font-sans mb-4">
            Submit a client's business plan to start prefilling their ACORD applications.
          </p>
          <Link to="/submit-plan">
            <Button size="sm">Add New Client</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <Link
                to={`/application/${s.id}`}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-sm font-sans truncate">
                    {s.company_name || "Untitled Submission"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider font-sans ${statusColor[s.status] || ""}`}
                  >
                    {s.status}
                  </Badge>
                  {(() => {
                    const lead = getLeadForSubmission(s.id);
                    if (!lead) return null;
                    const stage = getPipelineStage(lead);
                    return (
                      <Link to={`/lead/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${stage.colorClass}`}>
                          <ArrowRight className="h-2.5 w-2.5 mr-1" />
                          {stage.label}
                        </Badge>
                      </Link>
                    );
                  })()}
                  <ClientDocuments submissionId={s.id} compact />
                  {s.coverage_lines && (s.coverage_lines as string[]).length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-sans">
                      {(s.coverage_lines as string[]).join(", ")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {new Date(s.created_at).toLocaleDateString()}
                  {s.description && ` · ${s.description.slice(0, 60)}…`}
                </p>
              </Link>

              <div className="flex items-center gap-1 ml-4">
                <Link to={`/acord/acord-125/${s.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />
                    Workspace
                  </Button>
                </Link>
                <Link to={`/application/${s.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    {s.status === "extracted" || s.status === "complete" ? "Review" : "View"}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicateSubmission(s)} className="gap-2">
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => renameSubmission(s.id, s.company_name)} className="gap-2">
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteSubmission(s.id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {filtered.length === 0 && search && (
            <p className="text-center text-sm text-muted-foreground py-8 font-sans">
              No clients matching "{search}"
            </p>
          )}
        </div>
      )}
    </AppLayout>
  );
}
