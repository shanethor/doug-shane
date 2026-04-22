import { useEffect, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductLayout } from "@/components/ProductLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { isMasterEmail } from "@/lib/master-accounts";
import { ComingSoonGate } from "@/components/connect/ComingSoonGate";
import { useEarlyAccessWhitelist } from "@/hooks/useEarlyAccessWhitelist";
import { Loader2, ArrowRight, Shield, X } from "lucide-react";
import { Link } from "react-router-dom";

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
const ConnectSignal = lazy(() => import("@/pages/ConnectSignal"));

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

function CrossProductBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("connect-clark-banner-dismissed") === "true"; } catch { return false; }
  });

  if (dismissed) return null;

  return (
    <div className="relative mx-2 sm:mx-4 lg:mx-6 mt-3">
      <Link
        to="/clark"
        className="group flex items-center justify-between gap-3 px-4 py-3 pr-10 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/15 shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Clark Insurance Assistant</p>
            <p className="text-xs text-muted-foreground">AI-powered ACORD forms, client questionnaires & carrier packaging</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem("connect-clark-banner-dismissed", "true");
          setDismissed(true);
        }}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ConnectProduct() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPageGated } = useEarlyAccessWhitelist();
  const { user } = useAuth();
  const isMaster = isMasterEmail(user?.email);
  const { subscribed, loading: subLoading } = useSubscription();
  const isSubscriber = isMaster || subscribed;
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
    if (path.startsWith("/connect/signal")) return "signal";
    if (path.startsWith("/connect/property")) return "property";
    if (path.startsWith("/connect/intelligence")) return "intelligence";
    if (path.startsWith("/connect/rewards")) return "rewards";
    if (path.startsWith("/connect/leads")) return "leads";
    if (path.startsWith("/connect/pipeline")) return "pipeline";
    if (path.startsWith("/connect/email")) return "email";
    if (path.startsWith("/connect/calendar")) return "calendar";
    if (path.startsWith("/connect/create")) return "create";
    if (path.startsWith("/connect/clark")) return "clark";
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
      assistant: "/connect/clark",
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
        <CrossProductBanner />
        <div className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-4">
          <div style={{
            opacity: introComplete ? 1 : 0,
            transform: introComplete ? "translateY(0)" : "translateY(20px)",
            transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <Suspense fallback={<PageLoader />}>
              {/* Free pages — always accessible */}
              {page === "dashboard" && <ConnectDashboard isSubscriber={isSubscriber} />}
              {page === "signal" && <ConnectSignal />}
              {page === "lead-detail" && <ConnectLeadDetail />}
              {page === "leads" && <ConnectLeads />}
              {page === "pipeline" && <ConnectPipelineTab />}
              {page === "clark" && <DemoAssistantTab onNavigate={handleSageNavigate} isSubscriber={isSubscriber} />}

              {/* Subscription-gated or "soon" pages — isPageGated now respects subscription status */}
              {page === "connect" && (!isPageGated("connect") && isSubscriber ? <DemoConnectTab contentReady={introComplete} /> : <ComingSoonGate pageName="Connect" />)}
              {page === "intelligence" && (!isPageGated("intelligence") && isSubscriber ? <ConnectIntelligencePage /> : <ComingSoonGate pageName="Intelligence" />)}
              {page === "rewards" && (!isPageGated("rewards") && isSubscriber ? <ConnectRewardsPage /> : <ComingSoonGate pageName="Rewards" />)}
              {page === "property" && (isSubscriber ? <ConnectPropertyDashboard /> : <ComingSoonGate pageName="Property" />)}
              {page === "email" && (!isPageGated("email") && isSubscriber ? <DemoEmailTab /> : <ComingSoonGate pageName="Email" />)}
              {page === "calendar" && (!isPageGated("calendar") && isSubscriber ? <SmartCalendar /> : <ComingSoonGate pageName="Calendar" />)}
              {page === "create" && (isSubscriber ? <DemoSpotlightTab /> : <ComingSoonGate pageName="Create" />)}
              {page === "studio" && <StudioUpsellPage isConnectSubscriber={subscribed} />}
            </Suspense>
          </div>
        </div>
      </ProductLayout>
    </>
  );
}
