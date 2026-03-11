import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CalendarDays, Clock, FolderOpen } from "lucide-react";
import Inbox from "./Inbox";
import Calendar from "./Calendar";
import { ClientEmailFolders } from "@/components/ClientEmailFolders";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, startOfDay } from "date-fns";

export default function EmailHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("email");
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

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
      {/* Compact segmented control on mobile, standard header on desktop */}
      <div className="flex items-center gap-3 mb-2 md:mb-6">
        <Mail className="h-5 w-5 md:h-6 md:w-6 text-primary hidden md:block" />
        <h1 className="text-lg md:text-3xl font-semibold tracking-tight hidden md:block">Email</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2 md:mb-4 h-8 md:h-9">
          <TabsTrigger value="email" className="gap-1.5 text-xs md:text-sm px-3 md:px-4">
            <Mail className="h-3 w-3 md:h-3.5 md:w-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs md:text-sm px-3 md:px-4">
            <FolderOpen className="h-3 w-3 md:h-3.5 md:w-3.5" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs md:text-sm px-3 md:px-4">
            <CalendarDays className="h-3 w-3 md:h-3.5 md:w-3.5" />
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

        <TabsContent value="clients">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 overflow-hidden">
            {/* Client folders sidebar (always visible on this tab) */}
            <Card className="lg:max-h-[calc(100vh-200px)]">
              <CardContent className="p-2 h-full">
                <ClientEmailFolders
                  onSelectClient={setSelectedClientId}
                  selectedClientId={selectedClientId}
                />
              </CardContent>
            </Card>

            {/* Filtered email list for selected client */}
            <div className="min-w-0 overflow-hidden">
              {selectedClientId ? (
                <ClientEmailList clientId={selectedClientId} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FolderOpen className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Select a client to view their emails</p>
                </div>
              )}
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

/** Inline component: show emails filtered by client_id */
function ClientEmailList({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) return;
    setLoading(true);
    supabase
      .from("synced_emails")
      .select("id, from_address, from_name, subject, body_preview, is_read, received_at, has_attachments, tags")
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .order("received_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setEmails(data || []);
        setLoading(false);
      });
  }, [user, clientId]);

  function decodeEntities(text: string): string {
    const el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Mail className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No emails for this client</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {emails.map((email) => (
        <div
          key={email.id}
          className={`rounded-lg border px-4 py-3 transition-colors ${
            !email.is_read ? "border-l-2 border-l-primary bg-primary/[0.02]" : "opacity-75"
          }`}
        >
          <div className="flex items-center gap-2">
            <p className={`text-sm truncate flex-1 ${!email.is_read ? "font-medium" : ""}`}>
              {email.from_name || email.from_address.split("@")[0]}
            </p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {format(new Date(email.received_at), "MMM d")}
            </span>
          </div>
          <p className="text-xs truncate mt-0.5 text-muted-foreground">
            {email.subject || "(no subject)"}
          </p>
          {email.body_preview && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {decodeEntities(email.body_preview)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
