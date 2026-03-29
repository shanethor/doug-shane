import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/auth-fetch";

/* ─────────── Types ─────────── */
export interface DemoMessage {
  id: string; from: string; fromAddr: string; to: string; toAddr: string;
  body: string; time: string; date: string;
}
export interface DemoThread {
  id: string; subject: string; participants: string[]; messages: DemoMessage[];
  unread: boolean; starred: boolean; tags: string[]; account: string;
  hasAttachment?: boolean;
  sourceEmailId?: string;
  needsHydration?: boolean;
}

export type Folder = "inbox" | "sent" | "starred" | "drafts";

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

export const SYNCED_ACCOUNTS = [
  { label: "Work — you@auraconnect.com", key: "work", color: "hsl(140 12% 58%)", synced: true },
  { label: "Personal — yourname@gmail.com", key: "personal", color: "hsl(262 83% 58%)", synced: true },
  { label: "Agency — team@agencymail.com", key: "agency", color: "hsl(45 93% 47%)", synced: false },
];

export const CLIENT_CONTACTS = [
  { name: "Sarah Mitchell", email: "sarah@greenvalley.com", emailCount: 14 },
  { name: "Marcus Chen", email: "marcus@techventures.io", emailCount: 9 },
  { name: "Jessica Torres", email: "jess@blueridgecap.com", emailCount: 6 },
  { name: "David Kowalski", email: "david.k@primeadvisors.net", emailCount: 11 },
  { name: "Linda Park", email: "linda@sunriseproperties.com", emailCount: 8 },
  { name: "James Whitfield", email: "james@alpinegroup.com", emailCount: 5 },
];

export interface ConnectMatch {
  name: string; email: string; company: string; tier: string;
  mutualConnections: number; proximity: number;
  pipelineStage?: string; pipelineDeal?: string; dealValue?: number;
  outreachStatus?: "active" | "overdue" | "scheduled" | "none";
  lastTouch?: string; nextTouch?: string;
  phone?: string; location?: string;
}

export const CONNECT_MATCHES: Record<string, ConnectMatch> = {
  "sarah@greenvalley.com": { name: "Sarah Mitchell", email: "sarah@greenvalley.com", company: "Green Valley Partners", tier: "S", mutualConnections: 12, proximity: 94, pipelineStage: "Proposal", pipelineDeal: "Green Valley — Commercial Package", dealValue: 24000, outreachStatus: "active", lastTouch: "2 days ago", nextTouch: "Tomorrow", phone: "(512) 555-0184", location: "Austin, TX" },
  "marcus@techventures.io": { name: "Marcus Chen", email: "marcus@techventures.io", company: "Tech Ventures", tier: "A", mutualConnections: 8, proximity: 82, pipelineStage: "Discovery", pipelineDeal: "Tech Ventures — Cyber Liability", dealValue: 18000, outreachStatus: "scheduled", lastTouch: "5 days ago", nextTouch: "Thursday", phone: "(415) 555-0291", location: "San Francisco, CA" },
  "jess@blueridgecap.com": { name: "Jessica Torres", email: "jess@blueridgecap.com", company: "Blue Ridge Capital", tier: "B", mutualConnections: 4, proximity: 67, outreachStatus: "overdue", lastTouch: "3 weeks ago", nextTouch: "Overdue", phone: "(704) 555-0137", location: "Charlotte, NC" },
  "david.k@primeadvisors.net": { name: "David Kowalski", email: "david.k@primeadvisors.net", company: "Prime Advisors", tier: "S", mutualConnections: 15, proximity: 91, pipelineStage: "Negotiation", pipelineDeal: "Prime Advisors — Group Benefits", dealValue: 45000, outreachStatus: "active", lastTouch: "Yesterday", nextTouch: "Friday", phone: "(312) 555-0266", location: "Chicago, IL" },
  "linda@sunriseproperties.com": { name: "Linda Park", email: "linda@sunriseproperties.com", company: "Sunrise Properties", tier: "A", mutualConnections: 6, proximity: 75, pipelineStage: "Quoting", pipelineDeal: "Sunrise Properties — Commercial Auto", dealValue: 12000, outreachStatus: "none", lastTouch: "1 week ago", phone: "(602) 555-0198", location: "Phoenix, AZ" },
  "james@alpinegroup.com": { name: "James Whitfield", email: "james@alpinegroup.com", company: "Alpine Group", tier: "B", mutualConnections: 3, proximity: 58, outreachStatus: "scheduled", lastTouch: "10 days ago", nextTouch: "Next Monday", location: "Denver, CO" },
  "tom.b@westfieldmfg.com": { name: "Tom Bradley", email: "tom.b@westfieldmfg.com", company: "Westfield Manufacturing", tier: "C", mutualConnections: 2, proximity: 42, outreachStatus: "none", lastTouch: "1 month ago", location: "Detroit, MI" },
};

