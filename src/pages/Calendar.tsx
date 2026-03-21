import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import BookingLinksManager from "@/components/BookingLinksManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/auth-fetch";
import {
  CalendarDays, Plus, Clock, MapPin, Users, ChevronLeft, ChevronRight,
  Video, RefreshCw, ExternalLink, Trash2, Check, X, GitBranch, Loader2, Link2
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isToday, parseISO, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";

type CalendarEvent = {
  id: string;
  user_id: string;
  lead_id: string | null;
  external_event_id: string | null;
  provider: string | null;
  event_type: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  attendees: string[] | null;
  status: string;
  metadata: any;
  created_at: string;
};

type Lead = {
  id: string;
  account_name: string;
  stage: string;
};

type ExternalCalendar = {
  id: string;
  provider: string;
  email_address: string | null;
  is_active: boolean;
};

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  presentation: { label: "Presentation", color: "bg-accent/20 text-accent-foreground" },
  coverage_review: { label: "Coverage Review", color: "bg-primary/15 text-primary" },
  renewal_review: { label: "Renewal Review", color: "bg-warning/20 text-warning-foreground" },
  claim_review: { label: "Claim Review", color: "bg-destructive/15 text-destructive" },
  follow_up: { label: "Follow Up", color: "bg-muted text-muted-foreground" },
  other: { label: "Other", color: "bg-muted text-muted-foreground" },
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "border-l-accent",
  completed: "border-l-success opacity-70",
  cancelled: "border-l-destructive opacity-50 line-through",
  no_show: "border-l-warning opacity-60",
};

