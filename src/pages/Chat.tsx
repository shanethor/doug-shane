import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, FileUp, ClipboardList, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

const SUGGESTIONS = [
  {
    icon: FileUp,
    label: "Submit a new client",
    message: "I want to submit a new client for coverage.",
  },
  {
    icon: ClipboardList,
    label: "Fill an ACORD form",
    message: "Help me fill out an ACORD form for a client.",
  },
  {
    icon: Search,
    label: "Review a submission",
    message: "I need to review an existing client submission.",
  },
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err });
          setIsLoading(false);
        },
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Could not reach the assistant. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-7.5rem)]">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 px-4">
              <div className="text-center space-y-2">
                <h1 className="text-4xl tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  How can I help you?
                </h1>
                <p className="text-muted-foreground text-sm max-w-md">
                  I can guide you through client submissions, ACORD forms, and coverage reviews.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.message)}
                    className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <s.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-xl px-4 py-3 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t bg-background p-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your clients..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
