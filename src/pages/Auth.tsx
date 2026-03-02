import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";
import { set2FAVerified, is2FAVerified, clear2FAVerified } from "@/lib/2fa-storage";

/* Generate a stable device fingerprint for trusted-device tracking */
function getDeviceHash(): string {
  const stored = localStorage.getItem("aura_device_hash");
  if (stored) return stored;
  const hash = crypto.randomUUID();
  localStorage.setItem("aura_device_hash", hash);
  return hash;
}

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Auto-check trusted device when session exists but 2FA not yet verified
  const [autoChecking, setAutoChecking] = useState(false);
  useEffect(() => {
    if (!loading && user && !is2FAVerified() && !needs2FA && !autoChecking) {
      setAutoChecking(true);
      const deviceHash = getDeviceHash();
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          user_id: user.id,
          email: user.email,
          device_hash: deviceHash,
        }),
      })
        .then((r) => r.json())
        .then((result) => {
          if (result.trusted) {
            set2FAVerified();
            navigate("/", { replace: true });
          } else {
            // Device not trusted — show 2FA screen
            setPendingUserId(user.id);
            setPendingEmail(user.email!);
            setNeeds2FA(true);
          }
        })
        .catch(() => {
          setPendingUserId(user.id);
          setPendingEmail(user.email!);
          setNeeds2FA(true);
        })
        .finally(() => setAutoChecking(false));
    } else if (!loading && user && is2FAVerified()) {
      navigate("/", { replace: true });
    }
  }, [user, loading]);

  if (loading || autoChecking) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (user && is2FAVerified()) return <Navigate to="/" replace />;

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
        toast.success("Check your email for a confirmation link. After confirming, you'll be able to set up your agency info.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Password auth succeeded — now trigger 2FA
        const userId = data.user.id;
        const userEmail = data.user.email!;
        setPendingUserId(userId);
        setPendingEmail(userEmail);

        // Send 2FA code (check trusted device first)
        const deviceHash = getDeviceHash();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_code",
            user_id: userId,
            email: userEmail,
            device_hash: deviceHash,
          }),
        });

        const result = await resp.json();

        if (result.trusted) {
          // Device is trusted, skip 2FA
          set2FAVerified();
          navigate("/");
        } else if (result.sent) {
          setNeeds2FA(true);
          toast.success("Verification code sent to your email");
        } else {
          throw new Error(result.error || "Failed to send code");
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode.trim() || twoFACode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setVerifying2FA(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          user_id: pendingUserId,
          code: twoFACode.trim(),
          device_hash: rememberDevice ? getDeviceHash() : null,
        }),
      });

      const result = await resp.json();

      if (result.verified) {
        set2FAVerified();
        toast.success("Verified successfully");
        navigate("/");
      } else {
        toast.error(result.error || "Invalid code");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUserId || !pendingEmail) return;
    setResending(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          user_id: pendingUserId,
          email: pendingEmail,
        }),
      });
      const result = await resp.json();
      if (result.sent) {
        toast.success("New code sent to your email");
      } else {
        toast.error(result.error || "Failed to resend");
      }
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  // ─── 2FA Verification Screen ───
  if (needs2FA) {
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
              Two-factor verification
            </h1>
            <p className="mt-6 text-white/50 text-lg">
              We've sent a verification code to your email to keep your account secure.
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
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl tracking-tight">Verify your identity</h2>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {pendingEmail}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs uppercase tracking-wider text-muted-foreground">Verification Code</Label>
                <Input
                  id="code"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerify2FA(); }}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={rememberDevice}
                  onCheckedChange={(v) => setRememberDevice(!!v)}
                />
                <span className="text-sm text-muted-foreground">Keep me signed in for 7 days</span>
              </label>

              <Button
                onClick={handleVerify2FA}
                className="w-full h-11 aura-gradient-bg border-0 text-white hover:opacity-90 transition-opacity"
                disabled={verifying2FA || twoFACode.length !== 6}
              >
                {verifying2FA ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : "Verify & Sign In"}
              </Button>

              <div className="text-center">
                <button
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  {resending ? "Sending…" : "Didn't receive a code? Resend"}
                </button>
              </div>

              <div className="rounded-md bg-muted/50 p-3 mt-4">
                <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                  For your security, a verification code is required each time you sign in from a new device. Select "Keep me signed in" to skip this step for 7 days on this device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Login / Sign Up Screen ───
  return (
    <div className="flex min-h-screen animate-page-fade">
      {/* Left panel — gradient */}
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
            <span className="text-2xl font-bold tracking-tight aura-gradient-text">AURA</span>
            <span className="ml-1.5 text-xs text-muted-foreground tracking-widest uppercase">Risk Group</span>
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
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Please wait…</> : isSignUp ? "Create account" : "Sign in"}
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
