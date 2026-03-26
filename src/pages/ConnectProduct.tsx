import { ProductLayout } from "@/components/ProductLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Mail, Sparkles, Zap, ArrowRight, TrendingUp, Calendar, Network } from "lucide-react";
import { Link } from "react-router-dom";

const MODULES = [
  { icon: Network, label: "Network", desc: "Your relationship intelligence hub", to: "/connect/network", color: "hsl(140,12%,50%)" },
  { icon: BarChart3, label: "Pipeline", desc: "Manage deals & opportunities", to: "/connect/pipeline", color: "hsl(200,70%,50%)" },
  { icon: Mail, label: "Email", desc: "AI-powered email management", to: "/connect/email", color: "hsl(260,60%,55%)" },
  { icon: Calendar, label: "Calendar", desc: "Schedule & meeting management", to: "/connect/calendar", color: "hsl(30,80%,55%)" },
  { icon: Sparkles, label: "Create", desc: "AI marketing & content studio", to: "/connect/create", color: "hsl(320,60%,55%)" },
  { icon: Zap, label: "Sage", desc: "Your AI business assistant", to: "/connect/sage", color: "hsl(50,80%,50%)" },
];

export default function ConnectProduct() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <ProductLayout product="connect">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white/90">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-white/40 mt-1">Your AuRa Connect dashboard</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Connections", value: "—", icon: Users },
            { label: "Active Deals", value: "—", icon: TrendingUp },
            { label: "Unread Emails", value: "—", icon: Mail },
            { label: "This Week", value: "—", icon: Calendar },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-white/30 mb-2">
                <stat.icon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-2xl font-light text-white/70">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Modules grid */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-white/30 mb-4">Your Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((mod) => (
              <Link key={mod.label} to={mod.to}>
                <div className="group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-5 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${mod.color}15` }}>
                      <mod.icon className="h-5 w-5" style={{ color: mod.color }} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/10 group-hover:text-white/30 transition-colors" />
                  </div>
                  <h3 className="text-sm font-medium text-white/80 mb-1">{mod.label}</h3>
                  <p className="text-xs text-white/30">{mod.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting started */}
        <div className="rounded-xl border border-white/5 bg-gradient-to-r from-[hsl(140,12%,15%)] to-[hsl(140,12%,10%)] p-6">
          <h3 className="text-sm font-medium text-white/80 mb-2">Getting Started</h3>
          <p className="text-sm text-white/40 mb-4">
            Connect your accounts to unlock the full power of AuRa's relationship intelligence.
          </p>
          <Link to="/app/settings">
            <Button size="sm" className="gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0">
              Connect Accounts <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </ProductLayout>
  );
}
