import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if user qualifies for AURA Studio upsell drip:
 * - Has purchased leads on 3+ separate occasions, OR
 * - Has moved 2+ deals to "closed" stage in pipeline
 */
export function useStudioQualification() {
  return useQuery({
    queryKey: ["studio-qualification"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { qualified: false, leadPurchases: 0, closedDeals: 0 };

      // Check lead purchase count via audit_log (create-lead-checkout events)
      const { count: purchaseCount } = await supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "lead_purchase");

      // Also check engine_activity for lead generation sessions as proxy
      const { count: genCount } = await supabase
        .from("engine_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const leadPurchases = (purchaseCount ?? 0) + Math.floor((genCount ?? 0) / 3);

      // Check closed deals in pipeline
      const { count: closedCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", user.id)
        .eq("stage", "closed" as any);

      const closedDeals = closedCount ?? 0;
      const qualified = leadPurchases >= 3 || closedDeals >= 2;

      return { qualified, leadPurchases, closedDeals };
    },
    staleTime: 5 * 60 * 1000,
  });
}
