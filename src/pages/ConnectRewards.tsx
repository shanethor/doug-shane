import { IntelligencePricingSection, IntelligenceDiscountBanner } from "@/components/IntelligencePricing";
import { ConnectRewards } from "@/components/ConnectRewards";
import { Gift } from "lucide-react";

export default function ConnectRewardsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Rewards & Pricing</h1>
          <p className="text-sm text-muted-foreground">Earn discounts by growing your network</p>
        </div>
      </div>

      <IntelligenceDiscountBanner />
      <IntelligencePricingSection />
      <ConnectRewards />
    </div>
  );
}
