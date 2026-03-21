import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserBranch } from "@/hooks/useUserBranch";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Building2, DollarSign, Loader2, RefreshCw,
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
  updated_at: string;
};

export default function ConnectPipelineTab() {
  const { user } = useAuth();
  const { branch } = useUserBranch();
  const [industry, setIndustry] = useState<string | null>(null);
  const [profileIndustry, setProfileIndustry] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Load user's industry from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("industry").eq("user_id", user.id).single().then(({ data }) => {
      setProfileIndustry(data?.industry || null);
      setLoadingProfile(false);
    });
  }, [user]);

  // Determine industry
  useEffect(() => {
    const fromBranch = branchToIndustry(branch);
    setIndustry(fromBranch || profileIndustry || null);
  }, [branch, profileIndustry]);

  // Fetch leads from DB
  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoadingLeads(true);
    const { data } = await supabase
      .from("leads")
      .select("id, account_name, contact_name, email, phone, stage, target_premium, lead_source, business_type, updated_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoadingLeads(false);
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const config = industry ? PIPELINE_CONFIGS[industry] : null;
  const stages = config?.stages || [];

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

  // Industry picker if not set
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
          <Button size="sm" className="gap-1.5 h-8" asChild>
            <Link to="/pipeline"><Plus className="h-3.5 w-3.5" /> Add Lead</Link>
          </Button>
        </div>
      </div>

      {/* Kanban-style columns */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map(stage => {
          // Map the stage key to matching leads (bound = leads with approved policies would show differently on main pipeline, but here we use the stage field directly)
          const stageLeads = leads.filter(l => l.stage === stage.key);
          const totalValue = stageLeads.reduce((sum, l) => sum + (l.target_premium || 0), 0);
          return (
            <div key={stage.key} className="space-y-2">
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
                {stageLeads.map(lead => (
                  <Card key={lead.id} className="group">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <Link to={`/pipeline?lead=${lead.id}`} className="text-xs font-medium truncate hover:underline">
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
                      {/* Stage mover */}
                      <Select value={lead.stage} onValueChange={(v) => moveStage(lead.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(s => (
                            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {leads.length === 0 && !loadingLeads && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No leads yet. Add leads from the main Pipeline page.</p>
            <Button size="sm" className="mt-3" asChild>
              <Link to="/pipeline"><Plus className="h-3.5 w-3.5 mr-1" /> Go to Pipeline</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
