import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { is2FAVerified } from "@/lib/2fa-storage";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

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

  if (loading || checkingApproval) {
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

  if (!is2FAVerified() && !is2FABypassed(user.email)) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
