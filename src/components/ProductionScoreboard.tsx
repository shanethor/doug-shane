import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Target } from "lucide-react";

type Props = {
  userId: string;
  premiumSold: number;
  revenueSold: number;
};

const fmt = (n: number) =>
  "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (value: number, goal: number) =>
  goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

const pctLabel = (value: number, goal: number) =>
  goal > 0 ? ((value / goal) * 100).toFixed(1).replace(/\.0$/, "") + "%" : "—";

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

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0);

  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const yearPct = Math.round((dayOfYear / daysInYear) * 100);
  const daysLeftInMonth = endOfMonth.getDate() - now.getDate();
  const daysLeftInYear = daysInYear - dayOfYear;
  const monthName = now.toLocaleString("default", { month: "long" });

  useEffect(() => {
    loadGoals();
  }, [userId, year]);

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
        {
          user_id: userId,
          year,
          annual_premium_goal: premGoal,
          annual_revenue_goal: revGoal,
        } as any,
        { onConflict: "user_id,year" }
      );

    if (!error) {
      setGoals({ annual_premium_goal: premGoal, annual_revenue_goal: revGoal });
      setGoalDialogOpen(false);
    }
    setSaving(false);
  };

  if (loading) return null;

  // If no goals set, show a prompt
  if (!goals || (goals.annual_premium_goal === 0 && goals.annual_revenue_goal === 0)) {
    return (
      <>
        <Card
          className="mb-6 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => {
            setGoalPremium("");
            setGoalRevenue("");
            setGoalDialogOpen(true);
          }}
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
          open={goalDialogOpen}
          onOpenChange={setGoalDialogOpen}
          year={year}
          goalPremium={goalPremium}
          setGoalPremium={setGoalPremium}
          goalRevenue={goalRevenue}
          setGoalRevenue={setGoalRevenue}
          saving={saving}
          onSave={handleSaveGoals}
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

  const slots = [
    {
      label: `Premium · ${monthName}`,
      value: premiumSold,
      goal: monthlyPrem,
      sub: `${daysLeftInMonth}d left`,
    },
    {
      label: `Revenue · ${monthName}`,
      value: revenueSold,
      goal: monthlyRev,
      sub: `${daysLeftInMonth}d left`,
    },
    {
      label: `Premium · ${year}`,
      value: premiumSold,
      goal: annualPrem,
      sub: `${fmt(dailyPrem)}/day needed`,
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
      <div className="relative rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 shadow-lg overflow-hidden mb-6">
        {/* Edit goals button */}
        <button
          className="absolute top-2 right-2 z-10 text-white/40 hover:text-white/80 transition-colors"
          onClick={() => {
            setGoalPremium(annualPrem.toString());
            setGoalRevenue(annualRev.toString());
            setGoalDialogOpen(true);
          }}
        >
          <Target className="h-3.5 w-3.5" />
        </button>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
          {slots.map((slot, i) => {
            const percent = pct(slot.value, slot.goal);
            return (
              <div key={i} className="px-3 py-3 sm:px-4 sm:py-3.5 space-y-1.5">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/50 font-sans font-medium truncate">
                  {slot.label}
                </p>
                <p className="text-base sm:text-lg font-bold text-white font-sans leading-none">
                  {fmt(slot.value)}
                </p>
                <p className="text-[10px] sm:text-[11px] text-white/40 font-sans leading-none">
                  of {fmt(slot.goal)} · {pctLabel(slot.value, slot.goal)}
                </p>
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] sm:text-[10px] text-white/30 font-sans">
                  {slot.sub}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        year={year}
        goalPremium={goalPremium}
        setGoalPremium={setGoalPremium}
        goalRevenue={goalRevenue}
        setGoalRevenue={setGoalRevenue}
        saving={saving}
        onSave={handleSaveGoals}
      />
    </>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  year,
  goalPremium,
  setGoalPremium,
  goalRevenue,
  setGoalRevenue,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  goalPremium: string;
  setGoalPremium: (v: string) => void;
  goalRevenue: string;
  setGoalRevenue: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const handlePremiumChange = (v: string) => {
    setGoalPremium(v);
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0) {
      setGoalRevenue(Math.round(num * 0.12).toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{year} Production Goals</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Annual Premium Goal</Label>
            <Input
              type="number"
              placeholder="e.g. 1500000"
              value={goalPremium}
              onChange={(e) => handlePremiumChange(e.target.value)}
            />
            {goalPremium && parseFloat(goalPremium) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1 font-sans">
                Monthly target: {fmt(parseFloat(goalPremium) / 12)}
              </p>
            )}
          </div>
          <div>
            <Label>Annual Revenue Goal</Label>
            <Input
              type="number"
              placeholder="e.g. 180000"
              value={goalRevenue}
              onChange={(e) => setGoalRevenue(e.target.value)}
            />
            {goalRevenue && parseFloat(goalRevenue) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1 font-sans">
                Monthly target: {fmt(parseFloat(goalRevenue) / 12)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save Goals"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
