import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { is2FAVerified } from "@/lib/2fa-storage";
import { AppLayout } from "@/components/AppLayout";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  console.log("[ProtectedRoute] loading:", loading, "user:", !!user, "2fa:", is2FAVerified());

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
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Check 2FA verification (now persisted in localStorage with TTL)
  if (!is2FAVerified()) {
    console.log("[ProtectedRoute] 2FA not verified, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
