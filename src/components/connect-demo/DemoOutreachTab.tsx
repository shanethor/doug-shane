import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone, Mail, MessageSquare, Linkedin,
  Calendar, Gift, Check, AlertTriangle,
  ChevronDown, ChevronUp, Send, Copy,
  Zap, User, Building2, Clock, ArrowRight,
  FileText, MapPin, TrendingUp,
  Target, Handshake, Users, Crown, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";

/* ── Triggers Data ── */
interface Trigger {
  type: string; title: string; description: string; person: string;
  company: string; date: string; urgency: "high" | "medium" | "low";
  suggested_action: string; email: string; phone: string;
}

const DUMMY_TRIGGERS: Trigger[] = [
  { type: "renewal", title: "Policy Renewal — 30 Days", description: "Commercial GL policy coming up for renewal. Premium at risk: $18,500.", person: "Sarah Mitchell", company: "Greenfield Industries", date: "Apr 15", urgency: "high", suggested_action: "Schedule a renewal review meeting this week.", email: "sarah@greenvalley.com", phone: "(512) 555-0142" },
  { type: "news", title: "Company Expansion Announced", description: "New office opening in Dallas — potential for additional coverage needs.", person: "Marcus Lee", company: "Summit Solutions", date: "Mar 19", urgency: "high", suggested_action: "Call Marcus to discuss expanded coverage for the new location.", email: "marcus@summit.com", phone: "(214) 555-0198" },
  { type: "filing", title: "SEC Filing Detected", description: "10-K annual report filed showing 22% revenue growth.", person: "Diana Cho", company: "Atlas Partners", date: "Mar 17", urgency: "medium", suggested_action: "Reach out about upgrading their D&O coverage.", email: "diana@atlaspartners.com", phone: "(415) 555-0167" },
  { type: "event", title: "Industry Conference Next Week", description: "Texas Insurance Summit — 3 of your prospects are attending.", person: "Multiple contacts", company: "Various", date: "Mar 28", urgency: "medium", suggested_action: "Book meetings with attendees before slots fill up.", email: "", phone: "" },
  { type: "permit", title: "Building Permit Filed", description: "New construction permit for a 12,000 sq ft warehouse.", person: "Tom Nguyen", company: "Pacific Logistics", date: "Mar 14", urgency: "medium", suggested_action: "Reach out about builders risk and commercial property coverage.", email: "tom@pacificlogistics.com", phone: "(713) 555-0134" },
  { type: "social", title: "LinkedIn Job Change", description: "Promoted to VP of Operations — new decision-making authority.", person: "James Whitfield", company: "Meridian Corp", date: "Mar 12", urgency: "low", suggested_action: "Send a congratulatory message and re-engage.", email: "james@meridian.com", phone: "(512) 555-0189" },
  { type: "renewal", title: "Workers Comp Expiring", description: "Workers compensation policy expires in 45 days. 12 employees covered.", person: "Rachel Kim", company: "Brightside Dental", date: "May 1", urgency: "medium", suggested_action: "Pull loss runs and start the remarketing process.", email: "rachel@brightside.com", phone: "(512) 555-0156" },
  { type: "news", title: "Acquisition Rumor", description: "Local news reports potential acquisition by a regional competitor.", person: "Alex Rivera", company: "Coastal Ventures", date: "Mar 20", urgency: "high", suggested_action: "Call Alex ASAP — coverage gaps often appear during M&A.", email: "alex@coastalventures.com", phone: "(310) 555-0178" },
];

/* ── Cadence Data ── */
interface CadenceContact {
  id: string; name: string; company: string; tier: "S" | "A" | "B" | "C";
  cadenceDays: number; lastTouch: string; nextTouch: string; touchCount: number;
  overdue: boolean; lastTouchType: string; phone: string; email: string;
}

