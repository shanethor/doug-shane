import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Branch = "risk" | "property" | "wealth" | null;

const branchCache: { userId: string | null; branch: Branch; ts: number } = {
  userId: null,
  branch: null,
  ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000;

export function useUserBranch() {
  const { user, loading: authLoading } = useAuth();
  const [branch, setBranch] = useState<Branch>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) { setLoading(true); return; }
    if (!user) { setBranch(null); setLoading(false); return; }

    if (branchCache.userId === user.id && Date.now() - branchCache.ts < CACHE_TTL) {
      setBranch(branchCache.branch);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("profiles")
      .select("branch")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const b = (data?.branch as Branch) || null;
        branchCache.userId = user.id;
        branchCache.branch = b;
        branchCache.ts = Date.now();
        setBranch(b);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return { branch, loading, isRisk: branch === "risk", isProperty: branch === "property", isWealth: branch === "wealth", isConsulting: branch === "wealth" };
}

export function invalidateBranchCache() {
  branchCache.ts = 0;
}
