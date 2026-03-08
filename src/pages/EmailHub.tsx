import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CalendarDays, Clock } from "lucide-react";
import Inbox from "./Inbox";
import Calendar from "./Calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, startOfDay } from "date-fns";

export default function EmailHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("email");
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, event_type")
      .eq("user_id", user.id)
      .gte("start_time", startOfDay(today).toISOString())
      .lte("start_time", new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString())
      .order("start_time", { ascending: true })
      .limit(5)
      .then(({ data }) => setTodayEvents(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("synced_emails")
      .select("id, subject, from_name, from_address, received_at")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentEmails(data || []));
  }, [user]);

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Email</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 overflow-hidden">
            <div className="min-w-0 overflow-hidden">
              <Inbox emailOnly embedded />
            </div>
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Today&apos;s Agenda
                  </h3>
                  {todayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events today</p>
                  ) : (
                    <div className="space-y-2">
                      {todayEvents.map((event) => (
                        <div key={event.id} className="text-xs border-l-2 border-primary/30 pl-2 py-1">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(event.start_time), "h:mm a")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 overflow-hidden">
            <div className="min-w-0 overflow-hidden">
              <Calendar embedded />
            </div>
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Recent Emails
                  </h3>
                  {recentEmails.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No emails yet</p>
                  ) : (
                    <div className="space-y-2">
                      {recentEmails.map((email: any) => (
                        <div key={email.id} className="text-xs border-l-2 border-accent/30 pl-2 py-1">
                          <p className="font-medium truncate">{email.subject || "(no subject)"}</p>
                          <p className="text-muted-foreground truncate">
                            {email.from_name || email.from_address}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
