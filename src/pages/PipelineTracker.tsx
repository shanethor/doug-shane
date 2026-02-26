import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, CheckCircle, BarChart3 } from "lucide-react";

export default function PipelineTracker() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("uid");
  const [stats, setStats] = useState({
    totalProspects: 0,
    totalPremiumPipeline: 0,
    totalRevenuePipeline: 0,
    totalPremiumSold: 0,
    totalRevenueSold: 0,
  });
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStats = useCallback(async () => {
    if (!userId) { setError(true); setLoading(false); return; }

    const [leadsRes, policiesRes, profileRes] = await Promise.all([
      supabase.from("leads").select("id, stage").eq("owner_user_id", userId),
      supabase.from("policies").select("annual_premium, revenue, status").eq("producer_user_id", userId),
      supabase.from("profiles").select("full_name, agency_name").eq("user_id", userId).maybeSingle(),
    ]);

    const leads = leadsRes.data ?? [];
    const policies = policiesRes.data ?? [];

    const activeLeads = leads.filter(l => l.stage !== "lost");
    const approvedPolicies = policies.filter((p: any) => p.status === "approved");
    const allPolicies = policies;

    setStats({
      totalProspects: activeLeads.length,
      totalPremiumPipeline: allPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
      totalRevenuePipeline: allPolicies.reduce((s: number, p: any) => s + Number(p.revenue || p.annual_premium * 0.12 || 0), 0),
      totalPremiumSold: approvedPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
      totalRevenueSold: approvedPolicies.reduce((s: number, p: any) => s + Number(p.revenue || p.annual_premium * 0.12 || 0), 0),
    });

    if (profileRes.data) {
      setAgencyName(profileRes.data.agency_name || profileRes.data.full_name || null);
    }

    setLoading(false);
  }, [userId]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold">Pipeline Tracker</h1>
          </div>
          {agencyName && <p className="text-muted-foreground font-sans text-sm">{agencyName}</p>}
          <Badge variant="outline" className="mt-3 text-[10px] uppercase tracking-wider font-sans">
            Live · Updates every 15s
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.totalProspects}</p>
                  <p className="text-xs text-muted-foreground font-sans">Active Prospects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-accent/10 p-2.5">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{fmt(stats.totalPremiumPipeline)}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Premium in Pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-accent/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{fmt(stats.totalRevenuePipeline)}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Revenue in Pipeline</p>
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
