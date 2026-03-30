import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductLayout } from "@/components/ProductLayout";
import { useSubscription } from "@/hooks/useSubscription";
import StudioUpsellPage from "@/components/StudioUpsellPage";

// Demo tab components (used as production pages)
import DemoConnectTab from "@/components/connect-demo/DemoConnectTab";
import ConnectPipelineTab from "@/components/connect/ConnectPipelineTab";
import DemoEmailTab from "@/components/connect-demo/DemoEmailTab";
import SmartCalendar from "@/components/connect/SmartCalendar";
import DemoSpotlightTab from "@/components/connect-demo/DemoSpotlightTab";
import DemoAssistantTab from "@/components/connect-demo/DemoAssistantTab";
import ConnectIntelligencePage from "@/pages/ConnectIntelligence";
import ConnectLeads from "@/pages/ConnectLeads";
import ConnectRewardsPage from "@/pages/ConnectRewards";


// Cinematic intro overlay
function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 300);
    const t1 = setTimeout(() => setPhase(2), 4800);
    const t2 = setTimeout(() => onComplete(), 5800);
    return () => [t0, t1, t2].forEach(clearTimeout);
  }, [onComplete]);

  if (phase >= 2) {
    return (
      <div className="fixed inset-0 z-[200] pointer-events-none" style={{
        background: "#08080A",
        animation: "introFadeOut 1s ease-out forwards",
      }}>
        <style>{`@keyframes introFadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }`}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: "#08080A" }}>
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle, hsl(140 12% 42% / 0.12) 0%, transparent 70%)",
        opacity: phase >= 1 ? 1 : 0,
        transition: "opacity 1.5s ease-out",
      }} />
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "scale(1)" : "scale(0.6)",
        transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <svg width={80} height={80} viewBox="0 0 100 100" fill="none">
          <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
          <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
          <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-white mt-5" style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
        transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
      }}>AURA Connect</h1>
      <p className="text-sm mt-2" style={{
        color: "hsl(140 12% 58%)",
        opacity: phase >= 1 ? 1 : 0,
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s",
      }}>Building your network…</p>
      <div className="mt-6 w-48 h-0.5 rounded-full overflow-hidden" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
        <div style={{
          height: "100%",
          background: "hsl(140 12% 42%)",
          width: phase >= 1 ? "100%" : "0%",
          transition: "width 3.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s",
          borderRadius: "9999px",
        }} />
      </div>
    </div>
  );
}

// Quote ticker
const QUOTES = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "Your network is your net worth. – Porter Gale",
  "Opportunities don't happen, you create them. – Chris Grosser",
  "Dream big. Start small. Act now. – Robin Sharma",
];

function QuoteTicker() {
  return (
    <div className="w-full overflow-hidden py-2 bg-primary/5 border-b border-border">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...QUOTES, ...QUOTES].map((q, i) => (
          <span key={i} className="mx-8 text-sm italic text-muted-foreground">{q}</span>
        ))}
      </div>
    </div>
  );
}

export default function ConnectProduct() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subscribed } = useSubscription();
  const [showIntro, setShowIntro] = useState(() => {
    try { return !sessionStorage.getItem("connect-entered"); } catch { return true; }
  });
  const [introComplete, setIntroComplete] = useState(() => {
    try { return !!sessionStorage.getItem("connect-entered"); } catch { return false; }
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem("connect-entered", "true");
    setShowIntro(false);
    setIntroComplete(true);
  };

  // Determine which page to render based on path
  const path = location.pathname;
  const getPage = () => {
    if (path.startsWith("/connect/intelligence")) return "intelligence";
    if (path.startsWith("/connect/leads")) return "leads";
    if (path.startsWith("/connect/pipeline")) return "pipeline";
    if (path.startsWith("/connect/email")) return "email";
    if (path.startsWith("/connect/calendar")) return "calendar";
    if (path.startsWith("/connect/create")) return "create";
    if (path.startsWith("/connect/sage")) return "sage";
    if (path.startsWith("/connect/studio")) return "studio";
    return "connect";
  };
  const page = getPage();

  const handleSageNavigate = (tab: string) => {
    const routes: Record<string, string> = {
      connect: "/connect",
      leads: "/connect/leads",
      pipeline: "/connect/pipeline",
      email: "/connect/email",
      calendar: "/connect/calendar",
      spotlight: "/connect/create",
      assistant: "/connect/sage",
    };
    if (routes[tab]) navigate(routes[tab]);
  };

  return (
    <>
      {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}
      <ProductLayout
        onStudioClick={() => navigate("/connect/studio")}
        studioUnlocked={false}
      >
        <QuoteTicker />
        <div className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-4">
          <div style={{
            opacity: introComplete ? 1 : 0,
            transform: introComplete ? "translateY(0)" : "translateY(20px)",
            transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            {page === "connect" && <DemoConnectTab contentReady={introComplete} />}
            {page === "intelligence" && <ConnectIntelligencePage />}
            {page === "leads" && <ConnectLeads />}
            {page === "pipeline" && <ConnectPipelineTab />}
            {page === "email" && <DemoEmailTab />}
            {page === "calendar" && <SmartCalendar />}
            {page === "create" && <DemoSpotlightTab />}
            {page === "sage" && <DemoAssistantTab onNavigate={handleSageNavigate} />}
            {page === "studio" && <StudioUpsellPage isConnectSubscriber={subscribed} />}
          </div>
        </div>
      </ProductLayout>
    </>
  );
}
