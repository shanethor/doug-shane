import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import auraLogo from "@/assets/aura-logo.png";
import { set2FAVerified, is2FAVerified, clear2FAVerified } from "@/lib/2fa-storage";


async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

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
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agencyCode, setAgencyCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Pending approval state
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const loginHandled2FA = useRef(false);

  const [autoChecking, setAutoChecking] = useState(false);

  // Check approval status when user is authenticated
  useEffect(() => {
    if (!user || loading) return;

    const checkApproval = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("user_id", user.id)
        .single();

      if (profile?.approval_status === "pending") {
        setIsPendingApproval(true);
        return;
      }
    };

    // Only check if not already in 2FA flow
    if (!needs2FA && !isPendingApproval) {
      checkApproval();
    }
  }, [user, loading, needs2FA]);

  useEffect(() => {
    if (loginHandled2FA.current) return;

    if (!loading && user && !is2FAVerified() && !needs2FA && !autoChecking && !isPendingApproval) {
      if (user.user_metadata?.skip_2fa) {
        set2FAVerified(true);
        navigate("/", { replace: true });
        return;
      }
      setAutoChecking(true);
      const deviceHash = getDeviceHash();
      getAuthHeaders().then(hdrs => fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          action: "send_code",
          user_id: user.id,
          device_hash: deviceHash,
        }),
      }))
        .then((r) => r.json())
        .then((result) => {
          if (result.trusted) {
            set2FAVerified(true);
            navigate("/", { replace: true });
          } else if (result.sent) {
            setPendingUserId(user.id);
            setPendingEmail(user.email!);
            setNeeds2FA(true);
          } else {
            // send_code failed – don't show 2FA form without an active code
            console.error("[2fa-auto] send_code failed:", result.error);
            toast.error("Could not send verification code. Please try logging in again.");
          }
        })
        .catch((err) => {
          console.error("[2fa-auto] network error:", err);
          toast.error("Could not reach verification service. Please try again.");
        })
        .finally(() => setAutoChecking(false));
    } else if (!loading && user && is2FAVerified() && !isPendingApproval) {
      navigate("/", { replace: true });
    }
  }, [user, loading, isPendingApproval]);

  if (loading || autoChecking) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (user && is2FAVerified() && !isPendingApproval) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        // Validate agency code
        if (!agencyCode.trim()) {
          toast.error("Agency code is required");
          return;
        }

        const { data: agency } = await supabase
          .from("agencies")
          .select("id, name")
          .eq("code", agencyCode.trim().toUpperCase())
          .single();

        if (!agency) {
          toast.error("Invalid agency code. Please check with your administrator.");
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, agency_id: agency.id },
          },
        });
        if (error) throw error;

        // Update profile with agency and pending status
        if (signUpData.user) {
          // Wait a moment for the profile trigger to create the row
          setTimeout(async () => {
            await supabase
              .from("profiles")
              .update({
                agency_id: agency.id,
                agency_name: agency.name,
                full_name: fullName,
                approval_status: "pending",
              })
              .eq("user_id", signUpData.user!.id);
          }, 1000);
        }

        toast.success("Account created! Check your email for a confirmation link. Your account will be reviewed by an administrator before you can access AURA.");
      } else {
        // Set flag BEFORE signIn to prevent the useEffect from also firing send_code
        loginHandled2FA.current = true;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          loginHandled2FA.current = false;
          throw error;
        }

        // Check approval status
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status")
          .eq("user_id", data.user.id)
          .single();

        if (profile?.approval_status === "pending") {
          setIsPendingApproval(true);
          return;
        }

        const userId = data.user.id;
        const userEmail = data.user.email!;

        if (data.user.user_metadata?.skip_2fa) {
          set2FAVerified(true);
          navigate("/", { replace: true });
          return;
        }

        setPendingUserId(userId);
        setPendingEmail(userEmail);
        const deviceHash = getDeviceHash();
        const authHdrs = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
          method: "POST",
          headers: authHdrs,
          body: JSON.stringify({
            action: "send_code",
            user_id: userId,
            device_hash: deviceHash,
          }),
        });

        const result = await resp.json();

        if (result.trusted) {
          set2FAVerified(true);
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
      const authHdrs = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify({
          action: "verify_code",
          user_id: pendingUserId,
          code: twoFACode.trim(),
          device_hash: rememberDevice ? getDeviceHash() : null,
        }),
      });

      const result = await resp.json();

      if (result.verified) {
        // Check approval status before allowing in
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status")
          .eq("user_id", pendingUserId!)
          .single();

        if (profile?.approval_status === "pending") {
          setNeeds2FA(false);
          setIsPendingApproval(true);
          return;
        }

        set2FAVerified(rememberDevice);
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
      const authHdrs = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify({
          action: "send_code",
          user_id: pendingUserId,
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

  // ─── Pending Approval Screen ───
  if (isPendingApproval) {
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
              Account pending
            </h1>
            <p className="mt-6 text-white/50 text-lg">
              Your account is being reviewed by an administrator.
            </p>
          </div>
          <p className="relative z-10 text-white/25 text-sm">© 2026 AURA Risk Group</p>
        </div>

        <div className="flex flex-1 items-center justify-center p-8 aura-subtle-mesh">
          <div className="w-full max-w-sm text-center">
            <div className="mb-8 lg:hidden">
              <span className="text-2xl font-bold tracking-tight aura-gradient-text">AURA</span>
              <span className="ml-1.5 text-xs text-muted-foreground tracking-widest uppercase">Risk Group</span>
            </div>

            <div className="rounded-full bg-primary/10 p-5 mx-auto w-fit mb-6">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl tracking-tight mb-3">Account Under Review</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Your account has been created and is pending administrator approval. 
              You'll receive an email once your account has been activated and your role has been assigned.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                clear2FAVerified();
                setIsPendingApproval(false);
              }}
              className="h-11"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={rememberDevice}
                  onCheckedChange={(v) => setRememberDevice(v)}
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

  // ─── Forgot Password Screen ───
  if (isForgotPassword) {
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
              Reset password
            </h1>
            <p className="mt-6 text-white/50 text-lg">
              We'll send you a link to reset your password.
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

            <h2 className="text-3xl mb-2 tracking-tight">Forgot password?</h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required className="h-11" autoFocus />
              </div>
              <Button type="submit" className="w-full h-11 aura-gradient-bg border-0 text-white hover:opacity-90 transition-opacity" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : "Send reset link"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <button onClick={() => setIsForgotPassword(false)} className="text-foreground underline underline-offset-4 hover:text-foreground/80">
                Back to sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Login / Sign Up Screen ───
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
          <p className="text-sm text-white/40 tracking-widest uppercase mb-3">Insurance runs on</p>
          <h1 className="text-6xl font-bold text-white/95 leading-none tracking-tight">
            AURA
          </h1>
          <p className="mt-5 text-white/60 text-lg tracking-wide">
            Automated Universal Risk Advisor
          </p>
          <div className="mt-8 h-px w-16 bg-white/20" />
          <p className="mt-6 text-white/40 text-sm leading-relaxed">
            AI-powered submissions, ACORD compliance, and carrier-ready packages — all in one place.
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

          <h2 className="text-3xl mb-2 tracking-tight">{isSignUp ? "Create account" : "Welcome back"}</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            {isSignUp ? "Enter your agency code to get started." : "Sign in to your agent portal."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency-code" className="text-xs uppercase tracking-wider text-muted-foreground">Agency Code</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="agency-code"
                      value={agencyCode}
                      onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
                      placeholder="Enter your agency code"
                      required
                      className="h-11 pl-10 uppercase tracking-wider font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Contact your agency administrator for this code</p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11" />
            </div>
            {!isSignUp && (
              <div className="text-right">
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground/80">
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" className="w-full h-11 aura-gradient-bg border-0 text-white hover:opacity-90 transition-opacity" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Please wait…</> : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); }} className="text-foreground underline underline-offset-4 hover:text-foreground/80">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground underline underline-offset-4">Privacy Policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-foreground underline underline-offset-4">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
