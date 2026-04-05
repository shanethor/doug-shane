import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Mail, Phone, Globe, Copy, Check, Sparkles, Loader2,
  ArrowUpRight, Building2, MapPin, DollarSign, Target, User,
  MessageSquare, ExternalLink, RefreshCw, X, Map,
} from "lucide-react";
import { toast } from "sonner";
import { useUpdateEngineLead, useConvertToPipeline, type EngineLead } from "@/hooks/useLeadEngine";
import { getAuthHeaders } from "@/lib/auth-fetch";

type OutreachMode = "email" | "call" | "linkedin";

export default function ConnectLeadDetail() {
  const location = useLocation();
  const engineLeadId = location.pathname.split("/connect/leads/")[1]?.split("/")[0];
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateLead = useUpdateEngineLead();
  const convertToPipeline = useConvertToPipeline();

  const [lead, setLead] = useState<EngineLead | null>(null);
  const [loading, setLoading] = useState(true);

  // Contact fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
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

  useEffect(() => {
    if (!engineLeadId) return;
    (async () => {
      const { data, error } = await supabase
        .from("engine_leads")
        .select("*")
        .eq("id", engineLeadId)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      const l = data as EngineLead;
      setLead(l);
      setEmail(l.email || "");
      setPhone(l.phone || "");
      setWebsite(l.source_url || "");
      setContactName(l.contact_name || "");
      setLoading(false);
    })();
  }, [engineLeadId]);

  const handleFindContact = async () => {
    if (!lead) return;
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
      if (data?.contact_name && !contactName) { setContactName(data.contact_name); foundFields.push("contact name"); }
      if (data?.email) { setEmail(data.email); foundFields.push("email"); }
      if (data?.phone) { setPhone(data.phone); foundFields.push("phone"); }
      if (data?.linkedin_url) { setWebsite(data.linkedin_url); foundFields.push("LinkedIn"); }

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
        toast.info("No additional contact info found");
      }
    } catch (err: any) {
      toast.error(err.message || "Contact research failed");
    } finally {
      setFindingContact(false);
    }
  };

  const handleSaveContact = async () => {
    if (!lead) return;
    await updateLead.mutateAsync({
      id: lead.id,
      email: email || null,
      phone: phone || null,
      contact_name: contactName || null,
      source_url: website || null,
    } as any);
    toast.success("Contact saved");
  };

  const handleGenerateDraft = async () => {
    if (!lead) return;
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
        email: `Write a short, personalized cold outreach EMAIL (150-200 words). Return JSON: {subject: "...", body: "..."}`,
        call: `Write a 60-second cold CALL SCRIPT. Return JSON: {subject: "Call Script", body: "..."}`,
        linkedin: `Write a short LinkedIn CONNECTION MESSAGE (300 chars max) + follow-up message. Return JSON: {subject: "LinkedIn", body: "..."}`,
      };

      const { data: briefData } = await supabase.functions.invoke("connection-brief", {
        body: {
          name: lead.contact_name || `${lead.company} Owner`,
          notes: `TASK: ${modeInstructions[mode]}\n\nCONTEXT:\n${context}`,
        },
      });

      const firstName = lead.contact_name?.split(" ")[0] || "there";
      let generatedSubject = mode === "email" ? `Quick question about ${lead.company}'s coverage` : mode === "call" ? "Call Script" : "LinkedIn";
      let generatedBody = "";

      if (briefData?.brief) {
        const b = briefData.brief;
        if (mode === "email") {
          generatedBody = `Subject: ${generatedSubject}\n\nHi ${firstName},\n\nI came across ${lead.company} and noticed ${(lead.signal || "your business is growing").split("•")[0].trim().toLowerCase()}.\n\nAs an insurance agent who works with ${lead.industry || "businesses"} in ${lead.state || "your area"}, I wanted to reach out — it's the perfect time to make sure your coverage is right-sized.\n\n${b.recommended_move || `I'd love to run a quick no-pressure quote for you.`}\n\nWould you be open to a 15-minute call this week?\n\nBest,\n[Your Name]\n[Your Agency]\n[Your Phone]`;
        } else if (mode === "call") {
          generatedBody = `OPENING:\n"Hi, is this ${firstName}? This is [Your Name] with [Your Agency]. I noticed ${lead.company} recently ${(lead.signal || "started operations").split("•")[0].toLowerCase()}, and I work with ${lead.industry || "businesses"} in ${lead.state || "your area"}."\n\nBRIDGE:\n"Most ${lead.industry || "business"} owners don't realize their coverage from when they started doesn't reflect what they need now."\n\nASK:\n"Do you have 15 minutes this week to chat?"`;
        } else {
          generatedBody = `CONNECTION NOTE (300 chars):\n"Hi ${firstName} — I work with ${lead.industry || "businesses"} like ${lead.company} on commercial insurance. Noticed some recent activity and wanted to connect."\n\nFOLLOW-UP:\n"Thanks for connecting! I specialize in ${lead.industry || "commercial"} insurance for businesses in ${lead.state || "your area"}. Would you be open to a quick conversation?"`;
        }
      }

      setSubject(generatedSubject);
      setDraft(generatedBody);
      toast.success("Draft ready — customize before sending");
    } catch {
      toast.error("Draft generation failed");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mode === "email" ? `Subject: ${subject}\n\n${draft}` : draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const handleSendEmail = async () => {
    if (!lead || !email || !draft) return;
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
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleConvertToPipeline = async () => {
    if (!lead) return;
    setConverting(true);
    try {
      await convertToPipeline.mutateAsync(lead);
      toast.success(`${lead.company} added to your pipeline`);
    } catch (err: any) {
      toast.error(err.message || "Could not add to pipeline");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="px-2 sm:px-4 lg:px-6 py-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!lead) {
    return (
      <>
        <div className="px-2 sm:px-4 lg:px-6 py-20 text-center">
          <p className="text-muted-foreground">Lead not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/connect/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-2 sm:px-4 lg:px-6 py-4 max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/connect/leads")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{lead.company}</h1>
          <div className="flex flex-wrap gap-1.5">
            {lead.industry && <Badge variant="secondary" className="text-[10px]">{lead.industry}</Badge>}
            {lead.state && <Badge variant="outline" className="text-[10px] gap-1"><MapPin className="h-2.5 w-2.5" />{lead.state}</Badge>}
            {lead.est_premium > 0 && <Badge variant="outline" className="text-[10px] gap-1"><DollarSign className="h-2.5 w-2.5" />${lead.est_premium.toLocaleString()}/yr est.</Badge>}
            <Badge variant="outline" className={`text-[10px] gap-1 ${lead.score >= 80 ? "text-emerald-500 border-emerald-500/30" : lead.score >= 50 ? "text-amber-500 border-amber-500/30" : ""}`}>
              <Target className="h-2.5 w-2.5" />Score {lead.score}
            </Badge>
          </div>
          {/* Google Maps link */}
          {lead.source_url && lead.source_url.includes("google") && (
            <a
              href={lead.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <Map className="h-3.5 w-3.5" />
              View on Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Why this lead */}
            {lead.signal && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Why This Lead</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{lead.signal}</p>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Contact Info</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1 text-primary"
                    onClick={handleFindContact}
                    disabled={findingContact}
                  >
                    {findingContact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {findingContact ? "Researching…" : "Research Contact"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact name" className="h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" className="h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" type="tel" className="h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website or source URL" className="h-8 text-xs" />
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleSaveContact}>
                  Save Contact Info
                </Button>
              </CardContent>
            </Card>

            {/* Add to pipeline */}
            <Button
              className="w-full gap-2"
              onClick={handleConvertToPipeline}
              disabled={converting || lead.status === "converted"}
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              {lead.status === "converted" ? "Already in Pipeline" : "Add to Pipeline"}
            </Button>
          </div>

          {/* Right column — Draft Outreach */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Draft Outreach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-1.5">
                  {([
                    { id: "email" as OutreachMode, label: "Email", icon: Mail },
                    { id: "call" as OutreachMode, label: "Call Script", icon: Phone },
                    { id: "linkedin" as OutreachMode, label: "LinkedIn", icon: MessageSquare },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setMode(tab.id); setDraft(""); setSubject(""); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        mode === tab.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <tab.icon className="h-3 w-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Button className="w-full gap-2 h-9" onClick={handleGenerateDraft} disabled={generatingDraft}>
                  {generatingDraft
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…</>
                    : <><Sparkles className="h-3.5 w-3.5" /> Generate {mode === "email" ? "Email" : mode === "call" ? "Call Script" : "LinkedIn Message"}</>
                  }
                </Button>

                {draft && (
                  <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    {subject && mode === "email" && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                        <Input value={subject} onChange={e => setSubject(e.target.value)} className="h-8 text-xs" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {mode === "email" ? "Body" : mode === "call" ? "Script" : "Messages"}
                      </label>
                      <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={12} className="text-xs leading-relaxed" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      {mode === "email" && email && (
                        <Button size="sm" className="gap-1.5 text-xs flex-1" onClick={handleSendEmail} disabled={sending || sent}>
                          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : sent ? <Check className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          {sending ? "Sending…" : sent ? "Sent!" : `Send to ${email}`}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
