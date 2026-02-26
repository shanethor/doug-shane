import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, FileText, CheckCircle, Clock, Bug, Lightbulb,
  BarChart3, DollarSign, AlertTriangle, Eye, TrendingUp, TrendingDown,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-primary/10 text-primary",
  extracted: "bg-accent/20 text-accent-foreground",
  draft: "bg-warning/20 text-warning",
  complete: "bg-success/20 text-success",
  new: "bg-destructive/10 text-destructive",
  reviewed: "bg-accent/20 text-accent-foreground",
  planned: "bg-primary/10 text-primary",
  done: "bg-success/20 text-success",
  dismissed: "bg-muted text-muted-foreground",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("business_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("insurance_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("policies").select("*").order("created_at", { ascending: false }),
      supabase.from("feature_suggestions" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("extraction_corrections" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]).then(([subRes, appRes, polRes, sugRes, corRes, profRes]) => {
      setSubmissions(subRes.data ?? []);
      setApplications(appRes.data ?? []);
      setPolicies(polRes.data ?? []);
      setSuggestions(sugRes.data ?? []);
      setCorrections(corRes.data ?? []);
      setProfiles(profRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  const updateSuggestionStatus = async (id: string, status: string) => {
    await supabase.from("feature_suggestions" as any).update({ status } as any).eq("id", id);
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateCorrectionStatus = async (id: string, status: string) => {
    await supabase.from("extraction_corrections" as any).update({ status } as any).eq("id", id);
    setCorrections(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  // ── Analytics: Extraction accuracy over time ──
  const accuracyData = useMemo(() => {
    const weekMap = new Map<string, number>();
    const submissionWeekMap = new Map<string, number>();
    corrections.forEach((c: any) => {
      const d = new Date(c.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      weekMap.set(key, (weekMap.get(key) || 0) + 1);
    });
    submissions.forEach((s: any) => {
      const d = new Date(s.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      submissionWeekMap.set(key, (submissionWeekMap.get(key) || 0) + 1);
    });
    const allWeeks = new Set([...weekMap.keys(), ...submissionWeekMap.keys()]);
    return Array.from(allWeeks)
      .sort()
      .slice(-12)
      .map(week => {
        const correctionCount = weekMap.get(week) || 0;
        const submissionCount = submissionWeekMap.get(week) || 0;
        const totalFields = submissionCount * 20;
        const accuracy = totalFields > 0 ? Math.round(((totalFields - correctionCount) / totalFields) * 100) : 100;
        return {
          week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          accuracy: Math.max(0, Math.min(100, accuracy)),
          corrections: correctionCount,
          submissions: submissionCount,
        };
      });
  }, [corrections, submissions]);

  const correctionsByForm = useMemo(() => {
    const map = new Map<string, number>();
    corrections.forEach((c: any) => {
      const form = c.form_id || "unknown";
      map.set(form, (map.get(form) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([form, count]) => ({ form: form.replace("acord-", "ACORD "), count }))
      .sort((a, b) => b.count - a.count);
  }, [corrections]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const completedApps = applications.filter(a => a.status === "complete").length;
  const pendingSubs = submissions.filter(s => s.status === "pending" || s.status === "processing").length;
  const totalRevenue = policies.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0);
  const newBugs = corrections.filter(c => c.status === "new").length;
  const newSuggestions = suggestions.filter(s => s.status === "new").length;

  return (
    <AppLayout>
      <h1 className="text-4xl mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" />Features</TabsTrigger>
          <TabsTrigger value="bugs" className="gap-1.5 text-xs"><Bug className="h-3.5 w-3.5" />Bug Fixes</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={profiles.length} color="primary" />
            <StatCard icon={FileText} label="Submissions" value={submissions.length} color="primary" />
            <StatCard icon={DollarSign} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color="success" />
            <StatCard icon={CheckCircle} label="Completed Apps" value={completedApps} color="success" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Clock} label="Pending Submissions" value={pendingSubs} color="warning" />
            <StatCard icon={Bug} label="New Bug Reports" value={newBugs} color="destructive" />
            <StatCard icon={Lightbulb} label="New Suggestions" value={newSuggestions} color="accent" />
          </div>

          {/* Extraction Accuracy Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Extraction Accuracy Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accuracyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={accuracyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="week" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} className="text-[10px]" tick={{ fontSize: 10 }} unit="%" />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [`${value}%`, "Accuracy"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="accuracy"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.15)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    No data yet — accuracy will appear as submissions are processed.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bug className="h-4 w-4 text-destructive" />
                  Corrections by Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                {correctionsByForm.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={correctionsByForm}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="form" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis className="text-[10px]" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    No corrections yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Recent submissions */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Submissions</h2>
            <div className="grid gap-2">
              {submissions.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{s.company_name || "Untitled"}</span>
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${statusColor[s.status] || ""}`}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/application/${s.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1"><Eye className="h-3 w-3" />View</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Users ── */}
        <TabsContent value="users" className="space-y-4">
          <h2 className="text-lg font-semibold">All Users</h2>
          <div className="grid gap-2">
            {profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                <div>
                  <p className="font-medium text-sm">{p.full_name || "Unnamed User"}</p>
                  <p className="text-xs text-muted-foreground">{p.agency_name || "No agency"} · {p.phone || "No phone"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">ID: {p.user_id?.slice(0, 8)}… · Joined {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {profiles.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No users yet.</p>}
          </div>
        </TabsContent>

        {/* ── Feature Suggestions ── */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Feature Suggestions</h2>
            <Badge variant="outline" className="text-xs">{suggestions.length} total</Badge>
          </div>
          <div className="grid gap-3">
            {suggestions.map((s: any) => (
              <div key={s.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{s.suggestion}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">{s.category || "general"}</Badge>
                      <span className="text-[11px] text-muted-foreground">User {s.user_id?.slice(0, 8)}… · {new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Select value={s.status} onValueChange={(v) => updateSuggestionStatus(s.id, v)}>
                    <SelectTrigger className="w-28 h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {suggestions.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No feature suggestions yet.</p>}
          </div>
        </TabsContent>

        {/* ── Bug Fixes (Extraction Corrections) ── */}
        <TabsContent value="bugs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Extraction Corrections</h2>
            <Badge variant="outline" className="text-xs">{corrections.length} total · {newBugs} new</Badge>
          </div>
          <p className="text-xs text-muted-foreground">When users correct AI-extracted data, it's flagged here as a potential extraction bug for review.</p>
          <div className="grid gap-3">
            {corrections.map((c: any) => (
              <div key={c.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                      <span className="font-medium text-sm">{c.field_label || c.field_key}</span>
                      <Badge variant="secondary" className="text-[10px]">{c.form_id}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                      <div className="rounded bg-destructive/5 border border-destructive/20 p-2">
                        <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">AI Extracted</span>
                        <p className="mt-0.5 text-foreground break-all">{c.ai_value || "—"}</p>
                      </div>
                      <div className="rounded bg-success/5 border border-success/20 p-2">
                        <span className="text-[10px] uppercase tracking-wider text-success font-medium">User Corrected</span>
                        <p className="mt-0.5 text-foreground break-all">{c.corrected_value || "—"}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">User {c.user_id?.slice(0, 8)}… · {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <Select value={c.status} onValueChange={(v) => updateCorrectionStatus(c.id, v)}>
                    <SelectTrigger className="w-28 h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {corrections.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <Bug className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No extraction corrections yet.</p>
                <p className="text-xs text-muted-foreground">When users edit AI-extracted form data, corrections will appear here.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  accent: { bg: "bg-accent/10", text: "text-accent" },
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const c = colorMap[color] || colorMap.primary;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-full ${c.bg} p-2.5`}>
            <Icon className={`h-5 w-5 ${c.text}`} />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
