import { supabase } from "@/integrations/supabase/client";

export interface LogEntry {
  function_name: string;
  operation?: string;
  error_code?: string;
  error_message: string;
  severity?: "error" | "warning" | "info";
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  session_id?: string;
}

export async function logAIError(entry: LogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ai_error_logs" as any).insert({
      user_id: user?.id ?? null,
      session_id: entry.session_id ?? null,
      function_name: entry.function_name,
      operation: entry.operation ?? null,
      error_code: entry.error_code ?? null,
      error_message: entry.error_message,
      severity: entry.severity ?? "error",
      duration_ms: entry.duration_ms ?? null,
      metadata: entry.metadata ?? {},
    } as any);
  } catch (loggingError) {
    console.warn("[aiLogger] Failed to write log entry:", loggingError);
  }
}
