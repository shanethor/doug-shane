import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Check, Zap, Crown, Rocket } from "lucide-react";
import { CLARK_TIERS, type ClarkTierKey } from "@/lib/clark-tiers";

interface ClarkOnboardingProps {
  onComplete: () => void;
}

const TIER_ICONS: Record<ClarkTierKey, any> = {
  starter: Zap,
  pro: Rocket,
  elite: Crown,
};

export default function ClarkOnboarding({ onComplete }: ClarkOnboardingProps) {
  const [step, setStep] = useState<"profile" | "plan">("profile");
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ClarkTierKey | null>(null);
  const [form, setForm] = useState({
    producer_name: "",
    firm_name: "",
    firm_address: "",
    contact_phone: "",
    contact_email: "",
    license_number: "",
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.producer_name || !form.firm_name) {
      toast.error("Producer name and firm name are required.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("clark_profiles").upsert({
        user_id: user.id,
        ...form,
      }, { onConflict: "user_id" });

      if (error) throw error;
      setStep("plan");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (tierKey: ClarkTierKey) => {
    setSelectedTier(tierKey);
    setLoading(true);
    try {
      const priceId = CLARK_TIERS[tierKey].price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: priceId,
          success_url: `${window.location.origin}/clark`,
          cancel_url: `${window.location.origin}/clark`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        // After opening checkout, complete onboarding so user lands on Clark
        toast.success("Complete payment in the new tab to activate your plan.");
        onComplete();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
      setSelectedTier(null);
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (step === "profile") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Welcome to Clark</CardTitle>
            <CardDescription>Set up your firm profile so Clark can auto-fill your agency details on every submission.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="producer_name">Producer Name *</Label>
                  <Input id="producer_name" value={form.producer_name} onChange={set("producer_name")} placeholder="Jane Smith" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firm_name">Firm Name *</Label>
                  <Input id="firm_name" value={form.firm_name} onChange={set("firm_name")} placeholder="Smith Insurance Group" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firm_address">Firm Address</Label>
                <Input id="firm_address" value={form.firm_address} onChange={set("firm_address")} placeholder="123 Main St, Anytown, USA" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input id="contact_phone" value={form.contact_phone} onChange={set("contact_phone")} placeholder="(555) 123-4567" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input id="contact_email" value={form.contact_email} onChange={set("contact_email")} placeholder="jane@smithinsurance.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_number">License Number</Label>
                <Input id="license_number" value={form.license_number} onChange={set("license_number")} placeholder="Optional" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Continue to Plan Selection"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Plan selection step
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Choose Your Clark Plan</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Select a plan to start processing insurance submissions with AI-powered extraction and ACORD form generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
        {(Object.entries(CLARK_TIERS) as [ClarkTierKey, typeof CLARK_TIERS[ClarkTierKey]][]).map(([key, tier]) => {
          const Icon = TIER_ICONS[key];
          const isPopular = key === "pro";
          return (
            <Card
              key={key}
              className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg scale-[1.02]" : ""}`}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${isPopular ? "bg-primary text-primary-foreground" : "bg-primary/10"}`}>
                  <Icon className={`h-5 w-5 ${isPopular ? "" : "text-primary"}`} />
                </div>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="mt-1">
                  <span className="text-2xl font-bold">${tier.priceNum}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1 mb-4">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  disabled={loading && selectedTier === key}
                  onClick={() => handleSelectPlan(key)}
                >
                  {loading && selectedTier === key ? "Redirecting…" : `Get ${tier.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <button
        className="mt-6 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        onClick={onComplete}
      >
        Skip for now — explore Clark free
      </button>
    </div>
  );
}
