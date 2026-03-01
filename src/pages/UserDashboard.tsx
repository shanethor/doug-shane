import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePlus, FileText, MoreVertical, Copy, Pencil, Trash2, Search, Edit3, ArrowRight, Plus } from "lucide-react";
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

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "status";

const PAGE_SIZE = 20;

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<LeadInfo[]>([]);
  const [soldLeadIds, setSoldLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [subRes, leadRes, policyRes] = await Promise.all([
      supabase
        .from("business_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, stage, account_name, submission_id")
        .eq("owner_user_id", user.id),
      supabase
        .from("policies")
        .select("lead_id")
        .eq("producer_user_id", user.id)
        .eq("status", "approved"),
    ]);

    if (!mountedRef.current) return;

    setSubmissions(subRes.data ?? []);
    const leadsData = (leadRes.data ?? []) as LeadInfo[];
    setLeads(leadsData);

    // Filter policies to only relevant leads
    const leadIdSet = new Set(leadsData.map(l => l.id));
    const relevantPolicies = (policyRes.data ?? []).filter(p => leadIdSet.has(p.lead_id));
    setSoldLeadIds(new Set(relevantPolicies.map(p => p.lead_id)));

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

  /** Add a new policy/submission to an existing client (linked to same lead) */
  const addPolicyToClient = async (submission: any) => {
    if (!user) return;
    const lead = getLeadForSubmission(submission.id);
    const leadId = lead?.id || null;
    const companyName = submission.company_name || "Untitled";

    try {
      const { data: newSub, error } = await supabase
        .from("business_submissions")
        .insert({
          user_id: user.id,
          company_name: companyName,
          description: `Additional policy for ${companyName}`,
          status: "pending",
          ...(leadId ? { lead_id: leadId } : {}),
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("New policy created — opening workspace");
      navigate(`/acord/acord-125/${newSub.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create policy");
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

  // Reset visible count when search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  const filtered = submissions
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (s.company_name || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc": return (a.company_name || "").localeCompare(b.company_name || "");
        case "name_desc": return (b.company_name || "").localeCompare(a.company_name || "");
        case "status": return (a.status || "").localeCompare(b.status || "");
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-end justify-between mb-6">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-3 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
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

      {/* Search & Sort */}
      {submissions.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="pl-9 h-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 text-xs gap-1.5 shrink-0">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("newest")} className={sortBy === "newest" ? "font-semibold" : ""}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")} className={sortBy === "oldest" ? "font-semibold" : ""}>Oldest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name_asc")} className={sortBy === "name_asc" ? "font-semibold" : ""}>Name A–Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name_desc")} className={sortBy === "name_desc" ? "font-semibold" : ""}>Name Z–A</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("status")} className={sortBy === "status" ? "font-semibold" : ""}>By Status</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          {visible.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={async () => {
                const lead = getLeadForSubmission(s.id);
                if (lead) {
                  navigate(`/pipeline/${lead.id}`);
                } else {
                  // Auto-create a pipeline lead for this orphan submission
                  const { ensurePipelineLead } = await import("@/lib/pipeline-sync");
                  const leadId = await ensurePipelineLead({
                    userId: user!.id,
                    accountName: s.company_name || "Untitled",
                    submissionId: s.id,
                  });
                  if (leadId) {
                    navigate(`/pipeline/${leadId}`);
                  } else {
                    navigate(`/application/${s.id}`);
                  }
                }
              }}
            >
              <div className="flex-1 min-w-0">
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
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${stage.colorClass}`}>
                        {stage.label}
                      </Badge>
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
              </div>

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
                    {(() => {
                      const lead = getLeadForSubmission(s.id);
                      const isSold = lead ? soldLeadIds.has(lead.id) : false;
                      return (
                        <DropdownMenuItem
                          disabled={!isSold}
                          onClick={(e) => { e.stopPropagation(); if (isSold) addPolicyToClient(s); }}
                          className="gap-2"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {isSold ? "Add Policy" : "Add Policy (must be sold)"}
                        </DropdownMenuItem>
                      );
                    })()}
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateSubmission(s); }} className="gap-2">
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); renameSubmission(s.id, s.company_name); }} className="gap-2">
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); deleteSubmission(s.id); }}
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
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button variant="outline" size="sm" onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="text-xs">
                Load More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
