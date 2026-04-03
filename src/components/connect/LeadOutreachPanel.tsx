import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X, Mail, Phone, Globe, Copy, Check, Sparkles, Loader2,
  ArrowUpRight, Building2, MapPin, DollarSign, Target, User,
  MessageSquare, ExternalLink, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateEngineLead, useConvertToPipeline, type EngineLead } from "@/hooks/useLeadEngine";
import { getAuthHeaders } from "@/lib/auth-fetch";

interface Props {
  lead: EngineLead;
  onClose: () => void;
}

type OutreachMode = "email" | "call" | "linkedin";

export default function LeadOutreachPanel({ lead, onClose }: Props) {
  const updateLead = useUpdateEngineLead();
  const convertToPipeline = useConvertToPipeline();

  // Contact discovery
  const [email, setEmail] = useState(lead.email || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [website, setWebsite] = useState(lead.source_url || "");
  const [contactName, setContactName] = useState(lead.contact_name || "");
  const [findingContact, setFindingContact] = useState(false);

  // Draft
  const [mode, setMode] = useState<OutreachMode>("email");
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [converting, setConverting] = useState(false);

  // ── Find contact info via enrich-lead waterfall (Serper → Apollo → PDL) ──
  const handleFindContact = async () => {
    setFindingContact(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: {
          company: lead.company,
          contact_name: lead.contact_name,
          email: lead.email,
          state: lead.state,
          industry: lead.industry,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      let foundFields: string[] = [];

      if (data?.contact_name && !contactName) {
        setContactName(data.contact_name);
        foundFields.push("contact name");
      }
      if (data?.email) {
        setEmail(data.email);
        foundFields.push("email");
      }
      if (data?.phone) {
        setPhone(data.phone);
        foundFields.push("phone");
      }
      if (data?.linkedin_url) {
        setWebsite(data.linkedin_url);
        foundFields.push("LinkedIn");
      }

      // Also update the lead record in the database
      const updates: Record<string, unknown> = {};
      if (data?.contact_name && !lead.contact_name) updates.contact_name = data.contact_name;
      if (data?.email && !lead.email) updates.email = data.email;
      if (data?.phone && !lead.phone) updates.phone = data.phone;

      if (Object.keys(updates).length > 0) {
        updateLead.mutate({ id: lead.id, ...updates } as any);
      }

      if (foundFields.length > 0) {
        toast.success(`Found ${foundFields.join(", ")} for ${lead.company}`);
      } else {
        toast.info("No additional contact info found — try adding details manually");
      }
    } catch (err: any) {
      toast.error(err.message || "Contact research failed — add details manually");
    } finally {
      setFindingContact(false);
    }
  };

  // ── Generate AI outreach draft ──
  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const agentName = "[Your Name]";
      const agencyName = "[Your Agency]";

      const context = [
        `You are ${agentName} at ${agencyName}, an insurance agent reaching out to a new prospect.`,
        `Prospect: ${lead.company}`,
        lead.contact_name ? `Contact: ${lead.contact_name}` : null,
        lead.industry ? `Industry: ${lead.industry}` : null,
        lead.state ? `State: ${lead.state}` : null,
        lead.est_premium ? `Est. annual premium: $${lead.est_premium.toLocaleString()}` : null,
        lead.signal ? `Why they need insurance now: ${lead.signal}` : null,
      ].filter(Boolean).join("\n");

      const modeInstructions: Record<OutreachMode, string> = {
        email: `Write a short, personalized cold outreach EMAIL (150-200 words). 
- Subject line: catchy, relevant to their specific situation
- Opening: reference their specific trigger/signal
- Value prop: make it about THEM, not you
- CTA: specific ask (15-min call, quick quote)  
- Tone: professional but warm, not salesy
- Sign off as ${agentName}
Return JSON: {subject: "...", body: "..."}`,
        call: `Write a 60-second cold CALL SCRIPT.
- Opening hook referencing why you're calling them specifically
- Bridge to value: what you can do for their specific situation
- Ask: permission to send a quick quote or schedule 15 mins
- 2-3 objection handlers
- Tone: confident, consultative
Return JSON: {subject: "Call Script", body: "..."}`,
        linkedin: `Write a short LinkedIn CONNECTION MESSAGE (300 chars max) + follow-up message.
- Connection note: mention their business/situation, why connecting
- Follow-up: brief value prop, soft ask
Return JSON: {subject: "LinkedIn", body: "CONNECTION NOTE:\n[note]\n\nFOLLOW-UP:\n[message]"}`,
      };

      const { data } = await supabase.functions.invoke("spotlight-flyer", {
        body: {
          action: "demo_enrich",
          raw_prompt: `${context}\n\n${modeInstructions[mode]}`,
          type: "custom",
        },
      });

      // Fallback to direct Gemini via connection-brief workaround
      const { data: briefData } = await supabase.functions.invoke("connection-brief", {
        body: {
          name: lead.contact_name || `${lead.company} Owner`,
          notes: `TASK: ${modeInstructions[mode]}\n\nCONTEXT:\n${context}`,
        },
      });

      // Build a draft from the brief's recommended_move if AI JSON fails
      let generatedSubject = "";
      let generatedBody = "";

      if (briefData?.brief) {
        const b = briefData.brief;
        generatedSubject = mode === "email"
          ? `Quick question about ${lead.company}'s coverage`
          : mode === "call" ? "Call Script" : "LinkedIn";

        const firstName = lead.contact_name?.split(" ")[0] || "there";

        if (mode === "email") {
          generatedBody = `Subject: ${generatedSubject}

Hi ${firstName},

I came across ${lead.company} and noticed ${(lead.signal || "your business is growing").split("•")[0].trim().toLowerCase()}.

As an insurance agent who works with ${lead.industry || "businesses"} in ${lead.state || "your area"}, I wanted to reach out — it's the perfect time to make sure your coverage is right-sized for where you are now.

${b.recommended_move ? b.recommended_move : `I'd love to run a quick no-pressure quote for you. Most of my ${lead.industry || "clients"} are surprised how much they can save with the right carrier.`}

Would you be open to a 15-minute call this week?

Best,
[Your Name]
[Your Agency]
[Your Phone]`;
        } else if (mode === "call") {
          generatedBody = `OPENING:
"Hi, is this ${firstName}? Great — this is [Your Name] with [Your Agency]. I'll be quick — I noticed ${lead.company} recently ${(lead.signal || "started/expanded operations").split("•")[0].toLowerCase()}, and I work with a lot of ${lead.industry || "businesses"} in ${lead.state || "your area"} to make sure their insurance keeps up with their growth."

BRIDGE:
"Most ${lead.industry || "business"} owners I talk to don't realize their coverage from when they started doesn't reflect what they need now — and that gap can be expensive. I'm not here to pitch you, just to ask a few questions and see if there's a fit."

ASK:
"Do you have 15 minutes this week to chat? Or I can email you a quick comparison — whatever works best for you."

OBJECTION HANDLERS:
- "We already have insurance" → "Great, I just want to make sure you're not over- or under-covered. Would you be open to a second opinion? It's free and takes 15 minutes."
- "Not interested" → "Totally understand. Can I ask who you're using now? If I find something better I'll reach out, if not I'll leave you alone."
- "Send me info" → "Absolutely — what's the best email? I'll send a one-pager, no commitment."`;
        } else {
          generatedBody = `CONNECTION NOTE (300 chars):
"Hi ${firstName} — I work with ${lead.industry || "businesses"} like ${lead.company} on commercial insurance. Noticed some recent activity and wanted to connect. Always happy to be a resource."

FOLLOW-UP MESSAGE:
"Thanks for connecting! I specialize in ${lead.industry || "commercial"} insurance for businesses in ${lead.state || "your area"}. ${(lead.signal || "Saw you're expanding").split("•")[0]} — that's usually a great time to review coverage. Would you be open to a quick conversation?"`;
        }
      }

      setSubject(generatedSubject);
      setDraft(generatedBody);
      toast.success("Draft ready — customize before sending");
    } catch (err: any) {
      toast.error("Draft generation failed — try again");
    } finally {
      setGeneratingDraft(false);
    }
  };

  // ── Save contact info ──
  const handleSaveContact = async () => {
    await updateLead.mutateAsync({
      id: lead.id,
      email: email || null,
      phone: phone || null,
      contact_name: contactName || null,
      source_url: website || null,
    } as any);
    toast.success("Contact saved");
  };

  // ── Copy to clipboard ──
  const handleCopy = () => {
    navigator.clipboard.writeText(mode === "email" ? `Subject: ${subject}\n\n${draft}` : draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  // ── Send email via connected email ──
  const handleSendEmail = async () => {
    if (!email) { toast.error("Add an email address first"); return; }
    if (!draft) { toast.error("Generate a draft first"); return; }
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "send",
          to: [email],
          subject: subject || `Insurance inquiry — ${lead.company}`,
          body_html: draft.replace(/\n/g, "<br/>"),
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || "Send failed");

      setSent(true);
      await updateLead.mutateAsync({ id: lead.id, status: "contacted" } as any);
      toast.success(`Email sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send — copy and send manually");
    } finally {
      setSending(false);
    }
  };

  // ── Convert to pipeline ──
  const handleConvertToPipeline = async () => {
    setConverting(true);
    try {
      await convertToPipeline.mutateAsync(lead);
      toast.success(`${lead.company} added to your pipeline`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not add to pipeline");
    } finally {
      setConverting(false);
    }
  };

  const darkInput = { background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{ background: "hsl(240 8% 8%)", borderLeft: "1px solid hsl(240 6% 14%)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 shrink-0" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{lead.company}</h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lead.industry && <Badge variant="secondary" className="text-[10px]">{lead.industry}</Badge>}
              {lead.state && <Badge variant="outline" className="text-[10px] gap-1"><MapPin className="h-2.5 w-2.5" />{lead.state}</Badge>}
              {lead.est_premium && <Badge variant="outline" className="text-[10px] gap-1"><DollarSign className="h-2.5 w-2.5" />${lead.est_premium.toLocaleString()}/yr est.</Badge>}
              <Badge variant="outline" className="text-[10px] gap-1" style={{ color: lead.score >= 70 ? "hsl(140 50% 55%)" : lead.score >= 50 ? "hsl(45 80% 55%)" : "hsl(240 5% 50%)" }}>
                <Target className="h-2.5 w-2.5" />Score {lead.score}
              </Badge>
            </div>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg shrink-0" style={{ color: "hsl(240 5% 50%)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          {/* Signal */}
          {lead.signal && (
            <div className="p-3 rounded-lg" style={{ background: "hsl(140 12% 42% / 0.08)", border: "1px solid hsl(140 12% 42% / 0.2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(140 12% 55%)" }}>Why this lead</p>
              <p className="text-xs leading-relaxed" style={{ color: "hsl(240 5% 70%)" }}>{lead.signal}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Contact Info</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1"
                style={{ color: "hsl(140 12% 58%)" }}
                onClick={handleFindContact}
                disabled={findingContact}
              >
                {findingContact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {findingContact ? "Researching…" : "Research Contact"}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(240 5% 46%)" }} />
                <Input
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Contact name"
                  className="h-8 text-xs flex-1"
                  style={darkInput}
                />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(240 5% 46%)" }} />
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  type="email"
                  className="h-8 text-xs flex-1"
                  style={darkInput}
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(240 5% 46%)" }} />
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  className="h-8 text-xs flex-1"
                  style={darkInput}
                />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(240 5% 46%)" }} />
                <Input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="Website or source URL"
                  className="h-8 text-xs flex-1"
                  style={darkInput}
                />
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="shrink-0" style={{ color: "hsl(140 12% 58%)" }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}
                onClick={handleSaveContact}
              >
                Save Contact Info
              </Button>
            </div>
          </div>

          <Separator style={{ background: "hsl(240 6% 14%)" }} />

          {/* Outreach Mode Tabs */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Draft Outreach</p>

            <div className="flex gap-1.5">
              {([
                { id: "email" as OutreachMode, label: "Email", icon: Mail },
                { id: "call" as OutreachMode, label: "Call Script", icon: Phone },
                { id: "linkedin" as OutreachMode, label: "LinkedIn", icon: MessageSquare },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setMode(tab.id); setDraft(""); setSubject(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: mode === tab.id ? "hsl(140 12% 42%)" : "hsl(240 6% 10%)",
                    color: mode === tab.id ? "white" : "hsl(240 5% 55%)",
                    border: `1px solid ${mode === tab.id ? "hsl(140 12% 42%)" : "hsl(240 6% 18%)"}`,
                  }}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              className="w-full gap-2 text-white h-9"
              style={{ background: "hsl(140 12% 42%)" }}
              onClick={handleGenerateDraft}
              disabled={generatingDraft}
            >
              {generatingDraft
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…</>
                : <><Sparkles className="h-3.5 w-3.5" /> Generate {mode === "email" ? "Email" : mode === "call" ? "Call Script" : "LinkedIn Message"}</>
              }
            </Button>

            {draft && (
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                {subject && mode === "email" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Subject</label>
                    <Input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="h-8 text-xs"
                      style={darkInput}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>
                    {mode === "email" ? "Body" : mode === "call" ? "Script" : "Messages"}
                  </label>
                  <Textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="text-xs min-h-[200px] resize-none"
                    style={darkInput}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}
                    onClick={() => { setDraft(""); setSubject(""); handleGenerateDraft(); }}
                    disabled={generatingDraft}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                </div>

                {mode === "email" && (
                  <Button
                    className="w-full gap-2 text-white h-9"
                    style={{ background: sent ? "hsl(140 50% 35%)" : "hsl(220 80% 55%)" }}
                    onClick={handleSendEmail}
                    disabled={sending || sent || !email}
                  >
                    {sending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                      : sent
                        ? <><Check className="h-3.5 w-3.5" /> Sent!</>
                        : <><Mail className="h-3.5 w-3.5" /> Send via Connected Email</>
                    }
                  </Button>
                )}

                {!email && mode === "email" && (
                  <p className="text-[10px] text-center" style={{ color: "hsl(240 5% 44%)" }}>
                    Add email above to send directly, or copy and send manually
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator style={{ background: "hsl(240 6% 14%)" }} />

          {/* Pipeline action */}
          <Button
            className="w-full gap-2 text-white h-10"
            style={{ background: "hsl(140 12% 42%)" }}
            onClick={handleConvertToPipeline}
            disabled={converting}
          >
            {converting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</>
              : <><ArrowUpRight className="h-4 w-4" /> Add to Pipeline</>
            }
          </Button>

          {lead.source_url && (
            <a
              href={lead.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs py-2"
              style={{ color: "hsl(140 12% 58%)" }}
            >
              <ExternalLink className="h-3 w-3" /> View source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
