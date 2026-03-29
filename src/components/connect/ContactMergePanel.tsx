import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Users, Search, Loader2, GitMerge, Check, X,
  ChevronDown, ChevronUp, Mail, Phone, Building2, AlertTriangle,
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
  reason: "exact" | "fuzzy";
  confidence?: number;
}

/* ── Nickname / diminutive map ── */
const NICKNAME_CLUSTERS: string[][] = [
  ["steve", "steven", "stephen", "steph"],
  ["mike", "michael", "mikey"],
  ["bob", "robert", "rob", "bobby", "robbie"],
  ["bill", "william", "will", "billy", "willy", "liam"],
  ["jim", "james", "jimmy", "jamie"],
  ["joe", "joseph", "joey"],
  ["tom", "thomas", "tommy"],
  ["dan", "daniel", "danny"],
  ["dave", "david", "davey"],
  ["chris", "christopher", "kristopher", "kris"],
  ["matt", "matthew", "matty"],
  ["pat", "patrick", "patty"],
  ["rick", "richard", "dick", "rich", "ricky"],
  ["john", "jon", "johnny", "jonathan", "jonathon"],
  ["ed", "edward", "eddie", "ted", "teddy"],
  ["nick", "nicholas", "nic", "nicky"],
  ["alex", "alexander", "alexandra", "alexa"],
  ["sam", "samuel", "samantha", "sammy"],
  ["ben", "benjamin", "benny"],
  ["tony", "anthony", "ant"],
  ["andy", "andrew", "drew"],
  ["greg", "gregory"],
  ["jeff", "jeffrey", "geoffrey", "geoff"],
  ["charlie", "charles", "chuck"],
  ["kate", "katherine", "catherine", "kathy", "cathy", "katie"],
  ["liz", "elizabeth", "beth", "betty", "eliza", "lizzy"],
  ["jen", "jennifer", "jenny"],
  ["sue", "susan", "suzanne", "suzy"],
  ["meg", "margaret", "maggie", "peggy", "megan"],
  ["debbie", "deborah", "deb"],
  ["chris", "christine", "christina", "tina"],
  ["vicky", "victoria", "vic"],
  ["tim", "timothy", "timmy"],
  ["pete", "peter"],
  ["doug", "douglas"],
  ["phil", "phillip", "philip"],
  ["larry", "lawrence"],
  ["ray", "raymond"],
  ["ron", "ronald", "ronnie"],
  ["walt", "walter"],
  ["al", "alan", "allan", "allen", "albert"],
  ["fred", "frederick", "freddy"],
  ["frank", "francis", "frankie"],
  ["don", "donald", "donnie"],
  ["jerry", "gerald", "gerry"],
  ["terry", "terrence", "terence"],
  ["kenny", "kenneth", "ken"],
  ["steve", "esteban"],
];

const nicknameIndex = new Map<string, number>();
NICKNAME_CLUSTERS.forEach((cluster, idx) => {
  cluster.forEach(name => nicknameIndex.set(name, idx));
});

function areNicknames(a: string, b: string): boolean {
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return true;
  const ia = nicknameIndex.get(la), ib = nicknameIndex.get(lb);
  return ia !== undefined && ia === ib;
}

