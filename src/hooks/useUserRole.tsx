import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "advisor" | "manager" | "client_services" | "property";

// Module-level cache to avoid re-querying on every component mount
const roleCache: { userId: string | null; role: AppRole; ts: number } = {
  userId: null,
  role: "advisor",
  ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>("advisor");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Stay loading until auth finishes hydrating
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setRole("advisor");
      setLoading(false);
      return;
    }

    if (roleCache.userId === user.id && Date.now() - roleCache.ts < CACHE_TTL) {
      setRole(roleCache.role);
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1);

        if (cancelled) return;

        const foundRole = error ? "advisor" : ((data?.[0]?.role as AppRole) || "advisor");
        roleCache.userId = user.id;
        roleCache.role = foundRole;
        roleCache.ts = Date.now();
        setRole(foundRole);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setRole("advisor");
        setLoading(false);
      }
    };

    loadRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const isAdmin = !loading && role === "admin";
  const isAdvisor = !loading && role === "advisor";
  const isManager = !loading && role === "manager";
  const isClientServices = !loading && role === "client_services";
  const isProperty = !loading && role === "property";

  // Navigation visibility
  const canSeeAdvisorHub = !loading && role !== "client_services" && role !== "property";
  const canSeeAdmin = !loading && role === "admin";
  const canSeeChat = !loading && role !== "property";
  const canSeeEmail = !loading && role !== "property";
  const canSeePulse = !loading && role !== "property";
  const canSeeLossRuns = !loading && role !== "property";

  // Backward-compatible aliases
  const isProducer = isAdvisor;
  const canSeeProducerHub = canSeeAdvisorHub;

  return {
    role,
    loading,
    isAdmin,
    isAdvisor,
    isProducer,
    isManager,
    isClientServices,
    isProperty,
    canSeeAdvisorHub,
    canSeeProducerHub,
    canSeeAdmin,
    canSeeChat,
    canSeeEmail,
    canSeePulse,
    canSeeLossRuns,
  };
}

/** Invalidate the role cache (call after admin changes a user's role) */
export function invalidateRoleCache() {
  roleCache.ts = 0;
}
