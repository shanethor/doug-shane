import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Radar, Flame, Thermometer, Sprout, TrendingUp, Phone, Mail,
  Linkedin, MessageSquare, Globe, FileText, Clock, Eye, UserPlus,
  ArrowRight, Zap, Settings, AlertCircle, CheckCircle2, Target,
  Building2, MapPin, DollarSign, CalendarClock, Search, Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ── Mock Data (will be replaced with live data) ── */
const TIER_SUMMARY = [
  { label: "Hot", tier: 1, count: 12, icon: Flame, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Warm", tier: 2, count: 34, icon: Thermometer, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Nurture", tier: 3, count: 87, icon: Sprout, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

type MockLead = {
  id: string;
  company: string;
  state: string;
  industry: string;
  estPremium: string;
  signal: string;
  source: string;
  score: number;
  detectedAgo: string;
  assignedTo: string;
  action: string;
};

const HOT_LEADS: MockLead[] = [
  {
    id: "1",
    company: "Bright Line Electric",
    state: "CT",
    industry: "Electrical Contractor",
    estPremium: "$45K",
    signal: '"Need GL + WC quotes by Friday"',
    source: "LinkedIn",
    score: 94,
    detectedAgo: "2 hours ago",
    assignedTo: "Mike Patterson",
    action: "Call by 3pm today",
  },
  {
    id: "2",
    company: "Metro Dental Group",
    state: "NY",
    industry: "Healthcare",
    estPremium: "$28K",
    signal: "Renewal in 42 days · Current: Travelers",
    source: "Renewal Intercept",
    score: 87,
    detectedAgo: "6 hours ago",
    assignedTo: "Sarah Chen",
    action: "Email sent, awaiting response",
  },
  {
    id: "3",
    company: "Hudson Valley Plumbing",
    state: "NY",
    industry: "Plumbing Contractor",
    estPremium: "$32K",
    signal: '"Switching insurance agents — need commercial auto"',
    source: "Reddit",
    score: 82,
    detectedAgo: "4 hours ago",
    assignedTo: "Tom Williams",
    action: "Send intro email",
  },
];

const RECENT_ACTIVITY = [
  { icon: Linkedin, text: "3 new LinkedIn signals detected", time: "last hour", color: "text-blue-500" },
  { icon: Mail, text: "5 renewal intercept emails sent", time: "today", color: "text-primary" },
  { icon: FileText, text: "2 BOR letters executed", time: "this week", color: "text-emerald-500" },
  { icon: Building2, text: "12 new business filings added to nurture", time: "this week", color: "text-amber-500" },
];

const MONITORING = [
  { source: "LinkedIn", detail: "247 keywords · 8 new posts/hour", active: true },
  { source: "Reddit", detail: "12 subreddits · 3 new posts/hour", active: true },
  { source: "Business Filings", detail: "CT, NY, MA · Daily sync", active: true },
  { source: "Permit Database", detail: "Construction + Liquor · Weekly sync", active: false },
  { source: "ZoomInfo", detail: "Contact enrichment · On-demand", active: false },
];

function ScoreChip({ score }: { score: number }) {
  const color = score >= 80 ? "bg-destructive/15 text-destructive" : score >= 50 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Target className="h-3 w-3" />
      {score}
    </span>
  );
}

export default function LeadEnginePanel() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">Lead Intelligence Engine</h2>
          <p className="text-xs text-muted-foreground">
            Full functionality coming soon — connect your data sources in{" "}
            <button
              onClick={() => navigate("/settings?section=lead-engine")}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Settings
            </button>{" "}
            to get started.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1 text-[10px] uppercase tracking-widest font-semibold border-primary/30 text-primary">
          <Clock className="h-3 w-3" />
          Preview
        </Badge>
      </div>

      {/* Pipeline Overview - Tier Cards */}
      <div className="grid grid-cols-3 gap-3">
        {TIER_SUMMARY.map((t) => (
          <Card key={t.tier} className="relative overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <div className={`rounded-full ${t.bg} p-2.5 mb-1`}>
                <t.icon className={`h-5 w-5 ${t.color}`} />
              </div>
              <span className="text-2xl font-bold">{t.count}</span>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total This Week */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Total This Week</span>
        </div>
        <span className="text-2xl font-bold">133</span>
      </div>

      <Separator />

      {/* Hot Leads - Action Required */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" />
            Hot Leads (Tier 1) — Action Required
          </h3>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
            <Filter className="h-3 w-3" />
            Filter
          </Button>
        </div>
        <div className="space-y-3">
          {HOT_LEADS.map((lead) => (
            <Card key={lead.id} className="hover:border-primary/30 transition-colors cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{lead.company}</h4>
                      <ScoreChip score={lead.score} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{lead.state}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{lead.industry}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />{lead.estPremium} est.
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </div>

                <div className="rounded-md bg-muted/50 px-3 py-2 mb-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{lead.source}:</span>{" "}
                    {lead.signal}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Detected {lead.detectedAgo}
                  </span>
                  <span className="text-muted-foreground">
                    Assigned: <span className="font-medium text-foreground">{lead.assignedTo}</span>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="text-[11px] font-medium text-amber-600">{lead.action}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Two Column: Activity + Monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-muted p-1.5">
                  <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Monitoring */}
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
          <CardContent className="p-4 pt-0 space-y-3">
            {MONITORING.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
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
                <Badge variant={m.active ? "default" : "outline"} className={`text-[9px] shrink-0 ${m.active ? "" : "opacity-50"}`}>
                  {m.active ? "Live" : "Inactive"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* KPI Preview */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Performance Snapshot (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Leads Detected", value: "487", sub: "Total" },
              { label: "Quotes Issued", value: "67", sub: "14% conversion" },
              { label: "Policies Bound", value: "18", sub: "3.7% close rate" },
              { label: "New Premium", value: "$542K", sub: "Written" },
            ].map((kpi, i) => (
              <div key={i} className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold">{kpi.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/60">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Source Performance */}
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Source Performance</h4>
          <div className="space-y-2">
            {[
              { source: "LinkedIn", leads: 142, conversions: 8, rate: "5.6%" },
              { source: "Reddit", leads: 67, conversions: 3, rate: "4.5%" },
              { source: "Business Filings", leads: 203, conversions: 5, rate: "2.5%" },
              { source: "Renewal Intercepts", leads: 75, conversions: 2, rate: "2.7%" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-medium">{s.source}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{s.leads} leads</span>
                  <span>→</span>
                  <span>{s.conversions} conversions</span>
                  <Badge variant="outline" className="text-[10px]">{s.rate}</Badge>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Speed to Lead */}
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Speed to Lead</h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg Contact (Tier 1)", value: "3.2 hrs" },
              { label: "Avg Time to Quote", value: "4.8 days" },
              { label: "Avg Sales Cycle", value: "18 days" },
            ].map((s, i) => (
              <div key={i} className="rounded-lg border p-2.5 text-center">
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
