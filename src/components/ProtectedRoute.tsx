import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { is2FAVerified } from "@/lib/2fa-storage";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserBranch } from "@/hooks/useUserBranch";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [hasFullSiteAccess, setHasFullSiteAccess] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const { branch, loading: branchLoading } = useUserBranch();
  const { subscribed, loading: subLoading } = useSubscription();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      setCheckingApproval(false);
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, agency_id")
        .eq("user_id", user.id)
        .single();

      setApprovalStatus(profile?.approval_status || "approved");

      // Check agency full_site_access
      if (profile?.agency_id) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("full_site_access")
          .eq("id", profile.agency_id)
          .single();
        setHasFullSiteAccess(agency?.full_site_access ?? false);
      } else {
        setHasFullSiteAccess(false);
      }

      setCheckingApproval(false);
    })();
  }, [user]);

  if (loading || checkingApproval || branchLoading || subLoading || roleLoading) {
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

  // Admin always has full access
  const isAdmin = role === "admin";

  // Paths available to paywall-blocked users
  const freePathPrefixes = ["/insurance/connect", "/insurance/concierge", "/insurance/settings", "/insurance/admin", "/request-access"];
  const isFreePath = freePathPrefixes.some(p => location.pathname.startsWith(p));

  // Branch-based routing: property/wealth users need active subscription
  const isBranchRestricted = branch === "property" || branch === "wealth";

  if (isBranchRestricted && !subscribed) {
    if (location.pathname !== "/request-access") {
      return <Navigate to="/request-access" replace />;
    }
  }

  if (isBranchRestricted && subscribed && !isFreePath && !isAdmin) {
    return <Navigate to="/insurance/connect" replace />;
  }

  // Default paywall: users without agency full_site_access and without an assigned role
  // can only access Connect, Concierge, Settings
  if (!isAdmin && !hasFullSiteAccess && !isFreePath) {
    // Users with no role assignment yet (default "advisor" from no user_roles row)
    // and no agency full_site_access should be blocked to Connect/Concierge
    if (!isBranchRestricted) {
      // Check if user has an explicitly assigned role (not default fallback)
      // If they do, they're approved for full access
      // The role system assigns roles on admin approval, so having a role = approved for full
      // But if their agency doesn't have full_site_access, restrict them
      // Only restrict if no full_site_access on agency
      return <Navigate to="/insurance/connect" replace />;
    }
  }

  return <>{children}</>;
}
