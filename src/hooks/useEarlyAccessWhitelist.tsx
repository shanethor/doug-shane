import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { isMasterEmail, isWhitelistedEmail } from "@/lib/master-accounts";

// Pages that are always accessible (not gated)
const UNGATED_PAGES = ["dashboard", "pipeline", "leads", "studio", "property", "clark", "create"];

// Pages unlocked by an active Connect subscription (subscribers shouldn't be blocked)
const SUBSCRIBER_PAGES = ["connect", "intelligence", "email", "calendar", "rewards", "create"];

export function useEarlyAccessWhitelist() {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const email = user?.email?.toLowerCase() ?? "";
  const isWhitelisted = isWhitelistedEmail(email);
  const isMaster = isMasterEmail(email);
  const [userIndustry, setUserIndustry] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("industry").eq("user_id", user.id).single()
      .then(({ data }) => setUserIndustry(data?.industry ?? null));
  }, [user]);

  const isPageGated = (page: string) => {
    if (isWhitelisted) return false;
    if (UNGATED_PAGES.includes(page)) return false;
    // Paying subscribers get access to all Connect features
    if (subscribed && SUBSCRIBER_PAGES.includes(page)) return false;
    return true;
  };

  /** Whether the user can see the Property page */
  const canSeeProperty = (): boolean => {
    if (isMaster) return true;
    const realEstateIndustries = ["real_estate", "property", "Real Estate", "Property"];
    return realEstateIndustries.includes(userIndustry ?? "");
  };

  /** Returns list of page keys the user can actually access */
  const getAccessiblePages = (): string[] => {
    const ALL_PAGES = ["connect", "intelligence", "pipeline", "email", "calendar", "create", "leads", "property", "clark", "rewards"];
    if (isMaster || isWhitelisted) {
      return ALL_PAGES.filter(p => p !== "property" || canSeeProperty());
    }
    if (subscribed) {
      const pages = [...UNGATED_PAGES.filter(p => p !== "property"), ...SUBSCRIBER_PAGES];
      if (canSeeProperty()) pages.push("property");
      return [...new Set(pages)];
    }
    const pages = [...UNGATED_PAGES.filter(p => p !== "property")];
    if (canSeeProperty()) pages.push("property");
    return pages;
  };

  return { isWhitelisted, isMaster, isPageGated, getAccessiblePages, canSeeProperty, userIndustry };
}
