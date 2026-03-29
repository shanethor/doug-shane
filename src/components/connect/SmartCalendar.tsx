import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, Plus, Clock, MapPin, Users, ChevronLeft, ChevronRight,
  Link2, Copy, Search, X, Trash2, Pencil, Loader2, Bot, Sparkles,
  FileText, GitBranch, Send, MessageSquare, ChevronDown, ChevronUp,
  ExternalLink, RefreshCw, Filter, Zap, Bell,
} from "lucide-react";
import {
  format, addDays, startOfWeek, addWeeks, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, subWeeks, subMonths,
  addMonths, isToday as isDateToday, parseISO, isAfter, isBefore,
  addMinutes, startOfDay,
} from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConnectEmptyState } from "@/components/connect-demo/ConnectEmptyState";
import BookingLinksManager from "@/components/BookingLinksManager";
import CalendarAssistant from "./CalendarAssistant";
import CalendarContextPanel from "./CalendarContextPanel";

/* ─── Types ─── */
export interface CalEvent {
  id: string;
  title: string;
  date: Date;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  location: string;
  description: string;
  attendees: string[];
  allDay: boolean;
  color: string;
  external?: boolean;
  event_type?: string;
  lead_id?: string | null;
  provider?: string | null;
  status?: string;
  start_time?: string;
  end_time?: string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
type ViewMode = "day" | "week" | "month";

const fmtTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
};

const EVENT_COLORS: Record<string, string> = {
  presentation: "hsl(262 83% 58%)",
  coverage_review: "hsl(200 80% 50%)",
  renewal_review: "hsl(38 92% 50%)",
  claim_review: "hsl(0 72% 51%)",
  follow_up: "hsl(140 12% 50%)",
  other: "hsl(140 12% 42%)",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "client", label: "Client Meetings" },
  { value: "internal", label: "Internal" },
  { value: "my", label: "My Meetings" },
];

function mapRealEvents(rawEvents: any[]): CalEvent[] {
  return rawEvents.map(ev => {
    const start = new Date(ev.start_time);
    const end = new Date(ev.end_time);
    const evType = ev.event_type || "other";
    return {
      id: ev.id,
      title: ev.title,
      date: start,
      startHour: start.getHours(),
      startMin: start.getMinutes(),
      endHour: end.getHours(),
      endMin: end.getMinutes(),
      location: ev.location || "",
      description: ev.description || "",
      attendees: ev.attendees || [],
      allDay: false,
      color: EVENT_COLORS[evType] || EVENT_COLORS.other,
      external: !!ev.provider && ev.provider !== "aura",
      event_type: evType,
      lead_id: ev.lead_id,
      provider: ev.provider,
      status: ev.status,
      start_time: ev.start_time,
      end_time: ev.end_time,
    };
  });
}

