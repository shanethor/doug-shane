import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check, ShieldCheck } from "lucide-react";

type Step = "create-account" | "verify-2fa";

export default function PostCheckoutOnboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [step, setStep] = useState<Step>("create-account");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [code2fa, setCode2fa] = useState("");
  const [sending2fa, setSending2fa] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState("");

  // Fetch email from Stripe session
  useEffect(() => {
    if (!sessionId) {
      setLoadingEmail(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-checkout-email", {
          body: { session_id: sessionId },
        });
        if (!error && data?.email) {
          setEmail(data.email);
          setEmailLocked(true);
        }
      } catch {}
      setLoadingEmail(false);
    })();
  }, [sessionId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!selectedIndustry) {
        toast.error("Please select your industry");
        setSubmitting(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/get-started`,
          data: { full_name: fullName, product_user: true },
        },
      });
      if (error) throw error;

      // Save industry to profile
      if (data.user) {
        setTimeout(async () => {
          await supabase
            .from("profiles")
            .update({ industry: selectedIndustry })
            .eq("user_id", data.user!.id);
        }, 1000);
      }

      // Send 2FA verification code (user is auto-confirmed and signed in)
      setSending2fa(true);
      try {
        await supabase.functions.invoke("verify-2fa", {
          body: { action: "send_code" },
        });
        setStep("verify-2fa");
      } catch {
        // If 2FA service unavailable, go straight to dashboard
        navigate("/get-started");
      }
      setSending2fa(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-2fa", {
        body: { action: "verify_code", code: code2fa },
      });
      if (error) throw error;
      if (!data?.verified) {
        toast.error(data?.error || "Invalid code. Please try again.");
        setSubmitting(false);
        return;
      }
      toast.success("Verified! Welcome to AURA.");
      navigate("/connect/onboarding", { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(140,12%,50%)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080A] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Success banner */}
        <div className="mb-8 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
          <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-emerald-300 font-medium">Payment successful! Now let's set up your account.</p>
        </div>

        <h1 className="text-2xl font-light tracking-tight text-center mb-2">
          {step === "create-account" && "Create Your Account"}
          
          {step === "verify-2fa" && "Verify Your Identity"}
        </h1>
        <p className="text-sm text-white/40 text-center mb-8">
          {step === "create-account" && "Set up your credentials to access AURA Connect"}
          
          {step === "verify-2fa" && "Enter the 6-digit code sent to your email"}
        </p>

        {step === "create-account" && (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                readOnly={emailLocked}
                className={`h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 ${emailLocked ? "opacity-70" : ""}`}
              />
              {emailLocked && (
                <p className="text-xs text-white/30">
                  Prefilled from your subscription.{" "}
                  <button type="button" onClick={() => setEmailLocked(false)} className="text-[hsl(140,12%,55%)] hover:underline">
                    Change
                  </button>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Industry *</Label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                required
                className="flex h-11 w-full rounded-md border bg-white/5 border-white/10 text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(140,12%,42%)]"
              >
                <option value="" className="bg-[#08080A]">Select your industry...</option>
                <option value="insurance" className="bg-[#08080A]">Insurance</option>
                <option value="mortgage" className="bg-[#08080A]">Mortgage</option>
                <option value="real_estate" className="bg-[#08080A]">Real Estate</option>
                <option value="property" className="bg-[#08080A]">Property</option>
                <option value="consulting" className="bg-[#08080A]">Consulting / Professional Services</option>
                <option value="general" className="bg-[#08080A]">General Business</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0 gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {step === "verify-2fa" && (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[hsl(140,12%,42%)]/10 border border-[hsl(140,12%,42%)]/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-[hsl(140,12%,55%)]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Verification Code</Label>
              <Input
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-center text-lg tracking-[0.5em]"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || code2fa.length < 6}
              className="w-full h-11 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0 gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Verify & Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={async () => {
                setSending2fa(true);
                try {
                  await supabase.functions.invoke("verify-2fa", {
                    body: { action: "send_code" },
                  });
                  toast.success("New code sent!");
                } catch {
                  toast.error("Failed to resend code");
                }
                setSending2fa(false);
              }}
              className="w-full text-sm text-white/40 hover:text-white/60 transition-colors"
              disabled={sending2fa}
            >
              {sending2fa ? "Sending…" : "Resend code"}
            </button>
          </form>
        )}

        

        <div className="mt-8 text-center">
          <a href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">
            ‹ Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
