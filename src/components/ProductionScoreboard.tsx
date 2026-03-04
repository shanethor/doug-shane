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
import { useCountdown } from "@/hooks/useCountdown";

type Props = {
  userId: string;
  premiumSold: number;
  revenueSold: number;
};

/* ─── Formatters ─── */
const fmt = (n: number) =>
  "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (value: number, goal: number) =>
  goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

const rawPct = (value: number, goal: number) =>
  goal > 0 ? (value / goal) * 100 : 0;

const pctLabel = (value: number, goal: number) =>
  goal > 0 ? ((value / goal) * 100).toFixed(1).replace(/\.0$/, "") + "%" : "—";

/* ─── Countdown display sub-component ─── */
function CountdownLine({ label, targetDate }: { label: string; targetDate: Date }) {
  const { formatted, expired } = useCountdown(targetDate);
  if (expired) return null;
  return (
    <p className="text-[9px] sm:text-[10px] font-sans leading-none text-accent/80 flex items-center gap-1">
      {/* Pulsing live dot — uses accent color */}
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
      </span>
      <span className="opacity-70">{label}:</span> {formatted}
    </p>
  );
}

/* ─── Goal exceeded celebration ─── */
function GoalExceeded({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <Trophy className="h-3 w-3 text-yellow-400" />
      <span className="text-[10px] font-bold text-yellow-400 font-sans">
        {percent.toFixed(0)}% — Goal crushed!
      </span>
      <Sparkles className="h-3 w-3 text-yellow-400 animate-pulse" />
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
  const monthName = now.toLocaleString("default", { month: "long" });

  // Countdown target dates — adjust here if needed
  const endOfMonth = useMemo(() => new Date(year, now.getMonth() + 1, 1), [year, now.getMonth()]);
  const endOfYear = useMemo(() => new Date(year + 1, 0, 1), [year]);

  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeftInYear = daysInYear - dayOfYear;

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

  if (loading) return null;

  // No goals → prompt to set them
  if (!goals || (goals.annual_premium_goal === 0 && goals.annual_revenue_goal === 0)) {
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
              <p className="text-xs text-muted-foreground font-sans">
                Define annual premium and revenue targets to track your progress.
              </p>
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

  const annualPrem = goals.annual_premium_goal;
  const annualRev = goals.annual_revenue_goal;
  const monthlyPrem = annualPrem / 12;
  const monthlyRev = annualRev / 12;

  const remainingPrem = Math.max(0, annualPrem - premiumSold);
  const remainingRev = Math.max(0, annualRev - revenueSold);
  const dailyPrem = daysLeftInYear > 0 ? remainingPrem / daysLeftInYear : 0;
  const dailyRev = daysLeftInYear > 0 ? remainingRev / daysLeftInYear : 0;

  type SlotConfig = {
    label: string;
    value: number;
    goal: number;
    sub: string;
    /** Show live countdown in this slot */
    countdown?: { label: string; target: Date };
  };

  const slots: SlotConfig[] = [
    {
      label: `Premium · ${monthName}`,
      value: premiumSold,
      goal: monthlyPrem,
      sub: `of ${fmt(monthlyPrem)}`,
      // Countdown: time left this month
      countdown: { label: "Month ends in", target: endOfMonth },
    },
    {
      label: `Revenue · ${monthName}`,
      value: revenueSold,
      goal: monthlyRev,
      sub: `of ${fmt(monthlyRev)}`,
    },
    {
      label: `Premium · ${year}`,
      value: premiumSold,
      goal: annualPrem,
      sub: `${fmt(dailyPrem)}/day needed`,
      // Countdown: time left this year
      countdown: { label: "Year ends in", target: endOfYear },
    },
    {
      label: `Revenue · ${year}`,
      value: revenueSold,
      goal: annualRev,
      sub: `${fmt(dailyRev)}/day needed`,
    },
  ];

  return (
    <>
      {/* Scoreboard bar — uses primary (AURA navy) as background, primary-foreground for text */}
      <div className="relative rounded-xl bg-primary border border-primary/80 shadow-lg overflow-hidden mb-6">
        {/* Edit goals button */}
        <button
          className="absolute top-2 right-2 z-10 text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
          onClick={() => {
            setGoalPremium(annualPrem.toString());
            setGoalRevenue(annualRev.toString());
            setGoalDialogOpen(true);
          }}
        >
          <Target className="h-3.5 w-3.5" />
        </button>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-primary-foreground/10">
          {slots.map((slot, i) => {
            const percent = pct(slot.value, slot.goal);
            const raw = rawPct(slot.value, slot.goal);
            const exceeded = raw > 100;

            return (
              <div key={i} className="px-3 py-3 sm:px-4 sm:py-3.5 space-y-1.5">
                {/* Label */}
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-primary-foreground/50 font-sans font-medium truncate">
                  {slot.label}
                </p>

                {/* Main value */}
                <p className={`text-base sm:text-lg font-bold font-sans leading-none ${
                  exceeded ? "text-yellow-400" : "text-primary-foreground"
                }`}>
                  {fmt(slot.value)}
                </p>

                {/* Secondary line */}
                <p className="text-[10px] sm:text-[11px] text-primary-foreground/40 font-sans leading-none">
                  {slot.sub} · {pctLabel(slot.value, slot.goal)}
                </p>

                {/* Progress bar — accent color for fill, primary-foreground/10 for track */}
                <div className="w-full h-1 rounded-full bg-primary-foreground/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      exceeded
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                        : "bg-accent"
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                {/* Goal exceeded celebration */}
                {exceeded && <GoalExceeded percent={raw} />}

                {/* Live countdown (only on month/year premium slots) */}
                {slot.countdown && !exceeded && (
                  <CountdownLine label={slot.countdown.label} targetDate={slot.countdown.target} />
                )}
              </div>
            );
          })}
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
              <p className="text-[11px] text-muted-foreground mt-1 font-sans">Monthly target: {fmt(parseFloat(goalPremium) / 12)}</p>
            )}
          </div>
          <div>
            <Label>Annual Revenue Goal</Label>
            <Input type="number" placeholder="e.g. 180000" value={goalRevenue} onChange={(e) => setGoalRevenue(e.target.value)} />
            {goalRevenue && parseFloat(goalRevenue) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1 font-sans">Monthly target: {fmt(parseFloat(goalRevenue) / 12)}</p>
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
