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
  XCircle, Edit3, ShieldCheck, Building2, Plus, Trash2, Handshake, ScrollText, Network, Sparkles, CalendarDays,
} from "lucide-react";
import AdminPartnerReferrals from "@/components/AdminPartnerReferrals";
import AdminAgencySection from "@/components/AdminAgencySection";
import AdminPartnerRequests from "@/components/AdminPartnerRequests2";
import AdminConciergeQueue from "@/components/AdminConciergeQueue";
import AdminSupportTickets from "@/components/AdminSupportTickets";
import { Checkbox } from "@/components/ui/checkbox";
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
  
  const [loading, setLoading] = useState(true);
  const [partnerLinks, setPartnerLinks] = useState<any[]>([]);
  const [bookedMeetings, setBookedMeetings] = useState<any[]>([]);

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

    // Fetch partner links
    supabase.from("property_partner_links" as any).select("*").then(({ data }) => {
      if (data) setPartnerLinks(data);
    });

    // Fetch all booked meetings (admin view)
    supabase.from("booked_meetings").select("*, booking_links(title, public_slug)").order("start_time", { ascending: false }).limit(100).then(({ data }) => {
      if (data) setBookedMeetings(data);
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
            <TabsTrigger value="partners" className="gap-1.5 text-xs"><Handshake className="h-3.5 w-3.5" />Partners</TabsTrigger>
            <TabsTrigger value="partner-requests" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Requested Partners</TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" />Features</TabsTrigger>
            <TabsTrigger value="bugs" className="gap-1.5 text-xs"><Bug className="h-3.5 w-3.5" />Bug Fixes</TabsTrigger>
            <TabsTrigger value="log-access" className="gap-1.5 text-xs"><ScrollText className="h-3.5 w-3.5" />Log Access</TabsTrigger>
            <TabsTrigger value="user-features" className="gap-1.5 text-xs"><Network className="h-3.5 w-3.5" />Features</TabsTrigger>
            <TabsTrigger value="concierge" className="gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" />Concierge</TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" />Support</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" />Bookings</TabsTrigger>
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
                              <SelectItem value="advisor">Advisor</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="client_services">Client Services</SelectItem>
                              <SelectItem value="property">Property</SelectItem>
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
                          {u.branch && (
                            <Badge variant="secondary" className="text-[9px]">
                              {u.branch === "risk" ? "🛡️" : u.branch === "property" ? "🏠" : "💰"} {u.branch}
                            </Badge>
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
                          value={u.primary_role || "advisor"}
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
                            <SelectItem value="advisor">Advisor</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="client_services">Client Services</SelectItem>
                            <SelectItem value="property">Property</SelectItem>
                          </SelectContent>
                          </Select>
                          <Select
                            value={u.branch || "none"}
                            onValueChange={async (newBranch) => {
                              if (newBranch === "none") return;
                              const { data, error } = await supabase.functions.invoke("approve-user", {
                                body: { target_user_id: u.id, action: "set_branch", branch: newBranch },
                              });
                              if (error || data?.error) {
                                toast.error(data?.error || "Failed to update branch");
                                return;
                              }
                              toast.success(`Branch updated to ${newBranch}`);
                              setAdminUsers((prev) =>
                                prev.map((au: any) =>
                                  au.id === u.id ? { ...au, branch: newBranch } : au
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Set branch…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" disabled>No branch</SelectItem>
                              <SelectItem value="risk">🛡️ Risk</SelectItem>
                              <SelectItem value="property">🏠 Property</SelectItem>
                              <SelectItem value="wealth">💰 Consulting</SelectItem>
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
                    {/* Partner linking for property users */}
                    {(u.primary_role === "property" || u.roles?.includes("property")) && (() => {
                      const link = partnerLinks.find((pl: any) => pl.property_user_id === u.id);
                      const advisorUsers = adminUsers.filter((au: any) => 
                        au.primary_role === "advisor" || au.primary_role === "admin" || au.roles?.includes("advisor")
                      );
                      return (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Handshake className="h-3 w-3" /> Partner Account Linking
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={link?.partner_slug || ""}
                              onValueChange={async (slug) => {
                                const advisorId = link?.linked_advisor_user_id || advisorUsers[0]?.id;
                                if (!advisorId) { toast.error("No advisors available"); return; }
                                if (link) {
                                  await supabase.from("property_partner_links" as any).update({ partner_slug: slug } as any).eq("id", link.id);
                                } else {
                                  await supabase.from("property_partner_links" as any).insert({ property_user_id: u.id, partner_slug: slug, linked_advisor_user_id: advisorId } as any);
                                }
                                const { data: updated } = await supabase.from("property_partner_links" as any).select("*");
                                if (updated) setPartnerLinks(updated);
                                toast.success(`Partner page linked: ${slug}`);
                              }}
                            >
                              <SelectTrigger className="w-44 h-7 text-[11px]">
                                <SelectValue placeholder="Link partner page…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="josh-chernes">Joshua Chernes</SelectItem>
                                <SelectItem value="michael-wengzn">Michael Wengzn</SelectItem>
                                <SelectItem value="associated">Associated Insurance</SelectItem>
                                <SelectItem value="domisource">DomiSource</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={link?.linked_advisor_user_id || ""}
                              onValueChange={async (advisorId) => {
                                const slug = link?.partner_slug || "josh-chernes";
                                if (link) {
                                  await supabase.from("property_partner_links" as any).update({ linked_advisor_user_id: advisorId } as any).eq("id", link.id);
                                } else {
                                  await supabase.from("property_partner_links" as any).insert({ property_user_id: u.id, partner_slug: slug, linked_advisor_user_id: advisorId } as any);
                                }
                                const { data: updated } = await supabase.from("property_partner_links" as any).select("*");
                                if (updated) setPartnerLinks(updated);
                                toast.success("Linked advisor updated");
                              }}
                            >
                              <SelectTrigger className="w-44 h-7 text-[11px]">
                                <SelectValue placeholder="Link advisor…" />
                              </SelectTrigger>
                              <SelectContent>
                                {advisorUsers.map((au: any) => (
                                  <SelectItem key={au.id} value={au.id}>{au.full_name || au.email}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {link && (
                              <Badge variant="secondary" className="text-[9px]">
                                <Network className="h-3 w-3 mr-1" />
                                {link.partner_slug} → {adminUsers.find((au: any) => au.id === link.linked_advisor_user_id)?.full_name || "Unknown"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
          <AdminAgencySection
            agencies={agencies}
            setAgencies={setAgencies}
            adminUsers={adminUsers}
            setAdminUsers={setAdminUsers}
          />
        </TabsContent>

        {/* ── Partner Referrals ── */}
        <TabsContent value="partners" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Partner Referrals</h2>
            <Badge variant="outline" className="text-xs">Revenue share tracking</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Track referrals from partner landing pages. Generate shareable tracker links for partners to view their own summary.</p>
          <AdminPartnerReferrals />
        </TabsContent>

        {/* ── Partner Requests ── */}
        <TabsContent value="partner-requests" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Requested Partners</h2>
            <Badge variant="outline" className="text-xs">From /home</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Inbound partner applications from the public landing page.</p>
          <AdminPartnerRequests />
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
        {/* ── Log Access ── */}
        <TabsContent value="log-access" className="space-y-6">
          <LogAccessTab profiles={profiles} userId={user?.id} />
        </TabsContent>

        {/* ── User Features ── */}
        <TabsContent value="user-features" className="space-y-6">
          <UserFeaturesTab profiles={profiles} adminUsers={adminUsers} userId={user?.id} />
        </TabsContent>

        {/* ── Concierge Queue ── */}
        <TabsContent value="concierge" className="space-y-6">
          <AdminConciergeQueue profileMap={profileNameMap} />
        </TabsContent>

        {/* ── Support Tickets ── */}
        <TabsContent value="support" className="space-y-6">
          <AdminSupportTickets profiles={profiles} />
        </TabsContent>

        {/* ── Bookings ── */}
        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4" />Scheduled Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                All booked meetings across the platform. To enable the AuRa Studio scheduler, create a booking link with slug <code className="bg-muted px-1 rounded text-[11px]">aura-studio</code> in your Settings → Booking Links with 9 AM–5 PM EST availability (Mon–Fri).
              </p>
              {bookedMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-3 font-medium text-xs text-muted-foreground">Client</th>
                        <th className="py-2 pr-3 font-medium text-xs text-muted-foreground">Email</th>
                        <th className="py-2 pr-3 font-medium text-xs text-muted-foreground">Meeting</th>
                        <th className="py-2 pr-3 font-medium text-xs text-muted-foreground">Date & Time</th>
                        <th className="py-2 pr-3 font-medium text-xs text-muted-foreground">Status</th>
                        <th className="py-2 font-medium text-xs text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookedMeetings.map((m: any) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-3 font-medium">{m.client_name}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground">{m.client_email}</td>
                          <td className="py-2.5 pr-3">{(m.booking_links as any)?.title || "—"}</td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {new Date(m.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                            <span className="text-muted-foreground">{new Date(m.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge variant={m.status === "scheduled" ? "default" : "secondary"} className="text-[10px]">{m.status}</Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{m.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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

function LogAccessTab({ profiles, userId }: { profiles: any[]; userId?: string }) {
  const [grants, setGrants] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("user_log_access" as any).select("*").order("granted_at", { ascending: false })
      .then(({ data }: any) => { setGrants(data || []); setLoading(false); });
  }, []);

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { if (p.user_id && p.full_name) m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  const grantAccess = async () => {
    if (!selectedUserId || !userId) return;
    const { error } = await (supabase.from("user_log_access" as any) as any).insert({
      user_id: selectedUserId,
      granted_by: userId,
      notes: notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Log access granted");
    setGrants((prev) => [{ user_id: selectedUserId, granted_by: userId, granted_at: new Date().toISOString(), notes }, ...prev]);
    setSelectedUserId("");
    setNotes("");
  };

  const revokeAccess = async (grantUserId: string) => {
    await (supabase.from("user_log_access" as any) as any).delete().eq("user_id", grantUserId);
    setGrants((prev) => prev.filter((g) => g.user_id !== grantUserId));
    toast.success("Log access revoked");
  };

  const existingUserIds = new Set(grants.map((g: any) => g.user_id));
  const eligibleUsers = profiles.filter((p: any) => p.user_id && !existingUserIds.has(p.user_id));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" />AI Error Log Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Admins automatically have log access. The users below have been granted additional access.</p>

          {loading ? (
            <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No additional users granted access yet.</p>
          ) : (
            <div className="space-y-2">
              {grants.map((g: any) => (
                <div key={g.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{profileMap[g.user_id] || g.user_id}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Granted by {profileMap[g.granted_by] || "admin"} · {new Date(g.granted_at).toLocaleDateString()}
                      {g.notes && ` · ${g.notes}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => revokeAccess(g.user_id)} className="text-destructive h-7 text-xs">
                    <Trash2 className="h-3 w-3 mr-1" />Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium">Grant Access</p>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a user…" /></SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-40" />
              <Button onClick={grantAccess} disabled={!selectedUserId} size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Grant</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const AVAILABLE_FEATURES = [
  { id: "connect", label: "AURA Connect", description: "Relationship intelligence & warm intro tool" },
  { id: "concierge", label: "AURA Concierge", description: "On-call build team for systems, tools & assets" },
] as const;

function UserFeaturesTab({ profiles, adminUsers, userId }: { profiles: any[]; adminUsers: any[]; userId?: string }) {
  const [featureGrants, setFeatureGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("user_features" as any).select("*").order("granted_at", { ascending: false })
      .then(({ data }: any) => { setFeatureGrants(data || []); setLoading(false); });
  }, []);

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { if (p.user_id && p.full_name) m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  // Group grants by user
  const userFeatureMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    featureGrants.forEach((g: any) => {
      if (!m[g.user_id]) m[g.user_id] = [];
      m[g.user_id].push(g.feature);
    });
    return m;
  }, [featureGrants]);

  const allUserIds = useMemo(() => {
    const set = new Set<string>();
    adminUsers.forEach((u: any) => { if (u.id && u.approval_status !== "pending") set.add(u.id); });
    profiles.forEach((p: any) => { if (p.user_id) set.add(p.user_id); });
    return Array.from(set);
  }, [adminUsers, profiles]);

  const toggleFeature = async (targetUserId: string, feature: string, enabled: boolean) => {
    if (!userId) return;
    if (enabled) {
      const { error } = await (supabase.from("user_features" as any) as any).insert({
        user_id: targetUserId,
        feature,
        granted_by: userId,
      });
      if (error) {
        if (error.message?.includes("duplicate")) { toast.info("Feature already assigned"); return; }
        toast.error(error.message); return;
      }
      setFeatureGrants(prev => [...prev, { user_id: targetUserId, feature, granted_by: userId, granted_at: new Date().toISOString() }]);
      toast.success(`${feature} enabled for ${profileMap[targetUserId] || "user"}`);
    } else {
      await (supabase.from("user_features" as any) as any).delete().eq("user_id", targetUserId).eq("feature", feature);
      setFeatureGrants(prev => prev.filter(g => !(g.user_id === targetUserId && g.feature === feature)));
      toast.success(`${feature} disabled for ${profileMap[targetUserId] || "user"}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4" />Feature Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Toggle features per user. Features are layered on top of the user's primary role (admin, advisor, manager, etc.).
          </p>

          {loading ? (
            <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="space-y-2">
              {allUserIds.map(uid => {
                const userName = profileMap[uid] || uid.slice(0, 8) + "…";
                const userEmail = adminUsers.find((u: any) => u.id === uid)?.email || "";
                const userFeatures = userFeatureMap[uid] || [];

                return (
                  <div key={uid} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{userName}</p>
                      {userEmail && <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {AVAILABLE_FEATURES.map(f => (
                        <label key={f.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={userFeatures.includes(f.id)}
                            onCheckedChange={(checked) => toggleFeature(uid, f.id, !!checked)}
                          />
                          <span className="text-xs">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {allUserIds.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users available.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
