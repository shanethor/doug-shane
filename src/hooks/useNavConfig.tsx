import { useState, useEffect, useCallback } from "react";

export type NavTab = {
  id: string;
  label: string;
  to: string;
};

export const ALL_NAV_TABS: NavTab[] = [
  { id: "chat", label: "Chat", to: "/" },
  { id: "inbox", label: "Inbox", to: "/inbox" },
  { id: "clients", label: "Clients", to: "/clients" },
  { id: "pipeline", label: "Pipeline", to: "/pipeline" },
  { id: "calendar", label: "Calendar", to: "/calendar" },
  { id: "production", label: "Production", to: "/my-dashboard" },
  { id: "pulse", label: "Pulse", to: "/pulse" },
];

const DEFAULT_TAB_IDS = ["chat", "inbox", "clients", "pipeline", "calendar"];
const DEFAULT_COUNT = 5;
const STORAGE_KEY = "nav_config";

export type NavConfig = {
  tabCount: number;
  selectedTabIds: string[];
};

function loadFromStorage(): NavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tabCount && parsed.selectedTabIds) return parsed;
    }
  } catch {}
  return { tabCount: DEFAULT_COUNT, selectedTabIds: DEFAULT_TAB_IDS };
}

export function saveNavConfig(config: NavConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useNavConfig() {
  const [config, setConfigState] = useState<NavConfig>(loadFromStorage);

  const setConfig = useCallback((c: NavConfig) => {
    setConfigState(c);
    saveNavConfig(c);
  }, []);

  // Listen for storage changes from other components
  useEffect(() => {
    const handler = () => setConfigState(loadFromStorage());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { config, setConfig };
}
