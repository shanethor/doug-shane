import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTimezone } from "@/hooks/useTimezone";
import { ProductLayout } from "@/components/ProductLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Save, Loader2, User, CreditCard, Moon, Sun, Mail, ExternalLink,
  Network, Link2, Unlink, CheckCircle, Globe, Smartphone, Apple, RefreshCw,
  Briefcase, MapPin, Check, Search, LifeBuoy, Lock,
} from "lucide-react";
import { ConnectedAccountsStatus } from "@/components/ConnectedAccountsStatus";
import { ProgressiveUnlocks } from "@/components/ProgressiveUnlocks";
import { ConnectRewards } from "@/components/ConnectRewards";
import { IntelligenceDiscountBanner, IntelligencePricingSection } from "@/components/IntelligencePricing";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { useSearchParams } from "react-router-dom";
import { useConnectNavConfig, ALL_CONNECT_TABS } from "@/hooks/useConnectNavConfig";
import { CONNECT_VERTICALS } from "@/lib/connect-verticals";
import HelpTicketDialog from "@/components/HelpTicketDialog";

import { isMasterEmail } from "@/lib/master-accounts";

const ALL_US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

type EmailConnection = {
  id: string;
  provider: string;
  email_address: string;
  is_active: boolean;
  created_at: string;
};

