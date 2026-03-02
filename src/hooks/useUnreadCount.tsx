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

    const channel = supabase
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
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount, debouncedFetch]);

  return count;
}