const DUMMY_CONTACTS: CadenceContact[] = [
  { id: "1", name: "Doug Martinez", company: "Martinez & Associates", tier: "S", cadenceDays: 7, lastTouch: "3 days ago", nextTouch: "In 4 days", touchCount: 24, overdue: false, lastTouchType: "call", phone: "(512) 555-0101", email: "doug@martinezassoc.com" },
  { id: "2", name: "Sarah Mitchell", company: "Greenfield Industries", tier: "S", cadenceDays: 7, lastTouch: "10 days ago", nextTouch: "3 days overdue", touchCount: 18, overdue: true, lastTouchType: "email", phone: "(512) 555-0142", email: "sarah@greenvalley.com" },
  { id: "3", name: "James Whitfield", company: "Meridian Corp", tier: "A", cadenceDays: 14, lastTouch: "5 days ago", nextTouch: "In 9 days", touchCount: 12, overdue: false, lastTouchType: "linkedin", phone: "(512) 555-0189", email: "james@meridian.com" },
  { id: "4", name: "Priya Patel", company: "Patel Consulting", tier: "A", cadenceDays: 14, lastTouch: "18 days ago", nextTouch: "4 days overdue", touchCount: 9, overdue: true, lastTouchType: "meeting", phone: "(512) 555-0145", email: "priya@patelconsulting.com" },
  { id: "5", name: "Tom Nguyen", company: "Pacific Logistics", tier: "A", cadenceDays: 30, lastTouch: "12 days ago", nextTouch: "In 18 days", touchCount: 7, overdue: false, lastTouchType: "call", phone: "(713) 555-0134", email: "tom@pacificlogistics.com" },
  { id: "6", name: "Rachel Kim", company: "Brightside Dental", tier: "B", cadenceDays: 30, lastTouch: "25 days ago", nextTouch: "In 5 days", touchCount: 5, overdue: false, lastTouchType: "email", phone: "(512) 555-0156", email: "rachel@brightside.com" },
  { id: "7", name: "Diana Cho", company: "Atlas Partners", tier: "B", cadenceDays: 30, lastTouch: "35 days ago", nextTouch: "5 days overdue", touchCount: 4, overdue: true, lastTouchType: "text", phone: "(415) 555-0167", email: "diana@atlaspartners.com" },
  { id: "8", name: "Alex Rivera", company: "Coastal Ventures", tier: "B", cadenceDays: 30, lastTouch: "15 days ago", nextTouch: "In 15 days", touchCount: 6, overdue: false, lastTouchType: "gift", phone: "(310) 555-0178", email: "alex@coastalventures.com" },
  { id: "9", name: "Marcus Lee", company: "Summit Solutions", tier: "C", cadenceDays: 90, lastTouch: "45 days ago", nextTouch: "In 45 days", touchCount: 3, overdue: false, lastTouchType: "linkedin", phone: "(214) 555-0198", email: "marcus@summit.com" },
  { id: "10", name: "Linda Chen", company: "Evergreen Wealth", tier: "C", cadenceDays: 90, lastTouch: "100 days ago", nextTouch: "10 days overdue", touchCount: 2, overdue: true, lastTouchType: "email", phone: "(512) 555-0123", email: "linda@evergreenwealth.com" },
];

/* ── Top 10 Data ── */
interface Owner {
  name: string; company: string; reason: string; signal: string;
  warmth: number; best_path: string;
}
interface Partner {
  name: string; type: string; reason: string; owners_unlocked: number;
  last_interaction: string;
}

