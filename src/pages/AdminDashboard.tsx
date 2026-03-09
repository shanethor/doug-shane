import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, FileText, CheckCircle, Clock, Bug, Lightbulb,
  BarChart3, DollarSign, AlertTriangle, Eye, TrendingUp,
  XCircle, Edit3, ShieldCheck, Building2, Plus, Trash2,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { toast } from "sonner";

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
  const { isAdmin, loading: adminLoading } = useUserRole();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [policyFilter, setPolicyFilter] = useState<"pending" | "all">("pending");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyCode, setNewAgencyCode] = useState("");
  const [creatingAgency, setCreatingAgency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) return;
    Promise.all([
      supabase.from("business_submissions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("insurance_applications").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("policies").select("*, leads(id, account_name, submission_id)").order("created_at", { ascending: false }).limit(200),
      supabase.from("feature_suggestions" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("extraction_corrections" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
    ]).then(([subRes, appRes, polRes, sugRes, corRes, profRes]) => {
      setSubmissions(subRes.data ?? []);
      setApplications(appRes.data ?? []);
      setPolicies(polRes.data ?? []);
      setSuggestions(sugRes.data ?? []);
      setCorrections(corRes.data ?? []);
      setProfiles(profRes.data ?? []);
      setLoading(false);
    });

    // Fetch full user list via edge function
    supabase.functions.invoke("list-users").then(({ data, error }) => {
      if (!error && data) setAdminUsers(data);
    });

    // Fetch agencies
    supabase.from("agencies").select("*").order("name").then(({ data }) => {
      if (data) setAgencies(data);
    });
  }, [user, isAdmin]);

  const updateSuggestionStatus = async (id: string, status: string) => {
    await supabase.from("feature_suggestions" as any).update({ status } as any).eq("id", id);
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateCorrectionStatus = async (id: string, status: string) => {
    await supabase.from("extraction_corrections" as any).update({ status } as any).eq("id", id);
    setCorrections(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };
  const profileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p: any) => { if (p.user_id && p.full_name) map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  // ── Policy approval functions ──
  const approvePolicy = async (policyId: string) => {
    if (!user) return;
    const { data: docs } = await supabase.from("policy_documents").select("id").eq("policy_id", policyId);
    if (!docs || docs.length === 0) { toast.error("Cannot approve — no proof documents uploaded"); return; }
    const { error } = await supabase.from("policies").update({ status: "approved" as any, approved_at: new Date().toISOString(), approved_by_user_id: user.id, locked: true }).eq("id", policyId);
    if (error) { toast.error("Failed to approve"); return; }
    await supabase.from("audit_log").insert({ user_id: user.id, action: "approve", object_type: "policy", object_id: policyId });
    toast.success("Policy approved!");
    setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, status: "approved", locked: true } : p));
  };

  const rejectPolicy = async () => {
    if (!user || !rejectId) return;
    const { error } = await supabase.from("policies").update({ status: "rejected" as any, rejected_at: new Date().toISOString(), rejected_by_user_id: user.id, rejection_reason: rejectReason || "No reason provided" }).eq("id", rejectId);
    if (error) { toast.error("Failed to reject"); return; }
    await supabase.from("audit_log").insert({ user_id: user.id, action: "reject", object_type: "policy", object_id: rejectId, metadata: { reason: rejectReason } });
    toast.success("Policy rejected");
    setPolicies(prev => prev.map(p => p.id === rejectId ? { ...p, status: "rejected", rejection_reason: rejectReason } : p));
    setRejectId(null);
    setRejectReason("");
  };

  const filteredPolicies = policyFilter === "pending" ? policies.filter(p => p.status === "pending") : policies;
  const pendingPolicyCount = policies.filter(p => p.status === "pending").length;

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

  if (adminLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have admin privileges.</p>
          <Link to="/" className="text-primary underline">Go to Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  const completedApps = applications.filter(a => a.status === "complete").length;
  const pendingSubs = submissions.filter(s => s.status === "pending" || s.status === "processing").length;
  const totalRevenue = policies.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0);
  const newBugs = corrections.filter(c => c.status === "new").length;
  const newSuggestions = suggestions.filter(s => s.status === "new").length;
  const pendingUserCount = adminUsers.filter((u: any) => u.approval_status === "pending").length;

  const handleApproveUser = async (userId: string, role: string) => {
    const { data, error } = await supabase.functions.invoke("approve-user", {
      body: { target_user_id: userId, action: "approve", role },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to approve user");
      return;
    }
    toast.success("User approved! They'll receive an email notification.");
    setAdminUsers((prev) =>
      prev.map((u: any) =>
        u.id === userId ? { ...u, approval_status: "approved", primary_role: role, roles: [role] } : u
      )
    );
  };

  const handleChangeAgency = async (userId: string, agencyId: string) => {
    const agency = agencies.find((a: any) => a.id === agencyId);
    const { data, error } = await supabase.functions.invoke("approve-user", {
      body: { target_user_id: userId, action: "set_agency", agency_id: agencyId },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to update agency");
      return;
    }
    toast.success(`Agency updated to ${agency?.name || "Unknown"}`);
    setAdminUsers((prev) =>
      prev.map((u: any) =>
        u.id === userId ? { ...u, agency_id: agencyId, agency_name: agency?.name } : u
      )
    );
  };

  const handleCreateAgency = async () => {
    if (!newAgencyName.trim() || !newAgencyCode.trim()) {
      toast.error("Agency name and code are required");
      return;
    }
    setCreatingAgency(true);
    const { data, error } = await supabase.from("agencies").insert({
      name: newAgencyName.trim(),
      code: newAgencyCode.trim().toUpperCase(),
    }).select().single();
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Agency code already exists" : error.message);
    } else {
      toast.success("Agency created!");
      setAgencies((prev) => [...prev, data]);
      setNewAgencyName("");
      setNewAgencyCode("");
    }
    setCreatingAgency(false);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    const { data, error } = await supabase.functions.invoke("approve-user", {
      body: { target_user_id: userId, action: "delete_user" },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to delete user");
      return;
    }
    toast.success("User deleted");
    setAdminUsers((prev) => prev.filter((u: any) => u.id !== userId));
  };

  const handleDeleteAgency = async (agencyId: string, agencyName: string) => {
    if (!confirm(`Delete agency "${agencyName}"? Users will be unassigned.`)) return;
    const { data, error } = await supabase.functions.invoke("approve-user", {
      body: { target_user_id: agencyId, action: "delete_agency" },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to delete agency");
      return;
    }
    toast.success("Agency deleted");
    setAgencies((prev) => prev.filter((a: any) => a.id !== agencyId));
    setAdminUsers((prev) => prev.map((u: any) => u.agency_id === agencyId ? { ...u, agency_id: null, agency_name: null } : u));
  };

  return (
    <AppLayout>
      <h1 className="text-4xl mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="policies" className="gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />Policies
              {pendingPolicyCount > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">{pendingPolicyCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />Users
              {pendingUserCount > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">{pendingUserCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="agencies" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Agencies</TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" />Features</TabsTrigger>
            <TabsTrigger value="bugs" className="gap-1.5 text-xs"><Bug className="h-3.5 w-3.5" />Bug Fixes</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={adminUsers.length || profiles.length} color="primary" />
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

        {/* ── Policies (formerly Approvals) ── */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Policy Approvals</h2>
            <div className="flex gap-2">
              <Button variant={policyFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setPolicyFilter("pending")}>
                Pending ({pendingPolicyCount})
              </Button>
              <Button variant={policyFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setPolicyFilter("all")}>
                All
              </Button>
            </div>
          </div>
          {filteredPolicies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No policies awaiting approval.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPolicies.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{p.leads?.account_name || "Unknown Lead"}</span>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{p.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{p.carrier} · {p.line_of_business} · #{p.policy_number}</p>
                          <p>Effective: {new Date(p.effective_date).toLocaleDateString()}</p>
                          <p>Premium: ${Number(p.annual_premium).toLocaleString()} · Revenue: ${Number(p.revenue || 0).toLocaleString()}</p>
                          <p>Submitted: {new Date(p.submitted_at).toLocaleString()}</p>
                          {p.rejection_reason && <p className="text-destructive">Reason: {p.rejection_reason}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {p.leads?.submission_id && (
                              <Link to={`/acord/acord-125/${p.leads.submission_id}`}>
                                <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-accent gap-0.5">
                                  <Edit3 className="h-2.5 w-2.5" />Workspace
                                </Badge>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      {p.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1 text-success" onClick={() => approvePolicy(p.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => setRejectId(p.id)}>
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Users ── */}
        <TabsContent value="users" className="space-y-6">
          {/* Pending Approvals */}
          {pendingUserCount > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Pending Approvals
                <Badge variant="destructive" className="text-xs">{pendingUserCount}</Badge>
              </h2>
              <div className="grid gap-2">
                {adminUsers.filter((u: any) => u.approval_status === "pending").map((u: any) => (
                  <Card key={u.id} className="border-warning/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium text-sm">{u.full_name || "Unnamed User"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{u.agency_name || "No agency"}</span>
                            <span>·</span>
                            <span>Registered {new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Select onValueChange={(agencyId) => handleChangeAgency(u.id, agencyId)} value={u.agency_id || ""}>
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue placeholder="Set agency…" />
                            </SelectTrigger>
                            <SelectContent>
                              {agencies.map((a: any) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select onValueChange={(role) => handleApproveUser(u.id, role)}>
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue placeholder="Approve as…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="producer">Producer</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="client_services">Client Services</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Users */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">All Users</h2>
              <Badge variant="outline" className="text-xs">{adminUsers.filter((u: any) => u.approval_status !== "pending").length} active</Badge>
            </div>
            <div className="grid gap-2">
              {adminUsers.filter((u: any) => u.approval_status !== "pending").map((u: any) => (
                <Card key={u.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{u.full_name || "Unnamed User"}</p>
                          {u.email_confirmed ? (
                            <Badge variant="outline" className="text-[9px] text-success border-success/30">Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-warning border-warning/30">Unverified</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email || "No email"}</p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{u.agency_name || "No agency"}</span>
                          <span>·</span>
                          <span>{u.submission_count} submissions</span>
                          <span>·</span>
                          <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                        {u.last_sign_in_at && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Last active: {new Date(u.last_sign_in_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Select
                          value={u.agency_id || "none"}
                          onValueChange={(val) => {
                            if (val !== "none") handleChangeAgency(u.id, val);
                          }}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Set agency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>No agency</SelectItem>
                            {agencies.map((a: any) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={u.primary_role || "producer"}
                          onValueChange={async (newRole) => {
                            const { data, error } = await supabase.functions.invoke("update-user-role", {
                              body: { target_user_id: u.id, new_role: newRole },
                            });
                            if (error || data?.error) {
                              toast.error(data?.error || "Failed to update role");
                              return;
                            }
                            toast.success(`Role updated to ${newRole}`);
                            setAdminUsers((prev) =>
                              prev.map((au: any) =>
                                au.id === u.id ? { ...au, primary_role: newRole, roles: [newRole] } : au
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="producer">Producer</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="client_services">Client Services</SelectItem>
                          </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(u.id, u.full_name || u.email)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {adminUsers.length === 0 && profiles.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No users yet.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Agencies ── */}
        <TabsContent value="agencies" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Agencies</h2>
            <Badge variant="outline" className="text-xs">{agencies.length} total</Badge>
          </div>

          {/* Create new agency */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Agency
              </h3>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[180px] space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Agency Name</label>
                  <Input
                    value={newAgencyName}
                    onChange={(e) => setNewAgencyName(e.target.value)}
                    placeholder="ABC Insurance"
                    className="h-9"
                  />
                </div>
                <div className="w-40 space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Agency Code</label>
                  <Input
                    value={newAgencyCode}
                    onChange={(e) => setNewAgencyCode(e.target.value.toUpperCase())}
                    placeholder="ABC"
                    className="h-9 uppercase font-mono tracking-wider"
                  />
                </div>
                <Button
                  onClick={handleCreateAgency}
                  disabled={creatingAgency || !newAgencyName.trim() || !newAgencyCode.trim()}
                  size="sm"
                  className="h-9"
                >
                  {creatingAgency ? "Creating…" : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agency list */}
          <div className="grid gap-2">
            {agencies.map((a: any) => {
              const agencyUsers = adminUsers.filter((u: any) => u.agency_id === a.id);
              return (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <p className="font-medium text-sm">{a.name}</p>
                          <Badge variant="secondary" className="text-[10px] font-mono">{a.code}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {agencyUsers.length} member{agencyUsers.length !== 1 ? "s" : ""}
                          {agencyUsers.length > 0 && (
                            <span> · {agencyUsers.map((u: any) => u.full_name || u.email).join(", ")}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteAgency(a.id, a.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{profileNameMap[c.user_id] || `User ${c.user_id?.slice(0, 8)}…`} · {new Date(c.created_at).toLocaleDateString()}</span>
                      {c.submission_id && (
                        <Link to={`/application/${c.submission_id}`} className="text-primary hover:underline flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View Workspace
                        </Link>
                      )}
                    </div>
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

      {/* Reject policy dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Policy</DialogTitle>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" />
          <Button variant="destructive" onClick={rejectPolicy}>Reject Policy</Button>
        </DialogContent>
      </Dialog>
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
