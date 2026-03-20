import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calculator, Wand2, FileText, Copy, Loader2,
  DollarSign, TrendingUp, Handshake, Sparkles,
  BookOpen, Share2, Download,
} from "lucide-react";

/* ═══ ROI ESTIMATOR ═══ */
function ROIEstimator() {
  const [industry, setIndustry] = useState("");
  const [avgDeal, setAvgDeal] = useState("");
  const [referralsPerYear, setReferralsPerYear] = useState("");
  const [showResult, setShowResult] = useState(false);

  const dealVal = parseFloat(avgDeal) || 0;
  const refsPerYear = parseInt(referralsPerYear) || 0;
  const annualValue = dealVal * refsPerYear;
  const lifetimeValue = annualValue * 5; // 5-year LTV

  const tierLabel = annualValue >= 100000 ? "S-Tier" : annualValue >= 50000 ? "A-Tier" : annualValue >= 20000 ? "B-Tier" : "C-Tier";
  const tierColor = annualValue >= 100000 ? "text-warning" : annualValue >= 50000 ? "text-success" : annualValue >= 20000 ? "text-primary" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Relationship ROI Estimator
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          See the annualized value of any referral relationship
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Partner Industry</label>
            <Input placeholder="CPA, Lender, Attorney..." value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Deal Size ($)</label>
            <Input type="number" placeholder="15000" value={avgDeal} onChange={e => setAvgDeal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Referrals/Year</label>
            <Input type="number" placeholder="12" value={referralsPerYear} onChange={e => setReferralsPerYear(e.target.value)} />
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowResult(true)}
          disabled={!avgDeal || !referralsPerYear}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Calculate
        </Button>

        {showResult && dealVal > 0 && refsPerYear > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Annual Value</p>
                <p className="text-xl font-bold text-success">${annualValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">5-Year LTV</p>
                <p className="text-xl font-bold">${lifetimeValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Tier Rating</p>
                <p className={`text-xl font-bold ${tierColor}`}>{tierLabel}</p>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground text-center italic">
              {industry ? `A nurtured ${industry} relationship` : "This relationship"} at {refsPerYear} referrals/year 
              is worth <span className="font-semibold text-foreground">${annualValue.toLocaleString()}/yr</span> — 
              treat it accordingly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══ WARM INTRO GENERATOR ═══ */
function WarmIntroGenerator() {
  const { user } = useAuth();
  const [targetName, setTargetName] = useState("");
  const [targetContext, setTargetContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");

  const handleGenerate = async () => {
    if (!targetName.trim()) return;
    setLoading(true);
    setGeneratedMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a warm introduction message writer for sales professionals. Write a brief, professional warm intro message that a referral partner can send to introduce someone to "${targetName}". Context: ${targetContext || "business introduction"}. Keep it under 4 sentences, warm but professional. Just the message text, no subject line.`,
          },
        },
      });
      if (error) throw error;
      setGeneratedMessage(data?.text || data?.response || "Could not generate message.");
    } catch {
      toast.error("Failed to generate intro");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success("Copied to clipboard");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-accent" />
          Warm Intro Request Card
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Generate a ready-to-send intro message in seconds
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Who do you want to reach?</label>
            <Input placeholder="John Smith, CEO of Acme Corp" value={targetName} onChange={e => setTargetName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Context / Why</label>
            <Input placeholder="Needs commercial GL review, expanding to 3 locations" value={targetContext} onChange={e => setTargetContext(e.target.value)} />
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleGenerate} disabled={loading || !targetName.trim()}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate Intro Message
        </Button>

        {generatedMessage && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 animate-in fade-in-0 duration-300">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{generatedMessage}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══ CONTENT LIBRARY ═══ */
const CONTENT_TEMPLATES = [
  {
    title: "Top 3 Signs a Business Owner Is Underinsured",
    category: "Insurance",
    type: "Email Template",
    body: "Hi [Name],\n\nI was reviewing some industry data and three warning signs kept coming up that business owners miss:\n\n1. Revenue grew 20%+ but coverage limits haven't changed\n2. Added new services/locations without updating the policy\n3. Relying on a single carrier without competitive benchmarking\n\nIf any of these ring true for your clients, I'd love to help them get a quick coverage review — no pressure, just peace of mind.\n\nBest,\n[Your Name]",
  },
  {
    title: "Did You Know? — Manufacturing Risk Gaps",
    category: "Manufacturing",
    type: "LinkedIn Post",
    body: "🏭 Did you know that 40% of mid-size manufacturers are underinsured for equipment breakdown?\n\nMost policies cover fire and theft — but not the mechanical failure that actually shuts down production lines.\n\nIf you work with manufacturers, this is worth a conversation. Happy to run a quick gap analysis for any of your clients.\n\n#Insurance #Manufacturing #RiskManagement",
  },
  {
    title: "Referral Thank You — Closed Deal",
    category: "Referral",
    type: "Email Template",
    body: "Hi [Partner Name],\n\nJust wanted to let you know — the introduction you made to [Client Name] turned into a signed policy this week.\n\nYour referral made this possible, and I genuinely appreciate the trust you put in me. If there's ever anyone in my network I can connect you with, please don't hesitate to ask.\n\nLooking forward to our next conversation.\n\nBest,\n[Your Name]",
  },
  {
    title: "New Business Congratulations Note",
    category: "Relationship",
    type: "Text/Email",
    body: "Hey [Name] — saw the news about [milestone]. Congratulations! That's a huge accomplishment. Would love to catch up over coffee when things settle down. No agenda, just want to hear how things are going.",
  },
  {
    title: "Quarterly Check-In Template",
    category: "Relationship",
    type: "Email Template",
    body: "Hi [Name],\n\nHope Q[X] has been strong for you. A few things I wanted to flag:\n\n• [Industry trend or news relevant to their clients]\n• A resource I came across that might be useful: [link]\n• If any of your clients have upcoming renewals, I'm happy to run a quick market check\n\nNo rush on any of this — just wanted to stay connected and add value where I can.\n\nBest,\n[Your Name]",
  },
];

function ContentLibrary() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (body: string, title: string) => {
    navigator.clipboard.writeText(body);
    setCopied(title);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-warning" />
          Co-Branded Content Library
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Ready-to-send emails, posts, and templates — personalize in 2 clicks
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {CONTENT_TEMPLATES.map((t, i) => (
          <div key={i} className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{t.title}</p>
                  <Badge variant="outline" className="text-[9px]">{t.type}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{t.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 gap-1 h-8"
                onClick={() => handleCopy(t.body, t.title)}
              >
                {copied === t.title ? <span className="text-xs text-success">Copied!</span> : <><Copy className="h-3 w-3" /> Copy</>}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ═══ MAIN EXPORT ═══ */
export default function ConnectToolsTab() {
  return (
    <div className="space-y-4">
      <ROIEstimator />
      <WarmIntroGenerator />
      <ContentLibrary />
    </div>
  );
}
