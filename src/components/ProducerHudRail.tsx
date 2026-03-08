import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString();

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
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${cls}`}>
      {text}
    </span>
  );
}

/* ── Single ticker item ── */
function TickerItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 whitespace-nowrap text-[11px]">
      {children}
    </span>
  );
}

function Divider() {
  return <span className="inline-block w-px h-3 bg-border mx-1 shrink-0" />;
}

/* ── Main Component ── */
export function ProducerHudRail() {
  const { user } = useAuth();
  const { role, isClientServices } = useUserRole();
  const [goals, setGoals] = useState<{ annual_premium_goal: number; annual_revenue_goal: number } | null>(null);
  const [pipeline, setPipeline] = useState({ prospects: 0, quoting: 0, presenting: 0, sold: 0, lost: 0 });
  const [premiumSold, setPremiumSold] = useState(0);
  const [revenueSold, setRevenueSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const now = new Date();
  const year = now.getFullYear();
  const userId = user?.id;

  const endOfMonth = useMemo(() => new Date(year, now.getMonth() + 1, 1), [year, now.getMonth()]);
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const daysInMonth = Math.floor((endOfMonth.getTime() - startOfMonth.getTime()) / 86400000);
  const daysLeftInMonth = Math.max(1, daysInMonth - now.getDate());

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const daysLeftInYear = Math.max(1, daysInYear - dayOfYear);

  // Don't render for client_services
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

  // Auto-scroll marquee
  const scrollSpeed = 0.4; // px per frame
  const tick = useCallback(() => {
    const el = scrollRef.current;
    if (el && !paused) {
      el.scrollLeft += scrollSpeed;
      // When we've scrolled half (the duplicated content), reset to start
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      }
    }
    animRef.current = requestAnimationFrame(tick);
  }, [paused]);

  useEffect(() => {
    if (!shouldShow || loading) return;
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [tick, shouldShow, loading]);

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

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full border-b border-border bg-card/90 backdrop-blur-sm animate-pulse">
        <div className="flex items-center h-[28px] px-3 gap-4">
          <div className="h-2 w-16 rounded bg-muted/50" />
          <div className="h-2 w-24 rounded bg-muted/40" />
          <div className="h-2 w-20 rounded bg-muted/40" />
          <div className="h-2 w-16 rounded bg-muted/40" />
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
          className="w-full border-b border-border bg-card/90 backdrop-blur-sm px-4 py-1.5 flex items-center gap-2 hover:bg-muted/30 transition-colors group"
        >
          <Target className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
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

  /* Build the ticker content — duplicated for seamless loop */
  const tickerContent = (
    <>
      <TickerItem>
        <StatusPill pct={percentToGoal} />
        <button
          onClick={(e) => { e.stopPropagation(); setGoalPremium(annualGoal.toString()); setGoalRevenue(annualRevGoal.toString()); setGoalDialogOpen(true); }}
          className="text-muted-foreground/30 hover:text-foreground transition-colors"
        >
          <Target className="h-2.5 w-2.5" />
        </button>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">NB MTD</span>
        <span className="text-muted-foreground">Prem</span>
        <span className="font-bold tabular-nums text-foreground">{fmt(premiumSold)}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-muted-foreground tabular-nums">{fmt(monthlyGoal)}</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">NB MTD</span>
        <span className="text-muted-foreground">Rev</span>
        <span className="font-bold tabular-nums text-foreground">{fmt(revenueSold)}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-muted-foreground tabular-nums">{fmt(monthlyRevGoal)}</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">MTD Gap</span>
        <span className="font-bold tabular-nums text-foreground">{fmt(mPremRemaining)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground tabular-nums">{fmt(daysLeftInMonth > 0 ? mPremRemaining / daysLeftInMonth : 0)}/day</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{daysLeftInMonth}d left</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">NB YTD</span>
        <span className="text-muted-foreground">Prem</span>
        <span className="font-bold tabular-nums text-foreground">{fmt(premiumSold)}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-muted-foreground tabular-nums">{fmt(annualGoal)}</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">NB YTD</span>
        <span className="text-muted-foreground">Rev</span>
        <span className="font-bold tabular-nums text-foreground">{fmt(revenueSold)}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-muted-foreground tabular-nums">{fmt(annualRevGoal)}</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">YTD Gap</span>
        <span className="font-bold tabular-nums text-foreground">{fmt(yPremRemaining)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground tabular-nums">{fmt(daysLeftInYear > 0 ? yPremRemaining / daysLeftInYear : 0)}/day</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{daysLeftInYear}d left</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">Goal</span>
        <span className="font-black tabular-nums text-foreground">{percentToGoal.toFixed(0)}%</span>
      </TickerItem>

      <Divider />

      <TickerItem>
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">Pipeline</span>
        <span className="text-muted-foreground">P</span>
        <span className="font-bold tabular-nums">{pipeline.prospects}</span>
        <span className="text-muted-foreground">Q</span>
        <span className="font-bold tabular-nums">{pipeline.quoting}</span>
        <span className="text-muted-foreground">Pr</span>
        <span className="font-bold tabular-nums">{pipeline.presenting}</span>
        <span className="text-muted-foreground">S</span>
        <span className="font-bold tabular-nums text-emerald-600">{pipeline.sold}</span>
        <span className="text-muted-foreground">L</span>
        <span className="font-bold tabular-nums text-destructive">{pipeline.lost}</span>
      </TickerItem>

      <Divider />
    </>
  );

  return (
    <>
      <div
        className="w-full bg-card/95 backdrop-blur-sm border-b border-border overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={scrollRef}
          className="flex items-center h-[28px] overflow-x-hidden whitespace-nowrap"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Duplicate content for seamless loop */}
          {tickerContent}
          {tickerContent}
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
