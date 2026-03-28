import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserBranch } from "@/hooks/useUserBranch";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Building2, DollarSign, Loader2, RefreshCw, Users, Info, CalendarDays,
  GripVertical, Trophy, Sparkles, Target, TrendingUp, Settings2, Star,
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
  created_at: string;
  won_details: Record<string, string> | null;
};

type TimePeriod = "all" | "month" | "quarter" | "year";

const COLUMN_LIMIT = 5;

// ─── Won Celebration Overlay ───
function WonCelebration({ amount, label, onDone }: { amount: number; label: string; onDone: () => void }) {
  const [countUp, setCountUp] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = 1800;
    const steps = 40;
    const increment = amount / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCountUp(Math.min(Math.round(increment * step), amount));
      if (step >= steps) clearInterval(interval);
    }, duration / steps);

    const timeout = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3200);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [amount, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-400 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(8px)" }}
    >
      <div className="text-center space-y-4 animate-scale-in">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/15" />
          <div className="absolute inset-2 rounded-full animate-pulse border-2 border-emerald-500/40 bg-emerald-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="h-10 w-10 text-amber-400" style={{ filter: "drop-shadow(0 0 12px hsl(45 93% 58% / 0.6))" }} />
          </div>
        </div>
        <div>
          <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Deal Won!
            <Sparkles className="h-5 w-5 text-amber-400" />
          </p>
          <p className="text-4xl font-black mt-2 tabular-nums text-emerald-400" style={{ textShadow: "0 0 30px hsl(140 50% 40% / 0.5)" }}>
            ${countUp.toLocaleString()}
          </p>
          <p className="text-xs mt-2 text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Won Details Dialog ───
function WonDetailsDialog({
  lead, industry, onSave, onCancel,
}: {
  lead: Lead; industry: string;
  onSave: (details: Record<string, string>, finalValue: number) => void;
  onCancel: () => void;
}) {
  const isInsurance = industry === "insurance";
  const isRealEstate = industry === "real_estate";

  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (isInsurance) {
      init.annual_premium = String(lead.target_premium || 0);
      init.commission_pct = "15";
      init.line_of_business = "";
      init.close_date = new Date().toISOString().slice(0, 10);
    } else if (isRealEstate) {
      init.sale_price = String(lead.target_premium || 0);
      init.total_commission_pct = "5.5";
      init.your_side_pct = "2.75";
      init.close_date = new Date().toISOString().slice(0, 10);
    } else {
      init.deal_value = String(lead.target_premium || 0);
      init.close_date = new Date().toISOString().slice(0, 10);
    }
    init.notes = "";
    return init;
  });

  const computed = useMemo(() => {
    const c = { ...form };
    if (isInsurance) {
      const prem = Number(form.annual_premium) || 0;
      const pct = Number(form.commission_pct) || 15;
      c.est_commission = String(Math.round(prem * pct / 100));
    } else if (isRealEstate) {
      const price = Number(form.sale_price) || 0;
      const yourPct = Number(form.your_side_pct) || 2.75;
      c.your_commission = String(Math.round(price * yourPct / 100));
    }
    return c;
  }, [form, isInsurance, isRealEstate]);

  const primaryVal = isInsurance
    ? Number(computed.annual_premium) || 0
    : isRealEstate
    ? Number(computed.sale_price) || 0
    : Number(computed.deal_value) || 0;

  const commissionVal = isInsurance
    ? Number(computed.est_commission) || 0
    : isRealEstate
    ? Number(computed.your_commission) || 0
    : 0;

  const handleChange = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl border border-emerald-500/20 bg-background p-5 space-y-4 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-500/15">
            <Trophy className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Close Deal — {lead.account_name}</h3>
            <p className="text-xs text-muted-foreground">
              {isInsurance ? "Enter premium & commission details" : isRealEstate ? "Enter property & commission details" : "Enter sale details to finalize"}
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {isInsurance && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Annual Premium</Label>
                <Input type="number" value={form.annual_premium} onChange={e => handleChange("annual_premium", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Commission %</Label>
                <Input type="number" step="0.5" value={form.commission_pct} onChange={e => handleChange("commission_pct", e.target.value)} className="h-9 text-xs" />
                <p className="text-[10px] text-muted-foreground">Typical P&C commission is 10–20%</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">Est. Commission <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">auto</span></Label>
                <Input value={`$${Number(computed.est_commission || 0).toLocaleString()}`} readOnly className="h-9 text-xs text-emerald-500 bg-muted/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Line of Business</Label>
                <Select value={form.line_of_business || ""} onValueChange={v => handleChange("line_of_business", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select line" /></SelectTrigger>
                  <SelectContent>
                    {["Commercial P&C", "Benefits", "Personal Lines", "Life", "Workers Comp", "E&O"].map(o => (
                      <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {isRealEstate && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Sale Price</Label>
                <Input type="number" value={form.sale_price} onChange={e => handleChange("sale_price", e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Total Commission %</Label>
                  <Input type="number" step="0.5" value={form.total_commission_pct} onChange={e => handleChange("total_commission_pct", e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Your Side %</Label>
                  <Input type="number" step="0.5" value={form.your_side_pct} onChange={e => handleChange("your_side_pct", e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">Your Commission <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">auto</span></Label>
                <Input value={`$${Number(computed.your_commission || 0).toLocaleString()}`} readOnly className="h-9 text-xs text-emerald-500 bg-muted/50" />
              </div>
            </>
          )}
          {!isInsurance && !isRealEstate && (
            <div className="space-y-1">
              <Label className="text-xs">Deal Value</Label>
              <Input type="number" value={form.deal_value} onChange={e => handleChange("deal_value", e.target.value)} className="h-9 text-xs" />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{isInsurance ? "Effective Date" : "Close Date"}</Label>
            <Input type="date" value={form.close_date} onChange={e => handleChange("close_date", e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={e => handleChange("notes", e.target.value)} className="h-9 text-xs" placeholder="Optional notes" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            {(isInsurance || isRealEstate) ? (
              <>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Commission</span>
                <p className="text-lg font-bold text-emerald-500">${commissionVal.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{isInsurance ? "Premium" : "Sale Price"}: ${primaryVal.toLocaleString()}</p>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Value</span>
                <p className="text-lg font-bold text-emerald-500">${primaryVal.toLocaleString()}</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="text-xs h-8">Cancel</Button>
            <Button size="sm" onClick={() => onSave(computed, primaryVal)} className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Trophy className="h-3.5 w-3.5" /> Close Deal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Goals Dialog ───
function GoalsDialog({ open, onOpenChange, userId, currentGoal, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  userId: string; currentGoal: { premium: number; revenue: number };
  onSaved: () => void;
}) {
  const [premiumGoal, setPremiumGoal] = useState(String(currentGoal.premium || ""));
  const [revenueGoal, setRevenueGoal] = useState(String(currentGoal.revenue || ""));
  const [saving, setSaving] = useState(false);
  const year = new Date().getFullYear();

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("producer_goals").upsert({
      user_id: userId,
      year,
      annual_premium_goal: Number(premiumGoal) || 0,
      annual_revenue_goal: Number(revenueGoal) || 0,
    } as any, { onConflict: "user_id,year" });
    setSaving(false);
    if (error) { toast.error("Failed to save goals"); return; }
    toast.success("Sales goals saved!");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> {year} Sales Goals</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Annual Premium Goal</Label>
            <Input type="number" value={premiumGoal} onChange={e => setPremiumGoal(e.target.value)} placeholder="500000" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Annual Revenue / Commission Goal</Label>
            <Input type="number" value={revenueGoal} onChange={e => setRevenueGoal(e.target.value)} placeholder="75000" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Goals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Pipeline Component ───
export default function ConnectPipelineTab() {
  const { user } = useAuth();
  const { branch } = useUserBranch();
  const [industry, setIndustry] = useState<string | null>(() => {
    return localStorage.getItem("aura_default_connect_pipeline") || null;
  });
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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goals, setGoals] = useState({ premium: 0, revenue: 0 });

  // Won celebration state
  const [pendingWonLead, setPendingWonLead] = useState<Lead | null>(null);
  const [celebration, setCelebration] = useState<{ amount: number; label: string } | null>(null);

  // Fetch goals
  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("producer_goals")
      .select("annual_premium_goal, annual_revenue_goal")
      .eq("user_id", user.id)
      .eq("year", year)
      .maybeSingle();
    if (data) {
      setGoals({ premium: Number(data.annual_premium_goal) || 0, revenue: Number(data.annual_revenue_goal) || 0 });
    }
  }, [user]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.5";
  };
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null); setDropTarget(null);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1";
  };
  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(stageKey);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
  };
  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault(); setDropTarget(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.stage !== stageKey) moveStage(leadId, stageKey);
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
      .select("id, account_name, contact_name, email, phone, stage, target_premium, lead_source, business_type, loss_reason, estimated_renewal_date, updated_at, created_at, won_details")
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

  // Filter leads by time period
  const filteredLeads = useMemo(() => {
    if (timePeriod === "all") return leads;
    const now = new Date();
    let cutoff: Date;
    if (timePeriod === "month") cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (timePeriod === "quarter") cutoff = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    else cutoff = new Date(now.getFullYear(), 0, 1);
    return leads.filter(l => new Date(l.created_at) >= cutoff);
  }, [leads, timePeriod]);

  const lostLeads = filteredLeads.filter(l => l.stage === "lost");
  const activeLeads = filteredLeads.filter(l => l.stage !== "lost");

  // Pipeline totals
  const pipelineTotals = useMemo(() => {
    const totalPipeline = activeLeads.reduce((s, l) => s + (l.target_premium || 0), 0);
    const wonLeads = filteredLeads.filter(l => l.stage === "bound");
    const totalWon = wonLeads.reduce((s, l) => {
      const wd = l.won_details;
      if (wd) {
        return s + (Number(wd.annual_premium) || Number(wd.sale_price) || Number(wd.deal_value) || l.target_premium || 0);
      }
      return s + (l.target_premium || 0);
    }, 0);
    const totalCommission = wonLeads.reduce((s, l) => {
      const wd = l.won_details;
      if (!wd) return s;
      return s + (Number(wd.est_commission) || Number(wd.your_commission) || 0);
    }, 0);
    return { totalPipeline, totalWon, totalCommission, wonCount: wonLeads.length, totalLeads: filteredLeads.length };
  }, [filteredLeads, activeLeads]);

  const toggleColumnExpand = (stage: string) => {
    setExpandedColumns(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const moveStage = async (leadId: string, newStage: string) => {
    // If moving to "bound" stage, show won dialog
    const lead = leads.find(l => l.id === leadId);
    if (newStage === "bound" && lead && lead.stage !== "bound") {
      setPendingWonLead(lead);
      return;
    }

    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage as any, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) { toast.error("Failed to move lead"); return; }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
  };

  const handleWonSave = useCallback(async (details: Record<string, string>, finalValue: number) => {
    if (!pendingWonLead) return;
    // Save to DB
    const { error } = await supabase
      .from("leads")
      .update({
        stage: "bound" as any,
        won_details: details as any,
        target_premium: finalValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingWonLead.id);

    if (error) { toast.error("Failed to close deal"); return; }

    setLeads(prev => prev.map(l =>
      l.id === pendingWonLead.id
        ? { ...l, stage: "bound", won_details: details, target_premium: finalValue }
        : l
    ));
    setPendingWonLead(null);

    // Show celebration with commission or value
    let celAmount = finalValue;
    let celLabel = "Added to production";
    if (industry === "insurance") {
      celAmount = Number(details.est_commission) || Math.round(finalValue * 0.15);
      celLabel = "Commission Earned";
    } else if (industry === "real_estate") {
      celAmount = Number(details.your_commission) || Math.round(finalValue * 0.0275);
      celLabel = "Commission Earned";
    }
    setCelebration({ amount: celAmount, label: celLabel });
  }, [pendingWonLead, industry]);

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

  const premiumGoalProgress = goals.premium > 0 ? Math.min((pipelineTotals.totalWon / goals.premium) * 100, 100) : 0;
  const revenueGoalProgress = goals.revenue > 0 ? Math.min((pipelineTotals.totalCommission / goals.revenue) * 100, 100) : 0;

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
            Drag leads between stages · Click to view details
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time period filter */}
          <Select value={timePeriod} onValueChange={v => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Time</SelectItem>
              <SelectItem value="month" className="text-xs">This Month</SelectItem>
              <SelectItem value="quarter" className="text-xs">This Quarter</SelectItem>
              <SelectItem value="year" className="text-xs">This Year</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Select value={industry} onValueChange={handleSelectIndustry}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <div className="flex items-center gap-1.5">
                  {localStorage.getItem("aura_default_connect_pipeline") === industry && (
                    <Star className="h-3 w-3 fill-primary text-primary shrink-0" />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PIPELINE_CONFIGS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      {localStorage.getItem("aura_default_connect_pipeline") === key && (
                        <Star className="h-3 w-3 fill-primary text-primary" />
                      )}
                      {cfg.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localStorage.getItem("aura_default_connect_pipeline") !== industry && (
              <button
                onClick={() => {
                  localStorage.setItem("aura_default_connect_pipeline", industry!);
                  toast.success(`${config?.label} set as default pipeline`);
                }}
                className="text-[10px] text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors font-sans whitespace-nowrap"
              >
                Set as default
              </button>
            )}
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={fetchLeads} disabled={loadingLeads}>
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLeads ? "animate-spin" : ""}`} />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setGoalsOpen(true)}>
                <Target className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Set Sales Goals</TooltipContent>
          </Tooltip>
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

      {/* Pipeline Totals Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline Value</p>
            <p className="text-lg font-bold">${pipelineTotals.totalPipeline.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{pipelineTotals.totalLeads} leads</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Won</p>
            <p className="text-lg font-bold text-emerald-500">${pipelineTotals.totalWon.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{pipelineTotals.wonCount} deals closed</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commission</p>
            <p className="text-lg font-bold text-amber-500">${pipelineTotals.totalCommission.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Earned revenue</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> Goal Progress
            </p>
            {goals.premium > 0 ? (
              <>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Premium</span>
                  <span className="text-[10px] font-medium">{premiumGoalProgress.toFixed(0)}%</span>
                </div>
                <Progress value={premiumGoalProgress} className="h-1.5 mt-1" />
                {goals.revenue > 0 && (
                  <>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">Revenue</span>
                      <span className="text-[10px] font-medium">{revenueGoalProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={revenueGoalProgress} className="h-1.5 mt-1" />
                  </>
                )}
              </>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs mt-1 h-7 px-2" onClick={() => setGoalsOpen(true)}>
                <Settings2 className="h-3 w-3 mr-1" /> Set Goals
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(0, 1fr))` }}>
        {activeStages.map(stage => {
          const stageLeads = activeLeads.filter(l => l.stage === stage.key);
          const totalValue = stageLeads.reduce((sum, l) => sum + (l.target_premium || 0), 0);
          const visibleLeads = expandedColumns[stage.key] ? stageLeads : stageLeads.slice(0, COLUMN_LIMIT);
          const isOver = dropTarget === stage.key;

          // Commission total for won column
          const commTotal = stage.key === "bound" ? stageLeads.reduce((s, l) => {
            const wd = l.won_details;
            if (!wd) return s;
            return s + (Number(wd.est_commission) || Number(wd.your_commission) || 0);
          }, 0) : 0;

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
                  <p className="text-[10px] mt-0.5 opacity-70">${totalValue.toLocaleString()}</p>
                )}
                {commTotal > 0 && (
                  <p className="text-[9px] mt-0.5 text-emerald-500">Comm: ${commTotal.toLocaleString()}</p>
                )}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {visibleLeads.map(lead => (
                  <Card
                    key={lead.id}
                    className={`group cursor-grab active:cursor-grabbing transition-all ${draggedLeadId === lead.id ? "opacity-50 scale-95" : "hover:border-primary/30 hover:scale-[1.02]"}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-muted-foreground" />
                        <Link to={`/pipeline/${lead.id}`} className="text-xs font-medium truncate flex-1 hover:underline" onClick={e => { if (draggedLeadId) e.preventDefault(); }}>
                          {lead.account_name}
                        </Link>
                        {lead.won_details && <Trophy className="h-3 w-3 shrink-0 text-amber-400" />}
                      </div>
                      {lead.contact_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{lead.contact_name}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {lead.lead_source && (
                          <Badge variant="outline" className="text-[9px] h-4">{lead.lead_source}</Badge>
                        )}
                        <span className="text-[10px] font-semibold text-emerald-500 whitespace-nowrap flex items-center gap-0.5 shrink-0 ml-auto">
                          <DollarSign className="h-2.5 w-2.5" />
                          {(lead.target_premium || 0) > 0 ? lead.target_premium!.toLocaleString() : "—"}
                        </span>
                      </div>
                      {lead.won_details && (
                        (() => {
                          const wd = lead.won_details!;
                          const comm = Number(wd.est_commission) || Number(wd.your_commission) || 0;
                          return comm > 0 ? (
                            <p className="text-[8px] text-emerald-400 text-right">Comm: ${comm.toLocaleString()}</p>
                          ) : null;
                        })()
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
                    {expandedColumns[stage.key] ? "Show less" : `Show all ${stageLeads.length} leads`}
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

      {/* Lost Section */}
      {lostStageConfig && (
        <div
          className={`rounded-lg border-2 border-dashed p-3 transition-all duration-200 ${dropTarget === "lost" ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
          onDragOver={(e) => handleDragOver(e, "lost")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "lost")}
        >
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
                  Drag leads here to mark as lost.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Drop leads here to mark as lost</p>
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
            <p className="text-sm text-muted-foreground">No leads yet. Add your first lead to get started!</p>
            <Button size="sm" className="mt-3" onClick={() => setAddLeadOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Lead
            </Button>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Goals Dialog */}
    <GoalsDialog
      open={goalsOpen}
      onOpenChange={setGoalsOpen}
      userId={user?.id || ""}
      currentGoal={goals}
      onSaved={fetchGoals}
    />

    {/* Won Details Dialog */}
    {pendingWonLead && (
      <WonDetailsDialog
        lead={pendingWonLead}
        industry={industry}
        onSave={handleWonSave}
        onCancel={() => setPendingWonLead(null)}
      />
    )}

    {/* Celebration Overlay */}
    {celebration && (
      <WonCelebration amount={celebration.amount} label={celebration.label} onDone={() => setCelebration(null)} />
    )}

    </TooltipProvider>
  );
}
