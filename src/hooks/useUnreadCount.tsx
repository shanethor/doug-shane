import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Shared state for split counts
let sharedEmailCount = 0;
let sharedPulseCount = 0;
let sharedUserId: string | null = null;
let listeners: Set<(email: number, pulse: number) => void> = new Set();
let channelRef: ReturnType<typeof supabase.channel> | null = null;
let timerRef: ReturnType<typeof setTimeout> | null = null;

function notifyListeners(email: number, pulse: number) {
  sharedEmailCount = email;
  sharedPulseCount = pulse;
  listeners.forEach((fn) => fn(email, pulse));
}

async function fetchCountShared(userId: string) {
  const [emailRes, pulseRes] = await Promise.all([
    supabase
      .from("synced_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);
  notifyListeners(emailRes.count ?? 0, pulseRes.count ?? 0);
}

function debouncedFetchShared(userId: string) {
  if (timerRef) clearTimeout(timerRef);
  timerRef = setTimeout(() => fetchCountShared(userId), 500);
}

/**
 * Returns { emailCount, pulseCount, totalCount } for badge display.
 * emailCount = unread synced_emails (Email page)
 * pulseCount = unread notifications (Pulse page — pipeline, loss runs, intake, documents, etc.)
 */
export function useUnreadCount() {
  const { user } = useAuth();
  const [emailCount, setEmailCount] = useState(sharedEmailCount);
  const [pulseCount, setPulseCount] = useState(sharedPulseCount);

  useEffect(() => {
    if (!user) return;

    const listener = (e: number, p: number) => {
      setEmailCount(e);
      setPulseCount(p);
    };
    listeners.add(listener);

    if (sharedUserId !== user.id) {
      sharedUserId = user.id;

      if (channelRef) {
        supabase.removeChannel(channelRef);
        channelRef = null;
      }

      fetchCountShared(user.id);

      channelRef = supabase
        .channel("unread-count-shared")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => debouncedFetchShared(user.id)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "synced_emails", filter: `user_id=eq.${user.id}` },
          () => debouncedFetchShared(user.id)
        )
        .subscribe();
    } else {
      setEmailCount(sharedEmailCount);
      setPulseCount(sharedPulseCount);
    }

    const onRefresh = () => {
      if (sharedUserId) fetchCountShared(sharedUserId);
    };
    window.addEventListener("unread-count-refresh", onRefresh);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("unread-count-refresh", onRefresh);

      if (listeners.size === 0 && channelRef) {
        if (timerRef) clearTimeout(timerRef);
        supabase.removeChannel(channelRef);
        channelRef = null;
        sharedUserId = null;
      }
    };
  }, [user]);

  return { emailCount, pulseCount, totalCount: emailCount + pulseCount };
}
