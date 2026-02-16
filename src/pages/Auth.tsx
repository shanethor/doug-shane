import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import auraLogo from "@/assets/aura-logo.png";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Check your email for a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen animate-page-fade">
      {/* Left panel — gradient */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between aura-gradient-bg relative overflow-hidden p-12">
        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
        }} />
        
        <div className="relative z-10 flex items-center gap-3">
          <img src={auraLogo} alt="AURA Risk Group" className="h-10 brightness-0 invert opacity-90" />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl text-white/95 leading-tight tracking-tight">
            Smarter submissions, faster closes
          </h1>
          <p className="mt-6 text-white/50 text-lg">
            AI-powered submissions, ACORD compliance, and carrier-ready packages — all in one place.
          </p>
        </div>
        <p className="relative z-10 text-white/25 text-sm">© 2026 AURA Risk Group</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8 aura-subtle-mesh">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src={auraLogo} alt="AURA Risk Group" className="h-9" />
          </div>

          <h2 className="text-3xl mb-2 tracking-tight">{isSignUp ? "Create account" : "Welcome back"}</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            {isSignUp ? "Start managing your insurance submissions." : "Sign in to your agent portal."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required className="h-11" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 aura-gradient-bg border-0 text-white hover:opacity-90 transition-opacity" disabled={submitting}>
              {submitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-foreground underline underline-offset-4 hover:text-foreground/80">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
