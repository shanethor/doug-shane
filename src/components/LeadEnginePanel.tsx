import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Radar, Flame, Thermometer, Sprout, TrendingUp, Phone, Mail,
  Linkedin, MessageSquare, Globe, FileText, Clock, Eye, UserPlus,
  ArrowRight, Zap, Settings, AlertCircle, CheckCircle2, Target,
  Building2, MapPin, DollarSign, CalendarClock, Search, Filter,
  Plus, RefreshCw, ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useEngineTierSummary,
  useEngineLeads,
  useEngineActivity,
  useLeadSourceConfigs,
  useEngineKpis,
  useCreateEngineLead,
  useUpdateEngineLead,
  useLogEngineActivity,
  useUpsertSourceConfig,
  type EngineLead,
} from "@/hooks/useLeadEngine";
import { formatDistanceToNow } from "date-fns";

/* ── Tier config ── */
const TIER_CONFIG = [
  { label: "Hot", tier: 1, icon: Flame, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Warm", tier: 2, icon: Thermometer, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Nurture", tier: 3, icon: Sprout, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const ACTIVITY_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  linkedin: { icon: Linkedin, color: "text-blue-500" },
  email: { icon: Mail, color: "text-primary" },
  bor: { icon: FileText, color: "text-emerald-500" },
  filing: { icon: Building2, color: "text-amber-500" },
  call: { icon: Phone, color: "text-primary" },
  default: { icon: MessageSquare, color: "text-primary" },
};

function ScoreChip({ score }: { score: number }) {
  const color = score >= 80 ? "bg-destructive/15 text-destructive" : score >= 50 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Target className="h-3 w-3" />
      {score}
    </span>
  );
}

