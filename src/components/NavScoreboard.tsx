import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Target, Trophy, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const fmt = (n: number) => Math.round(n).toLocaleString();

// ─── Animated count chip ────────────────────────────────────────────────────
function PipelineChip({ label, count }: { label: string; count: number }) {
  const prevRef = useRef(count);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (count !== prevRef.current) {
      prevRef.current = count;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium tabular-nums transition-all duration-300 ${
        flash
          ? "bg-primary/20 text-primary scale-110"
          : "bg-muted/60 text-muted-foreground"
      }`}
    >
      <span className={`transition-transform duration-200 ${flash ? "scale-125" : ""}`}>{count}</span>
      {label}
    </span>
  );
}

// ─── Status label driven by % to goal ───────────────────────────────────────
function getStatusLabel(pct: number): { text: string; color: string } {
  if (pct >= 100) return { text: "Goal hit", color: "text-emerald-500" };
  if (pct >= 80) return { text: "On pace", color: "text-emerald-500" };
  if (pct >= 50) return { text: "Tracking", color: "text-primary" };
  if (pct >= 25) return { text: "Building", color: "text-amber-500" };
  return { text: "Ramping", color: "text-muted-foreground" };
}

interface ProducerData {
  userId: string;
  name: string;
  initials: string;
  agencyName: string | null;
  isFake: boolean;
  ytdPremium: number;
  ytdRevenue: number;
  mtdPremium: number;
  mtdRevenue: number;
  annualPremGoal: number;
  annualRevGoal: number;
  pipeline: { prospects: number; quoting: number; presenting: number; sold: number; lost: number };
}

// The admin user id for Jane Smith (fake producer entry)
const JANE_SMITH_ID = "77f8c5de-6462-4721-b654-3909c398667b";

export function NavScoreboard() {
  const { user } = useAuth();
  const { isClientServices, role } = useUserRole();
  const [producers, setProducers] = useState<ProducerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalPremium, setGoalPremium] = useState("");
  const [goalRevenue, setGoalRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const congratsShownRef = useRef(false);

  const now = new Date();
  const year = now.getFullYear();

  // Find current user's goals for the dialog
  const myProducer = producers.find(p => p.userId === user?.id);
  const goals = myProducer ? { annual_premium_goal: myProducer.annualPremGoal, annual_revenue_goal: myProducer.annualRevGoal } : null;
  const annualPrem = goals?.annual_premium_goal || 0;
  const monthlyPremGoal = annualPrem / 12;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all producers & admins (include admin as fake producer)
      const [rolesRes, profilesRes, allPoliciesRes, mtdPoliciesRes, allLeadsRes, goalsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("user_id, full_name, agency_name"),
        supabase.from("policies").select("producer_user_id, annual_premium, revenue").eq("status", "approved"),
        supabase.from("policies").select("producer_user_id, annual_premium, revenue").eq("status", "approved").gte("approved_at", monthStart),
        supabase.from("leads").select("id, stage, owner_user_id"),
        supabase.from("producer_goals" as any).select("user_id, annual_premium_goal, annual_revenue_goal, year").eq("year", year),
      ]);

      const roles = rolesRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const allPolicies = allPoliciesRes.data ?? [];
      const mtdPolicies = mtdPoliciesRes.data ?? [];
      const allLeads = allLeadsRes.data ?? [];
      const allGoals = goalsRes.data ?? [];

      // Find producer user IDs (role = producer) + admin as fake
      const producerIds = new Set<string>();
      roles.forEach((r: any) => {
        if (r.role === "producer") producerIds.add(r.user_id);
      });
      // Always add Jane Smith (admin) as fake producer
      producerIds.add(JANE_SMITH_ID);

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
      const goalsMap = new Map((allGoals as any[]).map((g: any) => [g.user_id, g]));

      const producerList: ProducerData[] = [];

      producerIds.forEach(uid => {
        const prof = profileMap.get(uid) as any;
        const name = prof?.full_name || "Unknown";
        const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        const isFake = uid === JANE_SMITH_ID;
        const agencyName = prof?.agency_name || null;

        // YTD stats
        const userPolicies = allPolicies.filter((p: any) => p.producer_user_id === uid);
        const ytdPremium = userPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0);
        const ytdRevenue = userPolicies.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0);

        // MTD stats
        const userMtd = mtdPolicies.filter((p: any) => p.producer_user_id === uid);
        const mtdPremium = userMtd.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0);
        const mtdRevenue = userMtd.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0);

        // Goals
        const goal = goalsMap.get(uid) as any;
        const annualPremGoal = Number(goal?.annual_premium_goal) || 0;
        const annualRevGoal = Number(goal?.annual_revenue_goal) || 0;

        // Pipeline
        const userLeads = allLeads.filter((l: any) => l.owner_user_id === uid);
        const pipeline = { prospects: 0, quoting: 0, presenting: 0, sold: userPolicies.length, lost: 0 };
        userLeads.forEach((l: any) => {
          if (l.stage === "prospect") pipeline.prospects++;
          else if (l.stage === "quoting") pipeline.quoting++;
          else if (l.stage === "presenting") pipeline.presenting++;
          else if (l.stage === "lost") pipeline.lost++;
        });

        producerList.push({
          userId: uid, name, initials, agencyName, isFake,
          ytdPremium, ytdRevenue, mtdPremium, mtdRevenue,
          annualPremGoal, annualRevGoal, pipeline,
        });
      });

      // Sort: real producers first, then fake
      producerList.sort((a, b) => {
        if (a.isFake !== b.isFake) return a.isFake ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      setProducers(producerList);

      // Check congrats for current user
      const me = producerList.find(p => p.userId === user.id);
      if (me) {
        const mGoal = me.annualPremGoal / 12;
        if (mGoal > 0 && me.mtdPremium >= mGoal && !congratsShownRef.current) {
          congratsShownRef.current = true;
          setTimeout(() => setShowCongrats(true), 800);
        }
      }

      setLoading(false);
    })();
  }, [user, year]);

  const handleSaveGoals = async () => {
    if (!user) return;
    const premGoal = parseFloat(goalPremium) || 0;
    const revGoal = parseFloat(goalRevenue) || 0;
    if (premGoal <= 0 && revGoal <= 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("producer_goals" as any)
      .upsert({ user_id: user.id, year, annual_premium_goal: premGoal, annual_revenue_goal: revGoal } as any, { onConflict: "user_id,year" });
    if (!error) {
      // Update local state
      setProducers(prev => prev.map(p => p.userId === user.id ? { ...p, annualPremGoal: premGoal, annualRevGoal: revGoal } : p));
      setGoalDialogOpen(false);
    }
    setSaving(false);
  };

  const handlePremiumChange = (v: string) => {
    setGoalPremium(v);
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0) setGoalRevenue(Math.round(num * 0.12).toString());
  };

  if (!user || isClientServices) return null;

  if (loading) {
    return (
      <div className="w-full bg-card/60 backdrop-blur-md animate-pulse">
        <div className="flex items-center h-[34px] px-4 gap-4">
          <div className="h-4 w-4 rounded-full bg-muted/50" />
          <div className="h-2 w-28 rounded bg-muted/40" />
          <div className="h-2 w-20 rounded bg-muted/30" />
          <div className="h-2 w-20 rounded bg-muted/30" />
        </div>
      </div>
    );
  }

  // If current user has no goals, show the set-goals prompt
  if (!myProducer || myProducer.annualPremGoal === 0) {
    return (
      <>
        <button
          onClick={() => { setGoalPremium(""); setGoalRevenue(""); setGoalDialogOpen(true); }}
          className="w-full border-b border-border bg-card/90 backdrop-blur-sm px-4 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors group"
        >
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Set your {year} production goals to activate HUD
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

  // Congrats data for current user
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const paceMultiplier = dayOfMonth > 0 ? daysInMonth / dayOfMonth : 1;
  const projectedMonthly = (myProducer?.mtdPremium || 0) * paceMultiplier;

  const tickerContent = (
    <div className="flex items-center gap-6 shrink-0 text-[11px] whitespace-nowrap px-4">
      {producers.map((p, idx) => {
        const ytdPremPct = p.annualPremGoal > 0 ? (p.ytdPremium / p.annualPremGoal) * 100 : 0;
        const mtdPremPct = p.annualPremGoal > 0 ? (p.mtdPremium / (p.annualPremGoal / 12)) * 100 : 0;
        const status = getStatusLabel(ytdPremPct);
        const displayName = p.isFake ? `${p.name} (FAKE)` : p.name;

        return (
          <div key={p.userId} className="flex items-center gap-6 shrink-0">
            {idx > 0 && <span className="text-muted-foreground/20 text-lg mr-2">|</span>}
            {/* Identity */}
            <span className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className={`text-[9px] font-bold ${p.isFake ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}`}>{p.initials}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground">{displayName}</span>
              {p.agencyName && <span className="text-[9px] text-muted-foreground/60">{p.agencyName}</span>}
              <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${status.color}`}>{status.text}</span>
            </span>

            <span className="text-muted-foreground/30">•</span>

            {/* MTD */}
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">MTD NB:</span>
              <span className="font-semibold tabular-nums text-foreground">${fmt(p.mtdPremium)}</span>
              <span className="text-muted-foreground">Rev:</span>
              <span className="font-semibold tabular-nums text-foreground">${fmt(p.mtdRevenue)}</span>
              {p.annualPremGoal > 0 && (
                <span className="text-[9px] text-muted-foreground tabular-nums ml-1">({Math.round(mtdPremPct)}% of mo.)</span>
              )}
            </span>

            <span className="text-muted-foreground/30">•</span>

            {/* YTD */}
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">YTD NB:</span>
              <span className="font-semibold tabular-nums text-foreground">${fmt(p.ytdPremium)}</span>
              <span className="text-muted-foreground">Rev:</span>
              <span className="font-semibold tabular-nums text-foreground">${fmt(p.ytdRevenue)}</span>
              {p.annualPremGoal > 0 && (
                <span className="text-[9px] text-muted-foreground tabular-nums ml-1">({Math.round(ytdPremPct)}% of annual)</span>
              )}
            </span>

            <span className="text-muted-foreground/30">•</span>

            {/* Pipeline */}
            <span className="flex items-center gap-1.5">
              <PipelineChip label="Prospects" count={p.pipeline.prospects} />
              <PipelineChip label="Quoting" count={p.pipeline.quoting} />
              <PipelineChip label="Submissions" count={p.pipeline.presenting} />
              <PipelineChip label="Sold" count={p.pipeline.sold} />
              <PipelineChip label="Dead" count={p.pipeline.lost} />
            </span>
          </div>
        );
      })}

      <span className="text-muted-foreground/30 ml-2">•</span>

      {/* Goal edit for current user */}
      <button
        onClick={(e) => { e.stopPropagation(); setGoalPremium(annualPrem.toString()); setGoalRevenue((goals?.annual_revenue_goal || 0).toString()); setGoalDialogOpen(true); }}
        className="text-muted-foreground/40 hover:text-foreground transition-colors"
      >
        <Target className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <>
      <div className="w-full bg-card/60 backdrop-blur-md overflow-hidden">
        <div className="flex h-[34px] items-center ticker-track">
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

      {/* Congratulations Dialog */}
      <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
        <DialogContent className="max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-scale-in">
                <Trophy className="h-10 w-10 text-emerald-500" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400 animate-fade-in" />
              <PartyPopper className="absolute -bottom-1 -left-1 h-5 w-5 text-primary animate-fade-in" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">🎉 Monthly Goal Crushed!</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>
                  You've hit <span className="font-semibold text-foreground">${fmt(myProducer?.mtdPremium || 0)}</span> in new business this month,
                  surpassing your <span className="font-semibold text-foreground">${fmt(monthlyPremGoal)}</span> goal!
                </p>
                <p>
                  At this pace, you're projected to close <span className="font-semibold text-emerald-500">${fmt(projectedMonthly)}</span> this month
                  — that's <span className="font-semibold text-emerald-500">{Math.round((projectedMonthly / monthlyPremGoal) * 100)}%</span> of target.
                </p>
                <p className="pt-2 text-foreground font-medium">Keep this momentum going! 🚀</p>
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setShowCongrats(false)} className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white">
              Let's keep going
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
              <p className="text-[11px] text-muted-foreground mt-1">Monthly target: ${fmt(parseFloat(goalPremium) / 12)}</p>
            )}
          </div>
          <div>
            <Label>Annual Revenue Goal</Label>
            <Input type="number" placeholder="e.g. 180000" value={goalRevenue} onChange={(e) => setGoalRevenue(e.target.value)} />
            {goalRevenue && parseFloat(goalRevenue) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">Monthly target: ${fmt(parseFloat(goalRevenue) / 12)}</p>
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
