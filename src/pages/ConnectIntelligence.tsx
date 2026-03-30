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
  Linkedin, Facebook, Phone, Database, Building2,
  Filter, ArrowUpFromLine, Eye, EyeOff, List, Trash2,
  Briefcase, UserX, Bot, HelpCircle, Tag,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import InlineContactEditor from "@/components/connect/InlineContactEditor";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { useAuth } from "@/hooks/useAuth";
import PrivacySettings from "@/components/connect/PrivacySettings";
import FeederListAnalytics from "@/components/connect/FeederListAnalytics";
import RelationshipMap from "@/components/connect/RelationshipMap";
import { IntelligenceDiscountBanner } from "@/components/IntelligencePricing";

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
  contact_type?: string;
  contact_score?: number;
  filtered?: boolean;
  profile_photo_url?: string | null;
  location?: string | null;
  twitter_url?: string | null;
  enrichment_source?: string | null;
  employment_history?: any[] | null;
  classification_type?: string | null;
  classification_confidence?: number | null;
  is_filtered?: boolean | null;
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

// ─── Classification Types ───
type ClassificationType = "person_business" | "person_personal" | "company" | "spam_or_system" | "unknown";

const FAMILY_NAMES = new Set([
  "mom", "dad", "mama", "papa", "honey", "babe", "baby", "wifey", "hubby",
  "sis", "bro", "brother", "sister", "grandma", "grandpa", "nana", "granny",
  "auntie", "uncle", "cousin", "sweetheart", "darling", "love",
]);

const SPAM_SYSTEM_NAMES = new Set([
  "do not reply", "donotreply", "no reply", "noreply", "no-reply",
  "notification", "notifications", "support team", "customer service",
  "mailer-daemon", "postmaster", "system", "automated", "auto-reply",
  "newsletter", "unsubscribe", "marketing", "promotions", "deals",
]);

// ─── Spam / Classification Helpers ───
const BUSINESS_EMAIL_PREFIXES = [
  "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
  "info", "support", "help", "admin", "sales", "marketing",
  "billing", "team", "hello", "contact", "newsletter",
  "notifications", "updates", "mailer-daemon", "postmaster",
  "abuse", "security", "feedback", "service", "customerservice",
  "accounts", "orders", "receipts", "invoice", "payments",
  "unsubscribe", "subscribe", "bounces", "alerts", "system",
  "automated", "auto", "auto-confirm", "auto-reply",
  "bot", "daemon", "webmaster",
  "news", "press", "media", "pr", "hr", "careers", "jobs",
  "compliance", "legal", "privacy", "office",
  "promo", "promotions", "deals", "offers", "rewards",
  "delivery", "shipping", "tracking",
];

const ESP_DOMAINS = [
  "sendgrid.net", "mailchimp.com", "constantcontact.com", "hubspot.com",
  "hs-send.com", "hubspotfree.com", "salesforce.com", "marketo.com",
  "mailgun.org", "amazonses.com", "intercom.io", "zendesk.com",
  "freshdesk.com", "notifications.google.com", "facebookmail.com",
  "linkedin.com", "indeed.com", "glassdoor.com", "noreply.github.com",
  "stripe.com", "paypal.com", "intuit.com",
  "lhmailer.com", "flyporter.com", "espnmail.com",
  "communications.yahoo.com", "virginamerica.com",
  "bluemountain.com", "e.united.com", "news.united.com",
  "mail.hunter.io", "us-edm.zip.co",
  "amazon.com", "apple.com",
];

// SMS/MMS gateway domains — these are phone numbers, not real email contacts
const SMS_MMS_GATEWAY_DOMAINS = [
  "mms.att.net", "txt.att.net", "vtext.com", "vzwpix.com",
  "tmomail.net", "tmobile.net", "msg.fi.google.com",
  "messaging.sprintpcs.com", "pm.sprint.com", "sms.myboostmobile.com",
  "mymetropcs.com", "mmst5.tracfone.com", "mypixmessages.com",
  "cingularme.com", "messaging.nextel.com", "page.nextel.com",
  "email.uscc.net", "cwemail.com", "rinasms.com",
  "sms.cricketwireless.net", "mms.cricketwireless.net",
  "text.republicwireless.com", "msg.koodomobile.com",
  "pcs.rogers.com", "txt.bellmobility.ca", "fido.ca",
  "txt.freedommobile.ca", "msg.telus.com",
];