export default function Calendar({ embedded }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<"agenda" | "week" | "month">("agenda");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSection, setActiveSection] = useState<"calendar" | "booking">("calendar");
  const [filterType, setFilterType] = useState<string>("all");
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_type: "other" as string,
    start_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_time: "10:00",
    description: "",
    location: "",
    attendees: "",
    lead_id: "" as string,
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const rangeStart = subMonths(now, 1).toISOString();
    const rangeEnd = addMonths(now, 6).toISOString();

    const [eventsRes, leadsRes, calRes] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", rangeStart)
        .lte("start_time", rangeEnd)
        .order("start_time", { ascending: true }),
      supabase
        .from("leads")
        .select("id, account_name, stage")
        .eq("owner_user_id", user.id)
        .order("account_name"),
      supabase
        .from("external_calendars")
        .select("id, provider, email_address, is_active")
        .eq("user_id", user.id),
    ]);

    setEvents((eventsRes.data as CalendarEvent[]) || []);
    setLeads((leadsRes.data as Lead[]) || []);
    setCalendars((calRes.data as ExternalCalendar[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const syncCalendars = async () => {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "sync" }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Sync failed");
      }
      const data = await resp.json();
      toast.success(`Synced ${data.synced || 0} calendar events`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Calendar sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const createEvent = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
    if (!newEvent.title.trim() || !newEvent.start_date) {
      toast.error("Title and date are required");
      return;
    }

    const startTime = new Date(`${newEvent.start_date}T${newEvent.start_time}:00`);
    const endTime = new Date(`${newEvent.start_date}T${newEvent.end_time}:00`);

    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }

    const attendees = newEvent.attendees
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const leadId = newEvent.lead_id && newEvent.lead_id !== "none" ? newEvent.lead_id : null;
    const lead = leadId ? leads.find((l) => l.id === leadId) : null;

    // Build description with coverage snapshot if lead linked
    let description = newEvent.description;
    if (lead) {
      description = `${description}\n\n📋 Client: ${lead.account_name}\n🔗 View in AURA: /pipeline/${lead.id}`;
    }

    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: newEvent.title,
      event_type: newEvent.event_type as any,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      description,
      location: newEvent.location || null,
      attendees: attendees.length > 0 ? attendees : null,
      lead_id: leadId,
      provider: "aura",
      status: "scheduled" as any,
    } as any);

    if (error) {
      toast.error("Failed to create event");
      console.error(error);
      setIsCreating(false);
      return;
    }

    // Push to connected calendars (best-effort)
    for (const cal of calendars.filter((c) => c.is_active)) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "create_event",
            provider: cal.provider,
            title: newEvent.title,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            description,
            location: newEvent.location,
            attendees,
          }),
        });
      } catch {
        // Silent — external push is best-effort
      }
    }

    toast.success("Event created");
    setCreateOpen(false);
    setNewEvent({
      title: "", event_type: "other", start_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00", end_time: "10:00", description: "", location: "", attendees: "", lead_id: "",
    });
    loadData();
    } finally {
      setIsCreating(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    const { error } = await supabase
      .from("calendar_events")
      .update({ status: status as any })
      .eq("id", eventId);
    if (error) {
      toast.error("Failed to update");
    } else {
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status } : e));
    }
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success("Event deleted");
    }
  };

  // Filtered events
  const filteredEvents = filterType === "all"
    ? events
    : events.filter((e) => e.event_type === filterType);

  // Group events by day for agenda view
  const groupByDay = (evts: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {};
    for (const e of evts) {
      const day = format(parseISO(e.start_time), "yyyy-MM-dd");
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  // Upcoming events (today onwards)
  const upcomingEvents = filteredEvents.filter(
    (e) => isAfter(parseISO(e.start_time), startOfDay(new Date())) || isSameDay(parseISO(e.start_time), new Date())
  );

  const pastEvents = filteredEvents.filter(
    (e) => isBefore(parseISO(e.start_time), startOfDay(new Date()))
  );

  // Week view days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month view days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthDays: Date[] = [];
  let d = monthWeekStart;
  while (d <= monthEnd || monthDays.length % 7 !== 0) {
    monthDays.push(d);
    d = addDays(d, 1);
    if (monthDays.length > 42) break;
  }

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter((e) => isSameDay(parseISO(e.start_time), day));

  const todayEvents = events.filter((e) => isSameDay(parseISO(e.start_time), new Date()) && e.status === "scheduled");

  if (loading) {
    const loadingContent = (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
    return embedded ? loadingContent : <AppLayout>{loadingContent}</AppLayout>;
  }

  const mainContent = (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Calendar</h1>
          {todayEvents.length > 0 && (
            <Badge variant="default" className="text-xs">
              {todayEvents.length} today
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {calendars.some((c) => c.is_active) && (
            <Button variant="outline" size="sm" onClick={syncCalendars} disabled={syncing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync Calendar"}</span>
            </Button>
          )}
          {!calendars.some((c) => c.is_active) && (
            <Button variant="outline" size="sm" onClick={() => navigate("/settings?section=calendar")} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect Calendar</span>
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Event</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 mt-2">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g. New Business Presentation – ABC Corp"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Event Type</Label>
                    <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presentation">Presentation</SelectItem>
                        <SelectItem value="coverage_review">Coverage Review</SelectItem>
                        <SelectItem value="renewal_review">Renewal Review</SelectItem>
                        <SelectItem value="claim_review">Claim Review</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Link to Client</Label>
                    <Select value={newEvent.lead_id} onValueChange={(v) => setNewEvent({ ...newEvent, lead_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {leads.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.account_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={newEvent.start_date}
                      onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Zoom / Office / Client site"
                  />
                </div>
                <div>
                  <Label>Attendees (comma-separated emails)</Label>
                  <Input
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                    placeholder="client@example.com, john@agency.com"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Agenda items, coverage details..."
                    rows={3}
                  />
                </div>
                <Button onClick={createEvent} disabled={isCreating} className="w-full">
                  {isCreating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View switcher + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="week" className="hidden sm:inline-flex">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] sm:w-[150px] h-8 text-xs">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="presentation">Presentations</SelectItem>
              <SelectItem value="coverage_review">Coverage Reviews</SelectItem>
              <SelectItem value="renewal_review">Renewal Reviews</SelectItem>
              <SelectItem value="claim_review">Claim Reviews</SelectItem>
              <SelectItem value="follow_up">Follow Ups</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {view !== "agenda" && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentDate(view === "week" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentDate(view === "week" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium ml-2">
                {view === "week"
                  ? `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
                  : format(currentDate, "MMMM yyyy")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Agenda View */}
      {view === "agenda" && (
        <div className="space-y-6">
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No events yet</p>
              <Button variant="link" size="sm" onClick={() => setCreateOpen(true)} className="mt-2">
                Create your first event
              </Button>
            </div>
          ) : (
            <>
              {groupByDay(upcomingEvents).map(([day, dayEvents]) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold">
                      {isToday(parseISO(day)) ? "Today" : format(parseISO(day), "EEEE, MMM d")}
                    </h3>
                    {isToday(parseISO(day)) && (
                      <Badge variant="default" className="text-[10px]">Today</Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {dayEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        leads={leads}
                        onStatusChange={updateEventStatus}
                        onDelete={deleteEvent}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {pastEvents.length > 0 && (
                <details className="mt-6">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground mb-2">
                    Past events ({pastEvents.length})
                  </summary>
                  <div className="space-y-1.5 opacity-60">
                    {groupByDay(pastEvents).map(([day, dayEvents]) => (
                      <div key={day}>
                        <h3 className="text-xs font-medium text-muted-foreground mb-1">
                          {format(parseISO(day), "MMM d, yyyy")}
                        </h3>
                        {dayEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            leads={leads}
                            onStatusChange={updateEventStatus}
                            onDelete={deleteEvent}
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {weekDays.map((day) => {
            const dayEvts = getEventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[200px] p-2 bg-card ${isToday(day) ? "bg-accent/5" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-accent" : "text-muted-foreground"}`}>
                  {format(day, "EEE d")}
                </div>
                <div className="space-y-1">
                  {dayEvts.map((event) => {
                    const cfg = EVENT_TYPE_LABELS[event.event_type] || EVENT_TYPE_LABELS.other;
                    return (
                      <div
                        key={event.id}
                        className={`text-[10px] p-1 rounded ${cfg.color} cursor-pointer hover:opacity-80`}
                        title={event.title}
                      >
                        <span className="font-medium">{format(parseISO(event.start_time), "HH:mm")}</span>
                        {" "}{event.title.length > 20 ? event.title.slice(0, 20) + "…" : event.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium text-muted-foreground mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {monthDays.map((day) => {
              const dayEvts = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1.5 bg-card ${!isCurrentMonth ? "opacity-40" : ""} ${isToday(day) ? "bg-accent/5" : ""}`}
                >
                  <div className={`text-[11px] font-medium ${isToday(day) ? "text-accent" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </div>
                  {dayEvts.slice(0, 2).map((event) => {
                    const cfg = EVENT_TYPE_LABELS[event.event_type] || EVENT_TYPE_LABELS.other;
                    return (
                      <div key={event.id} className={`text-[9px] p-0.5 rounded mt-0.5 truncate ${cfg.color}`}>
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvts.length > 2 && (
                    <div className="text-[9px] text-muted-foreground mt-0.5">+{dayEvts.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
  return embedded ? mainContent : <AppLayout>{mainContent}</AppLayout>;
}

function EventCard({
  event,
  leads,
  onStatusChange,
  onDelete,
  onNavigate,
}: {
  event: CalendarEvent;
  leads: Lead[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const cfg = EVENT_TYPE_LABELS[event.event_type] || EVENT_TYPE_LABELS.other;
  const statusStyle = STATUS_STYLES[event.status] || "";
  const lead = event.lead_id ? leads.find((l) => l.id === event.lead_id) : null;

  return (
    <Card className={`border-l-2 ${statusStyle} hover-lift transition-smooth`}>
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium truncate">{event.title}</p>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${cfg.color}`}>
              {cfg.label}
            </Badge>
            {event.provider === "outlook" && (
              <Badge variant="outline" className="text-[9px] shrink-0">Outlook</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(parseISO(event.start_time), "h:mm a")} – {format(parseISO(event.end_time), "h:mm a")}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.attendees.length}
              </span>
            )}
            {lead && (
              <button
                className="flex items-center gap-1 text-accent hover:underline"
                onClick={(e) => { e.stopPropagation(); onNavigate(`/pipeline/${lead.id}`); }}
              >
                <GitBranch className="h-3 w-3" />
                {lead.account_name}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {event.status === "scheduled" && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStatusChange(event.id, "completed")} title="Mark completed">
                <Check className="h-3.5 w-3.5 text-success" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStatusChange(event.id, "no_show")} title="No show">
                <X className="h-3.5 w-3.5 text-warning" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(event.id)} title="Delete">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
