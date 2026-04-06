import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, FileUp, Users, Mail, BarChart3, Globe, Loader2, Paperclip, X, Network, PlusCircle, Calendar, Palette, Image, Megaphone, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { executeCalendarActions, extractCalendarActions } from "@/lib/calendar-action-utils";
import PreviousChats from "@/components/PreviousChats";

type MsgContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
type Msg = { role: "user" | "assistant"; content: MsgContent };

const SUGGESTIONS = [
  { icon: PlusCircle, label: "Add a lead", message: "I want to add a new lead to my pipeline. Walk me through it." },
  { icon: Users, label: "My pipeline", message: "Show me my current pipeline status with real numbers and suggest next steps." },
  { icon: Image, label: "Create a flyer", message: "I need to create a marketing flyer. Help me set it up with GenTea." },
  { icon: Mail, label: "Draft an email", message: "Help me draft a professional follow-up email. Show me my recent contacts to choose from." },
  { icon: Megaphone, label: "Marketing ideas", message: "Give me 3 marketing campaign ideas I can execute this week to generate leads." },
  { icon: Network, label: "Find a connection", message: "Who are my strongest connections? Show me my top contacts by tier." },
  { icon: BarChart3, label: "Check analytics", message: "Show me my real performance metrics — pipeline value, lead count, and conversion progress." },
  { icon: Globe, label: "Research a company", message: "Can you research a company for me? I'll give you the name." },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-assistant`;

async function streamChat({
  messages, onDelta, onDone, onError, signal,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
  signal?: AbortSignal;
}) {
  try {
    // Get auth token for real data access
    let token = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch {}

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Unknown error" }));
      if (resp.status === 429) { onError("Rate limit exceeded. Please wait a moment."); return; }
      if (resp.status === 402) { onError("AI credits exhausted. Please add funds."); return; }
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

function StreamingMessage({ content, isStreaming, onAction }: { content: string; isStreaming: boolean; onAction?: (action: string) => void }) {
  // Strip action markers from display
  const displayContent = content
    .replace(/\[PIPELINE_ACTION:[^\]]+\]/g, "")
    .replace(/\[CALENDAR_ACTION:[^\]]+\]/g, "")
    .replace(/\[MARKETING_ACTION:[^\]]+\]/g, "")
    .replace(/\[NAVIGATE:[^\]]+\]/g, "");

  return (
    <div className="space-y-2">
      <div className="prose prose-sm dark:prose-invert max-w-none
        [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground
        [&_ul]:my-2 [&_li]:my-1 [&_li]:text-muted-foreground
        [&_strong]:text-foreground [&_strong]:font-semibold
        [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-3 [&_h1]:mb-2
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1.5
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1
        [&_table]:text-xs [&_table]:border-collapse [&_th]:text-left [&_th]:py-1.5 [&_th]:px-2 [&_th]:font-semibold [&_th]:text-foreground [&_th]:border-b [&_th]:border-border
        [&_td]:py-1.5 [&_td]:px-2 [&_td]:text-muted-foreground [&_td]:border-b [&_td]:border-border
        [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
        [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
        ">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              const text = String(children);
              if (text.startsWith("[") || text.includes("Create") || text.includes("Draft") || text.includes("View") || text.includes("Add to") || text.includes("Review") || text.includes("Find") || text.includes("Schedule") || text.includes("Send")) {
                const cleanText = text.replace(/[\[\]]/g, "");
                return (
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110 mr-1.5 mt-1 bg-primary text-primary-foreground"
                    onClick={() => onAction?.(cleanText)}
                  >
                    <Sparkles className="h-3 w-3" />
                    {cleanText}
                  </button>
                );
              }
              return <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>;
            },
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 rounded-sm animate-pulse bg-primary" />
      )}
    </div>
  );
}

const DAILY_LIMIT_KEY = "clark_daily_prompts";
const MAX_FREE_PROMPTS = 10;

function getDailyPromptCount(): number {
  try {
    const raw = localStorage.getItem(DAILY_LIMIT_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    if (date !== new Date().toISOString().slice(0, 10)) return 0;
    return count;
  } catch { return 0; }
}

function incrementDailyPromptCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyPromptCount();
  const next = current + 1;
  localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify({ date: today, count: next }));
  return next;
}

export default function DemoAssistantTab({ onNavigate, isSubscriber = false }: { onNavigate?: (tab: string) => void; isSubscriber?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [promptCount, setPromptCount] = useState(getDailyPromptCount);
  const atLimit = !isSubscriber && promptCount >= MAX_FREE_PROMPTS;
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save conversation
  useEffect(() => {
    if (!user || messages.length < 2) return;
    if (conversationSaveTimer.current) clearTimeout(conversationSaveTimer.current);
    conversationSaveTimer.current = setTimeout(async () => {
      const title = messages.find(m => m.role === "user")?.content?.slice(0, 80) || "New conversation";
      const serializable = messages.map(m => ({ role: m.role, content: m.content }));
      if (conversationId) {
        await supabase.from("sage_conversations").update({
          messages: serializable as any,
          title,
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      } else {
        const { data } = await supabase.from("sage_conversations").insert({
          user_id: user.id,
          title,
          messages: serializable as any,
        }).select("id").single();
        if (data) setConversationId(data.id);
      }
    }, 2000);
    return () => { if (conversationSaveTimer.current) clearTimeout(conversationSaveTimer.current); };
  }, [messages, user, conversationId]);

  const handleLoadConversation = useCallback((id: string, msgs: any[]) => {
    setConversationId(id);
    setMessages(msgs.map((m: any) => ({ role: m.role, content: m.content })));
  }, []);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setInput("");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Handle action markers in completed responses
  const processActionMarkers = useCallback(async (content: string) => {
    // Pipeline actions
    const pipelineAdds = content.matchAll(/\[PIPELINE_ACTION:ADD\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/g);
    for (const match of pipelineAdds) {
      const [, name, company, value, stage] = match;
      if (user) {
        supabase.from("leads").insert({
          account_name: name || company,
          contact_name: name,
          target_premium: Number(value) || 0,
          stage: stage as any,
          owner_user_id: user.id,
          lead_source: "Clark AI",
        }).then(({ error }) => {
          if (error) toast.error("Failed to add lead");
          else toast.success(`Added ${name} to pipeline`);
        });
      }
    }

    // Pipeline move actions
    const pipelineMoves = content.matchAll(/\[PIPELINE_ACTION:MOVE\|([^|]+)\|([^\]]+)\]/g);
    for (const match of pipelineMoves) {
      const [, leadId, newStage] = match;
      supabase.from("leads").update({ stage: newStage as any }).eq("id", leadId).then(({ error }) => {
        if (error) toast.error("Failed to move lead");
        else toast.success(`Lead moved to ${newStage}`);
      });
    }

    // Marketing actions
    const marketingCreates = content.matchAll(/\[MARKETING_ACTION:CREATE\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/g);
    for (const match of marketingCreates) {
      const [, assetType, title] = match;
      toast.success(`Marketing asset "${title}" (${assetType}) queued — view in Connect → Marketing Center`);
      navigate("/connect/create");
    }

    // Calendar actions
    if (user) {
      const calendarActions = extractCalendarActions(content);
      if (calendarActions.length > 0) {
        try {
          const { createdCount, externalFailures } = await executeCalendarActions({
            actions: calendarActions,
            userId: user.id,
          });

          if (createdCount > 0) {
            toast.success(createdCount === 1 ? "Event added to calendar" : `${createdCount} events added to calendar`);
          }

          if (externalFailures.length > 0) {
            const needsReconnect = externalFailures.some((failure) => /expired|reconnect|unauthorized|no .* calendar connected/i.test(failure));
            toast.error(needsReconnect
              ? "Event saved in AURA, but your connected calendar needs reconnect to sync externally."
              : "Event saved in AURA, but external calendar sync failed.");
          }
        } catch (error) {
          console.error("Demo Clark calendar action failed:", error);
          toast.error("Failed to create calendar event");
        }
      }
    }

    // Navigate actions
    const navMatches = content.matchAll(/\[NAVIGATE:([^\]]+)\]/g);
    for (const match of navMatches) {
      navigate(match[1]);
    }
  }, [user, navigate]);

  const handleAction = useCallback((action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("view pipeline") || lower.includes("manage pipeline") || lower.includes("pipeline")) {
      navigate("/connect/pipeline");
    } else if (lower.includes("view calendar") || lower.includes("schedule")) {
      navigate("/connect/calendar");
    } else if (lower.includes("view email") || lower.includes("check email")) {
      navigate("/connect/email");
    } else if (lower.includes("draft") || lower.includes("send email")) {
      navigate("/connect/email");
    } else if (lower.includes("marketing") || lower.includes("flyer") || lower.includes("gentea") || lower.includes("create a")) {
      navigate("/connect/create");
      toast.success("Opening Marketing Center...");
    } else if (lower.includes("view network") || lower.includes("find connection") || lower.includes("contact")) {
      navigate("/connect");
    } else if (lower.includes("intelligence")) {
      navigate("/connect/intelligence");
    } else {
      toast.info(`${action} — navigating...`);
    }
  }, [navigate]);

  const send = useCallback((text: string) => {
    if (!text.trim() || loading) return;
    if (atLimit) {
      toast.error("You've reached your 10 free prompts today. Subscribe to AURA Connect for unlimited access.");
      return;
    }
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
      onDone: () => {
        setLoading(false);
        setPromptCount(incrementDailyPromptCount());
        // Process any action markers
        if (assistantSoFar) void processActionMarkers(assistantSoFar);
      },
      onError: (err) => { toast.error(err); setLoading(false); },
      signal: ac.signal,
    });
  }, [messages, loading, attachedFiles, processActionMarkers, atLimit]);

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
      className="flex flex-col relative"
      style={{ minHeight: "60vh" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <style>{`@keyframes sageFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      {dragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl" style={{ background: "hsl(140 12% 42% / 0.08)", border: "2px dashed hsl(140 12% 42%)", backdropFilter: "blur(4px)" }}>
          <div className="text-center space-y-2">
            <FileUp className="h-10 w-10 mx-auto" style={{ color: "hsl(140 12% 58%)" }} />
            <p className="text-lg font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Drop files to attach</p>
            <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>PDF, images, or documents</p>
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
        <div className="flex-1 flex flex-col items-center justify-start pt-[8vh] px-4">
          <div className="flex items-center gap-2 mb-3" style={{ animation: "sageFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both" }}>
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium uppercase tracking-widest text-primary">Clark Assistant</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-primary/20 text-primary">LIVE DATA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-center text-foreground" style={{ animation: "sageFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s both" }}>
            How can I help you today?
          </h1>

          <div className="w-full max-w-2xl mb-8">
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border border-border text-muted-foreground">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)}><X className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            )}
            <div
              className="flex items-end gap-2 rounded-xl p-4 transition-shadow focus-within:shadow-[0_0_24px_-4px_hsl(var(--primary)_/_0.25)] bg-card border border-border"
            >
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask Clark anything — your real data is connected…"
                rows={3}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm min-h-[72px] max-h-48 py-2 text-foreground placeholder:text-muted-foreground"
              />
              <Button size="icon" onClick={() => send(input)} disabled={!input.trim()} className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Free tier limit banner */}
          {!isSubscriber && (
            <div className="w-full max-w-2xl text-center">
              {atLimit ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <p className="text-sm font-medium text-amber-400">Daily limit reached ({MAX_FREE_PROMPTS}/{MAX_FREE_PROMPTS})</p>
                  <p className="text-xs text-muted-foreground mt-1">Subscribe to AURA Connect for unlimited Clark access</p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {MAX_FREE_PROMPTS - promptCount} free prompt{MAX_FREE_PROMPTS - promptCount !== 1 ? "s" : ""} remaining today
                </p>
              )}
            </div>
          )}

          <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ animation: "sageFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.message)}
                className="flex items-center gap-2 p-3 rounded-lg text-left text-xs transition-all border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary/20"
              >
                <s.icon className="h-4 w-4 shrink-0 text-primary" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Previous chats */}
          <div className="w-full max-w-2xl mt-6" style={{ animation: "sageFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.45s both" }}>
            <PreviousChats
              onLoad={handleLoadConversation}
              onNewChat={handleNewChat}
              currentConversationId={conversationId}
            />
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
                  {!isUser && (
                    <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mr-2.5 mt-1 bg-primary/15">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}>
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : (
                      <StreamingMessage content={msg.content} isStreaming={loading && isLastAssistant} onAction={handleAction} />
                    )}
                  </div>
                </div>
              );
            })}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start animate-fade-in">
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mr-2.5 mt-1 bg-primary/15">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl px-4 py-3 text-sm bg-card border border-border">
                  <span className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs ml-2 text-muted-foreground">Clark is pulling your real data…</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 max-w-2xl mx-auto">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border border-border text-muted-foreground">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)}><X className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            )}
            <div
              className="flex items-end gap-2 rounded-xl p-4 max-w-2xl mx-auto transition-shadow focus-within:shadow-[0_0_24px_-4px_hsl(var(--primary)_/_0.25)] bg-card border border-border"
            >
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask Clark anything..."
                rows={2}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm min-h-[48px] max-h-36 py-2 text-foreground placeholder:text-muted-foreground"
              />
              {loading ? (
                <Button size="icon" variant="ghost" onClick={stop} className="shrink-0 h-9 w-9 text-muted-foreground">
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
