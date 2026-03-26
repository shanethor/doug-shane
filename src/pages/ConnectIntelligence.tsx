import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Network, Search, Users, Mail, Settings, Loader2, Brain,
  Calendar, FileText, Star, Phone, Linkedin, MapPin, Briefcase,
  ArrowRight, Sparkles, Download, Eye, CheckCircle, X, RefreshCw,
  AlertTriangle, ExternalLink, Plus, Zap, Shield, BarChart3,
  Map, Send, Edit,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { useAuth } from "@/hooks/useAuth";
import RelationshipMap from "@/components/connect/RelationshipMap";
import PrivacySettings from "@/components/connect/PrivacySettings";
import FeederListAnalytics from "@/components/connect/FeederListAnalytics";

// ─── Types ───
interface FeederList {
  id: string;
  client_name: string;
  meeting_date: string | null;
  status: string;
  generated_at: string;
  prospect_count?: number;
  auto_triggered?: boolean;
}

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  company: string | null;
  location: string | null;
  linkedin_url: string | null;
  relationship_to_client: string | null;
  connection_type: string | null;
  life_event_signals: any[];
  is_mutual_with_producer: boolean;
  prospect_score: number | null;
  suggested_talking_point: string | null;
  status: string;
  intro_email_sent?: boolean;
  converted_to_meeting?: boolean;
  converted_to_client?: boolean;
}

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

