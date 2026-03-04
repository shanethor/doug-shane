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
  goal > 0 ? ((value / goal) * 100).toFixed(1).replace(/\.0$/, "") + "% complete" : "—";

/* ─── Countdown display sub-component ─── */
function CountdownLine({ label, targetDate }: { label: string; targetDate: Date }) {
  const { formatted, expired } = useCountdown(targetDate);
  if (expired) return null;
  return (
    <p className="text-[9px] sm:text-[10px] font-sans leading-none text-primary/70 flex items-center gap-1">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
      </span>
      <span className="opacity-70">{label}:</span> {formatted}
    </p>
  );
}

/* ─── Goal exceeded celebration ─── */
function GoalExceeded({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <Trophy className="h-3 w-3 text-emerald-600" />
      <span className="text-[10px] font-bold text-emerald-600 font-sans">
        {percent.toFixed(0)}% — Goal crushed!
      </span>
      <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
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
  const dailyPremYear = daysLeftInYear > 0 ? remainingPrem / daysLeftInYear : 0;

  // Monthly daily needed
  const daysLeftInMonth = Math.max(1, Math.ceil((endOfMonth.getTime() - now.getTime()) / 86400000));
  const remainingMonthlyPrem = Math.max(0, monthlyPrem - premiumSold);
  const dailyPremMonth = remainingMonthlyPrem / daysLeftInMonth;

  // Monthly premium stats
  const monthPercent = pct(premiumSold, monthlyPrem);
  const monthRaw = rawPct(premiumSold, monthlyPrem);
  const monthExceeded = monthRaw > 100;

  // Yearly premium stats
  const yearPercent = pct(premiumSold, annualPrem);
  const yearRaw = rawPct(premiumSold, annualPrem);
  const yearExceeded = yearRaw > 100;

  // Revenue stats
  const monthRevExceeded = rawPct(revenueSold, monthlyRev) > 100;
  const yearRevExceeded = rawPct(revenueSold, annualRev) > 100;
  const remainingMonthlyRev = Math.max(0, monthlyRev - revenueSold);
  const dailyRevMonth = daysLeftInMonth > 0 ? remainingMonthlyRev / daysLeftInMonth : 0;
  const remainingYearlyRev = Math.max(0, annualRev - revenueSold);
  const dailyRevYear = daysLeftInYear > 0 ? remainingYearlyRev / daysLeftInYear : 0;

  return (
    <>
      <div className="relative rounded-xl bg-card border border-border shadow-sm overflow-hidden mb-6">
        {/* Edit goals button */}
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

        <div className="grid grid-cols-2 divide-x divide-border">
          {/* ── LEFT: Monthly ── */}
          <div className="px-3 py-3 sm:px-4 sm:py-3.5 space-y-1.5">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-sans font-medium">
              Premium · {monthName}
            </p>
            <p className={`text-base sm:text-lg font-bold font-sans leading-none ${monthExceeded ? "text-emerald-600" : "text-foreground"}`}>
              {fmt(premiumSold)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-sans leading-none">
              {fmt(dailyPremMonth)}/day needed · {pctLabel(premiumSold, monthlyPrem)}
            </p>
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${monthExceeded ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-accent"}`}
                style={{ width: `${Math.min(monthPercent, 100)}%` }}
              />
            </div>
            {monthExceeded && <GoalExceeded percent={monthRaw} />}
            {!monthExceeded && <CountdownLine label="Month ends in" targetDate={endOfMonth} />}

            {/* Revenue — same progress bar style */}
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-sans font-medium">
                Revenue · {monthName}
              </p>
              <p className={`text-sm sm:text-base font-bold font-sans leading-none ${monthRevExceeded ? "text-emerald-600" : "text-foreground"}`}>
                {fmt(revenueSold)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-sans leading-none">
                {fmt(dailyRevMonth)}/day needed · {pctLabel(revenueSold, monthlyRev)}
              </p>
              <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${monthRevExceeded ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-accent"}`}
                  style={{ width: `${Math.min(pct(revenueSold, monthlyRev), 100)}%` }}
                />
              </div>
              {monthRevExceeded && <GoalExceeded percent={rawPct(revenueSold, monthlyRev)} />}
            </div>
          </div>

          {/* ── RIGHT: Yearly ── */}
          <div className="px-3 py-3 sm:px-4 sm:py-3.5 space-y-1.5">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-sans font-medium">
              Premium · {year}
            </p>
            <p className={`text-base sm:text-lg font-bold font-sans leading-none ${yearExceeded ? "text-emerald-600" : "text-foreground"}`}>
              {fmt(premiumSold)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-sans leading-none">
              {fmt(dailyPremYear)}/day needed · {pctLabel(premiumSold, annualPrem)}
            </p>
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${yearExceeded ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-accent"}`}
                style={{ width: `${Math.min(yearPercent, 100)}%` }}
              />
            </div>
            {yearExceeded && <GoalExceeded percent={yearRaw} />}
            {!yearExceeded && <CountdownLine label="Year ends in" targetDate={endOfYear} />}

            {/* Revenue — same progress bar style */}
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-sans font-medium">
                Revenue · {year}
              </p>
              <p className={`text-sm sm:text-base font-bold font-sans leading-none ${yearRevExceeded ? "text-emerald-600" : "text-foreground"}`}>
                {fmt(revenueSold)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-sans leading-none">
                {fmt(dailyRevYear)}/day needed · {pctLabel(revenueSold, annualRev)}
              </p>
              <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${yearRevExceeded ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-accent"}`}
                  style={{ width: `${Math.min(pct(revenueSold, annualRev), 100)}%` }}
                />
              </div>
              {yearRevExceeded && <GoalExceeded percent={rawPct(revenueSold, annualRev)} />}
            </div>
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
