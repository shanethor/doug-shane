import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Zap, Users, BarChart3, Mail, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: Users, label: "Network Intelligence" },
  { icon: BarChart3, label: "Pipeline Management" },
  { icon: Mail, label: "Email & Calendar" },
  { icon: Sparkles, label: "AI Create Studio" },
  { icon: Zap, label: "Sage Assistant" },
];

// Master emails that can access all product routes
const MASTER_EMAILS = ["shane@houseofthor.com", "dwenz17@gmail.com"];

function useProductRoute(user: any) {
  const email = user?.email?.toLowerCase() ?? "";
  const destination = MASTER_EMAILS.includes(email) ? "/connect" : null;

  return {
    destination,
    checking: false,
  };
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
  const [submitting, setSubmitting] = useState(false);
  const { destination, checking: routeChecking } = useProductRoute(user);

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/get-started?product=${product}`,
            data: { full_name: fullName, product_user: true },
          },
        });
        if (error) throw error;

        toast.success("Account created! Check your email for a confirmation link.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const signedInEmail = data.user?.email?.toLowerCase() ?? "";
        if (!MASTER_EMAILS.includes(signedInEmail)) {
          navigate("/request-access", { replace: true });
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
      <div className="flex flex-1 items-center justify-center p-8">
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
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
