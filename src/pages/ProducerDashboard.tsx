import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, TrendingUp, CheckCircle, Shield } from "lucide-react";
import { format } from "date-fns";

interface PolicyRow {
  id: string;
  policy_number: string;
  carrier: string;
  line_of_business: string;
  annual_premium: number;
  revenue: number | null;
  effective_date: string;
  status: string;
  approved_at: string | null;
  lead_id: string;
}

export default function ProducerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPolicies: 0,
    approvedPolicies: 0,
    totalPremium: 0,
    totalRevenue: 0,
    pendingPolicies: 0,
    totalLeads: 0,
  });
  const [approvedPolicies, setApprovedPolicies] = useState<(PolicyRow & { account_name?: string })[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user, dateRange]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);

    const [policiesRes, leadsRes] = await Promise.all([
      supabase
        .from("policies")
        .select("*, leads!policies_lead_id_fkey(account_name)")
        .eq("producer_user_id", user.id),
      supabase
        .from("leads")
        .select("id")
        .eq("owner_user_id", user.id),
    ]);

    const allPolicies = policiesRes.data ?? [];
    const approvedInRange = allPolicies.filter(
      (p: any) =>
        p.status === "approved" &&
        p.approved_at &&
        p.approved_at >= dateRange.start &&
        p.approved_at <= dateRange.end + "T23:59:59"
    );

    setStats({
      totalPolicies: allPolicies.length,
      approvedPolicies: approvedInRange.length,
      totalPremium: approvedInRange.reduce((s: number, p: any) => s + Number(p.annual_premium), 0),
      totalRevenue: approvedInRange.reduce((s: number, p: any) => s + Number(p.revenue), 0),
      pendingPolicies: allPolicies.filter((p: any) => p.status === "pending").length,
      totalLeads: leadsRes.data?.length ?? 0,
    });

    // Build the approved policies list with account names
    const enriched = approvedInRange.map((p: any) => ({
      ...p,
      account_name: p.leads?.account_name || "Unknown",
    }));
    // Sort by approved_at descending
    enriched.sort((a: any, b: any) => (b.approved_at || "").localeCompare(a.approved_at || ""));
    setApprovedPolicies(enriched);

    setLoading(false);
  };

  return (
    <AppLayout>
      <h1 className="text-4xl mb-2">My Dashboard</h1>
      <p className="text-muted-foreground font-sans text-sm mb-6">Production stats for approved policies.</p>

      {/* Date range filter */}
      <div className="flex gap-3 mb-6 items-end">
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-[160px] h-9"
          />
        </div>
        <div>
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-[160px] h-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
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
          {approvedPolicies.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-success" />
                <h2 className="text-xl font-semibold font-sans">Active Policies</h2>
                <Badge variant="secondary" className="ml-1 font-sans">{approvedPolicies.length}</Badge>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-sans text-xs">Client</TableHead>
                        <TableHead className="font-sans text-xs">Line of Business</TableHead>
                        <TableHead className="font-sans text-xs">Carrier</TableHead>
                        <TableHead className="font-sans text-xs">Policy #</TableHead>
                        <TableHead className="font-sans text-xs">Effective</TableHead>
                        <TableHead className="font-sans text-xs text-right">Premium</TableHead>
                        <TableHead className="font-sans text-xs text-right">Revenue</TableHead>
                        <TableHead className="font-sans text-xs">Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedPolicies.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-sans font-medium">{p.account_name}</TableCell>
                          <TableCell className="font-sans">
                            <Badge variant="outline" className="font-sans text-xs">
                              {p.line_of_business}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-sans text-sm">{p.carrier}</TableCell>
                          <TableCell className="font-sans text-sm text-muted-foreground">{p.policy_number}</TableCell>
                          <TableCell className="font-sans text-sm text-muted-foreground">
                            {p.effective_date ? format(new Date(p.effective_date), "MM/dd/yyyy") : "—"}
                          </TableCell>
                          <TableCell className="font-sans text-sm text-right font-medium">
                            ${Number(p.annual_premium).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-sans text-sm text-right text-muted-foreground">
                            ${Number(p.revenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-sans text-sm text-muted-foreground">
                            {p.approved_at ? format(new Date(p.approved_at), "MM/dd/yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
