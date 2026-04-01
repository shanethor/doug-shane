import { useAuth } from "@/hooks/useAuth";

const WHITELISTED_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
  "shafer.cailin@gmail.com",
];

// Pages that are always accessible (not gated)
const UNGATED_PAGES = ["pipeline", "leads", "studio", "property"];

export function useEarlyAccessWhitelist() {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() ?? "";
  const isWhitelisted = WHITELISTED_EMAILS.includes(email);

  const isPageGated = (page: string) => {
    if (isWhitelisted) return false;
    if (UNGATED_PAGES.includes(page)) return false;
    return true;
  };

  /** Returns list of page keys the user can actually access */
  const getAccessiblePages = (): string[] => {
    if (isWhitelisted) {
      return ["connect", "intelligence", "pipeline", "email", "calendar", "create", "leads", "property", "sage"];
    }
    return UNGATED_PAGES;
  };

  return { isWhitelisted, isPageGated, getAccessiblePages };
}
