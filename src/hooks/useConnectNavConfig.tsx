import { useState, useEffect, useCallback } from "react";

export type ConnectNavTab = {
  id: string;
  label: string;
  to: string;
};

export const ALL_CONNECT_TABS: ConnectNavTab[] = [
  { id: "connect", label: "Connect", to: "/connect" },
  { id: "intelligence", label: "Intelligence", to: "/connect/intelligence" },
  { id: "leads", label: "Leads", to: "/connect/leads" },
  { id: "pipeline", label: "Pipeline", to: "/connect/pipeline" },
  { id: "email", label: "Email", to: "/connect/email" },
  { id: "calendar", label: "Calendar", to: "/connect/calendar" },
  { id: "create", label: "Create", to: "/connect/create" },
  { id: "sage", label: "Sage", to: "/connect/sage" },
];

const DEFAULT_VISIBLE_IDS = ["connect", "intelligence", "pipeline", "email", "calendar"];
const STORAGE_KEY = "connect_nav_config";

export type ConnectNavConfig = {
  visibleTabIds: string[];
};

function loadConfig(): ConnectNavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validIds = new Set(ALL_CONNECT_TABS.map(t => t.id));
      const filtered = (parsed.visibleTabIds || []).filter((id: string) => validIds.has(id));
      if (filtered.length >= 2) return { visibleTabIds: filtered };
    }
  } catch {}
  return { visibleTabIds: DEFAULT_VISIBLE_IDS };
}

export function useConnectNavConfig() {
  const [config, setConfigState] = useState<ConnectNavConfig>(loadConfig);

  const setConfig = useCallback((c: ConnectNavConfig) => {
    setConfigState(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  }, []);

  useEffect(() => {
    const handler = () => setConfigState(loadConfig());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { config, setConfig };
}
