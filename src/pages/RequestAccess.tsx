import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Search, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ConnectUpsellPopup from "@/components/ConnectUpsellPopup";
import { CONNECT_VERTICALS, type ConnectVerticalConfig } from "@/lib/connect-verticals";

const MASTER_EMAILS = new Set([
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
]);

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
    if (MASTER_EMAILS.has(email)) {
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
          emailRedirectTo: `${window.location.origin}/get-started`,
          data: { full_name: fullName, product_user: true, industry: selectedVertical },
        },
      });
      if (error) throw error;

      // Save vertical and sub-verticals to profile
      if (data.user) {
        setTimeout(async () => {
          await supabase
            .from("profiles")
            .update({
              industry: selectedVertical,
              connect_vertical: selectedVertical,
              specializations: selectedSubVerticals,
            } as any)
            .eq("user_id", data.user!.id);
        }, 1000);
      }

      toast.success("Account created! Check your email for a confirmation link.");
      setShowUpsell(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
