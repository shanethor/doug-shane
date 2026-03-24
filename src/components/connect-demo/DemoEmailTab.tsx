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
  SendHorizonal, FilePenLine, Tag, ChevronDown, ChevronUp, Trash2, Copy,
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
  const fromMatch = q.match(/from:(\S+)/);
  if (fromMatch) {
    const val = fromMatch[1];
    results = results.filter(t => t.messages.some(m => m.from.toLowerCase().includes(val) || m.fromAddr.toLowerCase().includes(val)));
    q = q.replace(/from:\S+/, "").trim();
  }
  const subjectMatch = q.match(/subject:(\S+)/);
  if (subjectMatch) {
    const val = subjectMatch[1];
    results = results.filter(t => t.subject.toLowerCase().includes(val));
    q = q.replace(/subject:\S+/, "").trim();
  }
  if (q.includes("is:unread")) { results = results.filter(t => t.unread); q = q.replace("is:unread", "").trim(); }
  if (q.includes("is:starred")) { results = results.filter(t => t.starred); q = q.replace("is:starred", "").trim(); }
  if (q.includes("has:attachment")) { results = results.filter(t => t.hasAttachment); q = q.replace("has:attachment", "").trim(); }
  // Label/tag filtering: is:renewal, is:billing, etc.
  const labelMatch = q.match(/is:(\S+)/);
  if (labelMatch) {
    const tag = labelMatch[1];
    results = results.filter(t => t.tags.some(tg => tg.toLowerCase().includes(tag)));
    q = q.replace(/is:\S+/, "").trim();
  }
  if (q) {
    results = results.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.messages.some(m => m.from.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
    );
  }
  return results;
}

const DEFAULT_LABELS = ["renewal", "referral", "billing", "compliance", "quote", "auto-tagged"];

/* ─── Smart Feature Panel Content Generators ─── */
function getComplianceContent(thread: DemoThread) {
  const name = thread.participants.find(p => p !== "You") || "Contact";
  return {
    title: "Compliance Check",
    icon: Shield,
    items: [
      { label: "Regulatory Language", status: "pass" as const, detail: "No prohibited terms or misleading claims detected." },
      { label: "Disclosure Requirements", status: "pass" as const, detail: "All required disclosures are present or not applicable." },
      { label: "Privacy & PII", status: "warn" as const, detail: `Contains email address for ${name}. Ensure handling complies with data privacy policies.` },
      { label: "Licensing References", status: "pass" as const, detail: "No unlicensed advice or out-of-state solicitation detected." },
      { label: "Record Retention", status: "info" as const, detail: "This thread should be archived for 5+ years per standard compliance guidelines." },
    ],
  };
}

function getSentimentContent(thread: DemoThread) {
  const name = thread.participants.find(p => p !== "You") || "Contact";
  const msgCount = thread.messages.length;
  return {
    title: "Sentiment Analysis",
    icon: TrendingUp,
    items: [
      { label: "Overall Tone", value: "Positive (87%)", color: "hsl(140 50% 50%)" },
      { label: "Urgency Level", value: "Medium", color: "hsl(45 80% 55%)" },
      { label: "Engagement", value: msgCount > 1 ? "Active — multiple replies exchanged" : "Awaiting response", color: "hsl(140 50% 50%)" },
      { label: "Key Signals", value: `${name} uses collaborative language ("works perfectly", "let's schedule"). Indicates strong buying intent.` },
      { label: "Recommendation", value: "Strike while warm — respond within 2 hours to maintain momentum." },
    ],
  };
}

function getFollowUpContent(thread: DemoThread) {
  const name = thread.participants.find(p => p !== "You") || "Contact";
  const lastMsg = thread.messages[thread.messages.length - 1];
  return {
    title: "Follow-Up Reminder",
    icon: Zap,
    items: [
      { label: "Last Activity", value: `${lastMsg.from} on ${lastMsg.date} at ${lastMsg.time}` },
      { label: "Suggested Follow-Up", value: lastMsg.from === "You" ? "Wait 48 hours, then send a gentle check-in" : "Reply within 4 hours to keep momentum" },
      { label: "Reminder Set", value: "Tomorrow at 9:00 AM" },
      { label: "Draft Nudge", value: `"Hi ${name.split(" ")[0]}, just circling back on this — wanted to make sure we're still aligned. Let me know if you have any questions!"` },
    ],
  };
}

