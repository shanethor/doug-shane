import { useState } from "react";
import { Lock, Sparkles, BarChart3, Target, Mail, Calendar, Zap, Brain, Network, Wrench, CheckCircle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CURRENT_FEATURES = [
  { icon: Target, label: "AI Lead Generation", desc: "Industry-specific leads sourced from 22+ public data providers" },
  { icon: BarChart3, label: "Sales Pipeline", desc: "Kanban board with production metrics, close rates & stage tracking" },
  { icon: Wrench, label: "AURA Studio", desc: "Custom AI agents, automations & dashboards built by your dedicated team" },
];

const COMING_SOON_FEATURES = [
  { icon: Network, label: "Connect Hub", desc: "Relationship management and networking intelligence" },
  { icon: Brain, label: "Intelligence", desc: "AI-powered market insights and competitive analysis" },
  { icon: Mail, label: "Email", desc: "Smart inbox with AI classification and auto-responses" },
  { icon: Calendar, label: "Calendar", desc: "Meeting prep, context panels, and smart scheduling" },
  { icon: Sparkles, label: "Create", desc: "Marketing collateral, flyers, and campaign tools" },
  { icon: Zap, label: "Sage", desc: "AI-powered sales coach and strategy assistant" },
];

const SUBSCRIPTION_PERKS = [
  "AI-powered lead generation with free monthly leads",
  "Advanced sales pipeline with stage tracking",
  "40% discount on all marketplace leads",
  "Early access to all new features as they launch",
  "Lock in $99/mo during buildout (then $249/mo)",
];

export function ComingSoonGate({ pageName }: { pageName: string }) {
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      if (session) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { product: "connect" },
        });
        if (error) throw error;
        if (data?.url) window.open(data.url, "_blank");
      } else {
        const { data, error } = await supabase.functions.invoke("create-public-checkout", {
          body: {
            price_id: "price_1RUXuREISdUzafyhyp9y2MhF",
            product: "connect",
            success_url: `${window.location.origin}/post-checkout`,
            cancel_url: window.location.href,
          },
        });
        if (error) throw error;
        if (data?.url) window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-3xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
        <Lock className="h-8 w-8 text-orange-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{pageName}</h2>
      <p className="text-lg text-muted-foreground mb-2">Coming Soon</p>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        We're building something amazing. Subscribe now at our early access rate
        and get access to all features as they launch.
      </p>

      {/* Subscribe CTA */}
      <div className="w-full max-w-md mb-8 rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
        <div className="flex items-baseline gap-2 mb-1 justify-center">
          <span className="text-sm line-through text-muted-foreground/50">$249</span>
          <span className="text-3xl font-bold">$99</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Early access rate for 3 months · 3-day free trial</p>

        <ul className="space-y-2 text-left mb-5">
          {SUBSCRIPTION_PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-orange-400" />
              {p}
            </li>
          ))}
        </ul>

        <Button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full gap-2 h-11 bg-orange-500 hover:bg-orange-600 text-white border-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Subscribe to AURA Connect <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Current Features */}
      <div className="w-full mb-6">
        <h3 className="text-sm font-semibold text-left mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          Available Now
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CURRENT_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-left">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="w-full mb-8">
        <h3 className="text-sm font-semibold text-left mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-400" />
          Coming Soon
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMING_SOON_FEATURES.map((f) => {
            const Icon = f.icon;
            const isCurrentPage = f.label === pageName;
            return (
              <div key={f.label} className={`flex items-start gap-3 p-3 rounded-xl border text-left ${
                isCurrentPage ? "border-orange-500/30 bg-orange-500/5" : "border-border/50 bg-card/30"
              }`}>
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  isCurrentPage ? "bg-orange-500/10" : "bg-muted"
                }`}>
                  <Icon className={`h-4 w-4 ${isCurrentPage ? "text-orange-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold">{f.label}</p>
                    {isCurrentPage && <Badge className="text-[8px] px-1 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">You're here</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Early access pricing locked for 3 months</span>
      </div>
    </div>
  );
}
