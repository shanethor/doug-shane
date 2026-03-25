import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Wrench, Clock, CheckCircle2, CalendarDays, ArrowRight,
  Send, Sparkles, MessageSquare, Building2, ChevronDown, ChevronUp,
} from "lucide-react";

/* ── Fake maintenance request flow ── */
type DemoRequest = {
  id: string;
  title: string;
  description: string;
  submittedAt: Date;
  scheduledDate: string;
  status: "submitted" | "scheduled" | "in_progress" | "complete";
};

const DEMO_EXISTING: DemoRequest[] = [
  {
    id: "req-001", title: "Custom CRM with pipeline tracking",
    description: "We need a CRM tailored to our sales process with automated follow-ups and deal stages.",
    submittedAt: new Date(Date.now() - 86400000 * 3), scheduledDate: "Mar 28, 2026", status: "scheduled",
  },
  {
    id: "req-002", title: "AI agents for customer service",
    description: "Integrate AI chatbots to handle tier-1 support tickets and route complex issues to humans.",
    submittedAt: new Date(Date.now() - 86400000 * 7), scheduledDate: "Mar 22, 2026", status: "complete",
  },
];

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export default function StudioDemo() {
  const [requests, setRequests] = useState<DemoRequest[]>(DEMO_EXISTING);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [latestReq, setLatestReq] = useState<DemoRequest | null>(null);
  const [showHow, setShowHow] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const scheduled = addBusinessDays(new Date(), 3);
    const req: DemoRequest = {
      id: `req-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      submittedAt: new Date(),
      scheduledDate: scheduled.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "scheduled",
    };
    setRequests(prev => [req, ...prev]);
    setLatestReq(req);
    setSubmitted(true);
    setTitle("");
    setDescription("");
  };

  const statusColor: Record<string, string> = {
    submitted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    scheduled: "bg-primary/10 text-primary border-primary/20",
    in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-white">
      {/* Top bar */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline text-white">
          <Sparkles className="h-5 w-5 text-[#F59E0B]" />
          <span className="text-lg font-bold tracking-tight">Aura Studio</span>
        </Link>
        <Link
          to="/book/aura-studio"
          className="inline-flex items-center gap-2 text-sm font-medium border border-[#F59E0B]/30 text-[#F59E0B] px-4 py-2 rounded-lg hover:bg-[#F59E0B]/[0.06] transition-all no-underline"
        >
          <CalendarDays className="h-4 w-4" />
          Schedule a call
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            See what Aura Studio builds for you
          </h1>
          <p className="text-[#A1A1AA] max-w-xl mx-auto text-sm">
            Submit a maintenance request below. Watch how our AI instantly triages, schedules,
            and communicates — no manual follow-up needed.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Submit form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#111113] border-white/[0.06]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Wrench className="h-4 w-4 text-[#F59E0B]" />
                  New Maintenance Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-[#A1A1AA]">Issue Title *</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Broken window latch — Unit 2A"
                    className="bg-[#09090B] border-white/[0.08] text-white placeholder:text-[#52525B]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#A1A1AA]">Description</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Details about the issue…"
                    rows={3}
                    className="bg-[#09090B] border-white/[0.08] text-white placeholder:text-[#52525B]"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim()}
                  className="w-full bg-[#F59E0B] text-[#08080A] hover:bg-[#FBBF24] gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit Request
                </Button>
              </CardContent>
            </Card>

            {/* AI response */}
            {submitted && latestReq && (
              <Card className="bg-[#111113] border-[#F59E0B]/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">Aura Studio AI</p>
                      <div className="text-sm text-[#D4D4D8] space-y-2">
                        <p>
                          Got it! I've logged <strong className="text-white">"{latestReq.title}"</strong> and
                          assigned it to your maintenance queue.
                        </p>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                          <CalendarDays className="h-4 w-4 text-emerald-400 shrink-0" />
                          <p className="text-emerald-300 text-sm">
                            <strong>Scheduled completion:</strong> {latestReq.scheduledDate}
                          </p>
                        </div>
                        <p className="text-[#A1A1AA] text-xs">
                          The tenant will receive an automated email with the expected date and a link
                          to track progress. You'll be notified when it's marked complete.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Request queue */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wide">Request Queue</h2>
              <Badge variant="outline" className="text-[10px] border-white/[0.08] text-[#A1A1AA]">
                {requests.length} total
              </Badge>
            </div>

            <div className="space-y-3">
              {requests.map(req => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-[#111113] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{req.title}</p>
                      {req.description && (
                        <p className="text-xs text-[#71717A] line-clamp-1">{req.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-[#52525B] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {req.submittedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-[11px] text-[#52525B] flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          Due {req.scheduledDate}
                        </span>
                      </div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${statusColor[req.status]}`}>
                      {req.status === "in_progress" ? "In Progress" : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHow(!showHow)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">How Aura Studio Works</h3>
                <p className="text-xs text-[#71717A]">End-to-end AI automation, custom-built for your firm</p>
              </div>
            </div>
            {showHow ? <ChevronUp className="h-5 w-5 text-[#52525B]" /> : <ChevronDown className="h-5 w-5 text-[#52525B]" />}
          </button>

          {showHow && (
            <div className="px-5 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="h-px bg-white/[0.06]" />
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  {
                    icon: <Send className="h-5 w-5" />,
                    title: "1. Submit a Request",
                    desc: "Tenants, clients, or your team submit requests through a branded portal, email, or text. Aura captures everything automatically.",
                  },
                  {
                    icon: <Sparkles className="h-5 w-5" />,
                    title: "2. AI Triages & Schedules",
                    desc: "Our AI reads the request, categorizes it, assigns priority, estimates completion, and sends a confirmation — all in seconds.",
                  },
                  {
                    icon: <CheckCircle2 className="h-5 w-5" />,
                    title: "3. Track & Close",
                    desc: "Everyone stays in the loop with automated status updates. You get a dashboard showing every request from open to complete.",
                  },
                ].map((step, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#09090B] border border-white/[0.04] space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                      {step.icon}
                    </div>
                    <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-[#F59E0B]/[0.04] border border-[#F59E0B]/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#F59E0B]" />
                  <h4 className="text-sm font-semibold text-white">This is just one workflow.</h4>
                </div>
                <p className="text-xs text-[#D4D4D8] leading-relaxed">
                  Aura Studio builds <strong>custom AI tools</strong> for your specific business — CRM automations,
                  document processing, client intake, compliance tracking, and more. We design, build, and maintain
                  them so you can focus on growth. Pricing starts at <strong>$1,500/month</strong> with a 3-month minimum.
                </p>
                <Link
                  to="/book/aura-studio"
                  className="inline-flex items-center gap-2 text-sm font-medium bg-[#F59E0B] text-[#08080A] px-5 py-2.5 rounded-lg hover:bg-[#FBBF24] transition-colors no-underline"
                >
                  Schedule a discovery call
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* CTA strip */}
        <div className="text-center space-y-4 py-6">
          <p className="text-[#71717A] text-sm">Ready to see what AI can do for your firm?</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/book/aura-studio"
              className="inline-flex items-center gap-2 text-sm font-medium bg-[#F59E0B] text-[#08080A] px-7 py-3 rounded-[10px] hover:bg-[#FBBF24] transition-colors no-underline"
            >
              <CalendarDays className="h-4 w-4" />
              Schedule a call with our team
            </Link>
            <Link
              to="/"
              className="text-sm text-[#71717A] hover:text-white transition-colors no-underline"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