export const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  S: { bg: "hsl(45 80% 25%)", text: "hsl(45 80% 75%)" },
  A: { bg: "hsl(140 40% 22%)", text: "hsl(140 50% 70%)" },
  B: { bg: "hsl(200 40% 22%)", text: "hsl(200 50% 70%)" },
  C: { bg: "hsl(240 10% 22%)", text: "hsl(240 10% 65%)" },
};

export const OUTREACH_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "hsl(140 50% 20%)", text: "hsl(140 50% 70%)", label: "Active" },
  overdue: { bg: "hsl(0 50% 22%)", text: "hsl(0 50% 70%)", label: "Overdue" },
  scheduled: { bg: "hsl(200 50% 22%)", text: "hsl(200 50% 70%)", label: "Scheduled" },
  none: { bg: "hsl(240 8% 18%)", text: "hsl(240 5% 55%)", label: "No Cadence" },
};

export const DEFAULT_LABELS = ["renewal", "referral", "billing", "compliance", "quote", "auto-tagged"];

export const SMART_FEATURES = [
  { label: "Smart Reply", desc: "Generate contextual replies" },
  { label: "Auto-Summarize", desc: "Condense long threads" },
  { label: "Compliance Check", desc: "Flag compliance issues" },
  { label: "Sentiment Analysis", desc: "Gauge client tone" },
  { label: "Follow-Up Reminder", desc: "Auto-set reminders" },
  { label: "Add to Pipeline", desc: "Track as a deal" },
];

/* ─── Search parser ─── */
function parseSearch(raw: string, threads: DemoThread[]): DemoThread[] {
  let q = raw.trim().toLowerCase();
  let results = threads;
  const fromMatch = q.match(/from:(\S+)/);
  if (fromMatch) { results = results.filter(t => t.messages.some(m => m.from.toLowerCase().includes(fromMatch[1]) || m.fromAddr.toLowerCase().includes(fromMatch[1]))); q = q.replace(/from:\S+/, "").trim(); }
  const subjectMatch = q.match(/subject:(\S+)/);
  if (subjectMatch) { results = results.filter(t => t.subject.toLowerCase().includes(subjectMatch[1])); q = q.replace(/subject:\S+/, "").trim(); }
  if (q.includes("is:unread")) { results = results.filter(t => t.unread); q = q.replace("is:unread", "").trim(); }
  if (q.includes("is:starred")) { results = results.filter(t => t.starred); q = q.replace("is:starred", "").trim(); }
  if (q.includes("has:attachment")) { results = results.filter(t => t.hasAttachment); q = q.replace("has:attachment", "").trim(); }
  const labelMatch = q.match(/is:(\S+)/);
  if (labelMatch) { results = results.filter(t => t.tags.some(tg => tg.toLowerCase().includes(labelMatch[1]))); q = q.replace(/is:\S+/, "").trim(); }
  if (q) { results = results.filter(t => t.subject.toLowerCase().includes(q) || t.messages.some(m => m.from.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))); }
  return results;
}

export type EmailLayout = "gmail" | "outlook" | "aura";

export function getEmailLayout(): EmailLayout {
  return (sessionStorage.getItem("connect-demo-email-layout") as EmailLayout) || "aura";
}
export function setEmailLayout(layout: EmailLayout) {
  sessionStorage.setItem("connect-demo-email-layout", layout);
}

