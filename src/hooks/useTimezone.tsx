import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const LOCAL_KEY = "aura-timezone";
const AUTO_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Returns the user's preferred timezone.
 * Priority: DB profile → localStorage → auto-detected browser timezone.
 */
export function useTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezoneState] = useState<string>(() => {
    return localStorage.getItem(LOCAL_KEY) || AUTO_TZ;
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle();
      if ((data as any)?.timezone) {
        setTimezoneState((data as any).timezone);
        localStorage.setItem(LOCAL_KEY, (data as any).timezone);
      }
    })();
  }, [user]);

  const setTimezone = async (tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem(LOCAL_KEY, tz);
    if (user) {
      await supabase
        .from("profiles")
        .update({ timezone: tz } as any)
        .eq("user_id", user.id);
    }
  };

  return { timezone, setTimezone, autoDetected: AUTO_TZ };
}

/**
 * Format a Date in the user's timezone.
 */
export function formatInTimezone(date: Date, tz: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...options }).format(date);
}
