import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Zap, Users, BarChart3, Mail, Sparkles, Search, Check } from "lucide-react";
import { CONNECT_VERTICALS } from "@/lib/connect-verticals";

const FEATURES = [
  { icon: Users, label: "Network Intelligence" },
  { icon: BarChart3, label: "Pipeline Management" },
  { icon: Mail, label: "Email & Calendar" },
  { icon: Sparkles, label: "AI Create Studio" },
  { icon: Zap, label: "Sage Assistant" },
];

const MASTER_EMAILS = ["shane@houseofthor.com", "dwenz17@gmail.com"];

// Industries are now sourced from the canonical CONNECT_VERTICALS list

function useProductRoute(user: any) {
  const email = user?.email?.toLowerCase() ?? "";
  const destination = MASTER_EMAILS.includes(email) ? "/connect" : null;
  return { destination, checking: false };
}

export default function ProductAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const product = searchParams.get("product") || "connect";
  const redirectTo = searchParams.get("redirect");

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [industry, setIndustry] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryOpen, setIndustryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const industryRef = useRef<HTMLDivElement>(null);
  const { destination, checking: routeChecking } = useProductRoute(user);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) setIndustryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredVerticals = useMemo(() =>
    CONNECT_VERTICALS.filter((v) =>
      v.label.toLowerCase().includes(industrySearch.toLowerCase()) ||
      v.description.toLowerCase().includes(industrySearch.toLowerCase())
    ), [industrySearch]
  );

  if (loading || (user && routeChecking)) return (
    <div className="flex min-h-screen items-center justify-center bg-[#08080A]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(140,12%,50%)] border-t-transparent" />
    </div>
  );

  if (user && destination) return <Navigate to={redirectTo || destination} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        if (!industry) {
          toast.error("Please select your industry");
          setSubmitting(false);
          return;
        }
        const industryKey = industry; // industry state now stores the vertical id directly
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/get-started?product=${product}`,
            data: { full_name: fullName, product_user: true, industry: industryKey },
          },
        });
        if (error) throw error;

        // Save industry to profile
        if (signUpData.user) {
          setTimeout(async () => {
            await supabase
              .from("profiles")
              .update({ industry: industryKey } as any)
              .eq("user_id", signUpData.user!.id);
          }, 1000);
        }

        toast.success("Account created! Check your email for a confirmation link.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const signedInEmail = data.user?.email?.toLowerCase() ?? "";
        if (MASTER_EMAILS.includes(signedInEmail)) {
          navigate("/connect", { replace: true });
        } else {
          // Check if onboarding is completed
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("user_id", data.user!.id)
            .single();
          if (profile?.onboarding_completed) {
            navigate("/connect", { replace: true });
          } else {
            navigate("/connect/onboarding", { replace: true });
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const title = product === "studio" ? "AURA Studio" : "AURA Connect";
  const subtitle = product === "studio"
    ? "Your AI-native build team"
    : "Relationship intelligence for professionals";

  return (
    <div className="flex min-h-screen bg-[#08080A] text-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden p-12"
        style={{ background: "linear-gradient(135deg, #08080A 0%, hsl(140 12% 18%) 50%, #08080A 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(138,154,140,0.2) 0%, transparent 50%)"
        }} />
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-white/90">AURA</span>
        </div>
        <div className="relative z-10 max-w-md space-y-8">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-white/95 leading-tight">{title}</h1>
            <p className="mt-4 text-white/50 text-lg">{subtitle}</p>
          </div>
          {product === "connect" && (
            <div className="space-y-3">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-3 text-white/40">
                  <f.icon className="h-4 w-4" />
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="relative z-10 text-white/20 text-sm">© 2026 AURA Risk Group</p>
      </div>

      {/* Right panel - auth form */}
      <div className="flex flex-1 items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <span className="text-2xl font-bold tracking-tight">AURA</span>
          </div>

          <h2 className="text-2xl font-light tracking-tight mb-1">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-sm text-white/40 mb-8">
            {isSignUp ? "Get started with " + title : "Sign in to " + title}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
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
            )}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Email</Label>
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
              <Label className="text-xs uppercase tracking-wider text-white/50">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>

            {/* Industry selector — sign-up only */}
            {isSignUp && (
              <div className="space-y-2" ref={industryRef}>
                <Label className="text-xs uppercase tracking-wider text-white/50">Industry</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIndustryOpen(!industryOpen)}
                    className="w-full h-11 px-3 text-left text-sm bg-white/5 border border-white/10 rounded-md text-white flex items-center justify-between"
                  >
                    <span className={industry ? "text-white" : "text-white/20"}>
                      {industry || "Select your industry"}
                    </span>
                    <Search className="w-4 h-4 text-white/30" />
                  </button>
                  {industryOpen && (
                    <div className="absolute z-50 w-full bg-[#18181B] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-hidden bottom-full mb-1">
                      <div className="p-2 border-b border-white/10">
                        <Input
                          value={industrySearch}
                          onChange={(e) => setIndustrySearch(e.target.value)}
                          placeholder="Search industries..."
                          className="h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        {filteredIndustries.map((ind) => (
                          <button
                            key={ind}
                            type="button"
                            onClick={() => { setIndustry(ind); setIndustryOpen(false); setIndustrySearch(""); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2 ${industry === ind ? "text-[hsl(140_12%_58%)]" : "text-[#A1A1AA]"}`}
                          >
                            {industry === ind && <Check className="w-3.5 h-3.5 shrink-0" />}
                            {ind}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0 gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {!isSignUp && (
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={async () => {
                  if (!email.trim()) { toast.error("Enter your email first"); return; }
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
                }}
                className="text-xs text-white/40 hover:text-white/60 transition-colors underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <a href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">
              ‹ Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
