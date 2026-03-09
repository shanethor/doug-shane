import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CalendarDays, Check, Clock, User } from "lucide-react";
import { format, addDays } from "date-fns";

const EVENT_TYPES = [
  { value: "presentation", label: "New Business Presentation", duration: 60 },
  { value: "coverage_review", label: "Coverage Review", duration: 45 },
  { value: "renewal_review", label: "Policy Review — Renewal", duration: 30 },
  { value: "claim_review", label: "Claim Review", duration: 30 },
];

export default function BookingPage() {
  const { producerId: advisorId } = useParams<{ producerId: string }>();
  const [searchParams] = useSearchParams();
  const preselectedType = searchParams.get("type") || "";
  const preselectedLeadId = searchParams.get("lead") || "";

  const [advisor, setAdvisor] = useState<{ full_name: string; agency_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedType, setSelectedType] = useState(preselectedType || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  useEffect(() => {
    if (!advisorId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, agency_name")
        .eq("user_id", advisorId)
        .maybeSingle();
      setAdvisor(data || { full_name: "Insurance Advisor", agency_name: null });
      setLoading(false);
    })();
  }, [advisorId]);

  const handleSubmit = async () => {
    if (!selectedType || !selectedDate || !selectedTime || !clientName.trim() || !clientEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const eventType = EVENT_TYPES.find((t) => t.value === selectedType);
      const startDt = new Date(`${selectedDate}T${selectedTime}:00`);
      const endDt = new Date(startDt.getTime() + (eventType?.duration || 60) * 60000);

      const { error } = await supabase.from("calendar_events").insert({
        user_id: advisorId,
        title: `${eventType?.label || selectedType} — ${clientName}`,
        event_type: selectedType as any,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        description: `Booked via AURA booking page\n\nClient: ${clientName}\nEmail: ${clientEmail}\n${clientNotes ? `Notes: ${clientNotes}` : ""}`,
        attendees: [clientEmail],
        lead_id: preselectedLeadId || null,
        provider: "aura",
        status: "scheduled" as any,
      } as any);

      // Best-effort push to advisor's connected calendars
      try {
        const { data: calendars } = await supabase
          .from("external_calendars")
          .select("provider")
          .eq("user_id", advisorId)
          .eq("is_active", true);

        if (calendars?.length) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            };
            for (const cal of calendars) {
              await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  action: "create_event",
                  provider: cal.provider,
                  title: `${eventType?.label || selectedType} — ${clientName}`,
                  start: startDt.toISOString(),
                  end: endDt.toISOString(),
                  description: `Booked via AURA booking page\n\nClient: ${clientName}\nEmail: ${clientEmail}`,
                  attendees: [clientEmail],
                }),
              });
            }
          }
        }
      } catch { /* silent */ }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to book");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Meeting Booked!</h2>
            <p className="text-muted-foreground font-sans">
              Your {EVENT_TYPES.find((t) => t.value === selectedType)?.label || "meeting"} with {producer?.full_name} has been scheduled for{" "}
              <strong>{format(new Date(`${selectedDate}T${selectedTime}:00`), "EEEE, MMMM d 'at' h:mm a")}</strong>.
            </p>
            <p className="text-sm text-muted-foreground font-sans">
              You'll receive a confirmation email with meeting details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate available dates (next 14 weekdays)
  const availableDates: string[] = [];
  let d = new Date();
  while (availableDates.length < 14) {
    d = addDays(d, 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      availableDates.push(format(d, "yyyy-MM-dd"));
    }
  }

  const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">AURA</span>
          </div>
          <CardTitle className="text-xl">Book a Meeting</CardTitle>
          <p className="text-sm text-muted-foreground font-sans">
            with {producer?.full_name}
            {producer?.agency_name && ` — ${producer.agency_name}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event type */}
          <div>
            <Label className="text-xs font-sans">Meeting Type *</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className={`text-left rounded-lg border p-3 text-xs font-sans transition-colors ${
                    selectedType === t.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  <p className="font-medium text-foreground">{t.label}</p>
                  <p className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" /> {t.duration} min
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          {selectedType && (
            <div>
              <Label className="text-xs font-sans">Date *</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {availableDates.slice(0, 10).map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-sans transition-colors ${
                      selectedDate === date
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {format(new Date(date + "T12:00:00"), "EEE, MMM d")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time */}
          {selectedDate && (
            <div>
              <Label className="text-xs font-sans">Time *</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-sans transition-colors ${
                      selectedTime === time
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {format(new Date(`2000-01-01T${time}:00`), "h:mm a")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client info */}
          {selectedDate && selectedTime && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Your Name *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-xs">Your Email *</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Any topics you'd like to discuss..."
                  rows={2}
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Booking…" : "Confirm Booking"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
