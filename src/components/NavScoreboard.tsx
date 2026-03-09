import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const fmt = (n: number) => Math.round(n).toLocaleString();

// ─── Animated count chip ────────────────────────────────────────────────────
function PipelineChip({ label, count }: { label: string; count: number }) {
  const prevRef = useRef(count);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (count !== prevRef.current) {
      prevRef.current = count;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums transition-all duration-300 ${
        flash
          ? "bg-primary/20 text-primary scale-110"
          : "bg-muted/60 text-muted-foreground"
      }`}
    >
      <span className={`transition-transform duration-200 ${flash ? "scale-125" : ""}`}>{count}</span>
      {label}
    </span>
  );
}

// ─── Status label driven by % to goal ───────────────────────────────────────
function getStatusLabel(pct: number): { text: string; color: string } {
  if (pct >= 100) return { text: "Goal hit", color: "text-emerald-500" };
  if (pct >= 80) return { text: "On pace", color: "text-emerald-500" };
  if (pct >= 50) return { text: "Tracking", color: "text-primary" };
  if (pct >= 25) return { text: "Building", color: "text-amber-500" };
  return { text: "Ramping", color: "text-muted-foreground" };
}

export function NavScoreboard() {
  const { user } = useAuth();
  const { isClientServices, role } = useUserRole();
  const [goals, setGoals] = useState<{ annual_premium_goal: number; annual_revenue_goal: number } | null>(null);
  const [soldStats, setSoldStats] = useState({ premium: 0, revenue: 0 });
  const [mtdStats, setMtdStats] = useState({ premium: 0, revenue: 0 });
  const [pipeline, setPipeline] = useState({ prospects: 0, quoting: 0, presenting: 0, sold: 0, lost: 0 });
  const [profile, setProfile] = useState<{ full_name: string | null; agency_name: string | null }>({ full_name: null, agency_name: null });
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const annualPrem = goals?.annual_premium_goal || 0;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [goalsRes, policiesRes, mtdPoliciesRes, leadsRes, profileRes] = await Promise.all([
        supabase.from("producer_goals" as any).select("annual_premium_goal, annual_revenue_goal").eq("user_id", user.id).eq("year", year).maybeSingle(),
        supabase.from("policies").select("annual_premium, revenue").eq("producer_user_id", user.id).eq("status", "approved"),
        supabase.from("policies").select("annual_premium, revenue").eq("producer_user_id", user.id).eq("status", "approved").gte("approved_at", monthStart),
        supabase.from("leads").select("id, stage").eq("owner_user_id", user.id),
        supabase.from("profiles").select("full_name, agency_name").eq("user_id", user.id).maybeSingle(),
      ]);

      if (goalsRes.data) {
        setGoals({
          annual_premium_goal: Number((goalsRes.data as any).annual_premium_goal) || 0,
          annual_revenue_goal: Number((goalsRes.data as any).annual_revenue_goal) || 0,
        });
      }

      const allPolicies = policiesRes.data ?? [];
      setSoldStats({
        premium: allPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
        revenue: allPolicies.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0),
      });

      const mtdPolicies = mtdPoliciesRes.data ?? [];
      setMtdStats({
        premium: mtdPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
        revenue: mtdPolicies.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0),
      });

      // Pipeline counts
      const leads = leadsRes.data ?? [];
      const approvedLeadIds = new Set(allPolicies.map((_: any, i: number) => {
        // We need lead_ids from policies — re-fetch
        return null;
      }));
      // Simpler: count by stage
      const stageCounts = { prospects: 0, quoting: 0, presenting: 0, sold: 0, lost: 0 };
      leads.forEach((l: any) => {
        if (l.stage === "prospect") stageCounts.prospects++;
        else if (l.stage === "quoting") stageCounts.quoting++;
        else if (l.stage === "presenting") stageCounts.presenting++;
        else if (l.stage === "lost") stageCounts.lost++;
      });
      // Sold = approved policies count
      stageCounts.sold = allPolicies.length;
      setPipeline(stageCounts);

      if (profileRes.data) {
        setProfile({
          full_name: (profileRes.data as any).full_name || null,
          agency_name: (profileRes.data as any).agency_name || null,
        });
      }

      setLoading(false);
    })();
  }, [user, year]);

  const handleSaveGoals = async () => {
    if (!user) return;
    const premGoal = parseFloat(goalPremium) || 0;
    const revGoal = parseFloat(goalRevenue) || 0;
    if (premGoal <= 0 && revGoal <= 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("producer_goals" as any)
      .upsert({ user_id: user.id, year, annual_premium_goal: premGoal, annual_revenue_goal: revGoal } as any, { onConflict: "user_id,year" });
    if (!error) {
      setGoals({ annual_premium_goal: premGoal, annual_revenue_goal: revGoal });
      setGoalDialogOpen(false);
    }
    setSaving(false);
  };

  const handlePremiumChange = (v: string) => {
    setGoalPremium(v);
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0) setGoalRevenue(Math.round(num * 0.12).toString());
  };

  // Hide for client services
  if (!user || isClientServices) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full border-b border-border bg-card/90 backdrop-blur-sm animate-pulse">
        <div className="flex items-center h-[36px] px-3 gap-4 max-w-6xl mx-auto">
          <div className="h-5 w-5 rounded-full bg-muted/50" />
          <div className="h-2.5 w-32 rounded bg-muted/50" />
          <div className="h-2.5 w-20 rounded bg-muted/40" />
          <div className="h-2.5 w-20 rounded bg-muted/40" />
          <div className="h-2.5 w-16 rounded bg-muted/40" />
          <div className="flex gap-1 ml-auto">
            {[1,2,3,4,5].map(i => <div key={i} className="h-4 w-14 rounded bg-muted/30" />)}
          </div>
        </div>
      </div>
    );
  }

  // No goals set
  if (!goals || annualPrem === 0) {
    return (
      <>
        <button
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
          className="w-full border-b border-border bg-card/90 backdrop-blur-sm px-4 py-1.5 flex items-center gap-2 hover:bg-muted/30 transition-colors group"
        >
          <Target className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Set your {year} production goals to activate HUD
          </span>
        </button>
        <GoalDialog
          open={goalDialogOpen} onOpenChange={setGoalDialogOpen} year={year}
          goalPremium={goalPremium} setGoalPremium={handlePremiumChange}
          goalRevenue={goalRevenue} setGoalRevenue={setGoalRevenue}
          saving={saving} onSave={handleSaveGoals}
        />
      </>
    );
  }

  const ytdPct = annualPrem > 0 ? Math.min((soldStats.premium / annualPrem) * 100, 100) : 0;
  const status = getStatusLabel(ytdPct);
  const initials = profile.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const roleLabel = role === "producer" ? "Producer" : role === "manager" ? "Manager" : role || "Producer";

  return (
    <>
      <div className="w-full border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center h-[36px] overflow-x-auto scrollbar-hide max-w-6xl mx-auto px-3 gap-0 text-[11px]">

          {/* Identity + Status */}
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-border mr-3">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-foreground whitespace-nowrap">{profile.full_name || "Producer"}</span>
            <span className="text-muted-foreground whitespace-nowrap">| {roleLabel}</span>
            {profile.agency_name && (
              <span className="text-muted-foreground whitespace-nowrap">– {profile.agency_name}</span>
            )}
            <span className={`font-medium whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] ${status.color} bg-current/5`}>
              {status.text}
            </span>
          </div>

          {/* MTD Numbers */}
          <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-border mr-3 whitespace-nowrap">
            <span className="text-muted-foreground font-medium">MTD NB:</span>
            <span className="font-semibold tabular-nums text-foreground">{fmt(mtdStats.premium)}</span>
            <span className="text-muted-foreground">Rev:</span>
            <span className="font-semibold tabular-nums text-foreground">{fmt(mtdStats.revenue)}</span>
          </div>

          {/* YTD Numbers */}
          <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-border mr-3 whitespace-nowrap">
            <span className="text-muted-foreground font-medium">YTD NB:</span>
            <span className="font-semibold tabular-nums text-foreground">{fmt(soldStats.premium)}</span>
            <span className="text-muted-foreground">Rev:</span>
            <span className="font-semibold tabular-nums text-foreground">{fmt(soldStats.revenue)}</span>
          </div>

          {/* % to goal + thin progress */}
          <div className="flex flex-col justify-center shrink-0 pr-3 border-r border-border mr-3 min-w-[90px]">
            <span className="whitespace-nowrap">
              <span className="text-muted-foreground font-medium">% to goal: </span>
              <span className="font-semibold tabular-nums text-foreground">{Math.round(ytdPct)}%</span>
            </span>
            <div className="w-full h-[2px] rounded-full bg-muted mt-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${ytdPct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${ytdPct}%` }}
              />
            </div>
          </div>

          {/* Pipeline Tags */}
          <div className="flex items-center gap-1 shrink-0">
            <PipelineChip label="Prospects" count={pipeline.prospects} />
            <PipelineChip label="Quoting" count={pipeline.quoting} />
            <PipelineChip label="Submissions" count={pipeline.presenting} />
            <PipelineChip label="Sold" count={pipeline.sold} />
            <PipelineChip label="Dead" count={pipeline.lost} />
          </div>

          {/* Goal edit */}
          <button
            onClick={() => { setGoalPremium(annualPrem.toString()); setGoalRevenue((goals?.annual_revenue_goal || 0).toString()); setGoalDialogOpen(true); }}
            className="ml-2 text-muted-foreground/20 hover:text-foreground transition-colors shrink-0"
          >
            <Target className="h-3 w-3" />
          </button>
        </div>
      </div>

      <GoalDialog
        open={goalDialogOpen} onOpenChange={setGoalDialogOpen} year={year}
        goalPremium={goalPremium} setGoalPremium={handlePremiumChange}
        goalRevenue={goalRevenue} setGoalRevenue={setGoalRevenue}
        saving={saving} onSave={handleSaveGoals}
      />
    </>
  );
}

function GoalDialog({
  open, onOpenChange, year,
  goalPremium, setGoalPremium, goalRevenue, setGoalRevenue,
  saving, onSave,
}: {
  open: boolean; onOpenChange: (open: boolean) => void; year: number;
  goalPremium: string; setGoalPremium: (v: string) => void;
  goalRevenue: string; setGoalRevenue: (v: string) => void;
  saving: boolean; onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>{year} Production Goals</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Annual Premium Goal</Label>
            <Input type="number" placeholder="e.g. 1500000" value={goalPremium} onChange={(e) => setGoalPremium(e.target.value)} />
            {goalPremium && parseFloat(goalPremium) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">Monthly target: ${fmt(parseFloat(goalPremium) / 12)}</p>
            )}
          </div>
          <div>
            <Label>Annual Revenue Goal</Label>
            <Input type="number" placeholder="e.g. 180000" value={goalRevenue} onChange={(e) => setGoalRevenue(e.target.value)} />
            {goalRevenue && parseFloat(goalRevenue) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">Monthly target: ${fmt(parseFloat(goalRevenue) / 12)}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save Goals"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
