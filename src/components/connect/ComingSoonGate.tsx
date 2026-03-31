import { Lock, Sparkles, BarChart3, Target, Mail, Calendar, Zap, Brain, Network, Wrench, Bot, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

export function ComingSoonGate({ pageName }: { pageName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-3xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
        <Lock className="h-8 w-8 text-orange-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{pageName}</h2>
      <p className="text-lg text-muted-foreground mb-2">Coming Soon</p>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        We're building something amazing. As an early subscriber, you're getting a discounted rate
        while we finish building out all features.
      </p>

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
        <span>Early access pricing: $99.99/mo</span>
      </div>
    </div>
  );
}
