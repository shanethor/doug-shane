import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check hash for type=recovery (in case event already fired)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! Redirecting to sign in…");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth", { replace: true }), 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen animate-page-fade">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between aura-gradient-bg relative overflow-hidden p-12">
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-white/90">AURA</span>
          <span className="ml-1.5 text-xs text-white/50 tracking-widest uppercase">Risk Group</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl text-white/95 leading-tight tracking-tight">
            Reset your password
          </h1>
          <p className="mt-6 text-white/50 text-lg">
            Choose a new password for your AURA account.
          </p>
        </div>
        <p className="relative z-10 text-white/25 text-sm">© 2026 AURA Risk Group</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8 aura-subtle-mesh">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-2xl font-bold tracking-tight aura-gradient-text">AURA</span>
            <span className="ml-1.5 text-xs text-muted-foreground tracking-widest uppercase">Risk Group</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl tracking-tight">New password</h2>
              <p className="text-sm text-muted-foreground">Enter your new password below</p>
            </div>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs uppercase tracking-wider text-muted-foreground">New Password</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 aura-gradient-bg border-0 text-white hover:opacity-90 transition-opacity" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating…</> : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
