import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Target, Trophy, Sparkles } from "lucide-react";

type Props = {
  userId: string;
  premiumSold: number;
  revenueSold: number;
};

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString();

const pctOf = (v: number, g: number) =>
  g > 0 ? ((v / g) * 100).toFixed(1).replace(/\.0$/, "") : "0";

/* ─── Single Tile ─── */
function ScoreboardTile({
  title,
  actual,
  goal,
  remaining,
  paceNeeded,
  paceUnit,
  daysLeft,
  countdownLabel,
  compact = false,
}: {
  title: string;
  actual: number;
  goal: number;
  remaining: number;
  paceNeeded: number;
  paceUnit: string;
  daysLeft: number;
  countdownLabel: string;
  compact?: boolean;
}) {
  const percent = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
  const rawPercent = goal > 0 ? (actual / goal) * 100 : 0;
  const exceeded = rawPercent >= 100;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-foreground tracking-wide">{title}</p>

      <p className={`text-base sm:text-lg font-bold leading-none ${exceeded ? "text-emerald-600" : "text-foreground"}`}>
        {fmt(actual)} <span className="text-[10px] font-normal text-muted-foreground">/ {fmt(goal)}</span>
      </p>

      <div className={`w-full rounded-full bg-muted overflow-hidden ${exceeded ? "h-1.5" : "h-1"}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${exceeded ? "bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {exceeded ? (
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-600">
            {rawPercent.toFixed(0)}% — Goal Complete!
          </span>
          <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-[9px] text-muted-foreground">{pctOf(actual, goal)}% to Goal</p>

          {!compact && (
            <>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] text-muted-foreground">Remaining</span>
                <span className="text-[11px] font-semibold text-foreground">{fmt(remaining)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] text-muted-foreground">Pace Needed</span>
                <span className="text-[11px] font-semibold text-foreground">{fmt(paceNeeded)}<span className="text-[9px] font-normal text-muted-foreground">/{paceUnit}</span></span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] text-muted-foreground">{countdownLabel}</span>
                <span className="text-[11px] font-semibold text-foreground">{daysLeft} Days</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export function ProductionScoreboard({ userId, premiumSold, revenueSold }: Props) {
  const [goals, setGoals] = useState<{
    annual_premium_goal: number;
    annual_revenue_goal: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const year = now.getFullYear();

  const endOfMonth = useMemo(() => new Date(year, now.getMonth() + 1, 1), [year, now.getMonth()]);
  const endOfYear = useMemo(() => new Date(year + 1, 0, 1), [year]);
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const startOfYear = new Date(year, 0, 1);

  const dayOfMonth = now.getDate();
  const daysInMonth = Math.floor((endOfMonth.getTime() - startOfMonth.getTime()) / 86400000);
  const daysLeftInMonth = Math.max(1, daysInMonth - dayOfMonth);

  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeftInYear = Math.max(1, daysInYear - dayOfYear);

  useEffect(() => { loadGoals(); }, [userId, year]);

  const loadGoals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("producer_goals" as any)
      .select("annual_premium_goal, annual_revenue_goal")
      .eq("user_id", userId)
      .eq("year", year)
      .maybeSingle();

    if (data) {
      setGoals({
        annual_premium_goal: Number((data as any).annual_premium_goal) || 0,
        annual_revenue_goal: Number((data as any).annual_revenue_goal) || 0,
      });
    } else {
      setGoals(null);
    }
    setLoading(false);
  };

  const handleSaveGoals = async () => {
    const premGoal = parseFloat(goalPremium) || 0;
    const revGoal = parseFloat(goalRevenue) || 0;
    if (premGoal <= 0 && revGoal <= 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("producer_goals" as any)
      .upsert(
        { user_id: userId, year, annual_premium_goal: premGoal, annual_revenue_goal: revGoal } as any,
        { onConflict: "user_id,year" }
      );
    if (!error) {
      setGoals({ annual_premium_goal: premGoal, annual_revenue_goal: revGoal });
      setGoalDialogOpen(false);
    }
    setSaving(false);
  };

  const annualPrem = goals?.annual_premium_goal || 0;
  const annualRev = goals?.annual_revenue_goal || 0;
  const monthlyPrem = annualPrem / 12;
  const monthlyRev = annualRev / 12;

  const mPremRemaining = Math.max(0, monthlyPrem - premiumSold);
  const mRevRemaining = Math.max(0, monthlyRev - revenueSold);
  const mPremPace = daysLeftInMonth > 0 ? mPremRemaining / daysLeftInMonth : 0;
  const mRevPace = daysLeftInMonth > 0 ? mRevRemaining / daysLeftInMonth : 0;

  const yPremRemaining = Math.max(0, annualPrem - premiumSold);
  const yRevRemaining = Math.max(0, annualRev - revenueSold);
  const yPremPace = daysLeftInYear > 0 ? yPremRemaining / daysLeftInYear : 0;
  const yRevPace = daysLeftInYear > 0 ? yRevRemaining / daysLeftInYear : 0;

  if (loading) return (
    <Card className="mb-6 animate-pulse">
      <CardContent className="p-4">
        <div className="h-[120px] rounded bg-muted/40" />
      </CardContent>
    </Card>
  );

  if (!goals || (annualPrem === 0 && annualRev === 0)) {
    return (
      <>
        <Card
          className="mb-6 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Set Your {year} Production Goals</p>
              <p className="text-xs text-muted-foreground">Define annual premium and revenue targets.</p>
            </div>
          </CardContent>
        </Card>
        <GoalDialog
          open={goalDialogOpen} onOpenChange={setGoalDialogOpen} year={year}
          goalPremium={goalPremium} setGoalPremium={setGoalPremium}
          goalRevenue={goalRevenue} setGoalRevenue={setGoalRevenue}
          saving={saving} onSave={handleSaveGoals}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative rounded-xl bg-card border border-border shadow-sm overflow-hidden mb-6">
        {/* Edit goals */}
        <button
          className="absolute top-2 right-2 z-10 text-muted-foreground/40 hover:text-foreground transition-colors"
          onClick={() => {
            setGoalPremium(annualPrem.toString());
            setGoalRevenue(annualRev.toString());
            setGoalDialogOpen(true);
          }}
        >
          <Target className="h-3.5 w-3.5" />
        </button>

        {/* Headers */}
        <div className="grid grid-cols-2 divide-x divide-border px-2.5 pt-2.5 sm:px-3 sm:pt-3">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold pb-1.5">Monthly</p>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold pb-1.5 pl-2.5 sm:pl-3">Annual</p>
        </div>

        {/* NB Production row */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
            <ScoreboardTile
              title="NB Production"
              actual={premiumSold} goal={monthlyPrem}
              remaining={mPremRemaining}
              paceNeeded={mPremPace} paceUnit="day"
              daysLeft={daysLeftInMonth} countdownLabel="Month Ends In"
            />
          </div>
          <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
            <ScoreboardTile
              title="NB Production"
              actual={premiumSold} goal={annualPrem}
              remaining={yPremRemaining}
              paceNeeded={yPremPace} paceUnit="day"
              daysLeft={daysLeftInYear} countdownLabel="Year Ends In"
            />
          </div>
        </div>

        <div className="border-t border-border mx-2.5 sm:mx-3" />

        {/* Revenue row */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="px-2.5 py-2.5 sm:px-3 sm:py-3">
            <ScoreboardTile
              title="Revenue"
              actual={revenueSold} goal={monthlyRev}
              remaining={mRevRemaining}
              paceNeeded={mRevPace} paceUnit="day"
              daysLeft={daysLeftInMonth} countdownLabel="Month Ends In"
              compact
            />
          </div>
          <div className="px-2.5 py-2.5 sm:px-3 sm:py-3">
            <ScoreboardTile
              title="Revenue"
              actual={revenueSold} goal={annualRev}
              remaining={yRevRemaining}
              paceNeeded={yRevPace} paceUnit="day"
              daysLeft={daysLeftInYear} countdownLabel="Year Ends In"
              compact
            />
          </div>
        </div>
      </div>

      <GoalDialog
        open={goalDialogOpen} onOpenChange={setGoalDialogOpen} year={year}
        goalPremium={goalPremium} setGoalPremium={setGoalPremium}
        goalRevenue={goalRevenue} setGoalRevenue={setGoalRevenue}
        saving={saving} onSave={handleSaveGoals}
      />
    </>
  );
}

/* ─── Goal Dialog ─── */
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
  const handlePremiumChange = (v: string) => {
    setGoalPremium(v);
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0) setGoalRevenue(Math.round(num * 0.12).toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>{year} Production Goals</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Annual Premium Goal</Label>
            <Input type="number" placeholder="e.g. 1500000" value={goalPremium} onChange={(e) => handlePremiumChange(e.target.value)} />
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
