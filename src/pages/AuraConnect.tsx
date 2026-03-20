import { useEffect, useState, useCallback } from "react";
import { useUserFeatures } from "@/hooks/useUserFeatures";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, User, Zap, Users, ArrowRight, Loader2,
  MapPin, Building2, Briefcase, TrendingUp, Network, Star,
  AlertTriangle, Mail, MessageSquare, Send, Check, X,
  Target, Handshake, Bell, RefreshCw, Settings, Flame,
  Crown, Link2, ChevronRight, Linkedin, Clock,
  MessageCircle, Wrench, Heart, RotateCcw, Rss, Sparkles,
} from "lucide-react";
import ConnectCommunityTab from "@/components/connect/ConnectCommunityTab";
import ConnectToolsTab from "@/components/connect/ConnectToolsTab";
import ConnectReferralsTab from "@/components/connect/ConnectReferralsTab";
import ConnectHealthTab from "@/components/connect/ConnectHealthTab";
import ConnectCadenceTab from "@/components/connect/ConnectCadenceTab";
import ConnectNetworkTab from "@/components/connect/ConnectNetworkTab";
import ConnectSignalsTab from "@/components/connect/ConnectSignalsTab";
import { ConnectedAccountsStatus } from "@/components/ConnectedAccountsStatus";
import { ProgressiveUnlocks } from "@/components/ProgressiveUnlocks";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/auth-fetch";

// ─── Types ───

interface ConnectionBrief {
  who_they_are: {
    name: string;
    location?: string;
    employer?: string;
    role?: string;
    industry?: string;
    affiliations?: string[];
    summary: string;
  };
  what_changed: {
    events: Array<{ type: string; description: string; date?: string }>;
  };
  who_can_get_you_there: Array<{
    name: string;
    relationship: string;
    confidence: number;
    reason: string;
  }>;
  best_path_in: {
    person: string;
    reason: string;
    confidence: "high" | "medium" | "low";
  };
  recommended_move: string;
}

interface Owner {
  name: string;
  company: string;
  reason: string;
  signal: string;
  warmth: number;
  best_path: string;
}

interface Partner {
  name: string;
  type: string;
  reason: string;
  owners_unlocked: number;
  last_interaction: string;
}

interface Trigger {
  type: string;
  title: string;
  description: string;
  person: string;
  company: string;
  date: string;
  urgency: "high" | "medium" | "low";
  suggested_action: string;
}