/* ── Levenshtein ── */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a: string, b: string): { score: number; reason: "exact" | "fuzzy" } {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return { score: 1, reason: "exact" };

  const aParts = la.split(/\s+/).filter(Boolean);
  const bParts = lb.split(/\s+/).filter(Boolean);

  // Check last-name match + first-name nickname
  if (aParts.length >= 2 && bParts.length >= 2) {
    const aLast = aParts[aParts.length - 1];
    const bLast = bParts[bParts.length - 1];
    const lastDist = levenshtein(aLast, bLast);
    const lastSim = 1 - lastDist / Math.max(aLast.length, bLast.length);

    if (lastSim >= 0.85) {
      // Last names match closely — check first names
      const aFirst = aParts[0];
      const bFirst = bParts[0];
      if (areNicknames(aFirst, bFirst)) {
        return { score: 0.92, reason: "fuzzy" };
      }
      // First-name Levenshtein
      const firstDist = levenshtein(aFirst, bFirst);
      const firstSim = 1 - firstDist / Math.max(aFirst.length, bFirst.length);
      if (firstSim >= 0.75) {
        return { score: 0.8, reason: "fuzzy" };
      }
      // One is a prefix of the other (e.g. "Chris" vs "Christopher")
      if (aFirst.length >= 3 && bFirst.length >= 3 && (aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst))) {
        return { score: 0.85, reason: "fuzzy" };
      }
    }
  }

  // Same email domain + similar name overall
  const dist = levenshtein(la, lb);
  const sim = 1 - dist / Math.max(la.length, lb.length);
  if (sim >= 0.8) return { score: sim, reason: "fuzzy" };

  return { score: sim, reason: "fuzzy" };
}

