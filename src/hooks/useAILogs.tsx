import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export interface AILogEntry {
  id: string;
  created_at: string;
  function_name: string;
  operation: string | null;
  error_code: string | null;
  error_message: string;
  severity: "error" | "warning" | "info";
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  resolved: boolean;
  user_id: string | null;
}

export function useAILogs(limit = 50) {
  const { isAdmin } = useUserRole();
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    let query = (supabase.from("ai_error_logs" as any) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!isAdmin) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (!error && data) setLogs(data as AILogEntry[]);
    setLoading(false);
  }, [isAdmin, limit]);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("ai_error_logs_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_error_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as AILogEntry, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, limit]);

  const markResolved = useCallback(async (logId: string) => {
    await (supabase.from("ai_error_logs" as any) as any)
      .update({ resolved: true })
      .eq("id", logId);
    setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, resolved: true } : l));
  }, []);

  const clearAll = useCallback(async () => {
    const ids = logs.map((l) => l.id);
    if (ids.length === 0) return;
    await (supabase.from("ai_error_logs" as any) as any).update({ resolved: true }).in("id", ids);
    setLogs([]);
  }, [logs]);

  return { logs, loading, fetchLogs, markResolved, clearAll };
}
