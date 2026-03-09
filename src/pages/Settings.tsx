import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Mail, Save, User, BrainCircuit, Eye, EyeOff, Info, Loader2, Link2, Unlink, CheckCircle, Smartphone, GripVertical, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { useSearchParams } from "react-router-dom";
import { useNavConfig, ALL_NAV_TABS } from "@/hooks/useNavConfig";
import { Checkbox } from "@/components/ui/checkbox";

const AGENCY_FIELDS = [
  { key: "agency_phone", label: "Agency Phone", placeholder: "(555) 123-4567" },
  { key: "agency_fax", label: "Agency Fax", placeholder: "(555) 123-4568" },
  { key: "agency_email", label: "Agency Email", placeholder: "info@agency.com" },
  { key: "producer_name", label: "Producer Name", placeholder: "Jane Smith" },
  { key: "producer_license_no", label: "Producer License No.", placeholder: "LIC-123456" },
  { key: "from_email", label: "Send-From Email", placeholder: "submissions@agency.com" },
];

type EmailConnection = {
  id: string;
  provider: string;
  email_address: string;
  is_active: boolean;
  created_at: string;
};

export default function Settings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { config: navConfig, setConfig: setNavConfig } = useNavConfig();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aiProvider, setAiProvider] = useState("lovable");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [navTabCount, setNavTabCount] = useState(navConfig.tabCount);
  const [navSelectedIds, setNavSelectedIds] = useState<string[]>(navConfig.selectedTabIds);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Email connections
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // Auto-scroll to email section and store returnTo
  useEffect(() => {
    const section = searchParams.get("section");
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      sessionStorage.setItem("email_connect_return", returnTo);
    }
    if (section && loaded) {
      const targetId = section === "email" ? "email-accounts-section" : section === "calendar" ? "calendar-sync-section" : null;
      if (targetId) {
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    }
  }, [searchParams, loaded]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("form_defaults, full_name, agency_name, phone, from_email, ai_provider, openai_api_key_encrypted")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data?.[0]) {
          const defaults = (data[0].form_defaults as Record<string, any>) || {};
          const merged: Record<string, string> = {};
          AGENCY_FIELDS.forEach((f) => {
            merged[f.key] = defaults[f.key] || "";
          });
          if (!merged.agency_name && data[0].agency_name) merged.agency_name = data[0].agency_name;
          if (!merged.producer_name && data[0].full_name) merged.producer_name = data[0].full_name;
          if (!merged.from_email && data[0].from_email) merged.from_email = data[0].from_email;
          if (!merged.agency_phone && data[0].phone) merged.agency_phone = data[0].phone;
          setValues(merged);
          setAiProvider((data[0] as any).ai_provider || "lovable");
          setOpenaiKey((data[0] as any).openai_api_key_encrypted || "");
          if ((data[0] as any).timezone) setTimezone((data[0] as any).timezone);
        }
        setLoaded(true);
      });

    loadEmailConnections();
  }, [user]);

  const loadEmailConnections = async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "list" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setEmailConnections(data.connections || []);
      }
    } catch (err) {
      console.error("Failed to load email connections:", err);
    }
  };

  const connectEmail = async (provider: "gmail" | "outlook") => {
    setConnectingProvider(provider);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "get_auth_url",
          provider,
          redirect_uri: `${window.location.origin}/email-callback`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to get auth URL");

      // Add state parameter (provider) to the URL
      const authUrl = new URL(data.url);
      authUrl.searchParams.set("state", provider);
      window.location.href = authUrl.toString();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect");
      setConnectingProvider(null);
    }
  };

  const disconnectEmail = async (provider: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "disconnect", provider }),
      });
      setEmailConnections((prev) => prev.filter((c) => c.provider !== provider));
      toast.success(`${provider === "gmail" ? "Gmail" : "Outlook"} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nonEmpty = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim())
      );
      const { error } = await supabase
        .from("profiles")
        .update({
          agency_name: nonEmpty.agency_name || null,
          phone: nonEmpty.agency_phone || null,
          full_name: nonEmpty.producer_name || user.user_metadata?.full_name || null,
          from_email: nonEmpty.from_email || null,
          form_defaults: nonEmpty,
          ai_provider: aiProvider,
          openai_api_key_encrypted: openaiKey || null,
          timezone: timezone || null,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const gmailConn = emailConnections.find((c) => c.provider === "gmail");
  const outlookConn = emailConnections.find((c) => c.provider === "outlook");

  if (!loaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-2xl sm:text-4xl mb-6">Settings</h1>

      {/* Account Info */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground sm:w-32">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm truncate">{user?.email}</span>
              <Badge variant="outline" className="text-[10px]">Verified</Badge>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground sm:w-32">User ID</Label>
            <span className="text-xs text-muted-foreground font-mono">{user?.id?.slice(0, 12)}…</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground sm:w-32">Member Since</Label>
            <span className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Timezone
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            All dates, calendar events, and scheduling use this timezone. Defaults to your browser's local time.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-3">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full sm:w-80 h-11 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {[
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Los_Angeles",
                "America/Anchorage",
                "Pacific/Honolulu",
                "America/Phoenix",
                "America/Indiana/Indianapolis",
                "America/Detroit",
                "America/Boise",
                "America/Juneau",
                "America/Adak",
                "US/Samoa",
                "Pacific/Guam",
              ].map((tz) => {
                let label = tz.replace(/_/g, " ").replace("America/", "").replace("Pacific/", "").replace("US/", "");
                try {
                  const offset = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
                    .formatToParts(new Date())
                    .find((p) => p.type === "timeZoneName")?.value || "";
                  label = `${label} (${offset})`;
                } catch {}
                return (
                  <SelectItem key={tz} value={tz}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 h-9">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Timezone"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Agency Information
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            These details auto-fill on every ACORD form you generate.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENCY_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </Label>
                <Input
                  value={values[f.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="h-11 sm:h-10"
                />
              </div>
            ))}
          </div>

          <Separator />

          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto h-11 sm:h-10">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Email Connections */}
      <Card className="mb-4 sm:mb-6" id="email-accounts-section">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            Email Accounts
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your Gmail or Outlook account to send emails and sync your inbox.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-3">
          {/* Gmail */}
          <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4 min-h-[56px]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Gmail</p>
                {gmailConn ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                    {gmailConn.email_address}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            {gmailConn ? (
              <Button variant="outline" size="sm" onClick={() => disconnectEmail("gmail")} className="gap-1.5 shrink-0 h-9">
                <Unlink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => connectEmail("gmail")} disabled={connectingProvider === "gmail"} className="gap-1.5 shrink-0 h-9">
                {connectingProvider === "gmail" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                Connect
              </Button>
            )}
          </div>

          {/* Outlook */}
          <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4 min-h-[56px]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Outlook / Microsoft 365</p>
                {outlookConn ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                    {outlookConn.email_address}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            {outlookConn ? (
              <Button variant="outline" size="sm" onClick={() => disconnectEmail("outlook")} className="gap-1.5 shrink-0 h-9">
                <Unlink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => connectEmail("outlook")} disabled={connectingProvider === "outlook"} className="gap-1.5 shrink-0 h-9">
                {connectingProvider === "outlook" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                Connect
              </Button>
            )}
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>How it works:</strong> When connected, AURA syncs your recent emails into the Inbox and lets you send emails directly from your own address. 
              Your email credentials are stored securely and never shared. You can disconnect at any time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Sync */}
      <Card className="mb-4 sm:mb-6" id="calendar-sync-section">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            📅 Calendar Sync
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your Google or Outlook calendar to sync events into AURA.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-3">
          {/* Gmail Calendar */}
          <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4 min-h-[56px]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Google Calendar</p>
                {gmailConn ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                    Uses {gmailConn.email_address}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Connect Gmail first in Email Accounts above</p>
                )}
              </div>
            </div>
            {gmailConn ? (
              <Badge variant="outline" className="text-[10px] shrink-0">Connected</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={() => {
                document.getElementById("email-accounts-section")?.scrollIntoView({ behavior: "smooth" });
              }} className="gap-1.5 shrink-0 h-9">
                <Link2 className="h-3.5 w-3.5" />
                Setup
              </Button>
            )}
          </div>

          {/* Outlook Calendar */}
          <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4 min-h-[56px]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Outlook Calendar</p>
                {outlookConn ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                    Uses {outlookConn.email_address}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Connect Outlook first in Email Accounts above</p>
                )}
              </div>
            </div>
            {outlookConn ? (
              <Badge variant="outline" className="text-[10px] shrink-0">Connected</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={() => {
                document.getElementById("email-accounts-section")?.scrollIntoView({ behavior: "smooth" });
              }} className="gap-1.5 shrink-0 h-9">
                <Link2 className="h-3.5 w-3.5" />
                Setup
              </Button>
            )}
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>How it works:</strong> Calendar sync uses your connected email account. Once Gmail or Outlook is connected above, AURA automatically syncs your calendar events.
              Events from your external calendar will appear alongside AURA-created events.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Navigation */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Mobile Navigation
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Choose how many tabs appear on the bottom bar and which ones to show.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Number of tabs
            </Label>
            <Select
              value={String(navTabCount)}
              onValueChange={(v) => {
                const count = Number(v);
                setNavTabCount(count);
                // Auto-trim selection if needed
                const trimmed = navSelectedIds.slice(0, count);
                setNavSelectedIds(trimmed);
                setNavConfig({ tabCount: count, selectedTabIds: trimmed });
              }}
            >
              <SelectTrigger className="w-full sm:w-40 h-11 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} tabs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Visible tabs (select {navTabCount})
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_NAV_TABS.map((tab) => {
                const isSelected = navSelectedIds.includes(tab.id);
                const isFull = navSelectedIds.length >= navTabCount && !isSelected;
                return (
                  <button
                    key={tab.id}
                    disabled={isFull}
                    onClick={() => {
                      let updated: string[];
                      if (isSelected) {
                        updated = navSelectedIds.filter((id) => id !== tab.id);
                      } else {
                        updated = [...navSelectedIds, tab.id];
                      }
                      setNavSelectedIds(updated);
                      setNavConfig({ tabCount: navTabCount, selectedTabIds: updated });
                    }}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : isFull
                        ? "border-muted text-muted-foreground/50 cursor-not-allowed"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${isSelected ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tabs not shown on the bar will appear in the "More" menu.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI & Email Settings */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-accent" />
            AI & Email
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Configure which AI provider drafts your emails and notes.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">AI Provider</Label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger className="w-full sm:w-64 h-11 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">AURA AI (built-in, no key needed)</SelectItem>
                <SelectItem value="openai">My OpenAI API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {aiProvider === "openai" && (
            <div className="space-y-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">OpenAI API Key</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p className="font-medium mb-1">Where to find your key:</p>
                    <ol className="list-decimal pl-3 space-y-0.5">
                      <li>Go to <strong>platform.openai.com</strong></li>
                      <li>Click your profile → <strong>API keys</strong></li>
                      <li>Click <strong>Create new secret key</strong></li>
                      <li>Copy and paste it here</li>
                    </ol>
                    <p className="mt-1 text-muted-foreground">Your key is stored securely and only used server-side for email drafting.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="h-11 sm:h-10 pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1.5 sm:top-1 h-8 w-8 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Using your own key lets you leverage your GPT's memory and custom instructions for more personalized drafts.
              </p>
            </div>
          )}

          <Separator />
          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto h-11 sm:h-10">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
