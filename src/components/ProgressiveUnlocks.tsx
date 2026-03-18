import { useConnectedAccounts } from "@/components/ConnectedAccountsStatus";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock, Unlock, Star, Zap, Search, Users, Target,
  Mail, Linkedin, Phone, Calendar, CheckCircle, Circle,
} from "lucide-react";

interface UnlockTier {
  label: string;
  requirements: string[];
  features: string[];
  icon: React.ReactNode;
}

const TIERS: UnlockTier[] = [
  {
    label: "Basic Intelligence",
    requirements: ["Email (Gmail or Outlook)"],
    features: ["Connection Brief (research-only)", "Email metadata for relationship scoring"],
    icon: <Search className="h-4 w-4" />,
  },
  {
    label: "Warm Path Finder",
    requirements: ["Email", "LinkedIn"],
    features: ["Top 10 owners to reach", "Mutual contact discovery", "Trigger detection"],
    icon: <Target className="h-4 w-4" />,
  },
  {
    label: "Full Relationship Engine",
    requirements: ["Email", "LinkedIn", "Google/Outlook Contacts"],
    features: ["Best Path cards with confidence scores", "AI-drafted outreach", "Social Touch Queue"],
    icon: <Star className="h-4 w-4" />,
  },
  {
    label: "Maximum Intelligence",
    requirements: ["Email", "LinkedIn", "Contacts", "Phone", "Calendar"],
    features: ["Interaction recency & frequency scoring", "Meeting-aware path recommendations", "Follow-up SLA tracking"],
    icon: <Zap className="h-4 w-4" />,
  },
];

export function ProgressiveUnlocks() {
  const { accounts } = useConnectedAccounts();

  const connectedIds = new Set(accounts.filter(a => a.connected).map(a => a.id));

  const getTierStatus = (tier: UnlockTier): "locked" | "partial" | "unlocked" => {
    const reqMap: Record<string, string[]> = {
      "Email (Gmail or Outlook)": ["email"],
      "Email": ["email"],
      "LinkedIn": ["linkedin"],
      "Google/Outlook Contacts": ["contacts", "outlook_contacts"],
      "Contacts": ["contacts", "outlook_contacts"],
      "Phone": ["phone"],
      "Calendar": ["email"], // Calendar comes with email OAuth
    };

    let met = 0;
    for (const req of tier.requirements) {
      const ids = reqMap[req] || [];
      if (ids.some(id => connectedIds.has(id))) met++;
    }

    if (met === tier.requirements.length) return "unlocked";
    if (met > 0) return "partial";
    return "locked";
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Feature Unlocks
      </p>
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
                       status === "partial" ? "Partial" :
                       "Locked"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {tier.requirements.map((req, j) => (
                      <Badge key={j} variant="secondary" className="text-[9px] gap-0.5">
                        {status === "unlocked" || (status === "partial") ? (
                          <CheckCircle className="h-2.5 w-2.5" />
                        ) : (
                          <Circle className="h-2.5 w-2.5" />
                        )}
                        {req}
                      </Badge>
                    ))}
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
