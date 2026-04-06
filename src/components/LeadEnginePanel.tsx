import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Radar, Flame, Thermometer, Sprout, TrendingUp, Phone, Mail,
  Linkedin, MessageSquare, Globe, FileText, Clock, Eye, UserPlus,
  ArrowRight, Zap, Settings, AlertCircle, CheckCircle2, Target,
  Building2, MapPin, DollarSign, CalendarClock, Search, Filter,
  Plus, RefreshCw, ArrowUpRight, ChevronDown, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useEngineTierSummary,
  useEngineLeads,
  useEngineActivity,
  useLeadSourceConfigs,
  useEngineKpis,
  useUpdateEngineLead,
  useLogEngineActivity,
  useUpsertSourceConfig,
  useConvertToPipeline,
  useDeleteEngineLead,
  useScanSource,
  type EngineLead,
} from "@/hooks/useLeadEngine";
import { formatDistanceToNow } from "date-fns";
import { LeadCard } from "./lead-engine/LeadCard";
import { AddLeadDialog } from "./lead-engine/AddLeadDialog";
import { SourceConfigDialog } from "./lead-engine/SourceConfigDialog";

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
  conversion: { icon: ArrowUpRight, color: "text-emerald-500" },
  created: { icon: Plus, color: "text-primary" },
  flood: { icon: Globe, color: "text-blue-500" },
  storm: { icon: Globe, color: "text-slate-500" },
  property: { icon: Building2, color: "text-teal-500" },
  default: { icon: MessageSquare, color: "text-primary" },
};

/* ── Tier Cards ── */
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