export default function ProductSettings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("aura-dark-mode");
    return stored !== null ? stored === "true" : true;
  });
  const [sageEnabled, setSageEnabled] = useState(() => localStorage.getItem("sage-popup-enabled") !== "false");
  const [openingPortal, setOpeningPortal] = useState(false);
  const { config: navConfig, setConfig: setNavConfig } = useConnectNavConfig();
  const { timezone, setTimezone } = useTimezone();

  // Industry / States
  const [profileVertical, setProfileVertical] = useState<string | null>(null);
  const [profileSubVerticals, setProfileSubVerticals] = useState<string[]>([]);
  const [profileStates, setProfileStates] = useState<string[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState(false);
  const [editVertical, setEditVertical] = useState("");
  const [editSubVerticals, setEditSubVerticals] = useState<string[]>([]);
  const [editStates, setEditStates] = useState<string[]>([]);
  const [verticalSearch, setVerticalSearch] = useState("");
  const [savingIndustry, setSavingIndustry] = useState(false);

  // Help
  const [helpOpen, setHelpOpen] = useState(false);

  // Email connections
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // iCloud state
  const [icloudAppleId, setIcloudAppleId] = useState("");
  const [icloudAppPassword, setIcloudAppPassword] = useState("");
  const [icloudConnecting, setIcloudConnecting] = useState(false);
  const [icloudSyncing, setIcloudSyncing] = useState(false);
  const [icloudConnection, setIcloudConnection] = useState<any>(null);
  const [icloudLoaded, setIcloudLoaded] = useState(false);

  const isMaster = isMasterEmail(user?.email);

  const verticalConfig = useMemo(
    () => CONNECT_VERTICALS.find((v) => v.id === editVertical),
    [editVertical]
  );

  const profileVerticalConfig = useMemo(
    () => CONNECT_VERTICALS.find((v) => v.id === profileVertical),
    [profileVertical]
  );

  // Auto-scroll to section
  useEffect(() => {
    const section = searchParams.get("section");
    const returnTo = searchParams.get("returnTo");
    if (returnTo) sessionStorage.setItem("email_connect_return", returnTo);
    if (section && loaded) {
      const targetId = section === "email" ? "email-accounts-section"
        : section === "network" ? "network-connections-section"
        : section === "calendar" ? "calendar-sync-section"
        : null;
      if (targetId) setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }, [searchParams, loaded]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, dark_mode, connect_vertical, specializations, states_of_operation, theme_preference")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setPhone(data.phone || "");
          // Respect existing theme: check DB dark_mode, then theme_preference from onboarding, then localStorage
          const dbDarkMode = (data as any).dark_mode;
          const themePreference = (data as any).theme_preference;
          if (dbDarkMode !== null && dbDarkMode !== undefined) {
            const dbDark = !!dbDarkMode;
            setDarkMode(dbDark);
            document.documentElement.classList.toggle("dark", dbDark);
            localStorage.setItem("aura-dark-mode", dbDark ? "true" : "false");
          } else if (themePreference) {
            // Use onboarding theme preference
            const isDark = themePreference === "dark";
            setDarkMode(isDark);
            document.documentElement.classList.toggle("dark", isDark);
            localStorage.setItem("aura-dark-mode", isDark ? "true" : "false");
          } else {
            // No DB preference — keep current localStorage state (defaults to dark)
            const storedTheme = localStorage.getItem("aura-dark-mode");
            const isDark = storedTheme !== null ? storedTheme === "true" : true;
            setDarkMode(isDark);
            document.documentElement.classList.toggle("dark", isDark);
          }
          setProfileVertical(data.connect_vertical || null);
          setProfileSubVerticals(data.specializations || []);
          setProfileStates(data.states_of_operation || []);
        }
        setLoaded(true);
      });

    // Check subscription status
    supabase.functions.invoke("check-subscription").then(({ data }) => {
      setHasSubscription(!!data?.active);
    }).catch(() => {});

    if (isMaster) {
      loadEmailConnections();
      loadIcloudStatus();
    }
  }, [user]);

  const loadEmailConnections = async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST", headers, body: JSON.stringify({ action: "list" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setEmailConnections(data.connections || []);
      }
    } catch {}
  };

  const loadIcloudStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/icloud-sync`, {
        method: "POST", headers, body: JSON.stringify({ action: "status" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setIcloudConnection(data.connection);
      }
    } catch {} finally { setIcloudLoaded(true); }
  };

  const connectIcloud = async () => {
    if (!icloudAppleId || !icloudAppPassword) {
      toast.error("Enter your Apple ID email and app-specific password");
      return;
    }
    setIcloudConnecting(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/icloud-sync`, {
        method: "POST", headers,
        body: JSON.stringify({ action: "connect", apple_id: icloudAppleId, app_password: icloudAppPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Connection failed");
      toast.success("iCloud connected! Starting sync...");
      setIcloudAppPassword("");
      await syncIcloud();
      await loadIcloudStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect");
    } finally { setIcloudConnecting(false); }
  };

  const syncIcloud = async () => {
    setIcloudSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/icloud-sync`, {
        method: "POST", headers, body: JSON.stringify({ action: "sync" }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Sync failed");
      toast.success(`Synced ${data.imported} contacts from iCloud`);
      await loadIcloudStatus();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally { setIcloudSyncing(false); }
  };

  const disconnectIcloud = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/icloud-sync`, {
        method: "POST", headers, body: JSON.stringify({ action: "disconnect" }),
      });
      setIcloudConnection(null);
      toast.success("iCloud disconnected");
    } catch { toast.error("Failed to disconnect"); }
  };

  const toggleIcloudAutoSync = async (enabled: boolean) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/icloud-sync`, {
        method: "POST", headers, body: JSON.stringify({ action: "toggle_auto_sync", enabled }),
      });
      setIcloudConnection((prev: any) => prev ? { ...prev, auto_sync: enabled } : prev);
      toast.success(enabled ? "Auto-sync enabled" : "Auto-sync disabled");
    } catch { toast.error("Failed to update"); }
  };

  const connectEmail = async (provider: "gmail" | "outlook") => {
    setConnectingProvider(provider);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST", headers,
        body: JSON.stringify({ action: "get_auth_url", provider, redirect_uri: `${window.location.origin}/email-callback` }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to get auth URL");
      const authUrl = new URL(data.url);
      authUrl.searchParams.set("state", provider);
      sessionStorage.setItem("email_connect_return", "/app/settings?section=email");
      window.location.href = authUrl.toString();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect");
      setConnectingProvider(null);
    }
  };

  const disconnectEmail = async (connectionId: string, providerLabel: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST", headers, body: JSON.stringify({ action: "disconnect", connection_id: connectionId }),
      });
      setEmailConnections(prev => prev.filter(c => c.id !== connectionId));
      toast.success(`${providerLabel} account disconnected`);
    } catch { toast.error("Failed to disconnect"); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, phone,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else toast.success("Settings saved");
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else toast.info("No active subscription found");
    } catch (err: any) { toast.error(err.message || "Could not open billing portal"); }
    finally { setOpeningPortal(false); }
  };

  const startEditIndustry = () => {
    setEditVertical(profileVertical || "");
    setEditSubVerticals([...profileSubVerticals]);
    setEditStates([...profileStates]);
    setEditingIndustry(true);
  };

  const saveIndustry = async () => {
    if (!user) return;
    setSavingIndustry(true);
    const { error } = await supabase.from("profiles").update({
      connect_vertical: editVertical || null,
      industry: editVertical || null,
      specializations: editSubVerticals.length > 0 ? editSubVerticals : null,
      states_of_operation: editStates.length > 0 ? editStates : null,
    }).eq("user_id", user.id);
    setSavingIndustry(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    setProfileVertical(editVertical);
    setProfileSubVerticals(editSubVerticals);
    setProfileStates(editStates);
    setEditingIndustry(false);
    toast.success("Industry & territory updated");
  };

  const gmailConns = emailConnections.filter(c => c.provider === "gmail");
  const outlookConns = emailConnections.filter(c => c.provider === "outlook");

  const sectionStyle = `rounded-xl border p-6 space-y-5 ${darkMode ? "border-white/5 bg-white/[0.02]" : "border-border bg-card"}`;
  const headingStyle = `text-sm font-medium uppercase tracking-wider ${darkMode ? "text-white/60" : "text-muted-foreground"}`;
  const inputStyle = darkMode ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-background border-border text-foreground placeholder:text-muted-foreground";
  const labelStyle = `text-xs ${darkMode ? "text-white/40" : "text-muted-foreground"}`;
  const textPrimary = darkMode ? "text-white/70" : "text-foreground";
  const textSecondary = darkMode ? "text-white/30" : "text-muted-foreground";
  const iconMuted = darkMode ? "text-white/30" : "text-muted-foreground";

  const filteredVerticals = CONNECT_VERTICALS.filter(
    (v) =>
      v.label.toLowerCase().includes(verticalSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(verticalSearch.toLowerCase())
  );

  if (!loaded) return (
    <ProductLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></ProductLayout>
  );

  return (
    <ProductLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-light tracking-tight ${darkMode ? "text-white/90" : "text-foreground"}`}>Settings</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHelpOpen(true)}
            className="gap-2 text-xs"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Help & Support
          </Button>
        </div>

        {/* Profile */}
        <div className={sectionStyle}>
          <div className="flex items-center gap-3 mb-2">
            <User className={`h-4 w-4 ${iconMuted}`} />
            <h2 className={headingStyle}>Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={labelStyle}>Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className={inputStyle} />
            </div>
            <div className="space-y-2">
              <Label className={labelStyle}>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputStyle} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className={labelStyle}>Email</Label>
            <Input value={user?.email || ""} disabled className={`${inputStyle} opacity-50`} />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>

        {/* Industry & Territory */}
        <div className={sectionStyle}>
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className={`h-4 w-4 ${iconMuted}`} />
            <h2 className={headingStyle}>Industry & Territory</h2>
          </div>

          {!editingIndustry ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${textPrimary}`}>
                    {profileVerticalConfig?.label || "No industry selected"}
                  </p>
                  {profileSubVerticals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profileSubVerticals.map((sv) => (
                        <Badge key={sv} variant="outline" className="text-[9px]">{sv}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {hasSubscription && !isMaster ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHelpOpen(true)}
                    className="gap-1.5 text-xs"
                  >
                    <Lock className="h-3 w-3" /> Request Change
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditIndustry} className="text-xs">
                    Edit
                  </Button>
                )}
              </div>

              <Separator className={darkMode ? "border-white/5" : "border-border"} />

              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-1`}>States of Operation</p>
                  {profileStates.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {profileStates.map((st) => (
                        <Badge key={st} variant="outline" className="text-[9px]">{st}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${textSecondary}`}>None selected</p>
                  )}
                </div>
                {hasSubscription && !isMaster ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHelpOpen(true)}
                    className="gap-1.5 text-xs"
                  >
                    <Lock className="h-3 w-3" /> Request Change
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditIndustry} className="text-xs">
                    Edit
                  </Button>
                )}
              </div>

              {hasSubscription && !isMaster && (
                <p className={`text-[10px] ${textSecondary} flex items-center gap-1`}>
                  <Lock className="h-3 w-3" />
                  Active subscribers must contact support to change industry or territory settings.
                </p>
              )}
            </div>
          ) : (
            /* Editing mode */
            <div className="space-y-4">
              {/* Vertical search */}
              <div className="space-y-2">
                <Label className={labelStyle}>Industry Vertical</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={verticalSearch}
                    onChange={(e) => setVerticalSearch(e.target.value)}
                    placeholder="Search verticals…"
                    className={`pl-9 ${inputStyle}`}
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 border rounded-lg p-2 border-border">
                  {filteredVerticals.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setEditVertical(v.id);
                        setEditSubVerticals(v.subVerticals.slice(0, 2).map((sv) => sv.id));
                        setVerticalSearch("");
                      }}
                      className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                        editVertical === v.id
                          ? "bg-[hsl(140_12%_42%/0.1)] text-foreground"
                          : "hover:bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {editVertical === v.id && <Check className="h-3.5 w-3.5 text-[hsl(140_12%_58%)]" />}
                        <span className="font-medium">{v.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-verticals */}
              {verticalConfig && verticalConfig.subVerticals.length > 0 && (
                <div className="space-y-2">
                  <Label className={labelStyle}>Specializations</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                    {verticalConfig.subVerticals.map((sv) => (
                      <button
                        key={sv.id}
                        onClick={() =>
                          setEditSubVerticals((prev) =>
                            prev.includes(sv.id) ? prev.filter((s) => s !== sv.id) : [...prev, sv.id]
                          )
                        }
                        className={`rounded-md border p-2 text-[11px] font-medium transition-all text-left ${
                          editSubVerticals.includes(sv.id)
                            ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.1)] text-foreground"
                            : "border-border text-muted-foreground hover:border-muted-foreground/30"
                        }`}
                      >
                        {sv.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* States */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={labelStyle}>States of Operation</Label>
                  <button
                    onClick={() =>
                      editStates.length === ALL_US_STATES.length
                        ? setEditStates([])
                        : setEditStates([...ALL_US_STATES])
                    }
                    className="text-[10px] font-medium text-[hsl(140_12%_58%)] hover:underline"
                  >
                    {editStates.length === ALL_US_STATES.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto p-1 border rounded-lg border-border">
                  {ALL_US_STATES.map((st) => (
                    <button
                      key={st}
                      onClick={() =>
                        setEditStates((prev) =>
                          prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
                        )
                      }
                      className={`rounded-md border px-1.5 py-1 text-[10px] font-medium transition-all ${
                        editStates.includes(st)
                          ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.12)] text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <p className={`text-[10px] ${textSecondary}`}>{editStates.length} states selected</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingIndustry(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveIndustry}
                  disabled={savingIndustry}
                  className="flex-1 gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0"
                >
                  {savingIndustry ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Timezone */}
        <div className={sectionStyle}>
          <div className="flex items-center gap-3 mb-2">
            <Globe className={`h-4 w-4 ${iconMuted}`} />
            <h2 className={headingStyle}>Timezone</h2>
          </div>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className={`w-full md:w-80 h-10 rounded-md border text-sm px-3 ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-background border-border text-foreground"}`}
          >
            {["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Anchorage","Pacific/Honolulu","America/Phoenix"].map(tz => (
              <option key={tz} value={tz} className={darkMode ? "bg-[#111]" : "bg-background"}>{tz.replace(/_/g," ").replace("America/","").replace("Pacific/","")}</option>
            ))}
          </select>
        </div>

        {/* Network Connections — Master only */}
        {isMaster && (
          <div className={sectionStyle} id="network-connections-section">
            <div className="flex items-center gap-3 mb-2">
              <Network className={`h-4 w-4 ${iconMuted}`} />
              <h2 className={headingStyle}>Connected Accounts</h2>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Connect your accounts to power AURA Connect's relationship intelligence. More connections = better insights.
            </p>
            <ConnectedAccountsStatus variant="full" />
            <Separator className={darkMode ? "border-white/5" : "border-border"} />
            <ProgressiveUnlocks />
            <Separator className={darkMode ? "border-white/5" : "border-border"} />
            <ConnectRewards />
          </div>
        )}

        {/* Email Accounts — Master only */}
        {isMaster && (
          <div className={sectionStyle} id="email-accounts-section">
            <div className="flex items-center gap-3 mb-2">
              <Mail className={`h-4 w-4 ${iconMuted}`} />
              <h2 className={headingStyle}>Email Accounts</h2>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Connect Gmail or Outlook to sync your inbox and send emails from AURA Connect.
            </p>

            {/* Gmail */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-red-500/10 flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-red-400" /></div>
                  <p className={`text-sm ${textPrimary}`}>Gmail</p>
                </div>
                <Button size="sm" onClick={() => connectEmail("gmail")} disabled={connectingProvider === "gmail"} variant="outline" className={`gap-1.5 h-8 text-xs ${darkMode ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : ""}`}>
                  {connectingProvider === "gmail" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  {gmailConns.length > 0 ? "Add Another" : "Connect"}
                </Button>
              </div>
              {gmailConns.map(conn => (
                <div key={conn.id} className={`flex items-center justify-between rounded-md border p-2.5 pl-9 ${darkMode ? "border-white/10" : "border-border"}`}>
                  <p className={`text-xs flex items-center gap-1.5 truncate ${textSecondary}`}>
                    <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                    {conn.email_address}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => disconnectEmail(conn.id, "Gmail")} className="gap-1 h-7 text-xs text-destructive/60 hover:text-destructive">
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator className={darkMode ? "border-white/5" : "border-border"} />

            {/* Outlook */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-blue-400" /></div>
                  <p className={`text-sm ${textPrimary}`}>Outlook / Microsoft 365</p>
                </div>
                <Button size="sm" onClick={() => connectEmail("outlook")} disabled={connectingProvider === "outlook"} variant="outline" className={`gap-1.5 h-8 text-xs ${darkMode ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : ""}`}>
                  {connectingProvider === "outlook" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  {outlookConns.length > 0 ? "Add Another" : "Connect"}
                </Button>
              </div>
              {outlookConns.map(conn => (
                <div key={conn.id} className={`flex items-center justify-between rounded-md border p-2.5 pl-9 ${darkMode ? "border-white/10" : "border-border"}`}>
                  <p className={`text-xs flex items-center gap-1.5 truncate ${textSecondary}`}>
                    <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                    {conn.email_address}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => disconnectEmail(conn.id, "Outlook")} className="gap-1 h-7 text-xs text-destructive/60 hover:text-destructive">
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Sync — Master only */}
        {isMaster && (
          <div className={sectionStyle} id="calendar-sync-section">
            <div className="flex items-center gap-3 mb-2">
              <span className={iconMuted}>📅</span>
              <h2 className={headingStyle}>Calendar Sync</h2>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Calendar sync uses your connected email account. You can also use AURA's native calendar without external sync.
            </p>
            <div className={`flex items-center justify-between rounded-lg border p-3 ${darkMode ? "border-white/10" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center"><Mail className="h-4 w-4 text-red-400" /></div>
                <div>
                  <p className={`text-sm ${textPrimary}`}>Google Calendar</p>
                  <p className={`text-xs ${textSecondary}`}>
                    {gmailConns.length > 0 ? `${gmailConns.length} account${gmailConns.length > 1 ? "s" : ""} syncing` : "Connect Gmail first"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {gmailConns.length > 0 ? (
                  <>
                    <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Connected</Badge>
                    <Button size="sm" variant="outline" onClick={() => connectEmail("gmail")} className="gap-1.5 h-8 text-xs">
                      <RefreshCw className="h-3 w-3" /> Reconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => document.getElementById("email-accounts-section")?.scrollIntoView({ behavior: "smooth" })} className="gap-1.5 h-9">
                    <Link2 className="h-3.5 w-3.5" /> Setup
                  </Button>
                )}
              </div>
            </div>
            <div className={`flex items-center justify-between rounded-lg border p-3 ${darkMode ? "border-white/10" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Mail className="h-4 w-4 text-blue-400" /></div>
                <div>
                  <p className={`text-sm ${textPrimary}`}>Outlook Calendar</p>
                  <p className={`text-xs ${textSecondary}`}>
                    {outlookConns.length > 0 ? `${outlookConns.length} account${outlookConns.length > 1 ? "s" : ""} syncing` : "Connect Outlook first"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {outlookConns.length > 0 ? (
                  <>
                    <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Connected</Badge>
                    <Button size="sm" variant="outline" onClick={() => connectEmail("outlook")} className="gap-1.5 h-8 text-xs">
                      <RefreshCw className="h-3 w-3" /> Reconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => document.getElementById("email-accounts-section")?.scrollIntoView({ behavior: "smooth" })} className="gap-1.5 h-9">
                    <Link2 className="h-3.5 w-3.5" /> Setup
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Apple / iCloud Contacts — Master only */}
        {isMaster && (
          <div className={sectionStyle} id="icloud-contacts-section">
            <div className="flex items-center gap-3 mb-2">
              <Apple className={`h-4 w-4 ${iconMuted}`} />
              <h2 className={headingStyle}>Apple / iCloud Contacts</h2>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Securely sync your Apple Contacts into AURA using Apple's CardDAV interface.
            </p>

            {icloudConnection ? (
              <div className="space-y-4">
                <div className={`flex items-center justify-between rounded-lg border p-3 ${darkMode ? "border-white/10" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <Apple className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className={`text-sm flex items-center gap-1.5 ${textPrimary}`}>
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        {icloudConnection.apple_id_email}
                      </p>
                      <p className={`text-xs ${textSecondary}`}>
                        {icloudConnection.contact_count || 0} contacts synced
                        {icloudConnection.last_sync_at && ` · Last sync ${new Date(icloudConnection.last_sync_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={syncIcloud} disabled={icloudSyncing} className={`gap-1.5 h-8 text-xs ${darkMode ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : ""}`}>
                      {icloudSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Sync
                    </Button>
                    <Button variant="ghost" size="sm" onClick={disconnectIcloud} className="gap-1 h-7 text-xs text-destructive/60 hover:text-destructive">
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className={`text-sm ${textPrimary}`}>Auto-sync daily</p>
                    <p className={`text-xs ${textSecondary}`}>Automatically pull new contacts from iCloud every day</p>
                  </div>
                  <Switch checked={!!icloudConnection.auto_sync} onCheckedChange={toggleIcloudAutoSync} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className={labelStyle}>Apple ID Email</Label>
                  <Input value={icloudAppleId} onChange={e => setIcloudAppleId(e.target.value)} placeholder="you@icloud.com" className={inputStyle} />
                </div>
                <div className="space-y-2">
                  <Label className={labelStyle}>App-Specific Password</Label>
                  <Input type="password" value={icloudAppPassword} onChange={e => setIcloudAppPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" className={inputStyle} />
                  <p className={`text-[11px] ${textSecondary}`}>
                    Generate one at{" "}
                    <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      appleid.apple.com → Security → App-Specific Passwords
                    </a>
                  </p>
                </div>
                <Button onClick={connectIcloud} disabled={icloudConnecting} size="sm" className="gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0">
                  {icloudConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Connect & Sync Contacts
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Monthly Pricing — Master only */}
        {isMaster && (
          <div className={sectionStyle}>
            <IntelligencePricingSection />
          </div>
        )}

        {/* Subscription */}
        <div className={sectionStyle}>
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className={`h-4 w-4 ${iconMuted}`} />
            <h2 className={headingStyle}>Subscription</h2>
          </div>
          {isMaster && <IntelligenceDiscountBanner />}
          <p className={`text-sm ${textSecondary} mt-2`}>Manage your billing, payment method, and subscription plan.</p>
          <Button onClick={handleManageSubscription} disabled={openingPortal} variant="outline" size="sm" className="gap-2">
            {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Manage Subscription
          </Button>
        </div>

        {/* Preferences */}
        <div className={sectionStyle}>
          <h2 className={headingStyle}>Preferences</h2>

          {/* Email Layout — Master only */}
          {isMaster && (
            <>
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-3">
                  <Mail className={`h-4 w-4 ${iconMuted}`} />
                  <div>
                    <p className={`text-sm ${textPrimary}`}>Email Layout</p>
                    <p className={`text-xs ${textSecondary}`}>Choose your default email view style</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {([
                    { id: "aura", label: "AURA", desc: "Full-featured with pipeline context" },
                    { id: "gmail", label: "Gmail", desc: "Familiar Gmail-style layout" },
                    { id: "outlook", label: "Outlook", desc: "Microsoft Outlook-style layout" },
                  ]).map(opt => {
                    const currentLayout = (sessionStorage.getItem("connect-demo-email-layout") || "aura");
                    const isActive = currentLayout === opt.id;
                    return (
                      <button key={opt.id} onClick={() => {
                        sessionStorage.setItem("connect-demo-email-layout", opt.id);
                        toast.success(`Email layout set to ${opt.label}`);
                      }}
                        className={`flex-1 rounded-lg border p-3 text-left transition-colors ${isActive ? "" : "hover:bg-white/[0.02]"}`}
                        style={{
                          borderColor: isActive ? "hsl(140 12% 42%)" : darkMode ? "hsl(0 0% 100% / 0.05)" : "hsl(var(--border))",
                          background: isActive ? "hsl(140 12% 42% / 0.1)" : "transparent",
                        }}
                      >
                        <p className={`text-sm font-medium ${isActive ? "text-[hsl(140,12%,58%)]" : textPrimary}`}>{opt.label}</p>
                        <p className={`text-[10px] mt-0.5 ${textSecondary}`}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator className={darkMode ? "border-white/5" : "border-border"} />
            </>
          )}

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className={`h-4 w-4 ${iconMuted}`} /> : <Sun className={`h-4 w-4 ${iconMuted}`} />}
              <div>
                <p className={`text-sm ${textPrimary}`}>Dark Mode</p>
                <p className={`text-xs ${textSecondary}`}>Toggle dark/light theme</p>
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={v => {
                setDarkMode(v);
                document.documentElement.classList.toggle("dark", v);
                localStorage.setItem("aura-dark-mode", v ? "true" : "false");
                if (user) supabase.from("profiles").update({ dark_mode: v } as any).eq("user_id", user.id);
              }}
            />
          </div>

          {/* Sage Pop-Up Chat toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className={iconMuted}>⚡</span>
              <div>
                <p className={`text-sm ${textPrimary}`}>Enable Sage Pop Up Chat on All Pages</p>
                <p className={`text-xs ${textSecondary}`}>Access Sage assistant from any page via a floating button</p>
              </div>
            </div>
            <Switch
              checked={sageEnabled}
              onCheckedChange={v => {
                setSageEnabled(v);
                localStorage.setItem("sage-popup-enabled", v ? "true" : "false");
                window.dispatchEvent(new Event("sage-popup-toggle"));
                toast.success(v ? "Sage popup enabled" : "Sage popup disabled");
              }}
            />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={sectionStyle}>
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className={`h-4 w-4 ${iconMuted}`} />
            <h2 className={headingStyle}>Mobile Navigation</h2>
          </div>
          <p className={`text-xs ${textSecondary}`}>
            Choose which tabs appear in the bottom navigation bar on mobile. Unchecked tabs will be accessible via the "More" menu.
          </p>
          <div className="space-y-2">
            {ALL_CONNECT_TABS.map(tab => {
              const isChecked = navConfig.visibleTabIds.includes(tab.id);
              return (
                <label
                  key={tab.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${darkMode ? "border-white/5 hover:bg-white/[0.02]" : "border-border hover:bg-muted/30"}`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newIds = checked
                        ? [...navConfig.visibleTabIds, tab.id]
                        : navConfig.visibleTabIds.filter(id => id !== tab.id);
                      if (newIds.length < 2) {
                        toast.error("You must keep at least 2 tabs visible");
                        return;
                      }
                      if (newIds.length > 5) {
                        toast.error("Maximum 5 tabs in the nav bar");
                        return;
                      }
                      setNavConfig({ visibleTabIds: newIds });
                      toast.success("Navigation updated");
                    }}
                    className={darkMode ? "border-white/20 data-[state=checked]:bg-[hsl(140,12%,42%)] data-[state=checked]:border-[hsl(140,12%,42%)]" : ""}
                  />
                  <span className={`text-sm ${textPrimary}`}>{tab.label}</span>
                </label>
              );
            })}
          </div>
          <p className={`text-[11px] ${textSecondary}`}>Minimum 2, maximum 5 tabs. Remaining tabs appear under "More".</p>
        </div>

        {/* Help & Support */}
        <div className={sectionStyle}>
          <div className="flex items-center gap-3 mb-2">
            <LifeBuoy className={`h-4 w-4 ${iconMuted}`} />
            <h2 className={headingStyle}>Help & Support</h2>
          </div>
          <p className={`text-xs ${textSecondary}`}>
            Have an issue, question, or feature request? Submit a ticket and our team will get back to you.
          </p>
          <Button
            onClick={() => setHelpOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> View / Submit Tickets
          </Button>
        </div>
      </div>

      <HelpTicketDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </ProductLayout>
  );
}
