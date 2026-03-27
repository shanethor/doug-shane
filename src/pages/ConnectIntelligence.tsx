import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Network, Search, Users, Mail, Settings, Loader2,
  Zap, Shield, BarChart3, Plus, X, RefreshCw,
  ExternalLink, CheckCircle, Wifi, WifiOff, Globe,
  Linkedin, Facebook, Phone, Database,
} from "lucide-react";
import { toast } from "sonner";
import InlineContactEditor from "@/components/connect/InlineContactEditor";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { useAuth } from "@/hooks/useAuth";
import PrivacySettings from "@/components/connect/PrivacySettings";
import FeederListAnalytics from "@/components/connect/FeederListAnalytics";
import RelationshipMap from "@/components/connect/RelationshipMap";

// ─── Types ───
interface DiscoveredContact {
  id: string;
  email_address: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  domain: string | null;
  hunter_verified: boolean | null;
  hunter_confidence: number | null;
  hunter_position: string | null;
  hunter_company: string | null;
  hunter_linkedin_url: string | null;
  hunter_phone: string | null;
  prospect_score: number | null;
  email_frequency: number;
  enrichment_status: string;
  status: string;
  first_seen_at: string;
}

interface ProspectProfile {
  id: string;
  name: string;
  life_event_triggers: string[];
  age_range_min: number | null;
  age_range_max: number | null;
  location_radius_miles: number;
  industry_preferences: string[];
  exclude_existing_contacts: boolean;
  connection_depth: number;
  is_default: boolean;
}

interface ConnectedAccount {
  id: string;
  provider: string;
  email_address: string;
  is_active: boolean;
  updated_at: string;
}

// ─── Email Intelligence ───
// Smart filter: exclude business/marketing/noreply emails, keep real people
const BUSINESS_EMAIL_PREFIXES = [
  "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
  "info@", "support@", "help@", "admin@", "sales@", "marketing@",
  "billing@", "team@", "hello@", "contact@", "newsletter@",
  "notifications@", "updates@", "mailer-daemon", "postmaster@",
  "abuse@", "security@", "feedback@", "service@", "customerservice@",
  "accounts@", "orders@", "receipts@", "invoice@", "payments@",
  "unsubscribe@", "subscribe@", "bounces@", "alerts@", "system@",
  "automated@", "auto@", "bot@", "daemon@", "webmaster@",
  "news@", "press@", "media@", "pr@", "hr@", "careers@", "jobs@",
  "compliance@", "legal@", "privacy@", "office@",
];
const BUSINESS_EMAIL_DOMAINS = [
  "mailchimp.com", "sendgrid.net", "amazonses.com", "mailgun.org",
  "constantcontact.com", "hubspot.com", "salesforce.com", "zendesk.com",
  "intercom.io", "freshdesk.com", "notifications.google.com",
  "facebookmail.com", "linkedin.com", "indeed.com", "glassdoor.com",
  "noreply.github.com", "stripe.com", "paypal.com", "intuit.com",
];

function isBusinessOrMarketingEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const localPart = lower.split("@")[0];
  const domain = lower.split("@")[1] || "";
  if (BUSINESS_EMAIL_PREFIXES.some(p => localPart.startsWith(p.replace("@", "")))) return true;
  if (BUSINESS_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith("." + d))) return true;
  if (/^\d+$/.test(localPart)) return true;
  if (/^[a-f0-9]{20,}$/.test(localPart)) return true;
  return false;
}

