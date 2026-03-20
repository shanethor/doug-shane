import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Clock, Plus, Loader2, AlertTriangle, Check, Bell,
  RefreshCw, Send, Calendar, Zap, RotateCcw, Pause, Play,
} from "lucide-react";

interface CadenceContact {
  id: string;
  contact_name: string;
  contact_company: string | null;
  contact_email: string | null;
  cadence_days: number;
  last_touched_at: string;
  next_touch_at: string;
  touch_count: number;
  notes: string | null;
  is_active: boolean;
}

const CADENCE_OPTIONS = [
  { label: "Weekly", days: 7 },
  { label: "Bi-weekly", days: 14 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
];

export default function ConnectCadenceTab() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CadenceContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [cadenceDays, setCadenceDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [posting, setPosting] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("touch_cadence_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("next_touch_at", { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch {
      toast.error("Failed to load cadence contacts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleAdd = async () => {
    if (!name.trim() || !user) return;
    setPosting(true);
    try {
      const now = new Date();
      const nextTouch = new Date(now.getTime() + cadenceDays * 86400000);
      const { error } = await supabase.from("touch_cadence_contacts").insert({
        user_id: user.id,
        contact_name: name.trim(),
        contact_company: company.trim() || null,
        contact_email: email.trim() || null,
        cadence_days: cadenceDays,
        last_touched_at: now.toISOString(),
        next_touch_at: nextTouch.toISOString(),
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Contact added to cadence!");
      setName(""); setCompany(""); setEmail(""); setNotes("");
      setShowForm(false);
      loadContacts();
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setPosting(false);
    }
  };

  const handleMarkTouched = async (contact: CadenceContact) => {
    const now = new Date();
    const nextTouch = new Date(now.getTime() + contact.cadence_days * 86400000);
    try {
      const { error } = await supabase
        .from("touch_cadence_contacts")
        .update({
          last_touched_at: now.toISOString(),
          next_touch_at: nextTouch.toISOString(),
          touch_count: contact.touch_count + 1,
          updated_at: now.toISOString(),
        })
        .eq("id", contact.id);
      if (error) throw error;
      toast.success(`Touched! Next: ${nextTouch.toLocaleDateString()}`);
      loadContacts();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleToggleActive = async (contact: CadenceContact) => {
    try {
      const { error } = await supabase
        .from("touch_cadence_contacts")
        .update({ is_active: !contact.is_active, updated_at: new Date().toISOString() })
        .eq("id", contact.id);
      if (error) throw error;
      toast.success(contact.is_active ? "Paused" : "Resumed");
      loadContacts();
    } catch {
      toast.error("Failed to update");
    }
  };

  // Stats
  const overdue = contacts.filter(c => c.is_active && new Date(c.next_touch_at) < new Date());
  const dueThisWeek = contacts.filter(c => {
    if (!c.is_active) return false;
    const next = new Date(c.next_touch_at);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return next >= now && next <= weekFromNow;
  });
  const activeCount = contacts.filter(c => c.is_active).length;

  const daysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `${diff}d`;
  };

  const isOverdue = (d: string) => new Date(d) < new Date();

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Bell className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Active Cadences</p>
        </Card>
        <Card className="p-4 text-center">
          <Calendar className="h-5 w-5 mx-auto mb-1 text-warning" />
          <p className="text-2xl font-bold">{dueThisWeek.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Due This Week</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold">{overdue.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Overdue</p>
        </Card>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{overdue.length} contact{overdue.length > 1 ? "s" : ""}</span> overdue for a touch — don't let these go cold.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          Add to Cadence
        </Button>
        <p className="text-xs text-muted-foreground">Set up automated touch reminders for your top relationships</p>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contact Name</label>
                <Input placeholder="Sarah Johnson" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</label>
                <Input placeholder="Smith & Associates" value={company} onChange={e => setCompany(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                <Input placeholder="sarah@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Touch Frequency</label>
              <div className="flex gap-2">
                {CADENCE_OPTIONS.map(opt => (
                  <Button
                    key={opt.days}
                    variant={cadenceDays === opt.days ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setCadenceDays(opt.days)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
              <Input placeholder="Key topics, last conversation context..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handleAdd} disabled={posting || !name.trim()}>
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <RotateCcw className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No cadence contacts yet. Add your top 10-20 relationships to never lose touch.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map(contact => {
            const overdue = contact.is_active && isOverdue(contact.next_touch_at);
            return (
              <div
                key={contact.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  !contact.is_active ? "opacity-50" : overdue ? "border-destructive/30 bg-destructive/5" : "hover:bg-muted/30"
                }`}
              >
                <div className={`rounded-lg p-2 shrink-0 ${overdue ? "bg-destructive/10" : "bg-primary/10"}`}>
                  {overdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{contact.contact_name}</p>
                    {contact.contact_company && (
                      <span className="text-xs text-muted-foreground truncate">{contact.contact_company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      Every {contact.cadence_days}d
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {contact.touch_count} touches
                    </span>
                    {contact.notes && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{contact.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${overdue ? "text-destructive border-destructive/30" : "text-muted-foreground"}`}
                  >
                    {contact.is_active ? daysUntil(contact.next_touch_at) : "Paused"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleToggleActive(contact)}
                    title={contact.is_active ? "Pause" : "Resume"}
                  >
                    {contact.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  {contact.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => handleMarkTouched(contact)}
                    >
                      <Check className="h-3 w-3" /> Touched
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
