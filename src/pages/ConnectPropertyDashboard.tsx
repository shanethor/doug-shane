import { useState } from "react";
import {
  MessageSquare, Bell, Phone, TrendingUp, MapPin, Home, Building2,
  ChevronRight, Check, Edit2, RefreshCw, ThumbsUp, Calendar,
  ArrowUpRight, AlertTriangle, Clock, Eye, ExternalLink, Flame,
  Users, FileText, Share2, Linkedin, Instagram, Facebook,
  BarChart3, Send, Mail, Printer, Globe, Star, Shield, Zap,
  DollarSign, Settings, Lock, Crown, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import LiveListingsTab from "@/components/property/LiveListingsTab";

/* ══════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════ */
const TERRITORY = { name: "West Hartford, CT", zips: ["06107", "06110", "06117"], properties: 2847, signals90d: 43 };

interface Contact {
  id: string;
  name: string;
  address: string;
  trigger: string;
  triggerIcon: "divorce" | "permit" | "preforeclosure" | "probate" | "longtenure" | "newconstruction" | "llc";
  intentScore: number;
  stage: "new" | "touched" | "replied" | "nurture";
  equity: string;
  tenure: string;
  value: string;
  daysSinceSignal: number;
  touchCount: number;
  aiNextStep: string;
  aiCallPrep: string;
  phone?: string;
  email?: string;
}

const CONTACTS: Contact[] = [
  { id: "1", name: "Maria & David Nguyen", address: "47 Outlook Ave", trigger: "Renovation Permit – $68K", triggerIcon: "permit", intentScore: 82, stage: "replied", equity: "$310K", tenure: "14 yrs", value: "$485,000", daysSinceSignal: 12, touchCount: 3, phone: "(860) 555-1234", email: "nguyen47@gmail.com", aiNextStep: "Schedule walk-through. They responded positively to the equity analysis — bring comparable sales for Outlook Ave and discuss timing around their renovation completion (est. 8 weeks).", aiCallPrep: "Open with: 'I saw your renovation is underway — homes on Outlook that have done similar updates have seen 15-22% value increases. Would you like to see the numbers?'" },
  { id: "2", name: "Roberto & Ana Delgado", address: "312 Park Rd", trigger: "Pre-foreclosure – 30 days", triggerIcon: "preforeclosure", intentScore: 91, stage: "new", equity: "$178K", tenure: "9 yrs", value: "$340,000", daysSinceSignal: 3, touchCount: 0, phone: "(860) 555-5678", aiNextStep: "URGENT: 30 days to auction. Lead with compassion — offer a free property valuation and discuss options including a quick market sale to avoid foreclosure.", aiCallPrep: "Open with empathy: 'I work with homeowners in situations like yours and wanted to reach out — there are options that could help you preserve your equity. No pressure, just information.'" },
  { id: "3", name: "James Torres", address: "88 Fern St", trigger: "Renovation Permit – $45K", triggerIcon: "permit", intentScore: 64, stage: "touched", equity: "$220K", tenure: "6 yrs", value: "$390,000", daysSinceSignal: 14, touchCount: 2, aiNextStep: "Day 14, no response yet — this is normal for renovation leads. Send the neighborhood market analysis via mail. Renovation owners respond 3x more to physical mail than email.", aiCallPrep: "Follow-up angle: reference the specific permit type and connect it to comparable renovated sales nearby." },
  { id: "4", name: "Estate of Dorothy Harmon", address: "19 Sedgwick Rd", trigger: "Probate Filing", triggerIcon: "probate", intentScore: 76, stage: "new", equity: "$445K", tenure: "38 yrs", value: "$620,000", daysSinceSignal: 7, touchCount: 0, aiNextStep: "Contact the estate attorney first, not the heirs directly. Probate sales require specific legal sequencing — offer a complimentary market analysis to the executor.", aiCallPrep: "Research the probate attorney of record. Introduce yourself as a specialist who handles estate properties with sensitivity and market expertise." },
  { id: "5", name: "Sarah & Mike Chen", address: "201 Mountain Rd", trigger: "Long Tenure – 22 years", triggerIcon: "longtenure", intentScore: 54, stage: "nurture", equity: "$380K", tenure: "22 yrs", value: "$510,000", daysSinceSignal: 30, touchCount: 4, aiNextStep: "Nurture cadence — send monthly market update. Long-tenure owners convert slowly but at high values. Next touch: invite to a neighborhood appreciation event.", aiCallPrep: "These homeowners aren't urgently selling. Position yourself as their 'home wealth advisor' — share equity growth data and future projections." },
  { id: "6", name: "Apex Development LLC", address: "1400 New Britain Ave", trigger: "New LLC Formation", triggerIcon: "llc", intentScore: 72, stage: "new", equity: "N/A", tenure: "New", value: "$1,200,000", daysSinceSignal: 5, touchCount: 0, phone: "(860) 555-9012", aiNextStep: "Commercial opportunity — new development entity likely acquiring or building. Research the principals and reach out with local market knowledge and off-market inventory.", aiCallPrep: "Check the SOS filing for principals. Lead with: 'I noticed your new entity formation and wanted to introduce myself — I specialize in commercial and development properties in the West Hartford corridor.'" },
];

interface SocialPost { id: string; platform: "linkedin" | "instagram" | "facebook"; status: "pending" | "approved"; content: string; scheduledFor: string; engagement: { reach: number; clicks: number; shares: number } | null; }
const SOCIAL_POSTS: SocialPost[] = [
  { id: "s1", platform: "linkedin", status: "pending", content: "West Hartford Q1 Market Intelligence:\n\n📊 Median home value up 4.2% YoY to $485K\n🏗️ 14 renovation permits filed (highest since 2021)\n📈 Average days on market: 18 (down from 26)\n\nThe data tells a clear story — if you've been waiting, the spring window is here. DM me for a personalized equity analysis of your property.", scheduledFor: "Mon 9:00 AM", engagement: null },
  { id: "s2", platform: "instagram", status: "pending", content: "Just helped the Martinez family sell their home on Outlook Ave for $12K over asking 🏡✨\n\nThe key? We timed the listing perfectly with the spring market surge. Their renovated kitchen was the difference-maker.\n\nThinking about selling? Let's talk about what your home is really worth → Link in bio", scheduledFor: "Tue 12:00 PM", engagement: null },
  { id: "s3", platform: "facebook", status: "approved", content: "🏠 West Hartford Neighborhood Spotlight: Elmwood\n\nDid you know homes in 06110 have appreciated 18% over the last 3 years? With new development on New Britain Ave and school ratings holding strong, Elmwood remains one of the best-value neighborhoods in Greater Hartford.\n\nFree home value estimate → [link]", scheduledFor: "Wed 5:00 PM", engagement: { reach: 342, clicks: 28, shares: 5 } },
  { id: "s4", platform: "linkedin", status: "approved", content: "Attention mortgage brokers and financial advisors in CT:\n\nI just published our monthly Territory Intelligence Report for West Hartford. Key finding — 6 pre-foreclosure filings in 06107 this month, up from 2 last quarter.\n\nIf your clients own property in these zips, they should know their options. Happy to provide complimentary valuations for your referrals.", scheduledFor: "Thu 10:00 AM", engagement: { reach: 187, clicks: 12, shares: 3 } },
];

/* ── Market report mock data ── */
const MARKET_REPORT = {
  month: "April 2026",
  territory: "West Hartford, CT",
  stats: {
    medianPrice: "$485,000",
    medianPriceChange: 4.2,
    avgDOM: 18,
    avgDOMChange: -30.8,
    activeListing: 47,
    activeListingChange: -12,
    closedSales: 31,
    closedSalesChange: 8,
  },
  signalActivity: {
    renovationPermits: 14,
    preForeclosures: 6,
    divorceFilings: 3,
    probateFilings: 5,
    longTenureOwners: 180,
    newConstructionPermits: 4,
  },
  outlook: "Spring market is heating up with inventory tightening and days on market at a 3-year low. Renovation permit volume is elevated — these owners are likely preparing to sell within 12–24 months. Pre-foreclosure filings in 06107 are up 200% QoQ, creating forced-sale opportunities for buyers. With rates stabilizing near 6.2%, buyer demand remains strong.",
  distribution: { emails: 1034, socialPosts: 4, landingPage: true, directMail: false },
};

/* ── Subscription tiers ── */
const TIERS = [
  {
    name: "Farm",
    price: 149,
    contacts: "~15",
    description: "Perfect for agents starting to build their territory presence.",
    features: ["500-property territory", "Email + SMS drip sequences", "Monthly market report", "Basic signal monitoring", "AI call prep for every contact"],
    roi: "One closing from this plan pays for the entire year.",
    color: "border-primary/30",
    popular: false,
  },
  {
    name: "Market",
    price: 299,
    contacts: "~35",
    description: "For agents ready to dominate their neighborhood.",
    features: ["1,500-property territory", "Everything in Farm", "Social media automation", "Direct mail integration via Lob", "LinkedIn content ghostwriting", "Referral partner outreach", "Weekly signal alerts"],
    roi: "Two closings more than cover the annual cost.",
    color: "border-primary",
    popular: true,
  },
  {
    name: "Dominate",
    price: 499,
    contacts: "~70+",
    description: "Full territory ownership — no other agent can claim your zips.",
    features: ["2,500-property territory", "Everything in Market", "Exclusive territory lock", "Priority signal delivery", "Commercial + residential coverage", "Quarterly video market reports", "Dedicated success manager", "Custom landing page at your domain"],
    roi: "Three closings cover the year — the average agent using this tier closes 8+.",
    color: "border-amber-500",
    popular: false,
  },
];

/* ── Helpers ── */
const TRIGGER_COLORS: Record<string, string> = {
  divorce: "bg-red-500/10 text-red-400 border-red-500/20",
  permit: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  preforeclosure: "bg-red-500/10 text-red-400 border-red-500/20",
  probate: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  longtenure: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  newconstruction: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  llc: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

function IntentBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-red-400 bg-red-500/10 border-red-500/20" : score >= 60 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-muted-foreground bg-muted border-border";
  return <Badge variant="outline" className={`text-[10px] font-bold tabular-nums ${color}`}>{score}</Badge>;
}

function StagePill({ stage }: { stage: Contact["stage"] }) {
  const styles: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    touched: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    replied: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    nurture: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[stage]}`}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</Badge>;
}

const PLATFORM_ICON: Record<string, any> = { linkedin: Linkedin, instagram: Instagram, facebook: Facebook };
const PLATFORM_COLOR: Record<string, string> = { linkedin: "text-blue-400", instagram: "text-pink-400", facebook: "text-blue-500" };

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function ConnectPropertyDashboard() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [socialPosts, setSocialPosts] = useState(SOCIAL_POSTS);
  const [tab, setTab] = useState("digest");
  const [pipelineFilter, setPipelineFilter] = useState<"all" | Contact["stage"]>("all");
  const [reportView, setReportView] = useState<"preview" | "edit" | "send">("preview");
  const [reportSections, setReportSections] = useState({
    marketOverview: true,
    signalActivity: true,
    aprilOutlook: true,
    featuredListings: false,
  });
  const [territoryExpanded, setTerritoryExpanded] = useState(false);

  const repliesCount = CONTACTS.filter(c => c.stage === "replied").length;
  const newSignals = CONTACTS.filter(c => c.stage === "new").length;
  const urgentCount = CONTACTS.filter(c => c.intentScore >= 85).length;
  const pendingPosts = socialPosts.filter(p => p.status === "pending").length;

  const approvePost = (id: string) => {
    setSocialPosts(prev => prev.map(p => p.id === id ? { ...p, status: "approved" as const } : p));
    toast.success("Post approved");
  };
  const approveAll = () => {
    setSocialPosts(prev => prev.map(p => ({ ...p, status: "approved" as const })));
    toast.success("All posts approved");
  };

  const hotContacts = CONTACTS.filter(c => c.stage === "replied" || c.intentScore >= 80).sort((a, b) => b.intentScore - a.intentScore);
  const filteredPipeline = pipelineFilter === "all"
    ? [...CONTACTS].sort((a, b) => b.intentScore - a.intentScore)
    : CONTACTS.filter(c => c.stage === pipelineFilter).sort((a, b) => b.intentScore - a.intentScore);

  const totalPipelineValue = CONTACTS.reduce((sum, c) => sum + (parseInt(c.value.replace(/[^0-9]/g, "")) || 0), 0);

  /* ── Performance stats (mock) ── */
  const performance = {
    totalReach: 2847,
    totalClicks: 156,
    profileVisits: 87,
    inboundDMs: 6,
    emailOpenRate: 34,
    emailClickRate: 8.2,
    touchesSent: 48,
    responsesReceived: 7,
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Good morning</h1>
            <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
              <MapPin className="h-3 w-3 mr-1" />{TERRITORY.name}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoring {TERRITORY.properties.toLocaleString()} properties across {TERRITORY.zips.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setTab("report")}>
            <FileText className="h-3.5 w-3.5" />Market Report
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setTab("pipeline")}>
            <Users className="h-3.5 w-3.5" />Full Pipeline
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <Card className="border-border bg-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Replies</span>
              {repliesCount > 0 && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <p className="text-2xl font-bold mt-1">{repliesCount}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Need your attention</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">New Signals</span>
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{newSignals}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Urgent</span>
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{urgentCount}</p>
            <p className="text-[10px] text-destructive/70 mt-0.5">High-intent contacts</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pipeline</span>
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">{CONTACTS.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">${(totalPipelineValue / 1000000).toFixed(1)}M total value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
        <TabsList className="w-full sm:w-auto bg-muted/50 flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="digest" className="text-xs">Digest</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="social" className="text-xs">
            Social{pendingPosts > 0 && <Badge className="ml-1.5 h-4 px-1 text-[9px] bg-primary text-primary-foreground">{pendingPosts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs">Market Report</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="territory" className="text-xs">Territory</TabsTrigger>
        </TabsList>

        {/* ══ Morning Digest ══ */}
        <TabsContent value="digest" className="mt-4 space-y-4">
          {hotContacts.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-destructive" />Hot Contacts
                  <Badge variant="outline" className="text-[10px] ml-auto">{hotContacts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hotContacts.map(c => (
                  <button key={c.id} onClick={() => setSelectedContact(c)} className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{c.name}</span>
                        <IntentBadge score={c.intentScore} />
                        <StagePill stage={c.stage} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address}</span>
                        <Badge variant="outline" className={`text-[9px] ${TRIGGER_COLORS[c.triggerIcon]}`}>{c.trigger}</Badge>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <span className="text-xs font-medium">{c.value}</span>
                      <span className="text-[10px] text-muted-foreground">{c.equity} equity</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />New Signals Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CONTACTS.filter(c => c.stage === "new").map(c => (
                <button key={c.id} onClick={() => setSelectedContact(c)} className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{c.name}</span>
                      <IntentBadge score={c.intentScore} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.address} · {c.trigger}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0"><Eye className="h-3 w-3 mr-1" />View</Button>
                </button>
              ))}
            </CardContent>
          </Card>

          {pendingPosts > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />Social Queue
                  <Badge className="ml-auto h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">{pendingPosts} pending</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {socialPosts.filter(p => p.status === "pending").slice(0, 3).map(p => {
                    const Icon = PLATFORM_ICON[p.platform];
                    return (
                      <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                        <Icon className={`h-3 w-3 ${PLATFORM_COLOR[p.platform]}`} />{p.scheduledFor}
                      </Badge>
                    );
                  })}
                  <Button size="sm" variant="ghost" className="text-xs ml-auto" onClick={() => setTab("social")}>Review all <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ Pipeline ══ */}
        <TabsContent value="pipeline" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm">Territory Pipeline · ${(totalPipelineValue / 1000000).toFixed(1)}M</CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["all", "replied", "new", "touched", "nurture"] as const).map(f => (
                    <Badge
                      key={f}
                      variant="outline"
                      className={`text-[10px] cursor-pointer transition-colors ${pipelineFilter === f ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-muted/80"}`}
                      onClick={() => setPipelineFilter(f)}
                    >
                      {f === "all" ? `All (${CONTACTS.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${CONTACTS.filter(c => c.stage === f).length})`}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="hidden sm:grid grid-cols-[1fr_80px_80px_70px_70px_60px_32px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Contact</span><span>Trigger</span><span>Value</span><span>Intent</span><span>Stage</span><span>Touches</span><span />
                </div>
                <Separator />
                {filteredPipeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No contacts match this filter.</p>
                ) : (
                  filteredPipeline.map(c => (
                    <button key={c.id} onClick={() => setSelectedContact(c)} className="w-full grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_70px_70px_60px_32px] gap-2 items-center rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.address}</span>
                      </div>
                      <Badge variant="outline" className={`text-[9px] hidden sm:inline-flex w-fit ${TRIGGER_COLORS[c.triggerIcon]}`}>
                        {c.triggerIcon === "permit" ? "Permit" : c.triggerIcon === "preforeclosure" ? "Pre-FC" : c.triggerIcon === "probate" ? "Probate" : c.triggerIcon === "longtenure" ? "Tenure" : c.triggerIcon === "llc" ? "LLC" : c.triggerIcon}
                      </Badge>
                      <span className="text-xs font-medium hidden sm:block">{c.value}</span>
                      <span className="hidden sm:block"><IntentBadge score={c.intentScore} /></span>
                      <span className="hidden sm:block"><StagePill stage={c.stage} /></span>
                      <span className="text-xs text-muted-foreground hidden sm:block text-center">{c.touchCount}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      <div className="flex items-center gap-2 sm:hidden flex-wrap">
                        <Badge variant="outline" className={`text-[9px] ${TRIGGER_COLORS[c.triggerIcon]}`}>{c.trigger}</Badge>
                        <IntentBadge score={c.intentScore} />
                        <StagePill stage={c.stage} />
                        <span className="text-xs font-medium ml-auto">{c.value}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Social ══ */}
        <TabsContent value="social" className="mt-4 space-y-3">
          {pendingPosts > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{pendingPosts} posts awaiting approval</p>
              <Button size="sm" variant="outline" className="text-xs" onClick={approveAll}><Check className="h-3 w-3 mr-1" />Approve all pending</Button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {socialPosts.map(p => {
              const Icon = PLATFORM_ICON[p.platform];
              return (
                <Card key={p.id} className="border-border bg-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${PLATFORM_COLOR[p.platform]}`} />
                        <span className="text-xs font-medium capitalize">{p.platform}</span>
                        <span className="text-[10px] text-muted-foreground">· {p.scheduledFor}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${p.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                        {p.status === "pending" ? "Pending" : "Approved"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-line">{p.content.slice(0, 200)}{p.content.length > 200 ? "..." : ""}</p>
                    {p.engagement && (
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{p.engagement.reach} reach</span>
                        <span>{p.engagement.clicks} clicks</span>
                        <span>{p.engagement.shares} shares</span>
                      </div>
                    )}
                    {p.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="text-xs flex-1" onClick={() => approvePost(p.id)}><Check className="h-3 w-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="outline" className="text-xs"><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                        <Button size="sm" variant="ghost" className="text-xs"><RefreshCw className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ══ Market Report ══ */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            {(["preview", "edit", "send"] as const).map(v => (
              <Button key={v} size="sm" variant={reportView === v ? "default" : "outline"} className="text-xs" onClick={() => setReportView(v)}>
                {v === "preview" ? <Eye className="h-3 w-3 mr-1" /> : v === "edit" ? <Edit2 className="h-3 w-3 mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>

          {reportView === "preview" && (
            <Card className="border-border bg-card">
              <CardContent className="p-5 space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{MARKET_REPORT.month} Territory Intelligence Report</p>
                  <h2 className="text-lg font-bold">{MARKET_REPORT.territory}</h2>
                  <p className="text-xs text-muted-foreground">Prepared by your AURA Connect Property system</p>
                </div>
                <Separator />
                {reportSections.marketOverview && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Market Overview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Median Price", value: MARKET_REPORT.stats.medianPrice, change: MARKET_REPORT.stats.medianPriceChange },
                        { label: "Avg Days on Market", value: String(MARKET_REPORT.stats.avgDOM), change: MARKET_REPORT.stats.avgDOMChange },
                        { label: "Active Listings", value: String(MARKET_REPORT.stats.activeListing), change: MARKET_REPORT.stats.activeListingChange },
                        { label: "Closed Sales", value: String(MARKET_REPORT.stats.closedSales), change: MARKET_REPORT.stats.closedSalesChange },
                      ].map(s => (
                        <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          <p className="text-lg font-bold mt-1">{s.value}</p>
                          <p className={`text-[10px] mt-0.5 ${s.change >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                            {s.change >= 0 ? "↑" : "↓"} {Math.abs(s.change)}% YoY
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reportSections.signalActivity && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Signal Activity — What Others Don't See</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: "Renovation Permits", value: MARKET_REPORT.signalActivity.renovationPermits, icon: "🏗️" },
                        { label: "Pre-Foreclosures", value: MARKET_REPORT.signalActivity.preForeclosures, icon: "⚠️" },
                        { label: "Divorce Filings", value: MARKET_REPORT.signalActivity.divorceFilings, icon: "📄" },
                        { label: "Probate Filings", value: MARKET_REPORT.signalActivity.probateFilings, icon: "📋" },
                        { label: "Long-Tenure Owners", value: MARKET_REPORT.signalActivity.longTenureOwners, icon: "🏠" },
                        { label: "New Construction", value: MARKET_REPORT.signalActivity.newConstructionPermits, icon: "🔨" },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                          <span className="text-lg">{s.icon}</span>
                          <div>
                            <p className="text-sm font-bold">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reportSections.aprilOutlook && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{MARKET_REPORT.month} Outlook</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{MARKET_REPORT.outlook}</p>
                  </div>
                )}
                <Separator />
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium">Want to know what your home is worth?</p>
                  <Button size="sm" className="text-xs"><Home className="h-3 w-3 mr-1.5" />Get a Free Home Valuation</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {reportView === "edit" && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customize Report Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {([
                  { key: "marketOverview" as const, label: "Market Overview", desc: "Median price, DOM, listings, sales" },
                  { key: "signalActivity" as const, label: "Signal Activity", desc: "Permits, pre-foreclosures, probate — your competitive edge" },
                  { key: "aprilOutlook" as const, label: `${MARKET_REPORT.month} Outlook`, desc: "AI-written market analysis" },
                  { key: "featuredListings" as const, label: "Featured Listings", desc: "Your active listings (if any)" },
                ]).map(s => (
                  <div key={s.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </div>
                    <Switch checked={reportSections[s.key]} onCheckedChange={v => setReportSections(prev => ({ ...prev, [s.key]: v }))} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {reportView === "send" && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribution Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Mail className="h-5 w-5 mx-auto text-primary" />
                    <p className="text-lg font-bold mt-1">{MARKET_REPORT.distribution.emails.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Emails</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Share2 className="h-5 w-5 mx-auto text-primary" />
                    <p className="text-lg font-bold mt-1">{MARKET_REPORT.distribution.socialPosts}</p>
                    <p className="text-[10px] text-muted-foreground">Social Posts</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Globe className="h-5 w-5 mx-auto text-primary" />
                    <p className="text-lg font-bold mt-1">{MARKET_REPORT.distribution.landingPage ? "Yes" : "No"}</p>
                    <p className="text-[10px] text-muted-foreground">Landing Page</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Printer className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold mt-1">{MARKET_REPORT.distribution.directMail ? "Yes" : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Direct Mail</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">One approval sends across all channels simultaneously.</p>
                  <Button size="sm" className="text-xs gap-1.5" onClick={() => toast.success("Market report sent to 1,034 contacts!")}>
                    <Send className="h-3 w-3" />Send Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ Performance ══ */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Reach", value: performance.totalReach.toLocaleString(), icon: Users, color: "text-primary" },
              { label: "Link Clicks", value: String(performance.totalClicks), icon: ArrowUpRight, color: "text-primary" },
              { label: "Profile Visits", value: String(performance.profileVisits), icon: Eye, color: "text-primary" },
              { label: "Inbound DMs", value: String(performance.inboundDMs), icon: MessageSquare, color: "text-emerald-400" },
            ].map(s => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</span>
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Email Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Open Rate</span>
                    <span className="font-medium">{performance.emailOpenRate}%</span>
                  </div>
                  <Progress value={performance.emailOpenRate} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Click Rate</span>
                    <span className="font-medium">{performance.emailClickRate}%</span>
                  </div>
                  <Progress value={performance.emailClickRate * 5} className="h-1.5" />
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{performance.touchesSent} touches sent</span>
                  <span>{performance.responsesReceived} responses</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Social Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {socialPosts.filter(p => p.engagement).map(p => {
                  const Icon = PLATFORM_ICON[p.platform];
                  return (
                    <div key={p.id} className="flex items-center gap-3 text-xs">
                      <Icon className={`h-4 w-4 ${PLATFORM_COLOR[p.platform]}`} />
                      <span className="flex-1 truncate capitalize">{p.platform}</span>
                      <span className="text-muted-foreground">{p.engagement!.reach} reach</span>
                      <span className="text-muted-foreground">{p.engagement!.clicks} clicks</span>
                    </div>
                  );
                })}
                {socialPosts.filter(p => p.engagement).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No social performance data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ Territory ══ */}
        <TabsContent value="territory" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />Your Territory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Location</p>
                  <p className="text-sm font-medium mt-1">{TERRITORY.name}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">ZIP Codes</p>
                  <p className="text-sm font-medium mt-1">{TERRITORY.zips.join(", ")}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Properties</p>
                  <p className="text-sm font-medium mt-1">{TERRITORY.properties.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Signals (90d)</p>
                  <p className="text-sm font-medium mt-1">{TERRITORY.signals90d}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border p-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Territory Locked</p>
                  <p className="text-[10px] text-muted-foreground">No other agent on AURA can claim these ZIP codes while your subscription is active.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Tiers */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Crown className="h-4 w-4 text-amber-400" />AURA Connect Property Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIERS.map(tier => (
                <Card key={tier.name} className={`border-2 bg-card relative ${tier.popular ? tier.color : "border-border"}`}>
                  {tier.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-[9px]"><Star className="h-2.5 w-2.5 mr-0.5" />Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3 pt-5">
                    <div>
                      <h4 className="text-lg font-bold">{tier.name}</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold">${tier.price}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">~{tier.contacts} new pipeline contacts/mo</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                    <Separator />
                    <ul className="space-y-1.5">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                      <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />{tier.roi}
                      </p>
                    </div>
                    <Button className="w-full text-xs" variant={tier.popular ? "default" : "outline"} size="sm">
                      {tier.name === "Farm" ? "Get Started" : tier.popular ? "Choose Market" : "Go Dominate"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══ Contact Detail Drawer ══ */}
      <Sheet open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border text-foreground overflow-y-auto">
          {selectedContact && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left text-lg">{selectedContact.name}</SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <IntentBadge score={selectedContact.intentScore} />
                  <StagePill stage={selectedContact.stage} />
                  <Badge variant="outline" className={`text-[9px] ${TRIGGER_COLORS[selectedContact.triggerIcon]}`}>{selectedContact.trigger}</Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Address", value: selectedContact.address },
                      { label: "Est. Value", value: selectedContact.value },
                      { label: "Equity", value: selectedContact.equity },
                      { label: "Tenure", value: selectedContact.tenure },
                    ].map(f => (
                      <div key={f.label} className="rounded-lg border border-border p-2.5">
                        <span className="text-[10px] text-muted-foreground">{f.label}</span>
                        <p className="text-sm font-medium mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {(selectedContact.phone || selectedContact.email) && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedContact.phone && (
                        <Button size="sm" variant="outline" className="text-xs gap-1.5"><Phone className="h-3 w-3" />{selectedContact.phone}</Button>
                      )}
                      {selectedContact.email && (
                        <Button size="sm" variant="outline" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" />Email</Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-primary" />AI Recommended Next Step
                  </h3>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs leading-relaxed">{selectedContact.aiNextStep}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call Prep</h3>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs leading-relaxed italic">{selectedContact.aiCallPrep}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Touch History</h3>
                  <div className="space-y-1.5">
                    {selectedContact.touchCount === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No touches yet — signal detected {selectedContact.daysSinceSignal} days ago</p>
                    ) : (
                      Array.from({ length: selectedContact.touchCount }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                          <span>Touch {i + 1} · {selectedContact.daysSinceSignal - (i * 4)} days ago</span>
                          <span className="text-[10px]">· Email sent</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full" size="sm"><Phone className="h-3.5 w-3.5 mr-2" />Take Action</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