/** Detect if display_name is a company name or URL rather than a person */
function isCompanyOrUrl(c: { display_name: string | null; first_name: string | null; last_name: string | null; domain: string | null }): boolean {
  const name = (c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()).toLowerCase();
  if (!name) return false;
  // URLs
  if (/^https?:\/\//.test(name) || /\.(com|net|org|io|co|gov|edu|biz|info)\b/.test(name)) return true;
  // Company indicators: contains LLC, Inc, Corp, Ltd, &, or is a single word with no spaces (brand names like "Starbucks")
  if (/\b(llc|inc|corp|ltd|gmbh|co\.|group|agency|insurance|services|solutions)\b/i.test(name)) return true;
  // Has "&" like "Ford Kia & CARFAX"
  if (name.includes("&")) return true;
  // All caps single word > 5 chars (brand acronyms like "CARFAX")
  const original = c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  if (original && /^[A-Z]{4,}$/.test(original.trim())) return true;
  return false;
}

function hasRealName(c: DiscoveredContact): boolean {
  const name = c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  if (!name || name.length < 2) return false;
  // Filter out names that are just email addresses
  if (name.includes("@")) return false;
  return true;
}

function EmailIntelligencePage() {
  const [contacts, setContacts] = useState<DiscoveredContact[]>([]);
  const [unlabeled, setUnlabeled] = useState<DiscoveredContact[]>([]);
  const [savedContacts, setSavedContacts] = useState<DiscoveredContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"all" | "high_score" | "verified" | "unlabeled" | "saved">("all");
  const [showFiltered, setShowFiltered] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setLoading(true);
    // Load active (unsaved, undismissed) contacts
    const { data } = await supabase
      .from("email_discovered_contacts" as any)
      .select("*")
      .not("status", "eq", "dismissed")
      .order("first_seen_at", { ascending: false })
      .limit(200);
    const raw = (data as any as DiscoveredContact[]) || [];

    // Separate saved vs active
    const active = raw.filter(c => c.status !== "saved_to_contacts");
    const saved = raw.filter(c => c.status === "saved_to_contacts");

    // Separate: named people vs email-only (unlabeled) from active only
    const nonBusiness = active.filter(c => !isBusinessOrMarketingEmail(c.email_address) && !isCompanyOrUrl(c));
    const people = nonBusiness.filter(c => hasRealName(c));
    const emailOnly = nonBusiness.filter(c => !hasRealName(c));
    setContacts(people);
    setUnlabeled(emailOnly);
    setSavedContacts(saved.filter(c => !isBusinessOrMarketingEmail(c.email_address) && !isCompanyOrUrl(c)));
    setLoading(false);
  }

  async function runSync() {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-email-contacts`, {
        method: "POST", headers, body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Discovered ${data.discovered} new contacts, enriched ${data.enriched}`);
        loadContacts();
      } else toast.error(data.error || "Sync failed");
    } catch { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  }

  async function dismissContact(id: string) {
    await supabase.from("email_discovered_contacts" as any).update({ status: "dismissed" }).eq("id", id);
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  async function saveContact(id: string) {
    const contact = [...contacts, ...unlabeled].find(c => c.id === id);
    if (!contact) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not authenticated"); return; }

      // Create canonical_persons record
      const { error: insertErr } = await supabase.from("canonical_persons").insert({
        owner_user_id: user.id,
        display_name: contact.display_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || null,
        primary_email: contact.email_address,
        company: contact.hunter_company || null,
        title: contact.hunter_position || null,
        linkedin_url: contact.hunter_linkedin_url || null,
        primary_phone: contact.hunter_phone || null,
        tier: (contact.prospect_score || 0) >= 80 ? "A" : (contact.prospect_score || 0) >= 60 ? "B" : "C",
        metadata: {
          source: "email_discovery",
          prospect_score: contact.prospect_score,
          hunter_verified: contact.hunter_verified,
          email_frequency: contact.email_frequency,
        },
      });
      if (insertErr) throw insertErr;

      // Update discovered contact status and link
      await supabase.from("email_discovered_contacts" as any).update({ status: "saved_to_contacts" }).eq("id", id);

      // Move from active lists to saved list
      const savedContact = { ...contact, status: "saved_to_contacts" };
      setContacts(prev => prev.filter(c => c.id !== id));
      setUnlabeled(prev => prev.filter(c => c.id !== id));
      setSavedContacts(prev => [savedContact, ...prev]);
      toast.success("Saved to contacts");
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact");
    }
  }

  const displayList = filter === "unlabeled" ? unlabeled
    : filter === "saved" ? savedContacts
    : contacts.filter(c => {
      if (filter === "high_score") return (c.prospect_score || 0) >= 70;
      if (filter === "verified") return c.hunter_verified === true;
      return true;
    });

  const newThisWeek = contacts.filter(c => new Date(c.first_seen_at) >= new Date(Date.now() - 7 * 86400000)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Inbox Discoveries</h2>
          <p className="text-xs text-muted-foreground">Contacts found automatically from your email activity.</p>
        </div>
        <div className="flex gap-2">
          {newThisWeek > 0 && <Badge className="bg-primary">{newThisWeek} new</Badge>}
          <Button variant="outline" size="sm" onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Scan
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "high_score", "verified", "unlabeled", "saved"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="text-xs">
            {f === "all" ? "All" : f === "high_score" ? "Score 70+" : f === "verified" ? "Verified ✓" : f === "unlabeled" ? `Unlabeled (${unlabeled.length})` : `Saved (${savedContacts.length})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : displayList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No contacts discovered yet</p>
            <p className="text-sm text-muted-foreground mt-1">Connect your email and run a scan.</p>
            <Button className="mt-4" onClick={runSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Run First Scan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
           {displayList.map(c => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="py-3 px-4">
                {filter === "saved" ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.display_name || c.email_address}</p>
                      {c.display_name && <p className="text-xs text-muted-foreground truncate">{c.email_address}</p>}
                      {c.hunter_company && <p className="text-xs text-muted-foreground">{c.hunter_company}{c.hunter_position ? ` · ${c.hunter_position}` : ""}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">Saved</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Remove from saved"
                        onClick={async () => {
                          await supabase.from("email_discovered_contacts" as any).update({ status: "new" }).eq("id", c.id);
                          setSavedContacts(prev => prev.filter(sc => sc.id !== c.id));
                          setContacts(prev => [{ ...c, status: "new" }, ...prev]);
                          toast.success("Removed from saved");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <InlineContactEditor
                    contact={c}
                    onUpdate={(id, updates) => {
                      setContacts(prev => prev.map(ct => ct.id === id ? { ...ct, ...updates } : ct));
                      setUnlabeled(prev => prev.map(ct => ct.id === id ? { ...ct, ...updates } : ct));
                    }}
                    onSave={saveContact}
                    onDismiss={dismissContact}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Connection Manager with Direct Linking ───
function ConnectionManagerPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConnections(); }, []);

  async function loadConnections() {
    setLoading(true);
    const { data } = await supabase
      .from("email_connections" as any)
      .select("id, provider, email_address, is_active, updated_at")
      .order("created_at", { ascending: false });
    setConnections((data as any as ConnectedAccount[]) || []);
    setLoading(false);
  }

  function startOAuth(provider: string) {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const redirect = `${window.location.origin}/email/callback`;
    window.location.href = `${base}/functions/v1/email-oauth?action=authorize&provider=${provider}&redirect_uri=${encodeURIComponent(redirect)}`;
  }

  const providerIcon = (provider: string) => {
    if (provider.includes("google") || provider.includes("gmail")) return <Mail className="h-4 w-4 text-red-400" />;
    if (provider.includes("microsoft") || provider.includes("outlook")) return <Mail className="h-4 w-4 text-blue-400" />;
    if (provider.includes("linkedin")) return <Linkedin className="h-4 w-4 text-blue-500" />;
    if (provider.includes("facebook")) return <Facebook className="h-4 w-4 text-blue-600" />;
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  };

  const LINKABLE_SOURCES = [
    { provider: "google", label: "Gmail / Google", desc: "Email, Contacts, Calendar", icon: <Mail className="h-5 w-5 text-red-400" />, action: () => startOAuth("google") },
    { provider: "microsoft", label: "Outlook / Microsoft", desc: "Email, Contacts, Calendar", icon: <Mail className="h-5 w-5 text-blue-400" />, action: () => startOAuth("microsoft") },
    { provider: "linkedin", label: "LinkedIn", desc: "Professional network contacts", icon: <Linkedin className="h-5 w-5 text-blue-500" />, action: null },
    { provider: "facebook", label: "Facebook", desc: "Social connections & pages", icon: <Facebook className="h-5 w-5 text-blue-600" />, action: null },
    { provider: "phone", label: "Phone / Apple Contacts", desc: "Import contacts from your phone or iCloud", icon: <Phone className="h-5 w-5 text-green-400" />, action: null },
  ];

  const connectedProviders = new Set(connections.filter(c => c.is_active).map(c => c.provider));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Data Sources
        </h2>
        <p className="text-xs text-muted-foreground">Link accounts to expand your network intelligence and reach more connections.</p>
      </div>

      {/* Link New Accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Link an Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {LINKABLE_SOURCES.map(source => {
            const isConnected = connectedProviders.has(source.provider);
            return (
              <div key={source.provider} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">{source.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{source.label}</p>
                    <p className="text-[11px] text-muted-foreground">{source.desc}</p>
                  </div>
                </div>
                {isConnected ? (
                  <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> Connected</Badge>
                ) : source.action ? (
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={source.action}>
                    <Plus className="h-3 w-3" /> Connect
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Active Connections */}
      {connections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                  {providerIcon(conn.provider)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{conn.email_address}</p>
                    {conn.is_active ? (
                      <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-0.5"><Wifi className="h-2.5 w-2.5" /> Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-0.5"><WifiOff className="h-2.5 w-2.5" /> Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{conn.provider} · Last synced {new Date(conn.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enrichment API Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "People Data Labs", status: "active", icon: Users },
          { label: "Apollo.io", status: "active", icon: Search },
          { label: "Hunter.io", status: "active", icon: Mail },
          { label: "Data365", status: "pending", icon: Globe },
        ].map(source => (
          <Card key={source.label}>
            <CardContent className="py-3 px-3 text-center">
              <source.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] font-medium">{source.label}</p>
              <Badge variant={source.status === "active" ? "default" : "secondary"} className="text-[9px] mt-1">
                {source.status === "active" ? "✓ Connected" : "⏳ Pending"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Prospect Profile Settings ───
function ProspectSettingsPage() {
  const [profiles, setProfiles] = useState<ProspectProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultTriggers = ["new_baby", "marriage", "home_purchase", "job_change", "retirement", "college_children", "business_ownership"];
  const defaultIndustries = ["Finance", "Healthcare", "Real Estate", "Technology", "Consulting", "Legal", "Insurance", "Marketing"];

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase.from("prospect_profiles" as any).select("*").order("created_at", { ascending: false });
    setProfiles((data as any as ProspectProfile[]) || []);
    setLoading(false);
  }

  async function createDefault() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("prospect_profiles" as any).insert({
      name: "Default", producer_id: user.id,
      life_event_triggers: ["new_baby", "marriage", "home_purchase", "job_change"],
      location_radius_miles: 50, exclude_existing_contacts: true, connection_depth: 2, is_default: true,
    } as any);
    loadProfiles();
    toast.success("Default profile created");
  }

  async function toggleTrigger(profileId: string, trigger: string) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const triggers = profile.life_event_triggers.includes(trigger)
      ? profile.life_event_triggers.filter(t => t !== trigger)
      : [...profile.life_event_triggers, trigger];
    await supabase.from("prospect_profiles" as any).update({ life_event_triggers: triggers } as any).eq("id", profileId);
    loadProfiles();
  }

  async function toggleIndustry(profileId: string, industry: string) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const industries = profile.industry_preferences.includes(industry)
      ? profile.industry_preferences.filter(i => i !== industry)
      : [...profile.industry_preferences, industry];
    await supabase.from("prospect_profiles" as any).update({ industry_preferences: industries } as any).eq("id", profileId);
    loadProfiles();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Ideal Prospect Configuration</h2>
        <p className="text-xs text-muted-foreground">Define what you're looking for to improve AI scoring.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No prospect profile configured</p>
            <Button className="mt-4" onClick={createDefault}><Plus className="h-4 w-4 mr-2" /> Create Default Profile</Button>
          </CardContent>
        </Card>
      ) : (
        profiles.map(profile => (
          <Card key={profile.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{profile.name}</CardTitle>
                {profile.is_default && <Badge>Default</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Life Event Triggers</p>
                <div className="flex flex-wrap gap-2">
                  {defaultTriggers.map(trigger => (
                    <Button key={trigger} variant={profile.life_event_triggers.includes(trigger) ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => toggleTrigger(profile.id, trigger)}>
                      {trigger === "new_baby" ? "🍼" : trigger === "marriage" ? "💍" : trigger === "home_purchase" ? "🏠" : trigger === "job_change" ? "💼" : trigger === "retirement" ? "🏖️" : trigger === "college_children" ? "🎓" : "🏢"}{" "}
                      {trigger.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Industry Preferences</p>
                <div className="flex flex-wrap gap-2">
                  {defaultIndustries.map(ind => (
                    <Button key={ind} variant={profile.industry_preferences.includes(ind) ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => toggleIndustry(profile.id, ind)}>
                      {ind}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><p className="text-xs text-muted-foreground">Radius</p><p className="font-medium">{profile.location_radius_miles} mi</p></div>
                <div><p className="text-xs text-muted-foreground">Depth</p><p className="font-medium">{profile.connection_depth === 1 ? "1st" : "1st + 2nd"}</p></div>
                <div><p className="text-xs text-muted-foreground">Exclude Existing</p><p className="font-medium">{profile.exclude_existing_contacts ? "Yes" : "No"}</p></div>
                <div><p className="text-xs text-muted-foreground">Age Range</p><p className="font-medium">{profile.age_range_min && profile.age_range_max ? `${profile.age_range_min}–${profile.age_range_max}` : "Any"}</p></div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Main Connect Intelligence Page (Data Hub) ───
export default function ConnectIntelligencePage() {
  const [tab, setTab] = useState("inbox");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Connect Intelligence</h1>
          <p className="text-sm text-muted-foreground">Data sources, contact discovery & network analytics</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="inbox" className="text-xs"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Inbox</TabsTrigger>
          <TabsTrigger value="connections" className="text-xs"><Database className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sources</TabsTrigger>
          <TabsTrigger value="map" className="text-xs"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Map</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Prospect</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox"><EmailIntelligencePage /></TabsContent>
        <TabsContent value="connections"><ConnectionManagerPage /></TabsContent>
        <TabsContent value="map"><RelationshipMap /></TabsContent>
        <TabsContent value="analytics"><FeederListAnalytics /></TabsContent>
        <TabsContent value="settings"><ProspectSettingsPage /></TabsContent>
        <TabsContent value="privacy"><PrivacySettings /></TabsContent>
      </Tabs>
    </div>
  );
}
