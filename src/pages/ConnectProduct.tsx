import { useEffect, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductLayout } from "@/components/ProductLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { MASTER_EMAILS } from "@/components/ProductProtectedRoute";
import { ComingSoonGate } from "@/components/connect/ComingSoonGate";
import { useEarlyAccessWhitelist } from "@/hooks/useEarlyAccessWhitelist";
import { Loader2 } from "lucide-react";

// Lazy-load heavy sub-pages to keep the ConnectProduct chunk small
const StudioUpsellPage = lazy(() => import("@/components/StudioUpsellPage"));
const DemoConnectTab = lazy(() => import("@/components/connect-demo/DemoConnectTab"));
const ConnectPipelineTab = lazy(() => import("@/components/connect/ConnectPipelineTab"));
const DemoEmailTab = lazy(() => import("@/components/connect-demo/DemoEmailTab"));
const SmartCalendar = lazy(() => import("@/components/connect/SmartCalendar"));
const DemoSpotlightTab = lazy(() => import("@/components/connect-demo/DemoSpotlightTab"));
const DemoAssistantTab = lazy(() => import("@/components/connect-demo/DemoAssistantTab"));
const ConnectIntelligencePage = lazy(() => import("@/pages/ConnectIntelligence"));
const ConnectLeads = lazy(() => import("@/pages/ConnectLeads"));
const ConnectLeadDetail = lazy(() => import("@/pages/ConnectLeadDetail"));
const ConnectRewardsPage = lazy(() => import("@/pages/ConnectRewards"));
const ConnectPropertyDashboard = lazy(() => import("@/pages/ConnectPropertyDashboard"));
const ConnectDashboard = lazy(() => import("@/pages/ConnectDashboard"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}


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
  const { isPageGated } = useEarlyAccessWhitelist();
  const { user } = useAuth();
  const isMaster = MASTER_EMAILS.includes(user?.email?.toLowerCase() ?? "");
  const { subscribed, loading: subLoading } = useSubscription();
  const canAccessFullSite = isMaster || subscribed;
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
  // Check if we're on a lead detail page
  const leadDetailMatch = path.match(/^\/connect\/leads\/([^/]+)$/);
  const getPage = () => {
    if (leadDetailMatch) return "lead-detail";
    if (path.startsWith("/connect/dashboard")) return "dashboard";
    if (path.startsWith("/connect/property")) return "property";
    if (path.startsWith("/connect/intelligence")) return "intelligence";
    if (path.startsWith("/connect/rewards")) return "rewards";
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
            <Suspense fallback={<PageLoader />}>
              {page === "dashboard" && <ConnectDashboard />}
              {page === "leads" && <ConnectLeads />}
              {page !== "leads" && page !== "dashboard" && !canAccessFullSite ? (
                <ComingSoonGate pageName={page.charAt(0).toUpperCase() + page.slice(1)} />
              ) : (
                <>
                  {page === "connect" && (isPageGated("connect") ? <ComingSoonGate pageName="Connect" /> : <DemoConnectTab contentReady={introComplete} />)}
                  {page === "intelligence" && (isPageGated("intelligence") ? <ComingSoonGate pageName="Intelligence" /> : <ConnectIntelligencePage />)}
                  {page === "rewards" && (isPageGated("rewards") ? <ComingSoonGate pageName="Rewards" /> : <ConnectRewardsPage />)}
                  {page === "property" && <ConnectPropertyDashboard />}
                  {page === "pipeline" && <ConnectPipelineTab />}
                  {page === "email" && (isPageGated("email") ? <ComingSoonGate pageName="Email" /> : <DemoEmailTab />)}
                  {page === "calendar" && (isPageGated("calendar") ? <ComingSoonGate pageName="Calendar" /> : <SmartCalendar />)}
                  {page === "create" && (isPageGated("create") ? <ComingSoonGate pageName="Create" /> : <DemoSpotlightTab />)}
                  {page === "sage" && (isPageGated("sage") ? <ComingSoonGate pageName="Sage" /> : <DemoAssistantTab onNavigate={handleSageNavigate} />)}
                  {page === "studio" && <StudioUpsellPage isConnectSubscriber={subscribed} />}
                </>
              )}
            </Suspense>
          </div>
        </div>
      </ProductLayout>
    </>
  );
}
