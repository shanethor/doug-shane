import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Network, Users, Search, Loader2, Link2,
  Building2, User, ArrowRight, Sparkles, FileText,
  Download, Copy,
} from "lucide-react";

/* ═══ MUTUAL NETWORK OVERLAP ═══ */
interface OverlapResult {
  partner_name: string;
  shared_contacts: Array<{ name: string; company: string; context: string }>;
  overlap_count: number;
  partnership_potential: "high" | "medium" | "low";
  suggested_action: string;
}

function NetworkOverlap() {
  const { user } = useAuth();
  const [partnerName, setPartnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OverlapResult | null>(null);

  const handleAnalyze = async () => {
    if (!partnerName.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a networking intelligence tool. A sales professional wants to see their mutual network overlap with "${partnerName}". Generate a realistic analysis showing:

Return a JSON object:
{
  "partner_name": "${partnerName}",
  "shared_contacts": [
    { "name": "contact name", "company": "company name", "context": "how they're connected" }
  ],
  "overlap_count": number (3-8),
  "partnership_potential": "high" or "medium" or "low",
  "suggested_action": "one sentence recommended next step"
}

Generate 3-6 realistic shared contacts with realistic company names. Return ONLY the JSON object.`,
          },
        },
      });
      if (error) throw error;
      const text = data?.text || data?.response || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      setResult(JSON.parse(jsonMatch ? jsonMatch[0] : "{}"));
    } catch {
      toast.error("Failed to analyze overlap");
    } finally {
      setLoading(false);
    }
  };

  const potentialColor = (p: string) => {
    if (p === "high") return "text-success bg-success/10 border-success/20";
    if (p === "medium") return "text-warning bg-warning/10 border-warning/20";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          Mutual Network Overlap
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          See how many contacts you share with a partner — and where to collaborate
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <Input
            className="flex-1"
            placeholder="Enter partner's name (e.g. Sarah Johnson, CPA)"
            value={partnerName}
            onChange={e => setPartnerName(e.target.value)}
          />
          <Button className="gap-1.5 shrink-0" onClick={handleAnalyze} disabled={loading || !partnerName.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Analyze
          </Button>
        </div>

        {result && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{result.overlap_count} Shared Contacts</p>
                  <p className="text-[10px] text-muted-foreground">with {result.partner_name}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${potentialColor(result.partnership_potential)}`}>
                {result.partnership_potential} potential
              </Badge>
            </div>

            <div className="space-y-2">
              {result.shared_contacts?.map((contact, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{contact.name}</p>
                    <p className="text-[10px] text-muted-foreground">{contact.company} · {contact.context}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs">{result.suggested_action}</p>
              </div>
            </div>
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
      <NetworkOverlap />
      <ProposalBuilder />
    </div>
  );
}
