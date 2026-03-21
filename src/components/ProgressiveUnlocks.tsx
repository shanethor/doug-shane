import { useConnectedAccounts } from "@/components/ConnectedAccountsStatus";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock, Unlock, Star, Zap, Search, Users, Target,
  Mail, Linkedin, Phone, Calendar, CheckCircle, Circle,
  Crown, Sparkles,
} from "lucide-react";

interface UnlockTier {
  label: string;
  minConnections: number;
  features: string[];
  icon: React.ReactNode;
}

const TIERS: UnlockTier[] = [
  {
    label: "Basic Intelligence",
    minConnections: 1,
    features: ["Connection Brief (research-only)", "Email metadata for relationship scoring"],
    icon: <Search className="h-4 w-4" />,
  },
  {
    label: "Warm Path Finder",
    minConnections: 2,
    features: ["Top 10 owners to reach", "Mutual contact discovery", "Trigger detection"],
    icon: <Target className="h-4 w-4" />,
  },
  {
    label: "Relationship Engine",
    minConnections: 4,
    features: ["Best Path cards with confidence scores", "AI-drafted outreach", "Social Touch Queue"],
    icon: <Star className="h-4 w-4" />,
  },
  {
    label: "Advanced Intelligence",
    minConnections: 6,
    features: ["Interaction recency & frequency scoring", "Meeting-aware recommendations", "Follow-up SLA tracking"],
    icon: <Zap className="h-4 w-4" />,
  },
  {
    label: "Maximum Intelligence",
    minConnections: 8,
    features: ["Full network graph analysis", "Cross-platform relationship mapping", "Priority signal detection", "All features unlocked"],
    icon: <Crown className="h-4 w-4" />,
  },
];

export function ProgressiveUnlocks() {
  const { accounts } = useConnectedAccounts();

  const connectedCount = accounts.filter(a => a.connected).length;
  const totalCount = accounts.length;

  const getTierStatus = (tier: UnlockTier): "locked" | "partial" | "unlocked" => {
    if (connectedCount >= tier.minConnections) return "unlocked";
    if (connectedCount >= tier.minConnections - 1) return "partial";
    return "locked";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Feature Unlocks
        </p>
        <Badge variant="secondary" className="text-[10px]">
          {connectedCount}/{totalCount} connected
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-500"
          style={{ width: `${Math.min((connectedCount / 8) * 100, 100)}%` }}
        />
      </div>

      {TIERS.map((tier, i) => {
        const status = getTierStatus(tier);
        return (
          <Card
            key={i}
            className={`transition-all ${
              status === "unlocked"
                ? "border-success/30 bg-success/5"
                : status === "partial"
                  ? "border-warning/30 bg-warning/5"
                  : "border-border bg-muted/20 opacity-70"
            }`}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 shrink-0 ${
                  status === "unlocked" ? "bg-success/10 text-success" :
                  status === "partial" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {status === "unlocked" ? <Unlock className="h-4 w-4" /> :
                   status === "partial" ? tier.icon :
                   <Lock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{tier.label}</p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        status === "unlocked" ? "text-success border-success/30" :
                        status === "partial" ? "text-warning border-warning/30" :
                        "text-muted-foreground"
                      }`}
                    >
                      {status === "unlocked" ? "Unlocked" :
                       status === "partial" ? "Almost there" :
                       `${tier.minConnections}+ connections`}
                    </Badge>
                  </div>
                  <ul className="space-y-0.5">
                    {tier.features.map((f, j) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className={status === "unlocked" ? "text-success" : ""}>•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
