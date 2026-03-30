import { useState, useCallback, useEffect } from "react";
import { Mail, CheckCheck, Loader2, PenSquare, X, Send, ChevronDown, RefreshCw, CalendarDays, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEmailEngine, getEmailLayout, setEmailLayout, type EmailLayout } from "./email-views/useEmailEngine";
import { useEmailAI } from "./email-views/useEmailAI";
import EmailViewGmail from "./email-views/EmailViewGmail";
import EmailViewOutlook from "./email-views/EmailViewOutlook";
import EmailViewAura from "./email-views/EmailViewAura";
import { ClientEmailFolders } from "@/components/ClientEmailFolders";
import SmartCalendar from "@/components/connect/SmartCalendar";
import { useRealEmailData } from "@/hooks/useRealData";
import { ConnectEmptyState } from "./ConnectEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";

interface LinkedAccount {
  id: string;
  provider: string;
  email_address: string;
  is_active: boolean;
}

export default function DemoEmailTab() {
  const { user } = useAuth();
  const { hasEmail, emails, loading: realLoading } = useRealEmailData();
  const engine = useEmailEngine(hasEmail === true ? emails : undefined);
  const ai = useEmailAI();
  const [layout, setLayoutState] = useState<EmailLayout>(getEmailLayout);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = useCallback(async () => {
    if (!user || linkedAccounts.length === 0) return;
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      for (const acc of linkedAccounts) {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "sync", connection_id: acc.id, provider: acc.provider }),
        });
        if (resp.ok) {
          const data = await resp.json();
          toast.success(`Synced ${data.synced ?? 0} emails from ${acc.provider === "gmail" ? "Gmail" : "Outlook"}`);
        }
      }
      // Reload the page data after sync
      window.location.reload();
    } catch {
      toast.error("Sync failed — please try again");
    } finally {
      setSyncing(false);
    }
  }, [user, linkedAccounts]);

  useEffect(() => { ai.reset(); }, [engine.selectedThread?.id]);

  // Load linked email accounts
  useEffect(() => {
    if (!user) return;
    supabase
      .from("email_connections" as any)
      .select("id, provider, email_address, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => {
        const accounts = (data as any as LinkedAccount[]) || [];
        setLinkedAccounts(accounts);
        if (accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accounts[0].id);
        }
        setAccountsLoaded(true);
      });
  }, [user]);

  const handleLayoutChange = useCallback((l: EmailLayout) => {
    setLayoutState(l);
    setEmailLayout(l);
  }, []);

  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      toast.error("To and Subject are required");
      return;
    }
    if (!selectedAccountId) {
      toast.error("Please select a sending account");
      return;
    }
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const selectedAccount = linkedAccounts.find(a => a.id === selectedAccountId);

      // Send via the linked email account
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-via-connection`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          connection_id: selectedAccountId,
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim(),
        }),
      });

      const result = await resp.json();

      if (resp.ok && result.success) {
        toast.success(`Email sent from ${selectedAccount?.email_address || "your account"}`);
        setComposeOpen(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
      } else {
        // Fallback: save as draft
        if (user) {
          await supabase.from("email_drafts").insert({
            user_id: user.id,
            to_addresses: [composeTo.trim()],
            subject: composeSubject.trim(),
            body_html: composeBody.trim(),
            status: "draft",
            connection_id: selectedAccountId || null,
          });
          toast.success("Saved as draft — will retry on next sync");
          setComposeOpen(false);
          setComposeTo("");
          setComposeSubject("");
          setComposeBody("");
        } else {
          toast.error(result.error || "Failed to send email");
        }
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (realLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
    );
  }

  if (hasEmail === false) {
    return <ConnectEmptyState type="email" />;
  }

  if (hasEmail === true && emails.length === 0 && engine.filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="h-12 w-12 mb-4" style={{ color: "hsl(140 12% 42%)" }} />
        <h3 className="text-lg font-semibold text-white/90 mb-2">Email Connected</h3>
        <p className="text-sm text-white/40 max-w-md">Your email account is linked but no messages have been synced yet. Emails will appear here after the next sync cycle.</p>
        <Button className="mt-4 gap-2" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setComposeOpen(true)}>
          <PenSquare className="h-4 w-4" /> Compose Email
        </Button>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes emailSlideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .email-header { animation: emailSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .email-body { animation: emailSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
      `}</style>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="email-header">
        <TabsList className="mb-3 h-8" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
          <TabsTrigger value="email" className="gap-1.5 text-xs px-3" style={{ color: activeTab === "email" ? "white" : "hsl(240 5% 50%)" }}>
            <Mail className="h-3 w-3" /> Email
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs px-3" style={{ color: activeTab === "calendar" ? "white" : "hsl(240 5% 50%)" }}>
            <CalendarDays className="h-3 w-3" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs px-3" style={{ color: activeTab === "clients" ? "white" : "hsl(240 5% 50%)" }}>
            <Users className="h-3 w-3" /> Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
              <h2 className="text-lg font-semibold text-white">Email</h2>
              <Badge className="text-xs" style={{ background: "hsl(140 12% 42%)", color: "white" }}>{engine.unreadCount} new</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5 text-xs h-7" variant="outline" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={handleManualSync} disabled={syncing || linkedAccounts.length === 0}>
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Mail"}
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={engine.markAllRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
              </Button>
              <Button size="sm" className="gap-1.5 text-xs h-7" style={{ background: "hsl(140 12% 42%)", color: "white" }} onClick={() => setComposeOpen(true)}>
                <PenSquare className="h-3.5 w-3.5" /> Compose
              </Button>
            </div>
          </div>

          <div className="email-body">
            {layout === "gmail" && <EmailViewGmail engine={engine} ai={ai} />}
            {layout === "outlook" && <EmailViewOutlook engine={engine} ai={ai} />}
            {layout === "aura" && <EmailViewAura engine={engine} ai={ai} linkedAccounts={linkedAccounts} />}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <SmartCalendar />
        </TabsContent>

        <TabsContent value="clients">
          <ClientEmailFolders
            onSelectClient={(clientId) => {
              setSelectedClientId(clientId);
              if (clientId) setActiveTab("email");
            }}
            selectedClientId={selectedClientId}
          />
        </TabsContent>
      </Tabs>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">New Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Account Selector */}
            <div>
              <label className="text-xs text-white/50 mb-1 block">From</label>
              {linkedAccounts.length > 0 ? (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="text-sm h-9" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }}>
                    <SelectValue placeholder="Select sending account" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 18%)" }}>
                    {linkedAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" style={{ color: acc.provider === "gmail" ? "#ea4335" : "#0078d4" }} />
                          <span>{acc.email_address}</span>
                          <span className="text-white/30 text-[10px] capitalize">({acc.provider})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-white/40 py-2">No email accounts linked. Connect one in Intelligence → Sources.</p>
              )}
            </div>
            <div>
              <Input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="To: email@example.com"
                className="text-sm" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
            <div>
              <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Subject"
                className="text-sm" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
            <div>
              <Textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message…"
                rows={8} className="text-sm resize-none" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setComposeOpen(false)} style={{ color: "hsl(240 5% 55%)" }}>
              <X className="h-4 w-4 mr-1" /> Discard
            </Button>
            <Button size="sm" onClick={handleSendEmail} disabled={sending || !composeTo.trim() || !selectedAccountId}
              style={{ background: "hsl(140 12% 42%)", color: "white" }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
