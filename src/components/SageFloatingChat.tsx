import { useState, useRef, useEffect, useCallback } from "react";
import { Zap, X, Send, Loader2, Minus, Maximize2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEarlyAccessWhitelist } from "@/hooks/useEarlyAccessWhitelist";
import { executeCalendarActions as runCalendarActions, extractCalendarActions } from "@/lib/calendar-action-utils";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-assistant`;

function stripActionMarkers(text: string) {
  return text
    .replace(/\[CALENDAR_ACTION:[^\]]+\]/g, "")
    .replace(/\[NAVIGATE:[^\]]+\]/g, "")
    .trim();
}

async function streamChat({
  messages, onDelta, onDone, onError, signal,
}: {
  messages: Msg[]; onDelta: (t: string) => void; onDone: () => void; onError: (e: string) => void; signal?: AbortSignal;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages }),
      signal,
    });
    if (!resp.ok) { const err = await resp.json().catch(() => ({ error: "Unknown error" })); onError(err.error || `Error ${resp.status}`); return; }
    if (!resp.body) { onError("No response body"); return; }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try { const parsed = JSON.parse(json); const c = parsed.choices?.[0]?.delta?.content; if (c) onDelta(c); } catch { buf = line + "\n" + buf; break; }
      }
    }
    onDone();
  } catch (e: any) {
    if (e.name === "AbortError") { onDone(); return; }
    onError(e.message || "Stream failed");
  }
}

type SageView = "chat" | "support" | "ticket-form";

export function SageFloatingChat() {
  const { user } = useAuth();
  const { getAccessiblePages } = useEarlyAccessWhitelist();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<SageView>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Support tickets
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamContent]);

  // Load tickets
  useEffect(() => {
    if (!user || view !== "support") return;
    supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setTickets(data);
    });
  }, [user, view]);

  const executeCalendarActions = useCallback(async (assistantText: string) => {
    if (!user) return;

    const actions = extractCalendarActions(assistantText);
    if (!actions.length) return;

    try {
      const { createdCount, externalFailures } = await runCalendarActions({ actions, userId: user.id });

      if (createdCount > 0) {
        toast.success(createdCount === 1 ? "Calendar event created" : `${createdCount} calendar events created`);
        if (externalFailures.length > 0) {
          const needsReconnect = externalFailures.some((failure) => /expired|reconnect|unauthorized|no .* calendar connected/i.test(failure));
          toast.error(needsReconnect
            ? "Event saved in AURA, but your connected calendar needs reconnect to sync externally."
            : "Event saved in AURA, but external calendar sync failed.");
        }
      }
    } catch (error: any) {
      console.error("Sage calendar action failed:", error);
      toast.error(error?.message || "Failed to create calendar event");
    }
  }, [user]);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);
    setStreamContent("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let full = "";

    // Build accessible pages context so Sage only helps with what the user can see
    const accessiblePages = getAccessiblePages();
    const scopeContext: Msg = {
      role: "user",
      content: `[SYSTEM CONTEXT - DO NOT REPEAT]: The user currently has access to these pages only: ${accessiblePages.join(", ")}. Do NOT help with or reference features on pages the user cannot access. If they ask about a gated feature, let them know it's coming soon.`,
    };

    await streamChat({
      messages: [scopeContext, ...newMsgs],
      onDelta: (t) => { full += t; setStreamContent(full); },
      onDone: () => {
        const cleaned = stripActionMarkers(full);
        setMessages((prev) => [...prev, { role: "assistant", content: cleaned || "Done." }]);
        setStreamContent("");
        setStreaming(false);
        void executeCalendarActions(full);
      },
      onError: (e) => { toast.error(e); setStreaming(false); },
      signal: ctrl.signal,
    });
  }, [executeCalendarActions, getAccessiblePages, input, messages, streaming]);

  const submitTicket = async () => {
    if (!user || !ticketTitle.trim()) return;
    setSubmittingTicket(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      title: ticketTitle.trim(),
      description: ticketDesc.trim(),
      category: ticketCategory,
    } as any);
    setSubmittingTicket(false);
    if (error) { toast.error("Failed to submit ticket"); return; }
    toast.success("Support ticket submitted!");
    setTicketTitle(""); setTicketDesc(""); setTicketCategory("general");
    setView("support");
  };

  // Sage popup toggle from settings
  const [enabled, setEnabledState] = useState(() => {
    try { return localStorage.getItem("sage-popup-enabled") !== "false"; } catch { return true; }
  });

  useEffect(() => {
    const handler = () => setEnabledState(localStorage.getItem("sage-popup-enabled") !== "false");
    window.addEventListener("sage-popup-toggle", handler);
    return () => window.removeEventListener("sage-popup-toggle", handler);
  }, []);

  if (!enabled || !user) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-50 h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        style={{ background: "hsl(140 12% 42%)", color: "white" }}
      >
        <Zap className="h-5 w-5" />
      </button>
    );
  }

  if (minimized) {
    return (
      <div
        className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg cursor-pointer"
        style={{ background: "hsl(240 8% 10%)", border: "1px solid hsl(140 12% 42% / 0.3)" }}
        onClick={() => setMinimized(false)}
      >
        <Zap className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
        <span className="text-xs font-medium text-white">Sage</span>
        <Maximize2 className="h-3 w-3 text-white/50" />
      </div>
    );
  }

  const statusColor = (s: string) => s === "open" ? "text-yellow-400" : s === "in_progress" ? "text-blue-400" : "text-green-400";

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[360px] h-[480px] rounded-xl overflow-hidden flex flex-col shadow-2xl"
      style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid hsl(240 6% 14%)", background: "hsl(240 8% 9%)" }}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
          <span className="text-sm font-semibold text-white">Sage</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setView(view === "support" ? "chat" : "support")} className="p-1.5 rounded hover:bg-white/10" title="Support">
            <LifeBuoy className="h-3.5 w-3.5" style={{ color: view === "support" || view === "ticket-form" ? "hsl(140 12% 58%)" : "hsl(240 5% 50%)" }} />
          </button>
          <button onClick={() => setMinimized(true)} className="p-1.5 rounded hover:bg-white/10"><Minus className="h-3.5 w-3.5 text-white/50" /></button>
          <button onClick={() => { setOpen(false); abortRef.current?.abort(); }} className="p-1.5 rounded hover:bg-white/10"><X className="h-3.5 w-3.5 text-white/50" /></button>
        </div>
      </div>

      {/* Chat view */}
      {view === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <Zap className="h-8 w-8" style={{ color: "hsl(140 12% 42%)" }} />
                <p className="text-sm font-medium text-white">Hey! I'm Sage.</p>
                <p className="text-xs" style={{ color: "hsl(240 5% 55%)" }}>Ask me anything or let me help with tasks on this page.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${m.role === "user" ? "text-white" : ""}`}
                  style={m.role === "user"
                    ? { background: "hsl(140 12% 42%)" }
                    : { background: "hsl(240 8% 12%)", color: "hsl(240 5% 80%)" }
                  }>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_strong]:text-white [&_code]:text-[10px] [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded">
                      <ReactMarkdown>{stripActionMarkers(m.content)}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {streaming && streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs" style={{ background: "hsl(240 8% 12%)", color: "hsl(240 5% 80%)" }}>
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_strong]:text-white">
                    <ReactMarkdown>{stripActionMarkers(streamContent)}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            {streaming && !streamContent && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
                <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Sage is thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
            <Input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sage anything…"
              className="h-8 text-xs bg-transparent border-white/10 text-white placeholder:text-white/30"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button size="icon" className="h-8 w-8 shrink-0" style={{ background: "hsl(140 12% 42%)" }} onClick={send} disabled={!input.trim() || streaming}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}

      {/* Support tickets view */}
      {view === "support" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white">Support Tickets</p>
            <Button size="sm" className="text-[10px] h-6 px-2 gap-1" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setView("ticket-form")}>
              + New Ticket
            </Button>
          </div>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <LifeBuoy className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(240 5% 30%)" }} />
              <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>No tickets yet</p>
            </div>
          ) : (
            tickets.map(t => (
              <div key={t.id} className="rounded-lg p-3 space-y-1" style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 6% 16%)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white truncate">{t.title}</p>
                  <span className={`text-[9px] font-bold uppercase ${statusColor(t.status)}`}>{t.status}</span>
                </div>
                <p className="text-[10px] truncate" style={{ color: "hsl(240 5% 55%)" }}>{t.description || "No description"}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "hsl(240 8% 16%)", color: "hsl(240 5% 60%)" }}>{t.category}</span>
                  <span className="text-[9px]" style={{ color: "hsl(240 5% 40%)" }}>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New ticket form */}
      {view === "ticket-form" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          <button onClick={() => setView("support")} className="text-[10px] hover:underline" style={{ color: "hsl(140 12% 58%)" }}>← Back to tickets</button>
          <p className="text-sm font-semibold text-white">New Support Ticket</p>
          <div className="space-y-2">
            <Input value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} placeholder="Title" className="h-8 text-xs bg-transparent border-white/10 text-white placeholder:text-white/30" />
            <textarea
              value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} placeholder="Describe your issue…" rows={4}
              className="w-full rounded-md border px-3 py-2 text-xs bg-transparent border-white/10 text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(140_12%_42%)]"
            />
            <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}
              className="w-full h-8 rounded-md border px-2 text-xs bg-transparent border-white/10 text-white">
              <option value="general" className="bg-[#111]">General</option>
              <option value="bug" className="bg-[#111]">Bug Report</option>
              <option value="feature" className="bg-[#111]">Feature Request</option>
              <option value="billing" className="bg-[#111]">Billing</option>
              <option value="account" className="bg-[#111]">Account</option>
            </select>
            <Button className="w-full h-8 text-xs" style={{ background: "hsl(140 12% 42%)" }} onClick={submitTicket} disabled={!ticketTitle.trim() || submittingTicket}>
              {submittingTicket ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit Ticket"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}