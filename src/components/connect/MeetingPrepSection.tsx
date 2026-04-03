import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Brain, Loader2, Calendar, Download, ArrowRight, ArrowLeft,
  Sparkles, Phone, Linkedin, CheckCircle, Send, Edit,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";

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

interface MeetingPrepSectionProps {
  compact?: boolean;
  clientNamePrefill?: string;
}

export default function MeetingPrepSection({ compact = false, clientNamePrefill }: MeetingPrepSectionProps) {
  const [clientName, setClientName] = useState(clientNamePrefill || "");
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
  useEffect(() => { if (clientNamePrefill) setClientName(clientNamePrefill); }, [clientNamePrefill]);

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
    <div className="space-y-4">
      {!compact && (
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
            Meeting Prep — Feeder List
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Generate warm referral targets from your network before any meeting.</p>
        </div>
      )}

      {/* Generator Form */}
      <Card style={{ background: compact ? "hsl(240 8% 9%)" : undefined, borderColor: compact ? "hsl(140 12% 42% / 0.2)" : undefined }}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Client Name</label>
              <Input placeholder="e.g. Doug Wenz" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={generating} className="h-9" style={compact ? { background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" } : undefined} />
            </div>
            <div className="w-full sm:w-40">
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Meeting Date</label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} disabled={generating} className="h-9" style={compact ? { background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" } : undefined} />
            </div>
            <div className="flex items-end">
              <Button onClick={generateList} disabled={generating} size="sm" className="w-full sm:w-auto h-9" style={compact ? { background: "hsl(140 12% 42%)", color: "white" } : undefined}>
                {generating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</> : <><Brain className="h-3.5 w-3.5 mr-1.5" /> Generate</>}
              </Button>
            </div>
          </div>
          {progress && (
            <div className="mt-3 flex items-center gap-2 text-xs animate-pulse" style={{ color: "hsl(140 12% 58%)" }}>
              <Sparkles className="h-3.5 w-3.5" /> {progress}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospects */}
      {selectedList && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Feeder List Results</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setSelectedList(null); setProspects([]); }}>← Back</Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px]"><Download className="h-3 w-3 mr-1" /> Export</Button>
            </div>
          </div>
          {loadingProspects ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-2">
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
                <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No prospects found.</CardContent></Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Lists */}
      {feederLists.length > 0 && !selectedList && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Recent Feeder Lists</p>
          <div className="grid gap-1.5">
            {feederLists.slice(0, compact ? 5 : 20).map((fl) => (
              <div
                key={fl.id}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/30"
                style={compact ? { background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" } : undefined}
                onClick={() => { setSelectedList(fl.id); setClientName(fl.client_name); loadProspects(fl.id); }}
              >
                <div>
                  <p className="text-sm font-medium">{fl.client_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fl.meeting_date ? `📅 ${new Date(fl.meeting_date).toLocaleDateString()}` : "No date"} · {new Date(fl.generated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {fl.auto_triggered && <Badge variant="secondary" className="text-[9px]">⚡ Auto</Badge>}
                  <Badge variant={fl.status === "ready" ? "default" : "secondary"} className="text-[9px]">{fl.status}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
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
