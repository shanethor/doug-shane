import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, FileText, TrendingUp, CheckCircle, CalendarDays } from "lucide-react";
import { format } from "date-fns";

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

export default function ProducerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<any[]>([]);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<TimePeriod>("year");
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
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user, period]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);

    const dateRange = getDateRange(period);

    const [policiesRes, leadsRes] = await Promise.all([
      supabase
        .from("policies")
        .select("*")
        .eq("producer_user_id", user.id),
      supabase
        .from("leads")
        .select("id, stage")
        .eq("owner_user_id", user.id),
    ]);

    if (!mountedRef.current) return;

    const allPolicies = policiesRes.data ?? [];
    const approvedInRange = allPolicies.filter(
      (p: any) =>
        p.status === "approved" &&
        p.approved_at &&
        p.approved_at >= dateRange.start &&
        p.approved_at <= dateRange.end + "T23:59:59"
    );

    const activeSold = allPolicies.filter((p: any) => p.status === "approved");
    setPolicies(activeSold);

    // Fetch lead names for the policies
    const leadIds = [...new Set(activeSold.map((p: any) => p.lead_id))];
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, account_name")
        .in("id", leadIds);
      const names: Record<string, string> = {};
      (leads ?? []).forEach((l: any) => { names[l.id] = l.account_name; });
      setLeadNames(names);
    }

    setStats({
      totalPolicies: allPolicies.length,
      approvedPolicies: approvedInRange.length,
      totalPremium: approvedInRange.reduce((s: number, p: any) => s + Number(p.annual_premium), 0),
      totalRevenue: approvedInRange.reduce((s: number, p: any) => s + Number(p.revenue), 0),
      pendingPolicies: allPolicies.filter((p: any) => p.status === "pending").length,
      totalLeads: (leadsRes.data ?? []).filter((l: any) => {
        const isSold = allPolicies.some((p: any) => p.lead_id === l.id && p.status === "approved");
        return !isSold && l.stage !== "lost";
      }).length,
    });
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl mb-1">My Dashboard</h1>
          <p className="text-muted-foreground font-sans text-sm">Production stats for approved policies.</p>
        </div>
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.totalLeads}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success/10 p-2.5">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">{stats.approvedPolicies}</p>
                  <p className="text-xs text-muted-foreground font-sans">Policies Sold</p>
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
                  <p className="text-2xl font-semibold font-sans">${stats.totalPremium.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-warning/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-sans">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-sans">Total Revenue (12%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-sans text-muted-foreground">
              {stats.pendingPolicies} pending approval · {stats.totalPolicies} total submitted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sold Policies Table */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Active Policies</h2>
        <Card>
          <CardContent className="p-0">
            {policies.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">No sold policies yet.</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
