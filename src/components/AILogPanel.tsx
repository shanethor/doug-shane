import { useState, useEffect, useRef } from "react";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useAILogs, type AILogEntry } from "@/hooks/useAILogs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Info, Check, X, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "aura_log_panel_visible";

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "error": return <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />;
    default: return <Info className="h-4 w-4 text-blue-600 shrink-0" />;
  }
}

function severityBg(severity: string) {
  switch (severity) {
    case "error": return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
    case "warning": return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800";
    default: return "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800";
  }
}

export function AILogPanel() {
  const { hasAccess, loading: accessLoading } = useLogAccess();
  const { logs, loading: logsLoading, markResolved, clearAll } = useAILogs();
  const [visible, setVisible] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(visible));
  }, [visible]);

  // Auto-scroll on new logs
  useEffect(() => {
    if (scrollRef.current && visible) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length, visible]);

  if (accessLoading || !hasAccess) return null;

  const unresolvedLogs = logs.filter((l) => !l.resolved);
  const errorCount = unresolvedLogs.filter((l) => l.severity === "error").length;
  const warningCount = unresolvedLogs.filter((l) => l.severity === "warning").length;
  const totalUnresolved = unresolvedLogs.length;

  // Collapsed: floating button
  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-1.5 rounded-full bg-card border border-border shadow-lg px-3 py-2 hover:bg-muted transition-colors"
      >
        <Eye className="h-4 w-4 text-muted-foreground" />
        {totalUnresolved > 0 && (
          <span className={`h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${errorCount > 0 ? "bg-red-600" : "bg-yellow-500"}`}>
            {totalUnresolved}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          AI Activity Log
          {totalUnresolved > 0 && (
            <span className={`h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${errorCount > 0 ? "bg-red-600" : "bg-yellow-500"}`}>
              {totalUnresolved}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          {unresolvedLogs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-[11px] gap-1 text-muted-foreground">
              <Trash2 className="h-3 w-3" />Clear All
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVisible(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="max-h-[380px]" ref={scrollRef}>
        <div className="p-2 space-y-1.5">
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : unresolvedLogs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No AI errors logged — everything is running normally.
            </div>
          ) : (
            unresolvedLogs.map((log) => (
              <LogEntry key={log.id} log={log} onDismiss={() => markResolved(log.id)} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function LogEntry({ log, onDismiss }: { log: AILogEntry; onDismiss: () => void }) {
  return (
    <div className={`rounded-lg border p-2.5 ${severityBg(log.severity)}`}>
      <div className="flex items-start gap-2">
        <SeverityIcon severity={log.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold truncate">
              {log.operation || log.function_name}
            </span>
            <button onClick={onDismiss} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0">
              <Check className="h-3 w-3" /> Dismiss
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {log.error_message}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
            {log.duration_ms != null && <span>· took {(log.duration_ms / 1000).toFixed(1)}s</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
