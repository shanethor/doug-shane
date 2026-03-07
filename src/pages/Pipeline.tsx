import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, CheckCircle, GripVertical, Edit3, Send, PenLine, Copy, Check, ExternalLink, FileText, Trash2, Users, DollarSign, TrendingUp, Share2, BarChart3, Info, CalendarDays } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LossRunBadge } from "@/components/LossRunBadge";

import { generateIntakeLink } from "@/lib/intake-links";
import { PipelineAnalytics } from "@/components/PipelineAnalytics";
import { SchedulePresentationDialog } from "@/components/SchedulePresentationDialog";
import { LeadActionSheet } from "@/components/LeadActionSheet";
import { MoreVertical } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUserRole } from "@/hooks/useUserRole";

type PresentingLine = {
  line_of_business: string;
  premium: string;
};

type Lead = {
  id: string;
  account_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  business_type: string | null;
  lead_source: string | null;
  owner_user_id: string;
  stage: "prospect" | "quoting" | "presenting" | "lost";
  line_type: "commercial" | "personal";
  created_at: string;
  updated_at: string;
  has_approved_policy?: boolean;
  submission_id?: string | null;
  presenting_details?: any;
};

const STAGES = ["prospect", "quoting", "presenting", "lost"] as const;
const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  quoting: "Quoting",
  presenting: "Presenting",
  lost: "Lost",
  sold: "Sold",
};

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  quoting: "bg-primary/10 text-primary",
  presenting: "bg-accent/20 text-accent-foreground",
  lost: "bg-destructive/10 text-destructive",
  sold: "bg-success/20 text-success",
};

const STAGE_TOOLTIPS: Record<string, string> = {
  prospect: "Potential client, attempting to move into quoting stage and progress the sale.",
  quoting: "Client agreed to hear quotes, looking to collect information and fill out forms before sending policy info off.",
  presenting: "You have received quotes, you must present them to the client to see if they'd like to move forward.",
  lost: "Client went in another direction.",
  sold: "You closed the deal! Enter policy information.",
};

