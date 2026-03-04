import { useState, useEffect, useCallback } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total milliseconds remaining */
  totalMs: number;
  /** Formatted string: "XXd · HH:MM:SS" */
  formatted: string;
  /** True when target has been reached */
  expired: boolean;
}

/**
 * Live countdown hook that updates every second.
 * Handles tab-visibility to avoid runaway intervals.
 * @param targetDate – the Date to count down to
 */
export function useCountdown(targetDate: Date): CountdownResult {
  const calc = useCallback((): CountdownResult => {
    const diff = Math.max(0, targetDate.getTime() - Date.now());
    const expired = diff === 0;
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${days}d · ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return { days, hours, minutes, seconds, totalMs: diff, formatted, expired };
  }, [targetDate]);

  const [state, setState] = useState<CountdownResult>(calc);

  useEffect(() => {
    setState(calc());
    const id = setInterval(() => setState(calc()), 1000);

    // Pause when tab is hidden to save resources
    const onVisibility = () => {
      if (!document.hidden) setState(calc());
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [calc]);

  return state;
}
