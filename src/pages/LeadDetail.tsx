import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
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
import { ArrowLeft, Plus, FileText, CheckCircle, Clock, XCircle, MessageSquare, Send, Edit3, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LossRunsTab } from "@/components/LossRunsTab";
import { ClientDocuments } from "@/components/ClientDocuments";

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
  const [noteText, setNoteText] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    carrier: "",
    line_of_business: "",
    policy_number: "",
    effective_date: "",
    annual_premium: "",
  });

  const loadData = useCallback(async () => {
    if (!user || !leadId) return;
    const [leadRes, policiesRes, notesRes] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase.from("policies").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    ]);

    setLead(leadRes.data);
    setPolicies(policiesRes.data ?? []);
    setNotes(notesRes.data ?? []);
    setLoading(false);
  }, [user, leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        ...(formDataSnapshot ? { form_data_snapshot: formDataSnapshot } : {}),
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to submit policy");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "submit",
        object_type: "policy",
        object_id: data.id,
      });
      toast.success("Policy submitted for approval!");
      setNewPolicy({ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" });
      setPolicyOpen(false);
      loadData();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl">{lead.account_name}</h1>
              {hasApprovedPolicy ? (
                <Badge className="bg-success/20 text-success text-[10px] uppercase tracking-wider">Sold</Badge>
              ) : (
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STAGE_COLORS[lead.stage]}`}>
                  {lead.stage}
                </Badge>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground font-sans">
              {lead.contact_name && <span>{lead.contact_name}</span>}
              {lead.email && <span>{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
              {lead.state && <span>{lead.state}</span>}
            </div>
          </div>

          <div className="flex gap-2">
            {lead.submission_id && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/acord/acord-125/${lead.submission_id}`)}>
                <Edit3 className="h-3.5 w-3.5" />
                Open Workspace
              </Button>
            )}
            {!hasApprovedPolicy && (
              <Select value={lead.stage} onValueChange={moveStage}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="quoting">Quoting</SelectItem>
                  <SelectItem value="presenting">Presenting</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              const tabList = document.querySelector('[data-tab-loss-runs]');
              if (tabList) (tabList as HTMLElement).click();
            }}>
              <Send className="h-3.5 w-3.5" />
              Request Loss Runs
            </Button>
            <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Submit Bound Policy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Bound Policy</DialogTitle>
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
                  <Button onClick={submitPolicy}>Submit for Approval</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="loss-runs" data-tab-loss-runs>Loss Runs</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
                            <div className="text-right">
                              <p className="font-semibold text-sm font-sans">${Number(p.annual_premium).toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground font-sans">
                                Rev: ${Number(p.revenue).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
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
                  <ReadinessItem label="Policy submitted" done={policies.length > 0} />
                  <ReadinessItem label="Policy approved" done={hasApprovedPolicy} />
                  <p className="text-[10px] text-muted-foreground font-sans mt-2">
                    Informational only — no hard blocking in V1.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="mt-4 max-w-2xl">
            <h2 className="text-xl mb-4">Client Documents</h2>
            <p className="text-sm text-muted-foreground font-sans mb-4">
              Attach loss runs, supplemental forms, previous coverage docs, and more. These are shared across all views for this client.
            </p>
            <ClientDocuments leadId={leadId!} submissionId={lead.submission_id} />
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
    </AppLayout>
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
