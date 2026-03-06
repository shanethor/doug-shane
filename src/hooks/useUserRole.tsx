import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "producer" | "manager" | "client_services";

// Module-level cache to avoid re-querying on every component mount
const roleCache: { userId: string | null; role: AppRole; ts: number } = {
  userId: null,
  role: "producer",
  ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("producer");
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setRole("producer");
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
        const foundRole = (data?.[0]?.role as AppRole) || "producer";
        roleCache.userId = user.id;
        roleCache.role = foundRole;
        roleCache.ts = Date.now();
        setRole(foundRole);
        setLoading(false);
      });
  }, [user]);

  const isAdmin = role === "admin";
  const isProducer = role === "producer";
  const isManager = role === "manager";
  const isClientServices = role === "client_services";

  // Navigation visibility
  const canSeeProducerHub = role !== "client_services";
  const canSeeAdmin = role === "admin";

  return {
    role,
    loading,
    isAdmin,
    isProducer,
    isManager,
    isClientServices,
    canSeeProducerHub,
    canSeeAdmin,
  };
}

/** Invalidate the role cache (call after admin changes a user's role) */
export function invalidateRoleCache() {
  roleCache.ts = 0;
}
