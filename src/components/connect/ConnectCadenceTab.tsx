import { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Clock, Plus, Loader2, AlertTriangle, Check, Bell,
  Calendar, RotateCcw, Pause, Play, Gift, Cake,
  Star, Phone, Mail, MessageSquare, Linkedin,
  CalendarPlus, Sparkles, Copy, ChevronDown, ChevronUp,
  Trophy, Heart, PartyPopper, Building2, User,
} from "lucide-react";

// ─── Types ───

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
  birthday: string | null;
  anniversary: string | null;
  milestone_date: string | null;
  milestone_label: string | null;
  gift_preferences: string | null;
  relationship_tier: string | null;
  last_gift_at: string | null;
  touch_type: string | null;
}

interface TouchLog {
  id: string;
  touch_type: string;
  note: string | null;
  created_at: string;
}

interface UpcomingDate {
  contact: CadenceContact;
  type: "birthday" | "anniversary" | "milestone" | "touch";
  date: Date;
  label: string;
  daysAway: number;
}

// ─── Constants ───

const CADENCE_OPTIONS = [
  { label: "Weekly", days: 7 },
  { label: "Bi-weekly", days: 14 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
];

const TIER_OPTIONS = [
  { label: "S-Tier", value: "S", color: "text-warning", desc: "Inner circle — nurture weekly" },
  { label: "A-Tier", value: "A", color: "text-success", desc: "Key partners — monthly touch" },
  { label: "B-Tier", value: "B", color: "text-primary", desc: "Growing — quarterly check-in" },
  { label: "C-Tier", value: "C", color: "text-muted-foreground", desc: "Monitor — annual touchpoint" },
];

const TOUCH_TYPES = [
  { label: "Call", value: "call", icon: Phone },
  { label: "Email", value: "email", icon: Mail },
  { label: "Text", value: "text", icon: MessageSquare },
  { label: "LinkedIn", value: "linkedin", icon: Linkedin },
  { label: "Gift", value: "gift", icon: Gift },
  { label: "Meeting", value: "meeting", icon: Calendar },
];

// ─── Helpers ───

function getNextOccurrence(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (thisYear >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return thisYear;
  }
  return new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
}

function daysFromNow(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDaysAway(n: number): string {
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "Today!";
  if (n === 1) return "Tomorrow";
  if (n <= 7) return `${n}d away`;
  if (n <= 30) return `${Math.ceil(n / 7)}w away`;
  return `${Math.ceil(n / 30)}mo away`;
}

const dateIcon = (type: string) => {
  switch (type) {
    case "birthday": return <Cake className="h-4 w-4 text-pink-500" />;
    case "anniversary": return <Trophy className="h-4 w-4 text-warning" />;
    case "milestone": return <Star className="h-4 w-4 text-accent" />;
    default: return <Bell className="h-4 w-4 text-primary" />;
  }
};

// ─── Sub-components ───

function UpcomingDatesPanel({ dates }: { dates: UpcomingDate[] }) {
  if (dates.length === 0) return null;

  return (
    <Card className="border-warning/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PartyPopper className="h-4 w-4 text-warning" />
          Upcoming Key Dates
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">Don't miss these moments — they're relationship gold</p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {dates.map((d, i) => (
          <div
            key={`${d.contact.id}-${d.type}-${i}`}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
              d.daysAway <= 3 ? "bg-warning/10 border border-warning/20" : "bg-muted/30 hover:bg-muted/50"
            }`}
          >
            {dateIcon(d.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{d.contact.contact_name}</p>
              <p className="text-[10px] text-muted-foreground">{d.label}</p>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${
                d.daysAway <= 3 ? "text-warning border-warning/30" : d.daysAway <= 7 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {formatDaysAway(d.daysAway)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TouchLogPanel({ contactId, userId }: { contactId: string; userId: string }) {
  const [logs, setLogs] = useState<TouchLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("touch_history")
        .select("id, touch_type, note, created_at")
        .eq("cadence_contact_id", contactId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, [contactId, userId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (logs.length === 0) return <p className="text-[10px] text-muted-foreground italic">No touch history yet</p>;

  const typeIcon = (t: string) => {
    const found = TOUCH_TYPES.find(tt => tt.value === t);
    if (!found) return <Bell className="h-3 w-3" />;
    const Icon = found.icon;
    return <Icon className="h-3 w-3" />;
  };

  return (
    <div className="space-y-1">
      {logs.map(log => (
        <div key={log.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {typeIcon(log.touch_type)}
          <span className="capitalize">{log.touch_type}</span>
          {log.note && <span className="truncate max-w-[160px]">— {log.note}</span>}
          <span className="ml-auto shrink-0">
            {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── AI Re-engagement Prompt ───

function AIReengagementPrompt({ contact }: { contact: CadenceContact }) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [visible, setVisible] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setPrompt("");
    setVisible(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a relationship coach for sales professionals. Generate a short, warm re-engagement message for:

Name: ${contact.contact_name}
Company: ${contact.contact_company || "Unknown"}
Relationship Tier: ${contact.relationship_tier || "B"}-Tier
Last Touch: ${new Date(contact.last_touched_at).toLocaleDateString()}
Notes: ${contact.notes || "None"}
${contact.gift_preferences ? `Gift preferences: ${contact.gift_preferences}` : ""}
${contact.milestone_label ? `Recent milestone: ${contact.milestone_label}` : ""}

Write a 2-3 sentence re-engagement text/email that feels personal and warm — not salesy. Reference any context available. Just the message, no subject line.`,
          },
        },
      });
      if (error) throw error;
      setPrompt(data?.text || data?.response || "Could not generate prompt.");
    } catch {
      toast.error("Failed to generate prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Copied!");
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 gap-1 text-[10px] text-accent"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        AI Prompt
      </Button>
      {visible && prompt && (
        <div className="rounded-lg bg-accent/5 border border-accent/10 p-3 space-y-2 animate-in fade-in-0 duration-200">
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{prompt}</p>
          <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px]" onClick={handleCopy}>
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function ConnectCadenceTab() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CadenceContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [cadenceDays, setCadenceDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [tier, setTier] = useState("B");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneLabel, setMilestoneLabel] = useState("");
  const [giftPrefs, setGiftPrefs] = useState("");
  const [posting, setPosting] = useState(false);

  // Touch logging
  const [touchType, setTouchType] = useState("call");
  const [touchNote, setTouchNote] = useState("");

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
      setContacts((data as CadenceContact[]) || []);
    } catch {
      toast.error("Failed to load cadence contacts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ─── Upcoming dates calculation ───
  const upcomingDates = useMemo(() => {
    const dates: UpcomingDate[] = [];
    const now = new Date();

    contacts.forEach(c => {
      if (!c.is_active) return;

      if (c.birthday) {
        const next = getNextOccurrence(c.birthday);
        const days = daysFromNow(next);
        if (days <= 30) {
          dates.push({ contact: c, type: "birthday", date: next, label: `Birthday — ${next.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`, daysAway: days });
        }
      }
      if (c.anniversary) {
        const next = getNextOccurrence(c.anniversary);
        const days = daysFromNow(next);
        if (days <= 30) {
          dates.push({ contact: c, type: "anniversary", date: next, label: `Business Anniversary — ${next.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`, daysAway: days });
        }
      }
      if (c.milestone_date) {
        const next = getNextOccurrence(c.milestone_date);
        const days = daysFromNow(next);
        if (days <= 30) {
          dates.push({ contact: c, type: "milestone", date: next, label: c.milestone_label || "Milestone", daysAway: days });
        }
      }
    });

    dates.sort((a, b) => a.daysAway - b.daysAway);
    return dates.slice(0, 8);
  }, [contacts]);

  // ─── Add contact ───
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
        contact_email: formEmail.trim() || null,
        cadence_days: cadenceDays,
        last_touched_at: now.toISOString(),
        next_touch_at: nextTouch.toISOString(),
        notes: notes.trim() || null,
        relationship_tier: tier,
        birthday: birthday || null,
        anniversary: anniversary || null,
        milestone_date: milestoneDate || null,
        milestone_label: milestoneLabel.trim() || null,
        gift_preferences: giftPrefs.trim() || null,
      });
      if (error) throw error;
      toast.success("Contact added to cadence!");
      resetForm();
      loadContacts();
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setPosting(false);
    }
  };

  const resetForm = () => {
    setName(""); setCompany(""); setFormEmail(""); setNotes("");
    setBirthday(""); setAnniversary(""); setMilestoneDate("");
    setMilestoneLabel(""); setGiftPrefs(""); setTier("B");
    setCadenceDays(30); setShowForm(false);
  };

  // ─── Mark touched with log ───
  const handleMarkTouched = async (contact: CadenceContact) => {
    if (!user) return;
    const now = new Date();
    const nextTouch = new Date(now.getTime() + contact.cadence_days * 86400000);
    try {
      // Update contact
      const { error } = await supabase
        .from("touch_cadence_contacts")
        .update({
          last_touched_at: now.toISOString(),
          next_touch_at: nextTouch.toISOString(),
          touch_count: contact.touch_count + 1,
          updated_at: now.toISOString(),
          last_gift_at: touchType === "gift" ? now.toISOString() : contact.last_gift_at,
        })
        .eq("id", contact.id);
      if (error) throw error;

      // Log the touch
      await supabase.from("touch_history").insert({
        user_id: user.id,
        cadence_contact_id: contact.id,
        touch_type: touchType,
        note: touchNote.trim() || null,
      });

      toast.success(`Touched! Next: ${nextTouch.toLocaleDateString()}`);
      setTouchNote("");
      loadContacts();
    } catch {
      toast.error("Failed to update");
    }
  };

  // ─── Sync to calendar ───
  const handleSyncToCalendar = async (contact: CadenceContact) => {
    if (!user) return;
    setSyncing(contact.id);
    try {
      const nextTouch = new Date(contact.next_touch_at);
      const endTime = new Date(nextTouch.getTime() + 15 * 60000); // 15 min event

      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: `Touch: ${contact.contact_name}${contact.contact_company ? ` (${contact.contact_company})` : ""}`,
        description: [
          `Relationship Tier: ${contact.relationship_tier || "B"}-Tier`,
          contact.notes ? `Notes: ${contact.notes}` : null,
          contact.gift_preferences ? `Gift ideas: ${contact.gift_preferences}` : null,
          `Touch #${contact.touch_count + 1} — Cadence: every ${contact.cadence_days} days`,
        ].filter(Boolean).join("\n"),
        start_time: nextTouch.toISOString(),
        end_time: endTime.toISOString(),
        event_type: "other" as const,
        status: "scheduled" as const,
      });
      if (error) throw error;
      toast.success("Added to your calendar!");
    } catch {
      toast.error("Failed to sync to calendar");
    } finally {
      setSyncing(null);
    }
  };

  // ─── Toggle active ───
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

  // ─── Stats ───
  const overdue = contacts.filter(c => c.is_active && new Date(c.next_touch_at) < new Date());
  const dueThisWeek = contacts.filter(c => {
    if (!c.is_active) return false;
    const next = new Date(c.next_touch_at);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return next >= now && next <= weekFromNow;
  });
  const activeCount = contacts.filter(c => c.is_active).length;
  const totalTouches = contacts.reduce((s, c) => s + c.touch_count, 0);

  const isOverdue = (d: string) => new Date(d) < new Date();

  const tierColor = (t: string | null) => {
    switch (t) {
      case "S": return "text-warning border-warning/30 bg-warning/10";
      case "A": return "text-success border-success/30 bg-success/10";
      case "B": return "text-primary border-primary/30 bg-primary/10";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <Bell className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Active</p>
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
        <Card className="p-4 text-center">
          <Heart className="h-5 w-5 mx-auto mb-1 text-pink-500" />
          <p className="text-2xl font-bold">{totalTouches}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Touches</p>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{overdue.length} contact{overdue.length > 1 ? "s" : ""}</span> overdue for a touch — don't let these go cold.
          </span>
        </div>
      )}

      {/* Upcoming Key Dates */}
      <UpcomingDatesPanel dates={upcomingDates} />

      {/* Add Button */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          Add to Cadence
        </Button>
        <p className="text-xs text-muted-foreground">Track key dates, gifts, and touch reminders for your top relationships</p>
      </div>

      {/* ─── Add Form ─── */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 space-y-4">
            {/* Basic Info */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <User className="h-3 w-3" /> Contact Info
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Name *</label>
                  <Input placeholder="Sarah Johnson" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</label>
                  <Input placeholder="Smith & Associates" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                  <Input placeholder="sarah@company.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tier & Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Star className="h-3 w-3" /> Relationship Tier
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIER_OPTIONS.map(t => (
                    <Button
                      key={t.value}
                      variant={tier === t.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs flex-col h-auto py-2 gap-0.5"
                      onClick={() => setTier(t.value)}
                    >
                      <span className="font-bold">{t.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Touch Frequency
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {CADENCE_OPTIONS.map(opt => (
                    <Button
                      key={opt.days}
                      variant={cadenceDays === opt.days ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setCadenceDays(opt.days)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Dates */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Cake className="h-3 w-3" /> Key Dates (for reminders)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Birthday</label>
                  <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Business Anniversary</label>
                  <Input type="date" value={anniversary} onChange={e => setAnniversary(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Custom Milestone</label>
                  <Input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)} />
                </div>
              </div>
              {milestoneDate && (
                <div className="mt-2 space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Milestone Label</label>
                  <Input placeholder="e.g. 5-Year Partnership, Grand Opening, Award" value={milestoneLabel} onChange={e => setMilestoneLabel(e.target.value)} />
                </div>
              )}
            </div>

            <Separator />

            {/* Gift & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" /> Gift Preferences
                </label>
                <Input placeholder="Wine lover, has 2 kids, Jets fan, allergic to nuts..." value={giftPrefs} onChange={e => setGiftPrefs(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes / Context</label>
                <Input placeholder="Last spoke about their expansion to Stamford..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handleAdd} disabled={posting || !name.trim()}>
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Contact List ─── */}
      {loading ? (
        <div className="space-y-3 animate-page-fade">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <RotateCcw className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No cadence contacts yet. Add your top 10-20 relationships to never lose touch.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map(contact => {
            const contactOverdue = contact.is_active && isOverdue(contact.next_touch_at);
            const isExpanded = expandedId === contact.id;

            return (
              <Card
                key={contact.id}
                className={`overflow-hidden transition-colors ${
                  !contact.is_active ? "opacity-50" : contactOverdue ? "border-destructive/30" : ""
                }`}
              >
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div
                    className={`flex items-center gap-3 p-3 cursor-pointer ${contactOverdue ? "bg-destructive/5" : "hover:bg-muted/30"}`}
                    onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                  >
                    <div className={`rounded-lg p-2 shrink-0 ${contactOverdue ? "bg-destructive/10" : "bg-primary/10"}`}>
                      {contactOverdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{contact.contact_name}</p>
                        {contact.contact_company && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">{contact.contact_company}</span>
                        )}
                        <Badge variant="outline" className={`text-[9px] ${tierColor(contact.relationship_tier)}`}>
                          {contact.relationship_tier || "B"}-Tier
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">Every {contact.cadence_days}d</span>
                        <span className="text-[10px] text-muted-foreground">{contact.touch_count} touches</span>
                        {contact.birthday && <Cake className="h-3 w-3 text-pink-400" />}
                        {contact.gift_preferences && <Gift className="h-3 w-3 text-warning" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${contactOverdue ? "text-destructive border-destructive/30" : "text-muted-foreground"}`}
                      >
                        {contact.is_active ? formatDaysAway(daysFromNow(new Date(contact.next_touch_at))) : "Paused"}
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[10px]"
                          onClick={() => handleToggleActive(contact)}
                        >
                          {contact.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {contact.is_active ? "Pause" : "Resume"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[10px]"
                          onClick={() => handleSyncToCalendar(contact)}
                          disabled={syncing === contact.id}
                        >
                          {syncing === contact.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                          Add to Calendar
                        </Button>
                        <AIReengagementPrompt contact={contact} />
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {contact.birthday && (
                          <div className="flex items-center gap-1.5">
                            <Cake className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Birthday</p>
                              <p className="font-medium">{new Date(contact.birthday + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                            </div>
                          </div>
                        )}
                        {contact.anniversary && (
                          <div className="flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-warning shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Anniversary</p>
                              <p className="font-medium">{new Date(contact.anniversary + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                            </div>
                          </div>
                        )}
                        {contact.gift_preferences && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Gift className="h-3.5 w-3.5 text-warning shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Gift Prefs</p>
                              <p className="font-medium truncate">{contact.gift_preferences}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="text-xs text-muted-foreground italic bg-background/50 rounded p-2">{contact.notes}</p>
                      )}

                      {/* Touch Log */}
                      {user && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recent Touches</p>
                          <TouchLogPanel contactId={contact.id} userId={user.id} />
                        </div>
                      )}

                      <Separator />

                      {/* Log a Touch */}
                      {contact.is_active && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Log a Touch</p>
                          <div className="flex flex-wrap gap-1.5">
                            {TOUCH_TYPES.map(tt => (
                              <Button
                                key={tt.value}
                                variant={touchType === tt.value ? "default" : "outline"}
                                size="sm"
                                className="h-7 gap-1 text-[10px]"
                                onClick={() => setTouchType(tt.value)}
                              >
                                <tt.icon className="h-3 w-3" />
                                {tt.label}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              className="text-xs h-8"
                              placeholder="Quick note (optional)..."
                              value={touchNote}
                              onChange={e => setTouchNote(e.target.value)}
                            />
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs shrink-0"
                              onClick={() => handleMarkTouched(contact)}
                            >
                              <Check className="h-3 w-3" /> Log Touch
                            </Button>
                          </div>
                        </div>
                      )}
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