const DUMMY_OWNERS: Owner[] = [
  { name: "Michael Torres", company: "Torres Construction", reason: "Growing 3-location contractor, no agent of record", signal: "Filed 2 building permits this month", warmth: 94, best_path: "Via Doug Martinez — they golf together" },
  { name: "Lisa Wang", company: "Pacific Rim Imports", reason: "Current policy is 18% overpriced based on risk profile", signal: "Renewed lease for expanded warehouse", warmth: 87, best_path: "Via Sarah Mitchell — same BNI chapter" },
  { name: "Robert Chen", company: "Chen's Auto Group", reason: "3 locations, all insured separately — bundling opportunity", signal: "Opened 4th location last quarter", warmth: 82, best_path: "Via James Whitfield — board connection" },
  { name: "Angela Foster", company: "Foster Medical Group", reason: "Malpractice carrier exiting the state, needs new coverage", signal: "Carrier withdrawal announced Mar 1", warmth: 91, best_path: "Via Rachel Kim — shared patient referral network" },
  { name: "David Park", company: "Park & Associates Law", reason: "Professional liability renewal in 60 days, shopping", signal: "Posted about 'insurance review' on LinkedIn", warmth: 76, best_path: "Via Tom Nguyen — former classmates" },
  { name: "Jennifer Ross", company: "Bright Horizons Daycare", reason: "Expanding to second location, will need commercial package", signal: "SBA loan approved for expansion", warmth: 85, best_path: "Via Diana Cho — shared accountant" },
  { name: "Carlos Mendez", company: "Mendez Trucking", reason: "Fleet growing, current MGA can't handle 20+ units", signal: "Added 6 trucks to fleet this quarter", warmth: 79, best_path: "Via Alex Rivera — vendor relationship" },
  { name: "Patricia Lane", company: "Lane Real Estate", reason: "E&O policy lapsed — urgent need", signal: "License renewed but no active policy on file", warmth: 92, best_path: "Via Priya Patel — co-listed a property" },
  { name: "Steven Wright", company: "Wright Manufacturing", reason: "Workers comp experience mod dropping — savings pitch", signal: "Safety program resulted in 0 claims, 2 years", warmth: 68, best_path: "Via Marcus Lee — industry conference contact" },
  { name: "Sandra Kim", company: "Kim's Restaurant Group", reason: "5 locations, liquor liability needs review", signal: "Opening 6th location downtown next month", warmth: 73, best_path: "Via Linda Chen — landlord connection" },
];

const DUMMY_PARTNERS: Partner[] = [
  { name: "Doug Martinez", type: "CPA", reason: "Refers 3-4 business owners quarterly. Trusted advisor to mid-market contractors.", owners_unlocked: 12, last_interaction: "Coffee meeting, 3 days ago" },
  { name: "Sarah Mitchell", type: "Attorney", reason: "Estate planning clients often need life/disability. Strong referral track record.", owners_unlocked: 9, last_interaction: "Sent referral last week" },
  { name: "James Whitfield", type: "Financial Advisor", reason: "Wealth clients need umbrella + key person coverage. Cross-sells naturally.", owners_unlocked: 8, last_interaction: "Joint client review, 2 weeks ago" },
  { name: "Rachel Kim", type: "Commercial Lender", reason: "Loan closings require insurance — built-in pipeline feed.", owners_unlocked: 11, last_interaction: "Lunch meeting, 1 week ago" },
  { name: "Tom Nguyen", type: "Real Estate Broker", reason: "Commercial deals need property/liability. High-value referrals.", owners_unlocked: 7, last_interaction: "Phone call, 10 days ago" },
  { name: "Diana Cho", type: "HR Consultant", reason: "Advises companies on benefits — natural group health intro.", owners_unlocked: 6, last_interaction: "LinkedIn message, 5 days ago" },
  { name: "Priya Patel", type: "Business Consultant", reason: "Helps startups with risk management — warm intro pipeline.", owners_unlocked: 5, last_interaction: "Conference panel together, 3 weeks ago" },
  { name: "Alex Rivera", type: "Mortgage Broker", reason: "Home buyers need homeowners + life insurance at closing.", owners_unlocked: 10, last_interaction: "Referral received yesterday" },
  { name: "Marcus Lee", type: "Chamber Board", reason: "Connected to every local business owner. Kingmaker.", owners_unlocked: 15, last_interaction: "Board meeting, 1 week ago" },
  { name: "Linda Chen", type: "Property Manager", reason: "Manages 40+ properties — renter's + landlord coverage pipeline.", owners_unlocked: 8, last_interaction: "Email thread, 4 days ago" },
];

const OUTREACH_STEPS = [
  { title: "Week 1: Warm Introduction", items: ["Have Doug Martinez introduce you via email or phone", "Send a personalized intro note referencing the shared connection", "Include a brief value proposition specific to their industry"] },
  { title: "Week 2: Value-First Follow-Up", items: ["Share a relevant industry insight or market report", "Offer a complimentary risk assessment or coverage review", "Reference a specific trigger signal to show you understand their needs"] },
  { title: "Week 3: Schedule the Meeting", items: ["Propose 2-3 specific meeting times", "Offer both virtual and in-person options", "Prepare a tailored presentation addressing their key pain points"] },
  { title: "Week 4: Close & Nurture", items: ["Present customized coverage options", "Provide competitive pricing analysis", "Set up ongoing quarterly check-ins for relationship building"] },
];

