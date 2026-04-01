import { useState } from "react";
import {
  MessageSquare, Bell, Phone, TrendingUp, MapPin, Home, Building2,
  ChevronRight, Check, Edit2, RefreshCw, ThumbsUp, Calendar,
  ArrowUpRight, AlertTriangle, Clock, Eye, ExternalLink, Flame,
  Users, FileText, Share2, Linkedin, Instagram, Facebook,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

/* ── Mock data ── */
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

const SOCIAL_POSTS = [
  { id: "s1", platform: "linkedin" as const, status: "pending" as const, content: "West Hartford Q1 Market Intelligence:\n\n📊 Median home value up 4.2% YoY to $485K\n🏗️ 14 renovation permits filed (highest since 2021)\n📈 Average days on market: 18 (down from 26)\n\nThe data tells a clear story — if you've been waiting, the spring window is here. DM me for a personalized equity analysis of your property.", scheduledFor: "Mon 9:00 AM", engagement: null },
  { id: "s2", platform: "instagram" as const, status: "pending" as const, content: "Just helped the Martinez family sell their home on Outlook Ave for $12K over asking 🏡✨\n\nThe key? We timed the listing perfectly with the spring market surge. Their renovated kitchen was the difference-maker.\n\nThinking about selling? Let's talk about what your home is really worth → Link in bio", scheduledFor: "Tue 12:00 PM", engagement: null },
  { id: "s3", platform: "facebook" as const, status: "approved" as const, content: "🏠 West Hartford Neighborhood Spotlight: Elmwood\n\nDid you know homes in 06110 have appreciated 18% over the last 3 years? With new development on New Britain Ave and school ratings holding strong, Elmwood remains one of the best-value neighborhoods in Greater Hartford.\n\nFree home value estimate → [link]", scheduledFor: "Wed 5:00 PM", engagement: { reach: 342, clicks: 28, shares: 5 } },
  { id: "s4", platform: "linkedin" as const, status: "approved" as const, content: "Attention mortgage brokers and financial advisors in CT:\n\nI just published our monthly Territory Intelligence Report for West Hartford. Key finding — 6 pre-foreclosure filings in 06107 this month, up from 2 last quarter.\n\nIf your clients own property in these zips, they should know their options. Happy to provide complimentary valuations for your referrals.", scheduledFor: "Thu 10:00 AM", engagement: { reach: 187, clicks: 12, shares: 3 } },
];

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

export default function ConnectPropertyDashboard() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [socialPosts, setSocialPosts] = useState(SOCIAL_POSTS);
  const [tab, setTab] = useState("digest");

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
  const pipeline = [...CONTACTS].sort((a, b) => b.intentScore - a.intentScore);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />Market Report
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />Full Pipeline
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            </div>
            <p className="text-2xl font-bold mt-1 text-red-400">{urgentCount}</p>
            <p className="text-[10px] text-red-400/70 mt-0.5">High-intent contacts</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pipeline</span>
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">{CONTACTS.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active contacts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full sm:w-auto bg-muted/50">
          <TabsTrigger value="digest" className="text-xs">Morning Digest</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="social" className="text-xs">
            Social{pendingPosts > 0 && <Badge className="ml-1.5 h-4 px-1 text-[9px] bg-primary text-primary-foreground">{pendingPosts}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Morning Digest ── */}
        <TabsContent value="digest" className="mt-4 space-y-4">
          {/* Hot Contacts */}
          {hotContacts.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-400" />Hot Contacts
                  <Badge variant="outline" className="text-[10px] ml-auto">{hotContacts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hotContacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{c.name}</span>
                        <IntentBadge score={c.intentScore} />
                        <StagePill stage={c.stage} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{c.address}
                        </span>
                        <Badge variant="outline" className={`text-[9px] ${TRIGGER_COLORS[c.triggerIcon]}`}>
                          {c.trigger}
                        </Badge>
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

          {/* New Signals */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />New Signals Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CONTACTS.filter(c => c.stage === "new").map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{c.name}</span>
                      <IntentBadge score={c.intentScore} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.address} · {c.trigger}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0">
                    <Eye className="h-3 w-3 mr-1" />View
                  </Button>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Social Preview */}
          {pendingPosts > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />Social Queue
                  <Badge className="ml-auto h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">{pendingPosts} pending</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {socialPosts.filter(p => p.status === "pending").slice(0, 3).map(p => {
                    const Icon = PLATFORM_ICON[p.platform];
                    return (
                      <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                        <Icon className={`h-3 w-3 ${PLATFORM_COLOR[p.platform]}`} />
                        {p.scheduledFor}
                      </Badge>
                    );
                  })}
                  <Button size="sm" variant="ghost" className="text-xs ml-auto" onClick={() => setTab("social")}>
                    Review all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Pipeline ── */}
        <TabsContent value="pipeline" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Territory Pipeline</CardTitle>
                <div className="flex items-center gap-1.5">
                  {(["all", "replied", "new", "touched", "nurture"] as const).map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted/80">
                      {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_80px_70px_70px_60px_32px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Contact</span><span>Trigger</span><span>Value</span><span>Intent</span><span>Stage</span><span>Touches</span><span />
                </div>
                <Separator />
                {pipeline.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className="w-full grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_70px_70px_60px_32px] gap-2 items-center rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
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

                    {/* Mobile summary */}
                    <div className="flex items-center gap-2 sm:hidden flex-wrap">
                      <Badge variant="outline" className={`text-[9px] ${TRIGGER_COLORS[c.triggerIcon]}`}>{c.trigger}</Badge>
                      <IntentBadge score={c.intentScore} />
                      <StagePill stage={c.stage} />
                      <span className="text-xs font-medium ml-auto">{c.value}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Social ── */}
        <TabsContent value="social" className="mt-4 space-y-3">
          {pendingPosts > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{pendingPosts} posts awaiting approval</p>
              <Button size="sm" variant="outline" className="text-xs" onClick={approveAll}>
                <Check className="h-3 w-3 mr-1" />Approve all pending
              </Button>
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
                        <Button size="sm" className="text-xs flex-1" onClick={() => approvePost(p.id)}>
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Edit2 className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Contact Detail Drawer ── */}
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
                {/* Property Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">Address</span>
                      <p className="text-sm font-medium mt-0.5">{selectedContact.address}</p>
                    </div>
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">Est. Value</span>
                      <p className="text-sm font-medium mt-0.5">{selectedContact.value}</p>
                    </div>
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">Equity</span>
                      <p className="text-sm font-medium mt-0.5">{selectedContact.equity}</p>
                    </div>
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">Tenure</span>
                      <p className="text-sm font-medium mt-0.5">{selectedContact.tenure}</p>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                {(selectedContact.phone || selectedContact.email) && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                    <div className="flex items-center gap-2">
                      {selectedContact.phone && (
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Phone className="h-3 w-3" />{selectedContact.phone}
                        </Button>
                      )}
                      {selectedContact.email && (
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <MessageSquare className="h-3 w-3" />Email
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Next Step */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-primary" />AI Recommended Next Step
                  </h3>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs leading-relaxed">{selectedContact.aiNextStep}</p>
                  </div>
                </div>

                {/* AI Call Prep */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call Prep</h3>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs leading-relaxed italic">{selectedContact.aiCallPrep}</p>
                  </div>
                </div>

                {/* Touch History */}
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
                  <Button className="w-full" size="sm">
                    <Phone className="h-3.5 w-3.5 mr-2" />Take Action
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
