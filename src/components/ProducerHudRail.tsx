import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString();

/* ── Status pill (larger) ── */
function StatusPill({ pct }: { pct: number }) {
  let text: string, cls: string;
  if (pct >= 120) {
    text = "🔥 AHEAD"; cls = "text-emerald-600 bg-emerald-500/15 ring-1 ring-emerald-500/20";
  } else if (pct >= 80) {
    text = "ON PACE"; cls = "text-primary bg-primary/15 ring-1 ring-primary/20";
  } else {
    text = "BEHIND"; cls = "text-amber-600 bg-amber-500/15 ring-1 ring-amber-500/20";
  }
  return (
    <span className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${cls}`}>
      {text}
    </span>
  );
}

/* ── Stat block inside a slide ── */
function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center px-4 sm:px-6">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-0.5">{label}</span>
      <span className="text-base sm:text-lg font-black tabular-nums text-foreground leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{sub}</span>}
    </div>
  );
}

/* ── Dot indicator ── */
function DotIndicator({ count, active }: { count: number; active: number }) {
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ${
            i === active ? "w-3 h-1 bg-primary" : "w-1 h-1 bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

const AUTO_ADVANCE_MS = 7000;
const PAUSE_AFTER_MANUAL_MS = 12000;

/* ── Main Component ── */
export function ProducerHudRail() {
  const { user } = useAuth();
  const { isClientServices } = useUserRole();
  const [goals, setGoals] = useState<{ annual_premium_goal: number; annual_revenue_goal: number } | null>(null);
  const [pipeline, setPipeline] = useState({ prospects: 0, quoting: 0, presenting: 0, sold: 0, lost: 0 });
  const [premiumSold, setPremiumSold] = useState(0);
  const [revenueSold, setRevenueSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);

  // Carousel state
  const [activeSlide, setActiveSlide] = useState(0);
  const [hovered, setHovered] = useState(false);
  const pauseUntilRef = useRef(0);
  const SLIDE_COUNT = 3;

  const now = new Date();
  const year = now.getFullYear();
  const userId = user?.id;

  const endOfMonth = useMemo(() => new Date(year, now.getMonth() + 1, 1), [year, now.getMonth()]);
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const daysInMonth = Math.floor((endOfMonth.getTime() - startOfMonth.getTime()) / 86400000);
  const daysLeftInMonth = Math.max(1, daysInMonth - now.getDate());
  const dayOfMonth = now.getDate();

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysLeftInYear = Math.max(1, daysInYear - dayOfYear);

  const shouldShow = userId && !isClientServices;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const [goalsRes, pipelineRes, policiesRes] = await Promise.all([
        supabase.from("producer_goals" as any).select("annual_premium_goal, annual_revenue_goal").eq("user_id", userId).eq("year", year).maybeSingle(),
        supabase.from("leads").select("stage").eq("owner_user_id", userId),
        supabase.from("policies").select("annual_premium, revenue").eq("producer_user_id", userId).eq("status", "approved"),
      ]);

      if (goalsRes.data) {
        setGoals({
          annual_premium_goal: Number((goalsRes.data as any).annual_premium_goal) || 0,
          annual_revenue_goal: Number((goalsRes.data as any).annual_revenue_goal) || 0,
        });
      }

      const policies = policiesRes.data ?? [];
      setPremiumSold(policies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0));
      setRevenueSold(policies.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0));

      const leads = pipelineRes.data ?? [];
      const soldCount = (await supabase.from("policies").select("id").eq("producer_user_id", userId).eq("status", "approved")).data?.length ?? 0;
      setPipeline({
        prospects: leads.filter((l: any) => l.stage === "prospect").length,
        quoting: leads.filter((l: any) => l.stage === "quoting").length,
        presenting: leads.filter((l: any) => l.stage === "presenting").length,
        sold: soldCount,
        lost: leads.filter((l: any) => l.stage === "lost").length,
      });
      setLoading(false);
    };
    load();
  }, [userId, year]);

  // Auto-advance carousel
  useEffect(() => {
    if (!shouldShow || loading || hovered) return;
    const interval = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setActiveSlide((prev) => (prev + 1) % SLIDE_COUNT);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [shouldShow, loading, hovered]);

  const goToSlide = (dir: "prev" | "next") => {
    pauseUntilRef.current = Date.now() + PAUSE_AFTER_MANUAL_MS;
    setActiveSlide((prev) => {
      if (dir === "next") return (prev + 1) % SLIDE_COUNT;
      return (prev - 1 + SLIDE_COUNT) % SLIDE_COUNT;
    });
  };

  const annualGoal = goals?.annual_premium_goal || 0;
  const annualRevGoal = goals?.annual_revenue_goal || 0;
  const monthlyGoal = annualGoal / 12;
  const monthlyRevGoal = annualRevGoal / 12;

  const percentToGoal = useMemo(() => {
    if (annualGoal <= 0) return 0;
    const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / 86400000;
    const elapsed = (now.getTime() - startOfYear.getTime()) / 86400000;
    const expectedByToday = (elapsed / totalDays) * annualGoal;
    return Math.min(expectedByToday > 0 ? (premiumSold / expectedByToday) * 100 : 0, 200);
  }, [premiumSold, annualGoal, year]);

  const mPremRemaining = Math.max(0, monthlyGoal - premiumSold);
  const yPremRemaining = Math.max(0, annualGoal - premiumSold);
  const dailyPaceNeeded = daysLeftInMonth > 0 ? mPremRemaining / daysLeftInMonth : 0;
  const dailyTarget = monthlyGoal / daysInMonth;
  // Estimate "today's NB" as a fraction of MTD (placeholder — real would need today's date filter)
  const todayEstimate = dayOfMonth > 0 ? premiumSold / dayOfMonth : 0;

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

  if (!shouldShow) return null;

  if (loading) {
    return (
      <div className="w-full border-b border-border bg-card/90 backdrop-blur-sm animate-pulse">
        <div className="flex items-center justify-center h-[56px] px-3 gap-6">
          <div className="h-3 w-20 rounded bg-muted/50" />
          <div className="h-5 w-28 rounded bg-muted/40" />
          <div className="h-5 w-24 rounded bg-muted/40" />
          <div className="h-5 w-20 rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  if (!goals || annualGoal === 0) {
    return (
      <>
        <button
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
          className="w-full border-b border-border bg-card/90 backdrop-blur-sm px-4 py-3 flex items-center justify-center gap-2 hover:bg-muted/30 transition-colors group"
        >
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Set your {year} production goals to activate the scoreboard
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

  /* ── Slide A: Performance ── */
  const slideA = (
    <div className="w-full shrink-0 flex items-center justify-center gap-2 sm:gap-4 px-2 py-1">
      <StatusPill pct={percentToGoal} />
      <button
        onClick={(e) => { e.stopPropagation(); setGoalPremium(annualGoal.toString()); setGoalRevenue(annualRevGoal.toString()); setGoalDialogOpen(true); }}
        className="text-muted-foreground/30 hover:text-foreground transition-colors"
      >
        <Target className="h-3 w-3" />
      </button>

      <div className="h-6 w-px bg-border" />

      <StatBlock label="NB MTD Prem" value={fmt(premiumSold)} sub={`Goal ${fmt(monthlyGoal)}`} />
      <StatBlock label="NB MTD Rev" value={fmt(revenueSold)} sub={`Goal ${fmt(monthlyRevGoal)}`} />

      <div className="h-6 w-px bg-border hidden sm:block" />

      <StatBlock label="NB YTD Prem" value={fmt(premiumSold)} sub={`Goal ${fmt(annualGoal)}`} />
      <StatBlock label="NB YTD Rev" value={fmt(revenueSold)} sub={`Goal ${fmt(annualRevGoal)}`} />

      <div className="h-6 w-px bg-border hidden sm:block" />

      <div className="flex flex-col items-center px-3">
        <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-0.5">Goal %</span>
        <span className="text-xl font-black tabular-nums text-foreground leading-tight">{percentToGoal.toFixed(0)}%</span>
      </div>
    </div>
  );

  /* ── Slide B: Pipeline ── */
  const PipeChip = ({ label, count, color }: { label: string; count: number; color?: string }) => (
    <div className="flex flex-col items-center px-3 sm:px-5">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-0.5">{label}</span>
      <span className={`text-lg sm:text-xl font-black tabular-nums leading-tight ${color || "text-foreground"}`}>{count}</span>
    </div>
  );

  const slideB = (
    <div className="w-full shrink-0 flex items-center justify-center gap-1 sm:gap-3 px-2 py-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary mr-2">Pipeline</span>
      <PipeChip label="Prospects" count={pipeline.prospects} />
      <div className="h-6 w-px bg-border" />
      <PipeChip label="Quoting" count={pipeline.quoting} />
      <div className="h-6 w-px bg-border" />
      <PipeChip label="Presenting" count={pipeline.presenting} />
      <div className="h-6 w-px bg-border" />
      <PipeChip label="Sold" count={pipeline.sold} color="text-emerald-600" />
      <div className="h-6 w-px bg-border" />
      <PipeChip label="Lost" count={pipeline.lost} color="text-destructive" />
    </div>
  );

  /* ── Slide C: Day Pace ── */
  const slideC = (
    <div className="w-full shrink-0 flex items-center justify-center gap-2 sm:gap-4 px-2 py-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary mr-2">Daily Pace</span>

      <StatBlock label="Avg NB / Day" value={fmt(todayEstimate)} sub={`Day ${dayOfMonth} of ${daysInMonth}`} />

      <div className="h-6 w-px bg-border" />

      <StatBlock label="Pace Needed" value={`${fmt(dailyPaceNeeded)}/day`} sub={`${daysLeftInMonth}d left this month`} />

      <div className="h-6 w-px bg-border" />

      <StatBlock label="Daily Target" value={fmt(dailyTarget)} sub="Monthly ÷ days" />

      <div className="h-6 w-px bg-border" />

      <StatBlock label="MTD Gap" value={fmt(mPremRemaining)} sub={mPremRemaining <= 0 ? "✓ On track" : "Remaining"} />

      <div className="h-6 w-px bg-border hidden sm:block" />

      <StatBlock label="YTD Gap" value={fmt(yPremRemaining)} sub={`${fmt(yPremRemaining / Math.max(1, daysLeftInYear))}/day needed`} />
    </div>
  );

  const slides = [slideA, slideB, slideC];

  return (
    <>
      <div
        className="relative w-full bg-card/95 backdrop-blur-sm border-b border-border overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Chevron left */}
        <button
          onClick={() => goToSlide("prev")}
          className="absolute left-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center bg-gradient-to-r from-card via-card/80 to-transparent opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Carousel track */}
        <div className="overflow-hidden h-[56px]">
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)`, width: `${SLIDE_COUNT * 100}%` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="flex items-center justify-center" style={{ width: `${100 / SLIDE_COUNT}%` }}>
                {slide}
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicator */}
        <DotIndicator count={SLIDE_COUNT} active={activeSlide} />

        {/* Chevron right */}
        <button
          onClick={() => goToSlide("next")}
          className="absolute right-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center bg-gradient-to-l from-card via-card/80 to-transparent opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
