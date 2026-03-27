import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Users, Search, Loader2, GitMerge, Check, X,
  ChevronDown, ChevronUp, Mail, Phone, Building2,
} from "lucide-react";

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
  metadata: any;
}

interface DuplicateGroup {
  name: string;
  contacts: Contact[];
}

export default function ContactMergePanel() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadContacts();
  }, [user]);

  async function loadContacts() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("canonical_persons")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("display_name", { ascending: true })
      .limit(1000);
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }

  const duplicates = useMemo(() => {
    const byName = new Map<string, Contact[]>();
    for (const c of contacts) {
      const key = (c.display_name || "").toLowerCase().trim();
      if (!key || key.length < 2) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(c);
    }
    const groups: DuplicateGroup[] = [];
    for (const [name, list] of byName) {
      if (list.length >= 2) groups.push({ name, contacts: list });
    }
    return groups;
  }, [contacts]);

  const filteredDuplicates = useMemo(() => {
    if (!search.trim()) return duplicates;
    const q = search.toLowerCase();
    return duplicates.filter(g => g.name.includes(q));
  }, [duplicates, search]);

  async function mergeGroup(group: DuplicateGroup) {
    setMerging(group.name);
    try {
      // Pick the "best" record (most data filled)
      const sorted = [...group.contacts].sort((a, b) => {
        const score = (c: Contact) =>
          (c.primary_email ? 1 : 0) + (c.primary_phone ? 1 : 0) +
          (c.company ? 1 : 0) + (c.title ? 1 : 0) +
          (c.linkedin_url ? 1 : 0) + (c.location ? 1 : 0);
        return score(b) - score(a);
      });
      const primary = sorted[0];
      const others = sorted.slice(1);

      // Merge: fill gaps from other records into primary
      const updates: Partial<Contact> = {};
      for (const other of others) {
        if (!primary.primary_email && other.primary_email) updates.primary_email = other.primary_email;
        if (!primary.primary_phone && other.primary_phone) updates.primary_phone = other.primary_phone;
        if (!primary.company && other.company) updates.company = other.company;
        if (!primary.title && other.title) updates.title = other.title;
        if (!primary.linkedin_url && other.linkedin_url) updates.linkedin_url = other.linkedin_url;
        if (!primary.location && other.location) updates.location = other.location;
      }

      // Merge metadata
      const mergedMeta = { ...(primary.metadata || {}) };
      mergedMeta.merged_from = others.map(o => o.id);
      mergedMeta.merged_at = new Date().toISOString();
      for (const other of others) {
        if (other.metadata) {
          for (const [k, v] of Object.entries(other.metadata)) {
            if (!mergedMeta[k] && v) mergedMeta[k] = v;
          }
        }
      }

      // Update primary record
      if (Object.keys(updates).length > 0 || mergedMeta.merged_from) {
        await supabase
          .from("canonical_persons")
          .update({ ...updates, metadata: mergedMeta })
          .eq("id", primary.id);
      }

      // Delete duplicate records
      for (const other of others) {
        // Re-link any network_contacts pointing to duplicates
        await supabase
          .from("network_contacts" as any)
          .update({ canonical_person_id: primary.id } as any)
          .eq("canonical_person_id", other.id);
        // Delete the duplicate
        await supabase
          .from("canonical_persons")
          .delete()
          .eq("id", other.id);
      }

      toast.success(`Merged ${group.contacts.length} records for "${primary.display_name}"`);
      loadContacts();
    } catch (err: any) {
      toast.error(err.message || "Merge failed");
    } finally {
      setMerging(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Check className="h-8 w-8 mx-auto text-green-500 mb-3" />
          <p className="font-medium">No duplicates found</p>
          <p className="text-sm text-muted-foreground mt-1">
            All {contacts.length} contacts have unique names.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            Duplicate Contacts ({duplicates.length} groups)
          </h3>
          <p className="text-xs text-muted-foreground">
            Contacts with the same name that can be merged
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            for (const g of duplicates) await mergeGroup(g);
          }}
          className="text-xs"
        >
          <GitMerge className="h-3 w-3 mr-1" /> Merge All
        </Button>
      </div>

      {duplicates.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filter duplicates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredDuplicates.map(group => (
          <Card key={group.name} className="border-border/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {group.contacts.length} records
                  </Badge>
                  <span className="font-medium text-sm capitalize">{group.name}</span>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={merging === group.name}
                  onClick={() => mergeGroup(group)}
                >
                  {merging === group.name ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <GitMerge className="h-3 w-3" />
                  )}
                  Merge
                </Button>
              </div>
              <div className="space-y-1">
                {group.contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-xs text-muted-foreground py-1 border-t border-border/30 first:border-0">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold">{(c.display_name || "?")[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {c.primary_email && (
                        <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{c.primary_email}</span>
                      )}
                      {c.primary_phone && (
                        <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{c.primary_phone}</span>
                      )}
                      {c.company && (
                        <span className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5" />{c.company}</span>
                      )}
                      {c.tier && <Badge variant="outline" className="text-[9px] h-4">{c.tier}-Tier</Badge>}
                    </div>
                    <span className="text-[10px]">{(c.metadata?.source || "manual").replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
