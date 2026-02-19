import { useState, useEffect, useCallback } from "react";

const LOCAL_KEY = "aura_training_mode";
const EVENT_KEY = "aura_training_mode_change";

export function useTrainingMode() {
  const [trainingMode, setTrainingModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    return stored === null ? true : stored === "true";
  });

  const setTrainingMode = useCallback((value: boolean) => {
    localStorage.setItem(LOCAL_KEY, String(value));
    setTrainingModeState(value);
    // Broadcast to all other hook instances in the same tab
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: value }));
  }, []);

  // Listen for changes from other component instances (same tab)
  useEffect(() => {
    const handler = (e: Event) => {
      setTrainingModeState((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT_KEY, handler);
    return () => window.removeEventListener(EVENT_KEY, handler);
  }, []);

  // Default to true for new users
  useEffect(() => {
    if (localStorage.getItem(LOCAL_KEY) === null) {
      setTrainingMode(true);
    }
  }, [setTrainingMode]);

  return { trainingMode, setTrainingMode };
}

