import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, LifeBuoy, Clock, CheckCircle, MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolved: "bg-green-500/10 text-green-400 border-green-500/20",
  closed: "bg-muted text-muted-foreground",
};

const CATEGORIES = [
  { value: "bug", label: "Bug / Something Broken" },
  { value: "account", label: "Account / Billing" },
  { value: "feature", label: "Feature Request" },
  { value: "leads", label: "Leads / Engine" },
  { value: "industry_change", label: "Change Industry / Vertical" },
  { value: "other", label: "Other" },
];

export default function HelpTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // New ticket form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("bug");
  const [submitting, setSubmitting] = useState(false);

  // Reply
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && user) loadTickets();
  }, [open, user]);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit ticket");
      return;
    }
    toast.success("Ticket submitted! We'll get back to you soon.");
    setTitle("");
    setDescription("");
    setCategory("bug");
    setView("list");
    loadTickets();
  };

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setView("detail");
    const { data } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    setSending(true);
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: replyText.trim(),
      is_admin: false,
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send");
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        ticket_id: selectedTicket.id,
        user_id: user!.id,
        message: replyText.trim(),
        is_admin: false,
        created_at: new Date().toISOString(),
      },
    ]);
    setReplyText("");
  };

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-[hsl(140_12%_58%)]" />
            {view === "new"
              ? "Submit a Ticket"
              : view === "detail"
              ? selectedTicket?.title
              : "Help & Support"}
          </DialogTitle>
        </DialogHeader>

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="space-y-3">
            <Button
              onClick={() => setView("new")}
              className="w-full gap-2 bg-[hsl(140_12%_42%)] hover:bg-[hsl(140_12%_48%)] text-white border-0"
              size="sm"
            >
              <Plus className="h-4 w-4" /> New Ticket
            </Button>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tickets yet. Submit one if you need help!
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:border-[hsl(140_12%_42%/0.3)] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${STATUS_COLORS[t.status] || ""}`}
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {format(new Date(t.created_at), "MMM d, h:mm a")}
                      <Badge variant="outline" className="text-[9px]">
                        {t.category}
                      </Badge>
                    </p>
                  </button>
                ))}
              </div>
            )}

            {openCount > 0 && (
              <p className="text-[10px] text-muted-foreground text-center">
                {openCount} open ticket{openCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* NEW TICKET VIEW */}
        {view === "new" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Details</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the issue or request in detail…"
                className="text-sm min-h-[80px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setView("list")} className="flex-1">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
                className="flex-1 gap-2 bg-[hsl(140_12%_42%)] hover:bg-[hsl(140_12%_48%)] text-white border-0"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit
              </Button>
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && selectedTicket && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={STATUS_COLORS[selectedTicket.status]}>
                {selectedTicket.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-[9px]">
                {selectedTicket.category}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {format(new Date(selectedTicket.created_at), "MMM d, h:mm a")}
              </span>
            </div>

            {selectedTicket.description && (
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                {selectedTicket.description}
              </p>
            )}

            {/* Messages */}
            <div className="border rounded-lg max-h-40 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No replies yet — our team will respond soon.
                </p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.is_admin ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                        m.is_admin ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="font-medium text-[10px] mb-0.5">
                        {m.is_admin ? "AURA Support" : "You"}
                      </p>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
              <div className="flex gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Add a reply…"
                  className="text-xs min-h-[50px]"
                />
                <Button
                  className="shrink-0"
                  size="sm"
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => setView("list")} className="w-full">
              ← Back to Tickets
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
