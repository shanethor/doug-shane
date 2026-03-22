import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target, Handshake, Users, Zap, ArrowRight, Building2,
  Crown, TrendingUp, Sparkles, X,
} from "lucide-react";

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

const warmthColor = (w: number) => {
  if (w >= 85) return { color: "hsl(142 71% 45%)", borderColor: "hsl(142 71% 25% / 0.3)" };
  if (w >= 70) return { color: "hsl(140 12% 58%)", borderColor: "hsl(140 12% 42% / 0.3)" };
  return { color: "hsl(45 93% 47%)", borderColor: "hsl(45 93% 30% / 0.3)" };
};

const OUTREACH_STEPS = [
  { title: "Week 1: Warm Introduction", items: ["Have Doug Martinez introduce you via email or phone", "Send a personalized intro note referencing the shared connection", "Include a brief value proposition specific to their industry"] },
  { title: "Week 2: Value-First Follow-Up", items: ["Share a relevant industry insight or market report", "Offer a complimentary risk assessment or coverage review", "Reference a specific trigger signal to show you understand their needs"] },
  { title: "Week 3: Schedule the Meeting", items: ["Propose 2-3 specific meeting times", "Offer both virtual and in-person options", "Prepare a tailored presentation addressing their key pain points"] },
  { title: "Week 4: Close & Nurture", items: ["Present customized coverage options", "Provide competitive pricing analysis", "Set up ongoing quarterly check-ins for relationship building"] },
];

export default function DemoTop10Tab() {
  const [showPlan, setShowPlan] = useState(false);
  const [planTarget, setPlanTarget] = useState<Owner | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

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

  if (showPlan && planTarget) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
            <h2 className="text-sm font-semibold text-white">Outreach Plan for {planTarget.name}</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPlan(false)}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>

        <Card style={{ background: "hsl(140 12% 42% / 0.06)", borderColor: "hsl(140 12% 42% / 0.15)" }}>
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
              <Card key={i} className="animate-slide-up-fade overflow-hidden" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: `${i * 150}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{i + 1}</div>
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {step.items.map((item, j) => (
                      <li key={j} className="animate-fade-in flex items-start gap-2 text-xs" style={{ color: "hsl(240 5% 60%)", animationDelay: `${i * 150 + (j + 1) * 100}ms` }}>
                        <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
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
              <div className="flex items-center gap-2 text-xs animate-pulse" style={{ color: "hsl(140 12% 58%)" }}>
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
      <div className="flex items-center gap-2 mb-2">
        <Crown className="h-5 w-5 text-warning" />
        <h2 className="text-sm font-semibold text-white">Your Top 10 Intelligence</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 Owners */}
        <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <Target className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              Top 10 Owners to Reach
            </CardTitle>
            <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>Ranked by warmth and trigger signals</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {DUMMY_OWNERS.map((o, i) => (
              <div key={i} className="p-2.5 rounded-lg hover:bg-white/[0.03] transition-all animate-fade-in" style={{ background: "hsl(240 6% 7%)", animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{i + 1}</div>
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
                      <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
                      <span className="text-[10px]" style={{ color: "hsl(140 12% 58%)" }}>{o.best_path}</span>
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

        {/* Top 10 Partners */}
        <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <Handshake className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              Top 10 Partners to Deepen
            </CardTitle>
            <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>CPAs, attorneys, lenders who unlock the most owners</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {DUMMY_PARTNERS.map((p, i) => (
              <div key={i} className="p-2.5 rounded-lg hover:bg-white/[0.03] transition-all animate-fade-in" style={{ background: "hsl(240 6% 7%)", animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{i + 1}</div>
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
    </div>
  );
}
