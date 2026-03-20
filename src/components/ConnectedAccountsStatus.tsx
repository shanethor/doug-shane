import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Mail, Users, Linkedin, Phone, Instagram,
  CheckCircle, Circle, Settings, Network, Loader2,
  Upload, RefreshCw, Unlink, AlertTriangle, Plus, ClipboardPaste,
  ChevronDown, ChevronUp, MessageSquare, Gamepad2, Dumbbell, MapPin,
  Camera, Headphones, Globe, Hash,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { toast } from "sonner";

export interface AccountStatus {
  id: string;
  label: string;
  icon: React.ReactNode;
  level: "Required" | "Recommended" | "Optional";
  connected: boolean;
  detail?: string;
  contactCount?: number;
  lastSync?: string;
  canConnect?: boolean;
  canDisconnect?: boolean;
}

interface ConnectedAccountsStatusProps {
  variant?: "compact" | "full";
  accounts?: AccountStatus[];
  onRefresh?: () => void;
}

const SYNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-contacts`;

export function useConnectedAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let emailConnected = false;
    let emailDetail = "";

    // Check email connections
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "list" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const conns = data.connections || [];
        emailConnected = conns.length > 0;
        if (emailConnected) {
          emailDetail = conns.map((c: any) => c.email_address).join(", ");
        }
      }
    } catch {}

    // Check network connections status
    let networkConns: Record<string, any> = {};
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(SYNC_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "status" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        (data.connections || []).forEach((c: any) => {
          networkConns[c.source] = c;
        });
      }
    } catch {}

    const googleContacts = networkConns["google_contacts"];
    const outlookContacts = networkConns["outlook_contacts"];
    const linkedin = networkConns["linkedin"];
    const phone = networkConns["phone"];

    // Check if user has outlook email connected
    let outlookConnected = false;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "list" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        outlookConnected = (data.connections || []).some((c: any) => c.provider === "outlook");
      }
    } catch {}

    setAccounts([
      {
        id: "email",
        label: "Email (Gmail / Outlook)",
        icon: <Mail className="h-4 w-4" />,
        level: "Required",
        connected: emailConnected,
        detail: emailDetail || undefined,
        canConnect: true,
        canDisconnect: false,
      },
      {
        id: "contacts",
        label: "Google Contacts",
        icon: <Users className="h-4 w-4" />,
        level: "Required",
        connected: !!googleContacts,
        detail: googleContacts ? `${googleContacts.contact_count} contacts synced` : undefined,
        contactCount: googleContacts?.contact_count,
        lastSync: googleContacts?.last_sync_at,
        canConnect: emailConnected,
        canDisconnect: !!googleContacts,
      },
      {
        id: "outlook_contacts",
        label: "Outlook Contacts",
        icon: <Mail className="h-4 w-4" />,
        level: "Recommended",
        connected: !!outlookContacts,
        detail: outlookContacts ? `${outlookContacts.contact_count} contacts synced` : undefined,
        contactCount: outlookContacts?.contact_count,
        lastSync: outlookContacts?.last_sync_at,
        canConnect: outlookConnected,
        canDisconnect: !!outlookContacts,
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        icon: <Linkedin className="h-4 w-4" />,
        level: "Required",
        connected: !!linkedin,
        detail: linkedin ? `${linkedin.contact_count} connections imported` : undefined,
        contactCount: linkedin?.contact_count,
        lastSync: linkedin?.last_sync_at,
        canConnect: true,
        canDisconnect: !!linkedin,
      },
      {
        id: "phone",
        label: "Phone Contacts",
        icon: <Phone className="h-4 w-4" />,
        level: "Recommended",
        connected: !!phone,
        detail: phone ? `${phone.contact_count} contacts imported` : undefined,
        contactCount: phone?.contact_count,
        lastSync: phone?.last_sync_at,
        canConnect: true,
        canDisconnect: !!phone,
      },
      {
        id: "social",
        label: "Instagram / Facebook / X",
        icon: <Instagram className="h-4 w-4" />,
        level: "Optional",
        connected: !!(networkConns["social_instagram"] || networkConns["social_facebook"] || networkConns["social_x"]),
        detail: (() => {
          const counts = [networkConns["social_instagram"], networkConns["social_facebook"], networkConns["social_x"]]
            .filter(Boolean)
            .map((c: any) => c.contact_count || 0);
          const total = counts.reduce((a: number, b: number) => a + b, 0);
          return total > 0 ? `${total} profiles imported` : undefined;
        })(),
        canConnect: true,
        canDisconnect: !!(networkConns["social_instagram"] || networkConns["social_facebook"] || networkConns["social_x"]),
      },
      // ─── Professional Networks ───
      {
        id: "slack",
        label: "Slack",
        icon: <Hash className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["slack"],
        detail: networkConns["slack"] ? `${networkConns["slack"].contact_count} members imported` : undefined,
        contactCount: networkConns["slack"]?.contact_count,
        lastSync: networkConns["slack"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["slack"],
      },
      {
        id: "teams",
        label: "Microsoft Teams",
        icon: <Users className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["teams"],
        detail: networkConns["teams"] ? `${networkConns["teams"].contact_count} contacts imported` : undefined,
        contactCount: networkConns["teams"]?.contact_count,
        lastSync: networkConns["teams"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["teams"],
      },
      {
        id: "eventbrite",
        label: "Eventbrite",
        icon: <Globe className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["eventbrite"],
        detail: networkConns["eventbrite"] ? `${networkConns["eventbrite"].contact_count} attendees imported` : undefined,
        contactCount: networkConns["eventbrite"]?.contact_count,
        lastSync: networkConns["eventbrite"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["eventbrite"],
      },
      {
        id: "meetup",
        label: "Meetup",
        icon: <Users className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["meetup"],
        detail: networkConns["meetup"] ? `${networkConns["meetup"].contact_count} contacts imported` : undefined,
        contactCount: networkConns["meetup"]?.contact_count,
        lastSync: networkConns["meetup"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["meetup"],
      },
      {
        id: "alignable",
        label: "Alignable",
        icon: <Network className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["alignable"],
        detail: networkConns["alignable"] ? `${networkConns["alignable"].contact_count} connections imported` : undefined,
        contactCount: networkConns["alignable"]?.contact_count,
        lastSync: networkConns["alignable"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["alignable"],
      },
      // ─── Fitness & Community ───
      {
        id: "strava",
        label: "Strava",
        icon: <Dumbbell className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["strava"],
        detail: networkConns["strava"] ? `${networkConns["strava"].contact_count} athletes imported` : undefined,
        contactCount: networkConns["strava"]?.contact_count,
        lastSync: networkConns["strava"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["strava"],
      },
      {
        id: "peloton",
        label: "Peloton",
        icon: <Dumbbell className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["peloton"],
        detail: networkConns["peloton"] ? `${networkConns["peloton"].contact_count} followers imported` : undefined,
        contactCount: networkConns["peloton"]?.contact_count,
        lastSync: networkConns["peloton"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["peloton"],
      },
      {
        id: "nextdoor",
        label: "Nextdoor",
        icon: <MapPin className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["nextdoor"],
        detail: networkConns["nextdoor"] ? `${networkConns["nextdoor"].contact_count} neighbors imported` : undefined,
        contactCount: networkConns["nextdoor"]?.contact_count,
        lastSync: networkConns["nextdoor"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["nextdoor"],
      },
      {
        id: "snapchat",
        label: "Snapchat",
        icon: <Camera className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["snapchat"],
        detail: networkConns["snapchat"] ? `${networkConns["snapchat"].contact_count} friends imported` : undefined,
        contactCount: networkConns["snapchat"]?.contact_count,
        lastSync: networkConns["snapchat"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["snapchat"],
      },
      {
        id: "clubhouse",
        label: "Clubhouse",
        icon: <Headphones className="h-4 w-4" />,
        level: "Optional",
        connected: !!networkConns["clubhouse"],
        detail: networkConns["clubhouse"] ? `${networkConns["clubhouse"].contact_count} contacts imported` : undefined,
        contactCount: networkConns["clubhouse"]?.contact_count,
        lastSync: networkConns["clubhouse"]?.last_sync_at,
        canConnect: true,
        canDisconnect: !!networkConns["clubhouse"],
      },
    ]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { accounts, loading, refresh };
}

// ─── LinkedIn CSV Parser ───
function parseLinkedInCSV(text: string): any[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const contacts: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parse (handles basic quoting)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += char;
    }
    values.push(current.trim());
    
    const obj: any = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] || ""; });
    if (obj["First Name"] || obj["Last Name"]) contacts.push(obj);
  }
  return contacts;
}

// ─── Main Component ───
export function ConnectedAccountsStatus({ variant = "compact", accounts: accountsProp, onRefresh }: ConnectedAccountsStatusProps) {
  const hook = useConnectedAccounts();
  const accounts = accountsProp ?? hook.accounts;
  const loading = accountsProp ? false : hook.loading;
  const refresh = onRefresh ?? hook.refresh;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("aura-connected-accounts-collapsed") === "true"; } catch { return false; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneFileInputRef = useRef<HTMLInputElement>(null);
  const [showReconnectPicker, setShowReconnectPicker] = useState(false);
  const [gmailAccounts, setGmailAccounts] = useState<{id: string; email: string}[]>([]);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [pasteContacts, setPasteContacts] = useState("");
  const [showSocialDialog, setShowSocialDialog] = useState(false);
  const [socialUrl, setSocialUrl] = useState("");
  const [socialPlatform, setSocialPlatform] = useState<string>("");
  const [socialHandles, setSocialHandles] = useState("");
  const [myProfileUrls, setMyProfileUrls] = useState<{instagram: string; facebook: string; x: string}>({ instagram: "", facebook: "", x: "" });
  const [savedProfiles, setSavedProfiles] = useState<{platform: string; url: string; last_sync?: string; contact_count?: number}[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  const fetchGmailAccounts = useCallback(async (): Promise<{id: string; email: string}[]> => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "list" }),
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      const gmails = (data.connections || []).filter((c: any) => c.provider === "gmail");
      const mapped = gmails.map((c: any) => ({ id: c.id, email: c.email_address }));
      setGmailAccounts(mapped);
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const handleReconnectGmail = useCallback(async (connectionId: string, emailAddress?: string) => {
    setShowReconnectPicker(false);
    setActionLoading("contacts");
    try {
      const headers = await getAuthHeaders();
      const removeResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "remove", connection_id: connectionId }),
      });

      if (!removeResp.ok) {
        const removeData = await removeResp.json().catch(() => ({}));
        throw new Error(removeData.error || "Failed to clear old Gmail connection");
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "get_auth_url",
          provider: "gmail",
          redirect_uri: `${window.location.origin}/email-callback`,
        }),
      });
      const data = await resp.json();
      if (data.url) {
        sessionStorage.setItem("email_connect_return", "/settings?section=network");
        sessionStorage.setItem("pending_contacts_sync", "google");
        if (emailAddress) {
          sessionStorage.setItem("pending_contacts_email", emailAddress);
        }
        sessionStorage.removeItem("google_contacts_reconnect_attempted");
        window.location.href = data.url;
      } else {
        toast.error("Failed to start reconnection");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reconnect Gmail");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleSyncGoogleContacts = useCallback(async (options?: { autoReconnect?: boolean; emailAddress?: string }) => {
    setActionLoading("contacts");
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(SYNC_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "sync_google",
          email_address: options?.emailAddress,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const shouldReconnect = data.needs_reconnect || data.error?.includes("reconnect") || data.error?.includes("refresh");
        if (data.needs_enable_api) {
          sessionStorage.removeItem("pending_contacts_sync");
          sessionStorage.removeItem("pending_contacts_email");
          sessionStorage.removeItem("google_contacts_reconnect_attempted");
          toast.error(data.error || "Google People API must be enabled before contacts can sync.");
          if (data.activation_url) {
            window.open(data.activation_url, "_blank", "noopener,noreferrer");
          }
        } else if (shouldReconnect) {
          const autoReconnect = options?.autoReconnect ?? true;
          const alreadyAttempted = sessionStorage.getItem("google_contacts_reconnect_attempted") === "true";

          if (autoReconnect && !alreadyAttempted) {
            sessionStorage.setItem("google_contacts_reconnect_attempted", "true");
            const availableAccounts = await fetchGmailAccounts();
            const matchingAccount = options?.emailAddress
              ? availableAccounts.find((account) => account.email === options.emailAddress)
              : undefined;

            if (matchingAccount) {
              await handleReconnectGmail(matchingAccount.id, matchingAccount.email);
              return;
            }

            if (availableAccounts.length === 1) {
              await handleReconnectGmail(availableAccounts[0].id, availableAccounts[0].email);
              return;
            }

            setShowReconnectPicker(true);
            return;
          }

          sessionStorage.removeItem("pending_contacts_sync");
          sessionStorage.removeItem("pending_contacts_email");
          sessionStorage.removeItem("google_contacts_reconnect_attempted");
          toast.error(data.error || "Google Contacts still needs permission. Reconnect from Email settings and try again.");
        } else {
          toast.error(data.error || "Failed to sync contacts");
        }
        return;
      }

      sessionStorage.removeItem("pending_contacts_sync");
      sessionStorage.removeItem("pending_contacts_email");
      sessionStorage.removeItem("google_contacts_reconnect_attempted");
      toast.success(`Synced ${data.imported} Google Contacts`);
      refresh();
    } catch {
      toast.error("Failed to sync Google Contacts");
    } finally {
      setActionLoading(null);
    }
  }, [fetchGmailAccounts, handleReconnectGmail, refresh]);

  const handleReconnectOutlook = useCallback(async () => {
    setActionLoading("outlook_contacts");
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "get_auth_url",
          provider: "outlook",
          redirect_uri: `${window.location.origin}/email-callback`,
        }),
      });
      const data = await resp.json();
      if (data.url) {
        sessionStorage.setItem("email_connect_return", "/settings?section=network");
        sessionStorage.setItem("pending_contacts_sync", "outlook");
        window.location.href = data.url;
      } else {
        toast.error("Failed to start Outlook reconnection");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reconnect Outlook");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleSyncOutlookContacts = useCallback(async (options?: { emailAddress?: string }) => {
    setActionLoading("outlook_contacts");
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(SYNC_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "sync_outlook",
          email_address: options?.emailAddress,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.needs_reconnect) {
          // Auto-initiate a fresh OAuth flow instead of just showing a toast
          toast.info("Outlook needs fresh authorization for contacts. Redirecting...");
          await handleReconnectOutlook();
          return;
        } else {
          toast.error(data.error || "Failed to sync Outlook contacts");
        }
        return;
      }
      sessionStorage.removeItem("pending_contacts_sync");
      sessionStorage.removeItem("pending_contacts_email");
      toast.success(`Synced ${data.imported} Outlook Contacts`);
      refresh();
    } catch {
      toast.error("Failed to sync Outlook Contacts");
    } finally {
      setActionLoading(null);
    }
  }, [refresh, handleReconnectOutlook]);

  // ─── Auto-sync contacts after OAuth return ───
  const pendingSyncHandled = useRef(false);
  useEffect(() => {
    if (pendingSyncHandled.current) return;

    const pending = sessionStorage.getItem("pending_contacts_sync");
    const provider = sessionStorage.getItem("last_oauth_provider");
    const emailAddress = sessionStorage.getItem("last_oauth_email") || sessionStorage.getItem("pending_contacts_email") || undefined;
    const normalizedProvider = provider === "gmail" ? "google" : provider === "outlook" ? "outlook" : null;

    if (!pending || !normalizedProvider || pending !== normalizedProvider) return;

    pendingSyncHandled.current = true;
    sessionStorage.removeItem("last_oauth_provider");
    sessionStorage.removeItem("last_oauth_email");

    const timer = setTimeout(() => {
      if (pending === "google") {
        void handleSyncGoogleContacts({ autoReconnect: false, emailAddress });
      } else if (pending === "outlook") {
        void handleSyncOutlookContacts({ emailAddress });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [handleSyncGoogleContacts, handleSyncOutlookContacts]);

  const requiredAccounts = accounts.filter((a) => a.level === "Required");
  const allRequiredConnected = requiredAccounts.every((a) => a.connected);
  const connectedCount = accounts.filter((a) => a.connected).length;

  const levelColor = (level: string) => {
    if (level === "Required") return "text-destructive";
    if (level === "Recommended") return "text-warning";
    return "text-muted-foreground";
  };

  // ─── LinkedIn CSV Import ───
  const handleLinkedInFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading("linkedin");
    try {
      const text = await file.text();
      const contacts = parseLinkedInCSV(text);
      if (contacts.length === 0) {
        toast.error("No contacts found in CSV. Make sure it's a LinkedIn connections export.");
        return;
      }
      const headers = await getAuthHeaders();
      const resp = await fetch(SYNC_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "import_linkedin_csv", contacts }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Failed to import");
        return;
      }
      toast.success(`Imported ${data.imported} LinkedIn connections`);
      refresh();
    } catch {
      toast.error("Failed to parse LinkedIn CSV");
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Phone Contacts — show dialog with options ───
  const handlePhoneContacts = () => {
    setShowPhoneDialog(true);
  };

  const handlePhoneContactPicker = async () => {
    setShowPhoneDialog(false);
    if (!("contacts" in navigator && (navigator as any).contacts?.select)) {
      toast.error("Contact Picker not supported on this device. Use paste or file upload.");
      return;
    }
    setActionLoading("phone");
    try {
      const props = ["name", "email", "tel"];
      const contacts = await (navigator as any).contacts.select(props, { multiple: true });
      if (!contacts?.length) {
        setActionLoading(null);
        return;
      }
      await submitPhoneContacts(contacts);
    } catch (e: any) {
      if (e.name !== "InvalidStateError") toast.error("Contact picker failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteContacts.trim()) return;
    setShowPhoneDialog(false);
    setActionLoading("phone");
    try {
      const lines = pasteContacts.split("\n").filter((l) => l.trim());
      const contacts = lines.map((line) => {
        const emailMatch = line.match(/[\w.+-]+@[\w.-]+\.\w+/);
        const phoneMatch = line.match(/[\d+() -]{7,}/);
        const email = emailMatch?.[0] || null;
        const phone = phoneMatch?.[0]?.trim() || null;
        let name = line;
        if (email) name = name.replace(email, "");
        if (phone) name = name.replace(phoneMatch![0], "");
        name = name.replace(/[,;|]+/g, " ").trim();
        return { name: name || null, email, tel: phone };
      }).filter((c) => c.name || c.email || c.tel);

      if (!contacts.length) {
        toast.error("No contacts found in text");
        setActionLoading(null);
        return;
      }
      await submitPhoneContacts(contacts);
      setPasteContacts("");
    } catch {
      toast.error("Failed to parse contacts");
    } finally {
      setActionLoading(null);
    }
  };

  const submitPhoneContacts = async (contacts: any[]) => {
    const headers = await getAuthHeaders();
    const resp = await fetch(SYNC_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "import_phone_contacts", contacts }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success(`Imported ${data.imported} phone contacts`);
    refresh();
  };

  const handlePhoneFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading("phone");
    try {
      const text = await file.text();
      let contacts: any[] = [];

      if (file.name.endsWith(".vcf")) {
        const cards = text.split("BEGIN:VCARD").filter(Boolean);
        contacts = cards.map((card) => {
          const getName = (s: string) => s.match(/FN[;:](.+)/)?.[1]?.trim();
          const getTel = (s: string) => s.match(/TEL[;:](.+)/)?.[1]?.trim();
          const getEmail = (s: string) => s.match(/EMAIL[;:](.+)/)?.[1]?.trim();
          return { name: getName(card), tel: getTel(card), email: getEmail(card) };
        }).filter((c) => c.name || c.tel);
      } else {
        const lines = text.split("\n");
        const headers = lines[0]?.split(",").map((h) => h.replace(/"/g, "").trim()) || [];
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i]?.split(",").map((v) => v.replace(/"/g, "").trim()) || [];
          const obj: any = {};
          headers.forEach((h, idx) => {
            obj[h.toLowerCase()] = vals[idx];
          });
          contacts.push({
            name: obj.name || obj.full_name || `${obj.first_name || ""} ${obj.last_name || ""}`.trim(),
            tel: obj.phone || obj.tel || obj.mobile,
            email: obj.email,
          });
        }
        contacts = contacts.filter((c) => c.name || c.tel);
      }

      if (!contacts.length) {
        toast.error("No contacts found in file");
        return;
      }

      const headers = await getAuthHeaders();
      const resp = await fetch(SYNC_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "import_phone_contacts", contacts }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      toast.success(`Imported ${data.imported} phone contacts`);
      refresh();
    } catch {
      toast.error("Failed to parse contacts file");
    } finally {
      setActionLoading(null);
      if (phoneFileInputRef.current) phoneFileInputRef.current.value = "";
    }
  };

  // ─── Social helpers ───
  const detectSocialPlatform = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes("instagram") || lower.includes("instagr.am")) return "instagram";
    if (lower.includes("facebook") || lower.includes("fb.com")) return "facebook";
    if (lower.includes("twitter") || lower.includes("x.com")) return "x";
    return "social";
  };

  const SOCIAL_SYNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-social`;

  // ─── Load saved profile URLs when dialog opens ───
  const loadMyProfiles = useCallback(async () => {
    if (profilesLoaded) return;
    try {
      const hdrs = await getAuthHeaders();
      const resp = await fetch(SOCIAL_SYNC_URL, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ action: "get_my_profiles" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSavedProfiles(data.profiles || []);
        const urls = { instagram: "", facebook: "", x: "" };
        for (const p of (data.profiles || [])) {
          if (p.platform in urls) urls[p.platform as keyof typeof urls] = p.url;
        }
        setMyProfileUrls(urls);
        setProfilesLoaded(true);
      }
    } catch {}
  }, [profilesLoaded]);

  // ─── Save & scrape profile URLs ───
  const handleSaveMyProfiles = async () => {
    const profiles = Object.entries(myProfileUrls)
      .filter(([, url]) => url.trim())
      .map(([platform, url]) => ({ platform, url: url.trim() }));
    if (profiles.length === 0) { toast.error("Enter at least one profile URL"); return; }
    setShowSocialDialog(false);
    setActionLoading("social");
    try {
      const hdrs = await getAuthHeaders();
      const resp = await fetch(SOCIAL_SYNC_URL, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ action: "save_my_profiles", profiles }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || "Failed to save profiles"); return; }
      const scrapeResults = data.scrape_results || [];
      const totalImported = scrapeResults.reduce((sum: number, r: any) => sum + (r.imported || 0), 0);
      const errors = scrapeResults.filter((r: any) => r.error);
      if (totalImported > 0) {
        toast.success(`Saved ${profiles.length} profile(s), imported ${totalImported} contact(s)`);
      } else if (errors.length > 0) {
        toast.info(`Profiles saved. Scraping returned limited data — platforms may block automated access. Will retry on next sync.`);
      } else {
        toast.success(`Saved ${profiles.length} profile(s)`);
      }
      setProfilesLoaded(false);
      refresh();
    } catch { toast.error("Failed to save profiles"); }
    finally { setActionLoading(null); }
  };

  // ─── Rescrape all saved profiles ───
  const handleRescrapeProfiles = async () => {
    setActionLoading("social");
    try {
      const hdrs = await getAuthHeaders();
      const resp = await fetch(SOCIAL_SYNC_URL, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ action: "rescrape_my_profiles" }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || "Rescrape failed"); return; }
      const total = (data.results || []).reduce((sum: number, r: any) => sum + (r.imported || 0), 0);
      const errors = (data.results || []).filter((r: any) => r.error);
      if (total > 0) toast.success(`Rescraped ${data.rescraped} profile(s), found ${total} contact(s)`);
      else if (errors.length > 0) toast.info(`Rescraped ${data.rescraped} profile(s). Platforms returned limited data.`);
      else toast.success(`Rescraped ${data.rescraped} profile(s)`);
      setProfilesLoaded(false);
      refresh();
    } catch { toast.error("Rescrape failed"); }
    finally { setActionLoading(null); }
  };

  // ─── Social Profile Scrape (URL) ───
  const handleSocialScrape = async () => {
    if (!socialUrl.trim()) { toast.error("Enter a profile URL"); return; }
    setShowSocialDialog(false);
    setActionLoading("social");
    try {
      const hdrs = await getAuthHeaders();
      const platform = socialPlatform || detectSocialPlatform(socialUrl);
      const resp = await fetch(SOCIAL_SYNC_URL, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ action: "scrape_profile", url: socialUrl.trim(), platform }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || "Failed to scrape profile"); return; }
      toast.success(`Imported ${data.imported} contact(s) from ${data.platform}`);
      setSocialUrl("");
      setSocialPlatform("");
      refresh();
    } catch { toast.error("Failed to scrape social profile"); }
    finally { setActionLoading(null); }
  };

  // ─── Social Handles Bulk Import ───
  const handleSocialHandlesImport = async () => {
    const lines = socialHandles.trim().split("\n").filter(Boolean);
    if (lines.length === 0) {
      toast.error("Paste at least one handle or name");
      return;
    }
    setShowSocialDialog(false);
    setActionLoading("social");
    try {
      const handles = lines.map(line => {
        const parts = line.split(/[,\t]+/).map(p => p.trim());
        const name = parts[0] || "";
        const handle = parts[1] || "";
        const company = parts[2] || "";
        const platform = handle.includes("instagram") ? "instagram"
          : handle.includes("facebook") || handle.includes("fb.com") ? "facebook"
          : handle.includes("x.com") || handle.includes("twitter") ? "x"
          : socialPlatform || "social";
        return { name, handle, company, platform, url: handle.startsWith("http") ? handle : undefined };
      }).filter(h => h.name);

      const headers = await getAuthHeaders();
      const resp = await fetch(SOCIAL_SYNC_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "import_social_handles", handles }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      toast.success(`Imported ${data.imported} social contact(s)`);
      setSocialHandles("");
      setSocialPlatform("");
      refresh();
    } catch {
      toast.error("Failed to import social contacts");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Disconnect ───
  const handleDisconnect = async (source: string) => {
    const sourceMap: Record<string, string> = {
      contacts: "google_contacts",
      outlook_contacts: "outlook_contacts",
      linkedin: "linkedin",
      phone: "phone",
      social: "social_instagram", // disconnect all social
    };
    setActionLoading(source);
    try {
      const headers = await getAuthHeaders();
      if (source === "social") {
        // Disconnect all social sources
        for (const s of ["social_instagram", "social_facebook", "social_x", "social_social"]) {
          await fetch(SYNC_URL, { method: "POST", headers, body: JSON.stringify({ action: "disconnect", source: s }) });
        }
      } else {
        await fetch(SYNC_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "disconnect", source: sourceMap[source] || source }),
        });
      }
      toast.success("Disconnected");
      refresh();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Connect action by account id ───
  const handleConnect = (id: string) => {
    if (id === "email") {
      window.location.href = "/settings?section=email";
      return;
    }
    if (id === "contacts") return handleSyncGoogleContacts();
    if (id === "outlook_contacts") return handleSyncOutlookContacts();
    if (id === "linkedin") {
      fileInputRef.current?.click();
      return;
    }
    if (id === "phone") return handlePhoneContacts();
    if (id === "social") {
      loadMyProfiles();
      setShowSocialDialog(true);
      return;
    }
  };

  if (loading) return null;

  // Hidden file inputs
  const hiddenInputs = (
    <>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleLinkedInFile} />
      <input ref={phoneFileInputRef} type="file" accept=".csv,.vcf" className="hidden" onChange={handlePhoneFile} />
    </>
  );

  // ─── Compact Variant ───
  if (variant === "compact") {
    return (
      <>
        {hiddenInputs}
        <Card className={`border ${allRequiredConnected ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const next = !collapsed;
                  setCollapsed(next);
                  try { localStorage.setItem("aura-connected-accounts-collapsed", String(next)); } catch {}
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Network className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">Connected Accounts</span>
                <Badge variant="outline" className="text-[10px]">
                  {connectedCount}/{accounts.length}
                </Badge>
                {collapsed ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
              </button>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" asChild>
                <Link to="/settings?section=network">
                  <Settings className="h-3 w-3" />
                  Manage
                </Link>
              </Button>
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-wrap gap-2 mt-2">
                  {accounts.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                        a.connected
                          ? "border-success/30 bg-success/5 text-success"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {a.connected ? (
                        <CheckCircle className="h-3 w-3 shrink-0" />
                      ) : (
                        <Circle className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{a.label}</span>
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${levelColor(a.level)}`}>
                        {a.level}
                      </Badge>
                    </div>
                  ))}
                </div>
                {!allRequiredConnected && (
                  <p className="text-[10px] text-warning mt-2">
                    All 3 required accounts connected = full brief with warm path. Any missing = research-only brief.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  // ─── Full Variant for Settings ───
  return (
    <div className="space-y-3">
      {hiddenInputs}
      {accounts.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-lg border p-3 sm:p-4 min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              a.connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {a.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.label}</p>
              {a.connected && a.detail ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <CheckCircle className="h-3 w-3 text-success shrink-0" />
                  {a.detail}
                  {a.lastSync && (
                    <span className="text-[10px] text-muted-foreground/60 ml-1">
                      · Synced {new Date(a.lastSync).toLocaleDateString()}
                    </span>
                  )}
                </p>
              ) : a.connected ? (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  Connected
                </p>
              ) : a.id === "contacts" && !accounts.find(x => x.id === "email")?.connected ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                  Connect Gmail first
                </p>
              ) : a.id === "outlook_contacts" && !a.canConnect ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                  Connect Outlook email first
                </p>
              ) : a.id === "social" && !a.connected ? (
                <p className="text-xs text-muted-foreground">Import profiles via URL scraping</p>
              ) : a.id === "linkedin" ? (
                <p className="text-xs text-muted-foreground">Upload CSV or scrape profile</p>
              ) : a.id === "phone" ? (
                <p className="text-xs text-muted-foreground">Use Contact Picker or upload CSV/vCard</p>
              ) : a.id === "outlook_contacts" ? (
                <p className="text-xs text-muted-foreground">Sync contacts from Outlook/Office 365</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {a.connected && a.canDisconnect && (
              <>
                {/* Re-sync button for contacts */}
                {(a.id === "contacts" || a.id === "outlook_contacts") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    disabled={actionLoading === a.id}
                    onClick={() => a.id === "contacts" ? handleSyncGoogleContacts() : handleSyncOutlookContacts()}
                  >
                    <RefreshCw className={`h-3 w-3 ${actionLoading === a.id ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Resync</span>
                  </Button>
                )}
                {a.id === "social" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      disabled={actionLoading === "social"}
                      onClick={handleRescrapeProfiles}
                    >
                      <RefreshCw className={`h-3 w-3 ${actionLoading === "social" ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">Rescrape</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      disabled={actionLoading === "social"}
                      onClick={() => { loadMyProfiles(); setShowSocialDialog(true); }}
                    >
                      <Settings className="h-3 w-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                  disabled={actionLoading === a.id}
                  onClick={() => handleDisconnect(a.id)}
                >
                  <Unlink className="h-3 w-3" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
              </>
            )}
            {!a.connected && a.canConnect && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={actionLoading === a.id}
                onClick={() => handleConnect(a.id)}
              >
                {actionLoading === a.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : a.id === "linkedin" ? (
                  <Upload className="h-3 w-3" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
                {a.id === "email" ? "Connect" :
                 a.id === "contacts" ? "Sync Contacts" :
                 a.id === "outlook_contacts" ? "Sync Contacts" :
                 a.id === "linkedin" ? "Upload CSV" :
                 a.id === "phone" ? "Import" :
                 a.id === "social" ? "Import Profiles" :
                 "Connect"}
              </Button>
            )}
            {!a.connected && !a.canConnect && a.id === "contacts" && (
              <Badge variant="outline" className="text-[10px] opacity-50">Requires Gmail</Badge>
            )}
            {!a.connected && !a.canConnect && a.id === "outlook_contacts" && (
              <Badge variant="outline" className="text-[10px] opacity-50">Requires Outlook</Badge>
            )}
            <Badge variant="outline" className={`text-[10px] ${levelColor(a.level)}`}>
              {a.level}
            </Badge>
          </div>
        </div>
      ))}

      {/* LinkedIn instructions */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>LinkedIn:</strong> To export your connections, go to LinkedIn →
          Settings → Data Privacy → Get a copy of your data → Select "Connections" → Download.
          Upload the resulting CSV file here.
        </p>
      </div>

      {/* Gmail Reconnect Picker Dialog */}
      <Dialog open={showReconnectPicker} onOpenChange={setShowReconnectPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reconnect Gmail for Contacts</DialogTitle>
            <DialogDescription>
              Your Gmail connection needs to be refreshed to include contacts access. Select the account to reconnect:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {gmailAccounts.map((acc) => (
              <Button
                key={acc.id}
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3"
                onClick={() => handleReconnectGmail(acc.id)}
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{acc.email}</span>
              </Button>
            ))}
            {gmailAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No Gmail accounts found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Contacts Import Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Phone Contacts</DialogTitle>
            <DialogDescription>Choose how to add your contacts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Option 1: Contact Picker (mobile) */}
            {"contacts" in navigator && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={handlePhoneContactPicker}
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium">Select from Phone</p>
                  <p className="text-[11px] text-muted-foreground">Pick contacts from your device (Chrome/Android)</p>
                </div>
              </Button>
            )}

            {/* Option 2: CSV/vCard upload */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => { setShowPhoneDialog(false); phoneFileInputRef.current?.click(); }}
            >
              <Upload className="h-4 w-4 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">Upload CSV or vCard</p>
                <p className="text-[11px] text-muted-foreground">Export contacts from your phone as .csv or .vcf and upload</p>
              </div>
            </Button>

            {/* Option 3: Paste */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium">Paste Contacts</p>
              </div>
              <Textarea
                placeholder={"John Smith, john@email.com, (555) 123-4567\nJane Doe, jane@company.com\nBob Jones, 555-987-6543"}
                value={pasteContacts}
                onChange={(e) => setPasteContacts(e.target.value)}
                rows={4}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">One contact per line: Name, email, phone (any order)</p>
              <Button
                size="sm"
                className="w-full gap-1"
                disabled={!pasteContacts.trim()}
                onClick={handlePasteSubmit}
              >
                <Plus className="h-3 w-3" />
                Import Pasted Contacts
              </Button>
            </div>

            {/* Tip about Google Contacts */}
            <div className="rounded-md bg-muted/50 p-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Tip:</strong> If your phone contacts sync to Google, they'll be imported automatically when you connect Google Contacts above.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Profile Import Dialog */}
      <Dialog open={showSocialDialog} onOpenChange={setShowSocialDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-primary" />
              Social Profiles & Contacts
            </DialogTitle>
            <DialogDescription>
              Paste your own profile URLs to scrape & audit for contacts. Rescans happen when you hit Rescrape.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* ─── YOUR PROFILES SECTION ─── */}
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Your Profile URLs
              </label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Paste your own Instagram, Facebook, or X profile URL. We'll scrape public data and extract contacts.
              </p>
              <div className="space-y-2">
                {([
                  { key: "instagram" as const, label: "Instagram", placeholder: "https://instagram.com/yourprofile", icon: "📸" },
                  { key: "facebook" as const, label: "Facebook", placeholder: "https://facebook.com/yourpage", icon: "📘" },
                  { key: "x" as const, label: "X / Twitter", placeholder: "https://x.com/yourhandle", icon: "𝕏" },
                ] as const).map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <span className="text-base w-6 text-center shrink-0">{p.icon}</span>
                    <input
                      type="url"
                      placeholder={p.placeholder}
                      value={myProfileUrls[p.key]}
                      onChange={(e) => setMyProfileUrls(prev => ({ ...prev, [p.key]: e.target.value }))}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}
              </div>
              {savedProfiles.length > 0 && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  {savedProfiles.map((sp) => (
                    <p key={sp.platform} className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-success shrink-0" />
                      {sp.platform}: {sp.contact_count || 0} contacts
                      {sp.last_sync && <span className="text-muted-foreground/60">· Last sync {new Date(sp.last_sync).toLocaleDateString()}</span>}
                    </p>
                  ))}
                </div>
              )}
              <Button
                className="w-full gap-2"
                disabled={!myProfileUrls.instagram && !myProfileUrls.facebook && !myProfileUrls.x || actionLoading === "social"}
                onClick={handleSaveMyProfiles}
              >
                {actionLoading === "social" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Save & Scrape Profiles
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or add contacts manually</span>
              </div>
            </div>

            {/* ─── PASTE HANDLES ─── */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Paste Names & Handles
              </label>
              <Textarea
                placeholder={"John Smith, @johnsmith_ig, Acme Corp\nJane Doe, https://instagram.com/janedoe\nBob Builder, @bob_x"}
                value={socialHandles}
                onChange={(e) => setSocialHandles(e.target.value)}
                rows={4}
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                One per line: <span className="font-medium">Name, Handle/URL, Company</span> (comma or tab separated)
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "Instagram", platform: "instagram", icon: "📸" },
                { name: "Facebook", platform: "facebook", icon: "📘" },
                { name: "X / Twitter", platform: "x", icon: "𝕏" },
              ].map((p) => (
                <Button
                  key={p.name}
                  variant={socialPlatform === p.platform ? "default" : "outline"}
                  size="sm"
                  className="h-auto py-2 text-xs flex-col gap-1"
                  onClick={() => setSocialPlatform(p.platform)}
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.name}
                </Button>
              ))}
            </div>

            <Button
              className="w-full gap-2"
              variant="outline"
              disabled={!socialHandles.trim() || actionLoading === "social"}
              onClick={handleSocialHandlesImport}
            >
              {actionLoading === "social" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import Contacts
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or scrape a public URL</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="url"
                placeholder="https://company.com/team or public profile URL"
                value={socialUrl}
                onChange={(e) => {
                  setSocialUrl(e.target.value);
                  setSocialPlatform(detectSocialPlatform(e.target.value));
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={!socialUrl.trim() || actionLoading === "social"}
                onClick={handleSocialScrape}
              >
                <Network className="h-3.5 w-3.5" />
                Scrape & Import
              </Button>
            </div>

            <div className="rounded-md bg-muted/50 p-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>How it works:</strong> We attempt to scrape your public profile pages for contacts, followers, and connections. Some platforms limit what's publicly visible — we'll extract whatever is available and re-audit on each rescrape.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