interface TouchItem {
  id: string;
  type: "email" | "linkedin_dm" | "comment" | "intro_request";
  target: string;
  company: string;
  subject: string;
  draft: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface DashboardData {
  top_owners: Owner[];
  top_partners: Partner[];
  triggers: Trigger[];
  touch_queue: TouchItem[];
  stats: {
    warm_paths: number;
    active_triggers: number;
    pending_touches: number;
    meetings_sourced_90d: number;
  };
}

// ─── Component ───

export default function AuraConnect() {
  const { hasConnect, loading: featuresLoading } = useUserFeatures();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Connection check
  const [emailConnected, setEmailConnected] = useState<boolean | null>(null);

  // Connection Brief state
  const [briefName, setBriefName] = useState("");
  const [briefNotes, setBriefNotes] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<ConnectionBrief | null>(null);

  // Dashboard state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // Touch queue approvals
  const [approvedTouches, setApprovedTouches] = useState<Set<string>>(new Set());
  const [dismissedTouches, setDismissedTouches] = useState<Set<string>>(new Set());

  // Active tab
  const [activeTab, setActiveTab] = useState("brief");

  useEffect(() => {
    if (!featuresLoading && !roleLoading && !hasConnect && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [featuresLoading, roleLoading, hasConnect, isAdmin, navigate]);

  // Check email connections
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "list" }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setEmailConnected((data.connections || []).length > 0);
        } else {
          setEmailConnected(false);
        }
      } catch {
        setEmailConnected(false);
      }
    };
    check();
  }, [user]);

  // ─── Dashboard generation ───

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-intelligence", {
        body: { action: "dashboard" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDashboard(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load intelligence");
    } finally {
      setDashLoading(false);
    }
  }, []);

  // Auto-load dashboard on mount
  useEffect(() => {
    if (!featuresLoading && !roleLoading && (hasConnect || isAdmin) && user) {
      loadDashboard();
    }
  }, [featuresLoading, roleLoading, hasConnect, isAdmin, user, loadDashboard]);

  // ─── Connection Brief ───

  const handleBuildBrief = async () => {
    if (!briefName.trim()) {
      toast.error("Enter a name to search");
      return;
    }
    setBriefLoading(true);
    setBrief(null);
    try {
      const { data, error } = await supabase.functions.invoke("connection-brief", {
        body: { name: briefName.trim(), notes: briefNotes.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBrief(data.brief);
      toast.success("Connection Brief ready");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate brief");
    } finally {
      setBriefLoading(false);
    }
  };

  // ─── Touch queue actions ───

  const handleApproveTouch = async (touch: TouchItem) => {
    setApprovedTouches(prev => new Set(prev).add(touch.id));
    toast.success("Message approved & queued");
    // Track feedback
    await supabase.from("outreach_feedback").insert({
      user_id: user!.id,
      touch_id: touch.id,
      target_name: touch.target,
      target_company: touch.company,
      outreach_type: touch.type,
      action: "approved",
    });
  };

  const handleDismissTouch = async (touch: TouchItem) => {
    setDismissedTouches(prev => new Set(prev).add(touch.id));
    await supabase.from("outreach_feedback").insert({
      user_id: user!.id,
      touch_id: touch.id,
      target_name: touch.target,
      target_company: touch.company,
      outreach_type: touch.type,
      action: "dismissed",
    });
  };

  // ─── Helpers ───

  const confidenceColor = (c: string) => {
    if (c === "high") return "text-success";
    if (c === "medium") return "text-warning";
    return "text-muted-foreground";
  };

  const urgencyColor = (u: string) => {
    if (u === "high") return "bg-destructive/10 text-destructive border-destructive/20";
    if (u === "medium") return "bg-warning/10 text-warning border-warning/20";
    return "bg-muted text-muted-foreground";
  };

  const warmthColor = (w: number) => {
    if (w >= 80) return "text-success";
    if (w >= 60) return "text-warning";
    return "text-muted-foreground";
  };

  const touchIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "linkedin_dm": return <Linkedin className="h-4 w-4" />;
      case "comment": return <MessageSquare className="h-4 w-4" />;
      case "intro_request": return <Handshake className="h-4 w-4" />;
      default: return <Send className="h-4 w-4" />;
    }
  };

  const triggerIcon = (type: string) => {
    switch (type) {
      case "job_change": return <Briefcase className="h-4 w-4 text-accent" />;
      case "funding": return <TrendingUp className="h-4 w-4 text-success" />;
      case "expansion": return <Building2 className="h-4 w-4 text-primary" />;
      case "renewal": return <Clock className="h-4 w-4 text-warning" />;
      case "dormant_reactivation": return <RefreshCw className="h-4 w-4 text-accent" />;
      case "new_contact": return <User className="h-4 w-4 text-primary" />;
      case "content_engagement": return <MessageSquare className="h-4 w-4 text-accent" />;
      default: return <Zap className="h-4 w-4 text-warning" />;
    }
  };

  // ─── Loading / Auth ───

  if (featuresLoading || roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!hasConnect && !isAdmin) return null;

  const visibleTouches = (dashboard?.touch_queue || []).filter(
    t => !dismissedTouches.has(t.id) && !approvedTouches.has(t.id)
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-24 px-2 sm:px-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              AURA Connect
            </h1>
            <p className="text-sm text-muted-foreground">
              Your AI relationship engine — warm paths, live triggers, and one-tap outreach.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={dashLoading}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dashLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Block 2 — Connected Accounts Status (persistent) */}
        <ConnectedAccountsStatus variant="compact" />


        {/* Stats Row */}
        {dashboard?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Warm Paths", value: dashboard.stats.warm_paths, icon: <Flame className="h-4 w-4 text-destructive" /> },
              { label: "Active Triggers", value: dashboard.stats.active_triggers, icon: <Zap className="h-4 w-4 text-warning" /> },
              { label: "Pending Touches", value: visibleTouches.length, icon: <Send className="h-4 w-4 text-accent" /> },
              { label: "Meetings (90d)", value: dashboard.stats.meetings_sourced_90d, icon: <Target className="h-4 w-4 text-success" /> },
            ].map((s, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {s.icon}
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex w-auto min-w-full gap-0.5">
              <TabsTrigger value="brief" className="gap-1.5 text-xs sm:text-sm">
                <Search className="h-3.5 w-3.5 hidden sm:inline" />
                Brief
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
                <Crown className="h-3.5 w-3.5 hidden sm:inline" />
                Top 10s
              </TabsTrigger>
              <TabsTrigger value="triggers" className="gap-1.5 text-xs sm:text-sm">
                <Zap className="h-3.5 w-3.5 hidden sm:inline" />
                Triggers
              </TabsTrigger>
              <TabsTrigger value="touches" className="gap-1.5 text-xs sm:text-sm">
                <Send className="h-3.5 w-3.5 hidden sm:inline" />
                Outreach
              </TabsTrigger>
              <TabsTrigger value="referrals" className="gap-1.5 text-xs sm:text-sm">
                <Handshake className="h-3.5 w-3.5 hidden sm:inline" />
                Referrals
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 text-xs sm:text-sm">
                <Wrench className="h-3.5 w-3.5 hidden sm:inline" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="community" className="gap-1.5 text-xs sm:text-sm">
                <MessageCircle className="h-3.5 w-3.5 hidden sm:inline" />
                Community
              </TabsTrigger>
              <TabsTrigger value="cadence" className="gap-1.5 text-xs sm:text-sm">
                <RotateCcw className="h-3.5 w-3.5 hidden sm:inline" />
                Cadence
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-1.5 text-xs sm:text-sm">
                <Network className="h-3.5 w-3.5 hidden sm:inline" />
                Network
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-1.5 text-xs sm:text-sm">
                <Heart className="h-3.5 w-3.5 hidden sm:inline" />
                Health
              </TabsTrigger>
              <TabsTrigger value="signals" className="gap-1.5 text-xs sm:text-sm">
                <Rss className="h-3.5 w-3.5 hidden sm:inline" />
                Signals
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ────── TOP 10s TAB ────── */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {dashLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing your network…</p>
                </div>
              </div>
            ) : dashboard ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top 10 Owners */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Top 10 Owners to Reach
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">Ranked by warmth and trigger signals</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.top_owners.map((o, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{o.name}</p>
                            <Badge variant="outline" className={`text-[9px] shrink-0 ${warmthColor(o.warmth)}`}>
                              {o.warmth}% warm
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{o.company}</p>
                          <p className="text-[11px] text-muted-foreground">{o.reason}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Zap className="h-3 w-3 text-warning shrink-0" />
                            <span className="text-[10px] text-warning">{o.signal}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3 text-accent shrink-0" />
                            <span className="text-[10px] text-accent">{o.best_path}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Top 10 Partners */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Handshake className="h-4 w-4 text-accent" />
                      Top 10 Partners to Deepen
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">CPAs, attorneys, lenders who unlock the most owners</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.top_partners.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <Badge variant="outline" className="text-[9px] shrink-0">
                              {p.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{p.reason}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[9px]">
                              <Users className="h-3 w-3 mr-1" />
                              {p.owners_unlocked} owners unlocked
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">{p.last_interaction}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="space-y-3">
                  <Network className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No intelligence data yet. Click Refresh to generate.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ────── TRIGGERS TAB ────── */}
          <TabsContent value="triggers" className="space-y-4 mt-4">
            {dashLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : dashboard?.triggers?.length ? (
              <div className="space-y-2">
                {dashboard.triggers.map((t, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted/50 p-2 shrink-0 mt-0.5">
                          {triggerIcon(t.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{t.title}</p>
                            <Badge variant="outline" className={`text-[9px] ${urgencyColor(t.urgency)}`}>
                              {t.urgency}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {t.person}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {t.company}
                            </span>
                            {t.date && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t.date}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded bg-primary/5 border border-primary/10">
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-[11px] text-primary font-medium">{t.suggested_action}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="space-y-3">
                  <Bell className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No triggers detected yet. Click Refresh to scan.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ────── OUTREACH / TOUCH QUEUE TAB ────── */}
          <TabsContent value="touches" className="space-y-4 mt-4">
            {dashLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : visibleTouches.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  AURA drafted these messages based on your triggers and relationships. Approve to send, or dismiss.
                </p>
                {visibleTouches.map((t) => (
                  <Card key={t.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 shrink-0 mt-0.5 ${
                          t.priority === "high" ? "bg-destructive/10" : t.priority === "medium" ? "bg-warning/10" : "bg-muted/50"
                        }`}>
                          {touchIcon(t.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{t.target}</p>
                            <Badge variant="outline" className="text-[9px]">{t.company}</Badge>
                            <Badge variant="secondary" className="text-[9px] capitalize">{t.type.replace("_", " ")}</Badge>
                          </div>
                          {t.subject && (
                            <p className="text-xs font-medium text-foreground">Subject: {t.subject}</p>
                          )}
                          <div className="rounded-lg bg-muted/40 p-3 border">
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{t.draft}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">Why now: {t.reason}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              className="gap-1.5 h-8"
                              onClick={() => handleApproveTouch(t)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve & Send
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 h-8 text-muted-foreground"
                              onClick={() => handleDismissTouch(t)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : dashboard ? (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="space-y-3">
                  <Check className="h-10 w-10 text-success mx-auto" />
                  <p className="text-sm text-muted-foreground">All caught up! No pending outreach.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="space-y-3">
                  <Send className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Outreach queue will appear after intelligence loads.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ────── CONNECTION BRIEF TAB ────── */}
          <TabsContent value="brief" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </label>
                  <Input
                    value={briefName}
                    onChange={(e) => setBriefName(e.target.value)}
                    placeholder="John Smith"
                    className="text-base"
                    onKeyDown={(e) => e.key === "Enter" && handleBuildBrief()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Notes (optional)
                  </label>
                  <Textarea
                    value={briefNotes}
                    onChange={(e) => setBriefNotes(e.target.value)}
                    placeholder="Met at chamber event · Owns a roofing company · Referred by Mike"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleBuildBrief}
                  disabled={briefLoading || !briefName.trim()}
                  className="w-full gap-2"
                  size="lg"
                >
                  {briefLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Building Brief…</>
                  ) : (
                    <><Search className="h-4 w-4" /> Build Connection Brief</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {brief && (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                {/* Best Path Card */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">Best Path In</h3>
                          <Badge variant="outline" className={`text-[10px] ${confidenceColor(brief.best_path_in.confidence)}`}>
                            {brief.best_path_in.confidence} confidence
                          </Badge>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">{brief.best_path_in.person}</span>
                          {" — "}{brief.best_path_in.reason}
                        </p>
                        <Separator className="my-2" />
                        <p className="text-xs text-muted-foreground italic">
                          <ArrowRight className="h-3 w-3 inline mr-1" />
                          {brief.recommended_move}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Who They Are */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Who They Are
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{brief.who_they_are.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {brief.who_they_are.location && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <MapPin className="h-3 w-3" /> {brief.who_they_are.location}
                        </Badge>
                      )}
                      {brief.who_they_are.employer && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Building2 className="h-3 w-3" /> {brief.who_they_are.employer}
                        </Badge>
                      )}
                      {brief.who_they_are.role && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Briefcase className="h-3 w-3" /> {brief.who_they_are.role}
                        </Badge>
                      )}
                      {brief.who_they_are.industry && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          {brief.who_they_are.industry}
                        </Badge>
                      )}
                    </div>
                    {brief.who_they_are.affiliations && brief.who_they_are.affiliations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {brief.who_they_are.affiliations.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{a}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* What Changed */}
                {brief.what_changed.events.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-warning" />
                        What Changed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {brief.what_changed.events.map((ev, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
                            <div>
                              <span className="font-medium">{ev.type}</span>
                              {" — "}{ev.description}
                              {ev.date && (
                                <span className="text-[11px] text-muted-foreground ml-1">({ev.date})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Who Can Get You There */}
                {brief.who_can_get_you_there.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-accent" />
                        Who Can Get You There
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {brief.who_can_get_you_there.map((c, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-2 rounded-lg bg-muted/40">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.relationship}</p>
                              <p className="text-xs">{c.reason}</p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${
                              c.confidence >= 80 ? "text-success" : c.confidence >= 50 ? "text-warning" : "text-muted-foreground"
                            }`}>
                              {c.confidence}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ────── REFERRALS TAB ────── */}
          <TabsContent value="referrals" className="space-y-4 mt-4">
            <ConnectReferralsTab />
          </TabsContent>

          {/* ────── TOOLS TAB ────── */}
          <TabsContent value="tools" className="space-y-4 mt-4">
            <ConnectToolsTab />
          </TabsContent>

          {/* ────── COMMUNITY TAB ────── */}
          <TabsContent value="community" className="space-y-4 mt-4">
            <ConnectCommunityTab />
          </TabsContent>

          {/* ────── CADENCE TAB ────── */}
          <TabsContent value="cadence" className="space-y-4 mt-4">
            <ConnectCadenceTab />
          </TabsContent>

          {/* ────── NETWORK TAB ────── */}
          <TabsContent value="network" className="space-y-4 mt-4">
            <ConnectNetworkTab />
          </TabsContent>

          {/* ────── HEALTH TAB ────── */}
          <TabsContent value="health" className="space-y-4 mt-4">
            <ConnectHealthTab />
          </TabsContent>

          {/* ────── SIGNALS TAB ────── */}
          <TabsContent value="signals" className="space-y-4 mt-4">
            <ConnectSignalsTab />
          </TabsContent>
        </Tabs>

        {/* Progressive Unlocks — below main content */}
        <ProgressiveUnlocks />
      </div>
    </AppLayout>
  );
}
