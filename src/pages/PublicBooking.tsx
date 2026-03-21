import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, Check, Clock, ChevronLeft, ChevronRight, Loader2, User } from "lucide-react";
import { format, addDays, startOfDay, isBefore } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type SlotData = {
  slots: string[];
  link: { title: string; description: string | null; duration_minutes: number; timezone: string };
  profile: { full_name: string; avatar_url?: string; agency_name?: string };
};

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [confirmedTime, setConfirmedTime] = useState("");

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .filter(d => !isBefore(d, startOfDay(new Date())));

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate]);

  const fetchSlots = async (date: string) => {
    setLoading(true);
    setSelectedSlot("");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({ action: "availability", slug, date }),
      });
      if (!resp.ok) throw new Error("Failed to load availability");
      const data = await resp.json();
      setSlotData(data);
    } catch {
      toast.error("Could not load available times");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot || !clientName.trim() || !clientEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          action: "book", slug, start_time: selectedSlot,
          client_name: clientName, client_email: clientEmail,
          client_phone: clientPhone || undefined, notes: clientNotes || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Booking failed");
      }
      setConfirmedTime(selectedSlot);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Could not complete booking");
    } finally {
      setSubmitting(false);
    }
  };

  // Generate .ics file content
  const generateICS = () => {
    if (!confirmedTime || !slotData) return;
    const start = new Date(confirmedTime);
    const end = new Date(start.getTime() + slotData.link.duration_minutes * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:${slotData.link.title} with ${slotData.profile.full_name}
DESCRIPTION:Booked via AURA
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (submitted && slotData) {
    const dt = new Date(confirmedTime);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Meeting Confirmed!</h2>
            <p className="text-muted-foreground">
              Your <strong>{slotData.link.title}</strong> with {slotData.profile.full_name} is set for{" "}
              <strong>{format(dt, "EEEE, MMMM d 'at' h:mm a")}</strong> ({slotData.link.duration_minutes} min).
            </p>
            <p className="text-sm text-muted-foreground">
              Confirmation emails have been sent to both you and your advisor.
            </p>
            <Button variant="outline" onClick={generateICS} className="gap-2">
              <CalendarDays className="h-4 w-4" /> Add to Calendar (.ics)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8 sm:pt-16">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">AURA</span>
          </div>
          {slotData ? (
            <>
              <CardTitle className="text-xl">{slotData.link.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                with {slotData.profile.full_name}
                {slotData.profile.agency_name && ` — ${slotData.profile.agency_name}`}
              </p>
              <Badge variant="outline" className="mx-auto mt-1 text-xs gap-1">
                <Clock className="h-3 w-3" /> {slotData.link.duration_minutes} min
              </Badge>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">Book a Meeting</CardTitle>
              <p className="text-sm text-muted-foreground">Select a date to see available times</p>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Date</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, -7))}
                  disabled={isBefore(addDays(weekStart, -1), startOfDay(new Date()))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDates.map(d => {
                const ds = format(d, "yyyy-MM-dd");
                const isSelected = selectedDate === ds;
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className={`flex flex-col items-center rounded-lg p-2 text-xs transition-colors border ${
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium">{format(d, "EEE")}</span>
                    <span className="text-lg font-semibold">{format(d, "d")}</span>
                    <span className="text-[10px] opacity-70">{format(d, "MMM")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Available Times — {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
              </Label>
              {loading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : slotData?.slots.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slotData.slots.map(slot => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {format(new Date(slot), "h:mm a")}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No available times for this date</p>
              )}
            </div>
          )}

          {/* Client details form */}
          {selectedSlot && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="jane@company.com" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Phone (optional)</Label>
                <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label className="text-xs">What would you like to discuss? (optional)</Label>
                <Textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="Topics, questions, or context..." rows={2} />
              </div>
              <Button className="w-full" onClick={handleBook} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Booking...</> : "Confirm Booking"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
