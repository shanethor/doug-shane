import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, Edit3, Phone, Clock, CheckCircle, Loader2, CalendarDays, Send } from "lucide-react";
import { toast } from "sonner";

type StudioRequest = {
  id: string;
  user_id: string;
  request_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_delivery: string | null;
  admin_notes: string | null;
  scheduled_date: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In Review" },
  { value: "building", label: "Building" },
  { value: "delivered", label: "Delivered" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLOR: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  building: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_ICON: Record<string, any> = {
  new_build: Wrench,
  edit: Edit3,
  call_schedule: Phone,
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-destructive border-destructive/30",
  high: "text-amber-400 border-amber-500/20",
  normal: "text-muted-foreground border-border",
  low: "text-muted-foreground/50 border-border/50",
};

export default function AdminStudioQueue({ profileNameMap }: { profileNameMap: Record<string, string> }) {
  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRequests();
    const channel = supabase
      .channel("admin-studio")
      .on("postgres_changes", { event: "*", schema: "public", table: "studio_requests" }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("studio_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setRequests(data as any);
      const notes: Record<string, string> = {};
      (data as any[]).forEach(r => { notes[r.id] = r.admin_notes || ""; });
      setNoteMap(notes);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("studio_requests").update({ status } as any).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Status updated to ${status.replace("_", " ")}`);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const saveNote = async (id: string) => {
    setSavingMap(prev => ({ ...prev, [id]: true }));
    const { error } = await supabase.from("studio_requests").update({ admin_notes: noteMap[id] || null } as any).eq("id", id);
    setSavingMap(prev => ({ ...prev, [id]: false }));
    if (error) { toast.error("Failed to save note"); return; }
    toast.success("Note saved");
    setRequests(prev => prev.map(r => r.id === id ? { ...r, admin_notes: noteMap[id] || null } : r));
  };

  const activeRequests = requests.filter(r => !["delivered", "completed", "cancelled"].includes(r.status));

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-semibold">Studio Build Queue</h2>
        <Badge variant="outline" className="text-xs">{requests.length} total</Badge>
        {activeRequests.length > 0 && (
          <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">{activeRequests.length} active</Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No studio requests yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const TypeIcon = TYPE_ICON[req.request_type] || Wrench;
            return (
              <Card key={req.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{req.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {profileNameMap[req.user_id] || "Unknown user"} · {req.request_type.replace("_", " ")} · {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {req.priority !== "normal" && (
                        <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLOR[req.priority]}`}>{req.priority}</Badge>
                      )}
                      <Select value={req.status} onValueChange={(v) => updateStatus(req.id, v)}>
                        <SelectTrigger className={`h-7 text-[10px] w-auto gap-1 ${STATUS_COLOR[req.status] || ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {req.description && (
                    <p className="text-xs text-muted-foreground pl-11">{req.description}</p>
                  )}

                  {req.scheduled_date && (
                    <div className="flex items-center gap-1.5 pl-11 text-xs text-primary">
                      <CalendarDays className="h-3 w-3" />
                      Call: {new Date(req.scheduled_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  )}

                  {req.estimated_delivery && (
                    <div className="flex items-center gap-1.5 pl-11 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Est. delivery: {req.estimated_delivery}
                    </div>
                  )}

                  {/* Admin notes */}
                  <div className="pl-11 flex gap-2 items-end">
                    <Textarea
                      value={noteMap[req.id] || ""}
                      onChange={(e) => setNoteMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Add a note for the client..."
                      className="text-xs min-h-[36px] h-9 resize-none"
                      rows={1}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 shrink-0 gap-1 text-xs"
                      disabled={savingMap[req.id]}
                      onClick={() => saveNote(req.id)}
                    >
                      {savingMap[req.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Save
                    </Button>
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
