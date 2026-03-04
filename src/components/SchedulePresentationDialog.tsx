import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarDays, Copy, Check } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth-fetch";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadEmail?: string | null;
  userId: string;
};

export function SchedulePresentationDialog({ open, onOpenChange, leadId, leadName, leadEmail, userId }: Props) {
  const [mode, setMode] = useState<"manual" | "link">("manual");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const bookingUrl = `${window.location.origin}/book/${userId}?type=presentation&lead=${leadId}`;

  const handleSchedule = async () => {
    if (!date || !startTime || !endTime) {
      toast.error("Date and times are required");
      return;
    }

    setSaving(true);
    try {
      const startDt = new Date(`${date}T${startTime}:00`);
      const endDt = new Date(`${date}T${endTime}:00`);

      if (endDt <= startDt) {
        toast.error("End time must be after start time");
        setSaving(false);
        return;
      }

      const description = `📋 New Business Presentation — ${leadName}\n${notes ? `\nNotes: ${notes}` : ""}\n\n🔗 View in AURA: /pipeline/${leadId}`;

      const { error } = await supabase.from("calendar_events").insert({
        user_id: userId,
        title: `Presentation — ${leadName}`,
        event_type: "presentation" as any,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        description,
        location: location || null,
        attendees: leadEmail ? [leadEmail] : null,
        lead_id: leadId,
        provider: "aura",
        status: "scheduled" as any,
      } as any);

      if (error) throw error;

      // Best-effort push to Outlook
      try {
        const headers = await getAuthHeaders();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "create_event",
            title: `Presentation — ${leadName}`,
            start: startDt.toISOString(),
            end: endDt.toISOString(),
            description,
            location,
            attendees: leadEmail ? [leadEmail] : [],
          }),
        });
      } catch { /* silent */ }

      toast.success("Presentation scheduled!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Schedule Presentation — {leadName}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 mb-2">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-colors ${
              mode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pick a Slot
          </button>
          <button
            onClick={() => setMode("link")}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-colors ${
              mode === "link" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Send Booking Link
          </button>
        </div>

        {mode === "manual" ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Start</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom / Office / Client site" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda items..." rows={2} />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" className="text-muted-foreground" onClick={() => onOpenChange(false)}>Skip for now</Button>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSchedule} disabled={saving}>
                  {saving ? "Scheduling…" : "Schedule"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-sans">
              Share this booking link with {leadName}. They'll pick a time that works for them.
            </p>
            <div className="rounded-lg bg-muted/50 border p-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 border truncate font-mono">
                  {bookingUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(bookingUrl); } catch {}
                    setLinkCopied(true);
                    toast.success("Booking link copied!");
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {linkCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
