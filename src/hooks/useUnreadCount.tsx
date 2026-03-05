import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async (userId: string) => {
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
    setCount((notifRes.count ?? 0) + (emailRes.count ?? 0));
  }, []);

  // Debounced fetch to avoid rapid re-queries from bulk updates
  const debouncedFetch = useCallback((userId: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchCount(userId), 500);
  }, [fetchCount]);

  useEffect(() => {
    if (!user) return;

    fetchCount(user.id);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel("unread-count")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => debouncedFetch(user.id)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "synced_emails", filter: `user_id=eq.${user.id}` },
          () => debouncedFetch(user.id)
        );

      channel.subscribe();
    } catch (error) {
      // Some mobile browsers can block websocket initialization ("operation is insecure").
      // Keep app functional by falling back to polling-only unread count updates.
      console.warn("[useUnreadCount] Realtime unavailable; continuing without websocket", error);
      channel = null;
    }

    // Listen for manual refresh events (e.g. after marking items read in Inbox)
    const onRefresh = () => fetchCount(user.id);
    window.addEventListener("unread-count-refresh", onRefresh);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("unread-count-refresh", onRefresh);
    };
  }, [user, fetchCount, debouncedFetch]);

  return count;
}