function getPriorityContent(thread: DemoThread) {
  const name = thread.participants.find(p => p !== "You") || "Contact";
  return {
    title: "Priority Scoring",
    icon: AlertTriangle,
    items: [
      { label: "Overall Score", value: "8.4 / 10 — High Priority", color: "hsl(45 80% 55%)" },
      { label: "Pipeline Impact", value: "Relates to an active deal in your pipeline" },
      { label: "Revenue Potential", value: "$12,000 – $18,000 estimated annual premium" },
      { label: "Time Sensitivity", value: "Renewal discussion — respond before end of week" },
      { label: "Relationship Tier", value: `${name} is a Tier 1 contact with 14 prior interactions` },
    ],
  };
}

/* ─────────── Component ─────────── */
export default function DemoEmailTab() {
  const [threads, setThreads] = useState<DemoThread[]>(THREADS);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [showAccounts, setShowAccounts] = useState(false);
  const [smartBannerDismissed, setSmartBannerDismissed] = useState(false);
  const [showClientLookup, setShowClientLookup] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [aiDraftForMsg, setAiDraftForMsg] = useState<string | null>(null); // which message ID the draft is for
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set());
  const [customLabels, setCustomLabels] = useState<string[]>(DEFAULT_LABELS);
  const [newLabel, setNewLabel] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Inline reply state
  const [replyTo, setReplyTo] = useState<{ msgId: string; mode: "reply" | "replyAll" | "forward" } | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // Smart feature panel state
  const [activeFeaturePanel, setActiveFeaturePanel] = useState<string | null>(null);

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
    if (folder === "drafts") return false;
    return true;
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

  const handleAiDraft = useCallback((thread: DemoThread, forMsgId?: string) => {
    setShowAiDraft(true);
    setAiDraftLoading(true);
    setAiDraft("");
    setAiDraftForMsg(forMsgId || null);
    const targetMsg = forMsgId ? thread.messages.find(m => m.id === forMsgId) : thread.messages[thread.messages.length - 1];
    const lastMsg = targetMsg || thread.messages[thread.messages.length - 1];
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
    if (label === "Smart Reply") {
      const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];
      setReplyTo({ msgId: lastMsg.id, mode: "reply" });
      setReplyBody("");
      handleAiDraft(selectedThread, lastMsg.id);
      return;
    }
    // Toggle panel — if same feature is open, close it
    if (activeFeaturePanel === label) {
      setActiveFeaturePanel(null);
    } else {
      setActiveFeaturePanel(label);
    }
  }, [selectedThread, handleAiDraft, activeFeaturePanel]);

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

  /* ─── Smart Feature Panel Renderer ─── */
  const renderFeaturePanel = () => {
    if (!activeFeaturePanel || !selectedThread) return null;

    if (activeFeaturePanel === "Auto-Summarize") {
      return (
        <div className="rounded-lg p-4 space-y-3 animate-fade-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Thread Summary</span>
            </div>
            <button onClick={() => setActiveFeaturePanel(null)}><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>
          </div>
          <div className="space-y-2.5">
            {[
              { n: 1, label: "Topic", value: selectedThread.subject },
              { n: 2, label: "Key Points", value: selectedThread.messages.length > 1 ? "Discussion progressed through initial contact, agreement on details, and scheduling next steps." : "Initial outreach covering main topic with request for follow-up." },
              { n: 3, label: "Action Items", value: "Schedule a meeting, review attached documents, respond with availability." },
              { n: 4, label: "Sentiment", value: `Positive and collaborative. ${selectedThread.participants.filter(p => p !== "You").join(", ")} ${selectedThread.messages.length > 1 ? "is" : "appears"} engaged and ready to proceed.` },
            ].map(item => (
              <div key={item.n} className="flex items-start gap-2.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{item.n}</span>
                <p className="text-sm" style={{ color: "hsl(240 5% 75%)" }}>
                  <strong className="text-white">{item.label}:</strong> {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => { navigator.clipboard.writeText("Summary copied"); toast.success("Summary copied to clipboard"); }}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setActiveFeaturePanel(null)}>
              Close
            </Button>
          </div>
        </div>
      );
    }

    if (activeFeaturePanel === "Compliance Check") {
      const data = getComplianceContent(selectedThread);
      const statusColors = { pass: "hsl(140 50% 50%)", warn: "hsl(45 80% 55%)", info: "hsl(200 60% 55%)" };
      const statusLabels = { pass: "✓ Pass", warn: "⚠ Warning", info: "ℹ Info" };
      return (
        <div className="rounded-lg p-4 space-y-3 animate-fade-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Compliance Check</span>
              <Badge className="text-[10px]" style={{ background: "hsl(140 50% 25%)", color: "hsl(140 50% 80%)" }}>4/5 Pass</Badge>
            </div>
            <button onClick={() => setActiveFeaturePanel(null)}><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>
          </div>
          <div className="space-y-2">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2 rounded-md" style={{ background: "hsl(240 6% 7%)" }}>
                <span className="text-xs font-semibold px-2 py-0.5 rounded shrink-0 mt-0.5" style={{ color: statusColors[item.status], background: `${statusColors[item.status]}15` }}>
                  {statusLabels[item.status]}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 60%)" }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => { toast.success("Full compliance report exported"); }}>
              <Copy className="h-3 w-3" /> Export Report
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setActiveFeaturePanel(null)}>Close</Button>
          </div>
        </div>
      );
    }

    if (activeFeaturePanel === "Sentiment Analysis") {
      const data = getSentimentContent(selectedThread);
      return (
        <div className="rounded-lg p-4 space-y-3 animate-fade-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Sentiment Analysis</span>
            </div>
            <button onClick={() => setActiveFeaturePanel(null)}><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>
          </div>
          <div className="space-y-2">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: item.color || "hsl(240 5% 65%)" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="ghost" className="text-xs h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setActiveFeaturePanel(null)}>Close</Button>
          </div>
        </div>
      );
    }

    if (activeFeaturePanel === "Follow-Up Reminder") {
      const data = getFollowUpContent(selectedThread);
      return (
        <div className="rounded-lg p-4 space-y-3 animate-fade-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Follow-Up Reminder</span>
              <Badge className="text-[10px]" style={{ background: "hsl(140 50% 25%)", color: "hsl(140 50% 80%)" }}>Set ✓</Badge>
            </div>
            <button onClick={() => setActiveFeaturePanel(null)}><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>
          </div>
          <div className="space-y-2">
            {data.items.map((item, i) => (
              <div key={i} className="p-2.5 rounded-md" style={{ background: "hsl(240 6% 7%)" }}>
                <p className="text-xs font-medium text-white">{item.label}</p>
                <p className="text-sm mt-1" style={{ color: "hsl(240 5% 65%)" }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => toast.success("Reminder time updated")}>
              <Clock className="h-3 w-3" /> Change Time
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setActiveFeaturePanel(null)}>Close</Button>
          </div>
        </div>
      );
    }

    if (activeFeaturePanel === "Priority Scoring") {
      const data = getPriorityContent(selectedThread);
      return (
        <div className="rounded-lg p-4 space-y-3 animate-fade-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: "hsl(45 80% 55%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Priority Scoring</span>
            </div>
            <button onClick={() => setActiveFeaturePanel(null)}><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>
          </div>
          {/* Score bar */}
          <div className="p-3 rounded-md" style={{ background: "hsl(240 6% 7%)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">8.4 / 10</span>
              <Badge className="text-xs" style={{ background: "hsl(45 80% 25%)", color: "hsl(45 80% 75%)" }}>High Priority</Badge>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(240 6% 14%)" }}>
              <div className="h-full rounded-full" style={{ width: "84%", background: "linear-gradient(90deg, hsl(140 50% 45%), hsl(45 80% 55%))" }} />
            </div>
          </div>
          <div className="space-y-2">
            {data.items.slice(1).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "hsl(45 80% 55% / 0.15)", color: "hsl(45 80% 55%)" }}>{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 65%)" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <Button size="sm" variant="ghost" className="text-xs h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setActiveFeaturePanel(null)}>Close</Button>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ─────────── Conversation View ─────────── */
  const conversationView = selectedThread ? (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm" onClick={() => { setSelectedThreadId(null); setShowAiDraft(false); setActiveFeaturePanel(null); }}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => toggleStar(selectedThread.id, e)}>
            <Star className={`h-4 w-4 ${selectedThread.starred ? "fill-yellow-400 text-yellow-400" : ""}`} style={!selectedThread.starred ? { color: "hsl(240 5% 46%)" } : {}} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.success("Thread archived")}>
            <Trash2 className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />
          </Button>
        </div>
      </div>

      {/* Subject + tags */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-white leading-tight">{selectedThread.subject}</h2>
        <div className="flex gap-1 shrink-0">
          {selectedThread.tags.map(t => (
            <Badge key={t} variant="outline" className="text-xs" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }}>{t}</Badge>
          ))}
        </div>
      </div>

      {/* Participants chips */}
      <div className="flex gap-1.5 flex-wrap">
        {selectedThread.participants.map(p => (
          <span key={p} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "hsl(240 8% 14%)", color: "hsl(240 5% 70%)" }}>{p}</span>
        ))}
        <span className="text-xs px-1" style={{ color: "hsl(240 5% 40%)" }}>{selectedThread.messages.length} message{selectedThread.messages.length > 1 ? "s" : ""}</span>
      </div>

      {/* Smart Features Bar — larger on desktop */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
        {SMART_FEATURES.map((f, i) => (
          <button
            key={i}
            onClick={() => handleSmartFeature(f.label)}
            className={`p-1.5 lg:p-3 rounded-md text-left transition-all hover:scale-[1.02] hover:bg-white/5 ${activeFeaturePanel === f.label ? "ring-1" : ""}`}
            style={{
              background: activeFeaturePanel === f.label ? "hsl(140 12% 42% / 0.1)" : "hsl(240 8% 9%)",
              border: `1px solid ${activeFeaturePanel === f.label ? "hsl(140 12% 42% / 0.5)" : "hsl(140 12% 42% / 0.25)"}`,
            }}
          >
            <f.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4 mb-0.5" style={{ color: "hsl(140 12% 58%)" }} />
            <p className="text-[10px] lg:text-xs font-medium text-white leading-tight">{f.label}</p>
          </button>
        ))}
      </div>

      {/* Smart Feature Panel — renders inline */}
      {renderFeaturePanel()}

      {/* Insight bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.15)" }}>
        <Sparkles className="h-4 w-4 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
        <span className="text-sm" style={{ color: "hsl(140 12% 58%)" }}>
          Insight: This thread relates to an active pipeline deal. Priority: <strong>High</strong>. Sentiment: <strong>Positive</strong>.
        </span>
      </div>

      {/* Messages — conversation stacked */}
      <div className="space-y-2">
        {selectedThread.messages.map((msg, idx) => {
          const isOld = idx < selectedThread.messages.length - 1;
          const isCollapsed = isOld && collapsedMessages.has(msg.id);
          const shouldAutoCollapse = selectedThread.messages.length > 2 && idx < selectedThread.messages.length - 2;
          const collapsed = shouldAutoCollapse ? !collapsedMessages.has(msg.id) : isCollapsed;
          const isAiDraftTarget = aiDraftForMsg === msg.id || (!aiDraftForMsg && idx === selectedThread.messages.length - 1);
          
          return (
            <div key={msg.id}>
              <Card className="overflow-hidden" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{ background: msg.from === "You" ? "hsl(140 12% 42%)" : "hsl(262 83% 45%)" }}
                    >
                      {msg.from === "You" ? "Y" : msg.from.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-white">{msg.from}</span>
                      {collapsed && (
                        <span className="text-xs ml-2 truncate" style={{ color: "hsl(240 5% 46%)" }}>
                          — {msg.body.slice(0, 80)}…
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs" style={{ color: "hsl(240 5% 40%)" }}>{msg.date === "Today" ? msg.time : msg.date}</span>
                    {isOld && (collapsed ? <ChevronDown className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} /> : <ChevronUp className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />)}
                  </div>
                </div>
                {!collapsed && (
                  <div className="px-3 pb-3">
                    <div className="text-xs mb-2" style={{ color: "hsl(240 5% 45%)" }}>
                      To: {msg.to} &lt;{msg.toAddr}&gt;
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 78%)" }}>
                      {msg.body}
                    </div>
                    <div className="flex gap-2 mt-3 pt-2 border-t flex-wrap" style={{ borderColor: "hsl(240 6% 14%)" }}>
                      <Button size="sm" variant="ghost" className="text-sm h-8 gap-1.5" style={{ color: "hsl(240 5% 70%)" }} onClick={() => { setReplyTo({ msgId: msg.id, mode: "reply" }); setReplyBody(""); }}>
                        <Reply className="h-3.5 w-3.5" /> Reply
                      </Button>
                      <Button size="sm" variant="ghost" className="text-sm h-8 gap-1.5" style={{ color: "hsl(240 5% 70%)" }} onClick={() => { setReplyTo({ msgId: msg.id, mode: "replyAll" }); setReplyBody(""); }}>
                        <ReplyAll className="h-3.5 w-3.5" /> Reply All
                      </Button>
                      <Button size="sm" variant="ghost" className="text-sm h-8 gap-1.5" style={{ color: "hsl(240 5% 70%)" }} onClick={() => { setReplyTo({ msgId: msg.id, mode: "forward" }); setReplyBody(""); }}>
                        <Forward className="h-3.5 w-3.5" /> Forward
                      </Button>
                      <Button size="sm" variant="ghost" className="text-sm h-8 gap-1.5" style={{ color: "hsl(140 12% 58%)" }} onClick={() => toast.info("Select files to attach (demo)")}>
                        <Paperclip className="h-3.5 w-3.5" /> Attach
                      </Button>
                    </div>

                    {/* Inline reply composer */}
                    {replyTo?.msgId === msg.id && (
                      <div className="mt-3 rounded-lg p-3 space-y-2 animate-fade-in" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 16%)" }}>
                        <div className="text-xs font-medium" style={{ color: "hsl(240 5% 55%)" }}>
                          {replyTo.mode === "reply" && `Reply to ${msg.from}`}
                          {replyTo.mode === "replyAll" && `Reply All (${selectedThread.participants.join(", ")})`}
                          {replyTo.mode === "forward" && "Forward"}
                        </div>
                        {replyTo.mode === "forward" && (
                          <Input placeholder="Forward to email…" className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                        )}
                        <Textarea
                          placeholder="Write your reply…"
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          className="min-h-[80px] text-sm resize-none"
                          style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
                          autoFocus
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex gap-2">
                            <Button size="sm" className="text-sm h-8 gap-1.5" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent (demo)"); setReplyTo(null); setReplyBody(""); }}>
                              <Send className="h-3.5 w-3.5" /> Send
                            </Button>
                            <Button size="sm" variant="outline" className="text-sm h-8 gap-1.5" onClick={() => toast.info("Select files to attach (demo)")}>
                              <Paperclip className="h-3.5 w-3.5" /> Attach
                            </Button>
                            <Button size="sm" variant="outline" className="text-sm h-8 gap-1.5" onClick={() => handleAiDraft(selectedThread, msg.id)}>
                              <Sparkles className="h-3.5 w-3.5" /> AI Draft
                            </Button>
                          </div>
                          <Button size="sm" variant="ghost" className="text-sm h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setReplyTo(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* AI Draft panel — appears inline below the message it's for */}
                    {showAiDraft && isAiDraftTarget && (
                      <div className="mt-3 rounded-lg p-4 space-y-2 animate-fade-in" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.2)" }}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
                          <span className="text-sm font-semibold" style={{ color: "hsl(140 12% 58%)" }}>Generated Draft</span>
                          {aiDraftLoading && <span className="text-xs animate-pulse" style={{ color: "hsl(240 5% 46%)" }}>generating...</span>}
                        </div>
                        <pre className="text-sm whitespace-pre-wrap" style={{ color: "hsl(240 5% 80%)" }}>{aiDraft}</pre>
                        {!aiDraftLoading && aiDraft && (
                          <div className="flex gap-2 pt-2 flex-wrap">
                            <Button size="sm" className="text-sm h-8 gap-1.5" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent with AI draft (demo)"); setShowAiDraft(false); setReplyBody(""); }}>
                              <Send className="h-3.5 w-3.5" /> Send
                            </Button>
                            <Button size="sm" variant="outline" className="text-sm h-8 gap-1.5" onClick={() => { setReplyBody(aiDraft); setShowAiDraft(false); toast.info("Draft loaded into reply — edit and send when ready"); }}>
                              <FilePenLine className="h-3.5 w-3.5" /> Edit Draft
                            </Button>
                            <Button size="sm" variant="outline" className="text-sm h-8 gap-1.5" onClick={() => handleAiDraft(selectedThread, msg.id)}>
                              <Sparkles className="h-3.5 w-3.5" /> Regenerate
                            </Button>
                            <Button size="sm" variant="ghost" className="text-sm h-8" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setShowAiDraft(false)}>
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Quick reply at bottom */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }}>
          <Textarea placeholder="Reply…" value={replyBody} onChange={e => setReplyBody(e.target.value)} className="min-h-[60px] text-sm border-0 resize-none" style={{ background: "hsl(240 8% 7%)", color: "white" }} />
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" className="text-sm h-9 gap-1.5" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent (demo)"); setReplyBody(""); }}>
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
          <Button size="sm" variant="ghost" className="text-sm h-8 gap-1.5" onClick={() => handleAiDraft(selectedThread)}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} /> Draft
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  /* ─────────── Main Render ─────────── */
  return (
    <div className="space-y-0">
      <style>{`
        .email-stagger > * { opacity: 0; animation: emailFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .email-stagger > *:nth-child(1) { animation-delay: 0.05s; }
        .email-stagger > *:nth-child(2) { animation-delay: 0.15s; }
        .email-stagger > *:nth-child(3) { animation-delay: 0.25s; }
        .email-stagger > *:nth-child(4) { animation-delay: 0.35s; }
        .email-stagger > *:nth-child(5) { animation-delay: 0.45s; }
        @keyframes emailFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div className="email-stagger">
      <div className="flex gap-0 lg:gap-4">
        {/* ── Sidebar (desktop) ── */}
        <div className="hidden lg:flex flex-col w-48 shrink-0 space-y-1 pt-1">
          <Button size="sm" className="w-full gap-1.5 text-sm mb-3 justify-start" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setShowCompose(true)}>
            <Plus className="h-4 w-4" /> Compose
          </Button>
          {FOLDERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setSelectedThreadId(null); setSelectedClient(null); setSearchQuery(""); }}
              className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-md transition-colors w-full text-left ${folder === f.key ? "bg-white/10 text-white" : ""}`}
              style={folder !== f.key ? { color: "hsl(240 5% 60%)" } : {}}
            >
              <f.icon className="h-4 w-4" />
              <span className="flex-1">{f.label}</span>
              {f.count ? <span className="text-xs font-semibold" style={{ color: "hsl(140 12% 58%)" }}>{f.count}</span> : null}
            </button>
          ))}

          <div className="border-t pt-2 mt-2" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 40%)" }}>Labels</span>
              <button onClick={() => setShowLabelInput(v => !v)} className="hover:bg-white/5 rounded p-0.5">
                <Plus className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
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
                  className="h-8 text-xs"
                  style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
                  autoFocus
                />
              </div>
            )}
            {customLabels.map(label => {
              const isActive = searchQuery === `is:${label}`;
              return (
                <button
                  key={label}
                  onClick={() => {
                    if (isActive) { setSearchQuery(""); } else { setSearchQuery(`is:${label}`); }
                    setSelectedThreadId(null); setFolder("inbox");
                  }}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-white/5 w-full text-left transition-colors ${isActive ? "bg-white/10 text-white" : ""}`}
                  style={!isActive ? { color: "hsl(240 5% 56%)" } : {}}
                >
                  <Tag className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 50%)" }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
              <h2 className="text-lg font-semibold text-white">Email</h2>
              <Badge className="text-xs" style={{ background: "hsl(140 12% 42%)", color: "white" }}>{unreadCount} new</Badge>
              <span className="text-sm hidden sm:inline" style={{ color: "hsl(240 5% 46%)" }}>Synced 3 min ago</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 text-sm" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => setShowAccounts(true)}>
                <Link2 className="h-3.5 w-3.5" /> Inboxes
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-sm" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => setShowClientLookup(true)}>
                <User className="h-3.5 w-3.5" /> Lookup
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-sm" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => { setThreads(prev => prev.map(t => ({ ...t, unread: false }))); toast.success("All marked read"); }}>
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="gap-1.5 text-sm lg:hidden" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setShowCompose(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {conversationView ? conversationView : (
            <>
               {/* Smart Features Banner + Bar */}
               {!smartBannerDismissed && (
                 <div className="relative p-3 rounded-lg animate-fade-in" style={{ background: "linear-gradient(135deg, hsl(140 12% 42% / 0.12), hsl(140 20% 30% / 0.08))", border: "1px solid hsl(140 12% 42% / 0.3)" }}>
                   <button onClick={() => setSmartBannerDismissed(true)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                     <X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 50%)" }} />
                   </button>
                   <div className="flex items-center gap-2 mb-2">
                     <Sparkles className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
                     <p className="text-sm font-medium text-white">Use some of our Smart Email Features to better Connect with Clients.</p>
                   </div>
                   <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
                     {SMART_FEATURES.map((f, i) => (
                       <button
                         key={i}
                         onClick={() => handleSmartFeature(f.label)}
                         className="p-1.5 lg:p-3 rounded-md text-left transition-all hover:scale-[1.02] hover:bg-white/5"
                         style={{ background: "hsl(240 8% 9% / 0.6)", border: "1px solid hsl(240 6% 14%)" }}
                       >
                         <f.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4 mb-0.5" style={{ color: "hsl(140 12% 58%)" }} />
                         <p className="text-[10px] lg:text-xs font-medium text-white leading-tight">{f.label}</p>
                         <p className="text-[9px] lg:text-[11px] leading-tight hidden lg:block" style={{ color: "hsl(240 5% 40%)" }}>{f.desc}</p>
                       </button>
                     ))}
                   </div>
                 </div>
               )}

              {/* Filters row */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex lg:hidden gap-1">
                  {FOLDERS.map(f => (
                    <button key={f.key} onClick={() => { setFolder(f.key); setSelectedClient(null); }}
                      className={`text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors ${folder === f.key ? "bg-white/10 text-white" : ""}`}
                      style={folder !== f.key ? { color: "hsl(240 5% 46%)" } : {}}
                    >
                      <f.icon className="h-3.5 w-3.5" /> {f.label}
                    </button>
                  ))}
                </div>
                <span className="hidden lg:inline mx-1" style={{ color: "hsl(240 6% 20%)" }}>|</span>
                <button onClick={() => { setAccountFilter("all"); setSelectedClient(null); }} className={`text-sm px-2.5 py-1 rounded-md transition-colors ${accountFilter === "all" && !selectedClient ? "bg-white/10 text-white" : ""}`} style={accountFilter !== "all" || selectedClient ? { color: "hsl(240 5% 46%)" } : {}}>All</button>
                {SYNCED_ACCOUNTS.filter(a => a.synced).map(a => (
                  <button key={a.key} onClick={() => { setAccountFilter(a.key); setSelectedClient(null); }}
                    className={`text-sm px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${accountFilter === a.key && !selectedClient ? "bg-white/10 text-white" : ""}`}
                    style={accountFilter !== a.key || selectedClient ? { color: "hsl(240 5% 46%)" } : {}}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} /> {a.key}
                  </button>
                ))}
                {selectedClient && (
                  <Badge variant="outline" className="text-xs gap-1 cursor-pointer" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => setSelectedClient(null)}>
                    {CLIENT_CONTACTS.find(c => c.email === selectedClient)?.name} <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />
                <Input
                  placeholder="Search… try from:sarah  subject:renewal  is:unread  has:attachment"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm h-10"
                  style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
                />
                {searchQuery && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                    <X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />
                  </button>
                )}
              </div>

              {/* Thread list */}
              <div className="space-y-0 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }} ref={listRef}>
                {filtered.length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: "hsl(240 5% 40%)" }}>No conversations found</p>
                )}
                {filtered.map((thread, idx) => {
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  const snippet = lastMsg.from === "You" ? `You: ${lastMsg.body.slice(0, 60)}` : lastMsg.body.slice(0, 60);
                  const isFocused = idx === focusedIndex && !selectedThread;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => { setSelectedThreadId(thread.id); markRead(thread.id); setFocusedIndex(idx); }}
                      className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-colors hover:bg-white/[0.04] ${isFocused ? "bg-white/[0.06]" : ""}`}
                      style={{
                        background: thread.unread ? "hsl(140 12% 42% / 0.05)" : undefined,
                        borderBottom: idx < filtered.length - 1 ? "1px solid hsl(240 6% 12%)" : undefined,
                      }}
                    >
                      <button className="shrink-0 hover:scale-110 transition-transform" onClick={(e) => toggleStar(thread.id, e)}>
                        <Star className={`h-4 w-4 ${thread.starred ? "fill-yellow-400 text-yellow-400" : ""}`} style={!thread.starred ? { color: "hsl(240 5% 30%)" } : {}} />
                      </button>
                      <div className="w-2 shrink-0">
                        {thread.unread && <span className="block h-2 w-2 rounded-full" style={{ background: "hsl(140 12% 58%)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${thread.unread ? "font-semibold text-white" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 70%)" } : {}}>
                            {thread.participants.filter(p => p !== "You").join(", ") || "You"}
                          </span>
                          {thread.messages.length > 1 && (
                            <span className="text-xs shrink-0" style={{ color: "hsl(240 5% 40%)" }}>({thread.messages.length})</span>
                          )}
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SYNCED_ACCOUNTS.find(a => a.key === thread.account)?.color }} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm truncate ${thread.unread ? "text-white/80" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 56%)" } : {}}>
                            {thread.subject}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: "hsl(240 5% 40%)" }}>{snippet}…</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs ${thread.unread ? "font-semibold" : ""}`} style={{ color: thread.unread ? "hsl(140 12% 58%)" : "hsl(240 5% 40%)" }}>
                          {lastMsg.date === "Today" ? lastMsg.time : lastMsg.date}
                        </span>
                        <div className="flex gap-1">
                          {thread.hasAttachment && <Paperclip className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 36%)" }} />}
                          {thread.tags.slice(0, 1).map(t => (
                            <Badge key={t} variant="outline" className="text-[9px] h-4 px-1.5" style={{ borderColor: "hsl(140 12% 42% / 0.25)", color: "hsl(140 12% 50%)" }}>{t}</Badge>
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
                  <Badge className="text-xs" style={{ background: "hsl(142 71% 25%)", color: "white" }}>Synced</Badge>
                ) : (
                  <Button size="sm" className="text-sm h-8" style={{ background: "hsl(140 12% 42%)" }} onClick={() => toast.success(`${a.label} connected!`)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClientLookup} onOpenChange={setShowClientLookup}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">Client Email Lookup</DialogTitle></DialogHeader>
          <Input placeholder="Search client name or email…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredClients.map(c => (
              <button key={c.email} className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between" onClick={() => { setSelectedClient(c.email); setShowClientLookup(false); setClientSearch(""); }}>
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>{c.email}</p>
                </div>
                <Badge variant="outline" className="text-xs" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 60%)" }}>{c.emailCount} emails</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">New Message</DialogTitle></DialogHeader>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 46%)" }}>
              <span>From:</span>
              <span className="text-white">you@auraconnect.com</span>
            </div>
            <Input placeholder="To" value={compTo} onChange={e => setCompTo(e.target.value)} className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            {!showCcBcc ? (
              <button className="text-xs underline" style={{ color: "hsl(240 5% 46%)" }} onClick={() => setShowCcBcc(true)}>CC / BCC</button>
            ) : (
              <>
                <Input placeholder="CC" value={compCc} onChange={e => setCompCc(e.target.value)} className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <Input placeholder="BCC" value={compBcc} onChange={e => setCompBcc(e.target.value)} className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
              </>
            )}
            <Input placeholder="Subject" value={compSubject} onChange={e => setCompSubject(e.target.value)} className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <Textarea placeholder="Write your message…" value={compBody} onChange={e => setCompBody(e.target.value)} className="min-h-[140px] text-sm resize-none" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <div className="flex justify-between items-center pt-1">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-sm h-8 gap-1"><Paperclip className="h-3.5 w-3.5" /> Attach</Button>
                <Button size="sm" variant="outline" className="text-sm h-8 gap-1" onClick={() => toast.success("Draft generated")}><Sparkles className="h-3.5 w-3.5" /> Draft</Button>
                <Button size="sm" variant="ghost" className="text-sm h-8 gap-1" style={{ color: "hsl(0 60% 55%)" }} onClick={() => { setShowCompose(false); toast.info("Discarded"); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Discard
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => { setShowCompose(false); toast.success("Saved as draft"); }}>
                  Save Draft
                </Button>
                <Button size="sm" className="text-sm h-9 gap-1.5" style={{ background: "hsl(140 12% 42%)" }} onClick={handleSend}>
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
