import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_KEY = "aura_training_mode";
const EVENT_KEY = "aura_training_mode_change";

export function useTrainingMode() {
  const [trainingMode, setTrainingModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    return stored === "true";
  });
  const dbLoadedRef = useRef(false);

  // Load from database on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("form_defaults")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.form_defaults) {
        const defaults = profile.form_defaults as Record<string, any>;
        if (typeof defaults._training_mode === "boolean") {
          dbLoadedRef.current = true;
          localStorage.setItem(LOCAL_KEY, String(defaults._training_mode));
          setTrainingModeState(defaults._training_mode);
          window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: defaults._training_mode }));
        }
      }
    })();
  }, []);

  const setTrainingMode = useCallback(async (value: boolean) => {
    localStorage.setItem(LOCAL_KEY, String(value));
    setTrainingModeState(value);
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: value }));

    // Persist to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("form_defaults")
        .eq("user_id", user.id)
        .maybeSingle();
      const existing = (profile?.form_defaults as Record<string, any>) || {};
      await supabase
        .from("profiles")
        .update({ form_defaults: { ...existing, _training_mode: value } })
        .eq("user_id", user.id);
    } catch (err) {
      console.warn("Failed to persist training mode:", err);
    }
  }, []);

  // Listen for changes from other component instances (same tab)
  useEffect(() => {
    const handler = (e: Event) => {
      setTrainingModeState((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT_KEY, handler);
    return () => window.removeEventListener(EVENT_KEY, handler);
  }, []);

  return { trainingMode, setTrainingMode };
}