export default function Pipeline({ embedded }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { role, isManager, isAdmin } = useUserRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pipelineView, setPipelineView] = useState<"commercial" | "personal">("commercial");
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"choose" | "manual" | "intake">("choose");
  const [intakeLink, setIntakeLink] = useState<string | null>(null);
  const [intakeCopied, setIntakeCopied] = useState(false);
  const [creatingIntake, setCreatingIntake] = useState(false);
  const [newLead, setNewLead] = useState({
    account_name: "",
    contact_name: "",
    phone: "",
    email: "",
    state: "",
    business_type: "",
    lead_source: "",
    target_premium: "",
  });

  // Analytics data
  const [allPoliciesData, setAllPoliciesData] = useState<any[]>([]);
  const [auditLogData, setAuditLogData] = useState<any[]>([]);
  // Map lead_id -> array of approved policy premiums for sold card display
  const [leadPolicyPremiums, setLeadPolicyPremiums] = useState<Record<string, number[]>>({});

  const [lossRunStatuses, setLossRunStatuses] = useState<Record<string, string>>({});
  

  // Drag-and-drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Sold modal state
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [soldLeadId, setSoldLeadId] = useState<string | null>(null);
  const [soldPolicies, setSoldPolicies] = useState<Array<{
    carrier: string;
    line_of_business: string;
    policy_number: string;
    effective_date: string;
    annual_premium: string;
  }>>([{ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }]);
  const [submittingSold, setSubmittingSold] = useState(false);

  // Presenting modal state
  const [presentingModalOpen, setPresentingModalOpen] = useState(false);
  const [presentingLeadId, setPresentingLeadId] = useState<string | null>(null);
  const [presentingLines, setPresentingLines] = useState<PresentingLine[]>([
    { line_of_business: "", premium: "" },
  ]);
  const [presentingNotes, setPresentingNotes] = useState("");
  const [submittingPresenting, setSubmittingPresenting] = useState(false);

  // Lost modal state
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostLeadId, setLostLeadId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostRenewalDate, setLostRenewalDate] = useState("");
  const [submittingLost, setSubmittingLost] = useState(false);


  // Schedule presentation state
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Delete lead state
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  // Mobile action sheet state
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [actionSheetLead, setActionSheetLead] = useState<Lead | null>(null);

  // Pipeline stats
  const [pipelineStats, setPipelineStats] = useState({
    totalProspects: 0,
    quotingCount: 0,
    presentingCount: 0,
    lostCount: 0,
    soldCount: 0,
    presentingPremium: 0,
    presentingRevenue: 0,
    totalPremiumSold: 0,
    totalRevenueSold: 0,
    targetPremium: 0,
    targetRevenue: 0,
  });

  // Share tracker
  const [trackerCopied, setTrackerCopied] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const loadLeads = useCallback(async () => {
    if (!user) return;
    // RLS now handles visibility via get_accessible_lead_ids — managers see team leads, producers see own
    const leadsQuery = supabase.from("leads").select("*").order("updated_at", { ascending: false });
    // Producers still filter client-side for performance; managers/admins see all accessible
    if (!isManager && !isAdmin) {
      leadsQuery.eq("owner_user_id", user.id);
    }

    const [leadsRes, approvedRes, lossRunRes, allPoliciesRes, auditRes] = await Promise.all([
      leadsQuery,
      supabase.from("policies").select("lead_id").eq("status", "approved"),
      supabase.from("loss_run_requests").select("lead_id, status"),
      // For managers: RLS on policies now allows seeing team policies via lead_id
      supabase.from("policies").select("lead_id, annual_premium, revenue, status, created_at"),
      supabase.from("audit_log").select("object_id, action, metadata, created_at").eq("object_type", "lead").order("created_at", { ascending: true }).limit(1000),
    ]);

    if (!mountedRef.current) return;

    const leadsData = leadsRes.data;
    if (!leadsData) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const approvedLeadIds = new Set(
      (approvedRes.data ?? []).map((p: any) => p.lead_id)
    );

    const lrMap: Record<string, string> = {};
    (lossRunRes.data ?? []).forEach((lr: any) => {
      lrMap[lr.lead_id] = lr.status;
    });
    setLossRunStatuses(lrMap);


    setLeads(
      leadsData.map((l: any) => ({
        ...l,
        has_approved_policy: approvedLeadIds.has(l.id),
      }))
    );

    // Compute pipeline stats
    const allPolicies = allPoliciesRes.data ?? [];
    const approved = allPolicies.filter((p: any) => p.status === "approved");
    const prospectLeads = leadsData.filter((l: any) => l.stage === "prospect" && !approvedLeadIds.has(l.id));
    const quotingLeads = leadsData.filter((l: any) => l.stage === "quoting" && !approvedLeadIds.has(l.id));
    const presentingLeads = leadsData.filter((l: any) => l.stage === "presenting" && !approvedLeadIds.has(l.id));
    const lostLeads = leadsData.filter((l: any) => l.stage === "lost");
    const soldLeads = leadsData.filter((l: any) => approvedLeadIds.has(l.id));

    // Sum presenting premiums from presenting_details.lines
    let presentingPremium = 0;
    presentingLeads.forEach((l: any) => {
      const lines = l.presenting_details?.lines;
      if (Array.isArray(lines)) {
        lines.forEach((line: any) => { presentingPremium += Number(line.premium) || 0; });
      } else if (l.presenting_details?.quoted_premium) {
        presentingPremium += Number(l.presenting_details.quoted_premium) || 0;
      }
    });

    // Sum target premiums from all non-sold, non-lost leads
    const activeLeads = leadsData.filter((l: any) => !approvedLeadIds.has(l.id) && l.stage !== "lost");
    const targetPremium = activeLeads.reduce((s: number, l: any) => s + (Number(l.target_premium) || 0), 0);

    setPipelineStats({
      totalProspects: prospectLeads.length + quotingLeads.length + presentingLeads.length,
      quotingCount: quotingLeads.length,
      presentingCount: presentingLeads.length,
      lostCount: lostLeads.length,
      soldCount: soldLeads.length,
      presentingPremium,
      presentingRevenue: presentingPremium * 0.12,
      totalPremiumSold: approved.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
      totalRevenueSold: approved.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0),
      targetPremium,
      targetRevenue: targetPremium * 0.12,
    });

    setAllPoliciesData(allPolicies.map((p: any) => ({ lead_id: p.lead_id, annual_premium: Number(p.annual_premium || 0), status: p.status, created_at: p.created_at })));
    
    // Build per-lead premium map for sold cards
    const premiumMap: Record<string, number[]> = {};
    approved.forEach((p: any) => {
      if (!premiumMap[p.lead_id]) premiumMap[p.lead_id] = [];
      premiumMap[p.lead_id].push(Number(p.annual_premium || 0));
    });
    setLeadPolicyPremiums(premiumMap);

    setAuditLogData(auditRes.data ?? []);
    setLoading(false);
  }, [user]);

  const { containerRef: pullRef, PullIndicator } = usePullToRefresh({ onRefresh: loadLeads });

  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, 30000);
    return () => clearInterval(interval);
  }, [loadLeads]);

  // Auto-promote lost leads back to Prospect when within 2 months of estimated renewal
  const renewalCheckDone = useRef(false);
  useEffect(() => {
    if (!user || leads.length === 0 || renewalCheckDone.current) return;
    renewalCheckDone.current = true;

    const now = new Date();
    const twoMonthsOut = new Date(now);
    twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);

    const lostWithRenewal = leads.filter(
      (l) => l.stage === "lost" && (l as any).estimated_renewal_date
    );

    const toPromote = lostWithRenewal.filter((l) => {
      const renewalDate = new Date((l as any).estimated_renewal_date);
      return renewalDate <= twoMonthsOut && renewalDate >= now;
    });

    if (toPromote.length === 0) return;

    (async () => {
      await Promise.all(toPromote.map(async (lead) => {
        await supabase
          .from("leads")
          .update({ stage: "prospect" as any, updated_at: new Date().toISOString() } as any)
          .eq("id", lead.id);

        await Promise.all([
          supabase.from("lead_notes").insert({
            lead_id: lead.id,
            user_id: user.id,
            note_text: `🔄 Up for renewal soon — estimated renewal: ${(lead as any).estimated_renewal_date}. Auto-moved from Lost back to Prospect.`,
          }),
          supabase.from("audit_log").insert({
            user_id: user.id,
            action: "auto_renewal_promote",
            object_type: "lead",
            object_id: lead.id,
            metadata: { from: "lost", to: "prospect", estimated_renewal_date: (lead as any).estimated_renewal_date },
          }),
        ]);
      }));

      toast.success(`${toPromote.length} lost lead(s) moved back to Prospect — up for renewal soon!`);
      loadLeads();
    })();
  }, [user, leads, loadLeads]);

  const handleAddLead = async () => {
    if (!user || !newLead.account_name.trim()) return;
    const { data: lead, error } = await supabase.from("leads").insert({
      account_name: newLead.account_name.trim(),
      contact_name: newLead.contact_name || null,
      phone: newLead.phone || null,
      email: newLead.email || null,
      state: newLead.state || null,
      business_type: newLead.business_type || null,
      lead_source: newLead.lead_source || null,
      owner_user_id: user.id,
      target_premium: newLead.target_premium ? parseFloat(newLead.target_premium) : null,
      line_type: pipelineView,
    } as any).select("id").single();

    if (error) {
      toast.error("Failed to add lead");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "create",
        object_type: "lead",
        object_id: lead?.id || "00000000-0000-0000-0000-000000000000",
      });
      toast.success("Lead added!");
      setNewLead({ account_name: "", contact_name: "", phone: "", email: "", state: "", business_type: "", lead_source: "", target_premium: "" });
      setAddOpen(false);
      setAddMode("choose");
      loadLeads();
    }
  };

  const handleSendIntake = async () => {
    if (!user || !newLead.account_name.trim()) return;
    setCreatingIntake(true);
    try {
      // Create the lead first
      const { data: lead, error } = await supabase.from("leads").insert({
        account_name: newLead.account_name.trim(),
        contact_name: newLead.contact_name || null,
        email: newLead.email || null,
        phone: newLead.phone || null,
        state: newLead.state || null,
        business_type: newLead.business_type || null,
        lead_source: "customer_intake",
        owner_user_id: user.id,
        line_type: pipelineView,
      }).select("id").single();

      if (error || !lead) throw error || new Error("Failed to create lead");

      // Generate intake link
      const result = await generateIntakeLink({
        agentId: user.id,
        leadId: lead.id,
        customerName: newLead.contact_name || null,
        customerEmail: newLead.email || null,
      });

      if (!result) throw new Error("Failed to generate link");

      setIntakeLink(result.url);
      setAddMode("intake");
      loadLeads();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create intake link");
    } finally {
      setCreatingIntake(false);
    }
  };

  const moveStage = async (leadId: string, newStage: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage as any })
      .eq("id", leadId);

    if (error) {
      toast.error("Failed to move lead");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: leadId,
        metadata: { new_stage: newStage },
      });
      loadLeads();
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Determine current effective stage
    const currentStage = lead.has_approved_policy ? "sold" : lead.stage;
    if (currentStage === targetStage) return;

    if (targetStage === "sold") {
      // Open sold modal to collect policy details
      setSoldLeadId(leadId);
      setSoldPolicies([{ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }]);
      setSoldModalOpen(true);
    } else if (targetStage === "presenting") {
      // Open presenting modal to collect premium lines
      setPresentingLeadId(leadId);
      // Pre-populate with existing presenting_details if any
      const existingLead = leads.find(l => l.id === leadId);
      if (existingLead?.presenting_details?.lines) {
        setPresentingLines(existingLead.presenting_details.lines);
        setPresentingNotes(existingLead.presenting_details.notes || "");
      } else {
        setPresentingLines([{ line_of_business: "", premium: "" }]);
        setPresentingNotes("");
      }
      setPresentingModalOpen(true);
    } else if (targetStage === "lost") {
      // Open lost modal to collect reason
      setLostLeadId(leadId);
      setLostReason("");
      setLostRenewalDate("");
      setLostModalOpen(true);
    } else {
      // Regular stage move
      await moveStage(leadId, targetStage);
      toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
    }
    setDraggedLeadId(null);
  };

  const handlePresentingSubmit = async () => {
    if (!user || !presentingLeadId || submittingPresenting) return;
    const validLines = presentingLines.filter(l => l.line_of_business.trim() && l.premium);
    if (validLines.length === 0) {
      toast.error("Add at least one line of business with a premium");
      return;
    }
    setSubmittingPresenting(true);
    try {
      const totalPremium = validLines.reduce((s, l) => s + (parseFloat(l.premium) || 0), 0);
      const details = {
        lines: validLines,
        total_premium: totalPremium,
        total_revenue: totalPremium * 0.12,
        notes: presentingNotes,
        presented_at: new Date().toISOString(),
      };

      await supabase
        .from("leads")
        .update({
          stage: "presenting" as any,
          presenting_details: details,
        } as any)
        .eq("id", presentingLeadId);

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: presentingLeadId,
        metadata: { new_stage: "presenting", total_premium: totalPremium },
      });

      toast.success("Moved to Presenting!");
      setPresentingModalOpen(false);
      // Offer to schedule presentation
      setScheduleLeadId(presentingLeadId);
      setScheduleOpen(true);
      setPresentingLeadId(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSubmittingPresenting(false);
    }
  };

  const handleLostSubmit = async () => {
    if (!user || !lostLeadId || submittingLost) return;
    if (!lostReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    if (!lostRenewalDate) {
      toast.error("Please provide an estimated renewal date");
      return;
    }
    setSubmittingLost(true);
    try {
      await supabase
        .from("leads")
        .update({
          stage: "lost" as any,
          loss_reason: lostReason.trim(),
          estimated_renewal_date: lostRenewalDate,
        } as any)
        .eq("id", lostLeadId);

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: lostLeadId,
        metadata: { new_stage: "lost", loss_reason: lostReason.trim(), estimated_renewal_date: lostRenewalDate },
      });

      toast.success("Moved to Lost");
      setLostModalOpen(false);
      setLostLeadId(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSubmittingLost(false);
    }
  };

  const handleSoldSubmit = async () => {
    if (!user || !soldLeadId) return;
    const validPolicies = soldPolicies.filter(p => p.carrier.trim() && p.policy_number.trim() && p.effective_date && p.annual_premium);
    if (validPolicies.length === 0) {
      toast.error("Please fill in at least one policy with all required fields");
      return;
    }

    setSubmittingSold(true);
    try {
      // Snapshot form_data from linked submission (if any)
      const soldLead = leads.find((l) => l.id === soldLeadId) as any;
      let formDataSnapshot: Record<string, any> | null = null;
      if (soldLead?.submission_id) {
        const { data: app } = await supabase
          .from("insurance_applications")
          .select("form_data")
          .eq("submission_id", soldLead.submission_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (app?.form_data) formDataSnapshot = app.form_data as Record<string, any>;
      }

      // Create approved policies for this lead
      await Promise.all(validPolicies.map(async (pf) => {
        const { error } = await supabase.from("policies").insert({
          lead_id: soldLeadId,
          producer_user_id: user.id,
          carrier: pf.carrier.trim(),
          line_of_business: pf.line_of_business.trim() || "General",
          policy_number: pf.policy_number.trim(),
          effective_date: pf.effective_date,
          annual_premium: parseFloat(pf.annual_premium) || 0,
          status: "approved" as any,
          approved_at: new Date().toISOString(),
          approved_by_user_id: user.id,
          ...(formDataSnapshot ? { form_data_snapshot: formDataSnapshot } : {}),
        } as any);
        if (error) throw error;
      }));

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "policy_sold",
        object_type: "lead",
        object_id: soldLeadId,
        metadata: { policy_count: validPolicies.length, carriers: validPolicies.map(p => p.carrier) },
      });

      toast.success(`${validPolicies.length} ${validPolicies.length === 1 ? "policy" : "policies"} added — lead moved to Sold!`);
      setSoldModalOpen(false);
      setSoldLeadId(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || "Failed to create policy");
    } finally {
      setSubmittingSold(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!user || !deleteLeadId) return;
    try {
      // Delete related records first
      await Promise.all([
        supabase.from("lead_notes").delete().eq("lead_id", deleteLeadId),
        supabase.from("loss_run_requests").delete().eq("lead_id", deleteLeadId),
        supabase.from("policies").delete().eq("lead_id", deleteLeadId),
        supabase.from("client_documents").delete().eq("lead_id", deleteLeadId),
        supabase.from("intake_links").delete().eq("lead_id", deleteLeadId),
      ]);
      const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "delete",
        object_type: "lead",
        object_id: deleteLeadId,
      });

      toast.success("Lead deleted");
      setDeleteAlertOpen(false);
      setDeleteLeadId(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete lead");
    }
  };

  const trackerUrl = user ? `${window.location.origin}/tracker?uid=${user.id}` : "";

  const filtered = leads.filter((l) => {
    // Filter by line type for the kanban view
    const lineType = (l as any).line_type || "commercial";
    if (lineType !== pipelineView) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.account_name.toLowerCase().includes(q) ||
      (l.contact_name || "").toLowerCase().includes(q) ||
      (l.business_type || "").toLowerCase().includes(q)
    );
  });

  const columns = [...STAGES.filter(s => s !== "lost"), "sold" as const];
  const lostStage = "lost";
  const grouped: Record<string, Lead[]> = {};
  columns.forEach((s) => (grouped[s] = []));
  grouped["lost"] = [];

  filtered.forEach((l) => {
    if (l.has_approved_policy) {
      grouped["sold"].push(l);
    } else {
      grouped[l.stage]?.push(l);
    }
  });

  // "Show All" expansion state per column
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const COLUMN_LIMIT = 5;
  const toggleColumnExpand = (stage: string) => {
    setExpandedColumns(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  if (loading) {
    const loadingContent = (
      <>
        {/* Stats bar skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 mb-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Header skeleton */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <Skeleton className="h-10 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-10 flex-1 min-w-[200px]" />
          </div>
        </div>
        {/* Kanban columns skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 5 }).map((_, col) => (
            <div key={col} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              {Array.from({ length: col === 0 ? 3 : col === 4 ? 1 : 2 }).map((_, row) => (
                <div key={row} className="rounded-lg border bg-card p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
    return embedded ? loadingContent : <AppLayout>{loadingContent}</AppLayout>;
  }

  const soldLead = soldLeadId ? leads.find((l) => l.id === soldLeadId) : null;
  const presentingLead = presentingLeadId ? leads.find((l) => l.id === presentingLeadId) : null;
  const lostLead = lostLeadId ? leads.find((l) => l.id === lostLeadId) : null;

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });


  const mainContent = (
    <>
      <div ref={pullRef} className="overflow-y-auto">
      <PullIndicator />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl">Pipeline</h1>
            <p className="text-muted-foreground font-sans text-xs sm:text-sm mt-1">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""} — {typeof window !== "undefined" && window.innerWidth < 768 ? "tap to manage" : "drag between stages to manage your pipeline"}.
            </p>
          </div>
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              onClick={() => setPipelineView("commercial")}
              className={`px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-colors ${
                pipelineView === "commercial"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Commercial
            </button>
            <button
              onClick={() => setPipelineView("personal")}
              className={`px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-colors ${
                pipelineView === "personal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Personal
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try { await navigator.clipboard.writeText(trackerUrl); } catch {}
              setTrackerCopied(true);
              toast.success("Tracker link copied!");
              setTimeout(() => setTrackerCopied(false), 2000);
            }}
          >
            {trackerCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {trackerCopied ? "Copied" : "Share Tracker"}
          </Button>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setAddMode("choose"); setIntakeLink(null); setIntakeCopied(false); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {addMode === "choose" ? "Add New Lead" : addMode === "manual" ? "Enter Lead Details" : "Intake Link Ready"}
              </DialogTitle>
            </DialogHeader>

            {/* Step 1: Choose mode */}
            {addMode === "choose" && (
              <div className="grid gap-3 mt-2">
                <button
                  className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left hover:border-primary hover:shadow-sm transition-all"
                  onClick={() => setAddMode("manual")}
                >
                  <div className="rounded-full bg-primary/10 p-2.5">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Enter Information Yourself</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">Manually enter client details and start working on their account</p>
                  </div>
                </button>
                <button
                  className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left hover:border-primary hover:shadow-sm transition-all"
                  onClick={() => setAddMode("intake")}
                >
                  <div className="rounded-full bg-accent/10 p-2.5">
                    <Send className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Send Intake Form to Client</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">Generate a secure link for the client to submit their own info</p>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2a: Manual entry */}
            {addMode === "manual" && pipelineView === "personal" && (
              <div className="grid gap-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={newLead.contact_name.split(" ")[0] || ""}
                      onChange={(e) => {
                        const last = newLead.contact_name.split(" ").slice(1).join(" ");
                        setNewLead({ ...newLead, contact_name: `${e.target.value}${last ? " " + last : ""}` });
                      }}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={newLead.contact_name.split(" ").slice(1).join(" ") || ""}
                      onChange={(e) => {
                        const first = newLead.contact_name.split(" ")[0] || "";
                        setNewLead({ ...newLead, contact_name: `${first} ${e.target.value}`.trim(), account_name: `${first} ${e.target.value}`.trim() });
                      }}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="john@email.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>State</Label>
                    <Input
                      value={newLead.state}
                      onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                      maxLength={2}
                      placeholder="TX"
                    />
                  </div>
                  <div>
                    <Label>Coverage Type</Label>
                    <Select
                      value={newLead.business_type}
                      onValueChange={(v) => setNewLead({ ...newLead, business_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto">Auto</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Auto + Home">Auto + Home</SelectItem>
                        <SelectItem value="Umbrella">Umbrella</SelectItem>
                        <SelectItem value="Recreational">Recreational</SelectItem>
                        <SelectItem value="Personal Articles">Personal Articles</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Lead Source</Label>
                    <Select
                      value={newLead.lead_source}
                      onValueChange={(v) => setNewLead({ ...newLead, lead_source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="walk_in">Walk-In</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Premium</Label>
                    <Input
                      type="number"
                      value={newLead.target_premium}
                      onChange={(e) => setNewLead({ ...newLead, target_premium: e.target.value })}
                      placeholder="$0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Entity / Named Insured</Label>
                  <Input
                    value={newLead.account_name !== newLead.contact_name ? newLead.account_name : ""}
                    onChange={(e) => setNewLead({ ...newLead, account_name: e.target.value || newLead.contact_name })}
                    placeholder="e.g. Smith Family Trust (optional)"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddMode("choose")}>Back</Button>
                  <Button
                    onClick={handleAddLead}
                    disabled={!newLead.contact_name.trim() || !newLead.phone.trim() || !newLead.email.trim()}
                  >
                    Add Lead
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 2a: Manual entry — Commercial */}
            {addMode === "manual" && pipelineView === "commercial" && (
              <div className="grid gap-3 mt-2">
                <div>
                  <Label>Account Name *</Label>
                  <Input
                    value={newLead.account_name}
                    onChange={(e) => setNewLead({ ...newLead, account_name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={newLead.contact_name}
                      onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={newLead.state}
                      onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                      maxLength={2}
                      placeholder="TX"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Business Type</Label>
                    <Input
                      value={newLead.business_type}
                      onChange={(e) => setNewLead({ ...newLead, business_type: e.target.value })}
                      placeholder="e.g. Restaurant"
                    />
                  </div>
                  <div>
                    <Label>Lead Source</Label>
                    <Select
                      value={newLead.lead_source}
                      onValueChange={(v) => setNewLead({ ...newLead, lead_source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="walk_in">Walk-In</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Target Premium</Label>
                  <Input
                    type="number"
                    value={newLead.target_premium}
                    onChange={(e) => setNewLead({ ...newLead, target_premium: e.target.value })}
                    placeholder="$0"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddMode("choose")}>Back</Button>
                  <Button onClick={handleAddLead} disabled={!newLead.account_name.trim()}>
                    Add Lead
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 2b: Intake – pre-fill + generate link */}
            {addMode === "intake" && !intakeLink && (
              <div className="grid gap-3 mt-2">
                <div>
                  <Label>Account Name *</Label>
                  <Input
                    value={newLead.account_name}
                    onChange={(e) => setNewLead({ ...newLead, account_name: e.target.value })}
                    placeholder="Client's company name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={newLead.contact_name}
                      onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddMode("choose")}>Back</Button>
                  <Button onClick={handleSendIntake} disabled={!newLead.account_name.trim() || creatingIntake} className="gap-1.5">
                    {creatingIntake ? "Creating…" : "Generate Intake Link"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 3: Intake link generated */}
            {addMode === "intake" && intakeLink && (
              <div className="space-y-3 mt-2">
                <div className="rounded-lg bg-muted/50 border p-3">
                  <p className="text-xs text-muted-foreground font-sans mb-1.5">Share this link with the client:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all flex-1 bg-background rounded px-2 py-1.5">{intakeLink}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(intakeLink!);
                        setIntakeCopied(true);
                        setTimeout(() => setIntakeCopied(false), 2000);
                      }}
                    >
                      {intakeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {intakeCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  The client will fill out their business details, EIN, address, and coverage needs. Their responses will automatically populate your forms.
                </p>
                <DialogFooter>
                  <Button onClick={() => { setAddOpen(false); setAddMode("choose"); setIntakeLink(null); setNewLead({ account_name: "", contact_name: "", phone: "", email: "", state: "", business_type: "", lead_source: "", target_premium: "" }); }}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {leads.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="pl-9 h-10"
          />
        </div>
      )}

      {/* Kanban Board with drag-and-drop */}
      <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      <div className="flex md:grid md:grid-cols-4 gap-3 min-h-[60vh] min-w-max md:min-w-0">
        {columns.map((stage) => (
          <div key={stage} className="flex flex-col w-[280px] md:w-auto shrink-0 md:shrink">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </Badge>
              <span className="text-xs text-muted-foreground font-sans">{grouped[stage]?.length ?? 0}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs font-sans">
                  {STAGE_TOOLTIPS[stage]}
                </TooltipContent>
              </Tooltip>
            </div>
            <div
              className={`flex-1 rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors ${
                dragOverStage === stage ? "border-primary bg-primary/5" : "border-transparent"
              }`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {(grouped[stage] || [])
                .slice(0, expandedColumns[stage] ? undefined : COLUMN_LIMIT)
                .map((lead) => {
                const handleTouchEnd = (e: React.TouchEvent) => {
                  if (Math.abs(e.changedTouches[0]?.clientX - (e as any).__startX) > 30) return;
                };
                return (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (navigator.vibrate) navigator.vibrate(10);
                    setActionSheetLead(lead);
                    setActionSheetOpen(true);
                  }}
                  onTouchStart={(e: any) => { e.__startX = e.touches[0]?.clientX; }}
                  onTouchMove={handleTouchEnd}
                  className={`transition-opacity ${draggedLeadId === lead.id ? "opacity-40" : ""}`}
                >
                  <Link to={`/pipeline/${lead.id}`}>
                    <Card className="hover-lift cursor-grab active:cursor-grabbing group">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              <p className="font-medium text-sm font-sans truncate">{lead.account_name}</p>
                              {(stage === "prospect" || stage === "quoting") && (
                                <LossRunBadge status={lossRunStatuses[lead.id] || null} />
                              )}
                            </div>
                            {lead.contact_name && (
                              <p className="text-xs text-muted-foreground font-sans truncate ml-[18px]">{lead.contact_name}</p>
                            )}
                            <div className="flex items-center gap-1 ml-[18px] mt-0.5">
                              {lead.submission_id && (
                                <Link
                                  to={`/acord/acord-125/${lead.submission_id}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-accent gap-0.5">
                                    <Edit3 className="h-2.5 w-2.5" />
                                    ACORD
                                  </Badge>
                                </Link>
                              )}
                              {lead.business_type && (
                                <span className="text-[10px] text-muted-foreground font-sans">{lead.business_type}</span>
                              )}
                            </div>
                            {/* Show target premium on prospect/quoting cards */}
                            {(stage === "prospect" || stage === "quoting") && (lead as any).target_premium > 0 && (
                              <div className="ml-[18px] mt-1">
                                <span className="text-[10px] text-primary font-sans">
                                  Target: {fmt((lead as any).target_premium)}
                                </span>
                              </div>
                            )}
                            {/* Show presenting premium on presenting cards */}
                            {stage === "presenting" && lead.presenting_details?.lines && (
                              <div className="ml-[18px] mt-1 space-y-0.5">
                                {(lead.presenting_details.lines as PresentingLine[]).map((line: PresentingLine, i: number) => (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-accent font-sans">{line.line_of_business}:</span>
                                    <span className="text-[10px] font-medium text-accent font-sans">{fmt(Number(line.premium))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Show sold premium on sold cards */}
                            {stage === "sold" && leadPolicyPremiums[lead.id] && (
                              <div className="ml-[18px] mt-1">
                                <span className="text-[10px] text-success font-sans font-medium">
                                  Sold: {fmt(leadPolicyPremiums[lead.id].reduce((a: number, b: number) => a + b, 0))}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (navigator.vibrate) navigator.vibrate(10);
                              setActionSheetLead(lead);
                              setActionSheetOpen(true);
                            }}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
                );
              })}
              {(grouped[stage] || []).length > COLUMN_LIMIT && (
                <button
                  onClick={() => toggleColumnExpand(stage)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors font-sans"
                >
                  {expandedColumns[stage]
                    ? "Show less"
                    : `Show all ${(grouped[stage] || []).length} leads`}
                </button>
              )}
              {(grouped[stage] || []).length === 0 && (
                <p className="text-xs text-muted-foreground font-sans text-center py-8">No leads</p>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Lost row */}
      <div
        className={`mt-4 rounded-lg border-2 border-dashed p-3 transition-colors ${
          dragOverStage === lostStage ? "border-destructive bg-destructive/5" : "border-border"
        }`}
        onDragOver={(e) => handleDragOver(e, lostStage)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, lostStage)}
      >
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${STAGE_COLORS[lostStage]}`}>
            {STAGE_LABELS[lostStage]}
          </Badge>
          <span className="text-xs text-muted-foreground font-sans">{grouped[lostStage]?.length ?? 0}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs font-sans">
              {STAGE_TOOLTIPS[lostStage]}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-2">
          {(grouped[lostStage] || []).map((lead) => (
            <Link key={lead.id} to={`/pipeline/${lead.id}`}>
              <Card
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                className="hover-lift cursor-grab active:cursor-grabbing"
              >
                <CardContent className="p-2 px-3 flex items-center gap-2">
                  <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-sm font-sans">{lead.account_name}</span>
                  {(lead as any).estimated_renewal_date && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 font-sans">
                      <CalendarDays className="h-2.5 w-2.5" />
                      {(lead as any).estimated_renewal_date}
                    </Badge>
                  )}
                  {(lead as any).loss_reason && (
                    <span className="text-[10px] text-muted-foreground font-sans">{(lead as any).loss_reason}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
          {(grouped[lostStage] || []).length === 0 && (
            <p className="text-xs text-muted-foreground font-sans py-2">Drop leads here to mark as lost</p>
          )}
        </div>
      </div>
      </TooltipProvider>

      {/* Pipeline Analytics Accordion */}
      {user && <PipelineAnalytics leads={leads} policies={allPoliciesData} auditLog={auditLogData} />}

      {/* Lost Reason Modal */}
      <Dialog open={lostModalOpen} onOpenChange={(open) => { if (!open) { setLostModalOpen(false); setLostLeadId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Lost — {lostLead?.account_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why was this lead lost?"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Estimated Renewal Date</Label>
              <Input
                type="date"
                value={lostRenewalDate}
                onChange={(e) => setLostRenewalDate(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground font-sans mt-1">
                If provided, the lead will auto-move back to Prospect 2 months before renewal.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLostModalOpen(false); setLostLeadId(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleLostSubmit} disabled={!lostReason.trim() || submittingLost}>
              {submittingLost ? "Saving…" : "Mark as Lost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sold Modal — collect policy details */}
      <Dialog open={soldModalOpen} onOpenChange={(open) => { if (!open) { setSoldModalOpen(false); setSoldLeadId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>🎉 Close the Deal — {soldLead?.account_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground font-sans">
            Enter the policy details below. You can add multiple policies.
          </p>
          <div className="space-y-4 mt-2 max-h-[50vh] overflow-y-auto">
            {soldPolicies.map((p, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground font-sans">Policy {i + 1}</span>
                  {soldPolicies.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setSoldPolicies(soldPolicies.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Carrier *</Label>
                    <Input
                      value={p.carrier}
                      onChange={(e) => { const u = [...soldPolicies]; u[i] = { ...u[i], carrier: e.target.value }; setSoldPolicies(u); }}
                      placeholder="e.g. Progressive"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Line of Business</Label>
                    <Input
                      value={p.line_of_business}
                      onChange={(e) => { const u = [...soldPolicies]; u[i] = { ...u[i], line_of_business: e.target.value }; setSoldPolicies(u); }}
                      placeholder="e.g. GL"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Policy #</Label>
                    <Input
                      value={p.policy_number}
                      onChange={(e) => { const u = [...soldPolicies]; u[i] = { ...u[i], policy_number: e.target.value }; setSoldPolicies(u); }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Effective Date *</Label>
                    <Input
                      type="date"
                      value={p.effective_date}
                      onChange={(e) => { const u = [...soldPolicies]; u[i] = { ...u[i], effective_date: e.target.value }; setSoldPolicies(u); }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Premium *</Label>
                    <Input
                      type="number"
                      value={p.annual_premium}
                      onChange={(e) => { const u = [...soldPolicies]; u[i] = { ...u[i], annual_premium: e.target.value }; setSoldPolicies(u); }}
                      placeholder="$0"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add another policy button */}
            <button
              onClick={() => setSoldPolicies([...soldPolicies, { carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }])}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors py-2.5 text-sm font-sans text-muted-foreground hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Add Another Policy
            </button>

            {/* Totals */}
            {(() => {
              const totalPrem = soldPolicies.reduce((s, p) => s + (parseFloat(p.annual_premium) || 0), 0);
              return totalPrem > 0 ? (
                <div className="rounded-lg bg-muted/50 border p-3">
                  <div className="flex justify-between text-sm font-sans">
                    <span className="text-muted-foreground">Total Premium ({soldPolicies.filter(p => p.carrier.trim()).length} {soldPolicies.filter(p => p.carrier.trim()).length === 1 ? "policy" : "policies"}):</span>
                    <span className="font-semibold">{fmt(totalPrem)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-sans mt-1">
                    <span className="text-muted-foreground">Revenue (12%):</span>
                    <span className="font-semibold text-success">{fmt(totalPrem * 0.12)}</span>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSoldModalOpen(false); setSoldLeadId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSoldSubmit} disabled={submittingSold}>
              {submittingSold ? "Saving…" : `Mark as Sold (${soldPolicies.filter(p => p.carrier.trim() && p.annual_premium).length} ${soldPolicies.filter(p => p.carrier.trim() && p.annual_premium).length === 1 ? "policy" : "policies"})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Presenting Premium Modal */}
      <Dialog open={presentingModalOpen} onOpenChange={(open) => { if (!open) { setPresentingModalOpen(false); setPresentingLeadId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enter Quoted Premiums — {presentingLead?.account_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground font-sans">
            Add the lines of business being quoted and the premium for each.
          </p>
          <div className="space-y-3 mt-2 max-h-[40vh] overflow-y-auto">
            {presentingLines.map((line, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  {i === 0 && <Label className="text-xs">Line of Business</Label>}
                  <Input
                    value={line.line_of_business}
                    onChange={(e) => {
                      const updated = [...presentingLines];
                      updated[i] = { ...updated[i], line_of_business: e.target.value };
                      setPresentingLines(updated);
                    }}
                    placeholder="e.g. General Liability"
                  />
                </div>
                <div className="w-28 shrink-0">
                  {i === 0 && <Label className="text-xs">Premium</Label>}
                  <Input
                    type="number"
                    value={line.premium}
                    onChange={(e) => {
                      const updated = [...presentingLines];
                      updated[i] = { ...updated[i], premium: e.target.value };
                      setPresentingLines(updated);
                    }}
                    placeholder="$0"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (presentingLines.length <= 1) return;
                    setPresentingLines(presentingLines.filter((_, idx) => idx !== i));
                  }}
                  disabled={presentingLines.length <= 1}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 mt-1"
            onClick={() => setPresentingLines([...presentingLines, { line_of_business: "", premium: "" }])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </Button>

          {/* Totals */}
          {(() => {
            const totalPrem = presentingLines.reduce((s, l) => s + (parseFloat(l.premium) || 0), 0);
            return totalPrem > 0 ? (
              <div className="rounded-lg bg-muted/50 border p-3 mt-2">
                <div className="flex justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Total Premium:</span>
                  <span className="font-semibold">{fmt(totalPrem)}</span>
                </div>
                <div className="flex justify-between text-sm font-sans mt-1">
                  <span className="text-muted-foreground">Potential Revenue (12%):</span>
                  <span className="font-semibold text-success">{fmt(totalPrem * 0.12)}</span>
                </div>
              </div>
            ) : null;
          })()}

          <div className="mt-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={presentingNotes}
              onChange={(e) => setPresentingNotes(e.target.value)}
              placeholder="Any notes about the quote…"
              className="min-h-[60px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPresentingModalOpen(false); setPresentingLeadId(null); }}>
              Cancel
            </Button>
            <Button onClick={handlePresentingSubmit} disabled={submittingPresenting}>
              {submittingPresenting ? "Saving…" : "Move to Presenting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lead Confirmation */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this lead and all associated notes, documents, and loss run requests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteAlertOpen(false); setDeleteLeadId(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Schedule Presentation Dialog */}
      {scheduleLeadId && (
        <SchedulePresentationDialog
          open={scheduleOpen}
          onOpenChange={(open) => { setScheduleOpen(open); if (!open) setScheduleLeadId(null); }}
          leadId={scheduleLeadId}
          leadName={leads.find(l => l.id === scheduleLeadId)?.account_name || ""}
          leadEmail={leads.find(l => l.id === scheduleLeadId)?.email}
          userId={user?.id || ""}
        />
      )}

      {/* Mobile Lead Action Sheet */}
      <LeadActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        lead={actionSheetLead}
        userId={user?.id || ""}
        onStageMove={async (leadId, stage) => {
          if (stage === "sold") {
            setSoldLeadId(leadId);
            setSoldPolicies([{ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }]);
            setSoldModalOpen(true);
          } else if (stage === "presenting") {
            setPresentingLeadId(leadId);
            const existingLead = leads.find(l => l.id === leadId);
            if (existingLead?.presenting_details?.lines) {
              setPresentingLines(existingLead.presenting_details.lines);
              setPresentingNotes(existingLead.presenting_details.notes || "");
            } else {
              setPresentingLines([{ line_of_business: "", premium: "" }]);
              setPresentingNotes("");
            }
            setPresentingModalOpen(true);
          } else if (stage === "lost") {
            setLostLeadId(leadId);
            setLostReason("");
            setLostRenewalDate("");
            setLostModalOpen(true);
          } else {
            await moveStage(leadId, stage);
          }
        }}
        onSchedule={(leadId) => {
          setScheduleLeadId(leadId);
          setScheduleOpen(true);
        }}
        onDelete={(leadId) => {
          setDeleteLeadId(leadId);
          setDeleteAlertOpen(true);
        }}
        onRefresh={loadLeads}
      />
      </div>
    </>
  );
  return embedded ? mainContent : <AppLayout>{mainContent}</AppLayout>;
}
