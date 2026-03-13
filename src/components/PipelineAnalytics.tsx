import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Target,
  Clock,
  TrendingUp,
  Percent,
  Building2,
  BarChart3,
  CalendarDays,
} from "lucide-react";

type Lead = {
  id: string;
  account_name: string;
  stage: string;
  business_type: string | null;
  created_at: string;
  updated_at: string;
  has_approved_policy?: boolean;
  target_premium?: number | null;
  presenting_details?: any;
  loss_reason?: string | null;
};

type Policy = {
  lead_id: string;
  annual_premium: number;
  status: string;
  effective_date?: string;
};

type AuditEntry = {
  object_id: string;
  action: string;
  metadata: any;
  created_at: string;
};

export type TimePeriod = "all" | "month" | "quarter" | "year";

interface PipelineAnalyticsProps {
  leads: Lead[];
  policies: Policy[];
  auditLog: AuditEntry[];
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
  showPeriodFilter?: boolean;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(var(--destructive))",
  "hsl(45 93% 47%)",
  "hsl(280 65% 60%)",
  "hsl(200 80% 50%)",
  "hsl(15 80% 55%)",
];

const fmt = (n: number) =>
  "$" +
  n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const pct = (n: number) => (n * 100).toFixed(1) + "%";

function getDateCutoff(period: TimePeriod): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), q, 1);
  }
  // year
  return new Date(now.getFullYear(), 0, 1);
}

function getDateCeiling(period: TimePeriod): Date | null {
  if (period !== "month") return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  all: "All Time",
  month: "This Month",
  quarter: "This Quarter",
  year: "This Year",
};

