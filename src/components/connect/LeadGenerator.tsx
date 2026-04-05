import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import ClarkGameplan from "./ClarkGameplan";
import AuraAgentLeadPromo from "./AuraAgentLeadPromo";
import AuraAgentUpsellModal from "@/components/AuraAgentUpsellModal";
import { useStudioQualification } from "@/hooks/useStudioQualification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Rocket, MapPin, Target, Search,
  ArrowUpRight, Eye, Trash2, Zap,
  Sparkles, Users, TrendingUp,
  Mail, Phone, RefreshCw, Gift, Lock, ChevronDown, ChevronUp,
  Download, FileText, Building2, Globe, ArrowDownUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useEngineLeads, useUpdateEngineLead, useDeleteEngineLead, useConvertToPipeline,
  type EngineLead,
} from "@/hooks/useLeadEngine";
import {
  CONNECT_VERTICALS,
  getVerticalConfig,
  type ConnectSubVertical,
} from "@/lib/connect-verticals";

type LeadSourceIcon = "file" | "building" | "target" | "globe" | "zap" | "users" | "rocket" | "trending" | "map";
type ScanSource = "Reddit" | "Business Filings" | "Permit Database" | "LinkedIn" | "FEMA Flood Zones" | "NOAA Storm Events" | "Census / ACS Data" | "NHTSA Vehicles" | "OpenFEMA NFIP" | "HUD Housing Data" | "Property Records" | "Building Permits" | "Tax Delinquency" | "Google Trends" | "ATTOM Data" | "RentCast" | "Regrid Parcels" | "BatchData" | "FL Citizens Non-Renewal" | "State Socrata Portals" | "County ArcGIS" | "CT Property Transfers" | "NYC ACRIS" | "MassGIS Parcels" | "NJ MOD-IV / Sales" | "RI Coastal (FEMA)" | "Google Maps";

type DisplaySource = {
  key: string;
  label: string;
  icon: LeadSourceIcon;
  scanSource: ScanSource;
};

const DEFAULT_SCAN_SOURCES: DisplaySource[] = [
  { key: "google_maps", label: "Google Maps", icon: "map", scanSource: "Google Maps" },
  { key: "new_business", label: "Business Filings", icon: "file", scanSource: "Business Filings" },
  { key: "permits", label: "Permit Database", icon: "building", scanSource: "Permit Database" },
  { key: "linkedin", label: "LinkedIn", icon: "globe", scanSource: "LinkedIn" },
  { key: "social", label: "Reddit Signals", icon: "users", scanSource: "Reddit" },
];

