import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MASTER_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
];

export function ProductProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const isMaster = MASTER_EMAILS.includes(user?.email?.toLowerCase() ?? "");
  const isOnboardingPage = location.pathname === "/connect/onboarding";

  useEffect(() => {
    if (!user || isMaster) {
      setCheckingOnboarding(false);
      return;
    }

    let cancelled = false;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setOnboardingCompleted(data?.onboarding_completed ?? false);
          setCheckingOnboarding(false);
        }
      });
    return () => { cancelled = true; };
  }, [user?.id, isMaster]);

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
