import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, MapPin, Users, X, Pencil, Trash2, GitBranch, Sparkles,
  FileText, Send, Loader2, CalendarDays, RefreshCw, Bell, Zap,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { CalEvent } from "./SmartCalendar";

interface Props {
  event: CalEvent;
  leads: any[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

const fmtTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
};

export default function CalendarContextPanel({ event, leads, onClose, onEdit, onDelete, onRefresh }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("summary");
  const [aiContent, setAiContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const lead = event.lead_id ? leads.find(l => l.id === event.lead_id) : null;
  const isPast = isBefore(event.date, new Date());

  const generateSummary = async () => {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const prompt = `Generate a brief meeting prep summary for this event:
Title: ${event.title}
Date: ${format(event.date, "EEEE, MMMM d")} at ${fmtTime(event.startHour, event.startMin)}
Location: ${event.location || "Not specified"}
Attendees: ${event.attendees.join(", ") || "None listed"}
Notes: ${event.description || "None"}
${lead ? `Client: ${lead.account_name} (Stage: ${lead.stage})` : ""}

Provide:
1. **Meeting Overview** (1-2 sentences)
2. **Suggested Agenda** (3-4 bullet points)
3. **Key Talking Points** (2-3 items)
${lead ? "4. **Client Context** (stage, next steps)" : ""}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          systemPrompt: "You are Aura, an AI assistant for insurance professionals. Generate concise, actionable meeting prep. Use markdown.",
        }),
      });

      if (!resp.ok) throw new Error("Failed");
      
      // Try streaming
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      if (reader) {
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
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) { text += content; setAiContent(text); }
            } catch {}
          }
        }
      }
      if (!text) {
        const data = await resp.json().catch(() => null);
        if (data?.reply) setAiContent(data.reply);
      }
    } catch {
      setAiContent("Unable to generate summary. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const generateFollowUp = async () => {
    setFollowUpLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const prompt = `Draft a brief professional follow-up email for this meeting:
Title: ${event.title}
Date: ${format(event.date, "EEEE, MMMM d")}
Attendees: ${event.attendees.join(", ") || "the attendee"}
${lead ? `Client: ${lead.account_name}` : ""}
Notes: ${event.description || "No notes"}

Write a warm, professional follow-up email (3-4 paragraphs). Include:
- Thank them for their time
- Recap key points discussed
- Next steps
- Professional sign-off`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          systemPrompt: "You are Aura. Draft a concise follow-up email. Use markdown for formatting.",
        }),
      });

      if (!resp.ok) throw new Error("Failed");
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      if (reader) {
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
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) { text += content; setFollowUp(text); }
            } catch {}
          }
        }
      }
      if (!text) {
        const data = await resp.json().catch(() => null);
        if (data?.reply) setFollowUp(data.reply);
      }
    } catch {
      setFollowUp("Unable to generate follow-up. Please try again.");
    } finally {
      setFollowUpLoading(false);
    }
  };

  useEffect(() => { setAiContent(""); setFollowUp(""); setActiveTab("summary"); }, [event.id]);

  return (
    <div className="rounded-xl flex flex-col h-[calc(100vh-180px)] sticky top-4 overflow-hidden" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white truncate pr-2">{event.title}</p>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}><X className="h-4 w-4" style={{ color: "hsl(240 5% 50%)" }} /></Button>
        </div>
        <div className="space-y-1 text-[11px]" style={{ color: "hsl(240 5% 55%)" }}>
          <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{format(event.date, "EEE, MMM d")} · {fmtTime(event.startHour, event.startMin)} – {fmtTime(event.endHour, event.endMin)}</p>
          {event.location && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{event.location}</p>}
          {event.attendees.length > 0 && <p className="flex items-center gap-1.5"><Users className="h-3 w-3" />{event.attendees.join(", ")}</p>}
          {lead && (
            <p className="flex items-center gap-1.5" style={{ color: "hsl(140 12% 58%)" }}>
              <GitBranch className="h-3 w-3" />{lead.account_name} · {lead.stage}
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={onEdit}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 text-destructive border-destructive/30" onClick={onDelete}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 h-8" style={{ background: "hsl(240 8% 10%)" }}>
          <TabsTrigger value="summary" className="text-[10px] h-6 data-[state=active]:bg-[hsl(140_12%_42%)] data-[state=active]:text-white">Summary</TabsTrigger>
          {lead && <TabsTrigger value="pipeline" className="text-[10px] h-6 data-[state=active]:bg-[hsl(140_12%_42%)] data-[state=active]:text-white">Pipeline</TabsTrigger>}
          <TabsTrigger value="actions" className="text-[10px] h-6 data-[state=active]:bg-[hsl(140_12%_42%)] data-[state=active]:text-white">AI Actions</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Summary Tab */}
          <TabsContent value="summary" className="px-4 py-3 space-y-3">
            {event.description && (
              <div>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-[11px] text-white/70">{event.description}</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">AI Prep</p>
                <Button size="sm" className="h-6 text-[10px] gap-1 text-white" style={{ background: "hsl(140 12% 42%)" }} onClick={generateSummary} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {aiContent ? "Regenerate" : "Generate Prep"}
                </Button>
              </div>
              {aiContent && (
                <div className="prose prose-sm prose-invert max-w-none text-[11px] [&_p]:text-[11px] [&_li]:text-[11px] [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-[11px] [&_strong]:text-white/90 rounded-lg p-3"
                  style={{ background: "hsl(240 8% 10%)", border: "1px solid hsl(240 6% 14%)" }}>
                  <ReactMarkdown>{aiContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pipeline Tab */}
          {lead && (
            <TabsContent value="pipeline" className="px-4 py-3 space-y-3">
              <div className="rounded-lg p-3" style={{ background: "hsl(240 8% 10%)", border: "1px solid hsl(240 6% 14%)" }}>
                <p className="text-sm font-medium text-white mb-2">{lead.account_name}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "hsl(240 5% 50%)" }}>Stage</span>
                    <Badge className="text-[9px] h-5" style={{ background: "hsl(140 12% 42% / 0.2)", color: "hsl(140 12% 70%)" }}>{lead.stage}</Badge>
                  </div>
                  {lead.estimated_premium && (
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: "hsl(240 5% 50%)" }}>Est. Premium</span>
                      <span className="text-white">${Number(lead.estimated_premium).toLocaleString()}</span>
                    </div>
                  )}
                  {lead.contact_name && (
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: "hsl(240 5% 50%)" }}>Contact</span>
                      <span className="text-white">{lead.contact_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* AI Actions Tab */}
          <TabsContent value="actions" className="px-4 py-3 space-y-2">
            <Button variant="outline" size="sm" className="w-full text-[11px] gap-2 justify-start h-9" style={{ borderColor: "hsl(240 6% 16%)", color: "hsl(240 5% 70%)" }} onClick={generateSummary} disabled={aiLoading}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 50%)" }} /> Prep with AI
            </Button>
            <Button variant="outline" size="sm" className="w-full text-[11px] gap-2 justify-start h-9" style={{ borderColor: "hsl(240 6% 16%)", color: "hsl(240 5% 70%)" }} onClick={generateFollowUp} disabled={followUpLoading}>
              <Send className="h-3.5 w-3.5" style={{ color: "hsl(262 83% 58%)" }} /> Draft Follow-Up
            </Button>
            <Button variant="outline" size="sm" className="w-full text-[11px] gap-2 justify-start h-9" style={{ borderColor: "hsl(240 6% 16%)", color: "hsl(240 5% 70%)" }} onClick={() => toast.info("Reschedule with AI coming soon")}>
              <RefreshCw className="h-3.5 w-3.5" style={{ color: "hsl(38 92% 50%)" }} /> Reschedule with AI
            </Button>

            {followUp && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Follow-Up Draft</p>
                <div className="prose prose-sm prose-invert max-w-none text-[11px] [&_p]:text-[11px] rounded-lg p-3"
                  style={{ background: "hsl(240 8% 10%)", border: "1px solid hsl(240 6% 14%)" }}>
                  <ReactMarkdown>{followUp}</ReactMarkdown>
                </div>
                <Button size="sm" className="mt-2 text-[10px] h-7 gap-1 text-white" style={{ background: "hsl(140 12% 42%)" }}
                  onClick={() => { navigator.clipboard.writeText(followUp); toast.success("Copied to clipboard"); }}>
                  Copy Draft
                </Button>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
