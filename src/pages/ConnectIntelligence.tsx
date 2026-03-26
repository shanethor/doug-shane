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
function EmailIntelligencePage() {
  const [contacts, setContacts] = useState<DiscoveredContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"all" | "high_score" | "verified">("all");

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setLoading(true);
    const { data } = await supabase
      .from("email_discovered_contacts" as any)
      .select("*")
      .neq("status", "dismissed")
      .order("first_seen_at", { ascending: false })
      .limit(100);
    setContacts((data as any as DiscoveredContact[]) || []);
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
    await supabase.from("email_discovered_contacts" as any).update({ status: "saved_to_contacts" }).eq("id", id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status: "saved_to_contacts" } : c));
    toast.success("Saved to contacts");
  }

  const filtered = contacts.filter(c => {
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

      <div className="flex gap-2">
        {(["all", "high_score", "verified"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="text-xs">
            {f === "all" ? "All" : f === "high_score" ? "Score 70+" : "Verified ✓"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
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
          {filtered.map(c => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold">{(c.display_name || c.email_address).charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email_address}</p>
                      {c.status === "discovered" && <Badge variant="secondary" className="text-[10px]">NEW</Badge>}
                      {c.prospect_score && <Badge variant="outline" className="text-[10px]">Score: {c.prospect_score}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.email_address}</p>
                    {(c.hunter_position || c.hunter_company) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.hunter_position}{c.hunter_position && c.hunter_company ? ", " : ""}{c.hunter_company}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {c.hunter_verified !== null && (
                        <span className={c.hunter_verified ? "text-green-500" : "text-yellow-500"}>
                          {c.hunter_verified ? "✓ Verified" : "⚠ Unverified"}
                        </span>
                      )}
                      <span>Seen in {c.email_frequency} thread{c.email_frequency !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => saveContact(c.id)}><Plus className="h-3 w-3 mr-1" /> Save</Button>
                      {c.hunter_linkedin_url && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(c.hunter_linkedin_url!, "_blank")}><ExternalLink className="h-3 w-3 mr-1" /> Profile</Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => dismissContact(c.id)}><X className="h-3 w-3 mr-1" /> Dismiss</Button>
                    </div>
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

// ─── Connection Manager ───
function ConnectionManagerPage() {
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

  const providerIcon = (provider: string) => {
    if (provider.includes("google") || provider.includes("gmail")) return <Mail className="h-4 w-4 text-red-400" />;
    if (provider.includes("microsoft") || provider.includes("outlook")) return <Mail className="h-4 w-4 text-blue-400" />;
    if (provider.includes("linkedin")) return <Linkedin className="h-4 w-4 text-blue-500" />;
    if (provider.includes("facebook")) return <Facebook className="h-4 w-4 text-blue-600" />;
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Connection Manager
        </h2>
        <p className="text-xs text-muted-foreground">Manage all connected accounts powering your network intelligence.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wifi className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No accounts connected</p>
            <p className="text-sm text-muted-foreground mt-1">Connect your email to start discovering contacts and building your network intelligence.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {connections.map(conn => (
            <Card key={conn.id}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-4">
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
                  <Button variant="outline" size="sm" className="h-7 text-xs">{conn.is_active ? "Disconnect" : "Reconnect"}</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Data source status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
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
      )}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inbox" className="text-xs"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Inbox</TabsTrigger>
          <TabsTrigger value="connections" className="text-xs"><Database className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sources</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Prospect</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox"><EmailIntelligencePage /></TabsContent>
        <TabsContent value="connections"><ConnectionManagerPage /></TabsContent>
        <TabsContent value="analytics"><FeederListAnalytics /></TabsContent>
        <TabsContent value="settings"><ProspectSettingsPage /></TabsContent>
        <TabsContent value="privacy"><PrivacySettings /></TabsContent>
      </Tabs>
    </div>
  );
}
