import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Target, Sparkles, Loader2, Mail, Phone, Globe, Copy, Check,
  ArrowRight, MessageSquare, Zap, Building2, MapPin, DollarSign,
  User, X, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EngineLead } from "@/hooks/useLeadEngine";
import ReactMarkdown from "react-markdown";

interface SageGameplanProps {
  lead: EngineLead;
  onClose: () => void;
}

type GameplanPhase = {
  phase: string;
  title: string;
  actions: string[];
  timing: string;
};

export default function SageGameplan({ lead, onClose }: SageGameplanProps) {
  const [gameplan, setGameplan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showContact, setShowContact] = useState(true);

  const generateGameplan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-assistant", {
        body: {
          messages: [
            {
              role: "user",
              content: `Create a detailed "Clark Gameplan" — a step-by-step outreach-to-close strategy for this lead:

Company: ${lead.company}
Contact: ${lead.contact_name || "Unknown"}
Email: ${lead.email || "Not available"}
Phone: ${lead.phone || "Not available"}
Industry: ${lead.industry || "Unknown"}
State: ${lead.state || "Unknown"}
Signal: ${lead.signal || "No specific signal"}
Score: ${lead.score}/100
Estimated Premium: $${lead.est_premium || 0}

Create a comprehensive gameplan with these sections:
1. **Lead Summary** — Quick assessment of this opportunity
2. **Initial Outreach** (Day 1-2) — First contact strategy with email template and call script
3. **Follow-Up Sequence** (Day 3-7) — Multi-touch follow-up cadence
4. **Warm-Up Phase** (Week 2) — Relationship building tactics
5. **Close Strategy** (Week 3-4) — How to move them to close
6. **Objection Handling** — Common objections for this type of lead and rebuttals

Make it specific to their industry, signal, and situation. Include actual email/call scripts.`,
            },
          ],
          context: {},
        },
      });

      if (error) throw new Error(error.message);

      // Read the streaming response
      const reader = data.getReader?.();
      if (reader) {
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ") || line.trim() === "") continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setGameplan(fullText);
              }
            } catch {}
          }
        }
      } else if (typeof data === "string") {
        setGameplan(data);
      }

      setGenerated(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate gameplan");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(gameplan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Gameplan copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full overflow-hidden flex flex-col"
        style={{ background: "hsl(240 8% 8%)", borderLeft: "1px solid hsl(240 6% 14%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 shrink-0"
          style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-5 w-5" style={{ color: "hsl(140 12% 55%)" }} />
              <h2 className="text-base font-bold text-white">Clark Gameplan</h2>
            </div>
            <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>
              AI-powered outreach-to-close strategy for {lead.company}
            </p>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg shrink-0"
            style={{ color: "hsl(240 5% 50%)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Lead info card */}
          <Card className="border-none" style={{ background: "hsl(240 6% 12%)" }}>
            <CardContent className="p-4">
              <button
                onClick={() => setShowContact(!showContact)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" style={{ color: "hsl(140 12% 55%)" }} />
                  <span className="text-sm font-semibold text-white">{lead.company}</span>
                  <Badge variant="outline" className="text-[9px]"
                    style={{ color: lead.score >= 70 ? "hsl(140 50% 55%)" : "hsl(45 80% 55%)" }}>
                    Score {lead.score}
                  </Badge>
                </div>
                {showContact ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {showContact && (
                <div className="mt-3 space-y-2">
                  {lead.contact_name && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 65%)" }}>
                      <User className="h-3.5 w-3.5" /> {lead.contact_name}
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
                      <a href={`mailto:${lead.email}`} className="hover:underline" style={{ color: "hsl(140 12% 58%)" }}>{lead.email}</a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
                      <a href={`tel:${lead.phone}`} className="hover:underline" style={{ color: "hsl(140 12% 58%)" }}>{lead.phone}</a>
                    </div>
                  )}
                  {lead.state && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 65%)" }}>
                      <MapPin className="h-3.5 w-3.5" /> {lead.state}
                    </div>
                  )}
                  {lead.industry && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 65%)" }}>
                      <Building2 className="h-3.5 w-3.5" /> {lead.industry}
                    </div>
                  )}
                  {lead.est_premium > 0 && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 65%)" }}>
                      <DollarSign className="h-3.5 w-3.5" /> ${lead.est_premium.toLocaleString()}/yr est.
                    </div>
                  )}
                  {lead.signal && (
                    <div className="mt-2 p-2 rounded text-xs leading-relaxed"
                      style={{ background: "hsl(140 12% 42% / 0.08)", color: "hsl(240 5% 70%)" }}>
                      <span className="font-semibold" style={{ color: "hsl(140 12% 55%)" }}>Signal:</span> {lead.signal}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate button or results */}
          {!generated && !loading && (
            <Button
              onClick={generateGameplan}
              className="w-full gap-2 h-12 text-sm"
              style={{ background: "hsl(140 12% 42%)" }}
            >
              <Sparkles className="h-5 w-5" />
              Generate Clark Gameplan
            </Button>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "hsl(140 12% 55%)" }} />
              <p className="text-sm text-white font-medium">Clark is crafting your gameplan…</p>
              <p className="text-xs mt-1" style={{ color: "hsl(240 5% 50%)" }}>
                Analyzing lead data, industry patterns, and outreach best practices
              </p>
            </div>
          )}

          {/* Gameplan content */}
          {gameplan && (
            <Card className="border-none" style={{ background: "hsl(240 6% 10%)" }}>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Target className="h-4 w-4" style={{ color: "hsl(140 12% 55%)" }} />
                  Your Gameplan
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] gap-1"
                  onClick={handleCopy}
                  style={{ color: "hsl(140 12% 58%)" }}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed"
                  style={{ color: "hsl(240 5% 70%)" }}>
                  <ReactMarkdown>{gameplan}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Studio promo */}
          <Card className="border-none overflow-hidden" style={{
            background: "linear-gradient(135deg, hsl(260 40% 14%), hsl(280 30% 10%))",
            border: "1px solid hsl(260 40% 25%)",
          }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" style={{ color: "hsl(260 60% 60%)" }} />
                <span className="text-xs font-bold text-white">Integrate AI Agents with AURA Studio</span>
              </div>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: "hsl(260 20% 65%)" }}>
                Our team will build you AI agents to manage outreach to your leads — you only need 
                to focus on closing the hottest targets.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge className="text-[9px]" style={{ background: "hsl(260 60% 50% / 0.3)", color: "hsl(260 60% 70%)" }}>
                  3× free leads
                </Badge>
                <Badge className="text-[9px]" style={{ background: "hsl(260 60% 50% / 0.3)", color: "hsl(260 60% 70%)" }}>
                  60% off all leads
                </Badge>
                <Badge className="text-[9px]" style={{ background: "hsl(260 60% 50% / 0.3)", color: "hsl(260 60% 70%)" }}>
                  AI-powered outreach
                </Badge>
              </div>
              <a href="/studiodemo" target="_blank">
                <Button size="sm" className="w-full gap-1.5 text-xs"
                  style={{ background: "hsl(260 60% 50%)" }}>
                  Learn About AURA Studio <ArrowRight className="h-3 w-3" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
