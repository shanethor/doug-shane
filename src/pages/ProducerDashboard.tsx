import { useEffect, useState, useRef } from "react";
import { ProductionScoreboard } from "@/components/ProductionScoreboard";
import { ProductionAnalytics } from "@/components/ProductionAnalytics";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, FileText, TrendingUp, CheckCircle, CalendarDays, Users, Target, BarChart3, Clock, RefreshCw, Layers, Lock } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";

type TimePeriod = "month" | "quarter" | "year" | "all";

function getDateRange(period: TimePeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], end };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return { start: new Date(now.getFullYear(), q, 1).toISOString().split("T")[0], end };
  }
  if (period === "year") {
    return { start: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0], end };
  }
  return { start: "2000-01-01", end };
}

type AdvisorOption = { id: string; name: string };

type PipelineStage = { stage: string; count: number; premium: number };
type TopOpportunity = { id: string; account_name: string; line_type: string; target_premium: number; stage: string };

function ComingSoonCard({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-muted/30 backdrop-blur-[1px] z-10 flex items-center justify-center">
        <div className="flex items-center gap-2 bg-background/90 border rounded-full px-4 py-1.5 shadow-sm">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Coming Soon</span>
        </div>
      </div>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="mt-3 space-y-2">
          <div className="h-4 bg-muted/50 rounded w-3/4" />
          <div className="h-4 bg-muted/50 rounded w-1/2" />
          <div className="h-4 bg-muted/50 rounded w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProducerDashboard({ embedded }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isManager, isAdmin } = useUserRole();
  const canFilterAdvisors = isManager || isAdmin;

  const [policies, setPolicies] = useState<any[]>([]);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [leadInfos, setLeadInfos] = useState<{ id: string; account_name: string; business_type: string | null }[]>([]);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [period, setPeriod] = useState<TimePeriod>("year");
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("all");
  const [advisorOptions, setAdvisorOptions] = useState<AdvisorOption[]>([]);
  const [stats, setStats] = useState({
    totalPolicies: 0,
    approvedPolicies: 0,
    totalPremium: 0,
    totalRevenue: 0,
    pendingPolicies: 0,
    totalLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const loadIdRef = useRef(0);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Load advisor list for admin/manager
  useEffect(() => {
    if (!canFilterAdvisors) return;
    const loadAdvisors = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["advisor", "manager", "admin"]);
      if (!roles?.length) return;

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const options: AdvisorOption[] = (profiles || [])
        .map((p) => ({ id: p.user_id, name: p.full_name || p.user_id }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAdvisorOptions(options);
    };
    loadAdvisors();
  }, [canFilterAdvisors]);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user, period, isManager, isAdmin, selectedAdvisor]);

  const loadStats = async () => {
    if (!user) return;
    const thisLoad = ++loadIdRef.current;
    setLoading(true);

    const dateRange = getDateRange(period);

    const policiesQuery = supabase.from("policies").select("*");
    const leadsQuery = supabase.from("leads").select("id, stage, account_name, line_type, target_premium, estimated_renewal_date, created_at");

    if (canFilterAdvisors) {
      if (selectedAdvisor !== "all") {
        policiesQuery.eq("producer_user_id", selectedAdvisor);
        leadsQuery.eq("owner_user_id", selectedAdvisor);
      }
    } else {
      policiesQuery.eq("producer_user_id", user.id);
      leadsQuery.eq("owner_user_id", user.id);
    }

    const [policiesRes, leadsRes] = await Promise.all([
      policiesQuery,
      leadsQuery,
    ]);

    if (!mountedRef.current || thisLoad !== loadIdRef.current) return;

    const allPolicies = policiesRes.data ?? [];
    const fetchedLeads = leadsRes.data ?? [];
    setAllLeads(fetchedLeads);

    // Filter approved policies by effective_date for the selected period
    const approvedInRange = allPolicies.filter(
      (p: any) =>
        p.status === "approved" &&
        p.effective_date &&
        p.effective_date >= dateRange.start &&
        p.effective_date <= dateRange.end
    );

    const activeSold = allPolicies.filter((p: any) => p.status === "approved");
    setPolicies(activeSold);

    const leadIds = [...new Set(activeSold.map((p: any) => p.lead_id))];
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, account_name, business_type")
        .in("id", leadIds);
      const names: Record<string, string> = {};
      (leads ?? []).forEach((l: any) => { names[l.id] = l.account_name; });
      setLeadNames(names);
      setLeadInfos((leads ?? []).map((l: any) => ({ id: l.id, account_name: l.account_name, business_type: l.business_type })));
    } else {
      setLeadNames({});
      setLeadInfos([]);
    }

    // Compute MTD and YTD production by effective_date
    const nowDate = new Date();
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).toISOString().split("T")[0];
    const yearStart = new Date(nowDate.getFullYear(), 0, 1).toISOString().split("T")[0];
    const yearEnd = new Date(nowDate.getFullYear(), 11, 31).toISOString().split("T")[0];

    const mtdPolicies = activeSold.filter((p: any) =>
      p.effective_date && p.effective_date >= monthStart && p.effective_date <= monthEnd
    );
    const ytdPolicies = activeSold.filter((p: any) =>
      p.effective_date && p.effective_date >= yearStart && p.effective_date <= yearEnd
    );

    const newMtdPremium = mtdPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium), 0);
    const newMtdRevenue = mtdPolicies.reduce((s: number, p: any) => s + Number(p.revenue ?? 0), 0);
    const newYtdPremium = ytdPolicies.reduce((s: number, p: any) => s + Number(p.annual_premium), 0);
    const newYtdRevenue = ytdPolicies.reduce((s: number, p: any) => s + Number(p.revenue ?? 0), 0);

    setMtdPremium(newMtdPremium);
    setMtdRevenue(newMtdRevenue);
    setYtdPremium(newYtdPremium);
    setYtdRevenue(newYtdRevenue);

    setStats({
      totalPolicies: allPolicies.length,
      approvedPolicies: approvedInRange.length,
      totalPremium: approvedInRange.reduce((s: number, p: any) => s + Number(p.annual_premium), 0),
      totalRevenue: approvedInRange.reduce((s: number, p: any) => s + Number(p.revenue ?? 0), 0),
      pendingPolicies: allPolicies.filter((p: any) => p.status === "pending").length,
      totalLeads: fetchedLeads.filter((l: any) => {
        const isSold = allPolicies.some((p: any) => p.lead_id === l.id && p.status === "approved");
        return !isSold && l.stage !== "lost";
      }).length,
    });
    setLoading(false);
  };

  // Derived stats
  const soldLeadIds = new Set(policies.map((p) => p.lead_id));
  const openLeads = allLeads.filter((l) => !soldLeadIds.has(l.id) && l.stage !== "lost");

  // Pipeline by stage
  const pipelineByStage: PipelineStage[] = ["prospect", "quoting", "presenting"].map((stage) => {
    const stageLeads = openLeads.filter((l) => l.stage === stage);
    return {
      stage,
      count: stageLeads.length,
      premium: stageLeads.reduce((s, l) => s + (Number(l.target_premium) || 0), 0),
    };
  });

  // Hit ratio
  const totalQuotedOrBeyond = allLeads.filter((l) =>
    l.stage === "quoting" || l.stage === "presenting" || soldLeadIds.has(l.id)
  ).length;
  const totalBound = policies.length;
  const hitRatioCount = totalQuotedOrBeyond > 0 ? ((totalBound / totalQuotedOrBeyond) * 100).toFixed(0) : "—";
  const hitRatioPremium = (() => {
    const quotedPremium = allLeads
      .filter((l) => l.stage === "quoting" || l.stage === "presenting" || soldLeadIds.has(l.id))
      .reduce((s, l) => s + (Number(l.target_premium) || 0), 0);
    const boundPremium = stats.totalPremium;
    return quotedPremium > 0 ? ((boundPremium / quotedPremium) * 100).toFixed(0) : "—";
  })();

  // Top opportunities
  const topOpportunities: TopOpportunity[] = openLeads
    .filter((l) => (Number(l.target_premium) || 0) > 0)
    .sort((a, b) => (Number(b.target_premium) || 0) - (Number(a.target_premium) || 0))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      account_name: l.account_name,
      line_type: l.line_type || "—",
      target_premium: Number(l.target_premium) || 0,
      stage: l.stage,
    }));

  // Action strip items
  const now = new Date();
  const thirtyDaysOut = addDays(now, 30);
  const renewalsDue30 = allLeads.filter((l) => {
    if (!l.estimated_renewal_date) return false;
    const rd = new Date(l.estimated_renewal_date);
    return rd >= now && rd <= thirtyDaysOut && !soldLeadIds.has(l.id);
  }).length;

  // Policies per client
  const policiesPerClient = (() => {
    const clientCounts: Record<string, number> = {};
    policies.forEach((p) => {
      clientCounts[p.lead_id] = (clientCounts[p.lead_id] || 0) + 1;
    });
    const counts = Object.values(clientCounts);
    if (counts.length === 0) return { avg: 0, distribution: { one: 0, two: 0, threePlus: 0 } };
    const avg = counts.reduce((s, c) => s + c, 0) / counts.length;
    return {
      avg: Math.round(avg * 10) / 10,
      distribution: {
        one: counts.filter((c) => c === 1).length,
        two: counts.filter((c) => c === 2).length,
        threePlus: counts.filter((c) => c >= 3).length,
      },
    };
  })();

  const scoreboardUserId = canFilterAdvisors && selectedAdvisor !== "all"
    ? selectedAdvisor
    : user?.id;

  const dashboardTitle = canFilterAdvisors
    ? selectedAdvisor === "all"
      ? "All Advisors"
      : advisorOptions.find((p) => p.id === selectedAdvisor)?.name || "Advisor Dashboard"
    : "My Dashboard";

  const stageLabels: Record<string, string> = {
    prospect: "Prospect",
    quoting: "Quoting",
    presenting: "Presenting",
  };

  const content = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl mb-1 hidden md:block">{dashboardTitle}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canFilterAdvisors && (
            <>
              <Users className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="All Advisors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Advisors</SelectItem>
                  {advisorOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
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

      {/* Action Strip */}
      {!loading && (
        <div className="flex flex-wrap gap-2 mb-4">
          {renewalsDue30 > 0 && (
            <Badge className="bg-warning text-warning-foreground border-warning text-sm font-semibold py-1.5 px-4 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              {renewalsDue30} renewal{renewalsDue30 !== 1 ? "s" : ""} due in 30 days
            </Badge>
          )}
          {stats.pendingPolicies > 0 && (
            <Badge className="bg-primary text-primary-foreground border-primary text-sm font-semibold py-1.5 px-4 shadow-sm">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {stats.pendingPolicies} policies awaiting approval
            </Badge>
          )}
          {openLeads.filter((l) => l.stage === "presenting").length > 0 && (
            <Badge className="bg-primary text-primary-foreground border-primary text-sm font-semibold py-1.5 px-4 shadow-sm">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              {openLeads.filter((l) => l.stage === "presenting").length} deals in presenting
            </Badge>
          )}
        </div>
      )}

      {user && scoreboardUserId && (
        <ProductionScoreboard
          userId={scoreboardUserId}
          premiumSold={stats.totalPremium}
          revenueSold={stats.totalRevenue}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="rounded-full bg-primary/10 p-2 sm:p-2.5">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-semibold font-sans">{stats.totalLeads}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-sans">Total Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="rounded-full bg-success/10 p-2 sm:p-2.5">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-semibold font-sans">{stats.approvedPolicies}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-sans">Policies Sold</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="rounded-full bg-accent/10 p-2 sm:p-2.5">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-semibold font-sans">${stats.totalPremium.toLocaleString()}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-sans">Total Premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="rounded-full bg-warning/10 p-2 sm:p-2.5">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-semibold font-sans">${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-sans">Agency Revenue (Commissions/Fees)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hit Ratio + Pipeline Premium + Policies per Client */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Hit Ratio (Close Rate)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{hitRatioCount}{hitRatioCount !== "—" ? "%" : ""}</p>
                    <p className="text-[10px] text-muted-foreground">By Count</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{totalBound} bound / {totalQuotedOrBeyond} quoted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{hitRatioPremium}{hitRatioPremium !== "—" ? "%" : ""}</p>
                    <p className="text-[10px] text-muted-foreground">By Premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Pipeline by Stage
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {pipelineByStage.map((s) => (
                  <div key={s.stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] min-w-[70px] justify-center">
                        {stageLabels[s.stage] || s.stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.count} leads</span>
                    </div>
                    <span className="text-xs font-semibold">${s.premium.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="text-xs font-medium">Total Pipeline</span>
                  <span className="text-sm font-bold">
                    ${pipelineByStage.reduce((s, p) => s + p.premium, 0).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Policies per Client
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{policiesPerClient.avg}</p>
                <p className="text-[10px] text-muted-foreground mb-3">Avg policies per account</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">1 policy</span>
                    <span className="font-medium">{policiesPerClient.distribution.one} clients</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">2 policies</span>
                    <span className="font-medium">{policiesPerClient.distribution.two} clients</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">3+ policies</span>
                    <span className="font-medium">{policiesPerClient.distribution.threePlus} clients</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Opportunities */}
          {topOpportunities.length > 0 && (
            <div className="mt-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Top Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Line</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Est. Premium</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topOpportunities.map((opp) => (
                        <TableRow
                          key={opp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/pipeline/${opp.id}`)}
                        >
                          <TableCell className="font-medium text-sm">{opp.account_name}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px] font-normal">{opp.line_type}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{stageLabels[opp.stage] || opp.stage}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">${opp.target_premium.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Coming Soon Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <ComingSoonCard
              title="New vs. Renewal Breakdown"
              icon={RefreshCw}
              description="Premium and policy counts split into New Business vs. Renewals for the period."
            />
            <ComingSoonCard
              title="Sales Cycle Timing"
              icon={Clock}
              description="Average days from lead → quote, quote → bound. Requires stage transition tracking."
            />
            <ComingSoonCard
              title="Retention Metrics"
              icon={BarChart3}
              description="Policy retention % and revenue retention % for expiring accounts."
            />
          </div>
        </>
      )}

      <div className="mt-4 sm:mt-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-sans text-muted-foreground">
              {stats.pendingPolicies} pending approval · {stats.totalPolicies} total submitted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sold Policies */}
      <div className="mt-4 sm:mt-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3">Active Policies</h2>
        <Card>
          <CardContent className="p-0">
            {policies.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">No sold policies yet.</p>
            ) : (
              <>
                <div className="block md:hidden divide-y">
                  {policies.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 cursor-pointer active:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/pipeline/${p.lead_id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{leadNames[p.lead_id] || "—"}</p>
                        <Badge variant="secondary" className="font-normal text-[10px] shrink-0 ml-2">{p.line_of_business}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.carrier} · {p.policy_number}</span>
                        <span className="font-semibold text-foreground">${Number(p.annual_premium).toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Effective: {format(new Date(p.effective_date), "MM/dd/yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Line of Business</TableHead>
                        <TableHead>Carrier</TableHead>
                        <TableHead>Policy #</TableHead>
                        <TableHead className="text-right">Premium</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Effective</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((p) => (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pipeline/${p.lead_id}`)}>
                          <TableCell className="font-medium">{leadNames[p.lead_id] || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">{p.line_of_business}</Badge>
                          </TableCell>
                          <TableCell>{p.carrier}</TableCell>
                          <TableCell className="font-mono text-xs">{p.policy_number}</TableCell>
                          <TableCell className="text-right">${Number(p.annual_premium).toLocaleString()}</TableCell>
                          <TableCell className="text-right">${Number(p.revenue || Number(p.annual_premium) * 0.12).toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(p.effective_date), "MM/dd/yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ProductionAnalytics policies={policies} leadNames={leadNames} leads={leadInfos} />
    </>
  );
  return embedded ? content : <AppLayout>{content}</AppLayout>;
}
