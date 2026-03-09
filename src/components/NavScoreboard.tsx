import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
const pct = (v: number, g: number) => g > 0 ? Math.min((v / g) * 100, 100) : 0;

function MiniTile({ label, value, goal }: { label: string; value: number; goal: number }) {
  const percent = pct(value, goal);
  const exceeded = goal > 0 && value >= goal;

  return (
    <div className="flex flex-col justify-center px-3 py-1.5 min-w-[120px] border-r border-border last:border-r-0 shrink-0">
      <p className="text-[8px] uppercase tracking-[0.12em] font-bold text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-xs font-bold tabular-nums leading-none ${exceeded ? "text-emerald-600" : "text-foreground"}`}>
        {fmt(value)}
        <span className="text-[9px] font-normal text-muted-foreground"> / {fmt(goal)}</span>
      </p>
      <div className="w-full h-[3px] rounded-full bg-muted mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${exceeded ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function NavScoreboard() {
  const { user } = useAuth();
  const { isClientServices } = useUserRole();
  const [goals, setGoals] = useState<{ annual_premium_goal: number; annual_revenue_goal: number } | null>(null);
  const [soldStats, setSoldStats] = useState({ premium: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const annualPrem = goals?.annual_premium_goal || 0;
  const annualRev = goals?.annual_revenue_goal || 0;
  const monthlyPrem = annualPrem / 12;
  const monthlyRev = annualRev / 12;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [goalsRes, policiesRes] = await Promise.all([
        supabase.from("producer_goals" as any).select("annual_premium_goal, annual_revenue_goal").eq("user_id", user.id).eq("year", year).maybeSingle(),
        supabase.from("policies").select("annual_premium, revenue").eq("producer_user_id", user.id).eq("status", "approved"),
      ]);
      if (goalsRes.data) {
        setGoals({
          annual_premium_goal: Number((goalsRes.data as any).annual_premium_goal) || 0,
          annual_revenue_goal: Number((goalsRes.data as any).annual_revenue_goal) || 0,
        });
      }
      const policies = policiesRes.data ?? [];
      setSoldStats({
        premium: policies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
        revenue: policies.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0),
      });
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

  // Loading
  if (loading) {
    return (
      <div className="w-full border-b border-border bg-card/90 backdrop-blur-sm animate-pulse">
        <div className="flex items-center h-[42px] px-3 gap-4 max-w-6xl mx-auto">
          <div className="h-2.5 w-20 rounded bg-muted/50" />
          <div className="h-2.5 w-16 rounded bg-muted/40" />
          <div className="h-2.5 w-24 rounded bg-muted/40" />
          <div className="h-2.5 w-20 rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  // No goals set
  if (!goals || (annualPrem === 0 && annualRev === 0)) {
    return (
      <>
        <button
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
          className="w-full border-b border-border bg-card/90 backdrop-blur-sm px-4 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors group"
        >
          <Target className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Set your {year} production goals
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

  return (
    <>
      <div className="w-full border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-stretch overflow-x-auto scrollbar-hide max-w-6xl mx-auto">
          <MiniTile label="MTD NB Premium" value={soldStats.premium} goal={monthlyPrem} />
          <MiniTile label="MTD NB Revenue" value={soldStats.revenue} goal={monthlyRev} />
          <MiniTile label="YTD NB Premium" value={soldStats.premium} goal={annualPrem} />
          <MiniTile label="YTD NB Revenue" value={soldStats.revenue} goal={annualRev} />
          <button
            onClick={() => { setGoalPremium(annualPrem.toString()); setGoalRevenue(annualRev.toString()); setGoalDialogOpen(true); }}
            className="flex items-center px-2 text-muted-foreground/30 hover:text-foreground transition-colors shrink-0"
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
              <p className="text-[11px] text-muted-foreground mt-1">Monthly target: {fmt(parseFloat(goalPremium) / 12)}</p>
            )}
          </div>
          <div>
            <Label>Annual Revenue Goal</Label>
            <Input type="number" placeholder="e.g. 180000" value={goalRevenue} onChange={(e) => setGoalRevenue(e.target.value)} />
            {goalRevenue && parseFloat(goalRevenue) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">Monthly target: {fmt(parseFloat(goalRevenue) / 12)}</p>
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
