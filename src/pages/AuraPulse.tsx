import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HeartPulse, MessageSquare, ListTodo, Video, Phone, Bot,
  ClipboardList, Send, Users, Bell, GitBranch, FileText,
  LayoutDashboard, User, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import UserDashboard from "./UserDashboard";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pipeline: { icon: GitBranch, color: "text-accent", label: "Pipeline" },
  document: { icon: FileText, color: "text-primary", label: "Document" },
  loss_run: { icon: FileText, color: "text-warning", label: "Loss Runs" },
  intake: { icon: User, color: "text-primary", label: "Intake" },
  info: { icon: Bell, color: "text-muted-foreground", label: "Info" },
};

const features = [
  { icon: MessageSquare, label: "Team Messaging", description: "Real-time chat with your team" },
  { icon: Users, label: "Discussion Boards", description: "Organize conversations by topic" },
  { icon: ListTodo, label: "To-Do Lists", description: "Shared tasks and assignments" },
  { icon: Video, label: "Video Calls", description: "Face-to-face meetings, anywhere" },
  { icon: Phone, label: "Voice Calls", description: "Quick calls without leaving Aura" },
  { icon: Send, label: "Broadcast Messages", description: "Announce to your entire team" },
];

const conciergeFeatures = [
  { icon: Bot, label: "AI Answering", description: "Capture leads after hours" },
  { icon: ClipboardList, label: "Intake Forms", description: "Auto-send forms to prospects" },
  { icon: MessageSquare, label: "Client Chat", description: "Let clients reach you 24/7" },
];

export default function AuraPulse() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState("all");

  useEffect(() => {
    if (!user || activeTab !== "notifications") return;
    setNotifLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setNotifications(data || []);
        setNotifLoading(false);
      });

    const channel = supabase
      .channel("pulse-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeTab]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    window.dispatchEvent(new Event("unread-count-refresh"));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event("unread-count-refresh"));
  };

  const filteredNotifs = notifFilter === "all"
    ? notifications
    : notifFilter === "unread"
      ? notifications.filter(n => !n.is_read)
      : notifications.filter(n => n.type === notifFilter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Pulse</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide mb-4">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="overview" className="gap-1.5">
              <HeartPulse className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 relative">
              <Bell className="h-3.5 w-3.5" />
              Notifications
              {unreadCount > 0 && activeTab !== "notifications" && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="flex flex-col items-center px-4 py-8 max-w-3xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="rounded-full bg-primary/10 p-6 mb-6 inline-flex">
                <HeartPulse className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                Aura Pulse
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-6">
                The communication hub for your agency. Send messages, organize team discussion boards and to-do lists, or hop on a video or voice call — all in one place with Aura Pulse.
              </p>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold border border-border rounded-full px-5 py-2">
                Coming Soon
              </span>
            </div>

            {/* Feature framework - faded */}
            <div className="w-full opacity-40 pointer-events-none select-none mb-12">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">Team Features</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {features.map((f) => (
                  <Card key={f.label} className="bg-muted/30 border-border/50">
                    <CardContent className="flex flex-col items-center text-center p-4 gap-2">
                      <f.icon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-medium">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{f.description}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Concierge section */}
            <div className="w-full text-center mb-10">
              <div className="rounded-full bg-primary/10 p-4 mb-4 inline-flex">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-4">
                AI-Powered Concierge
              </h3>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-6">
                Aura Pulse can also serve as a concierge service for your clients. After hours — or when you&apos;re busy — Pulse can take down customer information with an AI-powered answering machine. This plugs directly into our sales pipeline and management software. Clients can contact you, give basic information, receive an intake form, and fill it out — all while you&apos;re in a meeting or with your family.
              </p>
            </div>

            {/* Concierge feature framework - faded */}
            <div className="w-full opacity-40 pointer-events-none select-none">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">Concierge Features</h3>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                {conciergeFeatures.map((f) => (
                  <Card key={f.label} className="bg-muted/30 border-border/50">
                    <CardContent className="flex flex-col items-center text-center p-4 gap-2">
                      <f.icon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-medium">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{f.description}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <UserDashboard embedded />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs">{unreadCount} new</Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          </div>

          {/* Notification type filters */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide mb-4">
            <div className="flex gap-1.5">
              {[
                { value: "all", label: "All" },
                { value: "unread", label: "Unread" },
                { value: "pipeline", label: "Pipeline" },
                { value: "loss_run", label: "Loss Runs" },
                { value: "intake", label: "Intake" },
                { value: "document", label: "Documents" },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={notifFilter === f.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setNotifFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {notifLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">
                {notifFilter === "unread" ? "All caught up!" : "No notifications yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-1">
                {filteredNotifs.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <Card
                      key={n.id}
                      className={`cursor-pointer hover-lift transition-smooth ${!n.is_read ? "border-l-2 border-l-primary bg-primary/[0.02]" : "opacity-75"}`}
                      onClick={() => {
                        if (!n.is_read) markRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                          </div>
                          {n.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>}
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
