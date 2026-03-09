import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  Building2,
  Layers,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

type Policy = {
  id: string;
  lead_id: string;
  annual_premium: number;
  revenue: number | null;
  carrier: string;
  line_of_business: string;
  effective_date: string;
  status: string;
  approved_at: string | null;
  created_at: string;
};

type LeadInfo = {
  id: string;
  account_name: string;
  business_type: string | null;
};

interface ProductionAnalyticsProps {
  policies: Policy[];
  leadNames: Record<string, string>;
  leads?: LeadInfo[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",
  "hsl(var(--accent))",
  "hsl(45 93% 47%)",
  "hsl(280 65% 60%)",
  "hsl(200 80% 50%)",
  "hsl(15 80% 55%)",
  "hsl(var(--destructive))",
];

const fmt = (n: number) =>
  "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtShort = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

export function ProductionAnalytics({ policies, leadNames, leads = [] }: ProductionAnalyticsProps) {
  const analytics = useMemo(() => {
    const approved = policies.filter((p) => p.status === "approved");

    // --- Premium by Line of Business ---
    const lobMap: Record<string, { count: number; premium: number; revenue: number }> = {};
    approved.forEach((p) => {
      const lob = p.line_of_business || "Other";
      if (!lobMap[lob]) lobMap[lob] = { count: 0, premium: 0, revenue: 0 };
      lobMap[lob].count++;
      lobMap[lob].premium += Number(p.annual_premium) || 0;
      lobMap[lob].revenue += Number(p.revenue || Number(p.annual_premium) * 0.12) || 0;
    });
    const lobData = Object.entries(lobMap)
      .map(([name, d]) => ({ name: name.length > 18 ? name.substring(0, 15) + "…" : name, fullName: name, ...d }))
      .sort((a, b) => b.premium - a.premium);

    // --- Premium by Carrier ---
    const carrierMap: Record<string, { count: number; premium: number }> = {};
    approved.forEach((p) => {
      const c = p.carrier || "Unknown";
      if (!carrierMap[c]) carrierMap[c] = { count: 0, premium: 0 };
      carrierMap[c].count++;
      carrierMap[c].premium += Number(p.annual_premium) || 0;
    });
    const carrierData = Object.entries(carrierMap)
      .map(([name, d]) => ({ name: name.length > 18 ? name.substring(0, 15) + "…" : name, fullName: name, ...d }))
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 8);

    // --- Monthly Production Trend (last 12 months) ---
    const now = new Date();
    const months: { label: string; premium: number; revenue: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });
      months.push({ label, premium: 0, revenue: 0, count: 0 });
      approved.forEach((p) => {
        const approvedDate = p.approved_at || p.created_at;
        if (approvedDate?.startsWith(key)) {
          months[months.length - 1].premium += Number(p.annual_premium) || 0;
          months[months.length - 1].revenue += Number(p.revenue || Number(p.annual_premium) * 0.12) || 0;
          months[months.length - 1].count++;
        }
      });
    }

    // --- KPIs ---
    const totalPremium = approved.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0);
    const totalRevenue = approved.reduce((s, p) => s + (Number(p.revenue || Number(p.annual_premium) * 0.12) || 0), 0);
    const avgDealSize = approved.length > 0 ? totalPremium / approved.length : 0;
    const avgRevenue = approved.length > 0 ? totalRevenue / approved.length : 0;
    const uniqueClients = new Set(approved.map((p) => p.lead_id)).size;
    const avgPoliciesPerClient = uniqueClients > 0 ? approved.length / uniqueClients : 0;

    // --- Largest Accounts ---
    const clientPremiumMap: Record<string, number> = {};
    approved.forEach((p) => {
      clientPremiumMap[p.lead_id] = (clientPremiumMap[p.lead_id] || 0) + (Number(p.annual_premium) || 0);
    });
    const topAccounts = Object.entries(clientPremiumMap)
      .map(([leadId, premium]) => ({ name: leadNames[leadId] || "Unknown", premium }))
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 5);

    // --- Industry breakdown from leads ---
    const industryMap: Record<string, { count: number; premium: number }> = {};
    approved.forEach((p) => {
      const lead = leads.find((l) => l.id === p.lead_id);
      const biz = lead?.business_type?.trim() || "Unknown";
      if (!industryMap[biz]) industryMap[biz] = { count: 0, premium: 0 };
      industryMap[biz].count++;
      industryMap[biz].premium += Number(p.annual_premium) || 0;
    });
    const industryData = Object.entries(industryMap)
      .map(([name, d]) => ({ name: name.length > 20 ? name.substring(0, 17) + "…" : name, ...d }))
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 6);

    return {
      totalPremium,
      totalRevenue,
      avgDealSize,
      avgRevenue,
      policyCount: approved.length,
      uniqueClients,
      avgPoliciesPerClient,
      lobData,
      carrierData,
      months,
      topAccounts,
      industryData,
    };
  }, [policies, leadNames, leads]);

  return (
    <div className="mt-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-xl sm:text-2xl font-semibold">Production Analytics</h2>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Book Premium</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{fmt(analytics.totalPremium)}</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">{analytics.policyCount} active policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Book Revenue</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{fmt(analytics.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">Avg {fmt(analytics.avgRevenue)} / policy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Avg Deal Size</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{fmt(analytics.avgDealSize)}</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">{analytics.uniqueClients} unique clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Policies / Client</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.avgPoliciesPerClient.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">Cross-sell ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Trend + LOB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Production Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Production Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmt(v), name === "premium" ? "Premium" : "Revenue"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="premium" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="premium" />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 3 }} name="revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Premium by Line of Business */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Premium by Line of Business
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {analytics.lobData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.lobData} layout="vertical">
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
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
                    <Bar dataKey="premium" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No policy data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Carrier + Industry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carrier Mix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Carrier Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {analytics.carrierData.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.carrierData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="premium"
                        paddingAngle={3}
                      >
                        {analytics.carrierData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center -mt-2">
                  {analytics.carrierData.map((c, i) => (
                    <span key={c.fullName} className="text-[10px] font-sans flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.name} ({c.count})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No carrier data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Accounts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Top Accounts by Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {analytics.topAccounts.length > 0 ? (
              <div className="space-y-3">
                {analytics.topAccounts.map((a, i) => {
                  const pctOfTotal = analytics.totalPremium > 0 ? (a.premium / analytics.totalPremium) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate mr-2">{a.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0">{fmt(a.premium)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pctOfTotal, 100)}%`,
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No accounts yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Renewals Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-full bg-muted p-3">
            <RefreshCw className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              Renewals
              <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Renewal tracking, retention rates, and upcoming expiration alerts will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
