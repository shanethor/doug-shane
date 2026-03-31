import { useAuth } from "@/hooks/useAuth";

const WHITELISTED_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
  "shafer.cailin@gmail.com",
];

// Pages that are always accessible (not gated)
const UNGATED_PAGES = ["pipeline", "leads", "studio"];

export function useEarlyAccessWhitelist() {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() ?? "";
  const isWhitelisted = WHITELISTED_EMAILS.includes(email);

  const isPageGated = (page: string) => {
    if (isWhitelisted) return false;
    if (UNGATED_PAGES.includes(page)) return false;
    return true;
  };

  return { isWhitelisted, isPageGated };
}
