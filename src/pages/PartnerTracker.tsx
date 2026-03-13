import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign, Send, FileCheck, BarChart3, Loader2 } from "lucide-react";


const PARTNER_NAMES: Record<string, string> = {
  "josh-chernes": "Joshua Chernes",
  "michael-wengzn": "Michael Wengzn",
  "associated": "Associated Insurance Services",
};

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  quoting: "Quoting",
  presenting: "Presenting",
  lost: "Lost",
};

type PartnerStats = {
  partner_slug: string;
  total_links_generated: number;
  total_submissions: number;
  leads_created: number;
  stage_breakdown: Record<string, number>;
  policies_sold: number;
  total_premium_sold: number;
  total_revenue_sold: number;
};

export default function PartnerTracker() {
  const { token } = useParams<{ token: string }>();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    supabase.functions
      .invoke("partner-stats", { body: { token } })
      .then(({ data, error: err }) => {
        if (err || data?.error) {
          setError(data?.error || "Invalid or expired tracker link");
        } else {
          setStats(data);
        }
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error || "Tracker not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const partnerName = PARTNER_NAMES[stats.partner_slug] || stats.partner_slug;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-white text-[#1D2430]" data-theme="light">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <img src={auraLogo} alt="AURA Risk Group" className="h-7" style={{ filter: 'none' }} />
          <span className="text-xs font-medium text-[#1D2430]/60">Partner Referral Tracker</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{partnerName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Referral performance summary</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">Referrals Sent</span>
              </div>
              <p className="text-2xl font-bold">{stats.total_submissions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">Active Leads</span>
              </div>
              <p className="text-2xl font-bold">{stats.leads_created}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-medium text-muted-foreground">Policies Sold</span>
              </div>
              <p className="text-2xl font-bold">{stats.policies_sold}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-medium text-muted-foreground">Premium Placed</span>
              </div>
              <p className="text-2xl font-bold">{fmt(stats.total_premium_sold)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.stage_breakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No referrals in pipeline yet</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.stage_breakdown).map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-2 rounded-lg border px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={
                        stage === "prospect" ? "bg-muted/50 text-muted-foreground" :
                        stage === "quoting" ? "bg-primary/10 text-primary" :
                        stage === "presenting" ? "bg-accent/20 text-accent-foreground" :
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {STAGE_LABELS[stage] || stage}
                    </Badge>
                    <span className="text-lg font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        {stats.policies_sold > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Premium Placed</p>
                  <p className="text-xl font-bold">{fmt(stats.total_premium_sold)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agency Revenue</p>
                  <p className="text-xl font-bold">{fmt(stats.total_revenue_sold)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[10px] text-muted-foreground pt-4">
          Powered by AURA Risk Group · Data refreshes in real-time
        </p>
      </main>
    </div>
  );
}
