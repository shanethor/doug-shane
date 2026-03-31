import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench, Zap, CheckCircle, ArrowRight, Loader2, Calendar,
  Code2, BarChart3, Bot, Workflow, Palette, Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STUDIO_PRICE_ID = "price_1TF5I1EISdUzafyhMrDOU8II";
const STUDIO_COUPON_ID = "qj03MTZb";

const FEATURES = [
  { icon: Code2, title: "Custom Software Builds", desc: "Tailored CRM, dashboards, and internal tools built exactly for your workflow." },
  { icon: Bot, title: "Custom AI Agent Integrations", desc: "Deploy custom intelligent agents that automate prospecting, follow-ups, and client comms." },
  { icon: Workflow, title: "Process Automation", desc: "Eliminate manual tasks with end-to-end workflow automation across your stack." },
  { icon: BarChart3, title: "Data Analytics Dashboards", desc: "Real-time insights into your book, pipeline performance, and growth metrics." },
  { icon: Palette, title: "Marketing Assets", desc: "On-brand collateral, landing pages, and campaign tools — designed and deployed." },
  { icon: Shield, title: "Dedicated Build Team", desc: "Your own dev + design team on retainer. Submit requests, get results in days." },
];

const TESTIMONIALS = [
  { quote: "Studio built us a custom quoting tool in 4 days that would have taken months internally.", name: "Regional Agency Principal" },
  { quote: "The custom AI agent they deployed handles 60% of our initial lead qualification now.", name: "Commercial Lines Producer" },
  { quote: "Our renewal retention went up 12% after they automated our re-marketing workflow.", name: "Operations Manager" },
];

const TIME_SAVINGS = [
  { task: "Cold email outreach", without: "8-12 hrs/week", with: "0 hrs/week", saved: "12 hrs" },
  { task: "Lead research & enrichment", without: "5-8 hrs/week", with: "0 hrs/week", saved: "8 hrs" },
  { task: "Follow-up sequences", without: "4-6 hrs/week", with: "< 30 min/week", saved: "5.5 hrs" },
  { task: "Prospect qualification", without: "3-5 hrs/week", with: "< 15 min/week", saved: "4.5 hrs" },
];

// Fake blurred Studio dashboard content
function FakeStudioContent() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AURA Studio</h1>
          <p className="text-sm text-muted-foreground">Your AI-native build team</p>
        </div>
        <Button className="gap-2 bg-orange-500"><Plus className="h-4 w-4" /> New Request</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {["Active Builds", "Delivered", "In Queue", "Avg Delivery"].map((label, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{[3, 12, 2, "3.2d"][i]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Recent Builds</h3>
        <div className="space-y-3">
          {["Custom Quoting Dashboard", "AI Lead Qualifier Agent", "Renewal Automation Pipeline", "Client Portal v2"].map((title, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-orange-400" />
                <span className="text-sm">{title}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{["Building", "Delivered", "In Review", "Delivered"][i]}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 h-48" />
        <div className="rounded-xl border border-border bg-card p-4 h-48" />
      </div>
    </div>
  );
}

// Need to import Plus for the fake content
import { Plus } from "lucide-react";

export default function StudioUpsellPage({ isConnectSubscriber = false }: { isConnectSubscriber?: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: STUDIO_PRICE_ID,
          coupon: isConnectSubscriber ? STUDIO_COUPON_ID : undefined,
          product: "studio",
          success_url: `${window.location.origin}/studio`,
          cancel_url: `${window.location.origin}/connect`,
        },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[80vh] overflow-hidden">
      {/* Blurred fake dashboard behind */}
      <div className="absolute inset-0 blur-[6px] opacity-30 pointer-events-none select-none overflow-hidden">
        <FakeStudioContent />
      </div>

      {/* Overlay */}
      <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-4 py-12">
        <div className="max-w-2xl w-full space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 mx-auto">
              <Wrench className="h-8 w-8 text-orange-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Meet <span className="text-orange-400">AURA Studio</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Your AI-native, on-call build team. We design and ship custom software, AI agents,
              automations, and dashboards — so you can focus on growing your book.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <div className="p-1.5 rounded-lg bg-orange-500/10 shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time savings comparison */}
          <div className="rounded-2xl border border-orange-500/20 bg-card/40 backdrop-blur-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-center">
              Time Spent on Cold Outreach Per Week
            </h3>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/30">
              <span>Task</span>
              <span className="text-center">Without AI Agents</span>
              <span className="text-center text-orange-400">With AURA Studio</span>
            </div>
            {TIME_SAVINGS.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center py-1.5 border-b border-border/10 last:border-0">
                <span className="text-xs text-muted-foreground">{row.task}</span>
                <span className="text-xs text-center text-red-400/80">{row.without}</span>
                <span className="text-xs text-center text-orange-400 font-semibold">{row.with}</span>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-orange-500/20">
              <span className="text-sm font-bold text-orange-400">Save 30+ hours per week</span>
              <span className="text-xs text-muted-foreground">with custom AI agents handling outreach</span>
            </div>
          </div>

          {/* Social proof */}
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4">
                <p className="text-sm italic text-muted-foreground">"{t.quote}"</p>
                <p className="text-xs text-orange-400/80 mt-1.5 font-medium">— {t.name}</p>
              </div>
            ))}
          </div>

          {/* Pricing + CTA */}
          <div className="rounded-2xl border border-orange-500/20 bg-card/60 backdrop-blur-sm p-6 text-center space-y-4">
            <div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold">$1,500</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">3-month minimum commitment</p>
            </div>

            {isConnectSubscriber && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 max-w-sm mx-auto">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">Connect Subscriber Bonus</span>
                </div>
                <p className="text-xs text-orange-200/70">
                  <span className="font-bold text-orange-300">50% off your first month</span> — just $750 to get started.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={handleCheckout}
                disabled={loading}
                size="lg"
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0 h-12 px-8 text-base"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Get Started <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <Link to="/book/aura-studio">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 border-border text-muted-foreground hover:text-foreground h-12 px-6"
                >
                  <Calendar className="h-4 w-4" /> Schedule a call first
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
