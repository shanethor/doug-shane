import { AppLayout } from "@/components/AppLayout";
import { HeartPulse, MessageSquare, ListTodo, Video, Phone, Bot, ClipboardList, Send, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  return (
    <AppLayout>
      <div className="flex flex-col items-center min-h-[60vh] px-4 py-8 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="rounded-full bg-primary/10 p-6 mb-6 inline-flex">
            <HeartPulse className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Aura Pulse
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-6">
            The communication hub for your agency. Send messages, organize team discussion boards and to-do lists, or hop on a video or voice call — all in one place with Aura Pulse.
          </p>
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold border border-border rounded-full px-5 py-2">
            Coming Soon
          </span>
        </div>

        {/* Feature framework - faded */}
        <div className="w-full opacity-40 pointer-events-none select-none mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">Team Features</h2>
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
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4">
            AI-Powered Concierge
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-6">
            Aura Pulse can also serve as a concierge service for your clients. After hours — or when you're busy — Pulse can take down customer information with an AI-powered answering machine. This plugs directly into our sales pipeline and management software. Clients can contact you, give basic information, receive an intake form, and fill it out — all while you're in a meeting or with your family.
          </p>
        </div>

        {/* Concierge feature framework - faded */}
        <div className="w-full opacity-40 pointer-events-none select-none">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">Concierge Features</h2>
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
    </AppLayout>
  );
}
