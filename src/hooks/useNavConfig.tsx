import { useState, useEffect, useCallback } from "react";

export type NavTab = {
  id: string;
  label: string;
  to: string;
};

export const ALL_NAV_TABS: NavTab[] = [
  { id: "aura", label: "AURA", to: "/" },
  { id: "email", label: "Email", to: "/email" },
  { id: "pulse", label: "Pulse", to: "/pulse" },
  { id: "hub", label: "Command Center", to: "/hub" },
];

const DEFAULT_TAB_IDS = ["aura", "email", "pulse", "hub"];
const DEFAULT_COUNT = 4;
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
      // Validate that stored IDs still exist in ALL_NAV_TABS
      const validIds = new Set(ALL_NAV_TABS.map(t => t.id));
      const filteredIds = (parsed.selectedTabIds || []).filter((id: string) => validIds.has(id));
      if (filteredIds.length > 0) {
        return { tabCount: parsed.tabCount || DEFAULT_COUNT, selectedTabIds: filteredIds };
      }
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

  useEffect(() => {
    const handler = () => setConfigState(loadFromStorage());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { config, setConfig };
}
