import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Building2, Phone, Mail, MapPin, DollarSign, FileText, ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

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

interface ClientLookupSheetProps {
  trigger: React.ReactNode;
  /** When provided, selecting a client calls this instead of just showing info */
  onSelect?: (lead: Lead) => void;
  /** If true, sheet closes after selection */
  closeOnSelect?: boolean;
}

export function ClientLookupSheet({ trigger, onSelect, closeOnSelect = false }: ClientLookupSheetProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search leads
  useEffect(() => {
    if (!open) return;
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
  }, [open, search]);

  // Load detail when selected
  useEffect(() => {
    if (!selected) return;
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

  const handleSelect = (lead: Lead) => {
    setSelected(lead);
    onSelect?.(lead);
    if (closeOnSelect) setOpen(false);
  };

  const STAGE_LABELS: Record<string, string> = {
    prospect: "Prospect",
    quoting: "Quoting",
    presenting: "Presenting",
    lost: "Lost",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelected(null); setSearch(""); } }}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {selected ? selected.account_name : "Pull Up Client"}
          </SheetTitle>
        </SheetHeader>

        {!selected ? (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or contact name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              {loading && <p className="text-xs text-muted-foreground text-center py-4">Searching…</p>}
              {!loading && leads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No clients found.</p>
              )}
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelect(lead)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.account_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {lead.contact_name || "No contact"} · {lead.line_type}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {STAGE_LABELS[lead.stage] || lead.stage}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1 text-xs">
              ← Back to search
            </Button>

            {/* Client Summary */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{selected.account_name}</h3>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {STAGE_LABELS[selected.stage] || selected.stage}
                    </Badge>
                  </div>
                  <Link to={`/lead/${selected.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <ExternalLink className="h-3 w-3" />
                      Open Full Page
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selected.contact_name && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3 w-3" /> {selected.contact_name}
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {selected.email}
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selected.phone}
                    </div>
                  )}
                  {selected.state && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {selected.state}
                    </div>
                  )}
                  {selected.business_type && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {selected.business_type}
                    </div>
                  )}
                  {selected.target_premium && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3 w-3" /> ${selected.target_premium.toLocaleString()}
                    </div>
                  )}
                </div>

                {selected.estimated_renewal_date && (
                  <p className="text-[10px] text-muted-foreground">
                    Renewal: {format(parseISO(selected.estimated_renewal_date), "MMM d, yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Policies */}
            {policies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Policies ({policies.length})
                </h4>
                {policies.map((pol) => (
                  <Card key={pol.id}>
                    <CardContent className="p-3 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{pol.carrier}</span>
                        <Badge variant={pol.status === "approved" ? "default" : "secondary"} className="text-[10px]">
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

            {/* Recent Notes */}
            {notes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Recent Notes
                </h4>
                {notes.map((n) => (
                  <div key={n.id} className="text-xs border-l-2 border-primary/20 pl-3 py-1">
                    <p>{n.note_text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(parseISO(n.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
