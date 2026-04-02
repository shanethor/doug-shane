import { useAuth } from "@/hooks/useAuth";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const WHITELISTED_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
  "shafer.cailin@gmail.com",
];

const MASTER_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
];

// Pages that are always accessible (not gated)
const UNGATED_PAGES = ["pipeline", "leads", "studio", "property", "sage", "create"];

export function useEarlyAccessWhitelist() {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() ?? "";
  const isWhitelisted = WHITELISTED_EMAILS.includes(email);
  const isMaster = MASTER_EMAILS.includes(email);
  const [userIndustry, setUserIndustry] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("industry").eq("user_id", user.id).single()
      .then(({ data }) => setUserIndustry(data?.industry ?? null));
  }, [user]);

  const isPageGated = (page: string) => {
    if (isWhitelisted) return false;
    if (UNGATED_PAGES.includes(page)) return false;
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
    if (isMaster) {
      return ["connect", "intelligence", "pipeline", "email", "calendar", "create", "leads", "property", "sage"];
    }
    const pages = [...UNGATED_PAGES.filter(p => p !== "property")];
    if (canSeeProperty()) pages.push("property");
    return pages;
  };

  return { isWhitelisted, isMaster, isPageGated, getAccessiblePages, canSeeProperty, userIndustry };
}
