import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, CheckCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { LossRunBadge } from "@/components/LossRunBadge";

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
  created_at: string;
  updated_at: string;
  has_approved_policy?: boolean;
  submission_id?: string | null;
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

export default function Pipeline() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    account_name: "",
    contact_name: "",
    phone: "",
    email: "",
    state: "",
    business_type: "",
    lead_source: "",
  });

  const [lossRunStatuses, setLossRunStatuses] = useState<Record<string, string>>({});

  // Drag-and-drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Sold modal state
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [soldLeadId, setSoldLeadId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState({
    carrier: "",
    line_of_business: "",
    policy_number: "",
    effective_date: "",
    annual_premium: "",
  });
  const [submittingSold, setSubmittingSold] = useState(false);

  const loadLeads = useCallback(async () => {
    if (!user) return;
    const [leadsRes, approvedRes, lossRunRes] = await Promise.all([
      supabase.from("leads").select("*").order("updated_at", { ascending: false }),
      supabase.from("policies").select("lead_id").eq("status", "approved"),
      supabase.from("loss_run_requests").select("lead_id, status"),
    ]);

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
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleAddLead = async () => {
    if (!user || !newLead.account_name.trim()) return;
    const { error } = await supabase.from("leads").insert({
      account_name: newLead.account_name.trim(),
      contact_name: newLead.contact_name || null,
      phone: newLead.phone || null,
      email: newLead.email || null,
      state: newLead.state || null,
      business_type: newLead.business_type || null,
      lead_source: newLead.lead_source || null,
      owner_user_id: user.id,
    });

    if (error) {
      toast.error("Failed to add lead");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "create",
        object_type: "lead",
        object_id: "00000000-0000-0000-0000-000000000000",
      });
      toast.success("Lead added!");
      setNewLead({ account_name: "", contact_name: "", phone: "", email: "", state: "", business_type: "", lead_source: "" });
      setAddOpen(false);
      loadLeads();
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
      setPolicyForm({ carrier: "", line_of_business: "", policy_number: "", effective_date: "", annual_premium: "" });
      setSoldModalOpen(true);
    } else {
      // Regular stage move
      await moveStage(leadId, targetStage);
      toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
    }
    setDraggedLeadId(null);
  };

  const handleSoldSubmit = async () => {
    if (!user || !soldLeadId) return;
    if (!policyForm.carrier.trim() || !policyForm.policy_number.trim() || !policyForm.effective_date || !policyForm.annual_premium) {
      toast.error("Please fill in all required fields");
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

      // Create an approved policy for this lead
      const { error } = await supabase.from("policies").insert({
        lead_id: soldLeadId,
        producer_user_id: user.id,
        carrier: policyForm.carrier.trim(),
        line_of_business: policyForm.line_of_business.trim() || "General",
        policy_number: policyForm.policy_number.trim(),
        effective_date: policyForm.effective_date,
        annual_premium: parseFloat(policyForm.annual_premium) || 0,
        status: "approved" as any,
        approved_at: new Date().toISOString(),
        approved_by_user_id: user.id,
        ...(formDataSnapshot ? { form_data_snapshot: formDataSnapshot } : {}),
      } as any);

      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "policy_sold",
        object_type: "lead",
        object_id: soldLeadId,
        metadata: { carrier: policyForm.carrier, policy_number: policyForm.policy_number },
      });

      toast.success("Policy added — lead moved to Sold!");
      setSoldModalOpen(false);
      setSoldLeadId(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || "Failed to create policy");
    } finally {
      setSubmittingSold(false);
    }
  };

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.account_name.toLowerCase().includes(q) ||
      (l.contact_name || "").toLowerCase().includes(q) ||
      (l.business_type || "").toLowerCase().includes(q)
    );
  });

  const columns = [...STAGES, "sold" as const];
  const grouped: Record<string, Lead[]> = {};
  columns.forEach((s) => (grouped[s] = []));

  filtered.forEach((l) => {
    if (l.has_approved_policy) {
      grouped["sold"].push(l);
    } else {
      grouped[l.stage]?.push(l);
    }
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

  const soldLead = soldLeadId ? leads.find((l) => l.id === soldLeadId) : null;

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-4xl">Pipeline</h1>
          <p className="text-muted-foreground font-sans text-sm mt-1">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} — drag between stages to manage your pipeline.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
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
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    type="email"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={newLead.state}
                    onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Business Type</Label>
                  <Input
                    value={newLead.business_type}
                    onChange={(e) => setNewLead({ ...newLead, business_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lead Source</Label>
                  <Input
                    value={newLead.lead_source}
                    onChange={(e) => setNewLead({ ...newLead, lead_source: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddLead} disabled={!newLead.account_name.trim()}>
                Add Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
      <div className="grid grid-cols-5 gap-3 min-h-[60vh]">
        {columns.map((stage) => (
          <div key={stage} className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </Badge>
              <span className="text-xs text-muted-foreground font-sans">{grouped[stage].length}</span>
            </div>
            <div
              className={`flex-1 space-y-2 rounded-lg border border-dashed p-2 min-h-[200px] transition-colors ${
                dragOverStage === stage
                  ? "border-primary bg-primary/5"
                  : "border-border/50 bg-muted/30"
              }`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {grouped[stage].map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  className={`transition-opacity ${draggedLeadId === lead.id ? "opacity-40" : ""}`}
                >
                  <Link to={`/pipeline/${lead.id}`}>
                    <Card className="hover-lift cursor-grab active:cursor-grabbing">
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
                            {lead.business_type && (
                              <p className="text-[10px] text-muted-foreground font-sans mt-1 ml-[18px]">{lead.business_type}</p>
                            )}
                          </div>
                          {lead.has_approved_policy && (
                            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
              {grouped[stage].length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-8 font-sans">
                  {stage === "sold" ? "Drop here to mark as sold" : "No leads"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sold Policy Modal */}
      <Dialog open={soldModalOpen} onOpenChange={(open) => { if (!open) { setSoldModalOpen(false); setSoldLeadId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Policy Details — {soldLead?.account_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground font-sans">
            Enter the bound policy details to move this lead to Sold.
          </p>
          <div className="grid gap-3 mt-2">
            <div>
              <Label>Carrier *</Label>
              <Input
                value={policyForm.carrier}
                onChange={(e) => setPolicyForm({ ...policyForm, carrier: e.target.value })}
                placeholder="e.g. Hartford, Travelers"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Line of Business</Label>
                <Input
                  value={policyForm.line_of_business}
                  onChange={(e) => setPolicyForm({ ...policyForm, line_of_business: e.target.value })}
                  placeholder="e.g. General Liability"
                />
              </div>
              <div>
                <Label>Policy Number *</Label>
                <Input
                  value={policyForm.policy_number}
                  onChange={(e) => setPolicyForm({ ...policyForm, policy_number: e.target.value })}
                  placeholder="e.g. GL-12345"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective Date *</Label>
                <Input
                  type="date"
                  value={policyForm.effective_date}
                  onChange={(e) => setPolicyForm({ ...policyForm, effective_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Annual Premium *</Label>
                <Input
                  type="number"
                  value={policyForm.annual_premium}
                  onChange={(e) => setPolicyForm({ ...policyForm, annual_premium: e.target.value })}
                  placeholder="e.g. 12000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSoldModalOpen(false); setSoldLeadId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSoldSubmit} disabled={submittingSold}>
              {submittingSold ? "Saving…" : "Mark as Sold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
