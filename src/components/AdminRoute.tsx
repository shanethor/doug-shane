import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";

/**
 * Route guard that requires the authenticated user to have the 'admin' role.
 * Non-admins are redirected to their default dashboard.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading, canSeeAdmin } = useUserRole();

  if (loading || roleLoading) {
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

  if (!canSeeAdmin) {
    return <Navigate to="/insurance/connect" replace />;
  }

  return <>{children}</>;
}
