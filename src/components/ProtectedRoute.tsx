import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { is2FAVerified } from "@/lib/2fa-storage";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserBranch } from "@/hooks/useUserBranch";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const { branch, loading: branchLoading } = useUserBranch();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      setCheckingApproval(false);
      return;
    }
    supabase
      .from("profiles")
      .select("approval_status")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setApprovalStatus(data?.approval_status || "approved");
        setCheckingApproval(false);
      });
  }, [user]);

  if (loading || checkingApproval || branchLoading) {
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

  if (approvalStatus === "pending") {
    return <Navigate to="/auth" replace />;
  }

  if (!is2FAVerified() && !user.user_metadata?.skip_2fa) {
    return <Navigate to="/auth" replace />;
  }

  // Branch-based routing: property/wealth users can only access Connect, Settings, Admin
  const isBranchRestricted = branch === "property" || branch === "wealth";
  const allowedPaths = ["/connect", "/settings", "/admin"];
  if (isBranchRestricted && !allowedPaths.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/connect" replace />;
  }

  return <>{children}</>;
}
