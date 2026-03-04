import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type Props = {
  userId: string;
  premiumSold: number;
  revenueSold: number;
};

/* ─── Formatters ─── */
const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString();

const pctOf = (v: number, g: number) =>
  g > 0 ? ((v / g) * 100).toFixed(1).replace(/\.0$/, "") : "0";

/* ─── Section renderers ─── */

function ProductionSection({
  label,
  premiumSold, premiumGoal,
  revenueSold, revenueGoal,
}: {
  label: string;
  premiumSold: number; premiumGoal: number;
  revenueSold: number; revenueGoal: number;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label} NB Production</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Premium</p>
          <p className="text-sm font-bold text-foreground">{fmt(premiumSold)} / {fmt(premiumGoal)}</p>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(Number(pctOf(premiumSold, premiumGoal)), 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{pctOf(premiumSold, premiumGoal)}% to Goal</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="text-sm font-bold text-foreground">{fmt(revenueSold)} / {fmt(revenueGoal)}</p>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1">
            <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${Math.min(Number(pctOf(revenueSold, revenueGoal)), 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{pctOf(revenueSold, revenueGoal)}% to Goal</p>
        </div>
      </div>
    </div>
  );
}

function PaceSection({
  label, paceUnit,
  premiumRequired, premiumCurrent,
  revenueRequired, revenueCurrent,
}: {
  label: string; paceUnit: string;
  premiumRequired: number; premiumCurrent: number;
  revenueRequired: number; revenueCurrent: number;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label} Pace</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Premium Pace</p>
          <p className="text-[11px] text-muted-foreground">Required: <span className="font-medium text-foreground">{fmt(premiumRequired)}/{paceUnit}</span></p>
          <p className="text-[11px] text-muted-foreground">Current: <span className={`font-medium ${premiumCurrent >= premiumRequired ? "text-emerald-600" : "text-destructive"}`}>{fmt(premiumCurrent)}/{paceUnit}</span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Pace</p>
          <p className="text-[11px] text-muted-foreground">Required: <span className="font-medium text-foreground">{fmt(revenueRequired)}/{paceUnit}</span></p>
          <p className="text-[11px] text-muted-foreground">Current: <span className={`font-medium ${revenueCurrent >= revenueRequired ? "text-emerald-600" : "text-destructive"}`}>{fmt(revenueCurrent)}/{paceUnit}</span></p>
        </div>
      </div>
    </div>
  );
}

function ProjectionSection({
  premiumProjected, premiumGap, premiumGoal,
  revenueProjected, revenueGap, revenueGoal,
}: {
  premiumProjected: number; premiumGap: number; premiumGoal: number;
  revenueProjected: number; revenueGap: number; revenueGoal: number;
}) {
  const premOnTrack = premiumProjected >= premiumGoal;
  const revOnTrack = revenueProjected >= revenueGoal;
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        Projected at Current Pace
        {premOnTrack ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Premium</p>
          <p className="text-[11px] text-muted-foreground">Projected: <span className={`font-medium ${premOnTrack ? "text-emerald-600" : "text-foreground"}`}>{fmt(premiumProjected)}</span></p>
          <p className="text-[11px] text-muted-foreground">Gap: <span className={`font-medium ${premiumGap <= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {premiumGap <= 0 ? "+" + fmt(Math.abs(premiumGap)) : "–" + fmt(premiumGap)}
          </span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="text-[11px] text-muted-foreground">Projected: <span className={`font-medium ${revOnTrack ? "text-emerald-600" : "text-foreground"}`}>{fmt(revenueProjected)}</span></p>
          <p className="text-[11px] text-muted-foreground">Gap: <span className={`font-medium ${revenueGap <= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {revenueGap <= 0 ? "+" + fmt(Math.abs(revenueGap)) : "–" + fmt(revenueGap)}
          </span></p>
        </div>
      </div>
    </div>
  );
}

function VarianceSection({
  premiumActual, premiumTarget,
  revenueActual, revenueTarget,
}: {
  premiumActual: number; premiumTarget: number;
  revenueActual: number; revenueTarget: number;
}) {
  const premVar = premiumActual - premiumTarget;
  const revVar = revenueActual - revenueTarget;
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Today vs Target</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Premium</p>
          <p className="text-[11px] text-muted-foreground">Actual: <span className="font-medium text-foreground">{fmt(premiumActual)}</span></p>
          <p className="text-[11px] text-muted-foreground">Target: <span className="font-medium text-foreground">{fmt(premiumTarget)}</span></p>
          <p className="text-[11px] text-muted-foreground">Variance: <span className={`font-medium ${premVar >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {premVar >= 0 ? "+" : "–"}{fmt(Math.abs(premVar))}
          </span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="text-[11px] text-muted-foreground">Actual: <span className="font-medium text-foreground">{fmt(revenueActual)}</span></p>
          <p className="text-[11px] text-muted-foreground">Target: <span className="font-medium text-foreground">{fmt(revenueTarget)}</span></p>
          <p className="text-[11px] text-muted-foreground">Variance: <span className={`font-medium ${revVar >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {revVar >= 0 ? "+" : "–"}{fmt(Math.abs(revVar))}
          </span></p>
        </div>
      </div>
    </div>
  );
}

/* ─── Chart ─── */

function PaceChart({
  chartData, premiumGoal, revenueGoal, xKey, label,
}: {
  chartData: any[]; premiumGoal: number; revenueGoal: number; xKey: string; label: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label} Production Pace</h3>
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} className="fill-muted-foreground" />
            <Tooltip formatter={(v: number) => fmt(v)} labelClassName="text-xs" />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="premiumTarget" name="Premium Target" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            <Line type="monotone" dataKey="premiumActual" name="Premium Actual" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="revenueTarget" name="Revenue Target" stroke="hsl(var(--primary) / 0.4)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            <Line type="monotone" dataKey="revenueActual" name="Revenue Actual" stroke="hsl(var(--primary) / 0.5)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
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
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const startOfYear = new Date(year, 0, 1);

  const dayOfMonth = now.getDate();
  const daysInMonth = Math.floor((endOfMonth.getTime() - startOfMonth.getTime()) / 86400000);
  const daysLeftInMonth = Math.max(1, daysInMonth - dayOfMonth);

  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeftInYear = Math.max(1, daysInYear - dayOfYear);
  const currentMonth0 = now.getMonth(); // 0-indexed

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

  /* ─── Monthly chart data ─── */
  const monthlyChartData = useMemo(() => {
    if (!annualPrem) return [];
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const entry: any = { day: d };
      entry.premiumTarget = Math.round((monthlyPrem / daysInMonth) * d);
      entry.revenueTarget = Math.round((monthlyRev / daysInMonth) * d);
      if (d <= dayOfMonth) {
        entry.premiumActual = Math.round((premiumSold / dayOfMonth) * d);
        entry.revenueActual = Math.round((revenueSold / dayOfMonth) * d);
      }
      data.push(entry);
    }
    return data;
  }, [premiumSold, revenueSold, dayOfMonth, daysInMonth, monthlyPrem, monthlyRev, annualPrem]);

  /* ─── Annual chart data ─── */
  const annualChartData = useMemo(() => {
    if (!annualPrem) return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((m, i) => {
      const entry: any = { month: m };
      entry.premiumTarget = Math.round((annualPrem / 12) * (i + 1));
      entry.revenueTarget = Math.round((annualRev / 12) * (i + 1));
      if (i <= currentMonth0) {
        entry.premiumActual = Math.round((premiumSold / Math.max(currentMonth0, 1)) * (i + 1));
        entry.revenueActual = Math.round((revenueSold / Math.max(currentMonth0, 1)) * (i + 1));
      }
      return entry;
    });
  }, [premiumSold, revenueSold, currentMonth0, annualPrem, annualRev]);

  /* ─── Monthly calculations ─── */
  const mPremRequired = daysInMonth > 0 ? monthlyPrem / daysInMonth : 0;
  const mPremCurrent = dayOfMonth > 0 ? premiumSold / dayOfMonth : 0;
  const mRevRequired = daysInMonth > 0 ? monthlyRev / daysInMonth : 0;
  const mRevCurrent = dayOfMonth > 0 ? revenueSold / dayOfMonth : 0;
  const mPremProjected = mPremCurrent * daysInMonth;
  const mPremGap = monthlyPrem - mPremProjected;
  const mRevProjected = mRevCurrent * daysInMonth;
  const mRevGap = monthlyRev - mRevProjected;
  const mPremTargetToday = mPremRequired * dayOfMonth;
  const mRevTargetToday = mRevRequired * dayOfMonth;

  /* ─── Annual calculations ─── */
  const yPremRequired = monthlyPrem;
  const yPremCurrent = currentMonth0 > 0 ? premiumSold / currentMonth0 : premiumSold;
  const yRevRequired = monthlyRev;
  const yRevCurrent = currentMonth0 > 0 ? revenueSold / currentMonth0 : revenueSold;
  const yPremProjected = yPremCurrent * 12;
  const yPremGap = annualPrem - yPremProjected;
  const yRevProjected = yRevCurrent * 12;
  const yRevGap = annualRev - yRevProjected;
  const yPremTargetToday = (annualPrem / daysInYear) * dayOfYear;
  const yRevTargetToday = (annualRev / daysInYear) * dayOfYear;

  if (loading) return null;

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

        <Tabs defaultValue="monthly" className="w-full">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Monthly Tab ── */}
          <TabsContent value="monthly" className="px-3 pb-4 sm:px-4 space-y-4 mt-0">
            <ProductionSection
              label={monthName}
              premiumSold={premiumSold} premiumGoal={monthlyPrem}
              revenueSold={revenueSold} revenueGoal={monthlyRev}
            />
            <div className="border-t border-border" />
            <PaceSection
              label="Monthly" paceUnit="day"
              premiumRequired={mPremRequired} premiumCurrent={mPremCurrent}
              revenueRequired={mRevRequired} revenueCurrent={mRevCurrent}
            />
            <div className="border-t border-border" />
            <ProjectionSection
              premiumProjected={mPremProjected} premiumGap={mPremGap} premiumGoal={monthlyPrem}
              revenueProjected={mRevProjected} revenueGap={mRevGap} revenueGoal={monthlyRev}
            />
            <div className="border-t border-border" />
            <PaceChart
              chartData={monthlyChartData} premiumGoal={monthlyPrem} revenueGoal={monthlyRev}
              xKey="day" label="Monthly"
            />
            <div className="border-t border-border" />
            <VarianceSection
              premiumActual={premiumSold} premiumTarget={mPremTargetToday}
              revenueActual={revenueSold} revenueTarget={mRevTargetToday}
            />
          </TabsContent>

          {/* ── Annual Tab ── */}
          <TabsContent value="annual" className="px-3 pb-4 sm:px-4 space-y-4 mt-0">
            <ProductionSection
              label={`${year}`}
              premiumSold={premiumSold} premiumGoal={annualPrem}
              revenueSold={revenueSold} revenueGoal={annualRev}
            />
            <div className="border-t border-border" />
            <PaceSection
              label="Annual" paceUnit="month"
              premiumRequired={yPremRequired} premiumCurrent={yPremCurrent}
              revenueRequired={yRevRequired} revenueCurrent={yRevCurrent}
            />
            <div className="border-t border-border" />
            <ProjectionSection
              premiumProjected={yPremProjected} premiumGap={yPremGap} premiumGoal={annualPrem}
              revenueProjected={yRevProjected} revenueGap={yRevGap} revenueGoal={annualRev}
            />
            <div className="border-t border-border" />
            <PaceChart
              chartData={annualChartData} premiumGoal={annualPrem} revenueGoal={annualRev}
              xKey="month" label="Annual"
            />
            <div className="border-t border-border" />
            <VarianceSection
              premiumActual={premiumSold} premiumTarget={yPremTargetToday}
              revenueActual={revenueSold} revenueTarget={yRevTargetToday}
            />
          </TabsContent>
        </Tabs>
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
