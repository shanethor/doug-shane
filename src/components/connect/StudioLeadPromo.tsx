import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Bot, Sparkles } from "lucide-react";

export default function StudioLeadPromo() {
  return (
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
                Integrate Custom AI Agents to Handle Lead Outreach For You
              </h3>
              <Badge className="text-[9px] bg-orange-500">AURA Studio</Badge>
            </div>
            <p className="text-xs leading-relaxed mb-3 text-orange-200/60">
              Our team will build you custom AI agents to manage outreach to your leads — you only need to 
              focus on closing the hottest targets.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-300">
                <Sparkles className="h-3 w-3" /> 3× free leads monthly
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-300">
                <Zap className="h-3 w-3" /> 60% off all purchased leads
              </Badge>
            </div>
            <Link to="/connect/studio">
              <Button size="sm" className="gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                Learn About AURA Studio <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
