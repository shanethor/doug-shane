import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import LeadOutreachPanel from "./LeadOutreachPanel";
import SageGameplan from "./SageGameplan";
import StudioLeadPromo from "./StudioLeadPromo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Rocket, Building2, Globe, MapPin, Target, Search, FileText,
  Plus, ArrowUpRight, Eye, Trash2, Zap,
  Sparkles, Users, TrendingUp,
  Loader2, Mail, Phone, RefreshCw, Gift, Lock, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useEngineLeads, useUpdateEngineLead, useDeleteEngineLead, useConvertToPipeline,
  type EngineLead,
} from "@/hooks/useLeadEngine";
import {
  VERTICALS, SHARED_SOURCES, getVerticalsForIndustry, getVerticalsByGroup,
  type LeadSource, type Vertical,
} from "@/lib/lead-verticals";

const ICON_MAP: Record<LeadSource["icon"], any> = {
  file: FileText, building: Building2, target: Target, globe: Globe,
  zap: Zap, users: Users, rocket: Rocket, trending: TrendingUp, map: MapPin,
};

const US_STATES = [
  "All States", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
  "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

/* ── Industry pricing ── */
const INDUSTRY_PRICING: Record<string, { basePrice: number; label: string; freeLeads: number }> = {
  insurance: { basePrice: 25, label: "Insurance", freeLeads: 5 },
  mortgage: { basePrice: 100, label: "Mortgage", freeLeads: 2 },
  real_estate: { basePrice: 100, label: "Real Estate", freeLeads: 2 },
  property: { basePrice: 100, label: "Property", freeLeads: 2 },
  consulting: { basePrice: 15, label: "Consulting / Professional Services", freeLeads: 10 },
  general: { basePrice: 15, label: "General Business", freeLeads: 10 },
};

function getLeadPacks(basePrice: number, isSubscriber: boolean, hasStudio: boolean) {
  const discount = hasStudio ? 0.4 : isSubscriber ? 0.6 : 1;
  return [
    { leads: 10, price: Math.round(10 * basePrice * discount), originalPrice: 10 * basePrice },
    { leads: 25, price: Math.round(25 * basePrice * discount), originalPrice: 25 * basePrice },
    { leads: 50, price: Math.round(50 * basePrice * discount), originalPrice: 50 * basePrice, popular: true },
    { leads: 100, price: Math.round(100 * basePrice * discount), originalPrice: 100 * basePrice },
  ];
}

function getFreeLeads(baseFreeLeads: number, hasStudio: boolean) {
  return hasStudio ? baseFreeLeads * 3 : baseFreeLeads;
}

function GenerateControls({ onGenerate, userIndustry, isSubscriber, hasStudio }: {
  onGenerate: (opts: any) => void;
  userIndustry: string;
  isSubscriber: boolean;
  hasStudio: boolean;
}) {
  const pricing = INDUSTRY_PRICING[userIndustry] || INDUSTRY_PRICING.general;
  const packs = getLeadPacks(pricing.basePrice, isSubscriber, hasStudio);
  const freeLeads = getFreeLeads(pricing.freeLeads, hasStudio);

  const availableVerticals = useMemo(() => getVerticalsForIndustry(userIndustry), [userIndustry]);
  const verticalsByGroup = useMemo(() => {
    const map: Record<string, Vertical[]> = {};
    for (const v of availableVerticals) {
      (map[v.group] ??= []).push(v);
    }
    return map;
  }, [availableVerticals]);

  const [geo, setGeo] = useState("All States");
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>(() =>
    availableVerticals.slice(0, 2).map(v => v.id)
  );
  const [focuses, setFocuses] = useState<string[]>(["new_business"]);
  const [selectedPack, setSelectedPack] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Collect all sources for selected verticals + shared
  const activeSources = useMemo(() => {
    const sources = [...SHARED_SOURCES];
    const seenKeys = new Set(sources.map(s => s.key));
    for (const vId of selectedVerticals) {
      const vertical = VERTICALS.find(v => v.id === vId);
      if (vertical) {
        for (const src of vertical.sources) {
          if (!seenKeys.has(src.key)) {
            seenKeys.add(src.key);
            sources.push(src);
          }
        }
      }
    }
    return sources;
  }, [selectedVerticals]);

  const toggleVertical = (id: string) => {
    setSelectedVerticals(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const toggleFocus = (key: string) => {
    setFocuses(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter(f => f !== key);
      }
      return [...prev, key];
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const states = geo === "All States" ? [] : [geo];
      const settings: Record<string, string> = {
        states: states.join(", ") || "NY, CA, TX, FL",
        industries: pricing.label,
        keywords: `${pricing.label} leads`,
        entity_types: "LLC, Corp",
      };

      let totalFound = 0;
      const sourceNames: string[] = [];

      for (const focusKey of focuses) {
        const src = activeSources.find(s => s.key === focusKey);
        const source = src?.label || "Business Filings";
        sourceNames.push(source);
        try {
          const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
            body: { source, settings, enrich: true },
          });
          if (error) console.warn(`Scan error for ${source}:`, error.message);
          totalFound += data?.leads_found ?? 0;
        } catch (err: any) {
          console.warn(`Failed scanning ${source}:`, err.message);
        }
      }

      onGenerate({ geo, volume: selectedPack, focuses, leads_found: totalFound });
      if (totalFound > 0) {
        toast.success(`Found ${totalFound} new leads across ${sourceNames.join(", ")}`);
      } else {
        toast.info("No leads found this scan — try different focuses or geography");
      }
    } catch (err: any) {
      toast.error(err.message || "Lead generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lead-checkout", {
        body: { pack: selectedPack },
      });
      if (error) throw new Error(error.message);
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPackData = packs.find(p => p.leads === selectedPack);

  return (
    <div className="space-y-4">
      {/* Free leads banner */}
      {isSubscriber && (
        <Card className={hasStudio ? "border-orange-500/30 bg-orange-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className={`h-4 w-4 ${hasStudio ? "text-orange-500" : "text-emerald-500"}`} />
              <span className={`text-sm font-semibold ${hasStudio ? "text-orange-500" : "text-emerald-600"}`}>
                {hasStudio ? "Studio Member — 3× Free Monthly Leads" : "Free Monthly Leads"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasStudio
                ? <>As a Studio member, you get <span className="font-bold text-foreground">{freeLeads} free {pricing.label} leads</span> every month (3× the standard allotment) plus <span className="font-bold text-foreground">60% off</span> all purchased leads. Resets on the 1st.</>
                : <>As a Connect member, you get <span className="font-bold text-foreground">{freeLeads} free {pricing.label} leads</span> every month. Resets on the 1st.</>
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pricing tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            {pricing.label} Lead Packages
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Base price: ${pricing.basePrice}/lead • Enriched with full company & contact profiles
          </p>
          {isSubscriber ? (
             <Badge variant="outline" className={`text-[9px] mt-1 ${hasStudio ? "text-orange-500 border-orange-500/30" : "text-emerald-600 border-emerald-600/30"}`}>
               {hasStudio ? "🚀 Studio Member — 60% discount applied" : "🎉 Connect Member — 40% discount applied"}
             </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] mt-1 text-amber-600 border-amber-600/30">
              <Lock className="h-2.5 w-2.5 mr-1" /> Subscribe to Connect for 40% off + free monthly leads
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {packs.map((pack) => (
            <button
              key={pack.leads}
              onClick={() => setSelectedPack(pack.leads)}
              className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                selectedPack === pack.leads
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  selectedPack === pack.leads ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {pack.leads}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{pack.leads} Leads</span>
                    {pack.popular && <Badge className="text-[9px] px-1.5 py-0">Most Popular</Badge>}
                    {isSubscriber && <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${hasStudio ? "text-orange-500" : "text-emerald-600"}`}>{hasStudio ? "60% Off" : "40% Off"}</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    ${Math.round(pack.price / pack.leads)}/lead • Full enrichment
                  </span>
                </div>
              </div>
              <div className="text-right">
                {isSubscriber && (
                  <span className="text-[11px] text-muted-foreground line-through">${pack.originalPrice.toLocaleString()}</span>
                )}
                <span className="text-sm font-bold ml-1.5">${pack.price.toLocaleString()}</span>
              </div>
            </button>
          ))}
          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full gap-1.5 mt-2"
          >
            {purchasing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
            ) : (
              <>Purchase {selectedPack} Leads — ${selectedPackData?.price.toLocaleString()}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Specialization multi-select */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Specializations
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Select your verticals to see industry-specific lead sources
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(verticalsByGroup).map(([group, verts]) => (
            <div key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{group}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {verts.filter(v => selectedVerticals.includes(v.id)).length}/{verts.length}
                  </Badge>
                  {expandedGroups.has(group) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </button>
              {expandedGroups.has(group) && (
                <div className="grid grid-cols-2 gap-1.5 pb-2">
                  {verts.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVertical(v.id)}
                      className={`rounded-md border p-2 text-left text-[11px] font-medium transition-all ${
                        selectedVerticals.includes(v.id)
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/20"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">{selectedVerticals.length} specialization{selectedVerticals.length !== 1 ? "s" : ""} active</p>
        </CardContent>
      </Card>

      {/* Generate controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Targeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Geography</label>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {US_STATES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Focus Sources ({activeSources.length} available)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allKeys = activeSources.map(s => s.key);
                    setFocuses(prev => prev.length === allKeys.length ? [allKeys[0]] : allKeys);
                  }}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  {focuses.length === activeSources.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {activeSources.map(({ key, label, icon }) => {
                  const Icon = ICON_MAP[icon] || FileText;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFocus(key)}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                        focuses.includes(key)
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/20"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${focuses.includes(key) ? "text-primary" : ""}`} />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{focuses.length} source{focuses.length !== 1 ? "s" : ""} selected</p>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-1.5">
            {generating ? (
              <><Sparkles className="h-4 w-4 animate-pulse" /> Generating enriched leads…</>
            ) : (
              <><Zap className="h-4 w-4" /> Generate Leads</>
            )}
          </Button>
           <p className="text-[10px] text-muted-foreground text-center">
            Sourced from 70+ verified public databases including state licensing boards, OSHA, EPA, NOAA, NRCA, PHCC, SAM.gov, SBA, court records, and more. Enriched via Apollo, Hunter & PDL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FitScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-500 bg-emerald-500/10" : score >= 50 ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Target className="h-3 w-3" />{score}
    </span>
  );
}

function ResultsTable() {
  const isMobile = useIsMobile();
  const { data: leads, isLoading } = useEngineLeads();
  const updateLead = useUpdateEngineLead();
  const deleteLead = useDeleteEngineLead();
  const convertToPipeline = useConvertToPipeline();
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<EngineLead | null>(null);
  const [gameplanLead, setGameplanLead] = useState<EngineLead | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const handleEnrich = async (lead: EngineLead) => {
    setEnrichingId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: {
          company: lead.company,
          contact_name: lead.contact_name,
          email: lead.email,
          state: lead.state,
          industry: lead.industry,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const updates: Partial<EngineLead> = {};
      if (data?.email && !lead.email) updates.email = data.email;
      if (data?.phone && !lead.phone) updates.phone = data.phone;
      if (data?.contact_name && !lead.contact_name) updates.contact_name = data.contact_name;

      if (Object.keys(updates).length > 0) {
        await updateLead.mutateAsync({ id: lead.id, ...updates });
        toast.success(`Enriched ${lead.company} — found ${Object.keys(updates).join(", ")}`);
      } else {
        toast.info("No additional contact info found for this lead");
      }
    } catch (err: any) {
      toast.error(err.message || "Enrichment failed");
    } finally {
      setEnrichingId(null);
    }
  };

  const filtered = (leads || []).filter((l: EngineLead) => {
    const matchesSearch = !search ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.state?.toLowerCase().includes(search.toLowerCase()) ||
      l.industry?.toLowerCase().includes(search.toLowerCase());
    const s = l.score || 0;
    const matchesScore = scoreFilter === "all" ||
      (scoreFilter === "hot" && s >= 80) ||
      (scoreFilter === "warm" && s >= 50 && s < 80) ||
      (scoreFilter === "cold" && s < 50);
    return matchesSearch && matchesScore;
  });

  const allSelected = filtered.length > 0 && filtered.every((l: EngineLead) => selectedIds.has(l.id));
  const someSelected = filtered.some((l: EngineLead) => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l: EngineLead) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkConvert = () => {
    const toConvert = filtered.filter((l: EngineLead) => selectedIds.has(l.id) && l.status !== "converted");
    toConvert.forEach(lead => {
      convertToPipeline.mutate(lead);
    });
    toast.success(`Importing ${toConvert.length} leads to pipeline`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const toDelete = filtered.filter((l: EngineLead) => selectedIds.has(l.id));
    toDelete.forEach(lead => deleteLead.mutate(lead.id));
    toast.success(`Removed ${toDelete.length} leads`);
    setSelectedIds(new Set());
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (!leads?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No generated leads yet</p>
          <p className="text-xs text-muted-foreground">Select your targeting options and generate leads</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className={`flex ${isMobile ? "flex-col gap-2" : "items-center justify-between"}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Generated Leads ({filtered.length})
            </CardTitle>
            {isMobile && (
              <div className="flex items-center gap-1.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-border accent-primary cursor-pointer" />
                <span className="text-[10px] text-muted-foreground">All</span>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-2 ${isMobile ? "w-full" : ""}`}>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className={`h-8 text-xs ${isMobile ? "flex-1" : "w-[130px]"}`}>
                <SelectValue placeholder="All Scores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="hot">🔥 Hot (80+)</SelectItem>
                <SelectItem value="warm">🟡 Warm (50–79)</SelectItem>
                <SelectItem value="cold">🧊 Cold (&lt;50)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className={`pl-7 h-8 text-xs ${isMobile ? "w-full" : "w-[180px]"}`} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {someSelected && (
          <div className="flex items-center gap-2 flex-wrap rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="text-xs font-medium">{selectedIds.size} selected</span>
            <Button size="sm" className="h-6 text-[10px] gap-1" onClick={handleBulkConvert}>
              <ArrowUpRight className="h-3 w-3" /> Pipeline
            </Button>
            <Button size="sm" variant="destructive" className="h-6 text-[10px] gap-1" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3" /> Remove
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className={isMobile ? "px-3 pb-3" : "p-0"}>
        {isMobile ? (
          /* ── Mobile: Card-based layout ── */
          <div className="space-y-2">
            {filtered.map((lead: EngineLead) => (
              <div
                key={lead.id}
                className={`rounded-lg border p-3 space-y-2 transition-colors ${selectedIds.has(lead.id) ? "border-primary/40 bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0" onClick={() => setSelectedLead(lead)}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{lead.company}</p>
                      <FitScoreBadge score={lead.score || 0} />
                    </div>
                    {lead.industry && <p className="text-[11px] text-muted-foreground">{lead.industry}</p>}
                    {lead.state && <p className="text-[10px] text-muted-foreground">{lead.state}</p>}
                  </div>
                </div>
                {/* Contact info */}
                <div className="ml-6 space-y-1">
                  {lead.contact_name && <p className="text-xs font-medium">{lead.contact_name}</p>}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{lead.email}</span>
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />{lead.phone}
                    </a>
                  )}
                  {!lead.email && !lead.phone && !lead.contact_name && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={enrichingId === lead.id} onClick={() => handleEnrich(lead)}>
                      {enrichingId === lead.id ? <><RefreshCw className="h-3 w-3 animate-spin" /> Enriching…</> : <><Zap className="h-3 w-3" /> Find Contact</>}
                    </Button>
                  )}
                </div>
                {/* Actions row */}
                <div className="flex items-center justify-between ml-6">
                  <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGameplanLead(lead)}>
                      <Target className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 55%)" }} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLead(lead)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={lead.status === "converted"} onClick={() => {
                      convertToPipeline.mutate(lead, {
                        onSuccess: () => toast.success(`${lead.company} imported to pipeline!`),
                        onError: () => toast.error("Failed to import to pipeline"),
                      });
                    }}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { deleteLead.mutate(lead.id); toast.success("Removed"); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop: Table layout ── */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                </TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead: EngineLead) => (
                <TableRow key={lead.id} className={selectedIds.has(lead.id) ? "bg-primary/5" : ""}>
                  <TableCell className="py-2 w-8">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleOne(lead.id)} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="cursor-pointer group" onClick={() => setSelectedLead(lead)}>
                      <p className="text-xs font-medium group-hover:text-primary transition-colors">{lead.company}</p>
                      {lead.industry && <p className="text-[10px] text-muted-foreground">{lead.industry}</p>}
                      {lead.signal && <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[180px] truncate" title={lead.signal}>{lead.signal}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="space-y-0.5">
                      {lead.contact_name && <p className="text-xs font-medium">{lead.contact_name}</p>}
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          <Mail className="h-3 w-3" />{lead.email}
                        </a>
                      ) : null}
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{lead.phone}
                        </a>
                      ) : null}
                      {!lead.email && !lead.phone && !lead.contact_name && (
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" disabled={enrichingId === lead.id} onClick={(e) => { e.stopPropagation(); handleEnrich(lead); }}>
                          {enrichingId === lead.id ? <><RefreshCw className="h-3 w-3 animate-spin" /> Enriching…</> : <><Zap className="h-3 w-3" /> Find Contact</>}
                        </Button>
                      )}
                      {(lead.contact_name || lead.email || lead.phone) && !lead.email && (
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5 px-1 text-muted-foreground" disabled={enrichingId === lead.id} onClick={(e) => { e.stopPropagation(); handleEnrich(lead); }}>
                          {enrichingId === lead.id ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <><Zap className="h-2.5 w-2.5" /> Enrich</>}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">{lead.state || "—"}</TableCell>
                  <TableCell className="py-2"><FitScoreBadge score={lead.score || 0} /></TableCell>
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex items-center gap-1 justify-end">
                       <Button variant="ghost" size="icon" className="h-6 w-6" title="Sage Gameplan" onClick={() => setGameplanLead(lead)}>
                         <Target className="h-3 w-3" style={{ color: "hsl(140 12% 55%)" }} />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedLead(lead)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={lead.status === "converted"} onClick={(e) => {
                        e.stopPropagation();
                        convertToPipeline.mutate(lead, {
                          onSuccess: () => toast.success(`${lead.company} imported to pipeline!`),
                          onError: () => toast.error("Failed to import to pipeline"),
                        });
                      }}>
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { deleteLead.mutate(lead.id); toast.success("Removed"); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    {selectedLead && (
      <LeadOutreachPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
    )}
    {gameplanLead && (
      <SageGameplan lead={gameplanLead} onClose={() => setGameplanLead(null)} />
    )}
    </>
  );
}

export default function LeadGenerator() {
  const qc = useQueryClient();
  const { subscribed, hasStudio } = useSubscription();
  const [userIndustry, setUserIndustry] = useState<string>("general");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("industry")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.industry) setUserIndustry(profile.industry);
      }
      setLoading(false);
    })();
  }, []);

  const handleGenerate = (_opts: any) => {
    setTimeout(() => qc.invalidateQueries({ queryKey: ["engine-leads"] }), 1500);
    setTimeout(() => qc.invalidateQueries({ queryKey: ["engine-leads"] }), 4000);
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  const pricing = INDUSTRY_PRICING[userIndustry] || INDUSTRY_PRICING.general;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">AI-Powered {pricing.label} Lead Generation</p>
            <p className="text-xs text-muted-foreground">
              AURA sources and enriches leads tailored to your {pricing.label} industry from public web directories and data providers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <GenerateControls onGenerate={handleGenerate} userIndustry={userIndustry} isSubscriber={subscribed} hasStudio={hasStudio} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ResultsTable />
          <StudioLeadPromo />
        </div>
      </div>
    </div>
  );
}
