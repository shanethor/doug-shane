import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { is2FAVerified } from "@/lib/2fa-storage";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check 2FA verification (now persisted in localStorage with TTL)
  if (!is2FAVerified()) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
