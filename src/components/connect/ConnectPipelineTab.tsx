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
  Plus, Building2, User, Phone, Mail, DollarSign, ArrowRight,
  Loader2, GripVertical,
} from "lucide-react";
import { toast } from "sonner";

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
      { key: "lead", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "pre_approval", label: "Pre-Approval", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
      { key: "application", label: "Application", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "processing", label: "Processing", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "underwriting", label: "Underwriting", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
      { key: "closing", label: "Closing", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "funded", label: "Funded", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  wealth: {
    label: "Wealth Management",
    stages: [
      { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "discovery", label: "Discovery", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
      { key: "proposal", label: "Proposal", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "review", label: "Plan Review", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "onboarded", label: "Onboarded", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  real_estate: {
    label: "Real Estate",
    stages: [
      { key: "lead", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "showing", label: "Showing", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
      { key: "offer", label: "Offer", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "under_contract", label: "Under Contract", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "closed", label: "Closed", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  consulting: {
    label: "Consulting / Professional Services",
    stages: [
      { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "proposal", label: "Proposal", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "negotiation", label: "Negotiation", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "engagement", label: "Engagement", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
      { key: "delivered", label: "Delivered", color: "bg-green-500/10 text-green-600 border-green-500/20" },
      { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    ],
  },
  generic: {
    label: "General Business",
    stages: [
      { key: "lead", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      { key: "qualified", label: "Qualified", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
      { key: "proposal", label: "Proposal", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { key: "negotiation", label: "Negotiation", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      { key: "won", label: "Won", color: "bg-green-500/10 text-green-600 border-green-500/20" },
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

// ─── Local pipeline item type (stored in localStorage for now) ───
interface PipelineItem {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: string;
  stage: string;
  created_at: string;
}

const STORAGE_KEY = "aura_connect_pipeline";

function loadItems(): PipelineItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}
function saveItems(items: PipelineItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function ConnectPipelineTab() {
  const { user } = useAuth();
  const { branch } = useUserBranch();
  const [industry, setIndustry] = useState<string | null>(null);
  const [profileIndustry, setProfileIndustry] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [items, setItems] = useState<PipelineItem[]>(loadItems);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", company: "", email: "", phone: "", value: "" });

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
    const resolved = fromBranch || profileIndustry || null;
    setIndustry(resolved);
  }, [branch, profileIndustry]);

  const config = industry ? PIPELINE_CONFIGS[industry] : null;
  const stages = config?.stages || [];

  const handleAddItem = () => {
    if (!newItem.name.trim()) { toast.error("Name is required"); return; }
    const item: PipelineItem = {
      id: crypto.randomUUID(),
      ...newItem,
      stage: stages[0]?.key || "lead",
      created_at: new Date().toISOString(),
    };
    const updated = [...items, item];
    setItems(updated);
    saveItems(updated);
    setNewItem({ name: "", company: "", email: "", phone: "", value: "" });
    setShowAdd(false);
    toast.success("Added to pipeline");
  };

  const moveItem = (id: string, newStage: string) => {
    const updated = items.map(i => i.id === id ? { ...i, stage: newStage } : i);
    setItems(updated);
    saveItems(updated);
  };

  const deleteItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveItems(updated);
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
            Track your deals through each stage
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
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Deal
          </Button>
        </div>
      </div>

      {/* Kanban-style columns */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(stages.length, 6)}, minmax(0, 1fr))` }}>
        {stages.map(stage => {
          const stageItems = items.filter(i => i.stage === stage.key);
          const totalValue = stageItems.reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0);
          return (
            <div key={stage.key} className="space-y-2">
              <div className={`rounded-lg px-3 py-2 border ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <Badge variant="secondary" className="text-[9px] h-5">{stageItems.length}</Badge>
                </div>
                {totalValue > 0 && (
                  <p className="text-[10px] mt-0.5 opacity-70">
                    ${totalValue.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {stageItems.map(item => (
                  <Card key={item.id} className="group">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="text-[10px]">×</span>
                        </button>
                      </div>
                      {item.company && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5" /> {item.company}
                        </p>
                      )}
                      {item.value && (
                        <p className="text-[10px] font-medium text-success flex items-center gap-1">
                          <DollarSign className="h-2.5 w-2.5" /> {parseFloat(item.value).toLocaleString()}
                        </p>
                      )}
                      {/* Stage mover */}
                      <Select value={item.stage} onValueChange={(v) => moveItem(item.id, v)}>
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

      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No deals yet. Click "Add Deal" to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Add Deal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Deal to Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Contact Name *</Label>
              <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Input value={newItem.company} onChange={e => setNewItem(p => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={newItem.email} onChange={e => setNewItem(p => ({ ...p, email: e.target.value }))} placeholder="john@acme.com" type="email" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={newItem.phone} onChange={e => setNewItem(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deal Value ($)</Label>
              <Input value={newItem.value} onChange={e => setNewItem(p => ({ ...p, value: e.target.value }))} placeholder="10000" type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
