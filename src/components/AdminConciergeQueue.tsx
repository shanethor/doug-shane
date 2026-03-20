import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES, STATUS_ORDER } from "@/hooks/useConcierge";
import { toast } from "sonner";
import { Clock, Loader2, CheckCircle, AlertCircle, Archive, Wrench } from "lucide-react";

interface ConciergeReq {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ConciergeSub {
  user_id: string;
  subscription_status: string;
  trial_end_at: string | null;
}

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  needs_info: "bg-warning/20 text-warning",
  completed: "bg-success/20 text-success",
  archived: "bg-muted text-muted-foreground",
};

export default function AdminConciergeQueue({ profileMap }: { profileMap: Record<string, string> }) {
  const [requests, setRequests] = useState<ConciergeReq[]>([]);
  const [subs, setSubs] = useState<ConciergeSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const load = async () => {
      const [reqRes, subRes] = await Promise.all([
        supabase.from("concierge_requests" as any).select("*").order("created_at", { ascending: false }),
        supabase.from("concierge_subscriptions" as any).select("user_id, subscription_status, trial_end_at"),
      ]);
      setRequests((reqRes.data as any) ?? []);
      setSubs((subRes.data as any) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const subMap = new Map(subs.map(s => [s.user_id, s]));

  const updateStatus = async (id: string, userId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const sub = subMap.get(userId);
      if (!sub || sub.subscription_status !== "active") {
        toast.error("User not active on AURA CONCIERGE; cannot mark request completed.");
        return;
      }
    }
    const updates: any = { status: newStatus };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await (supabase.from("concierge_requests" as any) as any).update(updates).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    toast.success("Status updated");
  };

  const saveNotes = async (id: string) => {
    const { error } = await (supabase.from("concierge_requests" as any) as any).update({ internal_notes: noteText }).eq("id", id);
    if (error) { toast.error("Failed to save notes"); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, internal_notes: noteText } : r));
    setEditingNotes(null);
    toast.success("Notes saved");
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No concierge requests found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const sub = subMap.get(r.user_id);
            const subLabel = sub?.subscription_status === "active" ? "Paid" :
              sub?.subscription_status === "trial_active" ? "Trial" : "Inactive";
            const subColor = sub?.subscription_status === "active" ? "text-success" :
              sub?.subscription_status === "trial_active" ? "text-[#F59E0B]" : "text-destructive";
            return (
              <Card key={r.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {profileMap[r.user_id] || r.user_id.slice(0, 8)} · <span className={subColor}>{subLabel}</span> · {CATEGORIES.find(c => c.value === r.category)?.label || r.category}
                      </div>
                    </div>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, r.user_id, v)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColors[r.status] || ""}`}>{r.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 ml-auto" onClick={() => { setEditingNotes(r.id); setNoteText(r.internal_notes || ""); }}>
                      {r.internal_notes ? "Edit Notes" : "Add Notes"}
                    </Button>
                  </div>
                  {editingNotes === r.id && (
                    <div className="space-y-2">
                      <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} placeholder="Internal notes..." className="text-xs" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingNotes(null)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveNotes(r.id)}>Save</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
