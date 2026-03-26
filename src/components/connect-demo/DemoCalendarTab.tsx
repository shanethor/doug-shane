import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarDays, Plus, Clock, MapPin, Users, Video, ChevronLeft, ChevronRight,
  Link2, Copy, ExternalLink, Check, Search, X, Trash2, Pencil, Loader2,
} from "lucide-react";
import {
  format, addDays, startOfWeek, addWeeks, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay,
  subWeeks, subMonths, addMonths, isToday as isDateToday,
} from "date-fns";
import { toast } from "sonner";
import { useRealCalendarData } from "@/hooks/useRealData";
import { ConnectEmptyState } from "./ConnectEmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/* ─── Types ─── */
interface CalEvent {
  id: string; title: string; date: Date; startHour: number; startMin: number;
  endHour: number; endMin: number; location: string; description: string;
  attendees: string[]; allDay: boolean; color: string; external?: boolean;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
type ViewMode = "day" | "week" | "month";

const fmtTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
};

function mapRealEvents(rawEvents: any[]): CalEvent[] {
  return rawEvents.map(ev => {
    const start = new Date(ev.start_time);
    const end = new Date(ev.end_time);
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
      color: ev.provider ? "hsl(262 83% 58%)" : "hsl(140 12% 42%)",
      external: !!ev.provider,
    };
  });
}

