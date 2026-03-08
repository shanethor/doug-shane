import { useState, useEffect, useMemo, useRef } from "react";
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

type Props = {
  userId: string;
  premiumSold: number;
  revenueSold: number;
};

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString();

/* ── Animated number ── */
function AnimatedNum({ value, prefix = "" }: { value: string; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      setDisplay(value);
      prev.current = value;
      const t = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`transition-colors duration-300 ${flash ? "text-primary" : ""}`}>
      {prefix}{display}
    </span>
  );
}

/* ── Pipeline chip with flash ── */
function PipelineChip({ label, count }: { label: string; count: number }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (prev.current !== count) {
      setFlash(true);
      prev.current = count;
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums transition-all duration-300 ${
        flash
          ? "border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <span className="font-bold">{count}</span> {label}
    </span>
  );
}

/* ── Status badge ── */
function StatusBadge({ pct }: { pct: number }) {
  let text: string, cls: string;
  if (pct >= 120) {
    text = "Ahead of pace"; cls = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
  } else if (pct >= 80) {
    text = "On pace"; cls = "text-primary bg-primary/10 border-primary/30";
  } else {
    text = "Behind pace"; cls = "text-amber-600 bg-amber-500/10 border-amber-500/30";
  }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
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

  const now = new Date();
  const year = now.getFullYear();

  // Load goals + profile + pipeline
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

  // % to goal calculation (pro-rated to today)
  const annualGoal = goals?.annual_premium_goal || 0;
  const { percentToGoal, progressFraction } = useMemo(() => {
    if (annualGoal <= 0) return { percentToGoal: 0, progressFraction: 0 };
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / 86400000;
    const dayOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    const expectedByToday = (dayOfYear / totalDays) * annualGoal;
    const pct = expectedByToday > 0 ? (premiumSold / expectedByToday) * 100 : 0;
    return {
      percentToGoal: Math.min(pct, 200),
      progressFraction: Math.min(premiumSold / annualGoal, 1),
    };
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

  const roleLabel = role === "manager" ? "Manager" : role === "admin" ? "Admin" : "Producer";
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Producer";

  // Loading skeleton — slim rail
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm px-3 py-2 mb-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-3 w-24 rounded bg-muted/50" />
          <div className="h-3 w-16 rounded bg-muted/40" />
          <div className="h-3 w-20 rounded bg-muted/40" />
          <div className="flex-1" />
          <div className="h-3 w-14 rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  // No goals set — compact prompt
  if (!goals || annualGoal === 0) {
    return (
      <>
        <button
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
          className="w-full rounded-lg border border-dashed border-primary/30 bg-card/80 backdrop-blur-sm px-3 py-2.5 mb-4 flex items-center gap-2 hover:border-primary/50 transition-colors group"
        >
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Set your {year} production goals to activate the HUD
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

  const monthlyPrem = annualGoal / 12;
  const monthlyRev = (goals.annual_revenue_goal || 0) / 12;

  return (
    <>
      <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm overflow-hidden mb-4">
        {/* Main rail */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-[11px]">
          {/* Identity + status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-semibold text-foreground truncate max-w-[120px]">{displayName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{roleLabel}</span>
            <StatusBadge pct={percentToGoal} />
          </div>

          <div className="h-3 w-px bg-border shrink-0 hidden sm:block" />

          {/* MTD numbers */}
          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
            <span className="uppercase tracking-wider text-[9px] font-bold">MTD</span>
            <span className="text-foreground font-semibold tabular-nums">
              <AnimatedNum value={fmt(premiumSold)} />
            </span>
            <span className="text-[9px]">NB</span>
            <span className="text-foreground font-semibold tabular-nums">
              <AnimatedNum value={fmt(revenueSold)} />
            </span>
            <span className="text-[9px]">Rev</span>
          </div>

          <div className="h-3 w-px bg-border shrink-0 hidden sm:block" />

          {/* YTD numbers */}
          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
            <span className="uppercase tracking-wider text-[9px] font-bold">YTD</span>
            <span className="text-foreground font-semibold tabular-nums">
              <AnimatedNum value={fmt(premiumSold)} />
            </span>
            <span className="text-[9px]">NB</span>
            <span className="text-foreground font-semibold tabular-nums">
              <AnimatedNum value={fmt(revenueSold)} />
            </span>
            <span className="text-[9px]">Rev</span>
          </div>

          <div className="h-3 w-px bg-border shrink-0 hidden sm:block" />

          {/* % to goal */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Goal</span>
            <span className="text-foreground font-semibold tabular-nums">{percentToGoal.toFixed(0)}%</span>
          </div>

          {/* Edit goals button */}
          <button
            onClick={() => { setGoalPremium(annualGoal.toString()); setGoalRevenue((goals.annual_revenue_goal || 0).toString()); setGoalDialogOpen(true); }}
            className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0 hidden sm:block"
          >
            <Target className="h-3 w-3" />
          </button>

          <div className="flex-1 min-w-0" />

          {/* Pipeline chips */}
          <div className="flex items-center gap-1 flex-wrap">
            <PipelineChip label="Prospects" count={pipeline.prospects} />
            <PipelineChip label="Quoting" count={pipeline.quoting} />
            <PipelineChip label="Presenting" count={pipeline.presenting} />
            <PipelineChip label="Sold" count={pipeline.sold} />
            <PipelineChip label="Dead" count={pipeline.lost} />
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="h-[2px] w-full bg-muted/50">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progressFraction * 100}%` }}
          />
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
