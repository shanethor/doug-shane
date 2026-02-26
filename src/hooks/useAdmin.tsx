import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Module-level cache to avoid re-querying on every component mount
const adminCache: { userId: string | null; isAdmin: boolean; ts: number } = {
  userId: null,
  isAdmin: false,
  ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Use cache if fresh and same user
    if (
      adminCache.userId === user.id &&
      Date.now() - adminCache.ts < CACHE_TTL
    ) {
      setIsAdmin(adminCache.isAdmin);
      setLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => {
        const result = (data?.length ?? 0) > 0;
        adminCache.userId = user.id;
        adminCache.isAdmin = result;
        adminCache.ts = Date.now();
        setIsAdmin(result);
        setLoading(false);
      });
  }, [user]);

  return { isAdmin, loading };
}
