import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Plus, Clock, MapPin, Users, Video, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";

const today = new Date();

const DEMO_EVENTS = [
  { id: "1", title: "Pipeline Review — Q3 Targets", type: "meeting", time: "9:00 AM – 10:00 AM", date: today, location: "Zoom", attendees: ["sarah@greenvalley.com", "marcus@techventures.io"], color: "hsl(174 97% 22%)" },
  { id: "2", title: "Client Onboarding — Blue Ridge Capital", type: "presentation", time: "11:00 AM – 12:00 PM", date: today, location: "Conference Room B", attendees: ["jess@blueridgecap.com"], color: "hsl(262 83% 58%)" },
  { id: "3", title: "Follow-up Call — David Kowalski", type: "follow_up", time: "2:00 PM – 2:30 PM", date: today, location: "Phone", attendees: ["david.k@primeadvisors.net"], color: "hsl(45 93% 47%)" },
  { id: "4", title: "Networking Lunch — Chamber of Commerce", type: "other", time: "12:30 PM – 1:30 PM", date: addDays(today, 1), location: "Downtown Bistro", attendees: [], color: "hsl(240 5% 46%)" },
  { id: "5", title: "Annual Review — Sunrise Properties", type: "coverage_review", time: "2:00 PM – 3:00 PM", date: addDays(today, 1), location: "Zoom", attendees: ["linda@sunriseproperties.com"], color: "hsl(174 97% 22%)" },
  { id: "6", title: "Strategy Session — West Coast Expansion", type: "meeting", time: "10:00 AM – 11:30 AM", date: addDays(today, 2), location: "Board Room", attendees: ["marcus@techventures.io", "amanda@brightfuture.org"], color: "hsl(174 97% 22%)" },
  { id: "7", title: "Prospect Meeting — Nova Health", type: "presentation", time: "3:00 PM – 4:00 PM", date: addDays(today, 3), location: "Zoom", attendees: ["priya@novahealth.com"], color: "hsl(262 83% 58%)" },
  { id: "8", title: "Team Standup", type: "meeting", time: "9:00 AM – 9:30 AM", date: addDays(today, 4), location: "Google Meet", attendees: [], color: "hsl(174 97% 22%)" },
];

export default function DemoCalendarTab() {
  const [view, setView] = useState<"agenda" | "week">("agenda");
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const todayEvents = DEMO_EVENTS.filter(e => format(e.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"));

  // Group events by day for agenda
  const groupedEvents: Record<string, typeof DEMO_EVENTS> = {};
  for (const e of DEMO_EVENTS) {
    const key = format(e.date, "yyyy-MM-dd");
    if (!groupedEvents[key]) groupedEvents[key] = [];
    groupedEvents[key].push(e);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5" style={{ color: "hsl(174 97% 40%)" }} />
          <h2 className="text-lg font-semibold text-white">Calendar</h2>
          {todayEvents.length > 0 && (
            <Badge style={{ background: "hsl(174 97% 22%)", color: "white" }} className="text-[10px]">
              {todayEvents.length} today
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <button
              onClick={() => setView("agenda")}
              className={`text-xs px-3 py-1.5 transition-colors ${view === "agenda" ? "bg-white/10 text-white" : ""}`}
              style={view !== "agenda" ? { color: "hsl(240 5% 46%)" } : {}}
            >Agenda</button>
            <button
              onClick={() => setView("week")}
              className={`text-xs px-3 py-1.5 transition-colors ${view === "week" ? "bg-white/10 text-white" : ""}`}
              style={view !== "week" ? { color: "hsl(240 5% 46%)" } : {}}
            >Week</button>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" style={{ background: "hsl(174 97% 22%)" }}>
            <Plus className="h-3.5 w-3.5" /> New Event
          </Button>
        </div>
      </div>

      {view === "agenda" ? (
        <div className="space-y-4">
          {Object.entries(groupedEvents).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, events]) => {
            const isToday = dateKey === format(today, "yyyy-MM-dd");
            return (
              <div key={dateKey}>
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: isToday ? "hsl(174 97% 40%)" : "hsl(240 5% 60%)" }}>
                  {isToday ? "Today" : format(new Date(dateKey + "T12:00:00"), "EEEE, MMM d")}
                  <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(240 6% 20%)" }}>{events.length} events</Badge>
                </h3>
                <div className="space-y-2">
                  {events.map((event) => (
                    <Card key={event.id} className="border-l-2 hover:bg-white/[0.02] transition-colors cursor-pointer" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", borderLeftColor: event.color }}>
                      <CardContent className="p-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{event.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] flex items-center gap-1" style={{ color: "hsl(240 5% 46%)" }}>
                              <Clock className="h-3 w-3" /> {event.time}
                            </span>
                            <span className="text-[11px] flex items-center gap-1" style={{ color: "hsl(240 5% 46%)" }}>
                              {event.location.includes("Zoom") || event.location.includes("Google Meet") ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                              {event.location}
                            </span>
                            {event.attendees.length > 0 && (
                              <span className="text-[11px] flex items-center gap-1" style={{ color: "hsl(240 5% 46%)" }}>
                                <Users className="h-3 w-3" /> {event.attendees.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white">
              {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const dayEvents = DEMO_EVENTS.filter(e => format(e.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
              const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              return (
                <div key={day.toISOString()} className="rounded-lg p-2 min-h-[120px]" style={{ background: isToday ? "hsl(174 97% 22% / 0.08)" : "hsl(240 8% 9%)", border: `1px solid ${isToday ? "hsl(174 97% 22% / 0.3)" : "hsl(240 6% 14%)"}` }}>
                  <p className={`text-[10px] font-semibold mb-1 ${isToday ? "text-white" : ""}`} style={!isToday ? { color: "hsl(240 5% 46%)" } : {}}>
                    {format(day, "EEE d")}
                  </p>
                  {dayEvents.map(e => (
                    <div key={e.id} className="text-[9px] rounded px-1.5 py-0.5 mb-0.5 truncate text-white" style={{ background: e.color + "33" }}>
                      {e.title.length > 20 ? e.title.slice(0, 20) + "…" : e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
