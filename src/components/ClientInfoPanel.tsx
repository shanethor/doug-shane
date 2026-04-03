import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, User, Building2, Phone, Mail, MapPin, DollarSign,
  ExternalLink, X, Share2, Check, FileText, Calendar, StickyNote,
  Shield, AlertTriangle, Clock, Download, ArrowLeft,
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
  lead_source: string | null;
  created_at: string;
}

interface ClientInfoPanelProps {
  onClose: () => void;
  onShare?: (lead: Lead) => void;
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

export function ClientInfoPanel({ onClose, onShare, sharedClient }: ClientInfoPanelProps) {
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [lossRuns, setLossRuns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (sharedClient) setSelected(sharedClient);
  }, [sharedClient]);

  // Search leads
  useEffect(() => {
    if (selected) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("leads")
        .select("id, account_name, contact_name, email, phone, state, business_type, line_type, stage, target_premium, estimated_renewal_date, lead_source, created_at")
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

  // Load all detail data when selected
  useEffect(() => {
    if (!selected) {
      setPolicies([]); setNotes([]); setDocuments([]);
      setSubmissions([]); setLossRuns([]); setEvents([]);
      return;
    }
    const id = selected.id;

    supabase.from("policies")
      .select("id, policy_number, carrier, line_of_business, annual_premium, revenue, status, effective_date")
      .eq("lead_id", id)
      .then(({ data }) => setPolicies(data || []));

    supabase.from("lead_notes")
      .select("id, note_text, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setNotes(data || []));

    supabase.from("client_documents")
      .select("id, file_name, document_type, file_size, file_url, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setDocuments(data || []));

    supabase.from("business_submissions")
      .select("id, company_name, status, coverage_lines, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSubmissions(data || []));

    supabase.from("loss_run_requests")
      .select("id, status, request_type, requested_at, completed_at, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLossRuns(data || []));

    supabase.from("calendar_events")
      .select("id, title, start_time, event_type, status")
      .eq("lead_id", id)
      .order("start_time", { ascending: false })
      .limit(5)
      .then(({ data }) => setEvents(data || []));
  }, [selected]);

  const handleShare = () => {
    if (selected && onShare) {
      onShare(selected);
      toast.success(`Shared "${selected.account_name}" with the call`);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const totalPremium = policies.reduce((s, p) => s + (p.annual_premium || 0), 0);
  const totalRevenue = policies.reduce((s, p) => s + (p.revenue || 0), 0);

  return (
    <div className="bg-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold truncate">
            {selected ? selected.account_name : "Pull Up Client"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selected && onShare && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary" onClick={handleShare}>
              <Share2 className="h-3 w-3" />
              Share
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
            /* Search view */
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
                  onClick={() => { setSelected(lead); setActiveTab("overview"); }}
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
            /* Detail view */
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1 text-[10px] h-6 px-2">
                ← Back
              </Button>

              {/* Client header card */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{selected.account_name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">
                          {STAGE_LABELS[selected.stage] || selected.stage}
                        </Badge>
                        <Badge variant="secondary" className="text-[9px]">
                          {selected.line_type}
                        </Badge>
                      </div>
                    </div>
                    <Link to={`/lead/${selected.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-1 text-[10px] h-6 px-2 shrink-0">
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {selected.contact_name && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-2.5 w-2.5 shrink-0" /> {selected.contact_name}
                      </div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-1 text-muted-foreground truncate">
                        <Mail className="h-2.5 w-2.5 shrink-0" /> {selected.email}
                      </div>
                    )}
                    {selected.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-2.5 w-2.5 shrink-0" /> {selected.phone}
                      </div>
                    )}
                    {selected.state && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" /> {selected.state}
                      </div>
                    )}
                    {selected.business_type && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-2.5 w-2.5 shrink-0" /> {selected.business_type}
                      </div>
                    )}
                    {selected.lead_source && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Search className="h-2.5 w-2.5 shrink-0" /> {selected.lead_source}
                      </div>
                    )}
                  </div>

                  {/* Financial summary */}
                  <div className="flex gap-3 pt-1 border-t border-border mt-1">
                    {selected.target_premium && (
                      <div className="text-[10px]">
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-medium">${selected.target_premium.toLocaleString()}</span>
                      </div>
                    )}
                    {totalPremium > 0 && (
                      <div className="text-[10px]">
                        <span className="text-muted-foreground">Written: </span>
                        <span className="font-medium">${totalPremium.toLocaleString()}</span>
                      </div>
                    )}
                    {totalRevenue > 0 && (
                      <div className="text-[10px]">
                        <span className="text-muted-foreground">Revenue: </span>
                        <span className="font-medium text-green-600">${totalRevenue.toLocaleString()}</span>
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

              {/* Tabbed detail sections */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full h-7">
                  <TabsTrigger value="overview" className="text-[10px] h-6 px-2">Overview</TabsTrigger>
                  <TabsTrigger value="docs" className="text-[10px] h-6 px-2">
                    Docs {documents.length > 0 && `(${documents.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-[10px] h-6 px-2">
                    Notes {notes.length > 0 && `(${notes.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-[10px] h-6 px-2">Activity</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-2 space-y-3">
                  {/* Policies */}
                  {policies.length > 0 ? (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Policies ({policies.length})
                      </h4>
                      {policies.map((pol) => (
                        <Card key={pol.id}>
                          <CardContent className="p-2 text-[10px] space-y-0.5">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{pol.carrier}</span>
                              <Badge
                                variant={pol.status === "approved" ? "default" : "secondary"}
                                className="text-[9px]"
                              >
                                {pol.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{pol.line_of_business} · #{pol.policy_number}</p>
                            <div className="flex gap-2 text-muted-foreground">
                              <span>${pol.annual_premium?.toLocaleString()}</span>
                              {pol.revenue && <span className="text-green-600">Rev: ${pol.revenue.toLocaleString()}</span>}
                              <span>Eff {format(parseISO(pol.effective_date), "MMM d, yyyy")}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No policies yet.</p>
                  )}

                  {/* Submissions */}
                  {submissions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Submissions ({submissions.length})
                      </h4>
                      {submissions.map((sub) => (
                        <div key={sub.id} className="text-[10px] border-l-2 border-accent/30 pl-2 py-1">
                          <p className="font-medium">{sub.company_name || "Submission"}</p>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Badge variant="outline" className="text-[8px]">{sub.status}</Badge>
                            {sub.coverage_lines?.length > 0 && (
                              <span>{sub.coverage_lines.join(", ")}</span>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground">{format(parseISO(sub.created_at), "MMM d, yyyy")}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loss Runs */}
                  {lossRuns.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Loss Runs ({lossRuns.length})
                      </h4>
                      {lossRuns.map((lr) => (
                        <div key={lr.id} className="text-[10px] flex items-center gap-2 py-1">
                          <Badge
                            variant={lr.status === "complete_received" ? "default" : "outline"}
                            className="text-[8px]"
                          >
                            {lr.status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-muted-foreground">{lr.request_type}</span>
                          <span className="text-muted-foreground ml-auto">{format(parseISO(lr.created_at), "MMM d")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* DOCUMENTS TAB */}
                <TabsContent value="docs" className="mt-2 space-y-1.5">
                  {documents.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No documents uploaded.</p>
                  ) : (
                    documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{doc.file_name}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {doc.document_type} {doc.file_size ? `· ${formatBytes(doc.file_size)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-muted-foreground">{format(parseISO(doc.created_at), "MMM d")}</span>
                          <Download className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </a>
                    ))
                  )}
                </TabsContent>

                {/* NOTES TAB */}
                <TabsContent value="notes" className="mt-2 space-y-1.5">
                  {notes.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No notes yet.</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className="text-[10px] border-l-2 border-primary/20 pl-2 py-1">
                        <p>{n.note_text}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {format(parseISO(n.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="mt-2 space-y-2">
                  {/* Calendar events */}
                  {events.length > 0 ? (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Events ({events.length})
                      </h4>
                      {events.map((evt) => (
                        <div key={evt.id} className="text-[10px] flex items-center gap-2 py-1">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{evt.title}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {format(parseISO(evt.start_time), "MMM d, h:mm a")} · {evt.event_type}
                            </p>
                          </div>
                          <Badge
                            variant={evt.status === "completed" ? "default" : "outline"}
                            className="text-[8px]"
                          >
                            {evt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No events for this client.</p>
                  )}

                  {/* Quick stats */}
                  <Card>
                    <CardContent className="p-2">
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div>
                          <p className="font-bold text-sm">{policies.length}</p>
                          <p className="text-muted-foreground">Policies</p>
                        </div>
                        <div>
                          <p className="font-bold text-sm">{documents.length}</p>
                          <p className="text-muted-foreground">Docs</p>
                        </div>
                        <div>
                          <p className="font-bold text-sm">{notes.length}</p>
                          <p className="text-muted-foreground">Notes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-[9px] text-muted-foreground">
                    Created {format(parseISO(selected.created_at), "MMM d, yyyy")}
                  </p>
                </TabsContent>
              </Tabs>
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
