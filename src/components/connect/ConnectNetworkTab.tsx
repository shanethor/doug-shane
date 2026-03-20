import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Network, Users, Search, Loader2,
  Building2, User, Sparkles, FileText,
  Copy, Eye, ChevronDown,
} from "lucide-react";

/* ═══ Types ═══ */
interface SharedContact {
  name: string;
  company: string;
  email: string;
  context: string;
}

interface OverlapResult {
  found: boolean;
  message?: string;
  partner_name: string;
  partner_agency: string | null;
  your_contacts: number;
  their_contacts: number;
  shared_contacts: SharedContact[];
  overlap_count: number;
  partnership_potential: "high" | "medium" | "low";
}

interface PlatformPartner {
  user_id: string;
  name: string;
  agency: string;
  email: string;
  branch: string | null;
}

/* ═══ Venn Diagram SVG ═══ */
function VennDiagram({
  leftCount,
  rightCount,
  sharedCount,
  leftLabel,
  rightLabel,
}: {
  leftCount: number;
  rightCount: number;
  sharedCount: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const total = leftCount + rightCount - sharedCount;
  const overlapPct = total > 0 ? Math.min(sharedCount / total, 0.5) : 0;
  // Distance between centers: less distance = more overlap
  const cx1 = 130;
  const cx2 = 270;
  const r = 90;

  return (
    <svg viewBox="0 0 400 220" className="w-full max-w-[400px] mx-auto" aria-label="Network overlap Venn diagram">
      {/* Left circle */}
      <circle cx={cx1} cy={110} r={r} fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {/* Right circle */}
      <circle cx={cx2} cy={110} r={r} fill="hsl(var(--accent) / 0.15)" stroke="hsl(var(--accent))" strokeWidth="2" />
      {/* Overlap region highlight */}
      <clipPath id="clip-left"><circle cx={cx1} cy={110} r={r} /></clipPath>
      <circle cx={cx2} cy={110} r={r} fill="hsl(var(--primary) / 0.25)" clipPath="url(#clip-left)" />

      {/* Labels */}
      <text x={cx1 - 30} y={105} fill="hsl(var(--foreground))" fontSize="24" fontWeight="700" textAnchor="middle">
        {leftCount - sharedCount}
      </text>
      <text x={cx1 - 30} y={122} fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">
        only you
      </text>

      <text x={200} y={100} fill="hsl(var(--foreground))" fontSize="28" fontWeight="800" textAnchor="middle">
        {sharedCount}
      </text>
      <text x={200} y={118} fill="hsl(var(--primary))" fontSize="10" fontWeight="600" textAnchor="middle">
        shared
      </text>

      <text x={cx2 + 30} y={105} fill="hsl(var(--foreground))" fontSize="24" fontWeight="700" textAnchor="middle">
        {rightCount - sharedCount}
      </text>
      <text x={cx2 + 30} y={122} fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">
        only them
      </text>

      {/* Circle labels at top */}
      <text x={cx1} y={20} fill="hsl(var(--foreground))" fontSize="11" fontWeight="600" textAnchor="middle">
        {leftLabel.length > 16 ? leftLabel.slice(0, 14) + "…" : leftLabel}
      </text>
      <text x={cx2} y={20} fill="hsl(var(--foreground))" fontSize="11" fontWeight="600" textAnchor="middle">
        {rightLabel.length > 16 ? rightLabel.slice(0, 14) + "…" : rightLabel}
      </text>
    </svg>
  );
}

/* ═══ MUTUAL NETWORK OVERLAP VISUALIZER ═══ */
function NetworkOverlapVisualizer() {
  const { user } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OverlapResult | null>(null);
  const [partners, setPartners] = useState<PlatformPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Load platform partners on mount
  useEffect(() => {
    const load = async () => {
      setPartnersLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("network-overlap", {
          body: { action: "list_partners" },
        });
        if (error) throw error;
        setPartners(data?.partners || []);
      } catch {
        // Silent fail — user can still type email manually
      } finally {
        setPartnersLoading(false);
      }
    };
    load();
  }, []);

  const filteredPartners = useMemo(() => {
    if (!partnerEmail.trim()) return partners.slice(0, 8);
    const q = partnerEmail.toLowerCase();
    return partners.filter(
      p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.agency || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [partnerEmail, partners]);

  const handleAnalyze = async (email?: string) => {
    const emailToUse = email || partnerEmail.trim();
    if (!emailToUse) {
      toast.error("Enter or select a partner");
      return;
    }
    setLoading(true);
    setResult(null);
    setShowDropdown(false);
    try {
      const { data, error } = await supabase.functions.invoke("network-overlap", {
        body: { action: "find_overlap", partner_email: emailToUse },
      });
      if (error) throw error;
      if (data?.found === false) {
        toast.error(data.message || "Partner not found");
        return;
      }
      setResult(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze overlap");
    } finally {
      setLoading(false);
    }
  };

  const selectPartner = (p: PlatformPartner) => {
    setPartnerEmail(p.email);
    setShowDropdown(false);
    handleAnalyze(p.email);
  };

  const potentialStyles = (p: string) => {
    if (p === "high") return "text-success bg-success/10 border-success/20";
    if (p === "medium") return "text-warning bg-warning/10 border-warning/20";
    return "text-muted-foreground bg-muted";
  };

  const visibleContacts = showAll ? (result?.shared_contacts || []) : (result?.shared_contacts || []).slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          Mutual Network Overlap Visualizer
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          See how many real contacts you share with another professional on the platform — powered by your synced network data.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search / Select */}
        <div className="relative">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                className="pr-8"
                placeholder="Search by name or email…"
                value={partnerEmail}
                onChange={e => {
                  setPartnerEmail(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <Button className="gap-1.5 shrink-0" onClick={() => handleAnalyze()} disabled={loading || !partnerEmail.trim()}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Visualize
            </Button>
          </div>

          {/* Partner dropdown */}
          {showDropdown && filteredPartners.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-12 bg-popover border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
              {filteredPartners.map(p => (
                <button
                  key={p.user_id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => selectPartner(p)}
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.agency ? `${p.agency} · ` : ""}{p.email}
                    </p>
                  </div>
                  {p.branch && (
                    <Badge variant="outline" className="text-[9px] shrink-0">{p.branch}</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="rounded-xl border bg-muted/20 p-5 space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-base font-semibold">{result.partner_name}</p>
                {result.partner_agency && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {result.partner_agency}
                  </p>
                )}
              </div>
              <Badge variant="outline" className={`text-xs ${potentialStyles(result.partnership_potential)}`}>
                {result.partnership_potential} partnership potential
              </Badge>
            </div>

            {/* Venn Diagram */}
            <VennDiagram
              leftCount={result.your_contacts}
              rightCount={result.their_contacts}
              sharedCount={result.overlap_count}
              leftLabel="You"
              rightLabel={result.partner_name}
            />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-lg font-bold">{result.your_contacts}</p>
                <p className="text-[10px] text-muted-foreground">Your contacts</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-lg font-bold text-primary">{result.overlap_count}</p>
                <p className="text-[10px] text-primary">Shared</p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-lg font-bold">{result.their_contacts}</p>
                <p className="text-[10px] text-muted-foreground">Their contacts</p>
              </div>
            </div>

            {/* Shared contacts list */}
            {result.shared_contacts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shared Contacts</p>
                {visibleContacts.map((contact, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 border border-border/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {contact.company}{contact.company && contact.email ? " · " : ""}{contact.email}
                      </p>
                      <p className="text-[10px] text-accent">{contact.context}</p>
                    </div>
                  </div>
                ))}
                {result.shared_contacts.length > 6 && !showAll && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAll(true)}>
                    Show all {result.shared_contacts.length} shared contacts
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No shared contacts found yet</p>
                <p className="text-[11px] text-muted-foreground">Sync more accounts to discover overlaps</p>
              </div>
            )}

            {/* Suggested action */}
            {result.overlap_count > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs">
                    {result.partnership_potential === "high"
                      ? `Strong overlap with ${result.partner_name} — consider scheduling a joint review of your shared contacts to identify co-introduction opportunities.`
                      : result.partnership_potential === "medium"
                        ? `Moderate overlap detected. Explore which shared contacts might benefit from a coordinated approach.`
                        : `Limited overlap right now. As both networks grow on the platform, new connections will surface automatically.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Select a partner to visualize your network overlap</p>
            <p className="text-[11px] mt-1">Results are based on your synced contacts and unified records</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══ ONE-PAGER PROPOSAL BUILDER ═══ */
function ProposalBuilder() {
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [opportunity, setOpportunity] = useState("");
  const [keyNumbers, setKeyNumbers] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState("");

  const handleGenerate = async () => {
    if (!clientName.trim() || !opportunity.trim()) return;
    setLoading(true);
    setProposal("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a professional proposal writer for sales professionals. Create a clean, professional one-page proposal summary for:

Client: ${clientName}${clientCompany ? ` at ${clientCompany}` : ""}
Opportunity: ${opportunity}
${keyNumbers ? `Key Numbers/Details: ${keyNumbers}` : ""}

Format it as a clean text document with these sections:
1. **Executive Summary** (2-3 sentences)
2. **The Opportunity** (what the client needs)
3. **Our Approach** (how we'll deliver value)
4. **Key Details** (bullet points with numbers/specifics)
5. **Next Steps** (clear call to action)

Keep it concise and professional. Use real formatting (headers, bullets). This should be something a lender, CPA, or advisor would be proud to send.`,
          },
        },
      });
      if (error) throw error;
      setProposal(data?.text || data?.response || "Could not generate proposal.");
    } catch {
      toast.error("Failed to generate proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(proposal);
    toast.success("Proposal copied to clipboard");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-warning" />
          One-Pager Proposal Builder
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Build a polished summary document in under 2 minutes — no templates needed
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Client Name</label>
            <Input placeholder="Mike Davis" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</label>
            <Input placeholder="Davis Construction LLC" value={clientCompany} onChange={e => setClientCompany(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Opportunity</label>
          <Input placeholder="Commercial GL review — expanding to 3 locations, needs updated coverage" value={opportunity} onChange={e => setOpportunity(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Key Numbers / Details</label>
          <Input placeholder="$4.2M revenue, 45 employees, current premium $28K" value={keyNumbers} onChange={e => setKeyNumbers(e.target.value)} />
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleGenerate} disabled={loading || !clientName.trim() || !opportunity.trim()}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate One-Pager
        </Button>

        {proposal && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 animate-in fade-in-0 duration-300">
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{proposal}</pre>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══ MAIN EXPORT ═══ */
export default function ConnectNetworkTab() {
  return (
    <div className="space-y-4">
      <NetworkOverlapVisualizer />
      <ProposalBuilder />
    </div>
  );
}
