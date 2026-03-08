import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Bell, Mail, GitBranch, FileText, Check, CheckCheck, Sparkles,
  Send, Loader2, Inbox as InboxIcon, MailOpen, RefreshCw, User, Reply, ArrowLeft, X
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { advisorAssist } from "@/services/aiRouter";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { EmailFilterChips } from "@/components/EmailFilterChips";
import { EmailClientSnapshot } from "@/components/EmailClientSnapshot";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncedEmails, setSyncedEmails] = useState<SyncedEmail[]>([]);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("all");

  // Insurance filter state
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; account_name: string; email: string | null } | null>(null);

  // Email detail dialog
  const [selectedEmail, setSelectedEmail] = useState<SyncedEmail | null>(null);

  // Compose state
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
  const [, setTick] = useState(0); // force re-render for relative time

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
      .select("id, from_address, from_name, to_addresses, subject, body_preview, body_html, is_read, received_at, synced_at")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(100);

    const emails = (data as SyncedEmail[]) || [];
    setSyncedEmails(emails);
    updateLastSyncedFromEmails(emails);
    return emails;
  }, [user, updateLastSyncedFromEmails]);

  // Tick every 30s to keep "Last synced X ago" fresh
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-sync emails every 5 minutes — triggers edge function and refreshes list.
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

  // 5-minute auto-sync interval (run once immediately, then repeat)
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
        .select("id, from_address, from_name, to_addresses, subject, body_preview, body_html, is_read, received_at, synced_at")
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
    // Default "Send from" to the user's connected account if available
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

  const openEmailDetail = (email: SyncedEmail) => {
    setSelectedEmail(email);
    markEmailRead(email);
  };

  const handleReply = (email: SyncedEmail) => {
    setSelectedEmail(null);
    setComposeTo(email.from_address);
    setComposeSubject(email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`);
    setComposeBody("");
    setComposeOpen(true);
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
  const filtered = tab === "all"
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

  const unreadCount = unified.filter((u) => !u.is_read).length;

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

  const mainContent = (
    <>
      <div ref={pullRef} className="overflow-y-auto">
      <PullIndicator />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <InboxIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">{emailOnly ? "Email" : "Inbox"}</h1>
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
            <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync Mail"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compose</span>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide mb-4">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
            {!emailOnly && (
              <>
                <TabsTrigger value="emails" className="relative">
                  <Mail className="h-3.5 w-3.5 mr-1" />
                  Emails
                  {(() => { const c = syncedEmails.filter(e => !e.is_read).length; return c > 0 ? <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">{c}</span> : null; })()}
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="relative">
                  Pipeline
                  {(() => { const c = notifications.filter(n => n.type === "pipeline" && !n.is_read).length; return c > 0 ? <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">{c}</span> : null; })()}
                </TabsTrigger>
                <TabsTrigger value="loss_run" className="relative">
                  Loss Runs
                  {(() => { const c = notifications.filter(n => n.type === "loss_run" && !n.is_read).length; return c > 0 ? <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">{c}</span> : null; })()}
                </TabsTrigger>
                <TabsTrigger value="intake" className="relative">
                  Intake
                  {(() => { const c = notifications.filter(n => n.type === "intake" && !n.is_read).length; return c > 0 ? <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">{c}</span> : null; })()}
                </TabsTrigger>
                <TabsTrigger value="document" className="relative">
                  Documents
                  {(() => { const c = notifications.filter(n => n.type === "document" && !n.is_read).length; return c > 0 ? <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">{c}</span> : null; })()}
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value={tab}>
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
                    <Card
                      key={item.id}
                      className={`cursor-pointer hover-lift transition-smooth ${!item.is_read ? "border-l-2 border-l-primary bg-primary/[0.02]" : "opacity-75"}`}
                      onClick={() => handleUnifiedClick(item)}
                    >
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        <div className={`mt-0.5 shrink-0 ${item.iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!item.is_read ? "font-medium" : ""}`}>{item.title}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">{item.label}</Badge>
                          </div>
                          {item.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.body}</p>}
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        {!item.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

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

              <div className="space-y-1 text-xs text-muted-foreground border-b pb-3">
                <p><span className="font-medium text-foreground">From:</span> {selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_address}>` : selectedEmail.from_address}</p>
                <p><span className="font-medium text-foreground">To:</span> {selectedEmail.to_addresses?.join(", ")}</p>
                <p><span className="font-medium text-foreground">Date:</span> {format(new Date(selectedEmail.received_at), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                {selectedEmail.body_html ? (
                  <div
                    className="prose prose-sm max-w-none text-sm py-3"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <p className="text-sm py-3 whitespace-pre-wrap text-muted-foreground">
                    {selectedEmail.body_preview || "No content available"}
                  </p>
                )}
              </ScrollArea>

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
      </div>
    </>
  );
  return embedded ? mainContent : <AppLayout>{mainContent}</AppLayout>;
}
