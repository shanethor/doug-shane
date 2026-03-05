import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, User, Building2, Phone, Mail, MapPin, DollarSign,
  ExternalLink, X, Share2, Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Lead {
  id: string;
  account_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  business_type: string | null;
  line_type: string;
  stage: string;
  target_premium: number | null;
  estimated_renewal_date: string | null;
  created_at: string;
}

interface ClientInfoPanelProps {
  onClose: () => void;
  /** Called when user clicks "Share with call" */
  onShare?: (lead: Lead) => void;
  /** If a shared client was pushed by the other user */
  sharedClient?: Lead | null;
  onAcceptShared?: () => void;
  onDismissShared?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  quoting: "Quoting",
  presenting: "Presenting",
  lost: "Lost",
};

export function ClientInfoPanel({ onClose, onShare, sharedClient, onAcceptShared, onDismissShared }: ClientInfoPanelProps) {
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // If shared client comes in, show it
  useEffect(() => {
    if (sharedClient) {
      setSelected(sharedClient);
    }
  }, [sharedClient]);

  // Search leads
  useEffect(() => {
    if (selected) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("leads")
        .select("id, account_name, contact_name, email, phone, state, business_type, line_type, stage, target_premium, estimated_renewal_date, created_at")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (search.trim()) {
        query = query.or(`account_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
      }

      const { data } = await query;
      setLeads(data || []);
      setLoading(false);
    };
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, selected]);

  // Load detail when selected
  useEffect(() => {
    if (!selected) { setPolicies([]); setNotes([]); return; }
    supabase
      .from("policies")
      .select("id, policy_number, carrier, line_of_business, annual_premium, status, effective_date")
      .eq("lead_id", selected.id)
      .then(({ data }) => setPolicies(data || []));
    supabase
      .from("lead_notes")
      .select("id, note_text, created_at")
      .eq("lead_id", selected.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setNotes(data || []));
  }, [selected]);

  const handleShare = () => {
    if (selected && onShare) {
      onShare(selected);
      toast.success(`Shared "${selected.account_name}" with the call`);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: "420px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">
            {selected ? selected.account_name : "Pull Up Client"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && onShare && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary" onClick={handleShare}>
              <Share2 className="h-3 w-3" />
              Share with call
            </Button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {!selected ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search clients…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  autoFocus
                />
              </div>

              {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Searching…</p>}
              {!loading && leads.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-3">No clients found.</p>
              )}
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{lead.account_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {lead.contact_name || "No contact"} · {lead.line_type}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {STAGE_LABELS[lead.stage] || lead.stage}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1 text-[10px] h-6 px-2">
                ← Back
              </Button>

              {/* Summary */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{selected.account_name}</h3>
                      <Badge variant="outline" className="text-[9px] mt-0.5">
                        {STAGE_LABELS[selected.stage] || selected.stage}
                      </Badge>
                    </div>
                    <Link to={`/lead/${selected.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-1 text-[10px] h-6 px-2">
                        <ExternalLink className="h-3 w-3" />
                        Full Page
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {selected.contact_name && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-2.5 w-2.5" /> {selected.contact_name}
                      </div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-2.5 w-2.5" /> {selected.email}
                      </div>
                    )}
                    {selected.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-2.5 w-2.5" /> {selected.phone}
                      </div>
                    )}
                    {selected.state && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" /> {selected.state}
                      </div>
                    )}
                    {selected.business_type && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-2.5 w-2.5" /> {selected.business_type}
                      </div>
                    )}
                    {selected.target_premium && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-2.5 w-2.5" /> ${selected.target_premium.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {selected.estimated_renewal_date && (
                    <p className="text-[9px] text-muted-foreground">
                      Renewal: {format(parseISO(selected.estimated_renewal_date), "MMM d, yyyy")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Policies */}
              {policies.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Policies ({policies.length})
                  </h4>
                  {policies.map((pol) => (
                    <Card key={pol.id}>
                      <CardContent className="p-2 text-[10px] space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{pol.carrier}</span>
                          <Badge variant={pol.status === "approved" ? "default" : "secondary"} className="text-[9px]">
                            {pol.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{pol.line_of_business} · #{pol.policy_number}</p>
                        <p className="text-muted-foreground">${pol.annual_premium?.toLocaleString()} · Eff {format(parseISO(pol.effective_date), "MMM d, yyyy")}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Notes */}
              {notes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Recent Notes
                  </h4>
                  {notes.map((n) => (
                    <div key={n.id} className="text-[10px] border-l-2 border-primary/20 pl-2 py-0.5">
                      <p>{n.note_text}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {format(parseISO(n.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Floating notification when a shared client is incoming */
export function SharedClientBanner({
  clientName,
  onAccept,
  onDismiss,
}: {
  clientName: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
      <Share2 className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          Client shared: <span className="text-primary">{clientName}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">Another participant shared client info with the call.</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" className="h-7 text-[10px] gap-1" onClick={onAccept}>
          <Check className="h-3 w-3" />
          View
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