const ICON_MAP: Record<LeadSourceIcon, any> = {
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

const cleanSearchLabel = (label: string) =>
  label
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*—.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const getAvailableConnectVerticals = (userIndustry: string, showAll = false) => {
  if (showAll) return CONNECT_VERTICALS;
  const current = getVerticalConfig(userIndustry);
  return current ? [current] : [];
};

/* ── Vertical-aware pricing lookup ── */
function getVerticalPricing(userIndustry: string): { basePrice: number; label: string; freeLeads: number; avgPremium: number } {
  const config = getVerticalConfig(userIndustry);
  if (config) {
    return {
      basePrice: config.pricing.basePrice,
      label: config.label,
      freeLeads: config.pricing.freeLeadsPerMonth,
      avgPremium: config.pricing.avgPremium,
    };
  }
  return { basePrice: 25, label: "General", freeLeads: 5, avgPremium: 5000 };
}

function getLeadPacks(basePrice: number, isSubscriber: boolean, hasAgent: boolean) {
  const discount = hasAgent ? 0.5 : isSubscriber ? 0.6 : 1;
  return [
    { leads: 10, price: Math.round(10 * basePrice * discount), originalPrice: 10 * basePrice },
    { leads: 25, price: Math.round(25 * basePrice * discount), originalPrice: 25 * basePrice },
    { leads: 50, price: Math.round(50 * basePrice * discount), originalPrice: 50 * basePrice, popular: true },
    { leads: 100, price: Math.round(100 * basePrice * discount), originalPrice: 100 * basePrice },
  ];
}

function getFreeLeads(baseFreeLeads: number, hasAgent: boolean) {
  return hasAgent ? baseFreeLeads * 2 : baseFreeLeads;
}

function GenerateControls({ onGenerate, userIndustry, isSubscriber, hasAgent, initialSpecializations, showAllVerticals, isMaster, userStates, userSubCategories }: {
  onGenerate: (opts: any) => void;
  userIndustry: string;
  isSubscriber: boolean;
  hasAgent: boolean;
  initialSpecializations?: string[] | null;
  showAllVerticals?: boolean;
  isMaster?: boolean;
  userStates?: string[] | null;
  userSubCategories?: string[] | null;
}) {
  const pricing = getVerticalPricing(userIndustry);
  const packs = getLeadPacks(pricing.basePrice, isSubscriber, hasAgent);
  const freeLeads = getFreeLeads(pricing.freeLeads, hasAgent);

  const availableVerticals = useMemo(() => {
    const allForIndustry = getAvailableConnectVerticals(userIndustry, !!showAllVerticals);
    if (!showAllVerticals || !userSubCategories?.length) return allForIndustry;

    const subSet = new Set(userSubCategories.map((s) => s.toLowerCase()));
    return allForIndustry.filter(
      (vertical) =>
        subSet.has(vertical.id.toLowerCase()) ||
        vertical.subVerticals.some((sub) => subSet.has(sub.id.toLowerCase())),
    );
  }, [userIndustry, showAllVerticals, userSubCategories]);

  const availableSpecializations = useMemo(
    () =>
      availableVerticals.flatMap((vertical) =>
        vertical.subVerticals.map((sub) => ({
          ...sub,
          group: vertical.label,
          verticalId: vertical.id,
        })),
      ),
    [availableVerticals],
  );

  const verticalsByGroup = useMemo(() => {
    const map: Record<string, Array<ConnectSubVertical & { group: string; verticalId: string }>> = {};
    for (const specialization of availableSpecializations) {
      (map[specialization.group] ??= []).push(specialization);
    }
    return map;
  }, [availableSpecializations]);

  const [geo, setGeo] = useState(() => {
    if (userStates?.length === 1) return userStates[0];
    return "All States";
  });
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>(() => {
    if (initialSpecializations?.length) {
      const valid = initialSpecializations.filter((id) => availableSpecializations.some((s) => s.id === id));
      if (valid.length > 0) return valid;
    }
    return availableSpecializations.slice(0, 2).map((s) => s.id);
  });
  const [focuses, setFocuses] = useState<string[]>([]);
  const [selectedPack, setSelectedPack] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(availableVerticals.map((v) => v.label)));

  useEffect(() => {
    setSelectedVerticals((prev) => {
      const valid = prev.filter((id) => availableSpecializations.some((s) => s.id === id));
      if (valid.length > 0) return valid;
      return availableSpecializations.slice(0, 2).map((s) => s.id);
    });
  }, [availableSpecializations]);


  const activeSources = useMemo(() => {
    const sources = [...DEFAULT_SCAN_SOURCES];
    const seenKeys = new Set(sources.map((s) => s.key));

    const toDisplaySource = (key: string): DisplaySource => {
      const normalized = key.toLowerCase();
      if (normalized.includes("google")) return { key, label: "Google Maps", icon: "map", scanSource: "Google Maps" };
      if (normalized.includes("linkedin")) return { key, label: "LinkedIn", icon: "globe", scanSource: "LinkedIn" };
      if (normalized.includes("reddit") || normalized.includes("social") || normalized.includes("devi") || normalized.includes("f5bot")) {
        return { key, label: "Reddit Signals", icon: "users", scanSource: "Reddit" };
      }
      if (normalized.includes("storm") || normalized.includes("hail") || normalized.includes("hurricane") || normalized.includes("noaa")) {
        return { key, label: "NOAA Storm Events", icon: "zap", scanSource: "NOAA Storm Events" };
      }
      if (normalized.includes("fema") || normalized.includes("flood")) {
        return { key, label: "FEMA Flood Zones", icon: "zap", scanSource: "FEMA Flood Zones" };
      }
      if (normalized.includes("property") || normalized.includes("deed") || normalized.includes("mortgage") || normalized.includes("recorder") || normalized.includes("assessor")) {
        return { key, label: "Property Records", icon: "building", scanSource: "Property Records" };
      }
      if (normalized.includes("permit") || normalized.includes("inspection") || normalized.includes("license") || normalized.includes("licensing") || normalized.includes("abc") || normalized.includes("ttb") || normalized.includes("health") || normalized.includes("osha")) {
        return { key, label: "Permit Database", icon: "building", scanSource: "Permit Database" };
      }
      return { key, label: "Business Filings", icon: "file", scanSource: "Business Filings" };
    };

    for (const specializationId of selectedVerticals) {
      const specialization = availableSpecializations.find((s) => s.id === specializationId);
      for (const sourceKey of specialization?.sources || []) {
        const source = toDisplaySource(sourceKey);
        if (!seenKeys.has(source.key)) {
          seenKeys.add(source.key);
          sources.push(source);
        }
      }
    }

    return sources;
  }, [selectedVerticals, availableSpecializations]);

  // Always select all focus sources by default and when sources change
  useEffect(() => {
    setFocuses(activeSources.map(s => s.key));
  }, [activeSources]);

  const verticalSearchTerms = useMemo(() => {
    const terms = selectedVerticals
      .map((id) => availableSpecializations.find((s) => s.id === id)?.label)
      .filter(Boolean)
      .map((label) => cleanSearchLabel(label!));

    if (terms.length === 0) terms.push(pricing.label);
    return terms;
  }, [selectedVerticals, availableSpecializations, pricing.label]);

  const toggleVertical = useCallback((id: string) => {
    setSelectedVerticals(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      // Persist to profile (fire-and-forget)
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ specializations: next } as any).eq("user_id", user.id);
        }
      })();
      return next;
    });
  }, []);

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
    setGenProgress(0);
    setGenStep("Initializing scan…");
    try {
      const states = geo === "All States" 
        ? (userStates?.length ? userStates : []) 
        : [geo];
      const settings: Record<string, string> = {
        states: states.join(", ") || "NY, CA, TX, FL",
        industries: verticalSearchTerms.join(", "),
        keywords: `${verticalSearchTerms[0] || pricing.label} leads`,
        entity_types: "LLC, Corp",
      };

      let totalFound = 0;
      const sourceNames: string[] = [];
      const batchIds: string[] = [];
      const totalSources = focuses.length;
      const basePerSource = 70 / totalSources;

      // Simulate initial ramp
      setGenProgress(5);
      setGenStep("Connecting to databases…");
      await new Promise(r => setTimeout(r, 600));
      setGenProgress(10);

      // Always run Google Maps first for reliable results
      const googleMapsSource = "Google Maps";
      setGenStep(`Scanning businesses on Google Maps…`);
      setGenProgress(10);
      try {
        const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
          body: { source: googleMapsSource, settings, enrich: true },
        });
        if (error) console.warn(`Scan error for Google Maps:`, error.message);
        totalFound += data?.leads_found ?? 0;
        if (data?.batch_id) batchIds.push(data.batch_id);
        sourceNames.push(googleMapsSource);
      } catch (err: any) {
        console.warn(`Failed scanning Google Maps:`, err.message);
      }
      setGenProgress(50);

      // Then run additional focus sources
      for (let i = 0; i < focuses.length; i++) {
        const focusKey = focuses[i];
        const src = activeSources.find(s => s.key === focusKey);
        const source = src?.label || "Business Filings";
        if (source === googleMapsSource) continue;
        sourceNames.push(source);
        setGenStep(`Scanning ${source}…`);
        setGenProgress(50 + Math.round(30 * (i / focuses.length)));
        try {
          const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
            body: { source, settings, enrich: true },
          });
          if (error) console.warn(`Scan error for ${source}:`, error.message);
          totalFound += data?.leads_found ?? 0;
          if (data?.batch_id) batchIds.push(data.batch_id);
        } catch (err: any) {
          console.warn(`Failed scanning ${source}:`, err.message);
        }
      }

      setGenProgress(80);
      setGenStep("Enriching contacts…");
      await new Promise(r => setTimeout(r, 800));
      setGenProgress(90);
      setGenStep("Scoring & deduplicating…");
      await new Promise(r => setTimeout(r, 500));
      setGenProgress(100);
      setGenStep("Complete!");

      onGenerate({ geo, volume: selectedPack, focuses, leads_found: totalFound, batch_ids: batchIds });
      if (totalFound > 0) {
        toast.success(`Found ${totalFound} new leads across ${sourceNames.join(", ")}`);
      } else {
        toast.info("No leads found this scan — try different focuses or geography");
      }
    } catch (err: any) {
      toast.error(err.message || "Lead generation failed");
    } finally {
      await new Promise(r => setTimeout(r, 600));
      setGenerating(false);
      setGenProgress(0);
      setGenStep("");
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    setGenProgress(0);
    setGenStep("Initializing purchased scan…");
    try {
      const states = geo === "All States" 
        ? (userStates?.length ? userStates : []) 
        : [geo];
      const settings: Record<string, string> = {
        states: states.join(", ") || "NY, CA, TX, FL",
        industries: verticalSearchTerms.join(", "),
        keywords: `${verticalSearchTerms[0] || pricing.label} leads`,
        entity_types: "LLC, Corp",
      };

      let totalFound = 0;
      const sourceNames: string[] = [];
      const batchIds: string[] = [];
      const totalSources = focuses.length;
      const basePerSource = 70 / totalSources;

      setGenProgress(5);
      setGenStep("Connecting to databases…");
      await new Promise(r => setTimeout(r, 600));
      setGenProgress(10);

      // Always run Google Maps first for reliable results
      const googleMapsSource = "Google Maps";
      setGenStep(`Scanning businesses on Google Maps…`);
      setGenProgress(10);
      try {
        const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
          body: { source: googleMapsSource, settings, enrich: true },
        });
        if (error) console.warn(`Scan error for Google Maps:`, error.message);
        totalFound += data?.leads_found ?? 0;
        if (data?.batch_id) batchIds.push(data.batch_id);
        sourceNames.push(googleMapsSource);
      } catch (err: any) {
        console.warn(`Failed scanning Google Maps:`, err.message);
      }
      setGenProgress(50);

      // Then run additional focus sources
      for (let i = 0; i < focuses.length; i++) {
        const focusKey = focuses[i];
        const src = activeSources.find(s => s.key === focusKey);
        const source = src?.label || "Business Filings";
        if (source === googleMapsSource) continue; // already ran
        sourceNames.push(source);
        setGenStep(`Scanning ${source}…`);
        setGenProgress(50 + Math.round(30 * (i / focuses.length)));
        try {
          const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
            body: { source, settings, enrich: true },
          });
          if (error) console.warn(`Scan error for ${source}:`, error.message);
          totalFound += data?.leads_found ?? 0;
          if (data?.batch_id) batchIds.push(data.batch_id);
        } catch (err: any) {
          console.warn(`Failed scanning ${source}:`, err.message);
        }
      }

      setGenProgress(80);
      setGenStep("Enriching contacts…");
      await new Promise(r => setTimeout(r, 800));
      setGenProgress(90);
      setGenStep("Scoring & deduplicating…");
      await new Promise(r => setTimeout(r, 500));
      setGenProgress(100);
      setGenStep("Complete!");

      onGenerate({ geo, volume: selectedPack, focuses, leads_found: totalFound, batch_ids: batchIds });
      if (totalFound > 0) {
        toast.success(`Found ${totalFound} new leads across ${sourceNames.join(", ")}`);
      } else {
        toast.info("No leads found this scan — try different focuses or geography");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process purchase");
    } finally {
      await new Promise(r => setTimeout(r, 600));
      setPurchasing(false);
      setGenProgress(0);
      setGenStep("");
    }
  };

  const selectedPackData = packs.find(p => p.leads === selectedPack);

  return (
    <div className="space-y-4">
      {/* Free leads banner */}
      {isSubscriber && (
        <Card className={hasAgent ? "border-orange-500/30 bg-orange-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className={`h-4 w-4 ${hasAgent ? "text-orange-500" : "text-emerald-500"}`} />
              <span className={`text-sm font-semibold ${hasAgent ? "text-orange-500" : "text-emerald-600"}`}>
                {hasAgent ? "Agent Member — 3× Free Monthly Leads" : "Free Monthly Leads"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasAgent
                ? <>As a Studio member, you get <span className="font-bold text-foreground">{freeLeads} free {pricing.label} leads</span> every month (2× the standard allotment) plus <span className="font-bold text-foreground">50% off</span> all purchased leads. Resets on the 1st.</>
                : <>As a Connect member, you get <span className="font-bold text-foreground">{freeLeads} free {pricing.label} leads</span> every month. Resets on the 1st.</>
              }
            </p>
          </CardContent>
        </Card>
      )}


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
          <p className="text-[10px] text-muted-foreground">
            {selectedVerticals.length} specialization{selectedVerticals.length !== 1 ? "s" : ""} active
            {selectedVerticals.length > 0 && ` — ${availableVerticals.filter(v => selectedVerticals.includes(v.id)).map(v => v.label).slice(0, 3).join(", ")}${selectedVerticals.length > 3 ? ` +${selectedVerticals.length - 3} more` : ""}`}
          </p>
        </CardContent>
      </Card>

      {/* Targeting — master only */}
      {isMaster && (
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
          </CardContent>
        </Card>
      )}

      {/* State filter — non-master users */}
      {!isMaster && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Geography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={geo} onValueChange={setGeo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
              </SelectContent>
            </Select>
            {userStates?.length ? (
              <p className="text-[10px] text-muted-foreground mt-2">
                Your states: {userStates.join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Generate — master only */}
      {isMaster && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {generating ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                    {genStep}
                  </span>
                  <span className="font-medium text-foreground">{genProgress}%</span>
                </div>
                <Progress value={genProgress} className="h-2" />
                <p className="text-[10px] text-muted-foreground text-center">
                  Estimated time: ~{Math.max(5, Math.round((100 - genProgress) * 0.4))}s remaining
                </p>
              </div>
            ) : (
              <Button onClick={handleGenerate} className="w-full gap-1.5" size="lg">
                <Zap className="h-4 w-4" /> Generate Free Leads
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground text-center">
              Sourced from 70+ verified public databases including state licensing boards, OSHA, EPA, NOAA, NRCA, PHCC, SAM.gov, SBA, court records, and more. Enriched via Apollo, Hunter & PDL.
            </p>
          </CardContent>
        </Card>
      )}
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

function ResultsTable({ latestBatchId, onPurchaseLeads, greyedOut }: { latestBatchId: string | null; onPurchaseLeads?: (count: number, leadIds: string[]) => void; greyedOut?: boolean }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: leads, isLoading } = useEngineLeads();
  const updateLead = useUpdateEngineLead();
  const deleteLead = useDeleteEngineLead();
  const convertToPipeline = useConvertToPipeline();
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [contactFilter, setContactFilter] = useState<string>("has_contact");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [gameplanLead, setGameplanLead] = useState<EngineLead | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sortByScore, setSortByScore] = useState<"asc" | "desc" | null>(null);

  const exportLeads = (format: "excel" | "emails" | "phones") => {
    const data = filtered.length ? filtered : (leads || []);
    if (!data.length) { toast.info("No leads to export"); return; }

    if (format === "emails") {
      const emails = data.filter((l: EngineLead) => l.email).map((l: EngineLead) => l.email);
      if (!emails.length) { toast.info("No emails found"); return; }
      const blob = new Blob([emails.join("\n")], { type: "text/plain" });
      downloadBlob(blob, "lead-emails.txt");
      toast.success(`Exported ${emails.length} emails`);
      return;
    }

    if (format === "phones") {
      const phones = data.filter((l: EngineLead) => l.phone).map((l: EngineLead) => `${l.company},${l.contact_name || ""},${l.phone}`);
      if (!phones.length) { toast.info("No phone numbers found"); return; }
      const blob = new Blob(["Company,Contact,Phone\n" + phones.join("\n")], { type: "text/csv" });
      downloadBlob(blob, "lead-phones.csv");
      toast.success(`Exported ${phones.length} phone numbers`);
      return;
    }

    // Excel/CSV export
    const header = "Company,Contact,Email,Phone,State,Industry,Score,Status,Signal";
    const rows = data.map((l: EngineLead) =>
      [l.company, l.contact_name || "", l.email || "", l.phone || "", l.state || "", l.industry || "", l.score || 0, l.status, (l.signal || "").replace(/,/g, ";")]
        .map(v => `"${v}"`).join(",")
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    downloadBlob(blob, "leads-export.csv");
    toast.success(`Exported ${data.length} leads`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleBulkEnrich = async () => {
    const unenriched = (leads || []).filter((l: EngineLead) => !l.email && !l.phone);
    if (unenriched.length === 0) { toast.info("All leads already have contact info"); return; }
    setEnrichingAll(true);
    let enriched = 0;
    for (const lead of unenriched.slice(0, 10)) {
      try {
        const { data } = await supabase.functions.invoke("enrich-lead", {
          body: { company: lead.company, contact_name: lead.contact_name, email: lead.email, state: lead.state, industry: lead.industry },
        });
        const updates: Partial<EngineLead> = {};
        if (data?.email) updates.email = data.email;
        if (data?.phone) updates.phone = data.phone;
        if (data?.contact_name && !lead.contact_name) updates.contact_name = data.contact_name;
        if (Object.keys(updates).length > 0) {
          await updateLead.mutateAsync({ id: lead.id, ...updates });
          enriched++;
        }
      } catch { /* skip */ }
    }
    toast.success(`Enriched ${enriched}/${unenriched.slice(0, 10).length} leads with contact info`);
    setEnrichingAll(false);
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
    const hasContact = !!(l.email || l.phone);
    const matchesContact = contactFilter === "all" ||
      (contactFilter === "has_contact" && hasContact) ||
      (contactFilter === "no_contact" && !hasContact);
    return matchesSearch && matchesScore && matchesContact;
  });

  // Sort by score if active
  const sortedFiltered = sortByScore
    ? [...filtered].sort((a, b) => sortByScore === "desc" ? (b.score || 0) - (a.score || 0) : (a.score || 0) - (b.score || 0))
    : filtered;

  // Separate latest batch from previous leads
  const latestLeads = latestBatchId ? sortedFiltered.filter(l => l.batch_id === latestBatchId) : [];
  const previousLeads = latestBatchId ? sortedFiltered.filter(l => l.batch_id !== latestBatchId) : sortedFiltered;

  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every((l: EngineLead) => selectedIds.has(l.id));
  const someSelected = sortedFiltered.some((l: EngineLead) => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedFiltered.map((l: EngineLead) => l.id)));
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
    const toConvert = sortedFiltered.filter((l: EngineLead) => selectedIds.has(l.id) && l.status !== "converted");
    toConvert.forEach(lead => {
      convertToPipeline.mutate(lead);
    });
    toast.success(`Importing ${toConvert.length} leads to pipeline`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const toDelete = sortedFiltered.filter((l: EngineLead) => selectedIds.has(l.id));
    toDelete.forEach(lead => deleteLead.mutate(lead.id));
    toast.success(`Removed ${toDelete.length} leads`);
    setSelectedIds(new Set());
  };

  const toggleScoreSort = () => {
    setSortByScore(prev => prev === null ? "desc" : prev === "desc" ? "asc" : null);
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
    <Card className={greyedOut ? "opacity-50 pointer-events-none select-none" : ""}>
      <CardHeader className="pb-3 space-y-3">
        <div className={`flex ${isMobile ? "flex-col gap-2" : "items-center justify-between"}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Generated Leads ({filtered.length})
              {latestLeads.length > 0 && (
                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/30 ml-1">
                  {latestLeads.length} new
                </Badge>
              )}
            </CardTitle>
            {isMobile && (
              <div className="flex items-center gap-1.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-border accent-primary cursor-pointer" />
                <span className="text-[10px] text-muted-foreground">All</span>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-2 ${isMobile ? "w-full flex-wrap" : ""}`}>
            <Select value={contactFilter} onValueChange={setContactFilter}>
              <SelectTrigger className={`h-8 text-xs ${isMobile ? "flex-1" : "w-[150px]"}`}>
                <SelectValue placeholder="Contact Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="has_contact">📧 Has Contact</SelectItem>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="no_contact">❌ No Contact</SelectItem>
              </SelectContent>
            </Select>
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
            {(leads || []).some((l: EngineLead) => !l.email && !l.phone) && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0" disabled={enrichingAll} onClick={handleBulkEnrich}>
                {enrichingAll ? <><RefreshCw className="h-3 w-3 animate-spin" /> Enriching…</> : <><Zap className="h-3 w-3" /> Enrich All</>}
              </Button>
            )}
            {/* Export dropdown */}
            <div className="relative group shrink-0">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Download className="h-3 w-3" /> Export
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 hidden group-hover:block min-w-[160px]">
                <button onClick={() => exportLeads("excel")} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors rounded-t-lg">📊 Export as CSV</button>
                <button onClick={() => exportLeads("emails")} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">📧 Email list (.txt)</button>
                <button onClick={() => exportLeads("phones")} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors rounded-b-lg">📞 Phone list (.csv)</button>
              </div>
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
        {(() => {
          const INITIAL_COUNT = 10;
          // Combine: latest batch first, then previous
          const orderedLeads = [...latestLeads, ...previousLeads];
          const displayLeads = showAll ? orderedLeads : orderedLeads.slice(0, INITIAL_COUNT);
          const hiddenCount = orderedLeads.length - INITIAL_COUNT;
          const showMoreButton = !showAll && hiddenCount > 0 && (
            <div className="flex justify-center py-3">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAll(true)}>
                <ChevronDown className="h-3 w-3" /> Show {hiddenCount} more lead{hiddenCount !== 1 ? "s" : ""}
              </Button>
            </div>
          );
          const showLessButton = showAll && orderedLeads.length > INITIAL_COUNT && (
            <div className="flex justify-center py-3">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAll(false)}>
                <ChevronUp className="h-3 w-3" /> Show less
              </Button>
            </div>
          );

          const isNewLead = (lead: EngineLead) => latestBatchId && lead.batch_id === latestBatchId;

          return isMobile ? (
            /* ── Mobile: Card-based layout ── */
            <div className="space-y-2">
              {displayLeads.map((lead: EngineLead, idx: number) => {
                // Show "Previous Generated Leads" divider
                const isFirstPrevious = latestBatchId && latestLeads.length > 0 && lead.batch_id !== latestBatchId && (idx === 0 || displayLeads[idx - 1]?.batch_id === latestBatchId);
                return (
                  <div key={lead.id}>
                    {isFirstPrevious && (
                      <div className="flex items-center gap-2 py-3 mt-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Previous Generated Leads</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <div
                  key={lead.id}
                  className={`rounded-lg border p-3 space-y-2 transition-all animate-fade-in ${selectedIds.has(lead.id) ? "border-primary/40 bg-primary/5" : "border-border"}`}
                  style={{ animationDelay: `${(displayLeads.indexOf(lead)) * 60}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/connect/leads/${lead.id}`)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{lead.company}</p>
                            {isNewLead(lead) && <Badge className="text-[8px] px-1.5 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/30">NEW</Badge>}
                          </div>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/connect/leads/${lead.id}`)}>
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
                  </div>
                );
              })}
              {showMoreButton}
              {showLessButton}
            </div>
          ) : (
            /* ── Desktop: Table layout ── */
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                    </TableHead>
                    <TableHead className="text-xs">Company</TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">State</TableHead>
                    <TableHead className="text-xs cursor-pointer select-none hover:text-primary transition-colors" onClick={toggleScoreSort}>
                      <span className="flex items-center gap-1">
                        Score
                        <ArrowDownUp className={`h-3 w-3 ${sortByScore ? "text-primary" : "text-muted-foreground/50"}`} />
                        {sortByScore === "desc" && <span className="text-[9px]">↓</span>}
                        {sortByScore === "asc" && <span className="text-[9px]">↑</span>}
                      </span>
                    </TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLeads.map((lead: EngineLead, idx: number) => {
                    const isFirstPrevious = latestBatchId && latestLeads.length > 0 && lead.batch_id !== latestBatchId && (idx === 0 || displayLeads[idx - 1]?.batch_id === latestBatchId);
                    return (
                      <Fragment key={lead.id}>
                        {isFirstPrevious && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Previous Generated Leads</span>
                                <div className="h-px flex-1 bg-border" />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className={`animate-fade-in ${selectedIds.has(lead.id) ? "bg-primary/5" : ""}`} style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}>
                      <TableCell className="py-2 w-8">
                        <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleOne(lead.id)} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="cursor-pointer group" onClick={() => navigate(`/connect/leads/${lead.id}`)}>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium group-hover:text-primary transition-colors">{lead.company}</p>
                            {isNewLead(lead) && <Badge className="text-[8px] px-1.5 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/30">NEW</Badge>}
                          </div>
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
                           <Button variant="ghost" size="icon" className="h-6 w-6" title="Clark Gameplan" onClick={() => setGameplanLead(lead)}>
                             <Target className="h-3 w-3" style={{ color: "hsl(140 12% 55%)" }} />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/connect/leads/${lead.id}`)}>
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
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {showMoreButton}
              {showLessButton}
            </>
          );
        })()}
      </CardContent>
    </Card>

    {/* Lead detail is now a separate page at /connect/leads/:id */}
    {gameplanLead && (
      <ClarkGameplan lead={gameplanLead} onClose={() => setGameplanLead(null)} />
    )}
    </>
  );
}

/* ── Purchase prompt shown after lead generation ── */
function PurchasePrompt({ leads, userIndustry, isSubscriber, hasAgent, onPurchase, onDecline }: {
  leads: EngineLead[];
  userIndustry: string;
  isSubscriber: boolean;
  hasAgent: boolean;
  onPurchase: (count: number) => void;
  onDecline: () => void;
}) {
  const pricing = getVerticalPricing(userIndustry);
  const discount = hasAgent ? 0.5 : isSubscriber ? 0.6 : 1;
  const totalLeads = leads.length;
  
  const packOptions = [1, 5, 10, 25].filter(n => n <= totalLeads);
  if (!packOptions.includes(totalLeads)) packOptions.push(totalLeads);

  const getPrice = (count: number) => Math.round(count * pricing.basePrice * discount);

  return (
    <Card className="animate-fade-in border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {totalLeads} Leads Generated — Claim Yours
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Select how many leads to purchase. Unclaimed leads will be available to other users.
        </p>
        {isSubscriber && (
          <Badge variant="outline" className={`text-[9px] mt-1 w-fit ${hasAgent ? "text-orange-500 border-orange-500/30" : "text-emerald-600 border-emerald-600/30"}`}>
            {hasAgent ? "🚀 Agent — 50% discount" : "🎉 Connect — 40% discount"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {packOptions.map(count => (
          <button
            key={count}
            onClick={() => onPurchase(count)}
            className="w-full flex items-center justify-between rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 p-3 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                {count}
              </div>
              <div>
                <span className="text-sm font-semibold">
                  {count === totalLeads ? `All ${count} Leads` : `${count} Lead${count !== 1 ? "s" : ""}`}
                </span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  ${Math.round(getPrice(count) / count)}/lead
                </span>
              </div>
            </div>
            <span className="text-sm font-bold">${getPrice(count).toLocaleString()}</span>
          </button>
        ))}
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-1" onClick={onDecline}>
          No thanks — skip for now
        </Button>
      </CardContent>
    </Card>
  );
}

const MASTER_EMAILS = ["shane@houseofthor.com", "dwenz17@gmail.com"];

export default function LeadGenerator() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { subscribed, hasAgent } = useSubscription();
  const [userIndustry, setUserIndustry] = useState<string>("general");
  const [userSpecializations, setUserSpecializations] = useState<string[] | null>(null);
  const [userStates, setUserStates] = useState<string[] | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showAgentDrip, setShowAgentDrip] = useState(false);
  const [latestBatchId, setLatestBatchId] = useState<string | null>(null);
  const [purchaseDismissed, setPurchaseDismissed] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem("lead-tip-dismissed") === "true"; } catch { return false; }
  });
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(() => {
    try { const v = localStorage.getItem("lead-last-generated"); return v ? parseInt(v) : null; } catch { return null; }
  });
  const { data: studioQual } = useStudioQualification();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsMaster(MASTER_EMAILS.includes(user.email?.toLowerCase() ?? ""));
        const { data: profile } = await supabase
          .from("profiles")
          .select("industry, specializations")
          .eq("user_id", user.id)
          .maybeSingle();
        const connectVertical = (profile as any)?.connect_vertical;
        if (connectVertical) {
          setUserIndustry(connectVertical);
        } else if (profile?.industry) {
          setUserIndustry(profile.industry);
        }
        if ((profile as any)?.specializations?.length) {
          setUserSpecializations((profile as any).specializations);
        }
        if ((profile as any)?.states_of_operation?.length) {
          setUserStates((profile as any).states_of_operation);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Check if leads already exist (so we know they've generated before)
  const { data: existingLeads } = useEngineLeads();
  useEffect(() => {
    if (existingLeads?.length) setHasGenerated(true);
  }, [existingLeads]);

  // Drip Aura Agent upsell popup for qualified non-Agent users
  useEffect(() => {
    if (!studioQual?.qualified || hasAgent) return;
    const dismissed = sessionStorage.getItem("agent-drip-dismissed");
    if (dismissed) return;
    const timer = setTimeout(() => setShowAgentDrip(true), 8000);
    return () => clearTimeout(timer);
  }, [studioQual?.qualified, hasAgent]);

  const handleGenerate = (opts: any) => {
    setHasGenerated(true);
    if (opts?.batch_ids?.length) {
      setLatestBatchId(opts.batch_ids[opts.batch_ids.length - 1]);
    }
    if (opts?.leads_found > 0) {
      setPurchaseDismissed(false);
      const now = Date.now();
      setLastGeneratedAt(now);
      try { localStorage.setItem("lead-last-generated", String(now)); } catch {}
    }
    qc.invalidateQueries({ queryKey: ["engine-leads"] });
    qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
    qc.invalidateQueries({ queryKey: ["engine-kpis"] });
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
      qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
    }, 5000);
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
    }, 12000);
  };

  const handlePurchaseLeads = async (count: number) => {
    // In test mode: just claim the leads (no Stripe charge)
    // The leads stay in engine_leads for the user; we don't need to move them
    toast.success(`${count} lead${count !== 1 ? "s" : ""} claimed! They're yours to work.`);
    setPurchaseDismissed(true);
  };

  const handleDeclinePurchase = async () => {
    // Move all latest-batch leads to unreached_leads pool for admin/other users
    if (latestBatchId && existingLeads?.length) {
      const batchLeads = existingLeads.filter(l => l.batch_id === latestBatchId);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && batchLeads.length > 0) {
        const unreachedRows = batchLeads.map(l => ({
          engine_lead_id: l.id,
          company: l.company,
          contact_name: l.contact_name,
          email: l.email,
          phone: l.phone,
          state: l.state,
          industry: l.industry,
          est_premium: l.est_premium || 0,
          signal: l.signal,
          source: l.source,
          source_url: l.source_url,
          score: l.score || 0,
          original_owner_id: user.id,
          original_batch_id: l.batch_id,
          vertical: userIndustry,
          specializations: userSpecializations || [],
        }));
        
        await supabase.from("unreached_leads").insert(unreachedRows as any);
        
        // Remove from user's engine_leads
        for (const l of batchLeads) {
          await supabase.from("engine_leads").delete().eq("id", l.id);
        }
        qc.invalidateQueries({ queryKey: ["engine-leads"] });
        toast.info(`${batchLeads.length} leads released to the marketplace`);
      }
    }
    setPurchaseDismissed(true);
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  const pricing = getVerticalPricing(userIndustry);
  const showPromo = !hasAgent && studioQual?.qualified;
  const newLeads = existingLeads?.filter(l => l.status === "new") ?? [];
  const showPurchasePrompt = !purchaseDismissed && newLeads.length > 0;

  const handleDismissTip = () => {
    setTipDismissed(true);
    try { localStorage.setItem("lead-tip-dismissed", "true"); } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Dismissible AI tip */}
      {!tipDismissed && (
        <div className="rounded-lg border bg-muted/30 p-4 relative">
          <button
            onClick={handleDismissTip}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">AI-Powered {pricing.label} Lead Generation</p>
              <p className="text-xs text-muted-foreground">
                AURA sources and enriches leads tailored to your {pricing.label} industry from public web directories and data providers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Generate Leads Toolbar ═══ */}
      <GenerateControls
        onGenerate={handleGenerate}
        userIndustry={userIndustry}
        isSubscriber={subscribed}
        hasAgent={hasAgent}
        initialSpecializations={userSpecializations}
        showAllVerticals={isMaster}
        isMaster={isMaster}
        userStates={userStates}
        userSubCategories={userSpecializations}
      />

      {/* Post-generation purchase prompt — shown at top full width */}
      {showPurchasePrompt && (
        <PurchasePrompt
          leads={newLeads}
          userIndustry={userIndustry}
          isSubscriber={subscribed}
          hasAgent={hasAgent}
          onPurchase={handlePurchaseLeads}
          onDecline={handleDeclinePurchase}
        />
      )}

      {/* Results — fully blurred if unpurchased */}
      <ResultsTable latestBatchId={latestBatchId} greyedOut={showPurchasePrompt} />
      {showPromo && <AuraAgentLeadPromo />}

      {showAgentDrip && (
        <AuraAgentUpsellModal
          open={showAgentDrip}
          onClose={() => {
            setShowAgentDrip(false);
            sessionStorage.setItem("agent-drip-dismissed", "true");
          }}
          isConnectSubscriber={subscribed}
        />
      )}
    </div>
  );
}
