import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Bell, Mail, GitBranch, FileText, Check, CheckCheck, Sparkles,
  Send, Loader2, Inbox as InboxIcon, MailOpen, RefreshCw, User, Reply, ArrowLeft, X, Search, SlidersHorizontal, Plus,
  Paperclip, Download, Zap, ExternalLink
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { advisorAssist } from "@/services/aiRouter";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { EmailFilterChips } from "@/components/EmailFilterChips";
import { EmailClientSnapshot } from "@/components/EmailClientSnapshot";
import { EmailClientAssign } from "@/components/EmailClientAssign";
import { fuzzyMatch } from "@/lib/fuzzy-match";
import { useIsMobile } from "@/hooks/use-mobile";

/** Decode HTML entities like &amp;quot; &amp;lt; &amp;gt; &#39; etc. */
function decodeHtmlEntities(text: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  metadata: any;
  created_at: string;
};

type EmailAttachment = {
  id: string;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
};

type SyncedEmail = {
  id: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  subject: string;
  body_preview: string | null;
  body_html: string | null;
  is_read: boolean;
  received_at: string;
  synced_at?: string;
  tags?: string[];
  client_id?: string | null;
  client_link_source?: string | null;
  has_attachments?: boolean;
};

type EmailConnection = {
  id: string;
  provider: string;
  email_address: string;
};

// Unified item for All / Unread tabs
type UnifiedItem = {
  id: string;
  kind: "notification" | "email";
  title: string;
  body: string | null;
  is_read: boolean;
  timestamp: string;
  icon: React.ElementType;
  iconColor: string;
  label: string;
  raw: Notification | SyncedEmail;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pipeline: { icon: GitBranch, color: "text-accent", label: "Pipeline" },
  document: { icon: FileText, color: "text-primary", label: "Document" },
  email: { icon: Mail, color: "text-primary", label: "Email" },
  loss_run: { icon: FileText, color: "text-warning", label: "Loss Runs" },
  intake: { icon: User, color: "text-primary", label: "Intake" },
  info: { icon: Bell, color: "text-muted-foreground", label: "Info" },
};

