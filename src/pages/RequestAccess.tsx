import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CreditCard, Check, Sparkles, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RequestAccess() {
  const { user } = useAuth();
  const { subscribed, loading: subLoading, startCheckout, isTrialing } = useSubscription();
  const [checking, setChecking] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const handleGuestCheckout = async () => {
    if (!guestEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-public-checkout", {
        body: { email: guestEmail },
      });
      if (error) throw error;
      if (data?.already_subscribed) {
        toast.info("You already have an active subscription. Sign in to access your account.");
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setChecking(true);
    try {
      await startCheckout();
    } finally {
      setChecking(false);
    }
  };

  const features = [
    "Relationship intelligence engine",
    "Warm intro pathways & connection briefs",
    "Contact deduplication & shared graph",
    "Social touch queue & outreach tracking",
    "Progressive feature unlocks",
  ];

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {checkoutStatus === "success" && (
          <div className="mb-8 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
            <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-emerald-300 font-medium">Subscription activated! Refreshing your access…</p>
          </div>
        )}

        <div className="w-16 h-16 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-7 h-7 text-[#60A5FA]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">AURA Connect</h1>
        <p className="text-sm text-[#71717A] text-center leading-relaxed max-w-sm mx-auto mb-8">
          Relationship intelligence for Property &amp; Consulting professionals. 3-day free trial included.
        </p>

        {/* Pricing card */}
        <div className="border border-[#27272A] rounded-2xl p-6 mb-6 bg-[#0C0C0E]">
          <div className="flex items-baseline justify-center gap-3 mb-1">
            <span className="text-[#52525B] line-through text-lg">$250</span>
            <span className="text-4xl font-bold text-white">$99.99</span>
            <span className="text-[#71717A] text-sm">/month</span>
          </div>
          <p className="text-xs text-[#52525B] text-center mb-6">
            Early access pricing · first 3 months · then $249.99/mo
          </p>

          <div className="space-y-3 mb-6">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#60A5FA] mt-0.5 shrink-0" />
                <span className="text-sm text-[#A1A1AA]">{f}</span>
              </div>
            ))}
          </div>

          {user ? (
            subscribed ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  {isTrialing ? "Trial Active" : "Subscribed"}
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={checking || subLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white text-[#08080A] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Start 14-day free trial
                  </>
                )}
              </button>
            )
          ) : (
            <div className="space-y-3">
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Enter your email to get started"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                onKeyDown={(e) => e.key === "Enter" && handleGuestCheckout()}
              />
              <button
                onClick={handleGuestCheckout}
                disabled={checking}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white text-[#08080A] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Start 14-day free trial
                  </>
                )}
              </button>
              <p className="text-xs text-[#52525B] text-center">
                Already have an account?{" "}
                <Link to="/get-started" className="text-[#60A5FA] hover:underline">Sign in</Link>
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-[#3F3F46] text-center">
          Cancel anytime · No commitment · Powered by Stripe
        </p>
      </div>
    </div>
  );
}