// Subdomain patterns for transactional/marketing senders
const TRANSACTIONAL_SUBDOMAIN_RE = /^(em\d*|mail|edm|us-edm|email|e|news|notify|promo|comms?|campaign|mailer|bounce|sg|mkt)\./i;

const PERSONAL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "att.net", "sbcglobal.net", "hotmail.ca", "sympatico.ca", "aol.com",
  "protonmail.com", "me.com", "live.com", "msn.com",
];

function classifyContact(c: DiscoveredContact): { type: ClassificationType; score: number; isFiltered: boolean } {
  const email = (c.email_address || "").toLowerCase();
  const name = (c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()).toLowerCase().trim();

  // Use server-side classification if available
  if (c.classification_type && c.classification_type !== "unknown") {
    return {
      type: c.classification_type as ClassificationType,
      score: (c.classification_confidence || 0.5) * 100,
      isFiltered: c.is_filtered ?? false,
    };
  }

  if (!email || !email.includes("@")) {
    // No email — classify by name only
    if (!name || name.length < 2) return { type: "unknown", score: 0, isFiltered: true };
    const nameParts = name.split(/\s+/).filter(Boolean);
    if (nameParts.length === 1 && FAMILY_NAMES.has(nameParts[0])) {
      return { type: "person_personal", score: 90, isFiltered: true };
    }
    if (SPAM_SYSTEM_NAMES.has(name)) {
      return { type: "spam_or_system", score: 90, isFiltered: true };
    }
    if (/\b(llc|inc|corp|ltd|gmbh|co\.|group|agency|insurance|services|solutions|team|service)\b/i.test(name)) {
      return { type: "company", score: 50, isFiltered: false };
    }
    const parts = name.split(/\s+/);
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) return { type: "person_business", score: 60, isFiltered: false };
    return { type: "unknown", score: 30, isFiltered: false };
  }

  const localPart = email.split("@")[0];
  const domain = email.split("@")[1] || "";

  // Auto-filter: SMS/MMS gateway domains
  if (SMS_MMS_GATEWAY_DOMAINS.some(d => domain === d || domain.endsWith("." + d))) {
    return { type: "spam_or_system", score: 0, isFiltered: true };
  }
  // Auto-filter: spam prefixes
  if (BUSINESS_EMAIL_PREFIXES.some(p => localPart === p || localPart.startsWith(p + "-") || localPart.startsWith(p + ".") || localPart.startsWith(p + "+"))) {
    return { type: "spam_or_system", score: 0, isFiltered: true };
  }
  // Auto-filter: ESP / brand domain
  if (ESP_DOMAINS.some(d => domain === d || domain.endsWith("." + d))) {
    return { type: "spam_or_system", score: 0, isFiltered: true };
  }
  // Auto-filter: transactional subdomain pattern
  if (TRANSACTIONAL_SUBDOMAIN_RE.test(domain)) {
    return { type: "spam_or_system", score: 0, isFiltered: true };
  }
  // Auto-filter: numeric-only local parts
  if (/^\d+$/.test(localPart) || /^[a-f0-9]{20,}$/.test(localPart) || /^\d{7,}/.test(localPart)) {
    return { type: "spam_or_system", score: 0, isFiltered: true };
  }

  // Name-based checks
  if (SPAM_SYSTEM_NAMES.has(name)) {
    return { type: "spam_or_system", score: 90, isFiltered: true };
  }
  const nameParts = name.split(/\s+/).filter(Boolean);
  if (nameParts.length === 1 && FAMILY_NAMES.has(nameParts[0])) {
    return { type: "person_personal", score: 90, isFiltered: true };
  }
  // Single short token with no useful info
  if (nameParts.length === 1 && nameParts[0].length <= 3 && !c.hunter_company) {
    return { type: "unknown", score: 20, isFiltered: true };
  }

  // Company keyword detection
  if (/\b(llc|inc|corp|ltd|gmbh|co\.|group|agency|insurance|services|solutions|team|service)\b/i.test(name)) {
    return { type: "company", score: 70, isFiltered: false };
  }

  // Person classification
  const isPersonalDomain = PERSONAL_DOMAINS.includes(domain);
  const hasFirstLast = nameParts.length >= 2 && nameParts[0].length > 1 && nameParts[1].length > 1;

  if (hasFirstLast && !isPersonalDomain) {
    return { type: "person_business", score: 85, isFiltered: false };
  }
  if (hasFirstLast && isPersonalDomain) {
    return { type: "person_personal", score: 60, isFiltered: false };
  }
  if (hasFirstLast) {
    return { type: "person_business", score: 60, isFiltered: false };
  }

  // Brand/URL detection
  const originalName = c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  if (originalName && /^[A-Z]{4,}$/.test(originalName.trim())) {
    return { type: "company", score: 40, isFiltered: false };
  }
  if (/^https?:\/\//.test(name) || /\.(com|net|org|io)\b/.test(name)) {
    return { type: "company", score: 40, isFiltered: false };
  }

  if (!name || name.length < 2 || name.includes("@")) {
    return { type: "unknown", score: 20, isFiltered: true };
  }

  return { type: "unknown", score: 40, isFiltered: false };
}

