import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Search, Sparkles, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ConnectUpsellPopup from "@/components/ConnectUpsellPopup";
import { CONNECT_VERTICALS, type ConnectVerticalConfig } from "@/lib/connect-verticals";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import { isMasterEmail } from "@/lib/master-accounts";

const ALL_US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function RequestAccess() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedVertical, setSelectedVertical] = useState<string>("");
  const [verticalSearch, setVerticalSearch] = useState("");
  const [verticalOpen, setVerticalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [selectedSubVerticals, setSelectedSubVerticals] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const verticalRef = useRef<HTMLDivElement>(null);

  const verticalConfig = useMemo(
    () => CONNECT_VERTICALS.find(v => v.id === selectedVertical),
    [selectedVertical]
  );

  // Reset sub-verticals when vertical changes
  useEffect(() => {
    if (verticalConfig) {
      setSelectedSubVerticals(verticalConfig.subVerticals.slice(0, 2).map(sv => sv.id));
    } else {
      setSelectedSubVerticals([]);
    }
    setExpandedGroups(new Set());
  }, [selectedVertical]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (verticalRef.current && !verticalRef.current.contains(e.target as Node)) setVerticalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Only master accounts should be auto-routed into the product.
  useEffect(() => {
    if (!user?.email) return;

    const email = user.email.toLowerCase();
    if (isMasterEmail(email)) {
      navigate("/connect", { replace: true });
    }
  }, [user?.email, navigate]);

  const filteredVerticals = CONNECT_VERTICALS.filter((v) =>
    v.label.toLowerCase().includes(verticalSearch.toLowerCase()) ||
    v.description.toLowerCase().includes(verticalSearch.toLowerCase())
  );

  const toggleSubVertical = (id: string) => {
    setSelectedSubVerticals(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVertical) {
      toast.error("Please select your industry vertical");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, product_user: true, industry: selectedVertical },
        },
      });
      if (error) throw error;

      // With auto-confirm, the user is immediately signed in
      const session = data.session;
      if (!session) {
        toast.error("Account created but sign-in failed. Please sign in manually.");
        return;
      }

      // Save vertical, sub-verticals, and states to profile
      if (data.user) {
        await supabase
          .from("profiles")
          .update({
            industry: selectedVertical,
            connect_vertical: selectedVertical,
            specializations: selectedSubVerticals,
            states_of_operation: selectedStates,
          } as any)
          .eq("user_id", data.user.id);
      }

      // Send OTP verification code
      setOtpToken(session.access_token);
      const { data: otpData, error: otpError } = await supabase.functions.invoke("verify-2fa", {
        body: { action: "send_code" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (otpError) {
        console.error("OTP send error:", otpError);
        toast.error("Could not send verification code. Please try again.");
        return;
      }

      toast.success("We've sent a 6-digit code to your email.");
      setShowOtp(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = useCallback(async (codeValue?: string) => {
    const finalCode = codeValue || otpCode;
    if (finalCode.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const headers: Record<string, string> = {};
      if (otpToken) headers.Authorization = `Bearer ${otpToken}`;

      const { data, error } = await supabase.functions.invoke("verify-2fa", {
        body: { action: "verify_code", code: finalCode },
        ...(otpToken ? { headers } : {}),
      });
      if (error) throw error;
      if (data?.verified) {
        toast.success("Email verified!");
        setShowOtp(false);
        setShowUpsell(true);
      } else {
        toast.error(data?.error || "Invalid code. Please try again.");
        setOtpCode("");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
      setOtpCode("");
    } finally {
      setVerifyingOtp(false);
    }
  }, [otpCode, otpToken]);

  const handleResendCode = async () => {
    try {
      const headers: Record<string, string> = {};
      if (otpToken) headers.Authorization = `Bearer ${otpToken}`;
      await supabase.functions.invoke("verify-2fa", {
        body: { action: "send_code" },
        ...(otpToken ? { headers } : {}),
      });
      toast.success("New code sent to your email.");
    } catch {
      toast.error("Failed to resend code.");
    }
  };

  // OTP Verification screen
  if (showOtp) {
    return (
      <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-[hsl(140_12%_42%/0.1)] border border-[hsl(140_12%_42%/0.2)] flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-6 h-6 text-[hsl(140_12%_58%)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Verify your email</h1>
          <p className="text-sm text-[#71717A] leading-relaxed max-w-sm mx-auto mb-8">
            We sent a 6-digit code to <span className="text-white font-medium">{email}</span>. Enter it below to continue.
          </p>

          <div className="flex justify-center mb-6">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(val) => {
                setOtpCode(val);
                if (val.length === 6) handleVerifyOtp(val);
              }}
              disabled={verifyingOtp}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="bg-white/5 border-white/10 text-white text-lg w-12 h-14" />
                <InputOTPSlot index={1} className="bg-white/5 border-white/10 text-white text-lg w-12 h-14" />
                <InputOTPSlot index={2} className="bg-white/5 border-white/10 text-white text-lg w-12 h-14" />
                <InputOTPSlot index={3} className="bg-white/5 border-white/10 text-white text-lg w-12 h-14" />
                <InputOTPSlot index={4} className="bg-white/5 border-white/10 text-white text-lg w-12 h-14" />
                <InputOTPSlot index={5} className="bg-white/5 border-white/10 text-white text-lg w-12 h-14" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {verifyingOtp && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#71717A] mb-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </div>
          )}

          <button
            onClick={() => handleVerifyOtp()}
            disabled={otpCode.length !== 6 || verifyingOtp}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(140_12%_42%)] text-[#08080A] hover:bg-[hsl(140_12%_52%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
          >
            {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </button>

          <button
            onClick={handleResendCode}
            className="text-xs text-[#52525B] hover:text-[#71717A] transition-colors"
          >
            Didn't receive a code? <span className="underline">Resend</span>
          </button>
        </div>

        <ConnectUpsellPopup open={showUpsell} onClose={() => setShowUpsell(false)} />
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button onClick={() => setIsForgotPassword(false)} className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to sign up
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-center mb-2">Reset your password</h1>
          <p className="text-sm text-[#71717A] text-center mb-8">Enter your email and we'll send you a reset link.</p>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-[#71717A]">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20" autoFocus />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(140_12%_42%)] text-[#08080A] hover:bg-[hsl(140_12%_52%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="w-14 h-14 rounded-full bg-[hsl(140_12%_42%/0.1)] border border-[hsl(140_12%_42%/0.2)] flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-6 h-6 text-[hsl(140_12%_58%)]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">Create your AURA account</h1>
        <p className="text-sm text-[#71717A] text-center leading-relaxed max-w-sm mx-auto mb-8">
          Get started with your free account. Access leads, pipeline tools, and more.
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          {/* Vertical selector */}
          <div className="space-y-2" ref={verticalRef}>
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Industry Vertical</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setVerticalOpen(!verticalOpen)}
                className="w-full h-11 px-3 text-left text-sm bg-white/5 border border-white/10 rounded-md text-white flex items-center justify-between"
              >
                <span className={selectedVertical ? "text-white" : "text-white/20"}>
                  {verticalConfig?.label || "Select your industry vertical"}
                </span>
                <Search className="w-4 h-4 text-white/30" />
              </button>
              {verticalOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#18181B] border border-white/10 rounded-lg shadow-xl max-h-72 overflow-hidden bottom-full mb-1">
                  <div className="p-2 border-b border-white/10">
                    <Input
                      value={verticalSearch}
                      onChange={(e) => setVerticalSearch(e.target.value)}
                      placeholder="Search verticals..."
                      className="h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-56">
                    {filteredVerticals.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setSelectedVertical(v.id); setVerticalOpen(false); setVerticalSearch(""); }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 flex flex-col gap-0.5 ${selectedVertical === v.id ? "text-[hsl(140_12%_58%)]" : "text-[#A1A1AA]"}`}
                      >
                        <div className="flex items-center gap-2">
                          {selectedVertical === v.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span className="font-medium">{v.label}</span>
                        </div>
                        <span className="text-[10px] text-[#52525B] pl-5">{v.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub-verticals — shown after vertical selection */}
          {verticalConfig && verticalConfig.subVerticals.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-[#71717A]">Specializations</Label>
              <p className="text-[10px] text-[#52525B]">Select the sub-verticals you'll focus on</p>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1.5">
                  {verticalConfig.subVerticals.map(sv => (
                    <button
                      key={sv.id}
                      type="button"
                      onClick={() => toggleSubVertical(sv.id)}
                      className={`rounded-md border p-2 text-left text-[11px] font-medium transition-all ${
                        selectedSubVerticals.includes(sv.id)
                          ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.1)] text-white"
                          : "border-white/10 text-[#71717A] hover:border-white/20"
                      }`}
                    >
                      {sv.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#52525B]">{selectedSubVerticals.length} specialization{selectedSubVerticals.length !== 1 ? "s" : ""} selected</p>
              </div>
            </div>
          )}

          {/* States of Operation */}
          {selectedVertical && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-[#71717A]">States of Operation</Label>
              <p className="text-[10px] text-[#52525B]">Select the states where you operate</p>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#71717A]">{selectedStates.length} state{selectedStates.length !== 1 ? "s" : ""} selected</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStates.length === ALL_US_STATES.length) {
                        setSelectedStates([]);
                      } else {
                        setSelectedStates([...ALL_US_STATES]);
                      }
                    }}
                    className="text-[10px] font-medium text-[hsl(140_12%_58%)] hover:underline"
                  >
                    {selectedStates.length === ALL_US_STATES.length ? "Deselect All" : "Select All 50 States"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto pr-1">
                  {ALL_US_STATES.map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStates(prev =>
                          prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]
                        );
                      }}
                      className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                        selectedStates.includes(st)
                          ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.1)] text-white"
                          : "border-white/10 text-[#52525B] hover:border-white/20"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(140_12%_42%)] text-[#08080A] hover:bg-[hsl(140_12%_52%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-[#52525B]">
            Already have an account?{" "}
            <Link to="/get-started" className="text-[hsl(140_12%_58%)] hover:underline">Sign in</Link>
          </p>
          <button
            onClick={() => setIsForgotPassword(true)}
            className="text-xs text-[#52525B] hover:text-[#71717A] underline underline-offset-4"
          >
            Forgot password?
          </button>
        </div>

        <p className="text-xs text-[#3F3F46] text-center mt-6">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="underline hover:text-[#71717A]">Terms</Link> &{" "}
          <Link to="/privacy" className="underline hover:text-[#71717A]">Privacy Policy</Link>
        </p>
      </div>

      <ConnectUpsellPopup open={showUpsell} onClose={() => setShowUpsell(false)} />
    </div>
  );
}
