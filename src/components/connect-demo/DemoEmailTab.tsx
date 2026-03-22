import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Mail, MailOpen, RefreshCw, Search, Sparkles, Send, Paperclip, Reply,
  ArrowLeft, CheckCheck, Clock, X, Plus, Inbox, Link2, User, Wand2,
  FileText, Shield, AlertTriangle, TrendingUp, Zap,
} from "lucide-react";
import { toast } from "sonner";

interface DemoEmail {
  id: string; from: string; fromAddr: string; subject: string; snippet: string;
  time: string; unread: boolean; tags: string[]; account: string;
}

const DEMO_EMAILS: DemoEmail[] = [
  { id: "1", from: "Sarah Mitchell", fromAddr: "sarah@greenvalley.com", subject: "Q3 Pipeline Review — numbers look great", snippet: "Hey, just wanted to touch base on our Q3 numbers. The pipeline is looking strong and I think we should schedule a review meeting...", time: "12 min ago", unread: true, tags: [], account: "work" },
  { id: "2", from: "Marcus Chen", fromAddr: "marcus@techventures.io", subject: "Partnership proposal for West Coast expansion", snippet: "Following up on our conversation last week about expanding into the West Coast market. I've put together a preliminary proposal...", time: "34 min ago", unread: true, tags: ["renewal"], account: "work" },
  { id: "3", from: "Jessica Torres", fromAddr: "jess@blueridgecap.com", subject: "Re: Client onboarding — docs received", snippet: "Thanks for sending over the documents. Everything looks good on our end. We'll have the account set up by end of day...", time: "1 hour ago", unread: true, tags: ["auto-tagged"], account: "work" },
  { id: "4", from: "David Kowalski", fromAddr: "david.k@primeadvisors.net", subject: "Referral — new prospect in healthcare vertical", snippet: "I have a warm referral for you. Dr. Patel runs a growing dermatology practice in Austin and is looking for a new advisor...", time: "2 hours ago", unread: false, tags: ["referral"], account: "personal" },
  { id: "5", from: "Linda Park", fromAddr: "linda@sunriseproperties.com", subject: "Annual review meeting — Thursday works", snippet: "Thursday at 2pm works perfectly for me. I'll send a calendar invite with the Zoom link. Looking forward to reviewing...", time: "3 hours ago", unread: false, tags: [], account: "work" },
  { id: "6", from: "Robert Nguyen", fromAddr: "rnguyen@coastaldev.co", subject: "Invoice #4892 — payment confirmation", snippet: "Just confirming that payment for invoice #4892 has been processed. You should see the funds in your account within 2-3 business days...", time: "4 hours ago", unread: false, tags: ["billing"], account: "personal" },
  { id: "7", from: "Amanda Foster", fromAddr: "amanda@brightfuture.org", subject: "Event sponsorship opportunity — Annual Gala", snippet: "We'd love to have your company as a sponsor for our Annual Gala on November 15th. There are several sponsorship tiers available...", time: "5 hours ago", unread: false, tags: [], account: "work" },
  { id: "8", from: "James Whitfield", fromAddr: "james@alpinegroup.com", subject: "Re: Contract renewal discussion", snippet: "I've reviewed the updated terms and they look fair. Let's schedule a call to finalize the details before the end of the month...", time: "6 hours ago", unread: false, tags: ["renewal"], account: "work" },
  { id: "9", from: "Priya Sharma", fromAddr: "priya@novahealth.com", subject: "Compliance documentation request", snippet: "As part of our annual compliance review, we need updated copies of your certifications and licensing documents...", time: "Yesterday", unread: false, tags: ["compliance"], account: "work" },
  { id: "10", from: "Tom Bradley", fromAddr: "tom.b@westfieldmfg.com", subject: "Quote request — commercial fleet expansion", snippet: "We're adding 12 vehicles to our fleet next quarter and need updated coverage. Can you send over a quote for the expanded fleet?", time: "Yesterday", unread: false, tags: ["quote"], account: "personal" },
];

const SYNCED_ACCOUNTS = [
  { label: "Work — you@auraconnect.com", key: "work", color: "hsl(174 97% 40%)", synced: true },
  { label: "Personal — yourname@gmail.com", key: "personal", color: "hsl(262 83% 58%)", synced: true },
  { label: "Agency — team@agencymail.com", key: "agency", color: "hsl(45 93% 47%)", synced: false },
];