export default function DemoCalendarTab() {
  const { user } = useAuth();
  const { events: realEvents, hasEvents, loading: realLoading, refresh } = useRealCalendarData();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editEvent, setEditEvent] = useState<Partial<CalEvent> | null>(null);

  // Sync real events into local state
  useEffect(() => {
    if (realEvents.length > 0) {
      setEvents(mapRealEvents(realEvents));
    }
  }, [realEvents]);

  if (realLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
    );
  }

  // Show empty state only if no real events AND no locally created events
  if (!hasEvents && events.length === 0) {
    return (
      <div>
        <ConnectEmptyState type="calendar" />
        <div className="text-center mt-4">
          <Button
            size="sm"
            className="gap-1.5 text-xs text-white"
            style={{ background: "hsl(140 12% 42%)" }}
            onClick={() => {
              setEditEvent({
                id: "", title: "", date: new Date(), startHour: 9, startMin: 0, endHour: 10, endMin: 0,
                location: "", description: "", attendees: [], allDay: false, color: "hsl(140 12% 42%)", external: false,
              });
              setShowEditor(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Create Your First Event
          </Button>
        </div>
        {renderEditorDialog()}
      </div>
    );
  }

  const today = new Date();

  /* Navigation */
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart2 = startOfMonth(currentDate);
  const monthWeekStart = startOfWeek(monthStart2, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: monthWeekStart, end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()) });

  const eventsFor = (date: Date) => events.filter(e => isSameDay(e.date, date));

  const searchResults = search.trim()
    ? events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()))
    : [];

  const openQuickAdd = (date: Date, hour?: number) => {
    setEditEvent({
      id: "", title: "", date, startHour: hour ?? 9, startMin: 0, endHour: (hour ?? 9) + 1, endMin: 0,
      location: "", description: "", attendees: [], allDay: false, color: "hsl(140 12% 42%)", external: false,
    });
    setShowEditor(true);
  };

  const saveEvent = async () => {
    if (!editEvent?.title?.trim()) { toast.error("Title is required"); return; }
    if (user && !editEvent.id) {
      // Save to database
      const startTime = new Date(editEvent.date!);
      startTime.setHours(editEvent.startHour!, editEvent.startMin!, 0);
      const endTime = new Date(editEvent.date!);
      endTime.setHours(editEvent.endHour!, editEvent.endMin!, 0);

      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: editEvent.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: editEvent.location || null,
        description: editEvent.description || null,
        attendees: editEvent.attendees || [],
      });

      if (error) { toast.error("Failed to save event"); return; }
      toast.success("Event created");
      refresh();
    } else if (editEvent.id) {
      setEvents(prev => prev.map(e => e.id === editEvent.id ? { ...e, ...editEvent } as CalEvent : e));
      toast.success("Event updated");
    }
    setShowEditor(false);
    setEditEvent(null);
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
    toast.success("Event deleted");
    refresh();
  };

  const headingText = view === "day" ? format(currentDate, "EEEE, MMMM d")
    : view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  /* Day View */
  const dayView = (
    <div className="relative" style={{ minHeight: `${HOURS.length * 60}px` }}>
      {HOURS.map(hour => (
        <div key={hour} className="flex h-[60px]" style={{ borderBottom: "1px solid hsl(240 6% 12%)" }}>
          <div className="w-14 shrink-0 text-[10px] text-right pr-2 pt-1" style={{ color: "hsl(240 5% 40%)" }}>{fmtTime(hour, 0)}</div>
          <div className="flex-1 relative cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => openQuickAdd(currentDate, hour)} />
        </div>
      ))}
      {eventsFor(currentDate).map(ev => {
        const top = (ev.startHour - 7) * 60 + ev.startMin;
        const height = Math.max((ev.endHour - ev.startHour) * 60 + (ev.endMin - ev.startMin), 20);
        return (
          <div key={ev.id} className="absolute left-14 right-2 rounded-md px-2 py-1 cursor-pointer hover:brightness-110 transition-all overflow-hidden"
            style={{ top: `${top}px`, height: `${height}px`, background: ev.color + "33", borderLeft: `3px solid ${ev.color}` }}
            onClick={() => setSelectedEvent(ev)}>
            <p className="text-[11px] font-medium text-white truncate">{ev.title}</p>
            <p className="text-[9px]" style={{ color: "hsl(240 5% 60%)" }}>{fmtTime(ev.startHour, ev.startMin)} – {fmtTime(ev.endHour, ev.endMin)}</p>
          </div>
        );
      })}
    </div>
  );

  /* Week View */
  const weekView = (
    <div>
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

  /* Month View */
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
            <div key={day.toISOString()} className="min-h-[80px] p-1 cursor-pointer hover:bg-white/[0.03] transition-colors"
              style={{ background: isDateToday(day) ? "hsl(140 12% 42% / 0.08)" : "hsl(240 8% 7%)" }}
              onClick={() => { setCurrentDate(day); setView("day"); }}>
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

  const searchResultsView = showSearch && search.trim() && (
    <div className="space-y-1 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }}>
      {searchResults.length === 0 && <p className="text-xs text-center py-4" style={{ color: "hsl(240 5% 40%)" }}>No events found</p>}
      {searchResults.map(ev => (
        <button key={ev.id} className="w-full text-left p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors" style={{ borderBottom: "1px solid hsl(240 6% 12%)" }} onClick={() => { setSelectedEvent(ev); setShowSearch(false); setSearch(""); }}>
          <div className="h-3 w-3 rounded-full shrink-0" style={{ background: ev.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{ev.title}</p>
            <p className="text-[10px]" style={{ color: "hsl(240 5% 46%)" }}>{format(ev.date, "EEE, MMM d")} · {fmtTime(ev.startHour, ev.startMin)}</p>
          </div>
        </button>
      ))}
    </div>
  );

  function renderEditorDialog() {
    return (
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="sm:max-w-md" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 16%)" }}>
          <DialogHeader><DialogTitle className="text-white">{editEvent?.id ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          {editEvent && (
            <div className="space-y-3">
              <div><Label className="text-xs text-white/60">Title</Label><Input value={editEvent.title || ""} onChange={e => setEditEvent(p => ({ ...p!, title: e.target.value }))} className="mt-1" style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 20%)", color: "white" }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-white/60">Start</Label><Input type="time" value={`${String(editEvent.startHour || 0).padStart(2, "0")}:${String(editEvent.startMin || 0).padStart(2, "0")}`} onChange={e => { const [h, m] = e.target.value.split(":").map(Number); setEditEvent(p => ({ ...p!, startHour: h, startMin: m })); }} className="mt-1" style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 20%)", color: "white" }} /></div>
                <div><Label className="text-xs text-white/60">End</Label><Input type="time" value={`${String(editEvent.endHour || 0).padStart(2, "0")}:${String(editEvent.endMin || 0).padStart(2, "0")}`} onChange={e => { const [h, m] = e.target.value.split(":").map(Number); setEditEvent(p => ({ ...p!, endHour: h, endMin: m })); }} className="mt-1" style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 20%)", color: "white" }} /></div>
              </div>
              <div><Label className="text-xs text-white/60">Location</Label><Input value={editEvent.location || ""} onChange={e => setEditEvent(p => ({ ...p!, location: e.target.value }))} className="mt-1" style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 20%)", color: "white" }} /></div>
              <div><Label className="text-xs text-white/60">Description</Label><Textarea value={editEvent.description || ""} onChange={e => setEditEvent(p => ({ ...p!, description: e.target.value }))} className="mt-1 min-h-[60px]" style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 20%)", color: "white" }} /></div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 text-white" style={{ background: "hsl(140 12% 42%)" }} onClick={saveEvent}>Save</Button>
                <Button variant="outline" onClick={() => setShowEditor(false)} style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-3">
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
          <Button size="sm" className="gap-1.5 text-xs text-white" style={{ background: "hsl(140 12% 42%)" }} onClick={() => openQuickAdd(currentDate)}>
            <Plus className="h-3.5 w-3.5" /> New Event
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="relative animate-fade-in">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
          <Input placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} autoFocus />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} /></button>}
        </div>
      )}
      {searchResultsView}

      {/* Nav + View toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium text-white ml-1">{headingText}</span>
        </div>
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "hsl(240 6% 14%)" }}>
          {(["day", "week", "month"] as ViewMode[]).map(v => (
            <button key={v} className={`px-3 py-1 text-xs capitalize transition-colors ${view === v ? "text-white" : ""}`}
              style={{ background: view === v ? "hsl(140 12% 42%)" : "transparent", color: view !== v ? "hsl(240 5% 50%)" : undefined }}
              onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(240 6% 12%)", background: "hsl(240 8% 6%)" }}>
        {view === "day" && dayView}
        {view === "week" && weekView}
        {view === "month" && monthView}
      </div>

      {/* Event detail popover */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 16%)" }}>
            <DialogHeader><DialogTitle className="text-white">{selectedEvent.title}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-white/60"><Clock className="h-3.5 w-3.5" />{format(selectedEvent.date, "EEE, MMM d")} · {fmtTime(selectedEvent.startHour, selectedEvent.startMin)} – {fmtTime(selectedEvent.endHour, selectedEvent.endMin)}</p>
              {selectedEvent.location && <p className="flex items-center gap-2 text-white/60"><MapPin className="h-3.5 w-3.5" />{selectedEvent.location}</p>}
              {selectedEvent.description && <p className="text-white/50 text-xs mt-2">{selectedEvent.description}</p>}
              {selectedEvent.attendees.length > 0 && (
                <div className="flex items-center gap-2 text-white/60"><Users className="h-3.5 w-3.5" /><span>{selectedEvent.attendees.join(", ")}</span></div>
              )}
              <div className="flex gap-2 pt-3">
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