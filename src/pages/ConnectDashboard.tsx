import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Target, DollarSign, ArrowRight, Users, Zap, AlertTriangle,
  Sparkles, Send, Image, Palette, Clock, Plus, BarChart3,
  Loader2, FileText, ArrowUpRight, Calendar as CalendarIcon,
  PenLine, ChevronRight, MessageSquare, Activity, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useUserVertical } from "@/hooks/useUserVertical";
import { SPOTLIGHT_TEMPLATES } from "@/components/connect/spotlight-templates";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

const DEFAULT_STAGE_PROB: Record<string, number> = {
  new_lead: 5, prospect: 10, signal_detected: 10, new_provider: 5,
  contacted: 20, showing: 20,
  quoting: 30, quote_sent: 30, proposal_sent: 30,
  presenting: 60, negotiating: 60,
  sold: 100, won: 100, closed_won: 100, bound: 100,
  lost: 0, closed_lost: 0,
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  signal_detected: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  new_provider: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  contacted: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  showing: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  quoting: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  quote_sent: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  proposal_sent: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  presenting: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  negotiating: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  sold: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  won: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  bound: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  lost: "bg-muted text-muted-foreground border-border",
};

const SCORE_TIERS = [
  { min: 80, label: "Platinum", color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  { min: 55, label: "Gold", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { min: 30, label: "Silver", color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" },
  { min: 0, label: "Bronze", color: "bg-orange-800/20 text-orange-400 border-orange-800/30" },
];

function getScoreTier(score: number) {
  return SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[3];
}

export default function ConnectDashboard({ isSubscriber = false }: { isSubscriber?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vertical, config } = useUserVertical();

  const [profile, setProfile] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [weekStats, setWeekStats] = useState({ leadsAdded: 0, leadsGenerated: 0, contentCreated: 0, clarkChats: 0 });
  const [loading, setLoading] = useState(true);
  const [staleDismissed, setStaleDismissed] = useState(false);

  // Clark quick ask state
  const [sageInput, setSageInput] = useState("");
  const [sageResponse, setSageResponse] = useState("");
  const [sageLoading, setSageLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Check localStorage for stale dismiss
  useEffect(() => {
    const dismissed = localStorage.getItem("stale_dismissed_at");
    if (dismissed && Date.now() - Number(dismissed) < 86400000) setStaleDismissed(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const weekStr = startOfWeek.toISOString();

      const [profileRes, leadsRes, auditRes, weekLeadsRes, weekGenRes, sageConvRes] = await Promise.all([
        supabase.from("profiles").select("full_name, connect_vertical, monthly_target").eq("user_id", user.id).maybeSingle(),
        supabase.from("leads").select("id, account_name, contact_name, stage, target_premium, win_probability, score, source, created_at, updated_at, est_premium").eq("owner_user_id", user.id),
        supabase.from("audit_log").select("id, action, object_id, object_type, metadata, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).gte("created_at", weekStr),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).not("source", "is", null).gte("created_at", weekStr),
        supabase.from("sage_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekStr),
      ]);

      setProfile(profileRes.data);
      setLeads(leadsRes.data || []);
      setAuditEvents(auditRes.data || []);
      setWeekStats({
        leadsAdded: weekLeadsRes.count || 0,
        leadsGenerated: weekGenRes.count || 0,
        contentCreated: 0,
        clarkChats: sageConvRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, [user?.id]);

  // Computed data
  const stages = config?.pipelineStages || [];
  const activeStages = stages.filter(s => s.key !== "lost" && s.key !== "closed_lost");

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of leads) {
      const s = l.stage || "new_lead";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [leads]);

  const weightedValue = useMemo(() => {
    return leads
      .filter(l => !["lost", "closed_lost", "sold", "won", "bound", "closed_won"].includes(l.stage || ""))
      .reduce((sum, l) => {
        const premium = l.target_premium || l.est_premium || 0;
        const prob = l.win_probability ?? DEFAULT_STAGE_PROB[l.stage || "new_lead"] ?? 10;
        return sum + (premium * prob / 100);
      }, 0);
  }, [leads]);

  const monthlyTarget = profile?.monthly_target || 50000;
  const progressPct = Math.min(100, Math.round((weightedValue / monthlyTarget) * 100));

  const activeLeadCount = leads.filter(l => !["lost", "closed_lost", "sold", "won", "bound"].includes(l.stage || "")).length;
  const presentingValue = leads
    .filter(l => ["presenting", "negotiating"].includes(l.stage || ""))
    .reduce((s, l) => s + (l.target_premium || l.est_premium || 0), 0);

  // Stale leads (no update in 48h)
  const staleLeads = useMemo(() => {
    const cutoff = Date.now() - 48 * 3600000;
    return leads.filter(l => {
      if (["lost", "closed_lost", "sold", "won", "bound"].includes(l.stage || "")) return false;
      const lastActivity = new Date(l.updated_at || l.created_at).getTime();
      return lastActivity < cutoff;
    });
  }, [leads]);

  // Top 3 generated leads
  const topLeads = useMemo(() => {
    return leads
      .filter(l => l.source && (l.score ?? 0) >= 55)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
  }, [leads]);

  // Template chips
  const templateChips = useMemo(() => {
    return SPOTLIGHT_TEMPLATES.slice(0, 3);
  }, []);

  // Sage contextual suggestions
  const sageSuggestions = useMemo(() => {
    const suggestions: { label: string; message: string }[] = [];
    if (staleLeads.length > 0) {
      suggestions.push({ label: `What should I say to ${staleLeads[0].account_name}?`, message: `What should I say to ${staleLeads[0].account_name} after ${Math.round((Date.now() - new Date(staleLeads[0].updated_at || staleLeads[0].created_at).getTime()) / 86400000)} days of silence?` });
    }
    if (topLeads.length > 0) {
      suggestions.push({ label: `Draft outreach for ${topLeads[0].account_name}`, message: `Draft an outreach email for ${topLeads[0].account_name}` });
    }
    suggestions.push({ label: "Show my pipeline status", message: "Show me my current pipeline status with numbers and next steps." });
    return suggestions.slice(0, 3);
  }, [staleLeads, topLeads]);

  // Audit event labeling
  const labelAuditEvent = (event: any) => {
    const meta = event.metadata || {};
    const name = meta.account_name || meta.lead_name || "";
    switch (event.action) {
      case "create": return { icon: Plus, text: `Added ${name || "a lead"} to Pipeline`, color: "text-emerald-400" };
      case "stage_move": return { icon: ArrowRight, text: `Moved ${name} to ${(meta.new_stage || "").replace(/_/g, " ")}`, color: "text-sky-400" };
      case "auto_renewal_promote": return { icon: Zap, text: `${name} auto-promoted from Lost`, color: "text-amber-400" };
      case "lead_generated": return { icon: Sparkles, text: `Generated ${meta.count || ""} new leads`, color: "text-violet-400" };
      case "enrich_lead": return { icon: Target, text: `Enriched data for ${name}`, color: "text-cyan-400" };
      default: return { icon: Activity, text: `${event.action?.replace(/_/g, " ")} — ${name || event.object_type}`, color: "text-muted-foreground" };
    }
  };

  // Clark quick ask
  const sendClark = useCallback(async (text: string) => {
    if (!text.trim() || sageLoading) return;
    setSageInput("");
    setSageResponse("");
    setSageLoading(true);

    try {
      let token = "";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) token = session.access_token;
      } catch {}

      const ac = new AbortController();
      abortRef.current = ac;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
        signal: ac.signal,
      });

      if (!resp.ok) throw new Error("Failed");
      if (!resp.body) throw new Error("No body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "") continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { full += c; setSageResponse(full); }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setSageResponse("Sorry, something went wrong. Try again.");
    } finally {
      setSageLoading(false);
    }
  }, [sageLoading]);

  // Add to pipeline handler
  const addToPipeline = async (leadId: string, name: string) => {
    const firstStage = activeStages[0]?.key || "new_lead";
    const { error } = await supabase.from("leads").update({ stage: firstStage } as any).eq("id", leadId);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: firstStage } : l));
      // Could show toast — but keeping minimal
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const verticalLabel = config?.label || vertical || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">

      {/* ═══ ZONE A — Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          {verticalLabel && (
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                {verticalLabel}
              </Badge>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
      </div>

      {/* Section Nav Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Pipeline", to: "/connect/pipeline", icon: BarChart3 },
          { label: "Leads", to: "/connect/leads", icon: Target },
          { label: "Create", to: "/connect/create", icon: Palette },
          { label: "Clark", to: "/connect/clark", icon: Sparkles },
        ].map(n => (
          <Button key={n.label} variant="outline" size="sm" className="gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => navigate(n.to)}>
            <n.icon className="h-3.5 w-3.5" />
            {n.label}
          </Button>
        ))}
      </div>

      {/* ═══ ZONE B — Pipeline Snapshot ═══ */}
      <div className="space-y-3">
        {/* B1: Stage Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(activeStages.length > 0 ? activeStages.slice(0, 4) : [
            { key: "new_lead", label: "New Lead" },
            { key: "contacted", label: "Contacted" },
            { key: "quoting", label: "Quoting" },
            { key: "sold", label: "Sold" },
          ]).map(stage => (
            <button
              key={stage.key}
              onClick={() => navigate("/connect/pipeline")}
              className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${STAGE_COLORS[stage.key] || "bg-muted/30 text-foreground border-border"}`}
            >
              <p className="text-2xl font-bold">{stageCounts[stage.key] || 0}</p>
              <p className="text-xs mt-0.5 opacity-80">{stage.label}</p>
            </button>
          ))}
        </div>

        {/* B2: Weighted Pipeline Value */}
        <Card className="bg-card border-border">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Weighted Pipeline Value</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ${Math.round(weightedValue).toLocaleString()} / ${monthlyTarget.toLocaleString()} target
              </span>
            </div>
            <Progress value={progressPct} className="h-2.5 bg-muted" />
            <p className="text-[11px] text-muted-foreground mt-2">
              {activeLeadCount} active lead{activeLeadCount !== 1 ? "s" : ""} · ${presentingValue.toLocaleString()} at presenting stage
            </p>
          </CardContent>
        </Card>

        {/* B3: Stale Alert */}
        {staleLeads.length > 0 && !staleDismissed && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">
                {staleLeads.length} lead{staleLeads.length !== 1 ? "s" : ""} need attention
              </span>
              <span className="text-xs text-amber-400/60 hidden sm:inline">
                — {staleLeads.slice(0, 3).map(l => l.account_name).join(", ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300" onClick={() => navigate("/connect/pipeline")}>
                View <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={() => { setStaleDismissed(true); localStorage.setItem("stale_dismissed_at", String(Date.now())); }}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Middle Row: Leads + Create ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ═══ ZONE C — Today's Signals ═══ */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Today's Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topLeads.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No leads generated yet</p>
                <Button size="sm" className="mt-3 gap-1.5 text-xs" onClick={() => navigate("/connect/leads")}>
                  Generate your first leads <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                {topLeads.map(lead => {
                  const tier = getScoreTier(lead.score || 0);
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{lead.account_name}</span>
                          <Badge variant="outline" className={`text-[9px] ${tier.color}`}>{tier.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.contact_name && <span className="text-[10px] text-muted-foreground">{lead.contact_name}</span>}
                          {lead.source && <Badge variant="secondary" className="text-[9px] h-4">{lead.source}</Badge>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => addToPipeline(lead.id, lead.account_name)}>
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                  );
                })}
                <div className="pt-1">
                  <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/20">
                    Contact data may be AI-generated — verify before outreach
                  </Badge>
                </div>
                <button onClick={() => navigate("/connect/leads")} className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                  View all leads <ArrowRight className="h-3 w-3" />
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══ ZONE D — Create Launchpad ═══ */}
        <div className="relative">
          {!isSubscriber && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-md bg-background/60">
              <Lock className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Subscribe to unlock Create</p>
              <p className="text-xs text-muted-foreground mt-1">Marketing tools for AURA Connect members</p>
            </div>
          )}
          <Card className={`bg-card border-border ${!isSubscriber ? "pointer-events-none" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Create Launchpad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/20 text-center">
                <Image className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Start from a template to create marketing content</p>
                <Button size="sm" className="mt-2 gap-1.5 text-xs" onClick={() => navigate("/connect/create")}>
                  Open Create <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium mb-2">Quick-start templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {templateChips.map(t => (
                    <button
                      key={t.id}
                      onClick={() => navigate("/connect/create")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-foreground"
                    >
                      <t.icon className="h-3 w-3 text-muted-foreground" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ ZONE E — Clark Quick Ask ═══ */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ask Clark
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={sageInput}
              onChange={(e) => setSageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendClark(sageInput); } }}
              placeholder="Ask Clark anything about your pipeline, leads, or content..."
              className="text-sm bg-muted/20 border-border"
            />
            <Button size="icon" className="shrink-0 h-9 w-9" disabled={!sageInput.trim() && !sageLoading} onClick={() => sendClark(sageInput)}>
              {sageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Contextual chips */}
          <div className="flex flex-wrap gap-1.5">
            {sageSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendClark(s.message)}
                className="px-3 py-1.5 rounded-lg text-[11px] border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground truncate max-w-[250px]"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Response panel */}
          {(sageResponse || sageLoading) && (
            <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/10 p-3">
              {sageLoading && !sageResponse && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Clark is thinking...
                </div>
              )}
              {sageResponse && (
                <div className="prose prose-sm prose-invert max-w-none text-xs [&_p]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground">
                  <ReactMarkdown>{sageResponse}</ReactMarkdown>
                </div>
              )}
              <button onClick={() => navigate("/connect/sage")} className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-2">
                Open full Clark <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ZONE F — Activity Feed + This Week ═══ */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No recent activity — start by adding a lead to your pipeline.</p>
          ) : (
            <div className="space-y-1.5">
              {auditEvents.map(event => {
                const { icon: Icon, text, color } = labelAuditEvent(event);
                return (
                  <div key={event.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                    <span className="text-xs text-foreground flex-1">{text}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* This Week micro-stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
            {[
              { label: "Leads Added", value: weekStats.leadsAdded, icon: Plus },
              { label: "Generated", value: weekStats.leadsGenerated, icon: Sparkles },
              { label: "Content", value: weekStats.contentCreated, icon: PenLine },
              { label: "Clark Chats", value: weekStats.clarkChats, icon: MessageSquare },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20">
                <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