const CLIENT_CONTACTS = [
  { name: "Sarah Mitchell", email: "sarah@greenvalley.com", emailCount: 14 },
  { name: "Marcus Chen", email: "marcus@techventures.io", emailCount: 9 },
  { name: "Jessica Torres", email: "jess@blueridgecap.com", emailCount: 6 },
  { name: "David Kowalski", email: "david.k@primeadvisors.net", emailCount: 11 },
  { name: "Linda Park", email: "linda@sunriseproperties.com", emailCount: 8 },
  { name: "James Whitfield", email: "james@alpinegroup.com", emailCount: 5 },
];

const SMART_FEATURES = [
  { icon: Wand2, label: "AI Smart Reply", desc: "Generate contextual replies based on thread history" },
  { icon: FileText, label: "Auto-Summarize", desc: "Condense long email threads into key points" },
  { icon: Shield, label: "Compliance Check", desc: "Flag potential compliance issues before sending" },
  { icon: TrendingUp, label: "Sentiment Analysis", desc: "Gauge client tone and urgency level" },
  { icon: Zap, label: "Follow-Up Reminder", desc: "Auto-set reminders for unanswered emails" },
  { icon: AlertTriangle, label: "Priority Scoring", desc: "AI ranks emails by business impact" },
];

export default function DemoEmailTab() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [showAccounts, setShowAccounts] = useState(false);
  const [showClientLookup, setShowClientLookup] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState("");

  const filtered = DEMO_EMAILS.filter((e) => {
    if (filter === "unread" && !e.unread) return false;
    if (accountFilter !== "all" && e.account !== accountFilter) return false;
    if (selectedClient) {
      return e.fromAddr === selectedClient;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) || e.from.toLowerCase().includes(q) || e.snippet.toLowerCase().includes(q);
    }
    return true;
  });

  const selected = DEMO_EMAILS.find((e) => e.id === selectedEmail);
  const unreadCount = DEMO_EMAILS.filter((e) => e.unread).length;

  const filteredClients = CLIENT_CONTACTS.filter(c =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleAiDraft = () => {
    setShowAiDraft(true);
    setAiDraftLoading(true);
    setAiDraft("");
    const draft = `Hi ${selected?.from?.split(" ")[0]},\n\nThank you for reaching out. I've reviewed the details and everything looks great on my end.\n\nI'd like to schedule a quick call this week to discuss next steps and ensure we're aligned on timing. Would Thursday at 2:00 PM work for you?\n\nLooking forward to connecting.\n\nBest regards,\nYour Name`;
    let i = 0;
    const interval = setInterval(() => {
      setAiDraft(draft.slice(0, i));
      i += 3;
      if (i > draft.length) {
        setAiDraft(draft);
        setAiDraftLoading(false);
        clearInterval(interval);
      }
    }, 20);
  };

  // Smart feature handlers for specific email context
  const handleSmartFeature = (label: string) => {
    if (!selected) {
      toast.success(`${label} activated`);
      return;
    }
    const name = selected.from.split(" ")[0];
    switch (label) {
      case "AI Smart Reply":
        handleAiDraft();
        break;
      case "Auto-Summarize":
        toast.success(`Summarized thread with ${selected.from}: 3 key points extracted — pipeline review, scheduling, next steps.`);
        break;
      case "Compliance Check":
        toast.success(`Compliance scan complete for "${selected.subject}" — no issues detected.`);
        break;
      case "Sentiment Analysis":
        toast.success(`Sentiment for ${name}'s email: Positive (87%) — professional and eager to proceed.`);
        break;
      case "Follow-Up Reminder":
        toast.success(`Follow-up reminder set for ${name}'s email — tomorrow at 9:00 AM.`);
        break;
      case "Priority Scoring":
        toast.success(`Priority score for "${selected.subject}": High (8.4/10) — relates to active pipeline deal.`);
        break;
      default:
        toast.success(`${label} activated for this email`);
    }
  };

  // Email detail view — rendered BELOW the persistent header
  const emailDetailView = selected ? (
    <div className="space-y-4" style={{ animation: "smoothFadeSlide 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedEmail(null); setShowAiDraft(false); }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
      </Button>
      <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{selected.subject}</h2>
              <p className="text-sm mt-1" style={{ color: "hsl(240 5% 46%)" }}>
                From: <span className="text-white">{selected.from}</span> &lt;{selected.fromAddr}&gt;
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 36%)" }}>{selected.time}</p>
            </div>
            <div className="flex gap-1">
              {selected.tags.map(t => (
                <Badge key={t} variant="outline" className="text-[9px]" style={{ borderColor: "hsl(174 97% 22% / 0.3)", color: "hsl(174 97% 40%)" }}>{t}</Badge>
              ))}
            </div>
          </div>

          {/* Smart insights bar */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "hsl(174 97% 22% / 0.06)", border: "1px solid hsl(174 97% 22% / 0.15)" }}>
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
            <span className="text-[11px]" style={{ color: "hsl(174 97% 40%)" }}>
              AI Insight: This email relates to an active pipeline deal. Suggested priority: <strong>High</strong>. Sentiment: <strong>Positive</strong>.
            </span>
          </div>

          <div className="border-t pt-4 text-sm leading-relaxed" style={{ borderColor: "hsl(240 6% 14%)", color: "hsl(240 5% 70%)" }}>
            <p>Hi there,</p><br />
            <p>{selected.snippet}</p><br />
            <p>We should schedule some time this week to discuss next steps. I've been looking at the numbers and I think there's a real opportunity here if we move quickly.</p><br />
            <p>Let me know what works for your schedule.</p><br />
            <p>Best regards,<br />{selected.from}</p>
          </div>

          <div className="flex gap-2 pt-2 border-t flex-wrap" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Reply className="h-3 w-3" /> Reply</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleAiDraft}><Sparkles className="h-3 w-3" /> AI Draft</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Paperclip className="h-3 w-3" /> Attach</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.success("Follow-up reminder set for tomorrow 9 AM")}><Clock className="h-3 w-3" /> Set Reminder</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.success("Thread summarized — 3 key points extracted")}><FileText className="h-3 w-3" /> Summarize</Button>
          </div>

          {showAiDraft && (
            <div className="rounded-lg p-4 space-y-2 animate-fade-in" style={{ background: "hsl(174 97% 22% / 0.06)", border: "1px solid hsl(174 97% 22% / 0.2)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
                <span className="text-xs font-semibold" style={{ color: "hsl(174 97% 40%)" }}>AI-Generated Draft</span>
                {aiDraftLoading && <span className="text-[10px] animate-pulse" style={{ color: "hsl(240 5% 46%)" }}>generating...</span>}
              </div>
              <pre className="text-sm whitespace-pre-wrap" style={{ color: "hsl(240 5% 80%)" }}>{aiDraft}</pre>
              {!aiDraftLoading && aiDraft && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="text-xs h-7" style={{ background: "hsl(174 97% 22%)" }} onClick={() => toast.success("Draft copied to reply")}>Use Draft</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toast.info("Regenerating...")}>Regenerate</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  ) : null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" style={{ color: "hsl(174 97% 40%)" }} />
          <h2 className="text-lg font-semibold text-white">Email</h2>
          <Badge className="text-[10px]" style={{ background: "hsl(174 97% 22%)", color: "white" }}>{unreadCount} new</Badge>
          <span className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Last synced 3 minutes ago</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAccounts(true)}>
            <Link2 className="h-3 w-3" /> Inboxes ({SYNCED_ACCOUNTS.filter(a => a.synced).length})
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowClientLookup(true)}>
            <User className="h-3 w-3" /> Client Lookup
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.success("All emails marked as read")}>
            <CheckCheck className="h-3 w-3" /> Mark all read
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => setShowCompose(true)}>
            <Sparkles className="h-3 w-3" /> Compose
          </Button>
        </div>
      </div>

      {/* Smart Features Bar — always visible, contextual to open email */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {SMART_FEATURES.map((f, i) => (
          <button
            key={i}
            onClick={() => handleSmartFeature(f.label)}
            className="p-2.5 rounded-lg text-left transition-all hover:scale-[1.02] hover:bg-white/5"
            style={{ background: "hsl(240 8% 9%)", border: `1px solid ${selected ? "hsl(174 97% 22% / 0.25)" : "hsl(240 6% 14%)"}` }}
          >
            <f.icon className="h-4 w-4 mb-1" style={{ color: "hsl(174 97% 40%)" }} />
            <p className="text-[11px] font-medium text-white">{f.label}</p>
            <p className="text-[9px]" style={{ color: "hsl(240 5% 40%)" }}>
              {selected ? `Apply to ${selected.from.split(" ")[0]}'s email` : f.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Email detail OR inbox list */}
      {emailDetailView ? emailDetailView : (
        <>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setAccountFilter("all"); setSelectedClient(null); }} className={`text-xs px-3 py-1 rounded-md transition-colors ${accountFilter === "all" && !selectedClient ? "bg-white/10 text-white" : ""}`} style={accountFilter !== "all" || selectedClient ? { color: "hsl(240 5% 46%)" } : {}}>All Inboxes</button>
        {SYNCED_ACCOUNTS.filter(a => a.synced).map(a => (
          <button key={a.key} onClick={() => { setAccountFilter(a.key); setSelectedClient(null); }} className={`text-xs px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${accountFilter === a.key && !selectedClient ? "bg-white/10 text-white" : ""}`} style={accountFilter !== a.key || selectedClient ? { color: "hsl(240 5% 46%)" } : {}}>
            <span className="h-2 w-2 rounded-full" style={{ background: a.color }} /> {a.key}
          </button>
        ))}
        <span className="mx-1" style={{ color: "hsl(240 6% 20%)" }}>|</span>
        <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1 rounded-md transition-colors ${filter === "all" ? "bg-white/10 text-white" : ""}`} style={filter !== "all" ? { color: "hsl(240 5% 46%)" } : {}}>All</button>
        <button onClick={() => setFilter("unread")} className={`text-xs px-3 py-1 rounded-md transition-colors ${filter === "unread" ? "bg-white/10 text-white" : ""}`} style={filter !== "unread" ? { color: "hsl(240 5% 46%)" } : {}}>Unread ({unreadCount})</button>
        {selectedClient && (
          <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer" style={{ borderColor: "hsl(174 97% 22% / 0.3)", color: "hsl(174 97% 40%)" }} onClick={() => setSelectedClient(null)}>
            Client: {CLIENT_CONTACTS.find(c => c.email === selectedClient)?.name} <X className="h-2.5 w-2.5" />
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
        <Input placeholder="Search emails by subject, sender, or content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
      </div>

      {/* Email list */}
      <div className="space-y-1">
        {filtered.map((email, idx) => (
          <button
            key={email.id}
            onClick={() => setSelectedEmail(email.id)}
            className="w-full text-left p-3 rounded-lg transition-all hover:bg-white/5 flex items-start gap-3 animate-fade-in"
            style={{
              background: email.unread ? "hsl(174 97% 22% / 0.06)" : "transparent",
              borderBottom: "1px solid hsl(240 6% 12%)",
              animationDelay: `${idx * 30}ms`,
            }}
          >
            <div className="mt-1">
              {email.unread ? <Mail className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} /> : <MailOpen className="h-4 w-4" style={{ color: "hsl(240 5% 36%)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SYNCED_ACCOUNTS.find(a => a.key === email.account)?.color ?? "hsl(240 5% 36%)" }} />
                <span className={`text-sm truncate ${email.unread ? "font-semibold text-white" : ""}`} style={!email.unread ? { color: "hsl(240 5% 70%)" } : {}}>
                  {email.from}: {email.subject}
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: "hsl(240 5% 46%)" }}>{email.snippet}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px]" style={{ color: "hsl(240 5% 36%)" }}>{email.time}</span>
                {email.tags.map(t => (
                  <Badge key={t} variant="outline" className="text-[9px] h-4" style={{ borderColor: "hsl(174 97% 22% / 0.3)", color: "hsl(174 97% 40%)" }}>{t}</Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
      </>
      )}

      {/* Synced Accounts Dialog */}
      <Dialog open={showAccounts} onOpenChange={setShowAccounts}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">Connected Inboxes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {SYNCED_ACCOUNTS.map(a => (
              <div key={a.key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: a.color }} />
                  <span className="text-sm text-white">{a.label}</span>
                </div>
                {a.synced ? (
                  <Badge className="text-[10px]" style={{ background: "hsl(142 71% 25%)", color: "white" }}>Synced</Badge>
                ) : (
                  <Button size="sm" className="text-xs h-7" style={{ background: "hsl(174 97% 22%)" }} onClick={() => toast.success(`${a.label} connected!`)}>
                    <Plus className="h-3 w-3 mr-1" /> Connect
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" className="w-full text-xs gap-1.5 mt-2" onClick={() => toast.info("Add another email provider")}>
              <Plus className="h-3 w-3" /> Add Another Inbox
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Lookup Dialog */}
      <Dialog open={showClientLookup} onOpenChange={setShowClientLookup}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">Client Email Lookup</DialogTitle></DialogHeader>
          <Input placeholder="Search client name or email..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredClients.map(c => (
              <button key={c.email} className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between" onClick={() => { setSelectedClient(c.email); setShowClientLookup(false); setClientSearch(""); }}>
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>{c.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 60%)" }}>{c.emailCount} emails</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">New Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="To:" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <Input placeholder="Subject:" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <textarea placeholder="Write your message..." className="w-full h-32 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1"><Paperclip className="h-3 w-3" /> Attach</Button>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => toast.success("AI draft generated")}><Sparkles className="h-3 w-3" /> AI Draft</Button>
              </div>
              <Button size="sm" className="text-xs h-8 gap-1.5" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success("Email sent!"); setShowCompose(false); }}>
                <Send className="h-3 w-3" /> Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
