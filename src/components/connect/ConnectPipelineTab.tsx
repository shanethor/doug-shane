import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserBranch } from "@/hooks/useUserBranch";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, Building2, DollarSign, Loader2, RefreshCw, Users, Info, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

// ─── Industry Pipeline Configs ───

interface StageConfig {
  key: string;
  label: string;
  color: string;
}

const PIPELINE_CONFIGS: Record<string, { label: string; stages: StageConfig[] }> = {
  insurance: {
    label: "Insurance",
    stages: [
      { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "quoting", label: "Quoting", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "presenting", label: "Presenting", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "bound", label: "Bound", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  mortgage: {
    label: "Mortgage / Property",
    stages: [
      { key: "prospect", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "quoting", label: "Pre-Approval", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
      { key: "presenting", label: "Processing", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "bound", label: "Funded", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  wealth: {
    label: "Wealth Management",
    stages: [
      { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "quoting", label: "Discovery", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "presenting", label: "Proposal", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "bound", label: "Onboarded", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  real_estate: {
    label: "Real Estate",
    stages: [
      { key: "prospect", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "quoting", label: "Showing", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "presenting", label: "Under Contract", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "bound", label: "Closed", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  consulting: {
    label: "Consulting / Professional Services",
    stages: [
      { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "quoting", label: "Proposal", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "presenting", label: "Engagement", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "bound", label: "Delivered", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  generic: {
    label: "General Business",
    stages: [
      { key: "prospect", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "quoting", label: "Qualified", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "presenting", label: "Negotiation", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "bound", label: "Won", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
};

function branchToIndustry(branch: string | null): string | null {
  if (branch === "risk") return "insurance";
  if (branch === "property") return "mortgage";
  if (branch === "wealth") return "wealth";
  return null;
}

type Lead = {
  id: string;
  account_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  target_premium: number | null;
  lead_source: string | null;
  business_type: string | null;
  loss_reason: string | null;
  estimated_renewal_date: string | null;
  updated_at: string;
};

const COLUMN_LIMIT = 5;

export default function ConnectPipelineTab() {
  const { user } = useAuth();
  const { branch } = useUserBranch();
  const [industry, setIndustry] = useState<string | null>(null);
  const [profileIndustry, setProfileIndustry] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({ account_name: "", contact_name: "", email: "", phone: "", target_premium: "", lead_source: "", stage: "prospect" });
  const [addingLead, setAddingLead] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    setDropTarget(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(stageKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column container itself
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDropTarget(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.stage !== stageKey) {
        moveStage(leadId, stageKey);
      }
    }
    setDraggedLeadId(null);
  };

  const handleAddLead = async () => {
    if (!user || !newLead.account_name.trim()) { toast.error("Account name is required"); return; }
    setAddingLead(true);
    const { error } = await supabase.from("leads").insert({
      account_name: newLead.account_name.trim(),
      contact_name: newLead.contact_name.trim() || null,
      email: newLead.email.trim() || null,
      phone: newLead.phone.trim() || null,
      target_premium: Number(newLead.target_premium) || null,
      lead_source: newLead.lead_source.trim() || null,
      stage: newLead.stage as any,
      owner_user_id: user.id,
    });
    setAddingLead(false);
    if (error) { toast.error("Failed to add lead"); return; }
    toast.success(`${newLead.account_name} added to pipeline`);
    setAddLeadOpen(false);
    setNewLead({ account_name: "", contact_name: "", email: "", phone: "", target_premium: "", lead_source: "", stage: "prospect" });
    fetchLeads();
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("industry").eq("user_id", user.id).single().then(({ data }) => {
      setProfileIndustry(data?.industry || null);
      setLoadingProfile(false);
    });
  }, [user]);

  useEffect(() => {
    const fromBranch = branchToIndustry(branch);
    setIndustry(fromBranch || profileIndustry || null);
  }, [branch, profileIndustry]);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoadingLeads(true);
    const { data } = await supabase
      .from("leads")
      .select("id, account_name, contact_name, email, phone, stage, target_premium, lead_source, business_type, loss_reason, estimated_renewal_date, updated_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoadingLeads(false);
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const config = industry ? PIPELINE_CONFIGS[industry] : null;
  const allStages = config?.stages || [];
  const activeStages = allStages.filter(s => s.key !== "lost");
  const lostStageConfig = allStages.find(s => s.key === "lost");

  const lostLeads = leads.filter(l => l.stage === "lost");
  const activeLeads = leads.filter(l => l.stage !== "lost");

  const toggleColumnExpand = (stage: string) => {
    setExpandedColumns(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const moveStage = async (leadId: string, newStage: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage as any, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) { toast.error("Failed to move lead"); return; }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
  };

  const handleSelectIndustry = async (ind: string) => {
    setIndustry(ind);
    if (user) {
      await supabase.from("profiles").update({ industry: ind }).eq("user_id", user.id);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!industry) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Select Your Industry
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your industry to get a tailored pipeline with the right stages for your business.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(PIPELINE_CONFIGS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleSelectIndustry(key)}
                className="p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all text-left space-y-1"
              >
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {cfg.stages.filter(s => s.key !== "lost").map(s => s.label).join(" → ")}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {config?.label} Pipeline
          </h3>
          <p className="text-xs text-muted-foreground">
            Synced with your main pipeline &amp; sourced leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={industry} onValueChange={handleSelectIndustry}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PIPELINE_CONFIGS).map(([key, cfg]) => (
                <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={fetchLeads} disabled={loadingLeads}>
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLeads ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8"><Plus className="h-3.5 w-3.5" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label className="text-xs">Account / Company Name *</Label>
                  <Input value={newLead.account_name} onChange={e => setNewLead(p => ({...p, account_name: e.target.value}))} placeholder="Acme Corp" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Contact Name</Label>
                    <Input value={newLead.contact_name} onChange={e => setNewLead(p => ({...p, contact_name: e.target.value}))} placeholder="John Smith" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={newLead.email} onChange={e => setNewLead(p => ({...p, email: e.target.value}))} placeholder="john@acme.com" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Est. Premium / Value</Label>
                    <Input type="number" value={newLead.target_premium} onChange={e => setNewLead(p => ({...p, target_premium: e.target.value}))} placeholder="10000" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Lead Source</Label>
                    <Input value={newLead.lead_source} onChange={e => setNewLead(p => ({...p, lead_source: e.target.value}))} placeholder="Referral" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Stage</Label>
                  <Select value={newLead.stage} onValueChange={v => setNewLead(p => ({...p, stage: v}))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allStages.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddLeadOpen(false)}>Cancel</Button>
                <Button onClick={handleAddLead} disabled={addingLead || !newLead.account_name.trim()}>
                  {addingLead ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban columns — active stages only (no lost) */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(0, 1fr))` }}>
        {activeStages.map(stage => {
          const stageLeads = activeLeads.filter(l => l.stage === stage.key);
          const totalValue = stageLeads.reduce((sum, l) => sum + (l.target_premium || 0), 0);
          const visibleLeads = expandedColumns[stage.key] ? stageLeads : stageLeads.slice(0, COLUMN_LIMIT);
          const isOver = dropTarget === stage.key;
          return (
            <div
              key={stage.key}
              className={`space-y-2 rounded-lg transition-all duration-200 ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className={`rounded-lg px-3 py-2 border ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <Badge variant="secondary" className="text-[9px] h-5">{stageLeads.length}</Badge>
                </div>
                {totalValue > 0 && (
                  <p className="text-[10px] mt-0.5 opacity-70">
                    ${totalValue.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {visibleLeads.map(lead => (
                  <Card
                    key={lead.id}
                    className={`group cursor-grab active:cursor-grabbing transition-all ${draggedLeadId === lead.id ? "opacity-50 scale-95" : "hover:border-primary/30"}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <Link to={`/pipeline/${lead.id}`} className="text-xs font-medium truncate hover:underline" onClick={e => { if (draggedLeadId) e.preventDefault(); }}>
                          {lead.account_name}
                        </Link>
                      </div>
                      {lead.contact_name && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {lead.contact_name}
                        </p>
                      )}
                      {lead.lead_source && (
                        <Badge variant="outline" className="text-[9px] h-4">
                          {lead.lead_source}
                        </Badge>
                      )}
                      {lead.target_premium && lead.target_premium > 0 && (
                        <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                          <DollarSign className="h-2.5 w-2.5" /> {lead.target_premium.toLocaleString()}
                        </p>
                      )}
                      <Select value={lead.stage} onValueChange={(v) => moveStage(lead.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allStages.map(s => (
                            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
                {stageLeads.length > COLUMN_LIMIT && (
                  <button
                    onClick={() => toggleColumnExpand(stage.key)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
                  >
                    {expandedColumns[stage.key]
                      ? "Show less"
                      : `Show all ${stageLeads.length} leads`}
                  </button>
                )}
              </div>
              {stageLeads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No leads</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Lost Section — centered at bottom */}
      {lostStageConfig && (
        <div className="rounded-lg border-2 border-dashed border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${lostStageConfig.color}`}>
                {lostStageConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{lostLeads.length}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  Client went in another direction. Move leads here to mark as lost.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Move leads here to mark as lost</p>
              {lostLeads.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                      <Users className="h-3 w-3" />
                      View All Lost ({lostLeads.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Lost Clients ({lostLeads.length})</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                      {lostLeads.map((lead) => (
                        <Link key={lead.id} to={`/pipeline/${lead.id}`}>
                          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardContent className="p-2 px-3 flex items-center gap-2">
                              <span className="text-sm font-medium">{lead.account_name}</span>
                              {lead.estimated_renewal_date && (
                                <Badge variant="outline" className="text-[9px] gap-0.5">
                                  <CalendarDays className="h-2.5 w-2.5" />
                                  {lead.estimated_renewal_date}
                                </Badge>
                              )}
                              {lead.loss_reason && (
                                <span className="text-[10px] text-muted-foreground ml-auto">{lead.loss_reason}</span>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      )}

      {leads.length === 0 && !loadingLeads && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No leads yet. Add leads from the main Pipeline page.</p>
            <Button size="sm" className="mt-3" asChild>
              <Link to="/insurance/pipeline"><Plus className="h-3.5 w-3.5 mr-1" /> Go to Pipeline</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
