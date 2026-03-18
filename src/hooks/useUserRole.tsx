import { useEffect, useState, useRef } from "react";
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
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("advisor");
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setRole("advisor");
      setLoading(false);
      return;
    }

    // Use cache if fresh and same user
    if (roleCache.userId === user.id && Date.now() - roleCache.ts < CACHE_TTL) {
      setRole(roleCache.role);
      setLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data }) => {
        const foundRole = (data?.[0]?.role as AppRole) || "advisor";
        roleCache.userId = user.id;
        roleCache.role = foundRole;
        roleCache.ts = Date.now();
        setRole(foundRole);
        setLoading(false);
      });
  }, [user]);

  const isAdmin = role === "admin";
  const isAdvisor = role === "advisor";
  const isManager = role === "manager";
  const isClientServices = role === "client_services";

  // Navigation visibility
  const canSeeAdvisorHub = role !== "client_services";
  const canSeeAdmin = role === "admin";

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
    canSeeAdvisorHub,
    canSeeProducerHub,
    canSeeAdmin,
  };
}

/** Invalidate the role cache (call after admin changes a user's role) */
export function invalidateRoleCache() {
  roleCache.ts = 0;
}
