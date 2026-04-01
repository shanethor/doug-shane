import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Bot, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuraAgentUpsellModal from "@/components/AuraAgentUpsellModal";

export default function AuraAgentLeadPromo() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
    <Card className="border-none overflow-hidden" style={{
      background: "linear-gradient(135deg, hsl(25 80% 10%), hsl(30 60% 6%))",
      border: "1px solid hsl(25 80% 25%)",
    }}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{ background: "hsl(25 90% 50% / 0.2)" }}>
            <Bot className="h-6 w-6 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                Let an AI Sales Agent Handle Your Outreach
              </h3>
              <Badge className="text-[9px] bg-orange-500">AURA Agent</Badge>
            </div>
            <p className="text-xs leading-relaxed mb-3 text-orange-200/60">
              Your dedicated AI agent manages client outreach, follow-ups, and marketing —
              so you only focus on closing the hottest deals.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-300">
                <Sparkles className="h-3 w-3" /> 2× free leads monthly
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-300">
                <Zap className="h-3 w-3" /> 50% off all purchased leads
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/book/aura-agent">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs border-orange-500/30 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200">
                  <Calendar className="h-3.5 w-3.5" /> Schedule a Call
                </Button>
              </Link>
              <Button size="sm" className="gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setShowModal(true)}>
                Begin Deployment <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[9px] text-orange-200/40 mt-2 leading-snug">
              Deployment begins immediately — onboarding call required before go-live. Full agent setup takes 24–72 hours.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    <AuraAgentUpsellModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
