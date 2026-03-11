import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, DollarSign, TrendingUp, CheckCircle, BarChart3, CalendarDays } from "lucide-react";

type TimePeriod = "all" | "month" | "quarter" | "year";

export default function PipelineTracker() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("uid");
  const [period, setPeriod] = useState<TimePeriod>("all");
  const [stats, setStats] = useState({
    totalProspects: 0,
    quotingCount: 0,
    presentingCount: 0,
    soldCount: 0,
    presentingPremium: 0,
    presentingRevenue: 0,
    totalPremiumSold: 0,
    totalRevenueSold: 0,
    targetPremium: 0,
    targetRevenue: 0,
  });
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!userId) {
      setError(true);
      setLoading(false);
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke("tracker-stats", {
      body: { uid: userId, period },
    });

    if (fnError || !data?.stats) {
      setError(true);
      setLoading(false);
      return;
    }

    setStats(data.stats);
    setAgencyName(data.agency_name || null);
    setUserName(data.full_name || null);
    setError(false);
    setLoading(false);
  }, [userId, period]);

  // Live-update every 15 seconds
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [loadStats]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Invalid tracker link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const PERIOD_LABELS: Record<TimePeriod, string> = {
    all: "All Time",
    month: "This Month",
    quarter: "This Quarter",
    year: "This Year",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold">Pipeline Tracker</h1>
          </div>
          {(userName || agencyName) && (
            <p className="text-foreground font-sans text-base font-medium mt-1">
              {userName}{agencyName && userName ? ` · ${agencyName}` : agencyName || ""}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-3">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-sans">
              Live · Updates every 15s
            </Badge>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[130px] h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-sans text-muted-foreground">
            <span className="font-medium text-foreground">Prospects</span>
            <span>/</span>
            <span className="font-medium text-foreground">Submitted</span>
            <span>/</span>
            <span className="font-medium text-foreground">Presenting</span>
            <span>/</span>
            <span className="font-medium text-foreground">Sold</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.totalProspects}</p>
                  <p className="text-xs text-muted-foreground font-sans">Prospects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.quotingCount}</p>
                  <p className="text-xs text-muted-foreground font-sans">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-accent/10 p-2.5">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.presentingCount}</p>
                  <p className="text-xs text-muted-foreground font-sans">Presenting</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success/10 p-2.5">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.soldCount}</p>
                  <p className="text-xs text-muted-foreground font-sans">Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-success/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success/10 p-2.5">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{fmt(stats.totalPremiumSold)}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Premium Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{fmt(stats.totalRevenueSold)}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Revenue Sold (12%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-[11px] text-muted-foreground font-sans mt-8">
          Powered by AURA · Revenue = 12% of premium
        </p>
      </div>
    </div>
  );
}
