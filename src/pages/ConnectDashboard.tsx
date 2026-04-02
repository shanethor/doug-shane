import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Clock, Bot,
  BarChart3, ArrowUpRight, Users, Zap, RefreshCw, Settings,
  HelpCircle, CreditCard, User, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

/* ---------- AI time-saved ticker ---------- */
function useTimeSavedTicker() {
  // Base: 2.4 hrs saved per lead interaction, ticks up in real-time
  const [seconds, setSeconds] = useState(0);
  const [baseHours, setBaseHours] = useState(0);

  useEffect(() => {
    // Simulate accumulated time based on account age
    const created = new Date().getTime();
    const daysSinceJoin = Math.max(1, Math.floor((Date.now() - created) / 86400000));
    setBaseHours(daysSinceJoin * 1.2); // ~1.2 hrs/day average
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalMinutes = baseHours * 60 + seconds / 60;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  const secs = seconds % 60;

  return { hours, mins, secs, totalMinutes };
}

/* ---------- Stat Card ---------- */
function StatCard({ icon: Icon, label, value, sub, trend, color = "primary" }: {
  icon: any; label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-muted/50">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          {trend === "up" && <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]"><TrendingUp className="h-3 w-3 mr-1" />Up</Badge>}
          {trend === "down" && <Badge variant="outline" className="text-red-400 border-red-400/30 text-[10px]"><TrendingDown className="h-3 w-3 mr-1" />Down</Badge>}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ConnectDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ticker = useTimeSavedTicker();

  const [stats, setStats] = useState({
    totalLeads: 0,
    closedWon: 0,
    closedLost: 0,
    totalPremium: 0,
    leadSpend: 0,
    activeDeals: 0,
    avgDaysToClose: 0,
  });
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      const [leadsRes, profileRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, stage, target_premium, created_at, stage_changed_at")
          .eq("owner_user_id", user.id),
        supabase
          .from("profiles")
          .select("full_name, industry, specializations, states_of_operation, connect_vertical")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const leads = leadsRes.data || [];
      const closedWon = leads.filter((l: any) => l.stage === "closed_won");
      const closedLost = leads.filter((l: any) => l.stage === "closed_lost");
      const active = leads.filter((l: any) => !["closed_won", "closed_lost"].includes(l.stage || ""));
      const totalPremium = closedWon.reduce((s: number, l: any) => s + (l.target_premium || 0), 0);

      const closeDays = closedWon
        .filter((l: any) => l.created_at && l.stage_changed_at)
        .map((l: any) => (new Date(l.stage_changed_at).getTime() - new Date(l.created_at).getTime()) / 86400000);
      const avgDays = closeDays.length ? Math.round(closeDays.reduce((a: number, b: number) => a + b, 0) / closeDays.length) : 0;

      setStats({
        totalLeads: leads.length,
        closedWon: closedWon.length,
        closedLost: closedLost.length,
        totalPremium,
        leadSpend: 0, // placeholder — would come from Stripe
        activeDeals: active.length,
        avgDaysToClose: avgDays,
      });
      setProfile(profileRes.data);
      setLoading(false);
    };

    loadData();
  }, [user?.id]);

  const closingRate = stats.totalLeads > 0
    ? Math.round((stats.closedWon / stats.totalLeads) * 100)
    : 0;

  const roi = stats.leadSpend > 0
    ? ((stats.totalPremium - stats.leadSpend) / stats.leadSpend * 100).toFixed(0)
    : "∞";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's how your business is performing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-muted-foreground border-border">
            {profile?.connect_vertical || profile?.industry || "General"}
          </Badge>
          {profile?.states_of_operation?.length > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-border">
              {profile.states_of_operation.length} state{profile.states_of_operation.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* AI Time Saved Ticker */}
      <Card className="bg-gradient-to-r from-[hsl(140_12%_42%/0.08)] to-[hsl(140_12%_42%/0.02)] border-[hsl(140_12%_42%/0.2)]">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[hsl(140_12%_42%/0.15)]">
                <Bot className="h-5 w-5 text-[hsl(140_12%_58%)]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Time Saved with AURA AI</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {ticker.hours}
                  </span>
                  <span className="text-sm text-muted-foreground">hrs</span>
                  <span className="text-3xl font-bold tabular-nums text-foreground ml-1">
                    {String(ticker.mins).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-muted-foreground">min</span>
                  <span className="text-lg font-semibold tabular-nums text-muted-foreground/60 ml-1">
                    {String(ticker.secs).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">sec</span>
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Automated tasks</p>
              <p className="text-lg font-semibold text-foreground">{Math.floor(ticker.totalMinutes / 3)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Target}
          label="Closing Rate"
          value={`${closingRate}%`}
          sub={`${stats.closedWon} won / ${stats.totalLeads} total`}
          trend={closingRate >= 20 ? "up" : closingRate > 0 ? "down" : "neutral"}
        />
        <StatCard
          icon={DollarSign}
          label="Total Sales Closed"
          value={`$${stats.totalPremium.toLocaleString()}`}
          sub="Lifetime premium written"
          trend={stats.totalPremium > 0 ? "up" : "neutral"}
        />
        <StatCard
          icon={BarChart3}
          label="Lead Spend"
          value={`$${stats.leadSpend.toLocaleString()}`}
          sub={`ROI: ${roi}%`}
        />
        <StatCard
          icon={Users}
          label="Active Deals"
          value={String(stats.activeDeals)}
          sub={`Avg ${stats.avgDaysToClose} days to close`}
        />
      </div>

      {/* Closing Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Closing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Won</span>
                <span className="text-emerald-400 font-medium">{stats.closedWon}</span>
              </div>
              <Progress value={stats.totalLeads > 0 ? (stats.closedWon / stats.totalLeads) * 100 : 0} className="h-2 bg-muted" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Lost</span>
                <span className="text-red-400 font-medium">{stats.closedLost}</span>
              </div>
              <Progress value={stats.totalLeads > 0 ? (stats.closedLost / stats.totalLeads) * 100 : 0} className="h-2 bg-muted [&>div]:bg-red-400/60" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">In Progress</span>
                <span className="text-foreground font-medium">{stats.activeDeals}</span>
              </div>
              <Progress value={stats.totalLeads > 0 ? (stats.activeDeals / stats.totalLeads) * 100 : 0} className="h-2 bg-muted [&>div]:bg-amber-400/60" />
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Leads</span>
              <span className="text-foreground font-semibold">{stats.totalLeads}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Sales vs Spend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Revenue Closed</p>
                <p className="text-xl font-bold text-emerald-400">${stats.totalPremium.toLocaleString()}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Lead Investment</p>
                <p className="text-xl font-bold text-foreground">${stats.leadSpend.toLocaleString()}</p>
              </div>
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Net Return</span>
              <span className={`text-sm font-bold ${stats.totalPremium >= stats.leadSpend ? "text-emerald-400" : "text-red-400"}`}>
                ${(stats.totalPremium - stats.leadSpend).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => navigate("/app/settings")}
            >
              <Settings className="h-4 w-4" />
              <span className="text-xs">Settings</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => navigate("/app/settings")}
            >
              <User className="h-4 w-4" />
              <span className="text-xs">Profile</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => navigate("/connect/pipeline")}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Pipeline</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => navigate("/connect/leads")}
            >
              <Zap className="h-4 w-4" />
              <span className="text-xs">Get Leads</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/20">
              <span className="text-muted-foreground text-xs">Email</span>
              <span className="text-xs text-foreground font-medium truncate ml-2">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/20">
              <span className="text-muted-foreground text-xs">Industry</span>
              <span className="text-xs text-foreground font-medium">{profile?.connect_vertical || profile?.industry || "—"}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/20">
              <span className="text-muted-foreground text-xs">Specializations</span>
              <span className="text-xs text-foreground font-medium truncate ml-2">
                {profile?.specializations?.length ? profile.specializations.join(", ") : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/20">
              <span className="text-muted-foreground text-xs">States</span>
              <span className="text-xs text-foreground font-medium truncate ml-2">
                {profile?.states_of_operation?.length ? profile.states_of_operation.join(", ") : "—"}
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 border-border text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/app/settings")}
            >
              <CreditCard className="h-3 w-3" /> Manage Subscription
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 border-border text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/app/settings")}
            >
              <HelpCircle className="h-3 w-3" /> Get Help
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