// ─── Email Intelligence ───
function EmailIntelligencePage() {
  const [allContacts, setAllContacts] = useState<DiscoveredContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [inboxTab, setInboxTab] = useState<"person_business" | "company" | "person_personal" | "spam_or_system" | "unknown" | "saved_people" | "saved_companies">("person_business");
  const [savedEntityFilter, setSavedEntityFilter] = useState<"people" | "companies">("people");
  const [hideLowQuality, setHideLowQuality] = useState(true);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setLoading(true);
    // Load email-discovered contacts
    const { data: emailContacts } = await supabase
      .from("email_discovered_contacts" as any)
      .select("*")
      .not("status", "eq", "dismissed")
      .order("first_seen_at", { ascending: false })
      .limit(500);

    // Also load network contacts from synced sources (iCloud, Google, etc.)
    const { data: networkContacts } = await supabase
      .from("network_contacts")
      .select("id, full_name, email, phone, company, title, source, location, linkedin_url, imported_at, user_id, classification_type, classification_confidence, is_filtered")
      .order("imported_at", { ascending: false })
      .limit(1000);

    // Get IDs of email contacts already known, to avoid duplicates
    const emailSet = new Set((emailContacts || []).map((c: any) => c.email_address?.toLowerCase()).filter(Boolean));

    // Clean vCard artifacts from names and emails (&#13;, trailing whitespace, etc.)
    function cleanVCard(value: string | null): string | null {
      if (!value) return null;
      return value
        .replace(/&#\d+;?/g, "")   // remove HTML entities like &#13;
        .replace(/\r|\n/g, "")      // remove actual CR/LF
        .replace(/\s+/g, " ")       // collapse whitespace
        .trim() || null;
    }
    const cleanName = cleanVCard;

    // Map network contacts into DiscoveredContact shape — include contacts with OR without email
    const mappedNetwork: DiscoveredContact[] = (networkContacts || [])
      .filter((nc: any) => {
        // Skip if this email is already in email_discovered_contacts
        if (nc.email && emailSet.has(nc.email.toLowerCase())) return false;
        // Must have at least a name, email, or phone
        return nc.full_name || nc.email || nc.phone;
      })
      .map((nc: any) => {
        const cleanedName = cleanName(nc.full_name);
        return {
          id: nc.id,
          email_address: cleanVCard(nc.email) || "",
          display_name: cleanedName,
          first_name: cleanedName?.split(" ")[0] || null,
          last_name: cleanedName?.split(" ").slice(1).join(" ") || null,
          domain: nc.email ? nc.email.split("@")[1] : null,
          hunter_verified: null,
          hunter_confidence: null,
          hunter_position: nc.title,
          hunter_company: nc.company,
          hunter_linkedin_url: nc.linkedin_url,
          hunter_phone: nc.phone,
          prospect_score: null,
          email_frequency: 0,
          enrichment_status: "synced",
          status: "active",
          first_seen_at: nc.imported_at,
          contact_type: null,
          contact_score: null,
          filtered: false,
          location: nc.location,
          enrichment_source: nc.source,
          classification_type: nc.classification_type || null,
          classification_confidence: nc.classification_confidence || null,
          is_filtered: nc.is_filtered || false,
        } as DiscoveredContact;
      });

    setAllContacts([...(emailContacts as any as DiscoveredContact[] || []), ...mappedNetwork]);
    setLoading(false);
  }

  // Classify contacts into tabs
  const saved = allContacts.filter(c => c.status === "saved_to_contacts");
  const savedPeople = saved.filter(c => c.contact_type !== "company");
  const savedCompanies = saved.filter(c => c.contact_type === "company");
  const active = allContacts.filter(c => c.status !== "saved_to_contacts");

  const classified = active.map(c => {
    const { type, score, isFiltered } = classifyContact(c);
    return { ...c, _type: type, _score: score, _isFiltered: isFiltered };
  });

  // Apply low-quality filter
  const qualityFilter = (c: typeof classified[0]) => {
    if (!hideLowQuality) return true;
    if (c._isFiltered) return false;
    // Hide single interaction + no name + no reply
    if (c._score < 50 && c.email_frequency <= 1 && !c.display_name) return false;
    return true;
  };

  const personBusiness = classified.filter(c => c._type === "person_business" && qualityFilter(c));
  const companies = classified.filter(c => c._type === "company" && qualityFilter(c));
  const personPersonal = classified.filter(c => c._type === "person_personal");
  const spamOrSystem = classified.filter(c => c._type === "spam_or_system");
  const unknown = classified.filter(c => c._type === "unknown");

  const displayList = inboxTab === "person_business" ? personBusiness
    : inboxTab === "company" ? companies
    : inboxTab === "person_personal" ? personPersonal
    : inboxTab === "spam_or_system" ? spamOrSystem
    : inboxTab === "unknown" ? unknown
    : inboxTab === "saved_people" ? savedPeople
    : savedCompanies;

  const newThisWeek = personBusiness.filter(c => new Date(c.first_seen_at) >= new Date(Date.now() - 7 * 86400000)).length;

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

  async function runClassify() {
    setClassifying(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-contacts`, {
        method: "POST", headers, body: JSON.stringify({ force: true }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Classified ${data.classified} contacts (${data.filtered} filtered)`);
        loadContacts();
      } else toast.error(data.error || "Classification failed");
    } catch { toast.error("Classification failed"); }
    finally { setClassifying(false); }
  }

  async function dismissContact(id: string) {
    await supabase.from("email_discovered_contacts" as any).update({ status: "dismissed", is_filtered: true, filtered: true } as any).eq("id", id);
    setAllContacts(prev => prev.filter(c => c.id !== id));
    toast.success("Contact dismissed — they won't appear again");
  }

  async function reclassifyContact(id: string, newType: ClassificationType) {
    await supabase.from("email_discovered_contacts" as any).update({
      classification_type: newType,
      is_filtered: newType === "spam_or_system" || newType === "person_personal",
    } as any).eq("id", id);
    setAllContacts(prev => prev.map(c => c.id === id ? {
      ...c,
      classification_type: newType,
      is_filtered: newType === "spam_or_system" || newType === "person_personal",
    } : c));
    toast.success(`Marked as ${newType.replace(/_/g, " ")}`);
  }

  async function saveContact(id: string, entityType: "person" | "company" = "person") {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;

    setEnrichingId(id);
    try {
      const headers = await getAuthHeaders();
      const enrichResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-contact`, {
        method: "POST", headers,
        body: JSON.stringify({ contact_id: id }),
      });
      if (enrichResp.ok) {
        const enrichResult = await enrichResp.json();
        if (enrichResult.enriched) {
          toast.success(`Contact enriched via ${enrichResult.sources?.join(", ") || "AI"}`);
        }
      }
    } catch (err) {
      console.error("Enrichment error:", err);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not authenticated"); return; }

      // Clean name: if it looks like CSV data (3+ commas), take first segment only
      let rawName = contact.display_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || null;
      if (rawName && (rawName.match(/,/g) || []).length >= 3) {
        rawName = rawName.split(",")[0].trim();
      }
      if (rawName) rawName = rawName.replace(/&#\d+;?/g, "").replace(/\s+/g, " ").trim() || null;
      const cleanEmail = (contact.email_address || "").replace(/&#\d+;?/g, "").trim();

      const { error: insertErr } = await supabase.from("canonical_persons").insert({
        owner_user_id: user.id,
        display_name: rawName,
        primary_email: cleanEmail || null,
        company: contact.hunter_company || null,
        title: contact.hunter_position || null,
        linkedin_url: contact.hunter_linkedin_url || null,
        primary_phone: contact.hunter_phone || null,
        is_business_owner: entityType === "company",
        tier: (contact.prospect_score || 0) >= 80 ? "a" : (contact.prospect_score || 0) >= 60 ? "b" : "c",
        metadata: {
          source: "email_discovery",
          entity_type: entityType,
          prospect_score: contact.prospect_score,
          hunter_verified: contact.hunter_verified,
          email_frequency: contact.email_frequency,
        },
      });
      if (insertErr) throw insertErr;

      await supabase.from("email_discovered_contacts" as any).update({ status: "saved_to_contacts", contact_type: entityType } as any).eq("id", id);
      setAllContacts(prev => prev.map(c => c.id === id ? { ...c, status: "saved_to_contacts", contact_type: entityType } : c));
      toast.success(entityType === "company" ? "Saved as company" : "Saved as person");
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact");
    } finally {
      setEnrichingId(null);
    }
  }

  const FILTER_CHIPS: { key: typeof inboxTab; icon: typeof Briefcase; label: string; count: number; variant?: string }[] = [
    { key: "person_business", icon: Briefcase, label: "Business People", count: personBusiness.length },
    { key: "company", icon: Building2, label: "Companies", count: companies.length },
    { key: "person_personal", icon: Users, label: "Personal", count: personPersonal.length },
    { key: "spam_or_system", icon: Bot, label: "Spam & Automated", count: spamOrSystem.length },
    { key: "unknown", icon: HelpCircle, label: "Unclassified", count: unknown.length },
    { key: "saved_people", icon: CheckCircle, label: "Saved People", count: savedPeople.length },
    { key: "saved_companies", icon: Building2, label: "Saved Companies", count: savedCompanies.length },
  ];

  const isSpamOrFiltered = inboxTab === "spam_or_system" || inboxTab === "person_personal" || inboxTab === "unknown";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Inbox Discoveries</h2>
          <p className="text-xs text-muted-foreground">Contacts found and classified from your connected accounts.</p>
        </div>
        <div className="flex gap-2">
          {newThisWeek > 0 && <Badge className="bg-primary">{newThisWeek} new</Badge>}
          <Button variant="outline" size="sm" onClick={runClassify} disabled={classifying}>
            {classifying ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Tag className="h-3.5 w-3.5 mr-1" />}
            Classify
          </Button>
          <Button variant="outline" size="sm" onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Scan
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {FILTER_CHIPS.map(chip => (
          <Button
            key={chip.key}
            variant={inboxTab === chip.key ? "default" : "outline"}
            size="sm"
            onClick={() => setInboxTab(chip.key)}
            className="text-xs gap-1"
          >
            <chip.icon className="h-3 w-3" /> {chip.label} ({chip.count})
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground whitespace-nowrap">Hide low-quality</label>
          <Switch checked={hideLowQuality} onCheckedChange={setHideLowQuality} className="scale-75" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : displayList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">
              {inboxTab === "person_business" ? "No business people discovered yet" :
               inboxTab === "company" ? "No company contacts found" :
               inboxTab === "person_personal" ? "No personal contacts classified" :
               inboxTab === "spam_or_system" ? "No spam contacts detected" :
               inboxTab === "unknown" ? "No unclassified contacts" :
               inboxTab === "saved_people" ? "No saved people" :
               "No saved companies"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {inboxTab === "person_business" ? "Connect your email and run a scan to discover contacts." :
               "Run a scan or classify contacts to populate this view."}
            </p>
            {inboxTab === "person_business" && (
              <Button className="mt-4" onClick={runSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Run First Scan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {displayList.map(c => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="py-3 px-4">
                {(inboxTab === "saved_people" || inboxTab === "saved_companies") ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {c.profile_photo_url ? (
                        <img src={c.profile_photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold">{(c.display_name || c.email_address).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{c.display_name || c.email_address}</p>
                          {inboxTab === "saved_companies" && <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                        {c.display_name && <p className="text-xs text-muted-foreground truncate">{c.email_address}</p>}
                        {c.hunter_company && <p className="text-xs text-muted-foreground">{c.hunter_company}{c.hunter_position ? ` · ${c.hunter_position}` : ""}</p>}
                        {c.enrichment_source && (
                          <Badge variant="outline" className="text-[9px] mt-0.5 text-primary border-primary/30">
                            Enriched ({c.enrichment_source})
                          </Badge>
                        )}
                      </div>
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
                          setAllContacts(prev => prev.map(sc => sc.id === c.id ? { ...sc, status: "new" } : sc));
                          toast.success("Removed from saved");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : isSpamOrFiltered ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-muted-foreground">{c.display_name || c.email_address}</p>
                      {c.display_name && <p className="text-xs text-muted-foreground/60 truncate">{c.email_address}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] text-muted-foreground/50">
                        {inboxTab === "spam_or_system" ? "Spam" : inboxTab === "person_personal" ? "Personal" : "Unknown"}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-0.5" onClick={() => reclassifyContact(c.id, "person_business")}>
                        <Briefcase className="h-3 w-3" /> Business
                      </Button>
                      {inboxTab !== "person_personal" && (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-0.5" onClick={() => reclassifyContact(c.id, "person_personal")}>
                          <Users className="h-3 w-3" /> Personal
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <InlineContactEditor
                        contact={c}
                        onUpdate={(id, updates) => {
                          setAllContacts(prev => prev.map(ct => ct.id === id ? { ...ct, ...updates } : ct));
                        }}
                        onSave={saveContact}
                        onDismiss={dismissContact}
                        defaultEntityType={inboxTab === "company" ? "company" : "person"}
                      />
                    </div>
                    {/* Quick reclassify actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Mark as Personal" onClick={() => reclassifyContact(c.id, "person_personal")}>
                        <UserX className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Mark as Spam" onClick={() => reclassifyContact(c.id, "spam_or_system")}>
                        <Bot className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
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

  const connectedProviders = new Set(connections.filter(c => c.is_active).map(c => {
    if (c.provider === "gmail") return "google";
    if (c.provider === "outlook") return "microsoft";
    return c.provider;
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Data Sources
        </h2>
        <p className="text-xs text-muted-foreground">Link accounts to expand your network intelligence and reach more connections.</p>
      </div>

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Enrichment Waterfall</CardTitle>
          <p className="text-[11px] text-muted-foreground">Contacts flow through each layer in order. Only pay when data is found.</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { label: "Serper.dev", role: "LinkedIn URL pre-match", status: "active", cost: "~$0.0003/query", icon: Search },
            { label: "Apollo.io", role: "Primary person enrichment", status: "active", cost: "$79/mo", icon: Users },
            { label: "People Data Labs", role: "Fallback person enrichment", status: "active", cost: "Pay-as-you-go", icon: Database },
            { label: "Anymail Finder", role: "Email fallback #1", status: "pending", cost: "Pay-per-find", icon: Mail },
            { label: "Findymail", role: "Email fallback #2", status: "pending", cost: "Pay-per-find", icon: Mail },
            { label: "The Org", role: "Org chart & reporting lines", status: "pending", cost: "Free tier", icon: Building2 },
            { label: "Google News RSS", role: "Company/risk signal monitoring", status: "active", cost: "Free", icon: Globe },
          ].map((source, i) => (
            <div key={source.label} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="h-6 w-6 rounded bg-muted/30 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</div>
              <source.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{source.label}</p>
                  <Badge variant={source.status === "active" ? "default" : "secondary"} className="text-[9px]">
                    {source.status === "active" ? "✓ Active" : "Setup needed"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{source.role} · {source.cost}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Sources (Accounts)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { label: "Data365", status: "pending", icon: Globe, desc: "Social signals" },
          ].map(source => (
            <div key={source.label} className="flex items-center gap-3 py-2">
              <source.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{source.label}</p>
                <p className="text-[10px] text-muted-foreground">{source.desc}</p>
              </div>
              <Badge variant="secondary" className="text-[9px]">⏳ Pending</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
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

// ─── Map + List View ───
function MapWithListView() {
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (viewMode === "list") loadContacts();
  }, [viewMode]);

  async function loadContacts() {
    setLoadingList(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingList(false); return; }
    const { data } = await supabase
      .from("canonical_persons")
      .select("id, display_name, primary_email, primary_phone, company, title, linkedin_url, tier, updated_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(500);
    setContacts(data || []);
    setLoadingList(false);
  }

  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.display_name || "").toLowerCase().includes(q)
      || (c.primary_email || "").toLowerCase().includes(q)
      || (c.company || "").toLowerCase().includes(q)
      || (c.title || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "graph" ? "default" : "outline"} size="sm" className="text-xs gap-1" onClick={() => setViewMode("graph")}>
            <Network className="h-3.5 w-3.5" /> Graph
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" className="text-xs gap-1" onClick={() => setViewMode("list")}>
            <Users className="h-3.5 w-3.5" /> List
          </Button>
        </div>
        {viewMode === "list" && (
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        )}
      </div>

      {viewMode === "graph" ? (
        <RelationshipMap />
      ) : loadingList ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">{search ? "No contacts match your search" : "No saved contacts yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">Save contacts from the Inbox to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-3xl mx-auto space-y-1">
          <p className="text-xs text-muted-foreground">{filtered.length} contacts</p>
          {filtered.map(c => (
            <Card key={c.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{(c.display_name || "?").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{c.display_name || c.primary_email}</p>
                        {c.tier && <Badge variant="outline" className="text-[9px]">{c.tier}</Badge>}
                        {c.linkedin_url && (
                          <a href={c.linkedin_url.startsWith("http") ? c.linkedin_url : `https://${c.linkedin_url}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-300">
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.company, c.title].filter(Boolean).join(" · ") || c.primary_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.primary_email && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        window.location.href = `/connect?tab=email&compose=${encodeURIComponent(c.primary_email)}`;
                      }}>
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {c.primary_phone && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`tel:${c.primary_phone}`)}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={async (e) => {
                      e.stopPropagation();
                      const confirmed = window.confirm(`Delete ${c.display_name || "this contact"}?`);
                      if (!confirmed) return;
                      const { error } = await supabase.from("canonical_persons").delete().eq("id", c.id);
                      if (error) { console.error("Delete contact error:", error); toast.error(`Failed to delete: ${error.message}`); return; }
                      setContacts(prev => prev.filter(x => x.id !== c.id));
                      toast.success("Contact deleted");
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
        <TabsContent value="map"><MapWithListView /></TabsContent>
        <TabsContent value="analytics"><FeederListAnalytics /></TabsContent>
        <TabsContent value="settings"><ProspectSettingsPage /></TabsContent>
        <TabsContent value="privacy"><PrivacySettings /></TabsContent>
      </Tabs>
    </div>
  );
}