export default function ContactMergePanel() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [merging, setMerging] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"exact" | "fuzzy">("exact");

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

  // Exact duplicates (same name)
  const exactDuplicates = useMemo(() => {
    const byName = new Map<string, Contact[]>();
    for (const c of contacts) {
      const key = (c.display_name || "").toLowerCase().trim();
      if (!key || key.length < 2) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(c);
    }
    const groups: DuplicateGroup[] = [];
    for (const [name, list] of byName) {
      if (list.length >= 2) groups.push({ name, contacts: list, reason: "exact", confidence: 100 });
    }
    return groups;
  }, [contacts]);

  // Fuzzy / potential duplicates (nicknames, close spellings, same last name)
  const fuzzyDuplicates = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    const exactKeys = new Set(exactDuplicates.map(g => g.name));
    const matched = new Set<string>();

    for (let i = 0; i < contacts.length; i++) {
      const a = contacts[i];
      const aName = (a.display_name || "").trim();
      if (!aName || aName.length < 3) continue;
      if (matched.has(a.id)) continue;

      const cluster: Contact[] = [a];
      let bestScore = 0;

      for (let j = i + 1; j < contacts.length; j++) {
        const b = contacts[j];
        const bName = (b.display_name || "").trim();
        if (!bName || bName.length < 3) continue;
        if (matched.has(b.id)) continue;

        // Skip if both belong to an exact group
        const aKey = aName.toLowerCase();
        const bKey = bName.toLowerCase();
        if (aKey === bKey && exactKeys.has(aKey)) continue;

        const { score, reason } = nameSimilarity(aName, bName);
        if (score >= 0.75 && reason === "fuzzy") {
          // Additional boost: same email domain or same company
          let boosted = score;
          if (a.primary_email && b.primary_email) {
            const aDomain = a.primary_email.split("@")[1];
            const bDomain = b.primary_email.split("@")[1];
            if (aDomain && bDomain && aDomain === bDomain) boosted = Math.min(1, boosted + 0.1);
          }
          if (a.company && b.company && a.company.toLowerCase() === b.company.toLowerCase()) {
            boosted = Math.min(1, boosted + 0.05);
          }
          if (boosted >= 0.75) {
            cluster.push(b);
            bestScore = Math.max(bestScore, boosted);
          }
        }
      }

      if (cluster.length >= 2) {
        for (const c of cluster) matched.add(c.id);
        groups.push({
          name: aName,
          contacts: cluster,
          reason: "fuzzy",
          confidence: Math.round(bestScore * 100),
        });
      }
    }
    return groups;
  }, [contacts, exactDuplicates]);

  const activeGroups = tab === "exact" ? exactDuplicates : fuzzyDuplicates;

  const filteredGroups = useMemo(() => {
    let groups = activeGroups.filter(g => !dismissed.has(g.contacts.map(c => c.id).sort().join(",")));
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.contacts.some(c => c.primary_email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q))
    );
  }, [activeGroups, search, dismissed]);

  async function mergeGroup(group: DuplicateGroup) {
    setMerging(group.name);
    try {
      const sorted = [...group.contacts].sort((a, b) => {
        const score = (c: Contact) =>
          (c.primary_email ? 1 : 0) + (c.primary_phone ? 1 : 0) +
          (c.company ? 1 : 0) + (c.title ? 1 : 0) +
          (c.linkedin_url ? 1 : 0) + (c.location ? 1 : 0);
        return score(b) - score(a);
      });
      const primary = sorted[0];
      const others = sorted.slice(1);

      const updates: Partial<Contact> = {};
      for (const other of others) {
        if (!primary.primary_email && other.primary_email) updates.primary_email = other.primary_email;
        if (!primary.primary_phone && other.primary_phone) updates.primary_phone = other.primary_phone;
        if (!primary.company && other.company) updates.company = other.company;
        if (!primary.title && other.title) updates.title = other.title;
        if (!primary.linkedin_url && other.linkedin_url) updates.linkedin_url = other.linkedin_url;
        if (!primary.location && other.location) updates.location = other.location;
      }

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

      if (Object.keys(updates).length > 0 || mergedMeta.merged_from) {
        await supabase
          .from("canonical_persons")
          .update({ ...updates, metadata: mergedMeta })
          .eq("id", primary.id);
      }

      for (const other of others) {
        await supabase
          .from("network_contacts" as any)
          .update({ canonical_person_id: primary.id } as any)
          .eq("canonical_person_id", other.id);
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

  function dismissGroup(group: DuplicateGroup) {
    const key = group.contacts.map(c => c.id).sort().join(",");
    setDismissed(prev => new Set([...prev, key]));
    toast.success("Dismissed — won't show again this session");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalExact = exactDuplicates.length;
  const totalFuzzy = fuzzyDuplicates.length;

  if (totalExact === 0 && totalFuzzy === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Check className="h-8 w-8 mx-auto text-green-500 mb-3" />
          <p className="font-medium">No duplicates found</p>
          <p className="text-sm text-muted-foreground mt-1">
            All {contacts.length} contacts appear unique.
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
            Duplicate Contacts
          </h3>
          <p className="text-xs text-muted-foreground">
            {totalExact} exact • {totalFuzzy} potential duplicates
          </p>
        </div>
        {filteredGroups.length > 0 && tab === "exact" && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              for (const g of filteredGroups) await mergeGroup(g);
            }}
            className="text-xs"
          >
            <GitMerge className="h-3 w-3 mr-1" /> Merge All Exact
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "exact" | "fuzzy")}>
        <TabsList className="h-8">
          <TabsTrigger value="exact" className="text-xs gap-1.5">
            <GitMerge className="h-3 w-3" /> Exact ({totalExact})
          </TabsTrigger>
          <TabsTrigger value="fuzzy" className="text-xs gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Potential ({totalFuzzy})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {(filteredGroups.length > 5 || search) && (
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

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Check className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              {tab === "exact" ? "No exact duplicates" : "No potential duplicates"} found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredGroups.map((group, gi) => {
            const groupKey = group.contacts.map(c => c.id).sort().join(",");
            return (
              <Card key={groupKey} className="border-border/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {group.contacts.length} records
                      </Badge>
                      {group.reason === "fuzzy" && (
                        <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: "hsl(45 80% 45% / 0.4)", color: "hsl(45 80% 60%)" }}>
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {group.confidence}% match
                        </Badge>
                      )}
                      <span className="font-medium text-sm">
                        {group.contacts.map(c => c.display_name).filter(Boolean).join(" ↔ ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.reason === "fuzzy" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => dismissGroup(group)}
                        >
                          <X className="h-3 w-3" /> Not a duplicate
                        </Button>
                      )}
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
                  </div>
                  <div className="space-y-1">
                    {group.contacts.map(c => (
                      <div key={c.id} className="flex items-center gap-3 text-xs text-muted-foreground py-1 border-t border-border/30 first:border-0">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold">{(c.display_name || "?")[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="font-medium text-foreground/80">{c.display_name}</span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
