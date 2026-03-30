import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Users, TrendingDown, ChevronDown, ChevronUp, DollarSign, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IntelligenceLevel {
  level: number;
  label: string;
  discount: number;
  multiProfileThreshold: number;
  singleProfileThreshold: number;
}

const INTELLIGENCE_LEVELS: IntelligenceLevel[] = [
  { level: 1, label: "Level 1 Intelligence", discount: 10, multiProfileThreshold: 25, singleProfileThreshold: 100 },
  { level: 2, label: "Level 2 Intelligence", discount: 25, multiProfileThreshold: 50, singleProfileThreshold: 200 },
  { level: 3, label: "Level 3 Intelligence", discount: 50, multiProfileThreshold: 100, singleProfileThreshold: 350 },
  { level: 4, label: "Level 4 Intelligence", discount: 100, multiProfileThreshold: 200, singleProfileThreshold: 500 },
];

function hasMultipleProfiles(contact: any): boolean {
  const fields = [
    contact.primary_email,
    contact.primary_phone,
    contact.linkedin_url,
  ].filter(Boolean).length;
  const hasName = !!(contact.display_name && contact.display_name.trim().includes(" "));
  return hasName && fields >= 2;
}

function hasSingleProfile(contact: any): boolean {
  const fields = [
    contact.primary_email,
    contact.primary_phone,
    contact.linkedin_url,
  ].filter(Boolean).length;
  const hasName = !!(contact.display_name && contact.display_name.trim().includes(" "));
  return hasName && fields >= 1;
}

/** Compact banner for onboarding, settings, and sources */
export function IntelligenceDiscountBanner() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <TrendingDown className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">Unlock reduced pricing</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Connect accounts and add contacts to unlock up to <strong className="text-primary">$100/mo off</strong> your subscription. 
          The more complete your contact profiles (name, email, phone, LinkedIn), the bigger your discount.
        </p>
      </div>
    </div>
  );
}

/** Full pricing management section for Settings page */
export function IntelligencePricingSection() {
  const { user } = useAuth();
  const [multiProfileCount, setMultiProfileCount] = useState(0);
  const [singleProfileCount, setSingleProfileCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marketplaceCharges] = useState(0); // placeholder for marketplace add-ons

  const loadContactStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: contacts } = await supabase
        .from("canonical_persons")
        .select("display_name, primary_email, primary_phone, linkedin_url")
        .eq("owner_user_id", user.id);

      if (contacts) {
        const multi = contacts.filter(hasMultipleProfiles).length;
        const single = contacts.filter(c => hasSingleProfile(c) && !hasMultipleProfiles(c)).length;
        setMultiProfileCount(multi);
        setSingleProfileCount(single + multi); // single includes multi
      }
    } catch (err) {
      console.error("Failed to load contact stats:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadContactStats(); }, [loadContactStats]);

  const currentLevel = INTELLIGENCE_LEVELS.slice().reverse().find(
    l => multiProfileCount >= l.multiProfileThreshold || singleProfileCount >= l.singleProfileThreshold
  );

  const nextLevel = currentLevel
    ? INTELLIGENCE_LEVELS.find(l => l.level === currentLevel.level + 1)
    : INTELLIGENCE_LEVELS[0];

  const currentDiscount = currentLevel?.discount || 0;
  const basePricing = 100; // $100/mo base

  // Progress toward next level
  let nextProgress = 0;
  let nextTarget = "";
  if (nextLevel) {
    const multiProg = Math.min(100, (multiProfileCount / nextLevel.multiProfileThreshold) * 100);
    const singleProg = Math.min(100, (singleProfileCount / nextLevel.singleProfileThreshold) * 100);
    nextProgress = Math.max(multiProg, singleProg);
    nextTarget = `${nextLevel.multiProfileThreshold} multi-profile or ${nextLevel.singleProfileThreshold} single-profile contacts`;
  }

  return (
    <Card className="border-primary/10">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly Pricing</h3>
          </div>
          {currentLevel && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
              {currentLevel.label}
            </Badge>
          )}
        </div>

        {/* Pricing breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base subscription</span>
            <span>${basePricing}.00</span>
          </div>
          {currentDiscount > 0 && (
            <div className="flex justify-between text-primary">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Intelligence discount
              </span>
              <span>-${currentDiscount}.00</span>
            </div>
          )}
          {marketplaceCharges > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                Marketplace add-ons
              </span>
              <span>+${marketplaceCharges}.00</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Estimated next month</span>
            <span>${basePricing - currentDiscount + marketplaceCharges}.00/mo</span>
          </div>
        </div>

        {/* Intelligence levels */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <Zap className="h-3 w-3" />
            <span>View intelligence level details</span>
            <ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {INTELLIGENCE_LEVELS.map(level => {
              const isUnlocked = currentLevel && currentLevel.level >= level.level;
              const isCurrent = currentLevel?.level === level.level;
              return (
                <div
                  key={level.level}
                  className={`rounded-lg border p-3 text-xs ${
                    isCurrent ? "border-primary/30 bg-primary/5" :
                    isUnlocked ? "border-primary/10 bg-primary/[0.02]" :
                    "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${isCurrent ? "text-primary" : ""}`}>
                      {level.label}
                    </span>
                    <Badge variant={isUnlocked ? "default" : "outline"} className={`text-[9px] ${isUnlocked ? "bg-primary" : ""}`}>
                      {isUnlocked ? "Unlocked" : `-$${level.discount}/mo`}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {level.multiProfileThreshold} contacts with multiple profiles linked <span className="text-muted-foreground/60">or</span>{" "}
                    {level.singleProfileThreshold} contacts with one profile linked
                  </p>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground mt-1">
              A profile = email, phone, or LinkedIn. Contacts must have first + last name. Resets monthly — keep adding contacts to maintain your discount.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Progress to next level */}
        {nextLevel && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Progress to {nextLevel.label}
              </span>
              <span className="font-medium text-primary">{Math.round(nextProgress)}%</span>
            </div>
            <Progress value={nextProgress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              Need {nextTarget} for -${nextLevel.discount}/mo discount
            </p>
          </div>
        )}

        {!currentLevel && !loading && (
          <div className="rounded-md bg-muted/30 p-2.5">
            <p className="text-[11px] text-muted-foreground">
              <strong>Current stats:</strong> {multiProfileCount} multi-profile contacts, {singleProfileCount} total qualifying contacts. 
              Connect accounts and enrich your contacts to unlock discounts.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
