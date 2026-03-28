import { useState, useRef, useEffect } from "react";
import { useTimezone } from "@/hooks/useTimezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, Loader2, CalendarDays, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addDays, startOfWeek, addWeeks, isSameDay } from "date-fns";
import ReactMarkdown from "react-markdown";
import type { CalEvent } from "./SmartCalendar";

interface Props {
  events: CalEvent[];
  leads: any[];
  onClose: () => void;
  onRefresh: () => void;
}

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Find 3 times next week for a 30-min call",
  "Block 2 hours for deep work Friday morning",
  "What do I have tomorrow?",
  "Draft a follow-up for my last meeting",
];

export default function CalendarAssistant({ events, leads, onClose, onRefresh }: Props) {
  const { timezone: userTimezone } = useTimezone();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build calendar context
      const now = new Date();
      const nextWeek = addDays(now, 7);
      const upcomingEvents = events
        .filter(e => e.date >= now && e.date <= addDays(now, 14))
        .map(e => `- ${format(e.date, "EEE MMM d")} ${e.startHour}:${String(e.startMin).padStart(2, "0")}-${e.endHour}:${String(e.endMin).padStart(2, "0")}: ${e.title}${e.lead_id ? " (client meeting)" : ""}`)
        .join("\n");

      const leadContext = leads.slice(0, 10).map(l => `- ${l.account_name} (${l.stage})`).join("\n");

      const systemPrompt = `You are Aura, an AI calendar assistant for an insurance professional. You have access to their calendar and pipeline data.

Current date/time: ${new Intl.DateTimeFormat("en-US", { timeZone: userTimezone, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(now)}
Timezone: ${userTimezone}

Upcoming events (next 2 weeks):
${upcomingEvents || "No upcoming events"}

Active clients/leads:
${leadContext || "No active leads"}

Your capabilities:
1. Find available time slots by analyzing the calendar
2. Suggest meeting times
3. Help prepare for meetings (agenda, talking points)
4. Draft follow-up emails after meetings
5. Block focus time
6. Answer questions about the schedule

When suggesting times, be specific with day and time. Format dates clearly.
When creating meeting prep, include suggested agenda items and key talking points.
For follow-ups, draft a professional email template.

Keep responses concise and actionable. Use markdown formatting.`;

      const allMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: msgText },
      ];

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: allMessages,
          systemPrompt,
          stream: true,
        }),
      });

      if (!resp.ok) throw new Error("AI request failed");

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantText += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                  }
                  return [...prev, { role: "assistant", content: assistantText }];
                });
              }
            } catch {}
          }
        }
      }

      if (!assistantText) {
        // Fallback for non-streaming
        const data = await resp.json().catch(() => null);
        if (data?.reply) {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl flex flex-col h-[calc(100vh-180px)] sticky top-4" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: "hsl(140 12% 42%)" }}>
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AURA Assistant</p>
            <p className="text-[9px]" style={{ color: "hsl(240 5% 46%)" }}>Calendar AI</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" style={{ color: "hsl(240 5% 50%)" }} /></Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(140 12% 50%)" }} />
            <p className="text-sm text-white/80 mb-1">Calendar Assistant</p>
            <p className="text-[11px] mb-4" style={{ color: "hsl(240 5% 46%)" }}>Ask me to find times, prep for meetings, or manage your schedule</p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-white/70 hover:bg-white/[0.04] transition-colors"
                  style={{ border: "1px solid hsl(240 6% 14%)" }}
                  onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[12px] ${msg.role === "user" ? "text-white" : "text-white/90"}`}
              style={{
                background: msg.role === "user" ? "hsl(140 12% 42%)" : "hsl(240 8% 12%)",
                border: msg.role === "assistant" ? "1px solid hsl(240 6% 16%)" : "none",
              }}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:text-[12px] [&_li]:text-[12px] [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg" style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 6% 16%)" }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(140 12% 50%)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your schedule…"
            className="flex-1 text-sm h-9"
            style={{ background: "hsl(240 8% 10%)", borderColor: "hsl(240 6% 16%)", color: "white" }}
            disabled={loading}
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim() || loading}
            style={{ background: "hsl(140 12% 42%)" }}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
