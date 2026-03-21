import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, FileUp, Users, Mail, BarChart3, Globe } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { icon: FileUp, label: "Submit a new client", message: "I want to submit a new client." },
  { icon: Mail, label: "Draft an email", message: "Help me draft a professional email to a prospect." },
  { icon: Users, label: "Manage my pipeline", message: "Show me my current pipeline status." },
  { icon: BarChart3, label: "Check my analytics", message: "Show me my performance analytics for this month." },
  { icon: Globe, label: "Research a company", message: "Can you look up information about a company?" },
  { icon: Sparkles, label: "Create a task", message: "Create a follow-up task for next week." },
];

const DEMO_RESPONSES: Record<string, string> = {
  default: "I'm your AURA Connect assistant. In the full version, I can help you manage your pipeline, draft emails, research companies, fill out forms, and much more. How can I help you today?",
  pipeline: "Here's a summary of your pipeline:\n\n• **4 Prospects** — $48,000 potential value\n• **3 in Quoting/Discovery** — $67,500 potential value\n• **2 Presenting/Proposal** — $42,000 potential value\n• **5 Won/Bound** — $125,000 closed\n\nYour pipeline is healthy! Would you like me to help with follow-ups on any stalled deals?",
  email: "I'd be happy to help draft an email. Here's a professional outreach template:\n\n---\n\n**Subject:** Quick Introduction — How We Can Help [Company]\n\nHi [Name],\n\nI hope this message finds you well. I'm reaching out because I noticed [personalized detail about their business].\n\nWe specialize in helping businesses like yours [value proposition]. I'd love to set up a brief 15-minute call to discuss how we might be able to help.\n\nWould you be available this week?\n\nBest regards,\n[Your Name]",
  client: "To submit a new client, I'll need some basic information:\n\n1. **Company name**\n2. **Contact person & email**\n3. **Industry / business type**\n4. **Services they're interested in**\n\nOnce I have these details, I'll set up their profile and add them to your pipeline automatically.",
  analytics: "Here's your performance snapshot for this month:\n\n📊 **Revenue:** $18,500 (↑ 12% from last month)\n📈 **New Leads:** 8 (↑ 3 from last month)\n✅ **Deals Closed:** 2\n📞 **Meetings Held:** 14\n📧 **Emails Sent:** 47\n\nYou're trending above your quarterly target. Great work!",
  company: "I can research any company for you. Just give me their name or website URL and I'll pull:\n\n• Business overview & industry\n• Key contacts\n• Company size & revenue estimates\n• Recent news & developments\n• Social media presence\n\nWhat company would you like me to look into?",
  task: "I've created a follow-up task:\n\n✅ **Task:** Follow up with prospect\n📅 **Due:** Next Monday\n🔔 **Reminder:** Set for 9:00 AM\n\nI'll send you a reminder when it's time. Would you like to add any notes to this task?",
};

function getResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("pipeline") || lower.includes("status")) return DEMO_RESPONSES.pipeline;
  if (lower.includes("email") || lower.includes("draft")) return DEMO_RESPONSES.email;
  if (lower.includes("client") || lower.includes("submit")) return DEMO_RESPONSES.client;
  if (lower.includes("analytics") || lower.includes("performance") || lower.includes("number")) return DEMO_RESPONSES.analytics;
  if (lower.includes("company") || lower.includes("research") || lower.includes("look up")) return DEMO_RESPONSES.company;
  if (lower.includes("task") || lower.includes("follow-up") || lower.includes("follow up")) return DEMO_RESPONSES.task;
  return DEMO_RESPONSES.default;
}

export default function DemoAssistantTab() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Welcome to AURA Connect! I'm your AI assistant. I can help you manage your business, draft communications, research prospects, and more. What would you like to do?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const response = getResponse(text);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  };

  return (
    <div className="flex flex-col" style={{ height: "70vh" }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[75%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? { background: "hsl(174 97% 22%)", color: "white" }
                  : { background: "hsl(240 8% 12%)", color: "hsl(240 5% 85%)", border: "1px solid hsl(240 6% 14%)" }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 6% 14%)" }}>
              <span className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        {/* Suggestions — shown when only welcome message */}
        {messages.length === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.message)}
                className="flex items-center gap-2 p-3 rounded-lg text-left text-xs transition-colors hover:bg-white/5"
                style={{ border: "1px solid hsl(240 6% 14%)", color: "hsl(240 5% 70%)" }}
              >
                <s.icon className="h-4 w-4 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t flex gap-2" style={{ borderColor: "hsl(240 6% 14%)" }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask AURA anything..."
          className="flex-1 text-sm"
          style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
        />
        <Button size="sm" onClick={() => send(input)} disabled={!input.trim() || typing} style={{ background: "hsl(174 97% 22%)" }}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