function TierCards() {
  const { data: counts, isLoading } = useEngineTierSummary();
  const total = counts ? counts[1] + counts[2] + counts[3] : 0;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {TIER_CONFIG.map((t) => (
          <Card key={t.tier} className="relative overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <div className={`rounded-full ${t.bg} p-2.5 mb-1`}>
                <t.icon className={`h-5 w-5 ${t.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <span className="text-2xl font-bold">{counts?.[t.tier as 1 | 2 | 3] ?? 0}</span>
              )}
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Total Leads</span>
        </div>
        {isLoading ? <Skeleton className="h-7 w-10" /> : <span className="text-2xl font-bold">{total}</span>}
      </div>
    </>
  );
}

function HotLeadsList() {
  const navigate = useNavigate();
  const { data: leads, isLoading } = useEngineLeads(1);
  const updateLead = useUpdateEngineLead();
  const logActivity = useLogEngineActivity();

  const handleAction = async (lead: EngineLead, actionType: string) => {
    if (actionType === "call") {
      if (lead.phone) {
        window.open(`tel:${lead.phone}`, "_self");
      }
      await logActivity.mutateAsync({
        engine_lead_id: lead.id,
        activity_type: "call",
        description: `Called ${lead.company}`,
        source: lead.source,
        metadata: {},
      });
      toast.success(`Call logged for ${lead.company}`);
    } else if (actionType === "email") {
      navigate(`/chat?prefill=Send an intro email to ${lead.company} at ${lead.email || "their email"}`);
    } else if (actionType === "convert") {
      await updateLead.mutateAsync({ id: lead.id, status: "converted" });
      await logActivity.mutateAsync({
        engine_lead_id: lead.id,
        activity_type: "conversion",
        description: `Converted ${lead.company} to pipeline lead`,
        source: lead.source,
        metadata: {},
      });
      toast.success(`${lead.company} converted to pipeline lead`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!leads?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Flame className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hot leads yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add leads manually or connect intelligence sources in Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <Card key={lead.id} className="hover:border-primary/30 transition-colors cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{lead.company}</h4>
                  <ScoreChip score={lead.score} />
                  <Badge variant="outline" className="text-[9px]">{lead.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {lead.state && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{lead.state}
                    </span>
                  )}
                  {lead.industry && (
                    <>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{lead.industry}</span>
                    </>
                  )}
                  {lead.est_premium > 0 && (
                    <>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />${(lead.est_premium / 1000).toFixed(0)}K est.
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {lead.email && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction(lead, "email")}>
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                )}
                {lead.phone && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction(lead, "call")}>
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleAction(lead, "convert")}>
                  <ArrowUpRight className="h-3 w-3" />
                  Convert
                </Button>
              </div>
            </div>

            {lead.signal && (
              <div className="rounded-md bg-muted/50 px-3 py-2 mb-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{lead.source}:</span> {lead.signal}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Detected {formatDistanceToNow(new Date(lead.detected_at), { addSuffix: true })}
              </span>
              {lead.assigned_to && (
                <span className="text-muted-foreground">
                  Assigned: <span className="font-medium text-foreground">{lead.assigned_to}</span>
                </span>
              )}
            </div>
            {lead.action && (
              <div className="mt-2 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-500" />
                <span className="text-[11px] font-medium text-amber-600">{lead.action}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const { data: activities, isLoading } = useEngineActivity(8);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((a) => {
        const iconInfo = ACTIVITY_ICON_MAP[a.activity_type] || ACTIVITY_ICON_MAP.default;
        return (
          <div key={a.id} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-muted p-1.5">
              <iconInfo.icon className={`h-3.5 w-3.5 ${iconInfo.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">{a.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonitoringPanel() {
  const navigate = useNavigate();
  const { data: configs, isLoading } = useLeadSourceConfigs();
  const upsertConfig = useUpsertSourceConfig();

  const DEFAULT_SOURCES = [
    { source: "LinkedIn", detail: "Keyword monitoring" },
    { source: "Reddit", detail: "Subreddit monitoring" },
    { source: "Business Filings", detail: "State filings sync" },
    { source: "Permit Database", detail: "Construction + Liquor permits" },
    { source: "ZoomInfo", detail: "Contact enrichment" },
  ];

  const mergedSources = DEFAULT_SOURCES.map((ds) => {
    const cfg = configs?.find((c) => c.source === ds.source);
    return {
      source: ds.source,
      detail: cfg ? JSON.stringify(cfg.settings).length > 5 ? `${ds.detail} · Last sync: ${cfg.last_sync_at ? formatDistanceToNow(new Date(cfg.last_sync_at), { addSuffix: true }) : "Never"}` : ds.detail : ds.detail,
      active: cfg?.is_active ?? false,
    };
  });

  const toggleSource = async (source: string, currentActive: boolean) => {
    try {
      await upsertConfig.mutateAsync({ source, is_active: !currentActive });
      toast.success(`${source} ${!currentActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update source");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mergedSources.map((m) => (
        <div key={m.source} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {m.active ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium">{m.source}</p>
              <p className="text-[10px] text-muted-foreground truncate">{m.detail}</p>
            </div>
          </div>
          <Button
            variant={m.active ? "default" : "outline"}
            size="sm"
            className={`text-[9px] shrink-0 h-6 px-2 ${!m.active ? "opacity-50" : ""}`}
            onClick={() => toggleSource(m.source, m.active)}
          >
            {m.active ? "Live" : "Activate"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function KpiPanel() {
  const { data: kpis, isLoading } = useEngineKpis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-3 text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  const convRate = kpis && kpis.totalLeads > 0
    ? ((kpis.converted / kpis.totalLeads) * 100).toFixed(1)
    : "0";

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold">{kpis?.totalLeads ?? 0}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Leads Detected</p>
          <p className="text-[10px] text-muted-foreground/60">Last 30 days</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold">{kpis?.converted ?? 0}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Converted</p>
          <p className="text-[10px] text-muted-foreground/60">{convRate}% rate</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold">{kpis?.sourceBreakdown?.length ?? 0}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Active Sources</p>
          <p className="text-[10px] text-muted-foreground/60">Contributing</p>
        </div>
      </div>

      {kpis?.sourceBreakdown && kpis.sourceBreakdown.length > 0 && (
        <>
          <Separator className="my-4" />
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Source Breakdown</h4>
          <div className="space-y-2">
            {kpis.sourceBreakdown.map((s) => (
              <div key={s.source} className="flex items-center justify-between text-xs">
                <span className="font-medium">{s.source}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{s.leads} leads</span>
                  <span>→</span>
                  <span>{s.tier1} hot</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Add Lead Dialog ── */
function AddLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createLead = useCreateEngineLead();
  const logActivity = useLogEngineActivity();
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    email: "",
    phone: "",
    state: "",
    industry: "",
    est_premium: "",
    signal: "",
    source: "manual",
    score: "50",
    tier: "2",
    action: "",
  });

  const handleSubmit = async () => {
    if (!form.company.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      const lead = await createLead.mutateAsync({
        company: form.company,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        state: form.state || null,
        industry: form.industry || null,
        est_premium: parseFloat(form.est_premium) || 0,
        signal: form.signal || null,
        source: form.source,
        score: parseInt(form.score) || 50,
        tier: parseInt(form.tier) as 1 | 2 | 3,
        action: form.action || null,
        status: "new",
      });
      await logActivity.mutateAsync({
        engine_lead_id: lead.id,
        activity_type: "created",
        description: `Added ${form.company} as ${["", "Hot", "Warm", "Nurture"][parseInt(form.tier)]} lead`,
        source: form.source,
        metadata: {},
      });
      toast.success(`${form.company} added to Lead Engine`);
      onOpenChange(false);
      setForm({ company: "", contact_name: "", email: "", phone: "", state: "", industry: "", est_premium: "", signal: "", source: "manual", score: "50", tier: "2", action: "" });
    } catch {
      toast.error("Failed to add lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Intelligence Lead
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Company Name *</Label>
            <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Bright Line Electric" />
          </div>
          <div>
            <Label className="text-xs">Contact Name</Label>
            <Input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} placeholder="CT" />
          </div>
          <div>
            <Label className="text-xs">Industry</Label>
            <Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Est. Premium ($)</Label>
            <Input type="number" value={form.est_premium} onChange={(e) => setForm((p) => ({ ...p, est_premium: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Tier</Label>
            <Select value={form.tier} onValueChange={(v) => setForm((p) => ({ ...p, tier: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">🔥 Hot (Tier 1)</SelectItem>
                <SelectItem value="2">🌡️ Warm (Tier 2)</SelectItem>
                <SelectItem value="3">🌱 Nurture (Tier 3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Score (1-100)</Label>
            <Input type="number" min="1" max="100" value={form.score} onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Reddit">Reddit</SelectItem>
                <SelectItem value="Business Filings">Business Filings</SelectItem>
                <SelectItem value="Renewal Intercept">Renewal Intercept</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Signal / Notes</Label>
            <Textarea value={form.signal} onChange={(e) => setForm((p) => ({ ...p, signal: e.target.value }))} placeholder="Quote request signal or note..." rows={2} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Next Action</Label>
            <Input value={form.action} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))} placeholder="Call by 3pm today" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createLead.isPending}>
            {createLead.isPending ? "Adding..." : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Panel ── */
export default function LeadEnginePanel() {
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Build In Progress Banner */}
      <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary mb-1">Build In Progress</h1>
        <p className="text-sm text-muted-foreground">This section is actively being developed. Functionality below is live but expanding.</p>
      </div>

      {/* Header with actions */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">Lead Intelligence Engine</h2>
          <p className="text-xs text-muted-foreground">
            Real-time lead detection and scoring.{" "}
            <button
              onClick={() => navigate("/settings?section=lead-engine")}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Configure sources
            </button>
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Lead
        </Button>
      </div>

      <TierCards />
      <Separator />

      {/* Hot Leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" />
            Hot Leads (Tier 1) — Action Required
          </h3>
        </div>
        <HotLeadsList />
      </div>

      <Separator />

      {/* Two Column: Activity + Monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Active Monitoring
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => navigate("/settings?section=lead-engine")}>
                Configure <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <MonitoringPanel />
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Performance Snapshot (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <KpiPanel />
        </CardContent>
      </Card>

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
