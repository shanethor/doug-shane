import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, MailOpen, Search, Sparkles, Send, Paperclip, Reply, ReplyAll, Forward,
  ArrowLeft, CheckCheck, Clock, X, Plus, Link2, User, Wand2,
  FileText, Shield, AlertTriangle, TrendingUp, Zap, Star, Inbox,
  SendHorizonal, FilePenLine, Tag, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────── Types ─────────── */
interface DemoMessage {
  id: string; from: string; fromAddr: string; to: string; toAddr: string;
  body: string; time: string; date: string;
}
interface DemoThread {
  id: string; subject: string; participants: string[]; messages: DemoMessage[];
  unread: boolean; starred: boolean; tags: string[]; account: string;
  hasAttachment?: boolean;
}

/* ─────────── Demo Data ─────────── */
const THREADS: DemoThread[] = [
  {
    id: "t1", subject: "Q3 Pipeline Review — numbers look great", participants: ["Sarah Mitchell", "You"],
    unread: true, starred: false, tags: [], account: "work", hasAttachment: false,
    messages: [
      { id: "m1a", from: "Sarah Mitchell", fromAddr: "sarah@greenvalley.com", to: "You", toAddr: "you@auraconnect.com", body: "Hey, just wanted to touch base on our Q3 numbers. The pipeline is looking strong and I think we should schedule a review meeting to discuss targets for next quarter.\n\nWe're tracking at 127% of goal which is fantastic. Let me know when you're free.", time: "10:32 AM", date: "Today" },
      { id: "m1b", from: "You", fromAddr: "you@auraconnect.com", to: "Sarah Mitchell", toAddr: "sarah@greenvalley.com", body: "Great to hear, Sarah! Those numbers are impressive. How about Thursday at 2pm? I'll send a calendar invite.", time: "11:15 AM", date: "Today" },
      { id: "m1c", from: "Sarah Mitchell", fromAddr: "sarah@greenvalley.com", to: "You", toAddr: "you@auraconnect.com", body: "Thursday at 2pm works perfectly. I'll have the updated forecast ready. Also, I think we should loop in Marcus for the West Coast expansion discussion.", time: "12:02 PM", date: "Today" },
    ],
  },
  {
    id: "t2", subject: "Partnership proposal for West Coast expansion", participants: ["Marcus Chen"],
    unread: true, starred: true, tags: ["renewal"], account: "work",
    messages: [
      { id: "m2a", from: "Marcus Chen", fromAddr: "marcus@techventures.io", to: "You", toAddr: "you@auraconnect.com", body: "Following up on our conversation last week about expanding into the West Coast market. I've put together a preliminary proposal covering the first 6 months of partnership.\n\nKey points:\n• Joint marketing campaign\n• Shared lead pipeline\n• Co-branded materials\n\nLet me know your thoughts.", time: "9:45 AM", date: "Today" },
    ],
  },
  {
    id: "t3", subject: "Re: Client onboarding — docs received", participants: ["Jessica Torres"],
    unread: true, starred: false, tags: ["auto-tagged"], account: "work", hasAttachment: true,
    messages: [
      { id: "m3a", from: "You", fromAddr: "you@auraconnect.com", to: "Jessica Torres", toAddr: "jess@blueridgecap.com", body: "Hi Jessica, sending over the onboarding documents as discussed. Please review and let me know if anything is missing.", time: "9:00 AM", date: "Yesterday" },
      { id: "m3b", from: "Jessica Torres", fromAddr: "jess@blueridgecap.com", to: "You", toAddr: "you@auraconnect.com", body: "Thanks for sending over the documents. Everything looks good on our end. We'll have the account set up by end of day tomorrow. I'll send confirmation once it's live.", time: "1:12 PM", date: "Today" },
    ],
  },
  {
    id: "t4", subject: "Referral — new prospect in healthcare vertical", participants: ["David Kowalski"],
    unread: false, starred: false, tags: ["referral"], account: "personal",
    messages: [
      { id: "m4a", from: "David Kowalski", fromAddr: "david.k@primeadvisors.net", to: "You", toAddr: "you@auraconnect.com", body: "I have a warm referral for you. Dr. Patel runs a growing dermatology practice in Austin and is looking for a new advisor. She's currently with a competitor but unhappy with their service.\n\nHer email is dr.patel@skincareatx.com. Mention my name when you reach out.", time: "2:30 PM", date: "Yesterday" },
    ],
  },
  {
    id: "t5", subject: "Annual review meeting — Thursday works", participants: ["Linda Park"],
    unread: false, starred: false, tags: [], account: "work",
    messages: [
      { id: "m5a", from: "Linda Park", fromAddr: "linda@sunriseproperties.com", to: "You", toAddr: "you@auraconnect.com", body: "Thursday at 2pm works perfectly for me. I'll send a calendar invite with the Zoom link. Looking forward to reviewing the portfolio performance this year.", time: "3:45 PM", date: "Yesterday" },
    ],
  },
  {
    id: "t6", subject: "Invoice #4892 — payment confirmation", participants: ["Robert Nguyen"],
    unread: false, starred: true, tags: ["billing"], account: "personal",
    messages: [
      { id: "m6a", from: "Robert Nguyen", fromAddr: "rnguyen@coastaldev.co", to: "You", toAddr: "you@auraconnect.com", body: "Just confirming that payment for invoice #4892 has been processed. You should see the funds in your account within 2-3 business days. Let me know if you have any questions.", time: "4:10 PM", date: "Yesterday" },
    ],
  },
  {
    id: "t7", subject: "Event sponsorship opportunity — Annual Gala", participants: ["Amanda Foster"],
    unread: false, starred: false, tags: [], account: "work",
    messages: [
      { id: "m7a", from: "Amanda Foster", fromAddr: "amanda@brightfuture.org", to: "You", toAddr: "you@auraconnect.com", body: "We'd love to have your company as a sponsor for our Annual Gala on November 15th. There are several sponsorship tiers available starting at $2,500. This is a great networking opportunity with 200+ business leaders attending.", time: "5:00 PM", date: "2 days ago" },
    ],
  },
  {
    id: "t8", subject: "Re: Contract renewal discussion", participants: ["James Whitfield"],
    unread: false, starred: false, tags: ["renewal"], account: "work",
    messages: [
      { id: "m8a", from: "You", fromAddr: "you@auraconnect.com", to: "James Whitfield", toAddr: "james@alpinegroup.com", body: "Hi James, I've prepared the updated renewal terms. Please review the attached and let me know your thoughts.", time: "10:00 AM", date: "3 days ago" },
      { id: "m8b", from: "James Whitfield", fromAddr: "james@alpinegroup.com", to: "You", toAddr: "you@auraconnect.com", body: "I've reviewed the updated terms and they look fair. Let's schedule a call to finalize the details before the end of the month. I'm available most afternoons next week.", time: "6:20 PM", date: "2 days ago" },
    ],
  },
  {
    id: "t9", subject: "Compliance documentation request", participants: ["Priya Sharma"],
    unread: false, starred: false, tags: ["compliance"], account: "work",
    messages: [
      { id: "m9a", from: "Priya Sharma", fromAddr: "priya@novahealth.com", to: "You", toAddr: "you@auraconnect.com", body: "As part of our annual compliance review, we need updated copies of your certifications and licensing documents. Could you send those over by end of week?", time: "8:15 AM", date: "3 days ago" },
    ],
  },
  {
    id: "t10", subject: "Quote request — commercial fleet expansion", participants: ["Tom Bradley"],
    unread: false, starred: false, tags: ["quote"], account: "personal", hasAttachment: true,
    messages: [
      { id: "m10a", from: "Tom Bradley", fromAddr: "tom.b@westfieldmfg.com", to: "You", toAddr: "you@auraconnect.com", body: "We're adding 12 vehicles to our fleet next quarter and need updated coverage. Can you send over a quote for the expanded fleet? I've attached the current vehicle schedule.", time: "11:00 AM", date: "3 days ago" },
    ],
  },
];

