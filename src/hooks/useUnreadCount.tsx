import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Module-level shared state to avoid duplicate fetches across component instances
let sharedCount = 0;
let sharedUserId: string | null = null;
let listeners: Set<(count: number) => void> = new Set();
let channelRef: ReturnType<typeof supabase.channel> | null = null;
let timerRef: ReturnType<typeof setTimeout> | null = null;

function notifyListeners(count: number) {
  sharedCount = count;
  listeners.forEach((fn) => fn(count));
}

async function fetchCountShared(userId: string) {
  const [notifRes, emailRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
    supabase
      .from("synced_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);
  notifyListeners((notifRes.count ?? 0) + (emailRes.count ?? 0));
}

function debouncedFetchShared(userId: string) {
  if (timerRef) clearTimeout(timerRef);
  timerRef = setTimeout(() => fetchCountShared(userId), 500);
}

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(sharedCount);

  useEffect(() => {
    if (!user) return;

    // Register this component as a listener
    listeners.add(setCount);

    // If we're the first listener or user changed, set up shared subscription
    if (sharedUserId !== user.id) {
      sharedUserId = user.id;

      // Clean up old channel
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
      // Already initialized, just sync current value
      setCount(sharedCount);
    }

    // Listen for manual refresh events
    const onRefresh = () => {
      if (sharedUserId) fetchCountShared(sharedUserId);
    };
    window.addEventListener("unread-count-refresh", onRefresh);

    return () => {
      listeners.delete(setCount);
      window.removeEventListener("unread-count-refresh", onRefresh);

      // If no more listeners, clean up
      if (listeners.size === 0 && channelRef) {
        if (timerRef) clearTimeout(timerRef);
        supabase.removeChannel(channelRef);
        channelRef = null;
        sharedUserId = null;
      }
    };
  }, [user]);

  return count;
}
