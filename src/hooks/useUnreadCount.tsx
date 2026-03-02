import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = async (userId: string) => {
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
  };

  useEffect(() => {
    if (!user) return;

    fetchCount(user.id);

    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchCount(user.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "synced_emails", filter: `user_id=eq.${user.id}` },
        () => fetchCount(user.id)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
