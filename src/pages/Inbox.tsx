import { useState, useEffect } from "react";
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
  Send, Loader2, Inbox as InboxIcon, MailOpen, RefreshCw, User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getAuthHeaders } from "@/lib/auth-fetch";

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
  is_read: boolean;
  received_at: string;
};

type EmailConnection = {
  id: string;
  provider: string;
  email_address: string;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pipeline: { icon: GitBranch, color: "text-accent", label: "Pipeline" },
  document: { icon: FileText, color: "text-primary", label: "Document" },
  email: { icon: Mail, color: "text-primary", label: "Email" },
  info: { icon: Bell, color: "text-muted-foreground", label: "Info" },
};

export default function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncedEmails, setSyncedEmails] = useState<SyncedEmail[]>([]);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("all");
  const [composeOpen, setComposeOpen] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTone, setComposeTone] = useState("professional");
  const [sendVia, setSendVia] = useState<string>("aura");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);

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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    // Load notifications, synced emails, and connections in parallel
    const [notifRes, emailRes, connRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("synced_emails")
        .select("id, from_address, from_name, to_addresses, subject, body_preview, is_read, received_at")
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
    setSyncedEmails((emailRes.data as SyncedEmail[]) || []);
    setEmailConnections(connRes.connections || []);
    setLoading(false);
  };

  const syncEmails = async () => {
    if (emailConnections.length === 0) {
      toast.error("No email accounts connected. Go to Settings to connect Gmail or Outlook.");
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
      // Reload emails
      const { data } = await supabase
        .from("synced_emails")
        .select("id, from_address, from_name, to_addresses, subject, body_preview, is_read, received_at")
        .eq("user_id", user!.id)
        .order("received_at", { ascending: false })
        .limit(100);
      setSyncedEmails((data as SyncedEmail[]) || []);
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compose-email`, {
        method: "POST", headers,
        body: JSON.stringify({ prompt: aiPrompt, tone: composeTone }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "AI draft failed");
      }
      const data = await resp.json();
      if (data.subject) setComposeSubject(data.subject);
      if (data.body) setComposeBody(data.body);
      toast.success(`Draft generated via ${data.provider === "openai" ? "your OpenAI GPT" : "AURA AI"}`);
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
        // Send via AURA (Resend)
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST", headers,
          body: JSON.stringify({ to: recipients, subject: composeSubject, html: htmlBody }),
        });
        if (!resp.ok) throw new Error("Failed to send via AURA");
        toast.success("Email sent via AURA!");
      } else {
        // Send via connected account
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

  const filtered = tab === "all"
    ? notifications
    : tab === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications.filter((n) => n.type === tab);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Build send-via options
  const sendOptions = [
    { value: "aura", label: "AURA (noreply@buildingaura.site)" },
    ...emailConnections.map((c) => ({
      value: c.provider,
      label: `${c.provider === "gmail" ? "Gmail" : "Outlook"} (${c.email_address})`,
    })),
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <InboxIcon className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs">{unreadCount} new</Badge>
          )}
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          <TabsTrigger value="synced">
            <Mail className="h-3.5 w-3.5 mr-1" />
            Emails {syncedEmails.length > 0 && `(${syncedEmails.length})`}
          </TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="document">Documents</TabsTrigger>
        </TabsList>

        {/* Notifications tabs */}
        {tab !== "synced" && (
          <TabsContent value={tab}>
            <ScrollArea className="h-[calc(100vh-280px)]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MailOpen className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((n) => {
                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                    const Icon = cfg.icon;
                    return (
                      <Card
                        key={n.id}
                        className={`cursor-pointer hover-lift transition-smooth ${!n.is_read ? "border-l-2 border-l-primary bg-primary/[0.02]" : "opacity-75"}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <CardContent className="flex items-start gap-3 py-3 px-4">
                          <div className={`mt-0.5 ${cfg.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
                              <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                            </div>
                            {n.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>}
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                          {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        )}

        {/* Synced Emails tab */}
        {tab === "synced" && (
          <TabsContent value="synced">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {syncedEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Mail className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">No synced emails yet</p>
                  {emailConnections.length === 0 ? (
                    <Button variant="link" size="sm" onClick={() => navigate("/settings")} className="mt-2">
                      Connect Gmail or Outlook in Settings
                    </Button>
                  ) : (
                    <Button variant="link" size="sm" onClick={syncEmails} className="mt-2">
                      Click "Sync Mail" to pull in your latest emails
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {syncedEmails.map((e) => (
                    <Card
                      key={e.id}
                      className={`cursor-pointer hover-lift transition-smooth ${!e.is_read ? "border-l-2 border-l-accent bg-accent/[0.02]" : "opacity-75"}`}
                      onClick={() => {
                        // Pre-fill reply
                        setComposeTo(e.from_address);
                        setComposeSubject(`Re: ${e.subject}`);
                        setComposeBody("");
                        setComposeOpen(true);
                      }}
                    >
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        <div className="mt-0.5 text-accent">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!e.is_read ? "font-medium" : ""}`}>
                              {e.from_name || e.from_address}
                            </p>
                            <span className="text-[10px] text-muted-foreground truncate">{e.from_address}</span>
                          </div>
                          <p className="text-sm truncate mt-0.5">{e.subject}</p>
                          {e.body_preview && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{e.body_preview}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}
                        </span>
                        {!e.is_read && <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>

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
            {/* AI Prompt Section */}
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

            {/* Send via selector */}
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
    </AppLayout>
  );
}
