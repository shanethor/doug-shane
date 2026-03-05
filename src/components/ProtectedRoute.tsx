import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { is2FAVerified } from "@/lib/2fa-storage";
import { is2FABypassed } from "@/lib/2fa-bypass";
import { AppLayout } from "@/components/AppLayout";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check 2FA verification (now persisted in localStorage with TTL)
  if (!is2FAVerified() && !is2FABypassed(user.email)) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
