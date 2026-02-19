import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_KEY = "aura_training_mode";

export function useTrainingMode() {
  const { user } = useAuth();
  // Default to true (training mode ON for new users)
  const [trainingMode, setTrainingModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    // If never set, default to true
    return stored === null ? true : stored === "true";
  });

  // Sync to localStorage whenever it changes
  const setTrainingMode = (value: boolean) => {
    localStorage.setItem(LOCAL_KEY, String(value));
    setTrainingModeState(value);
  };

  // On first load for a user who has never set it, keep it true
  useEffect(() => {
    if (user && localStorage.getItem(LOCAL_KEY) === null) {
      setTrainingMode(true);
    }
  }, [user]);

  return { trainingMode, setTrainingMode };
}
