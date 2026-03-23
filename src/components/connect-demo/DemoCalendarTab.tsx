import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarDays, Plus, Clock, MapPin, Users, Video, ChevronLeft, ChevronRight,
  Link2, Copy, ExternalLink, Settings, Check, Search, X, Trash2, Pencil,
} from "lucide-react";
import {
  format, addDays, startOfWeek, addWeeks, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, getHours, getMinutes,
  setHours, setMinutes, subWeeks, subMonths, addMonths, isToday as isDateToday,
} from "date-fns";
import { toast } from "sonner";

/* ─── Types ─── */
interface CalEvent {
  id: string; title: string; date: Date; startHour: number; startMin: number;
  endHour: number; endMin: number; location: string; description: string;
  attendees: string[]; allDay: boolean; color: string; external?: boolean;
}

/* ─── Demo Events ─── */
const today = new Date();
const mkEvent = (id: string, title: string, dayOffset: number, sh: number, sm: number, eh: number, em: number, loc: string, desc: string, attendees: string[], color: string, external?: boolean): CalEvent => ({
  id, title, date: addDays(today, dayOffset), startHour: sh, startMin: sm, endHour: eh, endMin: em,
  location: loc, description: desc, attendees, allDay: false, color, external,
});

const INITIAL_EVENTS: CalEvent[] = [
  mkEvent("1", "Pipeline Review — Q3 Targets", 0, 9, 0, 10, 0, "Zoom", "Discuss Q3 pipeline numbers and set Q4 targets.", ["sarah@greenvalley.com", "marcus@techventures.io"], "hsl(140 12% 42%)", false),
  mkEvent("2", "Client Onboarding — Blue Ridge Capital", 0, 11, 0, 12, 0, "Conference Room B", "Walk through onboarding docs and set up accounts.", ["jess@blueridgecap.com"], "hsl(262 83% 58%)", false),
  mkEvent("3", "Follow-up Call — David Kowalski", 0, 14, 0, 14, 30, "Phone", "Referral follow-up and intro scheduling.", ["david.k@primeadvisors.net"], "hsl(45 93% 47%)", false),
  mkEvent("4", "Networking Lunch — Chamber of Commerce", 1, 12, 30, 13, 30, "Downtown Bistro", "Monthly Chamber networking lunch.", [], "hsl(240 5% 46%)", true),
  mkEvent("5", "Annual Review — Sunrise Properties", 1, 14, 0, 15, 0, "Zoom", "Portfolio review and renewal discussion.", ["linda@sunriseproperties.com"], "hsl(140 12% 42%)", false),
  mkEvent("6", "Strategy Session — West Coast", 2, 10, 0, 11, 30, "Board Room", "Expansion strategy deep dive.", ["marcus@techventures.io", "amanda@brightfuture.org"], "hsl(140 12% 42%)", false),
  mkEvent("7", "Prospect Meeting — Nova Health", 3, 15, 0, 16, 0, "Zoom", "Initial discovery call.", ["priya@novahealth.com"], "hsl(262 83% 58%)", false),
  mkEvent("8", "Team Standup", 4, 9, 0, 9, 30, "Google Meet", "Daily team sync.", [], "hsl(140 12% 42%)", true),
  mkEvent("9", "Dentist Appointment", -1, 8, 0, 9, 0, "123 Main St", "Regular checkup (external).", [], "hsl(200 60% 50%)", true),
];

const BOOKING_LINKS = [
  { id: "1", title: "30-Min Discovery Call", slug: "discovery-30", duration: 30, active: true, bookings: 12 },
  { id: "2", title: "60-Min Strategy Session", slug: "strategy-60", duration: 60, active: true, bookings: 7 },
  { id: "3", title: "15-Min Quick Check-In", slug: "checkin-15", duration: 15, active: true, bookings: 23 },
  { id: "4", title: "Coverage Review", slug: "coverage-review", duration: 45, active: false, bookings: 4 },
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

type ViewMode = "day" | "week" | "month";

/* ─── Helpers ─── */
const fmtTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
};

