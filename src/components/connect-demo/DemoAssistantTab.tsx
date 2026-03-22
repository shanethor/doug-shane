import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, FileUp, Users, Mail, BarChart3, Globe, Loader2, Paperclip, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { icon: FileUp, label: "Submit a new client", message: "I want to submit a new client." },
  { icon: Mail, label: "Draft an email", message: "Help me draft a professional follow-up email to a prospect I met yesterday." },
  { icon: Users, label: "Manage my pipeline", message: "Show me my current pipeline status and suggest next steps." },
  { icon: BarChart3, label: "Check my analytics", message: "Show me my performance analytics for this month." },
  { icon: Globe, label: "Research a company", message: "Can you look up information about a company?" },
  { icon: Sparkles, label: "Create a task", message: "Create a follow-up task for next week." },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-assistant`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Unknown error" }));
      onError(err.error || `Error ${resp.status}`);
      return;
    }

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
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const c = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (c) onDelta(c);
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    onDone();
  } catch (e: any) {
    if (e.name === "AbortError") { onDone(); return; }
    onError(e.message || "Stream failed");
  }
}

export default function DemoAssistantTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback((text: string) => {
    if (!text.trim() || loading) return;
    const fileNote = attachedFiles.length > 0
      ? `\n\n📎 Attached: ${attachedFiles.map(f => f.name).join(", ")}`
      : "";
    const userMsg: Msg = { role: "user", content: text.trim() + fileNote };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setAttachedFiles([]);
    setLoading(true);

    let assistantSoFar = "";
    const ac = new AbortController();
    abortRef.current = ac;

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    streamChat({
      messages: history.map(m => ({ role: m.role, content: m.content })),
      onDelta: upsert,
      onDone: () => setLoading(false),
      onError: (err) => { toast.error(err); setLoading(false); },
      signal: ac.signal,
    });
  }, [messages, loading, attachedFiles]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).slice(0, 10);
    if (files.length) setAttachedFiles(prev => [...prev, ...files].slice(0, 10));
  }, []);

  const removeFile = (idx: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ minHeight: "calc(100vh - 160px)" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-primary/10 border-2 border-dashed border-primary backdrop-blur-sm">
          <div className="text-center space-y-2">
            <FileUp className="h-10 w-10 text-primary mx-auto" />
            <p className="text-lg font-semibold text-primary">Drop files to attach</p>
            <p className="text-xs text-muted-foreground">PDF, images, or documents</p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []).slice(0, 10);
          if (files.length) setAttachedFiles(prev => [...prev, ...files].slice(0, 10));
          e.target.value = "";
        }}
      />

      {!hasMessages ? (
        /* ── Empty state: centered input at top with suggestions ── */
        <div className="flex-1 flex flex-col items-center justify-start pt-[8vh] px-4 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 aura-gradient-text text-center">
            How can Lumen help you today?
          </h1>

          {/* Chat input card */}
          <div className="w-full max-w-2xl mb-8">
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md border border-[hsl(240_6%_14%)] px-2.5 py-1.5 text-xs">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl p-4 focus-within:ring-2" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", boxShadow: "0 8px 32px -8px hsl(140 12% 42% / 0.08)" }}>
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask Lumen anything..."
                rows={3}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm min-h-[72px] max-h-48 py-2 text-white"
                style={{ color: "white" }}
                placeholder-style="color: hsl(240 5% 46%)"
              />
              <Button size="icon" onClick={() => send(input)} disabled={!input.trim()} className="shrink-0 h-9 w-9" style={{ background: "hsl(140 12% 42%)", color: "white" }}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggestions grid */}
          <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.message)}
                className="flex items-center gap-2 p-3 rounded-lg text-left text-xs transition-colors hover:bg-[hsl(240_8%_11%)]"
                style={{ border: "1px solid hsl(240 6% 14%)", color: "hsl(240 5% 70%)" }}
              >
                <s.icon className="h-4 w-4 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Conversation mode ── */
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-[hsl(240_8%_9%)] text-white border border-[hsl(240_6%_14%)]"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children, ...props }) => {
                            // Detect internal action links like [✨ Create New Opportunity]
                            const text = String(children);
                            if (text.includes("Create New Opportunity") || text.includes("Create Opportunity")) {
                              return (
                                <button
                                  onClick={() => onNavigate?.("pipeline")}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mt-1"
                                  style={{ background: "hsl(140 12% 42%)", color: "white" }}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  {text.replace(/[\[\]]/g, "")}
                                </button>
                              );
                            }
                            return <a href={href} {...props} className="text-primary underline">{children}</a>;
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-3 text-sm bg-[hsl(240_8%_9%)] border border-[hsl(240_6%_14%)]">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom input in conversation mode */}
          <div className="p-4">
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 max-w-2xl mx-auto">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md border border-[hsl(240_6%_14%)] px-2.5 py-1.5 text-xs">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-[hsl(240_6%_14%)] bg-[hsl(240_8%_9%)] p-4 aura-glow-shadow focus-within:ring-2 focus-within:ring-ring max-w-2xl mx-auto">
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask Lumen anything..."
                rows={2}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[48px] max-h-36 py-2"
              />
              {loading ? (
                <Button size="icon" variant="ghost" onClick={stop} className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              ) : (
                <Button size="icon" onClick={() => send(input)} disabled={!input.trim()} className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
