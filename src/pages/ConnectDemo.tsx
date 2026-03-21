import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, CalendarDays, LayoutGrid, Sparkles, MessageSquare } from "lucide-react";
import ConnectPipelineTab from "@/components/connect/ConnectPipelineTab";
import ConnectSpotlightTab from "@/components/connect/ConnectSpotlightTab";
import EmailHub from "@/pages/EmailHub";
import CalendarPage from "@/pages/Calendar";
import Chat from "@/pages/Chat";

const QUOTES = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "In the middle of difficulty lies opportunity. – Albert Einstein",
  "Your network is your net worth. – Porter Gale",
  "The best time to plant a tree was 20 years ago. The second best time is now. – Chinese Proverb",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "Opportunities don't happen, you create them. – Chris Grosser",
  "It always seems impossible until it's done. – Nelson Mandela",
  "The secret of getting ahead is getting started. – Mark Twain",
  "Be so good they can't ignore you. – Steve Martin",
  "Dream big. Start small. Act now. – Robin Sharma",
  "What you do today can improve all your tomorrows. – Ralph Marston",
];

function QuoteTicker() {
  return (
    <div className="w-full overflow-hidden bg-primary/10 border-b border-border py-2">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...QUOTES, ...QUOTES].map((q, i) => (
          <span key={i} className="mx-8 text-sm text-muted-foreground italic">
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ConnectDemo() {
  const [activeTab, setActiveTab] = useState("pipeline");

  // Check if demo user is "authenticated"
  useEffect(() => {
    const demoAuth = sessionStorage.getItem("connect-demo-auth");
    if (!demoAuth) {
      window.location.href = "/connectdemo/auth";
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold">AURA Connect</h1>
        </div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            sessionStorage.removeItem("connect-demo-auth");
            window.location.href = "/connectdemo/auth";
          }}
        >
          Sign out
        </button>
      </header>

      <QuoteTicker />

      {/* Main content */}
      <div className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-4">
            <TabsTrigger value="pipeline" className="flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="spotlight" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Spotlight
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-0">
            <ConnectPipelineTab />
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden" style={{ minHeight: "70vh" }}>
              <EmailHub />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden" style={{ minHeight: "70vh" }}>
              <CalendarPage />
            </div>
          </TabsContent>

          <TabsContent value="spotlight" className="mt-0">
            <ConnectSpotlightTab />
          </TabsContent>

          <TabsContent value="assistant" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden" style={{ minHeight: "70vh" }}>
              <Chat />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
