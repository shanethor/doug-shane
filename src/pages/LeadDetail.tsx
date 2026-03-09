import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, FileText, CheckCircle, Clock, XCircle, MessageSquare, Send, Edit3, AlertTriangle, ExternalLink, Copy, Check, Trash2, Shield, Download, User, Car, Home, Umbrella, Ship, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LossRunsTab } from "@/components/LossRunsTab";
import { ClientDocuments } from "@/components/ClientDocuments";
import { generateIntakeLink } from "@/lib/intake-links";
import { generateBorPdf, applySignatureToBorPdf, downloadPdf } from "@/lib/bor-pdf-generator";
import { SchedulePresentationDialog } from "@/components/SchedulePresentationDialog";
import { differenceInDays, parseISO, addYears } from "date-fns";

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  quoting: "bg-primary/10 text-primary",
  presenting: "bg-accent/20 text-accent-foreground",
  lost: "bg-destructive/10 text-destructive",
};

const POLICY_STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function LeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<{ id: string; company_name: string | null; status: string; created_at: string; file_urls: any }[]>([]);
  const [borSignatures, setBorSignatures] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    carrier: "",
    line_of_business: "",
    policy_number: "",
    effective_date: "",
    annual_premium: "",
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Presenting modal state
  const [presentingModalOpen, setPresentingModalOpen] = useState(false);
  const [presentingLines, setPresentingLines] = useState<{ line_of_business: string; premium: string }[]>([{ line_of_business: "", premium: "" }]);
  const [presentingNotes, setPresentingNotes] = useState("");
  const [submittingPresenting, setSubmittingPresenting] = useState(false);

  // Lost modal state
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostRenewalDate, setLostRenewalDate] = useState("");
  const [submittingLost, setSubmittingLost] = useState(false);

  // Sold modal state
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [soldPolicies, setSoldPolicies] = useState<{ carrier: string; line_of_business: string; policy_number: string; effective_date: string; annual_premium: string }[]>([{ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }]);
  const [submittingSold, setSubmittingSold] = useState(false);
  const [creatingRenewalEvent, setCreatingRenewalEvent] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const loadData = useCallback(async () => {
    if (!user || !leadId) return;
    const [leadRes, policiesRes, notesRes, subsRes, borRes] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase.from("policies").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
      supabase.from("business_submissions").select("id, company_name, status, created_at, file_urls").eq("lead_id", leadId).order("created_at", { ascending: false }),
      (supabase.from("bor_signatures" as any).select("*").eq("lead_id", leadId).order("created_at", { ascending: false }) as any),
    ]);

    if (!mountedRef.current) return;

    setLead(leadRes.data);
    setPolicies(policiesRes.data ?? []);
    setNotes(notesRes.data ?? []);
    setSubmissions((subsRes.data as any[]) ?? []);
    setBorSignatures((borRes.data as any[]) ?? []);
    setLoading(false);
  }, [user, leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStageChange = (newStage: string) => {
    if (newStage === lead.stage) return;

    if (newStage === "presenting") {
      // Pre-populate with existing presenting_details if any
      if (lead.presenting_details?.lines) {
        setPresentingLines(lead.presenting_details.lines);
        setPresentingNotes(lead.presenting_details.notes || "");
      } else {
        setPresentingLines([{ line_of_business: "", premium: "" }]);
        setPresentingNotes("");
      }
      setPresentingModalOpen(true);
    } else if (newStage === "lost") {
      setLostReason("");
      setLostRenewalDate("");
      setLostModalOpen(true);
    } else if (newStage === "sold") {
      setSoldPolicies([{ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }]);
      setSoldModalOpen(true);
    } else {
      moveStage(newStage);
    }
  };

  const moveStage = async (newStage: string) => {
    if (!user || !leadId) return;
    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage as any })
      .eq("id", leadId);

    if (error) {
      toast.error("Failed to update stage");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: leadId,
        metadata: { new_stage: newStage },
      });
      toast.success("Stage updated");
      loadData();
    }
  };

  const handlePresentingSubmit = async () => {
    if (!user || !leadId || submittingPresenting) return;
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
        .eq("id", leadId);

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: leadId,
        metadata: { new_stage: "presenting", total_premium: totalPremium },
      });

      toast.success("Moved to Presenting!");
      setPresentingModalOpen(false);
      setScheduleOpen(true);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSubmittingPresenting(false);
    }
  };

  const handleLostSubmit = async () => {
    if (!user || !leadId || submittingLost) return;
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
        .eq("id", leadId);

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: leadId,
        metadata: { new_stage: "lost", loss_reason: lostReason.trim(), estimated_renewal_date: lostRenewalDate },
      });

      toast.success("Moved to Lost");
      setLostModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSubmittingLost(false);
    }
  };

  const handleSoldSubmit = async () => {
    if (!user || !leadId) return;
    const validPolicies = soldPolicies.filter(p => p.carrier.trim() && p.policy_number.trim() && p.effective_date && p.annual_premium);
    if (validPolicies.length === 0) {
      toast.error("Please fill in at least one policy with all required fields");
      return;
    }

    setSubmittingSold(true);
    try {
      let formDataSnapshot: Record<string, any> | null = null;
      if (lead?.submission_id) {
        const { data: app } = await supabase
          .from("insurance_applications")
          .select("form_data")
          .eq("submission_id", lead.submission_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (app?.form_data) formDataSnapshot = app.form_data as Record<string, any>;
      }

      await Promise.all(validPolicies.map(async (pf) => {
        const { error } = await supabase.from("policies").insert({
          lead_id: leadId,
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
        object_id: leadId,
        metadata: { policies_count: validPolicies.length },
      });

      toast.success(`Marked as Sold with ${validPolicies.length} ${validPolicies.length === 1 ? "policy" : "policies"}!`);
      setSoldModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmittingSold(false);
    }
  };

  const addNote = async () => {
    if (!user || !leadId || !noteText.trim()) return;
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: leadId,
      user_id: user.id,
      note_text: noteText.trim(),
    });

    if (error) {
      toast.error("Failed to add note");
    } else {
      setNoteText("");
      loadData();
    }
  };

  const submitPolicy = async () => {
    if (!user || !leadId) return;
    if (!newPolicy.carrier || !newPolicy.line_of_business || !newPolicy.policy_number || !newPolicy.effective_date || !newPolicy.annual_premium) {
      toast.error("All fields are required");
      return;
    }

    // Snapshot form_data from the linked submission (if any)
    let formDataSnapshot: Record<string, any> | null = null;
    if (lead?.submission_id) {
      const { data: app } = await supabase
        .from("insurance_applications")
        .select("form_data")
        .eq("submission_id", lead.submission_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (app?.form_data) formDataSnapshot = app.form_data as Record<string, any>;
    }

    const { data, error } = await supabase
      .from("policies")
      .insert({
        lead_id: leadId,
        producer_user_id: user.id,
        carrier: newPolicy.carrier,
        line_of_business: newPolicy.line_of_business,
        policy_number: newPolicy.policy_number,
        effective_date: newPolicy.effective_date,
        annual_premium: parseFloat(newPolicy.annual_premium),
        status: "approved" as any,
        approved_at: new Date().toISOString(),
        approved_by_user_id: user.id,
        ...(formDataSnapshot ? { form_data_snapshot: formDataSnapshot } : {}),
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to add policy");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "policy_added",
        object_type: "policy",
        object_id: data.id,
      });
      toast.success("Policy added!");
      setNewPolicy({ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" });
      setPolicyOpen(false);
      loadData();
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!user || !confirm("Delete this policy? This cannot be undone.")) return;
    // Delete associated documents first
    await supabase.from("policy_documents").delete().eq("policy_id", policyId);
    const { error } = await supabase.from("policies").delete().eq("id", policyId);
    if (error) {
      toast.error("Failed to delete policy");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "delete",
        object_type: "policy",
        object_id: policyId,
      });
      toast.success("Policy deleted");
      loadData();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        {/* Tabs skeleton */}
        <Skeleton className="h-10 w-80 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-6 w-24 mb-3" />
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!lead) {
    return (
      <AppLayout>
        <p className="text-center text-muted-foreground py-20">Lead not found.</p>
      </AppLayout>
    );
  }

  const hasApprovedPolicy = policies.some((p) => p.status === "approved");

  return (
    <AppLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pipeline")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl">{lead.account_name}</h1>
              {hasApprovedPolicy ? (
                <Badge className="bg-success/20 text-success text-[10px] uppercase tracking-wider">Sold</Badge>
              ) : (
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STAGE_COLORS[lead.stage]}`}>
                  {lead.stage}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground font-sans">
              {lead.contact_name && <span>{lead.contact_name}</span>}
              {lead.email && <span>{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
              {lead.state && <span>{lead.state}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Show workspace buttons for all linked submissions */}
            {submissions.length > 0 ? (
              submissions.length === 1 ? (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/acord/acord-125/${submissions[0].id}`)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open </span>Workspace
                </Button>
              ) : (
                <Select onValueChange={(subId) => navigate(`/acord/acord-125/${subId}`)}>
                  <SelectTrigger className="w-[160px] sm:w-[180px] h-9 text-xs">
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder={`Workspace (${submissions.length})`} />
                  </SelectTrigger>
                  <SelectContent>
                    {submissions.map((s, i) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.company_name || `Submission ${i + 1}`} — {new Date(s.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : lead.submission_id ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/acord/acord-125/${lead.submission_id}`)}>
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open </span>Workspace
              </Button>
            ) : null}
            {!hasApprovedPolicy && (
              <Select value={lead.stage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="quoting">Quoting</SelectItem>
                  <SelectItem value="presenting">Presenting</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              const tabList = document.querySelector('[data-tab-loss-runs]');
              if (tabList) (tabList as HTMLElement).click();
            }}>
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Request </span>Loss Runs
            </Button>
            {hasApprovedPolicy && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
                if (!user || !leadId) return;
                try {
                  const { data: newSub, error } = await supabase
                    .from("business_submissions")
                    .insert({
                      user_id: user.id,
                      company_name: lead.account_name,
                      description: `Additional policy for ${lead.account_name}`,
                      status: "pending",
                      lead_id: leadId,
                    } as any)
                    .select()
                    .single();
                  if (error) throw error;
                  toast.success("New policy created — opening workspace");
                  navigate(`/acord/acord-125/${newSub.id}`);
                } catch (err: any) {
                  toast.error(err.message || "Failed to create policy");
                }
              }}>
                <Plus className="h-3.5 w-3.5" />
                Add Policy
              </Button>
            )}
            <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add Policy</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 mt-2">
                  <div>
                    <Label>Carrier *</Label>
                    <Input
                      value={newPolicy.carrier}
                      onChange={(e) => setNewPolicy({ ...newPolicy, carrier: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Line of Business *</Label>
                    <Input
                      value={newPolicy.line_of_business}
                      onChange={(e) => setNewPolicy({ ...newPolicy, line_of_business: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Policy Number *</Label>
                      <Input
                        value={newPolicy.policy_number}
                        onChange={(e) => setNewPolicy({ ...newPolicy, policy_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Effective Date *</Label>
                      <Input
                        type="date"
                        value={newPolicy.effective_date}
                        onChange={(e) => setNewPolicy({ ...newPolicy, effective_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Annual Premium *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPolicy.annual_premium}
                      onChange={(e) => setNewPolicy({ ...newPolicy, annual_premium: e.target.value })}
                      placeholder="$0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-sans">
                    Revenue: ${newPolicy.annual_premium ? (parseFloat(newPolicy.annual_premium) * 0.12).toFixed(2) : "0.00"} (12% of premium)
                  </p>
                  <Button onClick={submitPolicy}>Add Policy</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-4 sm:mt-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="intake-data">Intake Data</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="loss-runs" data-tab-loss-runs>Loss Runs</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          {/* Renewal Reminders */}
          {(() => {
            const renewalPolicies = policies.filter((p) => {
              if (p.status !== "approved") return false;
              const renewalDate = addYears(parseISO(p.effective_date), 1);
              const daysUntil = differenceInDays(renewalDate, new Date());
              return daysUntil >= 0 && daysUntil <= 90;
            });
            if (renewalPolicies.length === 0) return null;
            return (
              <div className="mb-4 space-y-2">
                {renewalPolicies.map((p) => {
                  const renewalDate = addYears(parseISO(p.effective_date), 1);
                  const daysUntil = differenceInDays(renewalDate, new Date());
                  const urgency = daysUntil <= 30 ? "destructive" : daysUntil <= 60 ? "warning" : "muted";
                  return (
                    <div key={p.id} className={`flex items-center justify-between rounded-lg border p-3 ${
                      urgency === "destructive" ? "border-destructive/40 bg-destructive/5" :
                      urgency === "warning" ? "border-accent/40 bg-accent/5" :
                      "border-border bg-muted/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${
                          urgency === "destructive" ? "text-destructive" :
                          urgency === "warning" ? "text-accent" :
                          "text-muted-foreground"
                        }`} />
                        <div>
                          <p className="text-sm font-medium font-sans">
                            {p.carrier} — {p.line_of_business} renews in {daysUntil} days
                          </p>
                          <p className="text-xs text-muted-foreground font-sans">
                            #{p.policy_number} · Renewal: {renewalDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        disabled={creatingRenewalEvent === p.id}
                        onClick={async () => {
                          if (creatingRenewalEvent) return;
                          setCreatingRenewalEvent(p.id);
                          try {
                            const { error } = await supabase.from("calendar_events").insert({
                              user_id: user!.id,
                              title: `Renewal Review — ${lead.account_name} (${p.line_of_business})`,
                              event_type: "renewal_review" as any,
                              start_time: new Date().toISOString(),
                              end_time: new Date(Date.now() + 30 * 60000).toISOString(),
                              description: `Policy ${p.policy_number} with ${p.carrier} renews on ${renewalDate.toLocaleDateString()}.\n\nPremium: $${Number(p.annual_premium).toLocaleString()}\n\n🔗 View in AURA: /pipeline/${leadId}`,
                              lead_id: leadId,
                              provider: "aura",
                              status: "scheduled" as any,
                            } as any);
                            if (error) {
                              toast.error("Failed to create renewal event");
                            } else {
                              toast.success("Renewal review event created on your calendar!");
                              try {
                                const { getAuthHeaders } = await import("@/lib/auth-fetch");
                                const headers = await getAuthHeaders();
                                const { data: calendars } = await supabase
                                  .from("external_calendars")
                                  .select("provider")
                                  .eq("user_id", user!.id)
                                  .eq("is_active", true);
                                for (const cal of calendars || []) {
                                  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify({
                                      action: "create_event",
                                      provider: cal.provider,
                                      title: `Renewal Review — ${lead.account_name} (${p.line_of_business})`,
                                      start: new Date().toISOString(),
                                      end: new Date(Date.now() + 30 * 60000).toISOString(),
                                      description: `Policy ${p.policy_number} with ${p.carrier} renews on ${renewalDate.toLocaleDateString()}.`,
                                    }),
                                  });
                                }
                              } catch { /* silent */ }
                            }
                          } finally {
                            setCreatingRenewalEvent(null);
                          }
                        }}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        {creatingRenewalEvent === p.id ? "Creating…" : "Schedule Review"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Schedule Presentation button for presenting stage */}
          {lead.stage === "presenting" && !hasApprovedPolicy && (
            <div className="mb-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarDays className="h-4 w-4" />
                Schedule Presentation
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Policies */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl">Policies</h2>
              {policies.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-sans">No policies submitted yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {policies.map((p) => {
                    const StatusIcon = POLICY_STATUS_ICONS[p.status] || Clock;
                    return (
                      <Card key={p.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <StatusIcon className={`h-4 w-4 ${
                                  p.status === "approved" ? "text-success" : p.status === "rejected" ? "text-destructive" : "text-muted-foreground"
                                }`} />
                                <span className="font-medium text-sm font-sans">{p.carrier}</span>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                  {p.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground font-sans space-y-0.5">
                                <p>{p.line_of_business} · #{p.policy_number}</p>
                                <p>Effective: {new Date(p.effective_date).toLocaleDateString()}</p>
                                {p.rejection_reason && (
                                  <p className="text-destructive">Rejected: {p.rejection_reason}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex items-start gap-2">
                              <div>
                                <p className="font-semibold text-sm font-sans">${Number(p.annual_premium).toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground font-sans">
                                  Rev: ${Number(p.revenue).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => deletePolicy(p.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete policy"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Add Policy bubble button */}
                  <button
                    onClick={() => setPolicyOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors py-3 text-sm font-sans text-muted-foreground hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Policy
                  </button>
                </div>
              )}

              {/* Submissions / Policies linked to this lead */}
              {submissions.length > 1 && (
                <>
                  <h2 className="text-xl mt-6">Submissions</h2>
                  <div className="space-y-2">
                    {submissions.map((s, i) => (
                      <Card key={s.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/acord/acord-125/${s.id}`)}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium font-sans">{s.company_name || `Submission ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground font-sans">{new Date(s.created_at).toLocaleDateString()} · {s.status}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Edit3 className="h-3 w-3" />
                            Open
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Lead Details Card */}
              <h2 className="text-xl mt-6">Details</h2>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm font-sans">
                    {lead.business_type && (
                      <div>
                        <span className="text-muted-foreground text-xs">Business Type</span>
                        <p>{lead.business_type}</p>
                      </div>
                    )}
                    {lead.lead_source && (
                      <div>
                        <span className="text-muted-foreground text-xs">Lead Source</span>
                        <p>{lead.lead_source}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-xs">Created</span>
                      <p>{new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                     <div>
                       <span className="text-muted-foreground text-xs">Updated</span>
                       <p>{new Date(lead.updated_at).toLocaleDateString()}</p>
                     </div>
                     {lead.loss_reason && (
                       <div className="col-span-2">
                         <span className="text-muted-foreground text-xs flex items-center gap-1">
                           <AlertTriangle className="h-3 w-3 text-destructive" />
                           Loss Reason
                         </span>
                         <p className="text-destructive text-sm">{lead.loss_reason}</p>
                       </div>
                     )}
                     {lead.presenting_details && (
                       <div className="col-span-2">
                         <span className="text-muted-foreground text-xs">Presenting Details</span>
                         <div className="text-sm space-y-0.5">
                           {(lead.presenting_details as any)?.carrier && <p>Carrier: {(lead.presenting_details as any).carrier}</p>}
                           {(lead.presenting_details as any)?.quoted_premium && <p>Quoted: ${Number((lead.presenting_details as any).quoted_premium).toLocaleString()}</p>}
                           {(lead.presenting_details as any)?.notes && <p className="text-muted-foreground">{(lead.presenting_details as any).notes}</p>}
                         </div>
                       </div>
                     )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submission Readiness */}
            <div className="space-y-4">
              <h2 className="text-xl">Submission Readiness</h2>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <ReadinessItem label="Loss runs requested" done={false} />
                  <ReadinessItem label="Loss runs received" done={false} />
                  <ReadinessItem label="BOR authorized" done={borSignatures.some(b => b.status === "signed")} />
                  <ReadinessItem label="Policy submitted" done={policies.length > 0} />
                  <ReadinessItem label="Policy approved" done={hasApprovedPolicy} />
                  <p className="text-[10px] text-muted-foreground font-sans mt-2">
                    Informational only — no hard blocking in V1.
                  </p>
                </CardContent>
              </Card>

              {/* BOR Status Tracker */}
              {borSignatures.length > 0 && (
                <>
                  <h2 className="text-xl flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Broker of Record
                  </h2>
                  {borSignatures.map((bor) => (
                    <Card key={bor.id} className={bor.status === "signed" ? "border-primary/30" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {bor.status === "signed" ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                            )}
                            <span className="text-sm font-medium font-sans">
                              {bor.status === "signed" ? "Signed" : "Pending Signature"}
                            </span>
                          </div>
                          <Badge variant={bor.status === "signed" ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
                            {bor.status === "signed" ? "Executed" : "Awaiting"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                          {bor.carrier_name && (
                            <div>
                              <span className="text-muted-foreground">Carrier</span>
                              <p className="font-medium">{bor.carrier_name}</p>
                            </div>
                          )}
                          {bor.policy_number && (
                            <div>
                              <span className="text-muted-foreground">Policy #</span>
                              <p className="font-medium">{bor.policy_number}</p>
                            </div>
                          )}
                          {bor.selected_lines?.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Lines</span>
                              <p className="font-medium">{bor.selected_lines.join(", ")}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Created</span>
                            <p>{new Date(bor.created_at).toLocaleDateString()}</p>
                          </div>
                          {bor.signed_at && (
                            <div>
                              <span className="text-muted-foreground">Signed</span>
                              <p>{new Date(bor.signed_at).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1.5 flex-1"
                            onClick={async () => {
                              try {
                                const borPdfBytes = await generateBorPdf({
                                  insuredName: bor.insured_name,
                                  insuredAddress: bor.insured_address || "",
                                  carrierName: bor.carrier_name || "",
                                  policyNumber: bor.policy_number || "",
                                  policyEffectiveDate: bor.policy_effective_date || "",
                                  policyExpirationDate: bor.policy_expiration_date || "",
                                  selectedLines: bor.selected_lines || [],
                                  advisorName: "", advisorEmail: "", advisorPhone: "",
                                });
                                if (bor.status === "signed" && bor.signature_data) {
                                  const signedBytes = await applySignatureToBorPdf(borPdfBytes, bor.signature_data, bor.insured_name);
                                  downloadPdf(signedBytes, `BOR_${bor.insured_name.replace(/\s+/g, "_")}_Signed.pdf`);
                                } else {
                                  downloadPdf(borPdfBytes, `BOR_${bor.insured_name.replace(/\s+/g, "_")}.pdf`);
                                }
                              } catch {
                                toast.error("Failed to generate PDF");
                              }
                            }}
                          >
                            <Download className="h-3 w-3" />
                            {bor.status === "signed" ? "Download Signed" : "Download Draft"}
                          </Button>
                          {bor.status !== "signed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1.5"
                              onClick={() => {
                                const url = `${window.location.origin}/bor-sign/${bor.token}`;
                                navigator.clipboard.writeText(url).then(() => toast.success("Signing link copied!")).catch(() => {});
                              }}
                            >
                              <Copy className="h-3 w-3" />
                              Copy Link
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="intake-data">
          <div className="mt-4 max-w-3xl">
            <PersonalIntakeDataView submissions={submissions} />
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="mt-4 max-w-2xl space-y-6">
            {/* Intake Link Section */}
            <IntakeLinkSection leadId={leadId!} submissionId={lead.submission_id} accountName={lead.account_name} contactName={lead.contact_name} contactEmail={lead.email} />

            <div>
              <h2 className="text-xl mb-4">Client Documents</h2>
              <p className="text-sm text-muted-foreground font-sans mb-4">
                Attach loss runs, supplemental forms, previous coverage docs, and more. These are shared across all views for this client.
              </p>
              <ClientDocuments leadId={leadId!} submissionId={lead.submission_id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="loss-runs">
          <div className="mt-4">
            <LossRunsTab leadId={leadId!} accountName={lead.account_name} />
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="max-w-xl mt-4 space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                className="min-h-[60px]"
              />
            </div>
            <Button size="sm" onClick={addNote} disabled={!noteText.trim()} className="w-full">
              Add Note
            </Button>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {notes.map((n) => (
                <Card key={n.id}>
                  <CardContent className="p-3">
                    <p className="text-sm font-sans">{n.note_text}</p>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 font-sans">No notes yet.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Presentation Dialog */}
      {leadId && (
        <SchedulePresentationDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          leadId={leadId}
          leadName={lead.account_name}
          leadEmail={lead.email}
          userId={user?.id || ""}
        />
      )}

      {/* Presenting Modal */}
      <Dialog open={presentingModalOpen} onOpenChange={(open) => { if (!open) setPresentingModalOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Move to Presenting</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground font-sans mb-4">Add the premium lines you are presenting to the client.</p>
          <div className="space-y-3">
            {presentingLines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Line of Business</Label>
                  <Input
                    placeholder="e.g. General Liability"
                    value={line.line_of_business}
                    onChange={(e) => {
                      const updated = [...presentingLines];
                      updated[i].line_of_business = e.target.value;
                      setPresentingLines(updated);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Premium</Label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={line.premium}
                    onChange={(e) => {
                      const updated = [...presentingLines];
                      updated[i].premium = e.target.value;
                      setPresentingLines(updated);
                    }}
                  />
                </div>
                {presentingLines.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setPresentingLines(presentingLines.filter((_, j) => j !== i))}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPresentingLines([...presentingLines, { line_of_business: "", premium: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
            </Button>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea value={presentingNotes} onChange={(e) => setPresentingNotes(e.target.value)} placeholder="Any notes about the presentation..." rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPresentingModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePresentingSubmit} disabled={submittingPresenting}>
              {submittingPresenting ? "Saving…" : "Move to Presenting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lost Modal */}
      <Dialog open={lostModalOpen} onOpenChange={(open) => { if (!open) setLostModalOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why was this lead lost?"
                rows={3}
              />
            </div>
            <div>
              <Label>Estimated Coverage Start Date *</Label>
              <Input
                type="date"
                value={lostRenewalDate}
                onChange={(e) => setLostRenewalDate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1 font-sans">10 months after this date, the lead will be moved back to Prospect for re-engagement.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setLostModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLostSubmit} disabled={submittingLost}>
              {submittingLost ? "Saving…" : "Mark as Lost"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sold Modal */}
      <Dialog open={soldModalOpen} onOpenChange={(open) => { if (!open) setSoldModalOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark as Sold — Enter Policy Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {soldPolicies.map((p, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium font-sans">Policy {i + 1}</span>
                  {soldPolicies.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSoldPolicies(soldPolicies.filter((_, j) => j !== i))}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Carrier *</Label>
                    <Input value={p.carrier} onChange={(e) => { const u = [...soldPolicies]; u[i].carrier = e.target.value; setSoldPolicies(u); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Line of Business</Label>
                    <Input value={p.line_of_business} onChange={(e) => { const u = [...soldPolicies]; u[i].line_of_business = e.target.value; setSoldPolicies(u); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Policy Number *</Label>
                    <Input value={p.policy_number} onChange={(e) => { const u = [...soldPolicies]; u[i].policy_number = e.target.value; setSoldPolicies(u); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Effective Date *</Label>
                    <Input type="date" value={p.effective_date} onChange={(e) => { const u = [...soldPolicies]; u[i].effective_date = e.target.value; setSoldPolicies(u); }} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Annual Premium *</Label>
                    <Input type="number" step="0.01" placeholder="$0.00" value={p.annual_premium} onChange={(e) => { const u = [...soldPolicies]; u[i].annual_premium = e.target.value; setSoldPolicies(u); }} />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => setSoldPolicies([...soldPolicies, { carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" }])}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors py-2.5 text-sm font-sans text-muted-foreground hover:text-primary"
            >
              <Plus className="h-4 w-4" /> Add Another Policy
            </button>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSoldModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSoldSubmit} disabled={submittingSold}>
              {submittingSold ? "Saving…" : "Mark as Sold"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function IntakeLinkSection({ leadId, submissionId, accountName, contactName, contactEmail }: {
  leadId: string;
  submissionId?: string | null;
  accountName: string;
  contactName?: string | null;
  contactEmail?: string | null;
}) {
  const { user } = useAuth();
  const [generatedLink, setGeneratedLink] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!user) return;
    setCreating(true);
    const result = await generateIntakeLink({
      agentId: user.id,
      leadId,
      submissionId,
      customerName: contactName,
      customerEmail: contactEmail,
    });
    if (result) {
      setGeneratedLink(result.url);
      try { await navigator.clipboard.writeText(result.url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      toast.success("Intake link generated!");
    } else {
      toast.error("Failed to generate link");
    }
    setCreating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-sans flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Customer Intake Form
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground font-sans">
          Generate a link to send {accountName} a self-service intake form. Their responses will auto-sync to this client's pipeline and pre-fill ACORD forms.
        </p>
        {!generatedLink ? (
          <Button size="sm" onClick={handleGenerate} disabled={creating} className="gap-1.5 text-xs">
            <ExternalLink className="h-3 w-3" />
            {creating ? "Generating…" : "Generate Intake Link"}
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
            <code className="flex-1 text-xs truncate font-sans">{generatedLink}</code>
            <Button size="sm" variant="ghost" onClick={copyLink} className="h-7 w-7 p-0">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${done ? "bg-success border-success" : "border-muted-foreground/30"}`}>
        {done && <CheckCircle className="h-2.5 w-2.5 text-success-foreground" />}
      </div>
      <span className={`text-xs font-sans ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

function PersonalIntakeDataView({ submissions }: { submissions: { file_urls: any }[] }) {
  // Find the submission that has personal intake form_data
  const intakeSub = submissions.find((s) => s.file_urls?.form_data?.intake_type);
  const fd = intakeSub?.file_urls?.form_data;

  if (!fd) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-sans">No intake submission data available for this lead.</p>
        </CardContent>
      </Card>
    );
  }

  const applicant = fd.applicant || {};
  const sections = fd.sections || {};
  const docs = fd.documents || [];

  return (
    <div className="space-y-4">
      {/* Applicant Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-sans flex items-center gap-2">
            <User className="h-4 w-4" />
            Applicant Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm font-sans">
            {applicant.name && <div><span className="text-muted-foreground text-xs">Name</span><p>{applicant.name}</p></div>}
            {applicant.email && <div><span className="text-muted-foreground text-xs">Email</span><p>{applicant.email}</p></div>}
            {applicant.phone && <div><span className="text-muted-foreground text-xs">Phone</span><p>{applicant.phone}</p></div>}
            {applicant.address && <div className="col-span-2"><span className="text-muted-foreground text-xs">Address</span><p>{[applicant.address, applicant.city, applicant.state, applicant.zip].filter(Boolean).join(", ")}</p></div>}
            {applicant.ownership_status && <div><span className="text-muted-foreground text-xs">Ownership</span><p className="capitalize">{applicant.ownership_status}</p></div>}
            {applicant.has_licensed_drivers && <div><span className="text-muted-foreground text-xs">Licensed Drivers</span><p className="capitalize">{applicant.has_licensed_drivers}</p></div>}
          </div>
        </CardContent>
      </Card>

      {/* Auto Section */}
      {sections.auto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans flex items-center gap-2">
              <Car className="h-4 w-4" />
              Auto — {sections.auto.drivers?.length || 0} Driver(s), {sections.auto.vehicles?.length || 0} Vehicle(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.auto.drivers?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drivers</h4>
                <div className="space-y-2">
                  {sections.auto.drivers.map((d: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3 text-sm font-sans">
                      <p className="font-medium">{d.first_name} {d.last_name}</p>
                      <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                        {d.date_of_birth && <span>DOB: {d.date_of_birth}</span>}
                        {d.license_number && <span>License: {d.license_number}</span>}
                        {d.license_state && <span>State: {d.license_state}</span>}
                        {d.gender && <span>Gender: {d.gender}</span>}
                        {d.marital_status && <span>Status: {d.marital_status}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sections.auto.vehicles?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vehicles</h4>
                <div className="space-y-2">
                  {sections.auto.vehicles.map((v: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3 text-sm font-sans">
                      <p className="font-medium">{v.year} {v.make} {v.model}</p>
                      <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                        {v.vin && <span>VIN: {v.vin}</span>}
                        {v.usage && <span>Usage: {v.usage}</span>}
                        {v.annual_mileage && <span>Miles: {v.annual_mileage}</span>}
                        {v.ownership && <span>Ownership: {v.ownership}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sections.auto.coverage && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Coverage Preferences</h4>
                <div className="grid grid-cols-2 gap-2 text-sm font-sans">
                  {sections.auto.coverage.bodily_injury && <div><span className="text-muted-foreground text-xs">Bodily Injury</span><p>{sections.auto.coverage.bodily_injury}</p></div>}
                  {sections.auto.coverage.property_damage && <div><span className="text-muted-foreground text-xs">Property Damage</span><p>{sections.auto.coverage.property_damage}</p></div>}
                  {sections.auto.coverage.comprehensive_deductible && <div><span className="text-muted-foreground text-xs">Comp Deductible</span><p>{sections.auto.coverage.comprehensive_deductible}</p></div>}
                  {sections.auto.coverage.collision_deductible && <div><span className="text-muted-foreground text-xs">Collision Deductible</span><p>{sections.auto.coverage.collision_deductible}</p></div>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Home Section */}
      {sections.home && sections.home.properties?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans flex items-center gap-2">
              <Home className="h-4 w-4" />
              Homeowners — {sections.home.properties.length} Property/Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sections.home.properties.map((p: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 text-sm font-sans">
                  <p className="font-medium">{p.address || `Property ${i + 1}`}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                    {p.year_built && <span>Year Built: {p.year_built}</span>}
                    {p.square_footage && <span>Sq Ft: {p.square_footage}</span>}
                    {p.construction_type && <span>Construction: {p.construction_type}</span>}
                    {p.dwelling_value && <span>Dwelling: ${Number(p.dwelling_value).toLocaleString()}</span>}
                    {p.roof_type && <span>Roof: {p.roof_type}</span>}
                    {p.heating_type && <span>Heating: {p.heating_type}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Umbrella Section */}
      {sections.umbrella && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans flex items-center gap-2">
              <Umbrella className="h-4 w-4" />
              Umbrella
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-sans">
              <span className="text-muted-foreground text-xs">Requested Limit</span>
              <p>${Number(sections.umbrella.requested_limit || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boat Section */}
      {sections.boat?.boats?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Watercraft — {sections.boat.boats.length} Boat(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections.boat.boats.map((b: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 text-sm font-sans">
                  <p className="font-medium">{b.year} {b.make} {b.model}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                    {b.hull_id && <span>Hull ID: {b.hull_id}</span>}
                    {b.length && <span>Length: {b.length}ft</span>}
                    {b.value && <span>Value: ${Number(b.value).toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flood */}
      {sections.flood && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-sans">Flood Insurance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm font-sans">
              {sections.flood.property_address && <div className="col-span-2"><span className="text-muted-foreground text-xs">Property</span><p>{sections.flood.property_address}</p></div>}
              {sections.flood.flood_zone && <div><span className="text-muted-foreground text-xs">Flood Zone</span><p>{sections.flood.flood_zone}</p></div>}
              {sections.flood.building_value && <div><span className="text-muted-foreground text-xs">Building Value</span><p>${Number(sections.flood.building_value).toLocaleString()}</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recreational Vehicles */}
      {sections.recreational?.vehicles?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-sans">Recreational Vehicles — {sections.recreational.vehicles.length}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections.recreational.vehicles.map((v: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 text-sm font-sans">
                  <p className="font-medium">{v.type}: {v.year} {v.make} {v.model}</p>
                  {v.vin && <p className="text-xs text-muted-foreground mt-1">VIN: {v.vin}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Articles */}
      {sections.personal_articles?.items?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-sans">Personal Articles — {sections.personal_articles.items.length} Item(s)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections.personal_articles.items.map((item: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 text-sm font-sans flex items-center justify-between">
                  <span>{item.description || `Item ${i + 1}`}</span>
                  {item.value && <span className="font-medium">${Number(item.value).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attached Documents */}
      {docs.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-sans">Attached Documents — {docs.length}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docs.map((doc: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border p-3 text-sm font-sans">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{doc.name || `Document ${i + 1}`}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{doc.type || "file"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {fd.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-sans">Client Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-sans text-muted-foreground whitespace-pre-wrap">{fd.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