const SYNCED_ACCOUNTS = [
  { label: "Work — you@auraconnect.com", key: "work", color: "hsl(140 12% 58%)", synced: true },
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
  { icon: Wand2, label: "Smart Reply", desc: "Generate contextual replies based on thread history" },
  { icon: FileText, label: "Auto-Summarize", desc: "Condense long email threads into key points" },
  { icon: Shield, label: "Compliance Check", desc: "Flag potential compliance issues before sending" },
  { icon: TrendingUp, label: "Sentiment Analysis", desc: "Gauge client tone and urgency level" },
  { icon: Zap, label: "Follow-Up Reminder", desc: "Auto-set reminders for unanswered emails" },
  { icon: AlertTriangle, label: "Priority Scoring", desc: "Ranks emails by business impact" },
];

type Folder = "inbox" | "sent" | "starred" | "drafts";

/* ─────────── Search parser ─────────── */
function parseSearch(raw: string, threads: DemoThread[]): DemoThread[] {
  let q = raw.trim().toLowerCase();
  let results = threads;
  // from:xxx
  const fromMatch = q.match(/from:(\S+)/);
  if (fromMatch) {
    const val = fromMatch[1];
    results = results.filter(t => t.messages.some(m => m.from.toLowerCase().includes(val) || m.fromAddr.toLowerCase().includes(val)));
    q = q.replace(/from:\S+/, "").trim();
  }
  // subject:xxx
  const subjectMatch = q.match(/subject:(\S+)/);
  if (subjectMatch) {
    const val = subjectMatch[1];
    results = results.filter(t => t.subject.toLowerCase().includes(val));
    q = q.replace(/subject:\S+/, "").trim();
  }
  // is:unread / is:starred
  if (q.includes("is:unread")) { results = results.filter(t => t.unread); q = q.replace("is:unread", "").trim(); }
  if (q.includes("is:starred")) { results = results.filter(t => t.starred); q = q.replace("is:starred", "").trim(); }
  // has:attachment
  if (q.includes("has:attachment")) { results = results.filter(t => t.hasAttachment); q = q.replace("has:attachment", "").trim(); }
  // free text
  if (q) {
    results = results.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.messages.some(m => m.from.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
    );
  }
  return results;
}