export function PipelineAnalytics({
  leads,
  policies,
  auditLog,
  timePeriod: externalPeriod,
  onTimePeriodChange,
  showPeriodFilter = true,
}: PipelineAnalyticsProps) {
  const [internalPeriod, setInternalPeriod] = useState<TimePeriod>("all");
  const period = externalPeriod ?? internalPeriod;
  const setPeriod = onTimePeriodChange ?? setInternalPeriod;

  const analytics = useMemo(() => {
    const cutoff = getDateCutoff(period);

    // Filter leads/policies/audit by period
    const filteredLeads = cutoff
      ? leads.filter((l) => new Date(l.created_at) >= cutoff)
      : leads;
    const filteredPolicies = cutoff
      ? policies.filter((p) => p.effective_date ? new Date(p.effective_date) >= cutoff : true)
      : policies;
    const filteredAudit = cutoff
      ? auditLog.filter((e) => new Date(e.created_at) >= cutoff)
      : auditLog;

    const approvedPolicies = filteredPolicies.filter((p) => p.status === "approved");
    const approvedLeadIds = new Set(approvedPolicies.map((p) => p.lead_id));

    // --- Close Rate ---
    const totalClosed = approvedLeadIds.size;
    const totalLost = filteredLeads.filter((l) => l.stage === "lost").length;
    const totalDecided = totalClosed + totalLost;
    const closeRate = totalDecided > 0 ? totalClosed / totalDecided : 0;
    const winCount = totalClosed;
    const lossCount = totalLost;

    // --- Target vs Actual Premium ---
    const leadsWithTarget = filteredLeads.filter(
      (l) => (l.target_premium ?? 0) > 0 && approvedLeadIds.has(l.id)
    );
    let totalTargetPremium = 0;
    let totalActualPremium = 0;
    leadsWithTarget.forEach((l) => {
      totalTargetPremium += l.target_premium || 0;
      const pol = approvedPolicies.find((p) => p.lead_id === l.id);
      if (pol) totalActualPremium += pol.annual_premium;
    });
    const premiumAccuracy =
      totalTargetPremium > 0 ? totalActualPremium / totalTargetPremium : 0;

    const allSoldPremium = approvedPolicies.reduce(
      (s, p) => s + p.annual_premium,
      0
    );
    const allTargetPremium = filteredLeads
      .filter((l) => (l.target_premium ?? 0) > 0)
      .reduce((s, l) => s + (l.target_premium || 0), 0);

    // --- Average Time at Each Stage ---
    const stageEntries: Record<string, { stage: string; at: number }[]> = {};
    const sorted = [...filteredAudit]
      .filter((e) => e.action === "stage_move" || e.action === "create")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    sorted.forEach((entry) => {
      const leadId = entry.object_id;
      if (!stageEntries[leadId]) stageEntries[leadId] = [];
      if (entry.action === "create") {
        stageEntries[leadId].push({
          stage: "prospect",
          at: new Date(entry.created_at).getTime(),
        });
      } else if (entry.action === "stage_move" && entry.metadata?.new_stage) {
        stageEntries[leadId].push({
          stage: entry.metadata.new_stage,
          at: new Date(entry.created_at).getTime(),
        });
      }
    });

    const stageDurations: Record<string, number[]> = {
      prospect: [],
      quoting: [],
      presenting: [],
    };

    filteredLeads.forEach((lead) => {
      const entries = stageEntries[lead.id];
      if (entries && entries.length > 1) {
        for (let i = 0; i < entries.length - 1; i++) {
          const stage = entries[i].stage;
          const duration = entries[i + 1].at - entries[i].at;
          if (stageDurations[stage] !== undefined) {
            stageDurations[stage].push(duration);
          }
        }
      }
    });

    const avgStageDays: Record<string, number> = {};
    Object.entries(stageDurations).forEach(([stage, durations]) => {
      if (durations.length > 0) {
        const avg =
          durations.reduce((s, d) => s + d, 0) / durations.length;
        avgStageDays[stage] = avg / (1000 * 60 * 60 * 24);
      } else {
        avgStageDays[stage] = 0;
      }
    });

    // --- Industry / Business Type Analytics ---
    const industryMap: Record<
      string,
      { total: number; won: number; lost: number; premium: number; targetPremium: number }
    > = {};

    filteredLeads.forEach((lead) => {
      const biz = lead.business_type?.trim() || "Unknown";
      if (!industryMap[biz])
        industryMap[biz] = { total: 0, won: 0, lost: 0, premium: 0, targetPremium: 0 };
      industryMap[biz].total++;
      industryMap[biz].targetPremium += lead.target_premium || 0;
      if (approvedLeadIds.has(lead.id)) {
        industryMap[biz].won++;
        const pol = approvedPolicies.find((p) => p.lead_id === lead.id);
        if (pol) industryMap[biz].premium += pol.annual_premium;
      }
      if (lead.stage === "lost") {
        industryMap[biz].lost++;
      }
    });

    const industryStats = Object.entries(industryMap)
      .map(([name, stats]) => ({
        name: name.length > 25 ? name.substring(0, 22) + "…" : name,
        fullName: name,
        ...stats,
        closeRate:
          stats.won + stats.lost > 0
            ? stats.won / (stats.won + stats.lost)
            : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // --- Loss Reasons ---
    const lossReasons: Record<string, number> = {};
    filteredLeads
      .filter((l) => l.stage === "lost" && l.loss_reason)
      .forEach((l) => {
        const reason = l.loss_reason || "Unknown";
        lossReasons[reason] = (lossReasons[reason] || 0) + 1;
      });
    const lossReasonData = Object.entries(lossReasons)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 17) + "…" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      closeRate,
      winCount,
      lossCount,
      totalDecided,
      premiumAccuracy,
      totalTargetPremium,
      totalActualPremium,
      allSoldPremium,
      allTargetPremium,
      avgStageDays,
      industryStats,
      lossReasonData,
    };
  }, [leads, policies, auditLog, period]);

  const stageTimeData = [
    { stage: "Prospect", days: Number(analytics.avgStageDays.prospect.toFixed(1)) },
    { stage: "Quoting", days: Number(analytics.avgStageDays.quoting.toFixed(1)) },
    { stage: "Presenting", days: Number(analytics.avgStageDays.presenting.toFixed(1)) },
  ];

  const premiumCompareData = [
    { name: "Target", value: analytics.allTargetPremium },
    { name: "Sold", value: analytics.allSoldPremium },
  ];

  return (
    <div className="mt-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-semibold">Pipeline Analytics</h2>
        </div>
        {showPeriodFilter && (
          <div className="flex items-center gap-2">
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
        )}
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">
                Close Rate
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">
              {pct(analytics.closeRate)}
            </p>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              {analytics.winCount}W / {analytics.lossCount}L of{" "}
              {analytics.totalDecided} decided
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">
                Premium Accuracy
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">
              {analytics.totalTargetPremium > 0
                ? pct(analytics.premiumAccuracy)
                : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Actual vs Target (sold leads)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">
                Avg Deal Size
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">
              {analytics.winCount > 0
                ? fmt(analytics.allSoldPremium / analytics.winCount)
                : "$0"}
            </p>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              {analytics.winCount} policies sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">
                Avg Cycle Time
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">
              {(
                analytics.avgStageDays.prospect +
                analytics.avgStageDays.quoting +
                analytics.avgStageDays.presenting
              ).toFixed(0)}
              <span className="text-lg font-normal text-muted-foreground ml-1">
                days
              </span>
            </p>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Prospect → Sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time per Stage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Days per Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageTimeData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} days`, "Average"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="days"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Target vs Actual Premium */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target vs Sold Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={premiumCompareData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), "Premium"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(142 76% 36%)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Loss Reasons Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Loss Reasons
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {analytics.lossReasonData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.lossReasonData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {analytics.lossReasonData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center -mt-2">
                  {analytics.lossReasonData.map((r, i) => (
                    <span
                      key={r.name}
                      className="text-[10px] font-sans flex items-center gap-1"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      {r.name} ({r.value})
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-sans text-center py-8">
                No lost leads yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Industry Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Industry Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {analytics.industryStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">
                      Industry
                    </th>
                    <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                      Leads
                    </th>
                    <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                      Won
                    </th>
                    <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                      Lost
                    </th>
                    <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                      Close Rate
                    </th>
                    <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-right">
                      Sold Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.industryStats.map((ind) => (
                    <tr
                      key={ind.fullName}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 pr-4 font-medium" title={ind.fullName}>
                        {ind.name}
                      </td>
                      <td className="py-2 px-3 text-center">{ind.total}</td>
                      <td className="py-2 px-3 text-center text-success">
                        {ind.won}
                      </td>
                      <td className="py-2 px-3 text-center text-destructive">
                        {ind.lost}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {ind.won + ind.lost > 0 ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              ind.closeRate >= 0.5
                                ? "border-success/30 text-success"
                                : ind.closeRate > 0
                                ? "border-primary/30 text-primary"
                                : "border-muted text-muted-foreground"
                            }`}
                          >
                            {pct(ind.closeRate)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {ind.premium > 0 ? fmt(ind.premium) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-sans text-center py-8">
              No industry data available — add Business Type to leads to see
              breakdowns
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