export default function Inbox({ emailOnly, embedded }: { emailOnly?: boolean; embedded?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncedEmails, setSyncedEmails] = useState<SyncedEmail[]>([]);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("all");

  // Insurance filter state
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // General search
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedEmail, setSelectedEmail] = useState<SyncedEmail | null>(null);
  const [selectedEmailAttachments, setSelectedEmailAttachments] = useState<EmailAttachment[]>([]);
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const [showFullHtml, setShowFullHtml] = useState(false);
  const [hideNonInsurance, setHideNonInsurance] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTone, setComposeTone] = useState("professional");
  const [sendVia, setSendVia] = useState<string>("aura");
  const [sendViaInitialized, setSendViaInitialized] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [processingIntake, setProcessingIntake] = useState(false);
  const [intakeResult, setIntakeResult] = useState<{ lead_id: string; is_new: boolean; intake_link_sent: boolean; documents_ingested: number } | null>(null);

  const updateLastSyncedFromEmails = useCallback((emails: SyncedEmail[]) => {
    const syncedTimes = emails
      .map((e) => e.synced_at)
      .filter((value): value is string => Boolean(value));

    if (syncedTimes.length === 0) return;

    const latest = syncedTimes.reduce((currentLatest, value) => (
      new Date(value).getTime() > new Date(currentLatest).getTime() ? value : currentLatest
    ));

    setLastSyncedAt(new Date(latest));
  }, []);

  const fetchLatestEmails = useCallback(async () => {
    if (!user) return [] as SyncedEmail[];

    const { data } = await supabase
      .from("synced_emails")
      .select("id, from_address, from_name, to_addresses, subject, body_preview, body_html, is_read, received_at, synced_at, tags, client_id, client_link_source, has_attachments")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(100);

    const emails = (data as SyncedEmail[]) || [];
    setSyncedEmails(emails);
    updateLastSyncedFromEmails(emails);
    return emails;
  }, [user, updateLastSyncedFromEmails]);

  const fetchAttachmentsForEmail = useCallback(async (emailId: string) => {
    const { data } = await supabase
      .from("email_attachments")
      .select("id, file_name, file_size, content_type")
      .eq("email_id", emailId);
    setSelectedEmailAttachments((data as EmailAttachment[]) || []);
  }, []);

  const downloadAttachment = useCallback(async (attachment: EmailAttachment) => {
    setDownloadingAttachment(attachment.id);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "download-attachment", attachment_id: attachment.id }),
      });
      if (!resp.ok) throw new Error("Download failed");
      const result = await resp.json();

      // Convert base64 to blob and trigger download
      const binary = atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: result.content_type || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.file_name || attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Failed to download attachment");
    } finally {
      setDownloadingAttachment(null);
    }
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const autoSyncEmails = useCallback(async () => {
    if (!user || emailConnections.length === 0) return;
    try {
      const headers = await getAuthHeaders();
      for (const conn of emailConnections) {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "sync", provider: conn.provider }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(errorBody || "Email sync failed");
        }
      }

      await fetchLatestEmails();
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error("Auto-sync failed", error);
    }
  }, [user, emailConnections, fetchLatestEmails]);

  useEffect(() => {
    if (!user) return;
    loadAll();

    const channel = supabase
      .channel("inbox-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => n.id === updated.id ? updated : n));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "synced_emails", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setSyncedEmails((prev) => {
            const ne = payload.new as SyncedEmail;
            if (prev.some((e) => e.id === ne.id)) return prev;
            return [ne, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "synced_emails", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as SyncedEmail;
          setSyncedEmails((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user || emailConnections.length === 0) return;

    void autoSyncEmails();
    const interval = setInterval(autoSyncEmails, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, emailConnections, autoSyncEmails]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    const [notifRes, emailRes, connRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("synced_emails")
        .select("id, from_address, from_name, to_addresses, subject, body_preview, body_html, is_read, received_at, synced_at, tags, client_id, client_link_source, has_attachments")
        .eq("user_id", user.id)
        .order("received_at", { ascending: false })
        .limit(100),
      (async () => {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
          method: "POST", headers,
          body: JSON.stringify({ action: "list" }),
        });
        return resp.ok ? resp.json() : { connections: [] };
      })(),
    ]);

    setNotifications((notifRes.data as Notification[]) || []);
    const emails = (emailRes.data as SyncedEmail[]) || [];
    setSyncedEmails(emails);
    updateLastSyncedFromEmails(emails);

    const conns = connRes.connections || [];
    setEmailConnections(conns);
    if (!sendViaInitialized && conns.length > 0) {
      setSendVia(conns[0].provider);
      setSendViaInitialized(true);
    }
    setLoading(false);
  };

  const syncEmails = async () => {
    if (emailConnections.length === 0) {
      toast.info("Let's connect your email first.");
      navigate("/settings?section=email&returnTo=/inbox");
      return;
    }
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      for (const conn of emailConnections) {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
          method: "POST", headers,
          body: JSON.stringify({ action: "sync", provider: conn.provider }),
        });
        if (resp.ok) {
          const data = await resp.json();
          toast.success(`Synced ${data.synced} emails from ${conn.provider === "gmail" ? "Gmail" : "Outlook"}`);
        }
      }
      await fetchLatestEmails();
      setLastSyncedAt(new Date());
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    window.dispatchEvent(new Event("unread-count-refresh"));
  };

  const markEmailRead = async (email: SyncedEmail) => {
    if (email.is_read) return;
    await supabase.from("synced_emails").update({ is_read: true }).eq("id", email.id);
    setSyncedEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e)));
    window.dispatchEvent(new Event("unread-count-refresh"));
  };

  const markAllRead = async () => {
    if (!user) return;
    await Promise.all([
      supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false),
      supabase.from("synced_emails").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false),
    ]);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setSyncedEmails((prev) => prev.map((e) => ({ ...e, is_read: true })));
    window.dispatchEvent(new Event("unread-count-refresh"));
    toast.success("All marked as read");
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markNotifRead(n.id);
    if (n.link) navigate(n.link);
  };

  // ── Layer 1: Domain / sender blacklist ──
  const NON_INSURANCE_DOMAINS = [
    // Retail / E-commerce
    "amazon", "ebay", "walmart", "target", "bestbuy", "etsy", "shopify",
    "costco", "samsclub", "homedepot", "lowes", "macys", "nordstrom",
    "kohls", "wayfair", "overstock", "chewy", "zappos", "shein",
    "jared.com", "kay.com", "zales.com", "bluenile", "tiffany",
    "gap.com", "oldnavy", "bananarepublic", "jcrew", "hm.com", "asos",
    "nike", "adidas", "underarmour", "lululemon", "rei.com",
    "bathandbodyworks", "sephora", "ulta", "glossier",
    // Health / Supplements / Wellness
    "metagenics", "thorne", "draxe", "iherb", "vitacost", "swanson",
    "gardenoflife", "NOW Foods", "herbalife", "isagenix", "doterra",
    "youngliving", "arbonne", "advocare", "beachbody",
    "mindbodygreen", "wellandgood", "healthline", "webmd",
    // Social media
    "facebook", "facebookmail", "meta.com", "metamail", "instagram",
    "twitter", "x.com", "linkedin", "tiktok", "pinterest", "reddit",
    "snapchat", "threads.net", "nextdoor", "tumblr", "mastodon",
    // Streaming / Entertainment
    "youtube", "netflix", "spotify", "hulu", "disney", "hbomax", "peacock",
    "paramountplus", "appletv", "pandora", "audible", "kindle",
    "sirius", "iheartradio", "deezer",
    // News / Sports / Media
    "espn", "nfl.com", "nba.com", "mlb.com", "nhl.com",
    "bleacherreport", "theathletic", "foxsports", "cbssports", "si.com",
    "cnn", "bbc", "nytimes", "washingtonpost", "usatoday", "reuters",
    "apnews", "huffpost", "buzzfeed", "vice.com", "vox.com",
    "foreignpolicy.com", "theatlantic", "newyorker", "economist",
    "politico", "axios", "theverge", "wired", "arstechnica",
    "morningbrew", "theskim", "dailywire",
    // Airlines / Travel / Hotels
    "southwest", "delta", "united", "american airlines", "jetblue", "spirit",
    "frontier", "alaska air", "hawaiianair",
    "expedia", "booking.com", "hotels.com", "airbnb", "vrbo", "kayak",
    "priceline", "tripadvisor", "marriott", "hilton", "ihg", "hyatt",
    "carnival", "royalcaribbean", "norwegian",
    // Food delivery / Rideshare
    "uber", "lyft", "doordash", "grubhub", "postmates", "instacart",
    "seamless", "caviar", "gopuff",
    // Tech / Dev / SaaS (not insurance)
    "github", "stackoverflow", "medium", "substack", "producthunt",
    "slack.com", "zoom.us", "calendly", "figma", "canva", "dropbox",
    "notion.so", "trello", "asana", "monday.com", "jira",
    "perplexity", "openai", "anthropic", "chatgpt",
    // Payments / Fintech (non-insurance)
    "venmo", "cashapp", "paypal", "zelle", "square", "stripe.com",
    "robinhood", "coinbase", "crypto.com",
    "sofi.com", "sofi.org", "wealthfront", "betterment", "acorns",
    "mint.com", "creditkarma", "nerdwallet", "bankrate",
    "chime", "ally.com", "marcus.com", "discover.com",
    // Fitness / Health apps
    "peloton", "fitbit", "myfitnesspal", "strava", "headspace", "calm.com",
    "noom", "orangetheory", "crossfit",
    // Loyalty / Rewards programs
    "starbucks", "chick-fil-a", "chipotle", "panera", "dunkin",
    "dominos", "pizzahut", "papajohns", "mcdonalds", "wendys",
    // Generic sender patterns
    "noreply", "no-reply", "mailer-daemon", "newsletter", "notifications",
    "promotions", "marketing", "promo", "info@", "updates@", "alerts@",
    "support@", "hello@", "team@", "digest@", "news@", "offers@",
    // Telecom
    "verizon", "att.com", "t-mobile", "xfinity", "comcast", "spectrum",
    // Automotive
    "carfax", "carvana", "autotrader", "cars.com", "kbb.com",
    // Real estate (non-insurance)
    "zillow", "redfin", "realtor.com", "trulia",
    // Education / Online learning
    "coursera", "udemy", "skillshare", "masterclass", "khan academy",
    "duolingo", "brilliant", "chegg", "quizlet", "studocu",
    // Gaming
    "playstation", "xbox", "nintendo", "steam", "epicgames", "roblox",
    // Charity / Nonprofits (not insurance-related)
    "change.org", "gofundme", "kickstarter", "indiegogo",
    // Tax / Accounting marketing
    "hrblock", "sendtax.hrblock", "turbotax", "intuit", "taxact", "taxslayer",
    "jacksonhewitt", "libertytax",
    // Investment / Brokerage marketing
    "vanguard", "e-vanguard", "fidelity", "schwab", "etrade", "tdameritrade",
    "merrilledge", "edwardjones",
    // Jewelry / Fashion
    "jared.com", "kay.com", "zales", "bluenile", "tiffany",
    "pandora.net", "swarovski",
    // Perplexity / AI assistants
    "perplexity", "openai", "anthropic", "chatgpt",
    // Miscellaneous marketing
    "groupon", "retailmenot", "slickdeals", "honey",
    "foreignpolicy.com", "morningbrew", "theskim",
  ];

  // ── Layer 2: Subject / content keyword patterns ──
  const NON_INSURANCE_SUBJECTS = [
    // Shopping / Orders
    "your order", "shipped", "delivery", "tracking", "receipt",
    "your package", "order confirmation", "shipment", "out for delivery",
    "has been delivered", "return label", "refund processed",
    "add to cart", "your cart", "wish list",
    // Newsletters / Digests
    "unsubscribe", "weekly digest", "daily digest", "morning brief",
    "newsletter", "weekly roundup", "daily recap", "top stories",
    "what you missed", "trending now", "this week in",
    "morning brew", "daily skimm", "the brief",
    // Account / Auth
    "password reset", "verify your email", "confirm your", "sign in",
    "two-factor", "verification code", "security alert",
    "new login", "account activity",
    // Sales / Marketing
    "sale", "discount", "coupon", "deal of", "flash sale", "limited time",
    "% off", "special offer", "exclusive offer", "don't miss",
    "last chance", "act now", "clearance", "buy one get",
    "free shipping", "promo code", "just for you",
    "we miss you", "come back", "it's back", "price drop",
    // Subscriptions
    "your subscription", "free trial", "trial ending", "plan renewal",
    "upgrade your", "your membership", "billing statement",
    // Social
    "you might", "recommended for you", "trending",
    "invitation to connect", "endorsed you", "new follower",
    "liked your", "commented on", "shared your", "mentioned you",
    "people you may know", "connection request",
    "who viewed your profile",
    // Sports / Entertainment
    "score", "highlights", "recap", "game day", "final score",
    "touchdown", "halftime", "playoff", "standings",
    "new episode", "now streaming", "watch now", "just added",
    "season premiere", "box office",
    // Travel
    "flight", "itinerary", "boarding pass", "check-in", "hotel reservation",
    "trip confirmation", "travel alert",
    // Rewards / Points
    "points", "rewards", "miles", "loyalty", "earned", "redeem",
    "cash back", "your balance",
    // Food / Dining
    "your table", "reservation confirmed", "order ready",
    "menu update", "happy hour",
    // Finance (non-insurance)
    "your statement", "monthly statement", "interest rate",
    "credit score", "pre-approved", "refinance", "mortgage rate",
    "investment update", "portfolio", "dividend",
    "crypto", "bitcoin", "ethereum",
    // Health supplements / Wellness marketing
    "supplement", "vitamin", "probiotic", "collagen", "detox",
    "wellness", "holistic", "superfood", "nutrition",
  ];

  // Insurance-positive keywords that override the filters (safety net)
  const INSURANCE_KEYWORDS = [
    "policy", "premium", "coverage", "claim", "deductible", "liability",
    "certificate", "endorsement", "underwriting", "insured", "insurer",
    "binder", "loss run", "acord", "coi", "renewal", "audit",
    "workers comp", "general liability", "commercial auto", "property",
    "umbrella", "excess", "surplus", "e&o", "d&o", "epli",
    "professional liability", "cyber liability", "bond", "surety",
    "risk", "broker", "carrier", "indemnity", "subrogation",
    "certificate of insurance", "additional insured", "named insured",
    "effective date", "expiration date", "cancellation notice",
    "mod rate", "experience mod", "ncci", "class code",
    "loss ratio", "actuarial", "reinsurance", "excess liability",
    "fiduciary", "occurrence", "claims-made", "aggregate",
    "per occurrence", "blanket", "scheduled",
  ];

  /**
   * Scoring-based filter: assigns a relevance score per email.
   * Scores below 0.2 → non-insurance. Scores above → kept.
   */
  const isNonInsuranceEmail = useCallback((email: SyncedEmail): boolean => {
    const fromLower = (email.from_address || "").toLowerCase();
    const subjectLower = (email.subject || "").toLowerCase();
    const fromName = (email.from_name || "").toLowerCase();
    const previewLower = (email.body_preview || "").toLowerCase();
    const tags = email.tags || [];

    // Hard keeps: tagged, linked to client
    if (tags.length > 0) return false;
    if (email.client_id) return false;

    let score = 0.5;
    const combinedText = `${subjectLower} ${previewLower} ${fromName}`;

    // Positive signals: insurance keywords → +0.3 each (capped)
    const posHits = INSURANCE_KEYWORDS.filter((kw) => combinedText.includes(kw)).length;
    score += posHits * 0.3;

    // Negative signals: domain blacklist → -0.35
    if (NON_INSURANCE_DOMAINS.some((d) => fromLower.includes(d))) score -= 0.35;

    // Negative signals: subject/name keywords → -0.35
    if (NON_INSURANCE_SUBJECTS.some((s) => subjectLower.includes(s) || fromName.includes(s))) score -= 0.35;

    // Clamp 0-1
    score = Math.max(0, Math.min(1, score));

    return score < 0.25;
  }, []);

  /** Strip image src attributes from HTML, replacing with placeholder */
  const stripImages = (html: string): string => {
    return html.replace(/<img\s([^>]*?)src\s*=\s*["']([^"']+)["']/gi, '<img $1src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'%3E%3C/svg%3E" data-original-src="$2"');
  };

  /** Restore original src from data-original-src */
  const restoreImages = (html: string): string => {
    return html.replace(/src="data:image\/svg\+xml[^"]*"\s*data-original-src="([^"]+)"/gi, 'src="$1"');
  };

  const openEmailDetail = async (email: SyncedEmail) => {
    setSelectedEmail(email);
    setSelectedEmailAttachments([]);
    setShowFullHtml(false);
    setIntakeResult(null);
    markEmailRead(email);
    if (email.has_attachments) {
      fetchAttachmentsForEmail(email.id);
    }
    // Fetch full HTML body on demand if not already loaded
    if (!email.body_html) {
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "fetch-body", email_id: email.id }),
        });
        if (resp.ok) {
          const { body_html } = await resp.json();
          if (body_html) {
            const updated = { ...email, body_html };
            setSelectedEmail(updated);
            setSyncedEmails((prev) =>
              prev.map((e) => e.id === email.id ? { ...e, body_html } : e)
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch email body:", err);
      }
    }
  };

  const handleReply = (email: SyncedEmail) => {
    setSelectedEmail(null);
    setComposeTo(email.from_address);
    setComposeSubject(email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`);
    setComposeBody("");
    setComposeOpen(true);
  };

  const handleProcessIntake = async (email: SyncedEmail) => {
    setProcessingIntake(true);
    setIntakeResult(null);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "process-email-intake", email_id: email.id }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to process");
      }
      const result = await resp.json();
      setIntakeResult(result);
      // Update the email's client_id in state
      if (result.lead_id) {
        const updated = { ...email, client_id: result.lead_id };
        setSelectedEmail(updated);
        setSyncedEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, client_id: result.lead_id } : e));
      }
      toast.success(result.is_new
        ? "New client created & intake link sent"
        : "Existing client updated & intake link sent"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to process intake");
    } finally {
      setProcessingIntake(false);
    }
  };

  // Build unified items
  const buildUnified = useCallback((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];

    for (const n of notifications) {
      const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
      items.push({
        id: `n-${n.id}`,
        kind: "notification",
        title: n.title,
        body: n.body,
        is_read: n.is_read,
        timestamp: n.created_at,
        icon: cfg.icon,
        iconColor: cfg.color,
        label: cfg.label,
        raw: n,
      });
    }

    for (const e of syncedEmails) {
      items.push({
        id: `e-${e.id}`,
        kind: "email",
        title: `${e.from_name || e.from_address}: ${e.subject}`,
        body: e.body_preview,
        is_read: e.is_read,
        timestamp: e.received_at,
        icon: Mail,
        iconColor: "text-accent",
        label: "Email",
        raw: e,
      });
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  }, [notifications, syncedEmails]);

  const unified = buildUnified();
  const baseUnified = emailOnly ? unified.filter((u) => u.kind === "email") : unified;

  // Apply insurance tag + client filters
  const applyInsuranceFilters = (items: UnifiedItem[]) => {
    let result = items;
    if (activeTags.length > 0) {
      result = result.filter((u) => {
        if (u.kind !== "email") return false;
        const email = u.raw as SyncedEmail;
        const emailTags = email.tags || [];
        return activeTags.every((t) => emailTags.includes(t));
      });
    }
    return result;
  };

  const tabFiltered = tab === "all"
    ? baseUnified
    : tab === "unread"
      ? baseUnified.filter((u) => !u.is_read)
      : tab === "pipeline"
        ? baseUnified.filter((u) => u.kind === "notification" && (u.raw as Notification).type === "pipeline")
        : tab === "loss_run"
          ? baseUnified.filter((u) => u.kind === "notification" && (u.raw as Notification).type === "loss_run")
          : tab === "intake"
            ? baseUnified.filter((u) => u.kind === "notification" && (u.raw as Notification).type === "intake")
            : tab === "document"
              ? baseUnified.filter((u) => u.kind === "notification" && (u.raw as Notification).type === "document")
              : tab === "emails"
                ? baseUnified.filter((u) => u.kind === "email")
                : baseUnified;

  // Apply search query with fuzzy matching
  const applySearchFilter = (items: UnifiedItem[]) => {
    const q = searchQuery.trim();
    if (!q) return items;
    const results = fuzzyMatch(q, items, (item) => {
      const parts = [item.title];
      if (item.body) parts.push(item.body);
      if (item.kind === "email") {
        const email = item.raw as SyncedEmail;
        parts.push(email.from_address, email.from_name || "");
      }
      return parts.join(" ");
    }, 0.25);
    return results.map((r) => r.item);
  };

  // Apply non-insurance filter
  const applyNonInsuranceFilter = (items: UnifiedItem[]) => {
    if (!hideNonInsurance) return items;
    return items.filter((u) => {
      if (u.kind !== "email") return true;
      return !isNonInsuranceEmail(u.raw as SyncedEmail);
    });
  };

  const filtered = applySearchFilter(applyNonInsuranceFilter(applyInsuranceFilters(tabFiltered)));

  const unreadCount = baseUnified.filter((u) => !u.is_read).length;

  const handleUnifiedClick = (item: UnifiedItem) => {
    if (item.kind === "notification") {
      handleNotificationClick(item.raw as Notification);
    } else {
      openEmailDetail(item.raw as SyncedEmail);
    }
  };

  // AI draft handler via router
  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await advisorAssist({
        taskType: "EMAIL_DRAFT",
        userPrompt: aiPrompt,
        tone: composeTone,
      });
      if (result.subject) setComposeSubject(result.subject);
      if (result.body) setComposeBody(result.body);
      toast.success(`Draft generated via ${result.metadata.engine === "openai" ? "your OpenAI GPT" : "AURA AI"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate draft");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      toast.error("Please fill in To and Subject");
      return;
    }
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const recipients = composeTo.split(",").map((e) => e.trim());
      const htmlBody = composeBody.replace(/\n/g, "<br/>");

      if (sendVia === "aura") {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST", headers,
          body: JSON.stringify({ to: recipients, subject: composeSubject, html: htmlBody }),
        });
        if (!resp.ok) throw new Error("Failed to send via AURA");
        toast.success("Email sent via AURA!");
      } else {
        const provider = sendVia;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
          method: "POST", headers,
          body: JSON.stringify({
            action: "send",
            send_provider: provider,
            to: recipients,
            subject: composeSubject,
            body_html: htmlBody,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error || "Failed to send");
        }
        const data = await resp.json();
        toast.success(`Sent from ${data.sent_from}`);
      }

      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setAiPrompt("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  // Build send-via options
  const sendOptions = [
    { value: "aura", label: "AURA (noreply@buildingaura.site)" },
    ...emailConnections.map((c) => ({
      value: c.provider,
      label: `${c.provider === "gmail" ? "Gmail" : "Outlook"} (${c.email_address})`,
    })),
  ];

  const { containerRef: pullRef, PullIndicator } = usePullToRefresh({ onRefresh: loadAll });

  if (loading) {
    const loadingContent = (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
    return embedded ? loadingContent : <AppLayout>{loadingContent}</AppLayout>;
  }

  // ── Mobile-optimized compact layout ──
  const mobileContent = (
    <div ref={pullRef} className="flex flex-col h-full overflow-hidden">
      <PullIndicator />

      {/* Compact top bar: title + action icons */}
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold truncate">{emailOnly ? "Email" : "Inbox"}</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={syncEmails} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setComposeOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sync status line */}
      {lastSyncedAt && (
        <p className="text-[10px] text-muted-foreground px-1 -mt-1 mb-1">
          Synced {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}
        </p>
      )}

      {/* Search + filter row */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emails…"
            className="pl-8 h-8 text-xs bg-muted/50 border-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 relative">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeTags.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">
                  {activeTags.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Categories</p>
                <EmailFilterChips activeTags={activeTags} onTagsChange={setActiveTags} />
              </div>
              <div>
                <button
                  onClick={() => setHideNonInsurance(!hideNonInsurance)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    hideNonInsurance
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {hideNonInsurance ? "✓ " : ""}Hide non-insurance emails
                </button>
              </div>
              {activeTags.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setActiveTags([]); setFilterSheetOpen(false); }}>
                  Clear all filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Tiny pill toggle: All / Unread */}
      <div className="flex items-center gap-1 px-1 mb-2">
        {["all", "unread"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
        {!emailOnly && (
          <button
            onClick={() => setTab("emails")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              tab === "emails"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Emails
          </button>
        )}
      </div>

      {/* Email list — flat cells, maximum space */}
      <ScrollArea className="flex-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MailOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">
              {tab === "unread" ? "All caught up" : tab === "emails" && emailConnections.length === 0
                ? "No email connected yet"
                : "No items yet"}
            </p>
            {tab === "emails" && emailConnections.length === 0 && (
              <Button variant="link" size="sm" onClick={() => navigate("/settings")} className="mt-1 text-xs">
                Connect Gmail or Outlook
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const email = item.kind === "email" ? (item.raw as SyncedEmail) : null;
              const senderName = email ? (email.from_name || email.from_address.split("@")[0]) : "";
              const subject = email ? email.subject : item.title;
              const preview = email ? email.body_preview : item.body;
              const tags = email?.tags || [];

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-2.5 px-2 py-2.5 active:bg-muted/70 transition-colors cursor-pointer ${
                    !item.is_read ? "bg-primary/[0.03]" : ""
                  }`}
                  onClick={() => handleUnifiedClick(item)}
                >
                  {/* Unread dot */}
                  <div className="w-2 pt-2 shrink-0">
                    {!item.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: Sender (bold) + time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${!item.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                        {email ? senderName : item.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: false })}
                      </span>
                    </div>

                    {/* Row 2: Subject */}
                    <p className={`text-xs truncate mt-0.5 ${!item.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                      {subject || "(no subject)"}
                    </p>

                    {/* Row 3: Preview + optional tag chip */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {preview && (
                        <p className="text-[11px] text-muted-foreground truncate flex-1">{decodeHtmlEntities(preview)}</p>
                      )}
                      {email?.has_attachments && (
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {tags.length > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 h-4">
                          {tags[0].replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ── Desktop layout (unchanged) ──
  const desktopContent = (
    <div ref={pullRef} className="overflow-y-auto">
      <PullIndicator />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <InboxIcon className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">{emailOnly ? "Email" : "Inbox"}</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs">{unreadCount} new</Badge>
          )}
          <span className="text-[11px] text-muted-foreground ml-1">
            {lastSyncedAt
              ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`
              : "Last synced: pending"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncEmails} disabled={syncing} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Mail"}
          </Button>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Compose
          </Button>
        </div>
      </div>

      {/* Desktop tabs */}
      <div className="overflow-x-auto scrollbar-hide mb-4">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          {[
            { value: "all", label: "All" },
            { value: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
            ...(!emailOnly ? [
              { value: "emails", label: "Emails" },
              { value: "pipeline", label: "Pipeline" },
              { value: "loss_run", label: "Loss Runs" },
              { value: "intake", label: "Intake" },
              { value: "document", label: "Documents" },
            ] : []),
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${
                tab === t.value
                  ? "bg-background text-foreground shadow"
                  : "hover:bg-background/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search emails by subject, sender, or content…"
          className="pl-9 h-9 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Insurance filter chips + hide non-insurance toggle (inline on desktop) */}
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <EmailFilterChips activeTags={activeTags} onTagsChange={setActiveTags} />
        <button
          onClick={() => setHideNonInsurance(!hideNonInsurance)}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
            hideNonInsurance
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {hideNonInsurance ? "✓ " : ""}Hide non-insurance
        </button>
      </div>

      {/* Email list */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MailOpen className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">
              {tab === "unread" ? "All caught up" : tab === "emails" && emailConnections.length === 0
                ? "No email connected yet"
                : "No items yet"}
            </p>
            {tab === "emails" && emailConnections.length === 0 && (
              <Button variant="link" size="sm" onClick={() => navigate("/settings")} className="mt-2">
                Connect Gmail or Outlook in Settings
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`cursor-pointer rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50 ${
                    !item.is_read ? "border-l-2 border-l-primary bg-primary/[0.02]" : "opacity-75"
                  }`}
                  onClick={() => handleUnifiedClick(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${item.iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!item.is_read ? "font-medium" : ""}`}>{item.title}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{item.label}</Badge>
                        {item.kind === "email" && (item.raw as SyncedEmail).has_attachments && (
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {item.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{decodeHtmlEntities(item.body)}</p>}
                      {item.kind === "email" && ((item.raw as SyncedEmail).tags || []).length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {((item.raw as SyncedEmail).tags || []).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag.replace(/_/g, " ")}</Badge>
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    {!item.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const mainContent = (
    <>
      {isMobile ? mobileContent : desktopContent}

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => { if (!open) setSelectedEmail(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-accent shrink-0" />
                  <span className="truncate">{selectedEmail.subject || "(no subject)"}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs border-b pb-3">
                <span className="font-medium text-foreground">From</span>
                <span className="text-foreground truncate">
                  {selectedEmail.from_name
                    ? <>{selectedEmail.from_name} <span className="text-muted-foreground">&lt;{selectedEmail.from_address}&gt;</span></>
                    : selectedEmail.from_address}
                </span>
                <span className="font-medium text-foreground">To</span>
                <span className="text-muted-foreground truncate">{selectedEmail.to_addresses?.join(", ")}</span>
                <span className="font-medium text-foreground">Date</span>
                <span className="text-muted-foreground">{format(new Date(selectedEmail.received_at), "EEE, MMM d, yyyy 'at' h:mm a")}</span>
                {selectedEmail.tags && selectedEmail.tags.length > 0 && (
                  <>
                    <span className="font-medium text-foreground">Tags</span>
                    <div className="flex gap-1 flex-wrap">
                      {selectedEmail.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag.replace(/_/g, " ")}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 py-2">
                <EmailClientAssign
                  emailId={selectedEmail.id}
                  clientId={selectedEmail.client_id || null}
                  onClientChanged={(newClientId) => {
                    setSelectedEmail({ ...selectedEmail, client_id: newClientId });
                    setSyncedEmails((prev) =>
                      prev.map((e) => e.id === selectedEmail.id ? { ...e, client_id: newClientId } : e)
                    );
                  }}
                />
                </div>

              {/* Process & Send Intake action */}
              <div className="flex items-center gap-2 py-2 border-b">
                {intakeResult ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="gap-1 text-[10px] bg-primary/5 border-primary/20">
                      <Check className="h-3 w-3" />
                      {intakeResult.is_new ? "New client created" : "Existing client updated"}
                    </Badge>
                    {intakeResult.documents_ingested > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {intakeResult.documents_ingested} doc{intakeResult.documents_ingested > 1 ? "s" : ""} ingested
                      </Badge>
                    )}
                    {intakeResult.intake_link_sent && (
                      <Badge variant="outline" className="text-[10px] bg-accent/5 border-accent/20">Intake link sent</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 h-7 ml-auto"
                      onClick={() => navigate(`/pipeline/${intakeResult.lead_id}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View client
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-7"
                    onClick={() => handleProcessIntake(selectedEmail)}
                    disabled={processingIntake}
                  >
                    {processingIntake ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    {processingIntake ? "Processing…" : "Process & Send Intake"}
                  </Button>
                )}
              </div>

              {selectedEmail.client_id && (
                <div className="py-2">
                  <EmailClientSnapshot clientId={selectedEmail.client_id} />
                </div>
              )}

              {showFullHtml && selectedEmail.body_html ? (
                <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "65vh" }}>
                  <div className="py-3">
                    <button
                      onClick={() => setShowFullHtml(false)}
                      className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to preview
                    </button>
                    <div
                      className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_a]:text-primary [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                    />
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="py-3">
                    {selectedEmail.body_preview ? (
                      <p className="text-sm whitespace-pre-wrap">{decodeHtmlEntities(selectedEmail.body_preview)}</p>
                    ) : selectedEmail.body_html ? (
                      <p className="text-sm whitespace-pre-wrap">{decodeHtmlEntities(selectedEmail.body_html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim())}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No content available</p>
                    )}
                    {selectedEmail.body_html && (
                      <button
                        onClick={() => setShowFullHtml(true)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        View full email
                      </button>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Attachments section */}
              {(() => {
                // Deduplicate attachments by file_name — keep only the first occurrence
                const seen = new Set<string>();
                const uniqueAttachments = selectedEmailAttachments.filter((att) => {
                  if (seen.has(att.file_name)) return false;
                  seen.add(att.file_name);
                  return true;
                });
                return uniqueAttachments.length > 0 ? (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    {uniqueAttachments.length} Attachment{uniqueAttachments.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueAttachments.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => downloadAttachment(att)}
                        disabled={downloadingAttachment === att.id}
                        className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs hover:bg-muted transition-colors max-w-[200px]"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{att.file_name}</span>
                        {downloadingAttachment === att.id ? (
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                        ) : (
                          <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null;
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setSelectedEmail(null)}>
                  Close
                </Button>
                <Button size="sm" onClick={() => handleReply(selectedEmail)} className="gap-1.5">
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Email Composer Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              AI Email Composer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-accent/30 bg-accent/5 p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-accent">AI Draft Assistant</Label>
              <Textarea
                placeholder="e.g. 'Write a follow-up email to the client about their GL renewal quote we sent last week'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <div className="flex items-center gap-2">
                <Select value={composeTone} onValueChange={setComposeTone}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAiDraft} disabled={aiLoading || !aiPrompt.trim()} className="gap-1.5">
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Generate Draft
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Send From</Label>
              <Select value={sendVia} onValueChange={setSendVia}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sendOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">To (comma-separated)</Label>
              <Input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="client@example.com"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Re: Coverage Renewal"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Body</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Email body..."
                className="min-h-[120px] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSendEmail} disabled={sending} className="gap-1.5">
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
  return embedded ? mainContent : <AppLayout>{mainContent}</AppLayout>;
}
