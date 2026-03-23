import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, CalendarDays, LayoutGrid, Sparkles, MessageSquare,
  Network, Send,
} from "lucide-react";
import DemoSpotlightTab from "@/components/connect-demo/DemoSpotlightTab";
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
    <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
  </svg>
);

function QuoteTicker() {
  return (
    <div className="w-full overflow-hidden py-2" style={{ background: "hsl(140 12% 42% / 0.08)", borderBottom: "1px solid hsl(240 6% 14%)" }}>
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
  { value: "spotlight", icon: Sparkles, label: "Create" },
  { value: "assistant", icon: MessageSquare, label: "Sage" },
];

export default function ConnectDemo() {
  const [activeTab, setActiveTab] = useState("connect");
  const [buildPhase, setBuildPhase] = useState(0);
  // 0=black screen, 1=logo pulse, 2=header, 3=ticker, 4=tabs, 5=content

  useEffect(() => {
    const demoAuth = sessionStorage.getItem("connect-demo-auth");
    if (!demoAuth) {
      window.location.href = "/connectdemo/auth";
      return;
    }

    const hasEntered = sessionStorage.getItem("connect-demo-entered");
    if (hasEntered) {
      setBuildPhase(5);
      return;
    }

    sessionStorage.setItem("connect-demo-entered", "true");
    // Phase 0: black screen with centered logo
    const t0 = setTimeout(() => setBuildPhase(1), 600);    // logo fades in
    const t1 = setTimeout(() => setBuildPhase(2), 5600);   // header slides down (~5s intro)
    const t2 = setTimeout(() => setBuildPhase(3), 7200);   // ticker reveals
    const t3 = setTimeout(() => setBuildPhase(4), 8800);   // tabs stagger in
    const t4 = setTimeout(() => setBuildPhase(5), 10500);  // content fades up
    return () => [t0, t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const transition = (phase: number, extra = "") =>
    `transition-all duration-700 ${extra}`.trim() +
    (buildPhase >= phase ? "" : " opacity-0 translate-y-4 pointer-events-none");

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden relative" style={{ background: "#08080A", color: "hsl(240 6% 95%)", minHeight: "100dvh" }}>

      {/* ── Phase 0→1: Cinematic logo intro overlay ── */}
      {buildPhase < 2 && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{
            background: "#08080A",
            opacity: buildPhase >= 1 && buildPhase < 2 ? 1 : 1,
            transition: "opacity 1s ease-out",
          }}
        >
          {/* Radial glow */}
          <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(140 12% 42% / 0.12) 0%, transparent 70%)",
              opacity: buildPhase >= 1 ? 1 : 0,
              transition: "opacity 1.5s ease-out",
            }}
          />
          {/* Logo */}
          <div style={{
            opacity: buildPhase >= 1 ? 1 : 0,
            transform: buildPhase >= 1 ? "scale(1)" : "scale(0.6)",
            transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <AuraLogo size={80} />
          </div>
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mt-5" style={{
            opacity: buildPhase >= 1 ? 1 : 0,
            transform: buildPhase >= 1 ? "translateY(0)" : "translateY(20px)",
            transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}>
            AuRa Connect
          </h1>
          <p className="text-sm mt-2" style={{
            color: "hsl(140 12% 58%)",
            opacity: buildPhase >= 1 ? 1 : 0,
            transform: buildPhase >= 1 ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s",
          }}>
            Building your network…
          </p>
          {/* Subtle loading bar */}
          <div className="mt-6 w-48 h-0.5 rounded-full overflow-hidden" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
            <div style={{
              height: "100%",
              background: "hsl(140 12% 42%)",
              width: buildPhase >= 1 ? "100%" : "0%",
              transition: "width 4.2s cubic-bezier(0.16, 1, 0.3, 1) 0.6s",
              borderRadius: "9999px",
            }} />
          </div>
        </div>
      )}

      {/* ── Fade-out overlay between phase 1→2 ── */}
      {buildPhase === 2 && (
        <div className="fixed inset-0 z-[199] pointer-events-none" style={{
          background: "#08080A",
          animation: "introFadeOut 1.2s ease-out forwards",
        }} />
      )}

      <style>{`
        @keyframes introFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid hsl(240 6% 14%)",
          background: "hsl(240 8% 7%)",
          opacity: buildPhase >= 2 ? 1 : 0,
          transform: buildPhase >= 2 ? "translateY(0)" : "translateY(-30px)",
          transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuraLogo size={32} />
            <h1 className="text-lg font-bold text-white">AuRa Connect</h1>
          </div>
          <button
            className="text-xs hover:text-white transition-colors"
            style={{ color: "hsl(240 5% 46%)" }}
            onClick={() => {
              sessionStorage.removeItem("connect-demo-auth");
              sessionStorage.removeItem("connect-demo-entered");
              sessionStorage.removeItem("connect-tab-visited");
              sessionStorage.removeItem("network-graph-visited");
              window.location.href = "/connectdemo/auth";
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Quote Ticker */}
      <div
        style={{
          opacity: buildPhase >= 3 ? 1 : 0,
          transform: buildPhase >= 3 ? "translateY(0)" : "translateY(-10px)",
          transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
          maxHeight: buildPhase >= 3 ? "50px" : "0px",
        }}
      >
        <QuoteTicker />
      </div>

      {/* Main content */}
      <div className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab navigation */}
          <div
            style={{
              opacity: buildPhase >= 4 ? 1 : 0,
              transform: buildPhase >= 4 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
              transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-4" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
              {TABS.map((t, i) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex items-center gap-1.5 data-[state=active]:text-white"
                  style={{
                    color: "hsl(240 5% 46%)",
                    opacity: buildPhase >= 4 ? 1 : 0,
                    transform: buildPhase >= 4 ? "translateY(0)" : "translateY(10px)",
                    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms`,
                  }}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab content */}
          <div
            style={{
              opacity: buildPhase >= 5 ? 1 : 0,
              transform: buildPhase >= 5 ? "translateY(0)" : "translateY(20px)",
              transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <TabsContent value="connect" className="mt-0"><DemoConnectTab /></TabsContent>
            <TabsContent value="pipeline" className="mt-0"><DemoPipelineTab /></TabsContent>
            <TabsContent value="email" className="mt-0"><DemoEmailTab /></TabsContent>
            <TabsContent value="calendar" className="mt-0"><DemoCalendarTab /></TabsContent>
            <TabsContent value="outreach" className="mt-0"><DemoOutreachTab /></TabsContent>
            <TabsContent value="spotlight" className="mt-0"><DemoSpotlightTab /></TabsContent>
            <TabsContent value="assistant" className="mt-0"><DemoAssistantTab onNavigate={setActiveTab} /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