/* ── Helpers ── */
const touchIcon = (type: string) => {
  switch (type) {
    case "call": return <Phone className="h-3.5 w-3.5" />;
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "text": return <MessageSquare className="h-3.5 w-3.5" />;
    case "linkedin": return <Linkedin className="h-3.5 w-3.5" />;
    case "meeting": return <Calendar className="h-3.5 w-3.5" />;
    case "gift": return <Gift className="h-3.5 w-3.5" />;
    default: return <Check className="h-3.5 w-3.5" />;
  }
};

const triggerIcon = (type: string) => {
  switch (type) {
    case "renewal": return <Calendar className="h-4 w-4 text-warning" />;
    case "news": return <TrendingUp className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />;
    case "filing": return <FileText className="h-4 w-4" style={{ color: "hsl(262 83% 58%)" }} />;
    case "event": return <Calendar className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />;
    case "permit": return <MapPin className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />;
    case "social": return <User className="h-4 w-4 text-blue-400" />;
    default: return <Zap className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />;
  }
};

const urgencyColor = (u: string) => {
  if (u === "high") return "text-destructive border-destructive/30";
  if (u === "medium") return "text-warning border-warning/30";
  return "text-muted-foreground";
};

const warmthColor = (w: number) => {
  if (w >= 85) return { color: "hsl(142 71% 45%)", borderColor: "hsl(142 71% 25% / 0.3)" };
  if (w >= 70) return { color: "hsl(174 97% 40%)", borderColor: "hsl(174 97% 22% / 0.3)" };
  return { color: "hsl(45 93% 47%)", borderColor: "hsl(45 93% 30% / 0.3)" };
};

