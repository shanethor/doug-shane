import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LifeBuoy, Clock, CheckCircle, AlertCircle, MessageSquare, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolved: "bg-green-500/10 text-green-400 border-green-500/20",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-warning/20 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export default function AdminSupportTickets({ profiles }: { profiles: any[] }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("open");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name || "Unknown"]));

  useEffect(() => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setTickets(data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("support_ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const updateStatus = async (ticketId: string, status: string) => {
    await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString(), ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) } as any).eq("id", ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    if (selectedTicket?.id === ticketId) setSelectedTicket((prev: any) => prev ? { ...prev, status } : null);
    toast.success(`Ticket ${status.replace("_", " ")}`);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: replyText.trim(),
      is_admin: true,
    } as any);
    setSending(false);
    if (error) { toast.error("Failed to send reply"); return; }
    setMessages(prev => [...prev, { ticket_id: selectedTicket.id, user_id: user.id, message: replyText.trim(), is_admin: true, created_at: new Date().toISOString() }]);
    setReplyText("");
    toast.success("Reply sent");
  };

  const openCount = tickets.filter(t => t.status === "open").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open ({openCount})</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-xs">{filtered.length} ticket(s)</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No tickets found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => (
            <Card key={ticket.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openTicket(ticket)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${PRIORITY_COLORS[ticket.priority] || ""}`}>{ticket.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ticket.description || "No description"}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />{profileMap.get(ticket.user_id) || ticket.user_id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{format(new Date(ticket.created_at), "MMM d, h:mm a")}
                      </span>
                      <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[ticket.status] || ""}`}>{ticket.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-[9px]">{ticket.category}</Badge>
                    </div>
                  </div>
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{selectedTicket?.title}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={STATUS_COLORS[selectedTicket.status]}>{selectedTicket.status.replace("_", " ")}</Badge>
                <Badge variant="outline" className={PRIORITY_COLORS[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">{profileMap.get(selectedTicket.user_id) || "Unknown user"}</span>
              </div>
              {selectedTicket.description && (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{selectedTicket.description}</p>
              )}

              {/* Status actions */}
              <div className="flex gap-2">
                {selectedTicket.status === "open" && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus(selectedTicket.id, "in_progress")}>
                    <AlertCircle className="h-3 w-3" /> Mark In Progress
                  </Button>
                )}
                {(selectedTicket.status === "open" || selectedTicket.status === "in_progress") && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus(selectedTicket.id, "resolved")}>
                    <CheckCircle className="h-3 w-3" /> Resolve
                  </Button>
                )}
              </div>

              {/* Messages thread */}
              <div className="border rounded-lg max-h-48 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No messages yet</p>
                ) : messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.is_admin ? "flex-row-reverse" : ""}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${m.is_admin ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="font-medium text-[10px] mb-0.5">{m.is_admin ? "Admin" : profileMap.get(m.user_id) || "User"}</p>
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="flex gap-2">
                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to user…" className="text-xs min-h-[60px]" />
                <Button className="shrink-0" onClick={sendReply} disabled={!replyText.trim() || sending}>Send</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