/* ─── Map synced emails to threads ─── */
function mapSyncedToThreads(syncedEmails: any[]): DemoThread[] {
  return syncedEmails.map((email, i) => ({
    id: email.id || `synced-${i}`,
    subject: email.subject || "(no subject)",
    participants: [email.from_address || "Unknown"],
    unread: !email.is_read,
    starred: false,
    tags: [],
    account: "work",
    hasAttachment: !!email.has_attachments,
    sourceEmailId: email.id || undefined,
    needsHydration: !email.body_html,
    messages: [{
      id: `msg-${email.id || i}`,
      from: email.from_name || email.from_address || "Unknown",
      fromAddr: email.from_address || "",
      to: "You",
      toAddr: email.to_addresses?.[0] || "",
      body: email.body_html || email.body_preview || "",
      time: email.received_at ? new Date(email.received_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "",
      date: email.received_at ? (isToday(email.received_at) ? "Today" : new Date(email.received_at).toLocaleDateString()) : "",
    }],
  }));
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/* ─── Shared Email Hook ─── */
export function useEmailEngine(realEmails?: any[]) {
  const initialThreads = realEmails && realEmails.length > 0 ? mapSyncedToThreads(realEmails) : THREADS;
  const [threads, setThreads] = useState<DemoThread[]>(initialThreads);
  const [hydratingThreadId, setHydratingThreadId] = useState<string | null>(null);
  const hydratingIdsRef = useRef(new Set<string>());

  // Update threads when realEmails changes
  useEffect(() => {
    if (realEmails && realEmails.length > 0) {
      setThreads(mapSyncedToThreads(realEmails));
    }
  }, [realEmails]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [customLabels, setCustomLabels] = useState<string[]>(DEFAULT_LABELS);

  const selectedThread = threads.find(t => t.id === selectedThreadId) || null;
  const unreadCount = threads.filter(t => t.unread).length;

  const folderFiltered = threads.filter(t => {
    if (folder === "starred") return t.starred;
    if (folder === "sent") return t.messages.some(m => m.from === "You");
    if (folder === "drafts") return false;
    return true;
  });

  const accountFiltered = folderFiltered.filter(t => {
    if (accountFilter === "all") return true;
    if (accountFilter === "outreach") {
      const addrs = t.messages.map(m => m.from === "You" ? m.toAddr : m.fromAddr);
      return addrs.some(addr => { const match = CONNECT_MATCHES[addr]; return match && match.outreachStatus && match.outreachStatus !== "none"; });
    }
    return t.account === accountFilter;
  });

  const clientFiltered = selectedClient
    ? accountFiltered.filter(t => t.messages.some(m => m.fromAddr === selectedClient || m.toAddr === selectedClient))
    : accountFiltered;

  const filtered = searchQuery ? parseSearch(searchQuery, clientFiltered) : clientFiltered;

  const toggleStar = useCallback((threadId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, starred: !t.starred } : t));
  }, []);

  const markRead = useCallback((threadId: string) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread: false } : t));
  }, []);

  const markAllRead = useCallback(() => {
    setThreads(prev => prev.map(t => ({ ...t, unread: false })));
    toast.success("All marked read");
  }, []);

  const toggleLabel = useCallback((threadId: string, label: string) => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      return { ...t, tags: t.tags.includes(label) ? t.tags.filter(l => l !== label) : [...t.tags, label] };
    }));
  }, []);

  const addLabel = useCallback((label: string) => {
    setCustomLabels(prev => [...prev, label.trim().toLowerCase()]);
    toast.success("Label created");
  }, []);

  const hydrateThreadBody = useCallback(async (thread: DemoThread) => {
    if (!thread.sourceEmailId || !thread.needsHydration || hydratingIdsRef.current.has(thread.id)) {
      return;
    }

    hydratingIdsRef.current.add(thread.id);
    setHydratingThreadId(thread.id);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "fetch-body", email_id: thread.sourceEmailId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch full body");
      }

      const result = await response.json();
      const fullBody = typeof result?.body_html === "string" ? result.body_html.trim() : "";

      if (!fullBody) {
        return;
      }

      setThreads(prev => prev.map(item => {
        if (item.id !== thread.id) return item;
        return {
          ...item,
          needsHydration: false,
          messages: item.messages.map((message, index) => index === 0 ? { ...message, body: fullBody } : message),
        };
      }));
    } catch (error) {
      console.error("Failed to hydrate email body", error);
      toast.error("Could not load the full email");
    } finally {
      hydratingIdsRef.current.delete(thread.id);
      setHydratingThreadId(current => current === thread.id ? null : current);
    }
  }, []);

  const selectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    markRead(threadId);

    const thread = threads.find(item => item.id === threadId);
    if (thread?.sourceEmailId && thread.needsHydration) {
      void hydrateThreadBody(thread);
    }
  }, [hydrateThreadBody, markRead, threads]);

  const clearThread = useCallback(() => setSelectedThreadId(null), []);

  return {
    threads, filtered, selectedThread, unreadCount,
    searchQuery, setSearchQuery,
    folder, setFolder,
    accountFilter, setAccountFilter,
    selectedClient, setSelectedClient,
    customLabels, addLabel,
    toggleStar, markRead, markAllRead, toggleLabel,
    hydratingThreadId,
    selectThread, clearThread,
  };
}
