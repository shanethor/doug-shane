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
import { ChevronDown, ChevronUp, Target } from "lucide-react";

type Props = {
  userId: string;
  /** Pre-fetched total premium sold (approved policies) */
  premiumSold: number;
  /** Pre-fetched total revenue sold */
  revenueSold: number;
};

const fmt = (n: number) =>
  "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (value: number, goal: number) =>
  goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

const pctLabel = (value: number, goal: number) =>
  goal > 0 ? ((value / goal) * 100).toFixed(1).replace(/\.0$/, "") + "%" : "—";

export function ProductionScoreboard({ userId, premiumSold, revenueSold }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  // Date math
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const startOfMonth = new Date(year, now.getMonth(), 1);
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

  // Daily required = remaining goal / remaining days
  const remainingPrem = Math.max(0, annualPrem - premiumSold);
  const remainingRev = Math.max(0, annualRev - revenueSold);
  const dailyPrem = daysLeftInYear > 0 ? remainingPrem / daysLeftInYear : 0;
  const dailyRev = daysLeftInYear > 0 ? remainingRev / daysLeftInYear : 0;

  return (
    <>
      <Card
        className="mb-6 cursor-pointer transition-all hover:border-primary/30"
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">
                This Month
              </span>
              <button
                className="text-muted-foreground hover:text-foreground ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setGoalPremium(annualPrem.toString());
                  setGoalRevenue(annualRev.toString());
                  setGoalDialogOpen(true);
                }}
              >
                <Target className="h-3.5 w-3.5" />
              </button>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Monthly stats */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground font-sans">New Business Premium</span>
                <span className="text-xs text-muted-foreground font-sans">
                  {pctLabel(premiumSold, monthlyPrem)} of monthly goal
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold font-sans">{fmt(premiumSold)}</span>
                <span className="text-xs text-muted-foreground font-sans">/ {fmt(monthlyPrem)}</span>
              </div>
              <Progress value={pct(premiumSold, monthlyPrem)} className="h-1.5" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground font-sans">New Business Revenue</span>
                <span className="text-xs text-muted-foreground font-sans">
                  {pctLabel(revenueSold, monthlyRev)} of monthly goal
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold font-sans">{fmt(revenueSold)}</span>
                <span className="text-xs text-muted-foreground font-sans">/ {fmt(monthlyRev)}</span>
              </div>
              <Progress value={pct(revenueSold, monthlyRev)} className="h-1.5" />
            </div>

            <p className="text-[11px] text-muted-foreground font-sans">
              {daysLeftInMonth} day{daysLeftInMonth !== 1 ? "s" : ""} left in {monthName}
            </p>
          </div>

          {/* Expanded: YTD + Daily Required */}
          {expanded && (
            <div className="border-t pt-4 space-y-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">
                Year to Date
              </span>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-sans">New Business Premium</span>
                    <span className="text-xs text-muted-foreground font-sans">
                      {pctLabel(premiumSold, annualPrem)} of annual goal
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold font-sans">{fmt(premiumSold)}</span>
                    <span className="text-xs text-muted-foreground font-sans">/ {fmt(annualPrem)}</span>
                  </div>
                  <Progress value={pct(premiumSold, annualPrem)} className="h-1.5" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-sans">New Business Revenue</span>
                    <span className="text-xs text-muted-foreground font-sans">
                      {pctLabel(revenueSold, annualRev)} of annual goal
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold font-sans">{fmt(revenueSold)}</span>
                    <span className="text-xs text-muted-foreground font-sans">/ {fmt(annualRev)}</span>
                  </div>
                  <Progress value={pct(revenueSold, annualRev)} className="h-1.5" />
                </div>

                <p className="text-[11px] text-muted-foreground font-sans">
                  {yearPct}% of year elapsed
                </p>
              </div>

              <div className="border-t pt-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">
                  Required Daily Production
                </span>
                <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:gap-6">
                  <p className="text-sm font-semibold font-sans">
                    {fmt(dailyPrem)} <span className="text-xs font-normal text-muted-foreground">premium per day</span>
                  </p>
                  <p className="text-sm font-semibold font-sans">
                    {fmt(dailyRev)} <span className="text-xs font-normal text-muted-foreground">revenue per day</span>
                  </p>
                </div>
              </div>
            </div>
          )}
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
  // Auto-calc revenue as 12% of premium when user types premium
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
