import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MASTER_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
];

const ONBOARDING_KEY = "aura_onboarding_completed";

export function ProductProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check localStorage first for instant result (avoids flash)
  const cachedComplete = user ? localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`) === "true" : false;

  const [checkingOnboarding, setCheckingOnboarding] = useState(!cachedComplete);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(cachedComplete);

  const isMaster = MASTER_EMAILS.includes(user?.email?.toLowerCase() ?? "");
  const isOnboardingPage = location.pathname === "/connect/onboarding";

  useEffect(() => {
    if (!user || isMaster) {
      setCheckingOnboarding(false);
      return;
    }

    // Trust localStorage cache — avoids race conditions after onboarding completion
    if (cachedComplete) {
      setOnboardingCompleted(true);
      setCheckingOnboarding(false);
      return;
    }

    let cancelled = false;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          const completed = data?.onboarding_completed ?? false;
          setOnboardingCompleted(completed);
          if (completed) {
            localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
          }
          setCheckingOnboarding(false);
        }
      });
    return () => { cancelled = true; };
  }, [user?.id, isMaster, cachedComplete]);

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(140,12%,50%)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/get-started" replace />;
  }

  // Master accounts skip onboarding
  if (isMaster) {
    return <>{children}</>;
  }

  // Non-master: redirect to onboarding if not completed (and not already on it)
  if (!onboardingCompleted && !isOnboardingPage) {
    return <Navigate to="/connect/onboarding" replace />;
  }

  return <>{children}</>;
}
