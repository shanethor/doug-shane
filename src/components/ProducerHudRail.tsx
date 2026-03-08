import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  userId: string;
  premiumSold: number;
  revenueSold: number;
};

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString();

/* ── Ticker cell — a single "score" block like ESPN ── */
function TickerCell({
  label,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  highlight,
}: {
  label?: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col justify-center px-3 sm:px-4 py-1.5 min-w-[140px] sm:min-w-[160px] border-r border-border last:border-r-0 shrink-0 ${highlight ? "bg-primary/5" : ""}`}>
      {label && (
        <p className="text-[8px] uppercase tracking-[0.15em] font-bold text-primary mb-0.5">{label}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted-foreground truncate">{topLeft}</span>
        <span className="text-xs font-bold tabular-nums text-foreground">{topRight}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted-foreground truncate">{bottomLeft}</span>
        <span className="text-xs font-bold tabular-nums text-foreground">{bottomRight}</span>
      </div>
    </div>
  );
}

/* ── Status pill ── */
function StatusPill({ pct }: { pct: number }) {
  let text: string, cls: string;
  if (pct >= 120) {
    text = "🔥 Ahead"; cls = "text-emerald-600 bg-emerald-500/10";
  } else if (pct >= 80) {
    text = "On Pace"; cls = "text-primary bg-primary/10";
  } else {
    text = "Behind"; cls = "text-amber-600 bg-amber-500/10";
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}>
      {text}
    </span>
  );
}

/* ── Main Component ── */
export function ProducerHudRail({ userId, premiumSold, revenueSold }: Props) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [goals, setGoals] = useState<{ annual_premium_goal: number; annual_revenue_goal: number } | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [pipeline, setPipeline] = useState({ prospects: 0, quoting: 0, presenting: 0, sold: 0, lost: 0 });
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const year = now.getFullYear();

  const endOfMonth = useMemo(() => new Date(year, now.getMonth() + 1, 1), [year, now.getMonth()]);
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const daysInMonth = Math.floor((endOfMonth.getTime() - startOfMonth.getTime()) / 86400000);
  const daysLeftInMonth = Math.max(1, daysInMonth - now.getDate());

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysLeftInYear = Math.max(1, daysInYear - dayOfYear);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const [goalsRes, profileRes, pipelineRes, soldRes] = await Promise.all([
        supabase.from("producer_goals" as any).select("annual_premium_goal, annual_revenue_goal").eq("user_id", userId).eq("year", year).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("leads").select("stage").eq("owner_user_id", userId),
        supabase.from("policies").select("id").eq("producer_user_id", userId).eq("status", "approved"),
      ]);

      if (goalsRes.data) {
        setGoals({
          annual_premium_goal: Number((goalsRes.data as any).annual_premium_goal) || 0,
          annual_revenue_goal: Number((goalsRes.data as any).annual_revenue_goal) || 0,
        });
      }
      if (profileRes.data) setProfile(profileRes.data);

      const leads = pipelineRes.data ?? [];
      setPipeline({
        prospects: leads.filter((l: any) => l.stage === "prospect").length,
        quoting: leads.filter((l: any) => l.stage === "quoting").length,
        presenting: leads.filter((l: any) => l.stage === "presenting").length,
        sold: soldRes.data?.length ?? 0,
        lost: leads.filter((l: any) => l.stage === "lost").length,
      });
      setLoading(false);
    };
    load();
  }, [userId, year]);

  const annualGoal = goals?.annual_premium_goal || 0;
  const annualRevGoal = goals?.annual_revenue_goal || 0;
  const monthlyGoal = annualGoal / 12;
  const monthlyRevGoal = annualRevGoal / 12;

  const { percentToGoal } = useMemo(() => {
    if (annualGoal <= 0) return { percentToGoal: 0 };
    const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / 86400000;
    const elapsed = (now.getTime() - startOfYear.getTime()) / 86400000;
    const expectedByToday = (elapsed / totalDays) * annualGoal;
    const pct = expectedByToday > 0 ? (premiumSold / expectedByToday) * 100 : 0;
    return { percentToGoal: Math.min(pct, 200) };
  }, [premiumSold, annualGoal, year]);

  const handleSaveGoals = async () => {
    const premGoal = parseFloat(goalPremium) || 0;
    const revGoal = parseFloat(goalRevenue) || 0;
    if (premGoal <= 0 && revGoal <= 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("producer_goals" as any)
      .upsert({ user_id: userId, year, annual_premium_goal: premGoal, annual_revenue_goal: revGoal } as any, { onConflict: "user_id,year" });
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

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full border-b border-border bg-card/90 backdrop-blur-sm animate-pulse">
        <div className="flex items-center h-[52px] px-3 gap-4">
          <div className="h-3 w-20 rounded bg-muted/50" />
          <div className="h-3 w-16 rounded bg-muted/40" />
          <div className="h-3 w-24 rounded bg-muted/40" />
          <div className="h-3 w-20 rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  // No goals set
  if (!goals || annualGoal === 0) {
    return (
      <>
        <button
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
          className="w-full border-b border-border bg-card/90 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors group"
        >
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Set your {year} production goals to activate the ticker
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

  const mPremRemaining = Math.max(0, monthlyGoal - premiumSold);
  const yPremRemaining = Math.max(0, annualGoal - premiumSold);

  return (
    <>
      <div className="relative w-full border-b border-border bg-card/95 backdrop-blur-sm group/ticker">
        {/* Left scroll arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-gradient-to-r from-card via-card/80 to-transparent opacity-0 group-hover/ticker:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Scrollable ticker strip */}
        <div
          ref={scrollRef}
          className="flex items-stretch overflow-x-auto scrollbar-hide"
        >
          {/* Status cell */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border-r border-border shrink-0 min-w-[120px]">
            <StatusPill pct={percentToGoal} />
            <button
              onClick={() => { setGoalPremium(annualGoal.toString()); setGoalRevenue(annualRevGoal.toString()); setGoalDialogOpen(true); }}
              className="text-muted-foreground/30 hover:text-foreground transition-colors"
            >
              <Target className="h-3 w-3" />
            </button>
          </div>

          {/* Monthly NB */}
          <TickerCell
            label={`MTD · ${daysLeftInMonth}d left`}
            topLeft="NB Premium"
            topRight={fmt(premiumSold)}
            bottomLeft="Goal"
            bottomRight={fmt(monthlyGoal)}
            highlight
          />

          {/* Monthly Revenue */}
          <TickerCell
            label="MTD Revenue"
            topLeft="Revenue"
            topRight={fmt(revenueSold)}
            bottomLeft="Goal"
            bottomRight={fmt(monthlyRevGoal)}
          />

          {/* Monthly Remaining */}
          <TickerCell
            label="MTD Gap"
            topLeft="Prem Remaining"
            topRight={fmt(mPremRemaining)}
            bottomLeft="Pace Needed"
            bottomRight={`${fmt(daysLeftInMonth > 0 ? mPremRemaining / daysLeftInMonth : 0)}/day`}
          />

          {/* Annual NB */}
          <TickerCell
            label={`YTD · ${daysLeftInYear}d left`}
            topLeft="NB Premium"
            topRight={fmt(premiumSold)}
            bottomLeft="Goal"
            bottomRight={fmt(annualGoal)}
            highlight
          />

          {/* Annual Revenue */}
          <TickerCell
            label="YTD Revenue"
            topLeft="Revenue"
            topRight={fmt(revenueSold)}
            bottomLeft="Goal"
            bottomRight={fmt(annualRevGoal)}
          />

          {/* Annual Gap */}
          <TickerCell
            label="YTD Gap"
            topLeft="Prem Remaining"
            topRight={fmt(yPremRemaining)}
            bottomLeft="Pace Needed"
            bottomRight={`${fmt(daysLeftInYear > 0 ? yPremRemaining / daysLeftInYear : 0)}/day`}
          />

          {/* % to goal */}
          <div className="flex items-center px-3 sm:px-4 py-1.5 border-r border-border shrink-0 min-w-[90px]">
            <div className="text-center">
              <p className="text-[8px] uppercase tracking-[0.15em] font-bold text-primary mb-0.5">Goal %</p>
              <p className="text-sm font-black tabular-nums text-foreground">{percentToGoal.toFixed(0)}%</p>
            </div>
          </div>

          {/* Pipeline cells */}
          <TickerCell
            label="Pipeline"
            topLeft="Prospects"
            topRight={String(pipeline.prospects)}
            bottomLeft="Submitted"
            bottomRight={String(pipeline.quoting)}
          />

          <TickerCell
            topLeft="Presenting"
            topRight={String(pipeline.presenting)}
            bottomLeft="Sold"
            bottomRight={String(pipeline.sold)}
          />

          <div className="flex items-center px-3 sm:px-4 py-1.5 shrink-0 min-w-[70px]">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground">Lost</span>
                <span className="text-xs font-bold tabular-nums text-foreground">{pipeline.lost}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right scroll arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-gradient-to-l from-card via-card/80 to-transparent opacity-0 group-hover/ticker:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
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
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

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
