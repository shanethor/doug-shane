import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link2, Plus, Copy, ExternalLink, Clock, Settings, Trash2, Loader2, CalendarDays } from "lucide-react";

type BookingLink = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  timezone: string;
  availability_template: Record<string, string[]>;
  min_notice_minutes: number;
  buffer_before: number;
  buffer_after: number;
  is_active: boolean;
  public_slug: string;
  created_at: string;
};

type BookedMeeting = {
  id: string;
  client_name: string;
  client_email: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const DURATIONS = [15, 30, 45, 60, 90];

function generateSlug() {
  return Math.random().toString(36).substring(2, 10);
}

export default function BookingLinksManager() {
  const { user } = useAuth();
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [meetings, setMeetings] = useState<BookedMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editLink, setEditLink] = useState<BookingLink | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("Meeting");
  const [duration, setDuration] = useState(30);
  const [minNotice, setMinNotice] = useState(120);
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [availability, setAvailability] = useState<Record<string, string[]>>({
    mon: ["09:00-12:00", "13:00-17:00"], tue: ["09:00-12:00", "13:00-17:00"],
    wed: ["09:00-12:00", "13:00-17:00"], thu: ["09:00-12:00", "13:00-17:00"],
    fri: ["09:00-12:00", "13:00-17:00"], sat: [], sun: [],
  });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [linksRes, meetingsRes] = await Promise.all([
      supabase.from("booking_links").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("booked_meetings").select("*").eq("user_id", user.id).order("start_time", { ascending: false }).limit(50),
    ]);
    setLinks((linksRes.data as any[]) || []);
    setMeetings((meetingsRes.data as any[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const slug = generateSlug();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error } = await supabase.from("booking_links").insert({
        user_id: user.id,
        title,
        duration_minutes: duration,
        timezone: tz,
        availability_template: availability,
        min_notice_minutes: minNotice,
        buffer_before: bufferBefore,
        buffer_after: bufferAfter,
        public_slug: slug,
      } as any);
      if (error) throw error;
      toast.success("Booking link created!");
      setCreateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (link: BookingLink) => {
    const { error } = await supabase.from("booking_links").update({ is_active: !link.is_active } as any).eq("id", link.id);
    if (error) { toast.error("Failed to update"); return; }
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from("booking_links").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setLinks(prev => prev.filter(l => l.id !== id));
    toast.success("Booking link deleted");
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const updateAvailDay = (day: string, value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: value ? value.split(",").map(s => s.trim()) : [],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  const upcomingMeetings = meetings.filter(m => m.status === "scheduled" && new Date(m.start_time) > new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Booking Links</h2>
          {links.length > 0 && <Badge variant="outline" className="text-xs">{links.length}</Badge>}
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Create Link</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Booking Link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <Label>Meeting Name</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Insurance Review" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Notice (hours)</Label>
                  <Select value={String(minNotice)} onValueChange={v => setMinNotice(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Buffer Before (min)</Label>
                  <Select value={String(bufferBefore)} onValueChange={v => setBufferBefore(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 30].map(b => <SelectItem key={b} value={String(b)}>{b} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Buffer After (min)</Label>
                  <Select value={String(bufferAfter)} onValueChange={v => setBufferAfter(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 30].map(b => <SelectItem key={b} value={String(b)}>{b} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Weekly Availability</Label>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-20">{DAY_LABELS[day]}</span>
                      <Input
                        className="text-xs h-8"
                        value={(availability[day] || []).join(", ")}
                        onChange={e => updateAvailDay(day, e.target.value)}
                        placeholder="09:00-12:00, 13:00-17:00"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Format: HH:MM-HH:MM, comma-separated for multiple windows</p>
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Booking Link"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing links */}
      {links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No booking links yet</p>
            <p className="text-xs mt-1">Create a link to let clients book time with you</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Your First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <Card key={link.id} className="hover-lift transition-smooth">
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{link.title}</h3>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Clock className="h-2.5 w-2.5" /> {link.duration_minutes}m
                    </Badge>
                    {!link.is_active && <Badge variant="secondary" className="text-[10px]">Paused</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {window.location.origin}/book/{link.public_slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={link.is_active} onCheckedChange={() => toggleActive(link)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(link.public_slug)} title="Copy link">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/book/${link.public_slug}`, "_blank")} title="Preview">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteLink(link.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming booked meetings */}
      {upcomingMeetings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Bookings
            <Badge variant="outline" className="text-[10px]">{upcomingMeetings.length}</Badge>
          </h3>
          <div className="space-y-2">
            {upcomingMeetings.slice(0, 10).map(m => (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.client_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{m.client_email}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.start_time).toLocaleDateString()} at {new Date(m.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {m.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