/* ─────────── Labels ─────────── */
const DEFAULT_LABELS = ["renewal", "referral", "billing", "compliance", "quote", "auto-tagged"];

/* ─────────── Component ─────────── */
export default function DemoEmailTab() {
  const [threads, setThreads] = useState<DemoThread[]>(THREADS);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [showAccounts, setShowAccounts] = useState(false);
  const [showClientLookup, setShowClientLookup] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set());
  const [customLabels, setCustomLabels] = useState<string[]>(DEFAULT_LABELS);
  const [newLabel, setNewLabel] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Inline reply state
  const [replyTo, setReplyTo] = useState<{ msgId: string; mode: "reply" | "replyAll" | "forward" } | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // Summary popup
  const [showSummary, setShowSummary] = useState(false);

  // Compose state
  const [compTo, setCompTo] = useState("");
  const [compCc, setCompCc] = useState("");
  const [compBcc, setCompBcc] = useState("");
  const [compSubject, setCompSubject] = useState("");
  const [compBody, setCompBody] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  const selectedThread = threads.find(t => t.id === selectedThreadId);
  const unreadCount = threads.filter(t => t.unread).length;

  /* ── Filtering ── */
  const folderFiltered = threads.filter(t => {
    if (folder === "starred") return t.starred;
    if (folder === "sent") return t.messages.some(m => m.from === "You");
    if (folder === "drafts") return false; // mock
    return true; // inbox
  });

  const accountFiltered = folderFiltered.filter(t => accountFilter === "all" || t.account === accountFilter);

  const clientFiltered = selectedClient
    ? accountFiltered.filter(t => t.messages.some(m => m.fromAddr === selectedClient || m.toAddr === selectedClient))
    : accountFiltered;

  const filtered = searchQuery ? parseSearch(searchQuery, clientFiltered) : clientFiltered;

  const filteredClients = CLIENT_CONTACTS.filter(c =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  /* ── Actions ── */
  const toggleStar = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, starred: !t.starred } : t));
  }, []);

  const markRead = useCallback((threadId: string) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread: false } : t));
  }, []);

  const toggleLabel = useCallback((threadId: string, label: string) => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      return { ...t, tags: t.tags.includes(label) ? t.tags.filter(l => l !== label) : [...t.tags, label] };
    }));
  }, []);

  const handleAiDraft = useCallback((thread: DemoThread) => {
    setShowAiDraft(true);
    setAiDraftLoading(true);
    setAiDraft("");
    const lastMsg = thread.messages[thread.messages.length - 1];
    const name = lastMsg.from === "You" ? thread.participants.find(p => p !== "You") || "there" : lastMsg.from.split(" ")[0];
    const draft = `Hi ${name},\n\nThank you for reaching out. I've reviewed the details and everything looks great on my end.\n\nI'd like to schedule a quick call this week to discuss next steps and ensure we're aligned on timing. Would Thursday at 2:00 PM work for you?\n\nLooking forward to connecting.\n\nBest regards`;
    let i = 0;
    const interval = setInterval(() => {
      setAiDraft(draft.slice(0, i));
      i += 3;
      if (i > draft.length) { setAiDraft(draft); setAiDraftLoading(false); clearInterval(interval); }
    }, 20);
  }, []);

  const handleSmartFeature = useCallback((label: string) => {
    if (!selectedThread) { toast.success(`${label} activated`); return; }
    const name = selectedThread.participants.find(p => p !== "You") || "Contact";
    switch (label) {
      case "Smart Reply": handleAiDraft(selectedThread); break;
      case "Auto-Summarize": setShowSummary(true); break;
      case "Compliance Check": toast.success(`Compliance scan complete for "${selectedThread.subject}" — no issues detected.`); break;
      case "Sentiment Analysis": toast.success(`Sentiment for ${name}: Positive (87%) — professional and eager to proceed.`); break;
      case "Follow-Up Reminder": toast.success(`Follow-up reminder set for ${name}'s thread — tomorrow at 9:00 AM.`); break;
      case "Priority Scoring": toast.success(`Priority score for "${selectedThread.subject}": High (8.4/10) — relates to active pipeline deal.`); break;
      default: toast.success(`${label} activated`);
    }
  }, [selectedThread, handleAiDraft]);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showCompose && e.key === "Escape") { setShowCompose(false); return; }
      if (selectedThread) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[focusedIndex]) { setSelectedThreadId(filtered[focusedIndex].id); markRead(filtered[focusedIndex].id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCompose, selectedThread, filtered, focusedIndex, markRead]);

  /* ── Compose send ── */
  const handleSend = () => {
    toast.success("In demo, this is saved as a mock 'Sent' email.");
    setShowCompose(false);
    setCompTo(""); setCompCc(""); setCompBcc(""); setCompSubject(""); setCompBody(""); setShowCcBcc(false);
  };

  /* ─── Sidebar labels ─── */
  const FOLDERS: { key: Folder; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: unreadCount },
    { key: "sent", label: "Sent", icon: SendHorizonal },
    { key: "starred", label: "Starred", icon: Star },
    { key: "drafts", label: "Drafts", icon: FilePenLine },
  ];

  /* ─────────── Conversation View ─────────── */
  const conversationView = selectedThread ? (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedThreadId(null); setShowAiDraft(false); }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => toggleStar(selectedThread.id, e)}>
            <Star className={`h-3.5 w-3.5 ${selectedThread.starred ? "fill-yellow-400 text-yellow-400" : ""}`} style={!selectedThread.starred ? { color: "hsl(240 5% 46%)" } : {}} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.success("Thread archived")}>
            <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
          </Button>
        </div>
      </div>

      {/* Subject + tags */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-white leading-tight">{selectedThread.subject}</h2>
        <div className="flex gap-1 shrink-0">
          {selectedThread.tags.map(t => (
            <Badge key={t} variant="outline" className="text-[9px]" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }}>{t}</Badge>
          ))}
        </div>
      </div>

      {/* Participants chips */}
      <div className="flex gap-1.5 flex-wrap">
        {selectedThread.participants.map(p => (
          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(240 8% 14%)", color: "hsl(240 5% 70%)" }}>{p}</span>
        ))}
        <span className="text-[10px] px-1" style={{ color: "hsl(240 5% 36%)" }}>{selectedThread.messages.length} message{selectedThread.messages.length > 1 ? "s" : ""}</span>
      </div>

      {/* Smart Features Bar — larger on desktop */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
        {SMART_FEATURES.map((f, i) => (
          <button
            key={i}
            onClick={() => handleSmartFeature(f.label)}
            className="p-1.5 lg:p-2.5 rounded-md text-left transition-all hover:scale-[1.02] hover:bg-white/5"
            style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}
          >
            <f.icon className="h-3 w-3 lg:h-4 lg:w-4 mb-0.5" style={{ color: "hsl(140 12% 58%)" }} />
            <p className="text-[9px] lg:text-[11px] font-medium text-white leading-tight">{f.label}</p>
          </button>
        ))}
      </div>

      {/* Insight bar */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.15)" }}>
        <Sparkles className="h-4 w-4 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
        <span className="text-[11px]" style={{ color: "hsl(140 12% 58%)" }}>
          Insight: This thread relates to an active pipeline deal. Priority: <strong>High</strong>. Sentiment: <strong>Positive</strong>.
        </span>
      </div>

      {/* Messages — conversation stacked */}
      <div className="space-y-2">
        {selectedThread.messages.map((msg, idx) => {
          const isOld = idx < selectedThread.messages.length - 1;
          const isCollapsed = isOld && collapsedMessages.has(msg.id);
          const isLastOld = idx === selectedThread.messages.length - 2;
          // auto-collapse all except last 2
          const shouldAutoCollapse = selectedThread.messages.length > 2 && idx < selectedThread.messages.length - 2;
          const collapsed = shouldAutoCollapse ? !collapsedMessages.has(msg.id) : isCollapsed;
          
          return (
            <Card key={msg.id} className="overflow-hidden" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => {
                  setCollapsedMessages(prev => {
                    const next = new Set(prev);
                    if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
                    return next;
                  });
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                    style={{ background: msg.from === "You" ? "hsl(140 12% 42%)" : "hsl(262 83% 45%)" }}
                  >
                    {msg.from === "You" ? "Y" : msg.from.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-white">{msg.from}</span>
                    {collapsed && (
                      <span className="text-[10px] ml-2 truncate" style={{ color: "hsl(240 5% 46%)" }}>
                        — {msg.body.slice(0, 80)}…
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px]" style={{ color: "hsl(240 5% 36%)" }}>{msg.date === "Today" ? msg.time : msg.date}</span>
                  {isOld && (collapsed ? <ChevronDown className="h-3 w-3" style={{ color: "hsl(240 5% 46%)" }} /> : <ChevronUp className="h-3 w-3" style={{ color: "hsl(240 5% 46%)" }} />)}
                </div>
              </div>
              {!collapsed && (
                <div className="px-3 pb-3">
                  <div className="text-[10px] mb-2" style={{ color: "hsl(240 5% 40%)" }}>
                    To: {msg.to} &lt;{msg.toAddr}&gt;
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 78%)" }}>
                    {msg.body}
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }} onClick={() => { setReplyTo({ msgId: msg.id, mode: "reply" }); setReplyBody(""); }}>
                      <Reply className="h-3 w-3" /> Reply
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }} onClick={() => { setReplyTo({ msgId: msg.id, mode: "replyAll" }); setReplyBody(""); }}>
                      <ReplyAll className="h-3 w-3" /> Reply All
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }} onClick={() => { setReplyTo({ msgId: msg.id, mode: "forward" }); setReplyBody(""); }}>
                      <Forward className="h-3 w-3" /> Forward
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }} onClick={() => toast.info("Select files to attach (demo)")}>
                      <Paperclip className="h-3 w-3" /> Attach
                    </Button>
                  </div>

                  {/* Inline reply composer */}
                  {replyTo?.msgId === msg.id && (
                    <div className="mt-3 rounded-lg p-3 space-y-2 animate-fade-in" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 16%)" }}>
                      <div className="text-[10px] font-medium" style={{ color: "hsl(240 5% 50%)" }}>
                        {replyTo.mode === "reply" && `Reply to ${msg.from}`}
                        {replyTo.mode === "replyAll" && `Reply All (${selectedThread.participants.join(", ")})`}
                        {replyTo.mode === "forward" && "Forward"}
                      </div>
                      {replyTo.mode === "forward" && (
                        <Input placeholder="Forward to email…" className="text-xs h-8" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                      )}
                      <Textarea
                        placeholder="Write your reply…"
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        className="min-h-[80px] text-sm resize-none"
                        style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs h-7 gap-1" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent (demo)"); setReplyTo(null); setReplyBody(""); }}>
                            <Send className="h-3 w-3" /> Send
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => toast.info("Select files to attach (demo)")}>
                            <Paperclip className="h-3 w-3" /> Attach
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleAiDraft(selectedThread)}>
                            <Sparkles className="h-3 w-3" /> AI Draft
                          </Button>
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs h-7" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setReplyTo(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick reply at bottom */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }}>
          <Textarea placeholder="Reply…" value={replyBody} onChange={e => setReplyBody(e.target.value)} className="min-h-[60px] text-sm border-0 resize-none" style={{ background: "hsl(240 8% 7%)", color: "white" }} />
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" className="text-xs h-8 gap-1" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent (demo)"); setReplyBody(""); }}>
            <Send className="h-3 w-3" /> Send
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => handleAiDraft(selectedThread)}>
            <Sparkles className="h-3 w-3" style={{ color: "hsl(140 12% 58%)" }} /> Draft
          </Button>
        </div>
      </div>

      {/* AI Draft panel — with Send, Edit Draft, Regenerate */}
      {showAiDraft && (
        <div className="rounded-lg p-4 space-y-2 animate-fade-in" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.2)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
            <span className="text-xs font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Generated Draft</span>
            {aiDraftLoading && <span className="text-[10px] animate-pulse" style={{ color: "hsl(240 5% 46%)" }}>generating...</span>}
          </div>
          <pre className="text-sm whitespace-pre-wrap" style={{ color: "hsl(240 5% 80%)" }}>{aiDraft}</pre>
          {!aiDraftLoading && aiDraft && (
            <div className="flex gap-2 pt-2 flex-wrap">
              <Button size="sm" className="text-xs h-8 gap-1" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent with AI draft (demo)"); setShowAiDraft(false); setReplyBody(""); }}>
                <Send className="h-3 w-3" /> Send
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => { setReplyBody(aiDraft); setShowAiDraft(false); toast.info("Draft loaded into reply — edit and send when ready"); }}>
                <FilePenLine className="h-3 w-3" /> Edit Draft
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => handleAiDraft(selectedThread)}>
                <Sparkles className="h-3 w-3" /> Regenerate
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setShowAiDraft(false)}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Summary popup */}
      {showSummary && (
        <div className="rounded-lg p-4 space-y-3 animate-fade-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Thread Summary</span>
            </div>
            <button onClick={() => setShowSummary(false)}><X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} /></button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>1</span>
              <p className="text-xs" style={{ color: "hsl(240 5% 75%)" }}>
                <strong className="text-white">Topic:</strong> {selectedThread.subject}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>2</span>
              <p className="text-xs" style={{ color: "hsl(240 5% 75%)" }}>
                <strong className="text-white">Key Points:</strong> {selectedThread.messages.length > 1
                  ? "Discussion progressed through initial contact, agreement on details, and scheduling next steps."
                  : "Initial outreach covering main topic with request for follow-up."}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>3</span>
              <p className="text-xs" style={{ color: "hsl(240 5% 75%)" }}>
                <strong className="text-white">Action Items:</strong> Schedule a meeting, review attached documents, respond with availability.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>4</span>
              <p className="text-xs" style={{ color: "hsl(240 5% 75%)" }}>
                <strong className="text-white">Sentiment:</strong> Positive and collaborative. {selectedThread.participants.filter(p => p !== "You").join(", ")} {selectedThread.messages.length > 1 ? "is" : "appears"} engaged and ready to proceed.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { navigator.clipboard.writeText("Summary copied"); toast.success("Summary copied to clipboard"); }}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setShowSummary(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  /* ─────────── Main Render ─────────── */
  return (
    <div className="animate-fade-in">
      <div className="flex gap-0 lg:gap-4">
        {/* ── Sidebar (desktop) ── */}
        <div className="hidden lg:flex flex-col w-44 shrink-0 space-y-1 pt-1">
          <Button size="sm" className="w-full gap-1.5 text-xs mb-3 justify-start" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setShowCompose(true)}>
            <Plus className="h-3.5 w-3.5" /> Compose
          </Button>
          {FOLDERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setSelectedThreadId(null); setSelectedClient(null); }}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-colors w-full text-left ${folder === f.key ? "bg-white/10 text-white" : ""}`}
              style={folder !== f.key ? { color: "hsl(240 5% 60%)" } : {}}
            >
              <f.icon className="h-3.5 w-3.5" />
              <span className="flex-1">{f.label}</span>
              {f.count ? <span className="text-[10px] font-semibold" style={{ color: "hsl(140 12% 58%)" }}>{f.count}</span> : null}
            </button>
          ))}

          <div className="border-t pt-2 mt-2" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 40%)" }}>Labels</span>
              <button onClick={() => setShowLabelInput(v => !v)} className="hover:bg-white/5 rounded p-0.5">
                <Plus className="h-3 w-3" style={{ color: "hsl(240 5% 46%)" }} />
              </button>
            </div>
            {showLabelInput && (
              <div className="px-2 mb-1">
                <Input
                  placeholder="New label…"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newLabel.trim()) {
                      setCustomLabels(prev => [...prev, newLabel.trim().toLowerCase()]);
                      setNewLabel("");
                      setShowLabelInput(false);
                      toast.success("Label created");
                    }
                  }}
                  className="h-7 text-[10px]"
                  style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
                  autoFocus
                />
              </div>
            )}
            {customLabels.map(label => (
              <button
                key={label}
                onClick={() => { setSearchQuery(`is:${label}`); setSelectedThreadId(null); }}
                className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-md hover:bg-white/5 w-full text-left"
                style={{ color: "hsl(240 5% 56%)" }}
              >
                <Tag className="h-3 w-3" style={{ color: "hsl(140 12% 50%)" }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
              <h2 className="text-lg font-semibold text-white">Email</h2>
              <Badge className="text-[10px]" style={{ background: "hsl(140 12% 42%)", color: "white" }}>{unreadCount} new</Badge>
              <span className="text-xs hidden sm:inline" style={{ color: "hsl(240 5% 46%)" }}>Synced 3 min ago</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => setShowAccounts(true)}>
                <Link2 className="h-3 w-3" /> Inboxes
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => setShowClientLookup(true)}>
                <User className="h-3 w-3" /> Lookup
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => { setThreads(prev => prev.map(t => ({ ...t, unread: false }))); toast.success("All marked read"); }}>
                <CheckCheck className="h-3 w-3" />
              </Button>
              <Button size="sm" className="gap-1.5 text-xs lg:hidden" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setShowCompose(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {conversationView ? conversationView : (
            <>
              {/* Smart Features Bar — larger on desktop, small on mobile */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
                {SMART_FEATURES.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => handleSmartFeature(f.label)}
                    className="p-1.5 lg:p-2.5 rounded-md text-left transition-all hover:scale-[1.02] hover:bg-white/5"
                    style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}
                  >
                    <f.icon className="h-3 w-3 lg:h-4 lg:w-4 mb-0.5" style={{ color: "hsl(140 12% 58%)" }} />
                    <p className="text-[9px] lg:text-[11px] font-medium text-white leading-tight">{f.label}</p>
                    <p className="text-[8px] lg:text-[9px] leading-tight hidden lg:block" style={{ color: "hsl(240 5% 40%)" }}>{f.desc}</p>
                  </button>
                ))}
              </div>

              {/* Filters row (mobile gets folder chips) */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mobile folder chips */}
                <div className="flex lg:hidden gap-1">
                  {FOLDERS.map(f => (
                    <button key={f.key} onClick={() => { setFolder(f.key); setSelectedClient(null); }}
                      className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${folder === f.key ? "bg-white/10 text-white" : ""}`}
                      style={folder !== f.key ? { color: "hsl(240 5% 46%)" } : {}}
                    >
                      <f.icon className="h-3 w-3" /> {f.label}
                    </button>
                  ))}
                </div>
                <span className="hidden lg:inline mx-1" style={{ color: "hsl(240 6% 20%)" }}>|</span>
                {/* Account filters */}
                <button onClick={() => { setAccountFilter("all"); setSelectedClient(null); }} className={`text-xs px-2.5 py-1 rounded-md transition-colors ${accountFilter === "all" && !selectedClient ? "bg-white/10 text-white" : ""}`} style={accountFilter !== "all" || selectedClient ? { color: "hsl(240 5% 46%)" } : {}}>All</button>
                {SYNCED_ACCOUNTS.filter(a => a.synced).map(a => (
                  <button key={a.key} onClick={() => { setAccountFilter(a.key); setSelectedClient(null); }}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${accountFilter === a.key && !selectedClient ? "bg-white/10 text-white" : ""}`}
                    style={accountFilter !== a.key || selectedClient ? { color: "hsl(240 5% 46%)" } : {}}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} /> {a.key}
                  </button>
                ))}
                {selectedClient && (
                  <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => setSelectedClient(null)}>
                    {CLIENT_CONTACTS.find(c => c.email === selectedClient)?.name} <X className="h-2.5 w-2.5" />
                  </Badge>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
                <Input
                  placeholder="Search… try from:sarah  subject:renewal  is:unread  has:attachment"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm h-9"
                  style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
                />
                {searchQuery && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                    <X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
                  </button>
                )}
              </div>

              {/* Thread list */}
              <div className="space-y-0 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }} ref={listRef}>
                {filtered.length === 0 && (
                  <p className="text-center text-xs py-8" style={{ color: "hsl(240 5% 40%)" }}>No conversations found</p>
                )}
                {filtered.map((thread, idx) => {
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  const snippet = lastMsg.from === "You" ? `You: ${lastMsg.body.slice(0, 60)}` : lastMsg.body.slice(0, 60);
                  const isFocused = idx === focusedIndex && !selectedThread;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => { setSelectedThreadId(thread.id); markRead(thread.id); setFocusedIndex(idx); }}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/[0.04] ${isFocused ? "bg-white/[0.06]" : ""}`}
                      style={{
                        background: thread.unread ? "hsl(140 12% 42% / 0.05)" : undefined,
                        borderBottom: idx < filtered.length - 1 ? "1px solid hsl(240 6% 12%)" : undefined,
                      }}
                    >
                      {/* Star */}
                      <button className="shrink-0 hover:scale-110 transition-transform" onClick={(e) => toggleStar(thread.id, e)}>
                        <Star className={`h-4 w-4 ${thread.starred ? "fill-yellow-400 text-yellow-400" : ""}`} style={!thread.starred ? { color: "hsl(240 5% 30%)" } : {}} />
                      </button>
                      {/* Unread dot */}
                      <div className="w-2 shrink-0">
                        {thread.unread && <span className="block h-2 w-2 rounded-full" style={{ background: "hsl(140 12% 58%)" }} />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${thread.unread ? "font-semibold text-white" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 70%)" } : {}}>
                            {thread.participants.filter(p => p !== "You").join(", ") || "You"}
                          </span>
                          {thread.messages.length > 1 && (
                            <span className="text-[10px] shrink-0" style={{ color: "hsl(240 5% 40%)" }}>({thread.messages.length})</span>
                          )}
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SYNCED_ACCOUNTS.find(a => a.key === thread.account)?.color }} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs truncate ${thread.unread ? "text-white/80" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 56%)" } : {}}>
                            {thread.subject}
                          </span>
                        </div>
                        <p className="text-[11px] truncate" style={{ color: "hsl(240 5% 40%)" }}>{snippet}…</p>
                      </div>
                      {/* Right side */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] ${thread.unread ? "font-semibold" : ""}`} style={{ color: thread.unread ? "hsl(140 12% 58%)" : "hsl(240 5% 36%)" }}>
                          {lastMsg.date === "Today" ? lastMsg.time : lastMsg.date}
                        </span>
                        <div className="flex gap-1">
                          {thread.hasAttachment && <Paperclip className="h-3 w-3" style={{ color: "hsl(240 5% 36%)" }} />}
                          {thread.tags.slice(0, 1).map(t => (
                            <Badge key={t} variant="outline" className="text-[8px] h-4 px-1" style={{ borderColor: "hsl(140 12% 42% / 0.25)", color: "hsl(140 12% 50%)" }}>{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      {/* Synced Accounts */}
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
                  <Button size="sm" className="text-xs h-7" style={{ background: "hsl(140 12% 42%)" }} onClick={() => toast.success(`${a.label} connected!`)}>
                    <Plus className="h-3 w-3 mr-1" /> Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Lookup */}
      <Dialog open={showClientLookup} onOpenChange={setShowClientLookup}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">Client Email Lookup</DialogTitle></DialogHeader>
          <Input placeholder="Search client name or email…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
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

      {/* Compose — Gmail-like */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">New Message</DialogTitle></DialogHeader>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "hsl(240 5% 46%)" }}>
              <span>From:</span>
              <span className="text-white">you@auraconnect.com</span>
            </div>
            <Input placeholder="To" value={compTo} onChange={e => setCompTo(e.target.value)} className="text-sm h-8" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            {!showCcBcc ? (
              <button className="text-[10px] underline" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setShowCcBcc(true)}>CC / BCC</button>
            ) : (
              <>
                <Input placeholder="CC" value={compCc} onChange={e => setCompCc(e.target.value)} className="text-sm h-8" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <Input placeholder="BCC" value={compBcc} onChange={e => setCompBcc(e.target.value)} className="text-sm h-8" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
              </>
            )}
            <Input placeholder="Subject" value={compSubject} onChange={e => setCompSubject(e.target.value)} className="text-sm h-8" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <Textarea placeholder="Write your message…" value={compBody} onChange={e => setCompBody(e.target.value)} className="min-h-[140px] text-sm resize-none" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <div className="flex justify-between items-center pt-1">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1"><Paperclip className="h-3 w-3" /> Attach</Button>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => toast.success("Draft generated")}><Sparkles className="h-3 w-3" /> Draft</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(0 60% 55%)" }} onClick={() => { setShowCompose(false); toast.info("Discarded"); }}>
                  <Trash2 className="h-3 w-3" /> Discard
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowCompose(false); toast.success("Saved as draft"); }}>
                  Save Draft
                </Button>
                <Button size="sm" className="text-xs h-8 gap-1.5" style={{ background: "hsl(140 12% 42%)" }} onClick={handleSend}>
                  <Send className="h-3 w-3" /> Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