/* ── Main Component ── */
export default function DemoOutreachTab() {
  const [section, setSection] = useState("tiers");
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{ contact: CadenceContact; type: string } | null>(null);
  const [emailBody, setEmailBody] = useState("");
  const [textMsg, setTextMsg] = useState("");
  const [triggerAction, setTriggerAction] = useState<{ trigger: Trigger; type: "meeting" | "email" } | null>(null);
  const [triggerEmailBody, setTriggerEmailBody] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const [planTarget, setPlanTarget] = useState<Owner | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

  const overdue = DUMMY_CONTACTS.filter(c => c.overdue);
  const filtered = filter === "all" ? DUMMY_CONTACTS : filter === "overdue" ? overdue : DUMMY_CONTACTS.filter(c => c.tier === filter);

  const handleAction = (contact: CadenceContact, type: string) => {
    if (type === "call") {
      setActionDialog({ contact, type: "call" });
    } else if (type === "email") {
      setEmailBody(`Hi ${contact.name.split(" ")[0]},\n\nJust checking in — wanted to make sure everything is going well on your end.\n\nLet me know if there's anything I can help with.\n\nBest regards`);
      setActionDialog({ contact, type: "email" });
    } else if (type === "text") {
      setTextMsg(`Hey ${contact.name.split(" ")[0]}, just checking in! Let me know if you need anything.`);
      setActionDialog({ contact, type: "text" });
    } else if (type === "linkedin") {
      toast.success(`Opening LinkedIn profile for ${contact.name}`);
    } else if (type === "meeting") {
      setActionDialog({ contact, type: "meeting" });
    } else {
      toast.success(`${type} touch logged for ${contact.name}`);
    }
  };

  const openTriggerAction = (t: Trigger, type: "meeting" | "email") => {
    setTriggerAction({ trigger: t, type });
    if (type === "email") {
      setTriggerEmailBody(`Hi ${t.person.split(" ")[0]},\n\nI noticed ${t.description.toLowerCase()} I'd love to discuss how this impacts your coverage and explore some options.\n\nWould you have time for a quick call this week?\n\nBest regards`);
    }
  };

  const generatePlan = (owner: Owner) => {
    setPlanTarget(owner);
    setShowPlan(true);
    setVisibleSteps(0);
  };

  useEffect(() => {
    if (!showPlan) return;
    if (visibleSteps >= OUTREACH_STEPS.length) return;
    const timer = setTimeout(() => setVisibleSteps(v => v + 1), 600);
    return () => clearTimeout(timer);
  }, [showPlan, visibleSteps]);

  // Outreach plan view
  if (showPlan && planTarget) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(174 97% 40%)" }} />
            <h2 className="text-sm font-semibold text-white">Outreach Plan for {planTarget.name}</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPlan(false)}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
        <Card style={{ background: "hsl(174 97% 22% / 0.06)", borderColor: "hsl(174 97% 22% / 0.15)" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{planTarget.name}</p>
                <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>{planTarget.company}</p>
              </div>
              <Badge variant="outline" style={warmthColor(planTarget.warmth)} className="text-[10px]">{planTarget.warmth}% warm</Badge>
            </div>
            <p className="text-xs mt-2" style={{ color: "hsl(240 5% 46%)" }}>Best path: {planTarget.best_path}</p>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {OUTREACH_STEPS.map((step, i) => {
            if (i >= visibleSteps) return null;
            return (
              <Card key={i} className="overflow-hidden animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: `${i * 150}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{i + 1}</div>
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {step.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs animate-fade-in" style={{ color: "hsl(240 5% 60%)", animationDelay: `${i * 150 + (j + 1) * 100}ms` }}>
                        <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
          {visibleSteps < OUTREACH_STEPS.length && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-xs animate-pulse" style={{ color: "hsl(174 97% 40%)" }}>
                <Sparkles className="h-4 w-4" /> Building your outreach plan...
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Section tabs */}
      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="h-9 p-0.5" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
          <TabsTrigger value="tiers" className="text-xs gap-1.5 data-[state=active]:text-white" style={{ color: "hsl(240 5% 46%)" }}>
            <Send className="h-3.5 w-3.5" /> Tiers
          </TabsTrigger>
          <TabsTrigger value="top10" className="text-xs gap-1.5 data-[state=active]:text-white" style={{ color: "hsl(240 5% 46%)" }}>
            <Crown className="h-3.5 w-3.5" /> Top 10
          </TabsTrigger>
        </TabsList>

        {/* ── TIERS ── */}
        <TabsContent value="tiers" className="mt-4 space-y-4 animate-fade-in">
          {/* Tier Explainer */}
          <Card style={{ background: "hsl(174 97% 22% / 0.04)", borderColor: "hsl(174 97% 22% / 0.12)" }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
                <p className="text-sm font-semibold text-white">How Tiers &amp; Cadence Work</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "hsl(240 5% 56%)" }}>
                Every contact is assigned a tier based on their value to your book of business. The tier determines how often you should reach out — your <span className="font-medium text-white">cadence</span>. AURA tracks your last touch and counts down to the next one so no relationship goes cold.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { tier: "S", days: 7, desc: "Weekly", color: "bg-warning/10 text-warning border-warning/20" },
                  { tier: "A", days: 14, desc: "Bi-weekly", color: "bg-success/10 text-success border-success/20" },
                  { tier: "B", days: 30, desc: "Monthly", color: "" },
                  { tier: "C", days: 90, desc: "Quarterly", color: "" },
                ].map(t => (
                  <div key={t.tier} className={`rounded-lg p-2.5 text-center border ${t.color}`}
                    style={!t.color ? { background: "hsl(240 5% 12%)", borderColor: "hsl(240 6% 18%)" } : {}}>
                    <p className="text-sm font-bold">{t.tier}-Tier</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "hsl(240 5% 50%)" }}>Every {t.days} days</p>
                    <p className="text-[10px] font-medium" style={{ color: "hsl(174 97% 40%)" }}>{t.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px]" style={{ color: "hsl(240 5% 40%)" }}>
                <span className="text-destructive font-medium">Overdue</span> contacts have passed their cadence window and should be prioritized. Touches include calls, emails, texts, LinkedIn messages, meetings, and gifts.
              </p>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-3">
            {[
              { val: DUMMY_CONTACTS.length, label: "Active Contacts", color: "text-white" },
              { val: overdue.length, label: "Overdue", color: "text-destructive" },
              { val: DUMMY_CONTACTS.reduce((s, c) => s + c.touchCount, 0), label: "Total Touches", color: "" },
            ].map((s, i) => (
              <Card key={i} className="flex-1 min-w-[140px] animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: `${i * 80}ms` }}>
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`} style={!s.color ? { color: "hsl(174 97% 40%)" } : {}}>{s.val}</p>
                  <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "overdue", label: `Overdue (${overdue.length})` },
              { key: "S", label: "S-Tier" },
              { key: "A", label: "A-Tier" },
              { key: "B", label: "B-Tier" },
              { key: "C", label: "C-Tier" },
            ].map(f => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} className="text-xs h-7" onClick={() => setFilter(f.key)}
                style={filter === f.key ? { background: "hsl(174 97% 22%)" } : {}}>
                {f.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((c, idx) => {
              const isExpanded = expanded === c.id;
              return (
                <Card key={c.id} className={`overflow-hidden transition-colors ${c.overdue ? "border-destructive/30" : ""}`}
                  style={{ background: "hsl(240 8% 9%)", borderColor: c.overdue ? undefined : "hsl(240 6% 14%)", animation: `smoothFadeSlide 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 40}ms both` }}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0 ${
                        c.tier === "S" ? "bg-warning/10 text-warning" :
                        c.tier === "A" ? "bg-success/10 text-success" :
                        ""
                      }`} style={
                        c.tier === "B" ? { background: "hsl(174 97% 22% / 0.1)", color: "hsl(174 97% 40%)" } :
                        c.tier === "C" ? { background: "hsl(240 5% 15%)", color: "hsl(240 5% 46%)" } : {}
                      }>{c.tier}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate text-white">{c.name}</p>
                          {c.overdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        </div>
                        <p className="text-[11px] truncate" style={{ color: "hsl(240 5% 46%)" }}>{c.company}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-medium ${c.overdue ? "text-destructive" : ""}`} style={!c.overdue ? { color: "hsl(240 5% 46%)" } : {}}>{c.nextTouch}</p>
                        <p className="text-[10px]" style={{ color: "hsl(240 5% 36%)" }}>Last: {c.lastTouch}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid hsl(240 6% 14%)", animation: "smoothFadeSlide 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
                        <div className="flex items-center gap-4 text-xs" style={{ color: "hsl(240 5% 46%)" }}>
                          <span>Every {c.cadenceDays} days</span>
                          <span>{c.touchCount} total touches</span>
                          <span className="flex items-center gap-1">Last: {touchIcon(c.lastTouchType)} {c.lastTouchType}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {["call", "email", "text", "linkedin", "meeting"].map(type => (
                            <Button key={type} size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleAction(c, type)}>
                              {touchIcon(type)} {type}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TOP 10 ── */}
        <TabsContent value="top10" className="mt-4 space-y-4" style={{ animation: "smoothFadeSlide 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Target className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
                  Top 10 Owners to Reach
                </CardTitle>
                <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>Ranked by warmth and trigger signals</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {DUMMY_OWNERS.map((o, i) => (
                  <div key={i} className="p-2.5 rounded-lg hover:bg-white/[0.03] transition-all" style={{ background: "hsl(240 6% 7%)", animation: `smoothFadeSlide 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both` }}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{i + 1}</div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate text-white">{o.name}</p>
                          <Badge variant="outline" className="text-[9px] shrink-0" style={warmthColor(o.warmth)}>{o.warmth}% warm</Badge>
                        </div>
                        <p className="text-xs truncate" style={{ color: "hsl(240 5% 46%)" }}>{o.company}</p>
                        <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>{o.reason}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Zap className="h-3 w-3 shrink-0 text-warning" />
                          <span className="text-[10px] text-warning">{o.signal}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
                          <span className="text-[10px]" style={{ color: "hsl(174 97% 40%)" }}>{o.best_path}</span>
                        </div>
                        <Button size="sm" variant="outline" className="text-[10px] h-6 mt-1.5 gap-1" onClick={() => generatePlan(o)}>
                          <Sparkles className="h-3 w-3" /> Generate Outreach Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Handshake className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
                  Top 10 Partners to Deepen
                </CardTitle>
                <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>CPAs, attorneys, lenders who unlock the most owners</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {DUMMY_PARTNERS.map((p, i) => (
                  <div key={i} className="p-2.5 rounded-lg hover:bg-white/[0.03] transition-all" style={{ background: "hsl(240 6% 7%)", animation: `smoothFadeSlide 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both` }}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{i + 1}</div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate text-white">{p.name}</p>
                          <Badge variant="outline" className="text-[9px] shrink-0" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 60%)" }}>{p.type}</Badge>
                        </div>
                        <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>{p.reason}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="text-[9px]" style={{ background: "hsl(240 5% 15%)", color: "hsl(240 5% 60%)" }}>
                            <Users className="h-3 w-3 mr-1" />{p.owners_unlocked} owners unlocked
                          </Badge>
                        </div>
                        <p className="text-[10px] italic" style={{ color: "hsl(240 5% 36%)" }}>{p.last_interaction}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Signals hidden for now */}
      </Tabs>

      {/* Cadence Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          {actionDialog?.type === "call" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Call {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-center py-4">
                <Phone className="h-12 w-12 mx-auto" style={{ color: "hsl(174 97% 40%)" }} />
                <p className="text-2xl font-bold text-white">{actionDialog.contact.phone}</p>
                <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>{actionDialog.contact.company}</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { navigator.clipboard.writeText(actionDialog.contact.phone); toast.success("Number copied!"); }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                  <Button size="sm" className="text-xs gap-1" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Calling ${actionDialog.contact.name}...`); setActionDialog(null); }}>
                    <Phone className="h-3 w-3" /> Call Now
                  </Button>
                </div>
              </div>
            </>
          )}
          {actionDialog?.type === "email" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Email {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input defaultValue={actionDialog.contact.email} readOnly className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <Input placeholder="Subject:" defaultValue={`Checking in — ${actionDialog.contact.company}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className="w-full h-32 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Email sent to ${actionDialog.contact.name}`); setActionDialog(null); }}>
                  <Send className="h-3 w-3 mr-1.5" /> Send
                </Button>
              </div>
            </>
          )}
          {actionDialog?.type === "text" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Text {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-white">{actionDialog.contact.phone}</p>
                <textarea value={textMsg} onChange={(e) => setTextMsg(e.target.value)} className="w-full h-24 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Text sent to ${actionDialog.contact.name}`); setActionDialog(null); }}>
                  <MessageSquare className="h-3 w-3 mr-1.5" /> Send Text
                </Button>
              </div>
            </>
          )}
          {actionDialog?.type === "meeting" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Schedule Meeting with {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Meeting title" defaultValue={`Check-in with ${actionDialog.contact.name}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                  <Input type="time" defaultValue="10:00" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                </div>
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Meeting scheduled with ${actionDialog.contact.name}`); setActionDialog(null); }}>
                  <Calendar className="h-3 w-3 mr-1.5" /> Schedule
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Trigger Action Dialog */}
      <Dialog open={!!triggerAction} onOpenChange={() => setTriggerAction(null)}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          {triggerAction?.type === "meeting" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Schedule Meeting with {triggerAction.trigger.person}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
                  <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Re: {triggerAction.trigger.title}</p>
                  <p className="text-sm text-white mt-1">{triggerAction.trigger.person} — {triggerAction.trigger.company}</p>
                </div>
                <Input placeholder="Meeting title" defaultValue={`Discuss: ${triggerAction.trigger.title}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                  <Input type="time" defaultValue="10:00" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                </div>
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Meeting scheduled with ${triggerAction.trigger.person}`); setTriggerAction(null); }}>
                  <Calendar className="h-3 w-3 mr-1.5" /> Schedule & Send Invite
                </Button>
              </div>
            </>
          )}
          {triggerAction?.type === "email" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Email {triggerAction.trigger.person}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="To:" defaultValue={triggerAction.trigger.email} readOnly className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <Input placeholder="Subject:" defaultValue={`Re: ${triggerAction.trigger.title}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <textarea value={triggerEmailBody} onChange={(e) => setTriggerEmailBody(e.target.value)} className="w-full h-32 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Email sent to ${triggerAction.trigger.person}`); setTriggerAction(null); }}>
                  <Send className="h-3 w-3 mr-1.5" /> Send Email
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
