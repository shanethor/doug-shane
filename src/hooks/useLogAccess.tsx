import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLogAccess() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading) return;
    if (isAdmin) {
      setHasAccess(true);
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase
        .from("user_log_access" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          setHasAccess(!!data);
          setLoading(false);
        });
    });
  }, [isAdmin, roleLoading]);

  return { hasAccess, loading };
}