export default function SmartCalendar() {
  const { user } = useAuth();
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editEvent, setEditEvent] = useState<Partial<CalEvent> | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [evRes, ldRes] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("user_id", user.id)
        .gte("start_time", subMonths(new Date(), 1).toISOString())
        .lte("start_time", addMonths(new Date(), 6).toISOString())
        .order("start_time", { ascending: true }),
      supabase.from("leads").select("id, account_name, stage, contact_name, contact_email, estimated_premium")
        .eq("owner_user_id", user.id).order("account_name"),
    ]);
    const raw = (evRes.data as any[]) || [];
    setRawEvents(raw);
    setEvents(mapRealEvents(raw));
    setLeads((ldRes.data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleRefresh = () => { void loadData(); };
    window.addEventListener("aura-calendar-refresh", handleRefresh);
    return () => window.removeEventListener("aura-calendar-refresh", handleRefresh);
  }, [loadData]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let evts = events;
    if (filterType === "client") evts = evts.filter(e => e.lead_id);
    else if (filterType === "internal") evts = evts.filter(e => !e.lead_id && !e.external);
    else if (filterType === "my") evts = evts.filter(e => !e.external);
    if (search.trim()) {
      const q = search.toLowerCase();
      evts = evts.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return evts;
  }, [events, filterType, search]);

  // Next up events
  const nextUpEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => isAfter(e.date, now) || (isSameDay(e.date, now) && (e.startHour > now.getHours() || (e.startHour === now.getHours() && e.startMin > now.getMinutes()))))
      .slice(0, 5);
  }, [events]);

  const todayCount = events.filter(e => isSameDay(e.date, new Date())).length;

  // Sync external calendars
  const syncCalendars = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "sync" }),
      });
      if (!resp.ok) throw new Error("Sync failed");
      const data = await resp.json();
      toast.success(`Synced ${data.synced || 0} events`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Calendar sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (view === "day") setCurrentDate(d => addDays(d, -1));
    else if (view === "week") setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };
  const goNext = () => {
    if (view === "day") setCurrentDate(d => addDays(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart2 = startOfMonth(currentDate);
  const monthWeekStart = startOfWeek(monthStart2, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: monthWeekStart, end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()) });

  const eventsFor = (date: Date) => filteredEvents.filter(e => isSameDay(e.date, date));

  const openQuickAdd = (date: Date, hour?: number) => {
    setEditEvent({
      id: "", title: "", date, startHour: hour ?? 9, startMin: 0, endHour: (hour ?? 9) + 1, endMin: 0,
      location: "", description: "", attendees: [], allDay: false, color: EVENT_COLORS.other, external: false, event_type: "other",
    });
    setShowEditor(true);
  };

  const saveEvent = async () => {
    if (!editEvent?.title?.trim()) { toast.error("Title is required"); return; }
    if (!user) return;
    
    const startTime = new Date(editEvent.date!);
    startTime.setHours(editEvent.startHour!, editEvent.startMin!, 0);
    const endTime = new Date(editEvent.date!);
    endTime.setHours(editEvent.endHour!, editEvent.endMin!, 0);

    if (editEvent.id) {
      // Update existing
      const { error } = await supabase.from("calendar_events").update({
        title: editEvent.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: editEvent.location || null,
        description: editEvent.description || null,
        attendees: editEvent.attendees || [],
        event_type: editEvent.event_type || "other",
        lead_id: editEvent.lead_id || null,
      } as any).eq("id", editEvent.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Event updated");
    } else {
      // Create new in local DB
      const { error, data: inserted } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: editEvent.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: editEvent.location || null,
        description: editEvent.description || null,
        attendees: editEvent.attendees || [],
        event_type: editEvent.event_type || "other",
        lead_id: editEvent.lead_id || null,
        provider: "aura",
        status: "scheduled",
      } as any).select().single();
      if (error) { toast.error("Failed to create"); return; }

      // Push to connected external calendars (Google/Outlook)
      try {
        const { data: calendars } = await supabase
          .from("external_calendars")
          .select("provider, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (calendars?.length) {
          const { data: { session } } = await supabase.auth.getSession();
          for (const cal of calendars) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                action: "create_event",
                provider: cal.provider,
                title: editEvent.title,
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                description: editEvent.description || "",
                location: editEvent.location || "",
                attendees: editEvent.attendees || [],
              }),
            });
          }
          toast.success("Event created & synced to calendar");
        } else {
          toast.success("Event created");
        }
      } catch {
        toast.success("Event created (external sync skipped)");
      }
    }
    setShowEditor(false);
    setEditEvent(null);
    loadData();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setSelectedEvent(null);
    toast.success("Event deleted");
    loadData();
  };

  const updateEventStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("calendar_events").update({ status } as any).eq("id", id);
    if (error) toast.error("Failed to update");
    else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      toast.success(`Marked as ${status}`);
    }
  };

  const headingText = view === "day" ? format(currentDate, "EEEE, MMMM d")
    : view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  /* ─── Day View ─── */
  const dayView = (
    <div className="relative" style={{ minHeight: `${HOURS.length * 60}px` }}>
      {HOURS.map(hour => (
        <div key={hour} className="flex h-[60px] border-b border-border">
          <div className="w-14 shrink-0 text-[10px] text-right pr-2 pt-1 text-muted-foreground">{fmtTime(hour, 0)}</div>
          <div className="flex-1 relative cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openQuickAdd(currentDate, hour)} />
        </div>
      ))}
      {eventsFor(currentDate).map(ev => {
        const top = (ev.startHour - 7) * 60 + ev.startMin;
        const height = Math.max((ev.endHour - ev.startHour) * 60 + (ev.endMin - ev.startMin), 20);
        return (
          <div key={ev.id} className="absolute left-14 right-2 rounded-md px-2 py-1 cursor-pointer hover:brightness-110 transition-all overflow-hidden"
            style={{ top: `${top}px`, height: `${height}px`, background: ev.color + "33", borderLeft: `3px solid ${ev.color}` }}
            onClick={() => setSelectedEvent(ev)}>
            <p className="text-[11px] font-medium text-foreground truncate">{ev.title}</p>
            <p className="text-[9px] text-muted-foreground">{fmtTime(ev.startHour, ev.startMin)} – {fmtTime(ev.endHour, ev.endMin)}</p>
          </div>
        );
      })}
    </div>
  );

  /* ─── Week View ─── */
  const weekView = (
    <div>
      <div className="grid grid-cols-[56px_repeat(7,1fr)] mb-1">
        <div />
        {weekDays.map(day => (
          <div key={day.toISOString()} className="text-center">
            <p className="text-[10px] text-muted-foreground">{format(day, "EEE")}</p>
            <p className={`text-sm font-semibold ${isDateToday(day) ? "text-foreground" : "text-muted-foreground"}`}>
              {isDateToday(day) ? (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">{format(day, "d")}</span>
              ) : format(day, "d")}
            </p>
          </div>
        ))}
      </div>
      <div className="relative">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: "52px" }}>
            <div className="text-[10px] text-right pr-2 pt-0.5 text-muted-foreground">{fmtTime(hour, 0)}</div>
            {weekDays.map(day => {
              const dayEvts = eventsFor(day).filter(e => e.startHour === hour);
              return (
                <div key={day.toISOString()} className="relative cursor-pointer hover:bg-muted/30 transition-colors border-b border-r border-border" onClick={() => openQuickAdd(day, hour)}>
                  {dayEvts.map(ev => (
                    <div key={ev.id} className="absolute inset-x-0.5 rounded px-1 py-0.5 cursor-pointer hover:brightness-110 z-10 overflow-hidden" style={{ background: ev.color + "33", borderLeft: `2px solid ${ev.color}`, top: `${ev.startMin * (52 / 60)}px`, minHeight: "18px" }} onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}>
                      <p className="text-[9px] font-medium text-foreground truncate">{ev.title}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Month View ─── */
  const monthView = (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <p key={d} className="text-center text-[10px] py-1 text-muted-foreground">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-border">
        {monthDays.map(day => {
          const inMonth = isSameMonth(day, currentDate);
          const dayEvts = eventsFor(day);
          return (
            <div key={day.toISOString()} className={`min-h-[80px] p-1 cursor-pointer hover:bg-muted/40 transition-colors ${isDateToday(day) ? "bg-primary/5" : "bg-card"}`}
              onClick={() => { setCurrentDate(day); setView("day"); }}>
              <p className={`text-[10px] font-medium mb-0.5 ${isDateToday(day) ? "text-foreground" : inMonth ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                {format(day, "d")}
              </p>
              {dayEvts.slice(0, 3).map(ev => (
                <div key={ev.id} className="text-[8px] rounded px-1 py-0.5 mb-0.5 truncate text-foreground" style={{ background: ev.color + "33" }}>
                  {ev.title.length > 16 ? ev.title.slice(0, 16) + "…" : ev.title}
                </div>
              ))}
              {dayEvts.length > 3 && <p className="text-[8px] text-muted-foreground">+{dayEvts.length - 3} more</p>}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ─── Editor Dialog ─── */
  const renderEditorDialog = () => (
    <Dialog open={showEditor} onOpenChange={setShowEditor}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editEvent?.id ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
        {editEvent && (
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={editEvent.title || ""} onChange={e => setEditEvent(p => ({ ...p!, title: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={editEvent.event_type || "other"} onValueChange={v => setEditEvent(p => ({ ...p!, event_type: v, color: EVENT_COLORS[v] || EVENT_COLORS.other }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="coverage_review">Coverage Review</SelectItem>
                    <SelectItem value="renewal_review">Renewal Review</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Link to Client</Label>
                <Select value={editEvent.lead_id || "none"} onValueChange={v => setEditEvent(p => ({ ...p!, lead_id: v === "none" ? null : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.account_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start</Label><Input type="time" value={`${String(editEvent.startHour || 0).padStart(2, "0")}:${String(editEvent.startMin || 0).padStart(2, "0")}`} onChange={e => { const [h, m] = e.target.value.split(":").map(Number); setEditEvent(p => ({ ...p!, startHour: h, startMin: m })); }} className="mt-1" /></div>
              <div><Label className="text-xs">End</Label><Input type="time" value={`${String(editEvent.endHour || 0).padStart(2, "0")}:${String(editEvent.endMin || 0).padStart(2, "0")}`} onChange={e => { const [h, m] = e.target.value.split(":").map(Number); setEditEvent(p => ({ ...p!, endHour: h, endMin: m })); }} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Location</Label><Input value={editEvent.location || ""} onChange={e => setEditEvent(p => ({ ...p!, location: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs">Attendees (comma-separated)</Label><Input value={(editEvent.attendees || []).join(", ")} onChange={e => setEditEvent(p => ({ ...p!, attendees: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} className="mt-1" /></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={editEvent.description || ""} onChange={e => setEditEvent(p => ({ ...p!, description: e.target.value }))} className="mt-1 min-h-[60px]" /></div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveEvent}>Save</Button>
              <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex gap-4">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
            <h2 className="text-lg font-semibold text-white">Calendar</h2>
            {todayCount > 0 && (
              <Badge style={{ background: "hsl(140 12% 42%)", color: "white" }} className="text-[10px]">{todayCount} today</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={syncCalendars} disabled={syncing}>
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync"}</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => window.location.href = "/app/settings?section=calendar"}>
              <Link2 className="h-3 w-3" />
              <span className="hidden sm:inline">Reconnect</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowSearch(s => !s)}>
              <Search className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowBooking(s => !s)}>
              <Link2 className="h-3 w-3" /> <span className="hidden sm:inline">Booking</span>
            </Button>
            <Button variant={showAssistant ? "default" : "outline"} size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowAssistant(s => !s)}
              style={showAssistant ? { background: "hsl(140 12% 42%)" } : {}}>
              <Bot className="h-3 w-3" /> <span className="hidden sm:inline">AURA Assistant</span>
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8 text-white" style={{ background: "hsl(140 12% 42%)" }} onClick={() => openQuickAdd(currentDate)}>
              <Plus className="h-3.5 w-3.5" /> New Event
            </Button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
            <Input placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} autoFocus />
            {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} /></button>}
          </div>
        )}

        {/* Booking Links Panel */}
        {showBooking && (
          <div className="rounded-xl p-4 animate-fade-in" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
            <BookingLinksManager />
          </div>
        )}

        {/* Next Up */}
        {nextUpEvents.length > 0 && !showBooking && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider shrink-0 self-center">Next up</span>
            {nextUpEvents.map(ev => (
              <button key={ev.id} className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
                style={{ background: "hsl(240 8% 8%)", border: "1px solid hsl(240 6% 14%)" }}
                onClick={() => setSelectedEvent(ev)}>
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: ev.color }} />
                <div>
                  <p className="text-[11px] font-medium text-white truncate max-w-[140px]">{ev.title}</p>
                  <p className="text-[9px]" style={{ color: "hsl(240 5% 46%)" }}>
                    {isSameDay(ev.date, new Date()) ? "Today" : format(ev.date, "EEE")} · {fmtTime(ev.startHour, ev.startMin)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Nav + View toggles + Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={goToday}>Today</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-white ml-1">{headingText}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 w-[120px] text-[10px]" style={{ background: "transparent", borderColor: "hsl(240 6% 16%)", color: "hsl(240 5% 60%)" }}>
                <Filter className="h-3 w-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "hsl(240 6% 14%)" }}>
              {(["day", "week", "month"] as ViewMode[]).map(v => (
                <button key={v} className={`px-3 py-1 text-xs capitalize transition-colors ${view === v ? "text-white" : ""}`}
                  style={{ background: view === v ? "hsl(140 12% 42%)" : "transparent", color: view !== v ? "hsl(240 5% 50%)" : undefined }}
                  onClick={() => setView(v)}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(240 6% 12%)", background: "hsl(240 8% 6%)" }}>
          {view === "day" && dayView}
          {view === "week" && weekView}
          {view === "month" && monthView}
        </div>
      </div>

      {/* Right panel: Assistant OR Context */}
      {showAssistant && (
        <div className="w-[340px] shrink-0 hidden lg:block">
          <CalendarAssistant
            events={events}
            leads={leads}
            onClose={() => setShowAssistant(false)}
            onRefresh={loadData}
          />
        </div>
      )}

      {/* Event Detail / Context Panel */}
      {selectedEvent && !showAssistant && (
        <div className="w-[340px] shrink-0 hidden lg:block">
          <CalendarContextPanel
            event={selectedEvent}
            leads={leads}
            onClose={() => setSelectedEvent(null)}
            onEdit={() => { setEditEvent({ ...selectedEvent }); setSelectedEvent(null); setShowEditor(true); }}
            onDelete={() => deleteEvent(selectedEvent.id)}
            onRefresh={loadData}
          />
        </div>
      )}

      {/* Mobile event detail dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-sm lg:hidden" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 16%)" }}>
            <DialogHeader><DialogTitle className="text-white">{selectedEvent.title}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-white/60"><Clock className="h-3.5 w-3.5" />{format(selectedEvent.date, "EEE, MMM d")} · {fmtTime(selectedEvent.startHour, selectedEvent.startMin)} – {fmtTime(selectedEvent.endHour, selectedEvent.endMin)}</p>
              {selectedEvent.location && <p className="flex items-center gap-2 text-white/60"><MapPin className="h-3.5 w-3.5" />{selectedEvent.location}</p>}
              {selectedEvent.description && <p className="text-white/50 text-xs mt-2">{selectedEvent.description}</p>}
              {selectedEvent.attendees.length > 0 && <div className="flex items-center gap-2 text-white/60"><Users className="h-3.5 w-3.5" /><span>{selectedEvent.attendees.join(", ")}</span></div>}
              <div className="flex gap-2 pt-3 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs gap-1" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={() => { setEditEvent({ ...selectedEvent }); setSelectedEvent(null); setShowEditor(true); }}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive border-destructive/30" onClick={() => deleteEvent(selectedEvent.id)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {renderEditorDialog()}
    </div>
  );
}