// ─── Feeder List Generator (Meeting Prep) ───
function MeetingPrepPage() {
  const [clientName, setClientName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [feederLists, setFeederLists] = useState<FeederList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [progress, setProgress] = useState("");
  const [introDialog, setIntroDialog] = useState<{ prospect: Prospect; draft?: any } | null>(null);
  const [draftingIntro, setDraftingIntro] = useState(false);

  useEffect(() => { loadFeederLists(); }, []);

  async function loadFeederLists() {
    const { data } = await supabase
      .from("feeder_lists" as any)
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(20);
    setFeederLists((data as any as FeederList[]) || []);
  }

  async function generateList() {
    if (!clientName.trim()) { toast.error("Enter a client name"); return; }
    setGenerating(true);
    setProgress("Analyzing client network...");

    const steps = [
      "Discovering connections...",
      "Cross-referencing your contacts...",
      "Scoring prospects with AI...",
      "Generating talking points...",
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) { setProgress(steps[stepIdx]); stepIdx++; }
    }, 4000);

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-feeder-list`, {
        method: "POST",
        headers,
        body: JSON.stringify({ client_name: clientName, meeting_date: meetingDate || null }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Feeder list ready — ${data.prospect_count} prospects found`);
        setSelectedList(data.feeder_list_id);
        loadProspects(data.feeder_list_id);
        loadFeederLists();
      } else {
        toast.error(data.error || "Failed to generate");
      }
    } catch {
      toast.error("Error generating feeder list");
    } finally {
      clearInterval(interval);
      setGenerating(false);
      setProgress("");
    }
  }

  async function loadProspects(listId: string) {
    setLoadingProspects(true);
    const { data } = await supabase
      .from("feeder_list_prospects" as any)
      .select("*")
      .eq("feeder_list_id", listId)
      .order("prospect_score", { ascending: false });
    setProspects((data as any as Prospect[]) || []);
    setLoadingProspects(false);
  }

  async function draftIntroEmail(prospect: Prospect) {
    setDraftingIntro(true);
    setIntroDialog({ prospect });
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-intro-email`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prospect_id: prospect.id,
          client_name: clientName || feederLists.find(fl => fl.id === selectedList)?.client_name,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setIntroDialog({ prospect, draft: data });
      } else {
        toast.error("Failed to generate intro email");
        setIntroDialog(null);
      }
    } catch {
      toast.error("Error drafting intro email");
      setIntroDialog(null);
    } finally {
      setDraftingIntro(false);
    }
  }

  async function markConverted(prospectId: string, field: "converted_to_meeting" | "converted_to_client") {
    const update: any = { [field]: true };
    if (field === "converted_to_meeting") update.meeting_date = new Date().toISOString();
    if (field === "converted_to_client") update.client_converted_at = new Date().toISOString();
    await supabase.from("feeder_list_prospects" as any).update(update).eq("id", prospectId);
    toast.success(`Marked as ${field.replace(/_/g, " ")}`);
    if (selectedList) loadProspects(selectedList);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Meeting Prep — Feeder List Generator</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate a ranked list of warm referral targets before any client meeting.</p>
      </div>

      {/* Generator Form */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Name</label>
              <Input placeholder="e.g. Doug Wenz" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={generating} />
            </div>
            <div className="w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Meeting Date</label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} disabled={generating} />
            </div>
            <div className="flex items-end">
              <Button onClick={generateList} disabled={generating} className="w-full sm:w-auto">
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Brain className="h-4 w-4 mr-2" /> Generate Feeder List</>}
              </Button>
            </div>
          </div>
          {progress && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary animate-pulse">
              <Sparkles className="h-4 w-4" /> {progress}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospects */}
      {selectedList && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Feeder List Results</h3>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Export PDF</Button>
          </div>
          {loadingProspects ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-3">
              {prospects.map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  onDraftIntro={() => draftIntroEmail(p)}
                  onMarkMeeting={() => markConverted(p.id, "converted_to_meeting")}
                  onMarkClient={() => markConverted(p.id, "converted_to_client")}
                />
              ))}
              {prospects.length === 0 && (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No prospects found.</CardContent></Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Lists */}
      {feederLists.length > 0 && !selectedList && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Feeder Lists</h3>
          <div className="grid gap-2">
            {feederLists.map((fl) => (
              <Card key={fl.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setSelectedList(fl.id); loadProspects(fl.id); }}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{fl.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fl.meeting_date ? `Meeting: ${new Date(fl.meeting_date).toLocaleDateString()}` : "No date"} · {new Date(fl.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {fl.auto_triggered && <Badge variant="secondary" className="text-[10px]">⚡ Auto</Badge>}
                    <Badge variant={fl.status === "ready" ? "default" : "secondary"}>{fl.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Intro Email Dialog */}
      <Dialog open={!!introDialog} onOpenChange={() => setIntroDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Introduction Email Draft
            </DialogTitle>
          </DialogHeader>
          {draftingIntro ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">AI is crafting your intro email...</span>
            </div>
          ) : introDialog?.draft ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <p className="text-sm">{introDialog.prospect.email || "No email available"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <p className="text-sm font-medium">{introDialog.draft.subject}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <div className="text-sm border rounded-lg p-3 bg-muted/30 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: introDialog.draft.body_html }} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { toast.success("Draft saved — find it in your email drafts"); setIntroDialog(null); }}>
                  <Edit className="h-4 w-4 mr-1" /> Edit & Send
                </Button>
                <Button variant="outline" onClick={() => setIntroDialog(null)}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProspectCard({ prospect, onDraftIntro, onMarkMeeting, onMarkClient }: {
  prospect: Prospect;
  onDraftIntro: () => void;
  onMarkMeeting: () => void;
  onMarkClient: () => void;
}) {
  const score = prospect.prospect_score || 0;
  const scoreColor = score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-muted-foreground";

  return (
    <Card className="border-border/50">
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{prospect.name?.charAt(0) || "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{prospect.name}</p>
              <span className={`text-sm font-bold ${scoreColor}`}>Score: {score}</span>
              {prospect.is_mutual_with_producer && <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30">Mutual</Badge>}
              {prospect.converted_to_meeting && <Badge className="text-[10px] bg-amber-500">📅 Meeting Set</Badge>}
              {prospect.converted_to_client && <Badge className="text-[10px] bg-green-500">✅ Client</Badge>}
              {prospect.intro_email_sent && <Badge variant="secondary" className="text-[10px]">✉️ Intro Sent</Badge>}
            </div>
            {prospect.occupation && <p className="text-xs text-muted-foreground">{prospect.occupation}{prospect.company ? ` at ${prospect.company}` : ""}</p>}
            {prospect.relationship_to_client && <p className="text-xs text-muted-foreground">🔗 {prospect.relationship_to_client}</p>}
            <div className="flex flex-wrap gap-1 mt-1">
              {prospect.life_event_signals?.map((e: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {e.type === "new_baby" ? "🍼" : e.type === "marriage" ? "💍" : e.type === "home_purchase" ? "🏠" : e.type === "job_change" ? "💼" : "⭐"} {e.type?.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
            {prospect.suggested_talking_point && (
              <p className="text-xs mt-2 p-2 rounded bg-primary/5 border border-primary/10 italic">💡 "{prospect.suggested_talking_point}"</p>
            )}
            <div className="flex gap-2 mt-3 flex-wrap">
              {prospect.email && !prospect.intro_email_sent && (
                <Button variant="default" size="sm" className="h-7 text-xs" onClick={onDraftIntro}>
                  <Send className="h-3 w-3 mr-1" /> Draft Intro
                </Button>
              )}
              {!prospect.converted_to_meeting && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onMarkMeeting}>
                  <Calendar className="h-3 w-3 mr-1" /> Mark Meeting
                </Button>
              )}
              {prospect.converted_to_meeting && !prospect.converted_to_client && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onMarkClient}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Mark Client
                </Button>
              )}
              {prospect.phone && <Button variant="ghost" size="sm" className="h-7 text-xs"><Phone className="h-3 w-3 mr-1" /> Call</Button>}
              {prospect.linkedin_url && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(prospect.linkedin_url!, "_blank")}>
                  <Linkedin className="h-3 w-3 mr-1" /> LinkedIn
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Email Intelligence</h2>
          <p className="text-sm text-muted-foreground">Contacts discovered automatically from your email activity.</p>
        </div>
        <div className="flex gap-2">
          {newThisWeek > 0 && <Badge className="bg-primary">{newThisWeek} new this week</Badge>}
          <Button variant="outline" size="sm" onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Scan Now
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "high_score", "verified"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="text-xs">
            {f === "all" ? "All" : f === "high_score" ? "High Score (70+)" : "Verified ✓"}
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
        <div className="grid gap-3">
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Ideal Prospect Configuration</h2>
        <p className="text-sm text-muted-foreground">Define what you're looking for to improve AI scoring.</p>
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

// ─── Main Connect Intelligence Page ───
export default function ConnectIntelligencePage() {
  const [tab, setTab] = useState("prep");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Connect Intelligence</h1>
          <p className="text-sm text-muted-foreground">AI-powered referral discovery & meeting preparation</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="prep" className="text-xs"><Brain className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Prep</TabsTrigger>
          <TabsTrigger value="inbox" className="text-xs"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Inbox</TabsTrigger>
          <TabsTrigger value="map" className="text-xs"><Map className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Map</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Profile</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="prep"><MeetingPrepPage /></TabsContent>
        <TabsContent value="inbox"><EmailIntelligencePage /></TabsContent>
        <TabsContent value="map"><RelationshipMap /></TabsContent>
        <TabsContent value="analytics"><FeederListAnalytics /></TabsContent>
        <TabsContent value="settings"><ProspectSettingsPage /></TabsContent>
        <TabsContent value="privacy"><PrivacySettings /></TabsContent>
      </Tabs>
    </div>
  );
}