/* ── Lead List with search/filter ── */
function TieredLeadSection({
  tier,
  config,
  searchQuery,
  statusFilter,
}: {
  tier: 1 | 2 | 3;
  config: typeof TIER_CONFIG[0];
  searchQuery: string;
  statusFilter: string;
}) {
  const navigate = useNavigate();
  const { data: leads, isLoading } = useEngineLeads(tier);
  const convertLead = useConvertToPipeline();
  const deleteLead = useDeleteEngineLead();
  const logActivity = useLogEngineActivity();
  const [expanded, setExpanded] = useState(tier === 1);

  const filtered = (leads || []).filter((l) => {
    const matchSearch = !searchQuery ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.state?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAction = async (lead: EngineLead, actionType: string) => {
    if (actionType === "call") {
      if (lead.phone) window.open(`tel:${lead.phone}`, "_self");
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
      if (lead.source_url) {
        window.open(lead.source_url, "_blank", "noopener,noreferrer");
        toast.success(`Opening ${lead.source} post for ${lead.company}`);
      } else {
        // Fallback: try a web search for the lead
        const query = encodeURIComponent(`${lead.company} ${lead.state || ""} ${lead.source}`);
        window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
        toast.success(`Searching for ${lead.company} — no direct link available`);
      }
    } else if (actionType === "dismiss") {
      try {
        await deleteLead.mutateAsync(lead.id);
        toast.success(`${lead.company} dismissed`);
      } catch {
        toast.error("Failed to dismiss lead");
      }
    }
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full group py-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <config.icon className={`h-4 w-4 ${config.color}`} />
          {config.label} Leads (Tier {tier})
          {!isLoading && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {filtered.length}
            </Badge>
          )}
        </h3>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isLoading ? (
          <div className="space-y-3 mt-3">
            {[1, 2].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="mt-3">
            <CardContent className="p-6 text-center">
              <config.icon className={`h-6 w-6 ${config.color} opacity-30 mx-auto mb-2`} />
              <p className="text-xs text-muted-foreground">No {config.label.toLowerCase()} leads{searchQuery ? " matching your search" : ""}.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mt-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onAction={handleAction}
                compact={tier > 1}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Activity Feed ── */
function ActivityFeed() {
  const { data: activities, isLoading } = useEngineActivity(10);

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (!activities?.length) {
    return <p className="text-xs text-muted-foreground text-center py-4">No activity yet. Add leads or take actions to see your feed.</p>;
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

/* ── Monitoring Panel ── */
const LIVE_SOURCES = [
  "Reddit", "Business Filings", "Permit Database", "LinkedIn",
  "FEMA Flood Zones", "NOAA Storm Events", "Census / ACS Data", "NHTSA Vehicles",
  "OpenFEMA NFIP", "HUD Housing Data", "Property Records", "Building Permits",
  "Tax Delinquency", "Google Trends",
  "ATTOM Data", "RentCast", "Regrid Parcels", "BatchData",
  "FL Citizens Non-Renewal", "State Socrata Portals", "County ArcGIS",
  "CT Property Transfers", "NYC ACRIS", "MassGIS Parcels", "NJ MOD-IV / Sales",
];
const COMING_SOON_SOURCES = ["ZoomInfo", "PropStream", "RI Coastal (FEMA)"];

function MonitoringPanel({ onConfigure }: { onConfigure: (source: string) => void }) {
  const { data: configs, isLoading } = useLeadSourceConfigs();
  const upsertConfig = useUpsertSourceConfig();
  const scanSource = useScanSource();
  const [scanningSource, setScanningSource] = useState<string | null>(null);

  const SCAN_INTERVALS: Record<string, number> = {
    Reddit: 60,
    LinkedIn: 120,
    "Business Filings": 1440,
    "Permit Database": 1440,
    "FEMA Flood Zones": 1440,
    "NOAA Storm Events": 720,
    "Census / ACS Data": 10080,
    "NHTSA Vehicles": 1440,
    "OpenFEMA NFIP": 1440,
    "HUD Housing Data": 10080,
    "Property Records": 1440,
    "Building Permits": 1440,
    "Tax Delinquency": 10080,
    "Google Trends": 360,
    "ATTOM Data": 1440,
    "RentCast": 1440,
    "Regrid Parcels": 1440,
    "BatchData": 1440,
    "FL Citizens Non-Renewal": 10080,
    "State Socrata Portals": 1440,
    "County ArcGIS": 1440,
    "CT Property Transfers": 1440,
    "NYC ACRIS": 1440,
    "MassGIS Parcels": 10080,
    "NJ MOD-IV / Sales": 10080,
  };

  const DEFAULT_SOURCES = [
    { source: "Reddit", detail: "Subreddit monitoring" },
    { source: "Business Filings", detail: "State filings sync" },
    { source: "LinkedIn", detail: "Signal detection via web scraping" },
    { source: "Permit Database", detail: "Construction + Liquor permits" },
    { source: "FEMA Flood Zones", detail: "Flood zone property enrichment — all 50 states" },
    { source: "NOAA Storm Events", detail: "Hail, wind, tornado triggers — real-time" },
    { source: "OpenFEMA NFIP", detail: "NFIP policies, claims & disaster declarations" },
    { source: "Property Records", detail: "County assessor data — transfers & values" },
    { source: "Building Permits", detail: "Renovation & new construction triggers" },
    { source: "Census / ACS Data", detail: "ZIP-level scoring — home values, auto gaps" },
    { source: "HUD Housing Data", detail: "Vacancy, rental & LIHTC property data" },
    { source: "NHTSA Vehicles", detail: "Recalls, VIN decode, crash corridors" },
    { source: "Tax Delinquency", detail: "Delinquent properties — lapsed insurance risk" },
    { source: "Google Trends", detail: "Insurance intent signal monitoring" },
    { source: "ATTOM Data", detail: "158M properties — daily sales, ownership, valuations" },
    { source: "RentCast", detail: "140M+ properties — REST API, $0-$99/mo" },
    { source: "Regrid Parcels", detail: "149M parcels — boundaries + ownership data" },
    { source: "BatchData", detail: "155M+ properties — pay-per-call enrichment" },
    { source: "FL Citizens Non-Renewal", detail: "Quarterly non-renewal list — highest-intent leads" },
    { source: "State Socrata Portals", detail: "IL, WA, CO, DC, OR — copy CT pattern" },
    { source: "County ArcGIS", detail: "FL, OH, MN, AZ, NC — county assessor REST" },
    { source: "CT Property Transfers", detail: "Socrata API — ~500 new sales/week, real-time" },
    { source: "NYC ACRIS", detail: "3-table join: Master + Legals + PLUTO — ~1,500 deeds/wk" },
    { source: "MassGIS Parcels", detail: "ArcGIS REST — biannual bulk + ownership diff" },
    { source: "NJ MOD-IV / Sales", detail: "Quarterly assessments + sales Excel files" },
    { source: "PropStream", detail: "160M+ properties — UI export tool ($99/mo)" },
    { source: "ZoomInfo", detail: "Contact enrichment" },
    { source: "RI Coastal (FEMA)", detail: "RI coastal flood zones — FEMA/NOAA only" },
  ];

  const mergedSources = DEFAULT_SOURCES.map((ds) => {
    const cfg = configs?.find((c) => c.source === ds.source);
    const isLive = LIVE_SOURCES.includes(ds.source);
    const interval = SCAN_INTERVALS[ds.source] || 1440;
    const lastSyncAt = cfg?.last_sync_at ? new Date(cfg.last_sync_at) : null;
    const minutesSinceLast = lastSyncAt ? (Date.now() - lastSyncAt.getTime()) / 60000 : Infinity;
    const nextScanMin = Math.max(0, Math.round(interval - minutesSinceLast));

    let statusDetail = ds.detail;
    if (cfg?.is_active && lastSyncAt) {
      statusDetail = `Last scan: ${formatDistanceToNow(lastSyncAt, { addSuffix: true })}`;
      if (nextScanMin > 0 && nextScanMin < interval) {
        const unit = nextScanMin >= 60 ? `${Math.round(nextScanMin / 60)}h` : `${nextScanMin}m`;
        statusDetail += ` · Next in ${unit}`;
      }
    } else if (!cfg?.is_active) {
      statusDetail = ds.detail;
    }

    return {
      source: ds.source,
      detail: statusDetail,
      active: cfg?.is_active ?? false,
      configured: !!cfg && Object.keys(cfg.settings || {}).length > 0,
      isLive,
      settings: (cfg?.settings || {}) as Record<string, string>,
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

  const handleScan = async (source: string, settings: Record<string, string>) => {
    setScanningSource(source);
    try {
      const result = await scanSource.mutateAsync({ source, settings });
      if (result.leads_found > 0) {
        toast.success(`🎯 Found ${result.leads_found} new leads from ${source}!`);
      } else {
        toast.info(result.message || `No new leads found from ${source}`);
      }
    } catch (err: any) {
      toast.error(err.message || `Scan failed for ${source}`);
    } finally {
      setScanningSource(null);
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      {mergedSources.map((m) => (
        <div key={m.source} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {m.isLive ? (
              m.active ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium">{m.source}</p>
              <p className="text-[10px] text-muted-foreground truncate">{m.detail}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {m.isLive ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[9px] h-6 px-2"
                  onClick={() => onConfigure(m.source)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                {m.active && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[9px] h-6 px-2 gap-1"
                    disabled={scanningSource === m.source}
                    onClick={() => handleScan(m.source, m.settings)}
                  >
                    {scanningSource === m.source ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Scanning…
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3" />
                        Scan Now
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant={m.active ? "default" : "outline"}
                  size="sm"
                  className={`text-[9px] h-6 px-2 ${!m.active ? "opacity-50" : ""}`}
                  onClick={() => toggleSource(m.source, m.active)}
                >
                  {m.active ? "Live" : "Activate"}
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-[9px] text-muted-foreground/60 border-muted-foreground/20">
                Coming Soon
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── KPI Panel ── */
function KpiPanel() {
  const { data: kpis, isLoading } = useEngineKpis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-3 text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  const convRate = kpis && kpis.totalLeads > 0 ? ((kpis.converted / kpis.totalLeads) * 100).toFixed(1) : "0";

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

/* ── Main Panel ── */
export default function LeadEnginePanel() {
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [configSource, setConfigSource] = useState<string | null>(null);
  const { data: configs } = useLeadSourceConfigs();

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
            Real-time lead detection, scoring, and pipeline conversion.{" "}
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads by company, contact, industry, state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="unlocked">Unlocked</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* All Tier Sections */}
      <div className="space-y-4">
        {TIER_CONFIG.map((t) => (
          <TieredLeadSection
            key={t.tier}
            tier={t.tier as 1 | 2 | 3}
            config={t}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
          />
        ))}
      </div>

      <Separator />

      {/* Two Column: Activity + Monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
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
                Settings <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <MonitoringPanel onConfigure={(source) => setConfigSource(source)} />
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
      <SourceConfigDialog
        open={!!configSource}
        onOpenChange={(v) => !v && setConfigSource(null)}
        sourceName={configSource || ""}
        existingConfig={configs?.find((c) => c.source === configSource) || null}
      />
    </div>
  );
}