/* ─── Component ─── */
export default function DemoCalendarTab() {
  const [events, setEvents] = useState<CalEvent[]>(INITIAL_EVENTS);
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(today);
  const [showBookingLinks, setShowBookingLinks] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Event popover
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  // Create / edit dialog
  const [showEditor, setShowEditor] = useState(false);
  const [editEvent, setEditEvent] = useState<Partial<CalEvent> | null>(null);

  /* ── Navigation ── */
  const goToday = () => setCurrentDate(today);
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

  /* ── Week days ── */
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* ── Month days ── */
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: monthWeekStart, end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()) });

  /* ── Events for date ── */
  const eventsFor = useCallback((date: Date) => events.filter(e => isSameDay(e.date, date)), [events]);

  /* ── Search ── */
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return events.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.attendees.some(a => a.toLowerCase().includes(q)));
  }, [search, events]);

  /* ── Quick-add ── */
  const openQuickAdd = (date: Date, hour?: number) => {
    setEditEvent({
      id: "", title: "", date, startHour: hour ?? 9, startMin: 0, endHour: (hour ?? 9) + 1, endMin: 0,
      location: "", description: "", attendees: [], allDay: false, color: "hsl(140 12% 42%)", external: false,
    });
    setShowEditor(true);
  };

  const openEditEvent = (ev: CalEvent) => {
    setEditEvent({ ...ev });
    setSelectedEvent(null);
    setShowEditor(true);
  };

  const saveEvent = () => {
    if (!editEvent?.title?.trim()) { toast.error("Title is required"); return; }
    if (editEvent.id) {
      setEvents(prev => prev.map(e => e.id === editEvent.id ? { ...e, ...editEvent } as CalEvent : e));
      toast.success("Event updated");
    } else {
      const newEv: CalEvent = {
        ...editEvent as CalEvent,
        id: `new-${Date.now()}`,
      };
      setEvents(prev => [...prev, newEv]);
      toast.success("Event created");
    }
    setShowEditor(false);
    setEditEvent(null);
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
    toast.success("Event deleted");
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
    setCopiedSlug(slug);
    toast.success("Booking link copied!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  /* ─── Day View ─── */
  const dayView = (
    <div className="relative" style={{ minHeight: `${HOURS.length * 60}px` }}>
      {HOURS.map(hour => (
        <div key={hour} className="flex h-[60px]" style={{ borderBottom: "1px solid hsl(240 6% 12%)" }}>
          <div className="w-14 shrink-0 text-[10px] text-right pr-2 pt-1" style={{ color: "hsl(240 5% 40%)" }}>
            {fmtTime(hour, 0)}
          </div>
          <div className="flex-1 relative cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => openQuickAdd(currentDate, hour)} />
        </div>
      ))}
      {/* Events overlaid */}
      {eventsFor(currentDate).map(ev => {
        if (ev.allDay) return null;
        const top = (ev.startHour - 7) * 60 + ev.startMin;
        const height = Math.max((ev.endHour - ev.startHour) * 60 + (ev.endMin - ev.startMin), 20);
        return (
          <div
            key={ev.id}
            className="absolute left-14 right-2 rounded-md px-2 py-1 cursor-pointer hover:brightness-110 transition-all overflow-hidden"
            style={{ top: `${top}px`, height: `${height}px`, background: ev.color + "33", borderLeft: `3px solid ${ev.color}` }}
            onClick={() => setSelectedEvent(ev)}
          >
            <p className="text-[11px] font-medium text-white truncate">{ev.title}</p>
            <p className="text-[9px]" style={{ color: "hsl(240 5% 60%)" }}>{fmtTime(ev.startHour, ev.startMin)} – {fmtTime(ev.endHour, ev.endMin)}</p>
            {ev.external && <span className="text-[8px] px-1 rounded" style={{ background: "hsl(200 60% 50% / 0.2)", color: "hsl(200 60% 65%)" }}>External</span>}
          </div>
        );
      })}
    </div>
  );

  /* ─── Week View ─── */
  const weekView = (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] mb-1">
        <div />
        {weekDays.map(day => (
          <div key={day.toISOString()} className="text-center">
            <p className="text-[10px]" style={{ color: "hsl(240 5% 46%)" }}>{format(day, "EEE")}</p>
            <p className={`text-sm font-semibold ${isDateToday(day) ? "text-white" : ""}`} style={!isDateToday(day) ? { color: "hsl(240 5% 60%)" } : {}}>
              {isDateToday(day) ? (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "hsl(140 12% 42%)" }}>{format(day, "d")}</span>
              ) : format(day, "d")}
            </p>
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="relative">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: "52px" }}>
            <div className="text-[10px] text-right pr-2 pt-0.5" style={{ color: "hsl(240 5% 36%)" }}>{fmtTime(hour, 0)}</div>
            {weekDays.map(day => {
              const dayEvts = eventsFor(day).filter(e => e.startHour === hour);
              return (
                <div key={day.toISOString()} className="relative cursor-pointer hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid hsl(240 6% 10%)", borderRight: "1px solid hsl(240 6% 10%)" }} onClick={() => openQuickAdd(day, hour)}>
                  {dayEvts.map(ev => (
                    <div key={ev.id} className="absolute inset-x-0.5 rounded px-1 py-0.5 cursor-pointer hover:brightness-110 z-10 overflow-hidden" style={{ background: ev.color + "33", borderLeft: `2px solid ${ev.color}`, top: `${ev.startMin * (52 / 60)}px`, minHeight: "18px" }} onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}>
                      <p className="text-[9px] font-medium text-white truncate">{ev.title}</p>
                      {ev.external && <span className="text-[7px] rounded px-0.5" style={{ background: "hsl(200 60% 50% / 0.2)", color: "hsl(200 60% 65%)" }}>ext</span>}
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
          <p key={d} className="text-center text-[10px] py-1" style={{ color: "hsl(240 5% 46%)" }}>{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ background: "hsl(240 6% 10%)" }}>
        {monthDays.map(day => {
          const inMonth = isSameMonth(day, currentDate);
          const dayEvts = eventsFor(day);
          return (
            <div
              key={day.toISOString()}
              className="min-h-[80px] p-1 cursor-pointer hover:bg-white/[0.03] transition-colors"
              style={{ background: isDateToday(day) ? "hsl(140 12% 42% / 0.08)" : "hsl(240 8% 7%)" }}
              onClick={() => { setCurrentDate(day); setView("day"); }}
            >
              <p className={`text-[10px] font-medium mb-0.5 ${isDateToday(day) ? "text-white" : ""}`} style={!isDateToday(day) ? { color: inMonth ? "hsl(240 5% 60%)" : "hsl(240 5% 25%)" } : {}}>
                {format(day, "d")}
              </p>
              {dayEvts.slice(0, 3).map(ev => (
                <div key={ev.id} className="text-[8px] rounded px-1 py-0.5 mb-0.5 truncate text-white" style={{ background: ev.color + "33" }}>
                  {ev.title.length > 16 ? ev.title.slice(0, 16) + "…" : ev.title}
                </div>
              ))}
              {dayEvts.length > 3 && <p className="text-[8px]" style={{ color: "hsl(240 5% 46%)" }}>+{dayEvts.length - 3} more</p>}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ─── Search results list ─── */
  const searchResultsView = showSearch && search.trim() && (
    <div className="space-y-1 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }}>
      {searchResults.length === 0 && <p className="text-xs text-center py-4" style={{ color: "hsl(240 5% 40%)" }}>No events found</p>}
      {searchResults.map(ev => (
        <button key={ev.id} className="w-full text-left p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors" style={{ borderBottom: "1px solid hsl(240 6% 12%)" }} onClick={() => { setSelectedEvent(ev); setShowSearch(false); setSearch(""); }}>
          <div className="h-3 w-3 rounded-full shrink-0" style={{ background: ev.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{ev.title}</p>
            <p className="text-[10px]" style={{ color: "hsl(240 5% 46%)" }}>{format(ev.date, "EEE, MMM d")} · {fmtTime(ev.startHour, ev.startMin)} – {fmtTime(ev.endHour, ev.endMin)}</p>
          </div>
        </button>
      ))}
    </div>
  );

  /* ─── Heading text ─── */
  const headingText = view === "day" ? format(currentDate, "EEEE, MMMM d")
    : view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
          <h2 className="text-lg font-semibold text-white">Calendar</h2>
          {eventsFor(today).length > 0 && (
            <Badge style={{ background: "hsl(140 12% 42%)", color: "white" }} className="text-[10px]">{eventsFor(today).length} today</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowSearch(s => !s)}>
            <Search className="h-3 w-3" /> Search
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowBookingLinks(true)}>
            <Link2 className="h-3 w-3" /> Booking Links
          </Button>
          <Button size="sm" className="gap-1.5 text-xs text-white" style={{ background: "hsl(140 12% 42%)" }} onClick={() => openQuickAdd(currentDate)}>
            <Plus className="h-3.5 w-3.5" /> New Event
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="relative animate-fade-in">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
          <Input placeholder="Search events by title, description, or guest…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} autoFocus />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} /></button>}
        </div>
      )}
      {searchResultsView}

      {/* Navigation + View toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium text-white ml-1">{headingText}</span>
        </div>
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "hsl(240 6% 14%)" }}>
          {(["day", "week", "month"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} className={`text-xs px-3 py-1.5 transition-colors capitalize ${view === v ? "bg-white/10 text-white" : ""}`} style={view !== v ? { color: "hsl(240 5% 46%)" } : {}}>{v}</button>
          ))}
        </div>
      </div>

      {/* Booking links strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BOOKING_LINKS.filter(b => b.active).map(b => (
          <button key={b.id} onClick={() => copyLink(b.slug)} className="shrink-0 p-2 rounded-lg flex items-center gap-2 transition-all hover:scale-[1.02]" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
            <Link2 className="h-3 w-3" style={{ color: "hsl(140 12% 58%)" }} />
            <div className="text-left">
              <p className="text-[10px] font-medium text-white">{b.title}</p>
              <p className="text-[8px]" style={{ color: "hsl(240 5% 36%)" }}>{b.duration}min · {b.bookings} booked</p>
            </div>
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {view === "day" && dayView}
      {view === "week" && weekView}
      {view === "month" && monthView}

      {/* ── Event popover ── */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-sm" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 rounded-full mt-1 shrink-0" style={{ background: selectedEvent.color }} />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">{selectedEvent.title}</h3>
                  {selectedEvent.external && <Badge className="text-[9px] mt-1" style={{ background: "hsl(200 60% 50% / 0.15)", color: "hsl(200 60% 65%)" }}>External calendar</Badge>}
                </div>
              </div>
              <div className="space-y-2 text-sm" style={{ color: "hsl(240 5% 70%)" }}>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(240 5% 46%)" }} />{format(selectedEvent.date, "EEE, MMM d")} · {fmtTime(selectedEvent.startHour, selectedEvent.startMin)} – {fmtTime(selectedEvent.endHour, selectedEvent.endMin)}</div>
                {selectedEvent.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(240 5% 46%)" }} />{selectedEvent.location}</div>}
                {selectedEvent.description && <p className="text-xs pl-5" style={{ color: "hsl(240 5% 56%)" }}>{selectedEvent.description}</p>}
                {selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-2"><Users className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "hsl(240 5% 46%)" }} />
                    <div className="flex flex-wrap gap-1">{selectedEvent.attendees.map(a => <span key={a} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(240 8% 14%)" }}>{a}</span>)}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
                <Button size="sm" variant="outline" className="text-xs gap-1 flex-1" onClick={() => openEditEvent(selectedEvent)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 flex-1" style={{ borderColor: "hsl(0 50% 35%)", color: "hsl(0 60% 60%)" }} onClick={() => deleteEvent(selectedEvent.id)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Create / Edit dialog ── */}
      <Dialog open={showEditor} onOpenChange={v => { if (!v) { setShowEditor(false); setEditEvent(null); } }}>
        <DialogContent className="max-w-md" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">{editEvent?.id ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          {editEvent && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>Title *</Label>
                <Input value={editEvent.title ?? ""} onChange={e => setEditEvent(p => ({ ...p, title: e.target.value }))} className="text-sm h-9 mt-1" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} placeholder="Add title" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>Date</Label>
                  <Input type="date" value={editEvent.date ? format(editEvent.date, "yyyy-MM-dd") : ""} onChange={e => setEditEvent(p => ({ ...p, date: new Date(e.target.value + "T12:00:00") }))} className="text-xs h-9 mt-1" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={editEvent.allDay ?? false} onCheckedChange={v => setEditEvent(p => ({ ...p, allDay: v }))} />
                  <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>All day</Label>
                </div>
              </div>
              {!editEvent.allDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>Start time</Label>
                    <Input type="time" value={`${String(editEvent.startHour ?? 9).padStart(2, "0")}:${String(editEvent.startMin ?? 0).padStart(2, "0")}`} onChange={e => { const [h, m] = e.target.value.split(":").map(Number); setEditEvent(p => ({ ...p, startHour: h, startMin: m })); }} className="text-xs h-9 mt-1" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>End time</Label>
                    <Input type="time" value={`${String(editEvent.endHour ?? 10).padStart(2, "0")}:${String(editEvent.endMin ?? 0).padStart(2, "0")}`} onChange={e => { const [h, m] = e.target.value.split(":").map(Number); setEditEvent(p => ({ ...p, endHour: h, endMin: m })); }} className="text-xs h-9 mt-1" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>Location</Label>
                <Input value={editEvent.location ?? ""} onChange={e => setEditEvent(p => ({ ...p, location: e.target.value }))} className="text-sm h-9 mt-1" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} placeholder="Add location or conferencing" />
              </div>
              <div>
                <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>Description</Label>
                <Textarea value={editEvent.description ?? ""} onChange={e => setEditEvent(p => ({ ...p, description: e.target.value }))} className="text-sm min-h-[60px] mt-1 resize-none" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} placeholder="Add description" />
              </div>
              <div>
                <Label className="text-xs" style={{ color: "hsl(240 5% 60%)" }}>Guests (comma-separated emails)</Label>
                <Input value={(editEvent.attendees ?? []).join(", ")} onChange={e => setEditEvent(p => ({ ...p, attendees: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} className="text-sm h-9 mt-1" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} placeholder="email@example.com" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowEditor(false); setEditEvent(null); }}>Cancel</Button>
                <Button size="sm" className="text-xs" style={{ background: "hsl(140 12% 42%)" }} onClick={saveEvent}>
                  {editEvent.id ? "Save Changes" : "Create Event"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Links Dialog */}
      <Dialog open={showBookingLinks} onOpenChange={setShowBookingLinks}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">Booking Links</DialogTitle></DialogHeader>
          <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Share these links so clients can book time on your calendar.</p>
          <div className="space-y-3 mt-2">
            {BOOKING_LINKS.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
                <div>
                  <p className="text-sm font-medium text-white">{b.title}</p>
                  <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>{b.duration} min · {b.bookings} bookings</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(140 12% 58%)" }}>book/{b.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-[9px]" style={b.active ? { background: "hsl(142 71% 25%)", color: "white" } : { background: "hsl(240 5% 20%)", color: "hsl(240 5% 50%)" }}>
                    {b.active ? "Active" : "Paused"}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => copyLink(b.slug)}>
                    {copiedSlug === b.slug ? <Check className="h-3 w-3" style={{ color: "hsl(142 71% 45%)" }} /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
            <Button className="w-full text-xs gap-1.5" style={{ background: "hsl(140 12% 42%)" }} onClick={() => toast.success("New booking link created!")}>
              <Plus className="h-3 w-3" /> Create New Booking Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
