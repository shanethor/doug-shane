import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Search, Loader2, Mail, Phone, Linkedin,
  Building2, User, Star, ChevronDown, ChevronUp,
  Globe, MessageSquare, Edit2, Check, X, Plus,
  Network, List,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import RelationshipMap from "@/components/connect/RelationshipMap";

/* ═══ Types ═══ */
interface Contact {
  id: string;
  display_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  location: string | null;
  tier: string | null;
  is_business_owner: boolean | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  S: { label: "S-Tier", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: "⭐" },
  A: { label: "A-Tier", color: "text-green-400 bg-green-400/10 border-green-400/30", icon: "🟢" },
  B: { label: "B-Tier", color: "text-blue-400 bg-blue-400/10 border-blue-400/30", icon: "🔵" },
  C: { label: "C-Tier", color: "text-muted-foreground bg-muted border-border", icon: "⚪" },
};

/* ═══ Contact Detail Card ═══ */
function ContactDetailCard({ contact, onUpdate, onClose }: {
  contact: Contact;
  onUpdate: (id: string, updates: Partial<Contact>) => void;
  onClose: () => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(contact.metadata?.notes || "");
  const [tier, setTier] = useState(contact.tier || "C");

  const mutualCount = contact.metadata?.mutual_connections_count || 0;
  const mutualNames: string[] = contact.metadata?.mutual_connections || [];
  const source = contact.metadata?.source || "manual";

  async function saveTier(newTier: string) {
    setTier(newTier);
    const { error } = await supabase.from("canonical_persons").update({ tier: newTier }).eq("id", contact.id);
    if (error) toast.error("Failed to update tier");
    else {
      onUpdate(contact.id, { tier: newTier });
      toast.success(`Updated to ${TIER_CONFIG[newTier]?.label || newTier}`);
    }
  }

  async function saveNotes() {
    const meta = { ...(contact.metadata || {}), notes };
    const { error } = await supabase.from("canonical_persons").update({ metadata: meta }).eq("id", contact.id);
    if (error) toast.error("Failed to save notes");
    else {
      onUpdate(contact.id, { metadata: meta });
      setEditingNotes(false);
      toast.success("Notes saved");
    }
  }

  return (
    <Card className="border-primary/20 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold">{(contact.display_name || "?").charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold">{contact.display_name || "Unknown"}</p>
              {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
              {contact.company && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {contact.company}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contact actions */}
        <div className="flex flex-wrap gap-2">
          {contact.primary_email && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(`mailto:${contact.primary_email}`)}>
              <Mail className="h-3 w-3" /> Email
            </Button>
          )}
          {contact.primary_phone && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(`tel:${contact.primary_phone}`)}>
              <Phone className="h-3 w-3" /> Call
            </Button>
          )}
          {contact.linkedin_url && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(contact.linkedin_url!, "_blank")}>
              <Linkedin className="h-3 w-3" /> LinkedIn
            </Button>
          )}
        </div>

        {/* Tier selector */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Connection Level</p>
          <div className="flex gap-1.5">
            {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
              <Button
                key={key}
                variant={tier === key ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs ${tier === key ? "" : "opacity-60"}`}
                onClick={() => saveTier(key)}
              >
                {cfg.icon} {cfg.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Mutual connections */}
        {mutualCount > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Mutual Connections ({mutualCount})</p>
            <div className="flex flex-wrap gap-1.5">
              {mutualNames.slice(0, 5).map((name: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px]">{name}</Badge>
              ))}
              {mutualCount > 5 && <Badge variant="secondary" className="text-[10px]">+{mutualCount - 5} more</Badge>}
            </div>
          </div>
        )}

        {/* Source */}
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground">Source: </p>
          <Badge variant="outline" className="text-[10px] capitalize">{source.replace(/_/g, " ")}</Badge>
          {contact.is_business_owner && <Badge className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Business Owner</Badge>}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
            {!editingNotes && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingNotes(true)}>
                <Edit2 className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this contact..."
                className="text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={saveNotes}><Check className="h-3 w-3 mr-1" /> Save</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingNotes(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{notes || "No notes yet"}</p>
          )}
        </div>

        {/* Location */}
        {contact.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3" /> {contact.location}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══ MAIN EXPORT ═══ */
export default function ConnectNetworkTab() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  useEffect(() => { if (user) loadContacts(); }, [user]);

  async function loadContacts() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("canonical_persons")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setContacts((data as Contact[]) || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  }

  // Compute mutual connections from overlap between contacts
  useEffect(() => {
    if (contacts.length < 2) return;
    // Group contacts by company domain to suggest mutual connections
    const byCompany = new Map<string, Contact[]>();
    for (const c of contacts) {
      if (c.company) {
        const key = c.company.toLowerCase().trim();
        if (!byCompany.has(key)) byCompany.set(key, []);
        byCompany.get(key)!.push(c);
      }
    }
    // Enrich contacts with mutual connection info (same company = mutual)
    const updated = contacts.map(c => {
      if (!c.company) return c;
      const key = c.company.toLowerCase().trim();
      const peers = (byCompany.get(key) || []).filter(p => p.id !== c.id);
      if (peers.length === 0) return c;
      const meta = { ...(c.metadata || {}) };
      meta.mutual_connections = peers.map(p => p.display_name || "Unknown").slice(0, 10);
      meta.mutual_connections_count = peers.length;
      return { ...c, metadata: meta };
    });
    // Only update if something changed
    const changed = updated.some((u, i) =>
      (u.metadata?.mutual_connections_count || 0) !== (contacts[i].metadata?.mutual_connections_count || 0)
    );
    if (changed) setContacts(updated);
  }, [contacts.length]);

  function handleUpdate(id: string, updates: Partial<Contact>) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  const filtered = useMemo(() => {
    let result = contacts;
    if (tierFilter) result = result.filter(c => c.tier === tierFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.display_name || "").toLowerCase().includes(q) ||
        (c.primary_email || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, tierFilter, search]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
    for (const c of contacts) counts[c.tier || "C"] = (counts[c.tier || "C"] || 0) + 1;
    return counts;
  }, [contacts]);

  const selectedContact = selectedId ? contacts.find(c => c.id === selectedId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg">No contacts yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Save contacts from your Inbox Discoveries, sync your accounts, or add contacts manually to build your network.
          </p>
          <Button className="mt-4" onClick={() => window.location.href = "/connect/intelligence"}>
            <Search className="h-4 w-4 mr-2" /> Go to Intelligence
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Your Network
          </h2>
          <p className="text-xs text-muted-foreground">{contacts.length} contacts · Real data from your synced accounts</p>
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setViewMode("map")}
          >
            <Network className="h-3.5 w-3.5" /> Map
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" /> List
          </Button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === "map" && contacts.length > 0 && <RelationshipMap contacts={contacts} />}

      {/* List View */}
      {viewMode === "list" && (
        <>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setTierFilter(tierFilter === key ? null : key)}
            className={`p-2 rounded-lg border text-center transition-colors ${
              tierFilter === key ? "ring-2 ring-primary" : ""
            } ${cfg.color}`}
          >
            <p className="text-lg font-bold">{tierCounts[key] || 0}</p>
            <p className="text-[10px]">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search contacts by name, email, company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Contact list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(c => {
            const cfg = TIER_CONFIG[c.tier || "C"] || TIER_CONFIG.C;
            const mutuals = c.metadata?.mutual_connections_count || 0;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === c.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold">{(c.display_name || "?").charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{c.display_name || "Unknown"}</p>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.company || c.primary_email || "No details"}
                    </p>
                    {mutuals > 0 && (
                      <p className="text-[10px] text-primary mt-0.5">{mutuals} mutual connection{mutuals !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No contacts match your filters
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selectedContact ? (
            <ContactDetailCard
              contact={selectedContact}
              onUpdate={handleUpdate}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a contact to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
