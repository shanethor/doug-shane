import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, CalendarDays, LayoutGrid, Sparkles, MessageSquare,
  Network, Send,
} from "lucide-react";
import ConnectSpotlightTab from "@/components/connect/ConnectSpotlightTab";
import DemoPipelineTab from "@/components/connect-demo/DemoPipelineTab";
import DemoEmailTab from "@/components/connect-demo/DemoEmailTab";
import DemoCalendarTab from "@/components/connect-demo/DemoCalendarTab";
import DemoAssistantTab from "@/components/connect-demo/DemoAssistantTab";
import DemoConnectTab from "@/components/connect-demo/DemoConnectTab";
import DemoOutreachTab from "@/components/connect-demo/DemoOutreachTab";

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

const AuraLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="white" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="white" />
  </svg>
);

function QuoteTicker() {
  return (
    <div className="w-full overflow-hidden py-2" style={{ background: "hsl(174 97% 22% / 0.08)", borderBottom: "1px solid hsl(240 6% 14%)" }}>
      <div className="flex animate-marquee whitespace-nowrap">
        {[...QUOTES, ...QUOTES].map((q, i) => (
          <span key={i} className="mx-8 text-sm italic" style={{ color: "hsl(240 5% 46%)" }}>
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { value: "connect", icon: Network, label: "Connect" },
  { value: "pipeline", icon: LayoutGrid, label: "Pipeline" },
  { value: "email", icon: Mail, label: "Email" },
  { value: "calendar", icon: CalendarDays, label: "Calendar" },
  { value: "outreach", icon: Send, label: "Outreach" },
  { value: "spotlight", icon: Sparkles, label: "Spotlight" },
  { value: "assistant", icon: MessageSquare, label: "Assistant" },
];

export default function ConnectDemo() {
  const [activeTab, setActiveTab] = useState("connect");

  useEffect(() => {
    const demoAuth = sessionStorage.getItem("connect-demo-auth");
    if (!demoAuth) {
      window.location.href = "/connectdemo/auth";
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#08080A", color: "hsl(240 6% 95%)", minHeight: "100dvh" }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(240 6% 14%)", background: "hsl(240 8% 7%)" }}>
        <div className="flex items-center gap-3">
          <AuraLogo size={32} />
          <h1 className="text-lg font-bold text-white">AURA Connect</h1>
        </div>
        <button
          className="text-xs hover:text-white transition-colors"
          style={{ color: "hsl(240 5% 46%)" }}
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
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-4" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
            {TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 data-[state=active]:text-white" style={{ color: "hsl(240 5% 46%)" }}>
                <t.icon className="h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="connect" className="mt-0"><DemoConnectTab /></TabsContent>
          <TabsContent value="pipeline" className="mt-0"><DemoPipelineTab /></TabsContent>
          <TabsContent value="email" className="mt-0"><DemoEmailTab /></TabsContent>
          <TabsContent value="calendar" className="mt-0"><DemoCalendarTab /></TabsContent>
          <TabsContent value="triggers" className="mt-0"><DemoTriggersTab /></TabsContent>
          <TabsContent value="outreach" className="mt-0"><DemoOutreachTab /></TabsContent>
          <TabsContent value="top10" className="mt-0"><DemoTop10Tab /></TabsContent>
          <TabsContent value="spotlight" className="mt-0"><ConnectSpotlightTab /></TabsContent>
          <TabsContent value="assistant" className="mt-0"><DemoAssistantTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
