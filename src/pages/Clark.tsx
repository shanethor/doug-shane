import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ClarkOnboarding from "@/components/clark/ClarkOnboarding";
import ClarkChat from "@/components/clark/ClarkChat";
import ClarkSubmissionsPanel from "@/components/clark/ClarkSubmissionsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLARK_TIERS, CLARK_ADMIN_EMAILS, type ClarkTierKey } from "@/lib/clark-tiers";
import { toast } from "sonner";
import { CreditCard, Zap, PanelLeftClose, PanelLeft, ArrowRight, Network, X, Smartphone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

function ConnectBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("clark-connect-banner-dismissed") === "true"; } catch { return false; }
  });

  if (dismissed) return null;

  return (
    <div className="relative mx-auto max-w-7xl px-3 sm:px-4 py-2">
      <Link
        to="/connect"
        className="group flex items-center justify-between gap-3 px-4 py-2.5 pr-10 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/15 shrink-0">
            <Network className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Launch Aura Connect</p>
            <p className="text-xs text-muted-foreground">CRM, pipeline, leads, email & calendar tools</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem("clark-connect-banner-dismissed", "true");
          setDismissed(true);
        }}
        className="absolute top-4 right-5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function Clark() {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [tier, setTier] = useState<ClarkTierKey | "free">("free");
  const [submissionCount, setSubmissionCount] = useState(0);
  const [activeSubId, setActiveSubId] = useState<string | undefined>();
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  const isMobile = useIsMobile();
  const [showPanel, setShowPanel] = useState(!isMobile);
  const [chatKey, setChatKey] = useState(0);
  const chatRef = useRef<any>(null);

  const refreshSubmissions = () => {
    setSubmissionsRefreshKey((prev) => prev + 1);
    void checkProfile();
  };

  useEffect(() => { setShowPanel(!isMobile); }, [isMobile]);

  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Admin emails always get unlimited
    if (user.email && CLARK_ADMIN_EMAILS.includes(user.email)) {
      setTier("unlimited");
    } else {
      const { data: subData } = await supabase.functions.invoke("clark-subscription-check");
      if (subData?.tier && subData.tier !== "free") {
        setTier("unlimited"); // all paid plans map to unlimited now
      } else if (subData?.tier) {
        setTier(subData.tier as ClarkTierKey | "free");
      }
    }

    const { data: profile } = await supabase
      .from("clark_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setHasProfile(!!profile);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("clark_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["extracted", "needs_info", "questionnaire_sent", "questionnaire_complete", "finalized"])
      .gte("created_at", startOfMonth.toISOString());
    setSubmissionCount(count || 0);
    setLoading(false);
  };

  useEffect(() => { checkProfile(); }, []);

  const handleUpgrade = async () => {
    try {
      const priceId = CLARK_TIERS.unlimited.price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId, success_url: `${window.location.origin}/clark`, cancel_url: `${window.location.origin}/clark` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    }
  };

  const handleSelectSubmission = (id: string) => {
    setActiveSubId(id);
    setChatKey(prev => prev + 1);
    if (isMobile) setShowPanel(false);
  };

  const handleNewSubmission = () => {
    setActiveSubId(undefined);
    setChatKey(prev => prev + 1);
    if (isMobile) setShowPanel(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasProfile) {
    return <ClarkOnboarding onComplete={() => setHasProfile(true)} />;
  }

  const isPaid = tier === "unlimited";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPanel(p => !p)}>
              {showPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <h1 className="text-lg sm:text-xl font-bold">Clark</h1>
            <Badge variant={isPaid ? "default" : "secondary"} className="text-xs">
              {isPaid ? "Unlimited" : "Free"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isPaid && (
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {submissionCount} this month
              </span>
            )}
            {!isPaid && (
              <Button size="sm" onClick={handleUpgrade} className="gap-1.5 text-xs sm:text-sm">
                <Zap className="h-3.5 w-3.5" /> Get Unlimited — $299.99/mo
              </Button>
            )}
            {isPaid && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={async () => {
                const { data } = await supabase.functions.invoke("customer-portal");
                if (data?.url) window.open(data.url, "_blank");
              }}>
                <CreditCard className="h-3.5 w-3.5" /> Manage
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConnectBanner />

      <div className="mx-auto max-w-7xl px-3 sm:px-4 pb-2">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/15 shrink-0">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Text <span className="font-mono text-primary">(999) 999-9999</span> to chat with Clark on the go
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Submit clients, get answers, and update files via SMS — no app needed.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary shrink-0">
            Coming Soon
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl flex relative" style={{ height: "calc(100vh - 105px)" }}>
        {showPanel && (
          <div className={`${isMobile ? "absolute inset-0 z-30 bg-background" : "w-72 border-r shrink-0"}`}>
            <ClarkSubmissionsPanel
              activeSubmissionId={activeSubId}
              onSelect={handleSelectSubmission}
              onNewSubmission={handleNewSubmission}
              refreshKey={submissionsRefreshKey}
            />
          </div>
        )}
        <div className={`flex-1 p-2 sm:p-4 overflow-hidden ${isMobile && showPanel ? "hidden" : ""}`}>
          {!isPaid ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-6 text-center space-y-3">
              <h2 className="text-lg font-semibold">Subscribe to Clark</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Get unlimited AI-powered ACORD form submissions, client questionnaires, PDF extraction, and carrier packaging for $299.99/month.
              </p>
              <Button onClick={handleUpgrade} className="gap-1.5">
                <Zap className="h-4 w-4" /> Get Unlimited — $299.99/mo
              </Button>
            </div>
          ) : (
            <ClarkChat
              key={chatKey}
              submissionId={activeSubId}
              tier={tier}
              submissionCount={submissionCount}
              onSubmissionCreated={(id) => {
                setActiveSubId(id);
                refreshSubmissions();
              }}
              onSubmissionsChanged={refreshSubmissions}
              onNewClient={handleNewSubmission}
            />
          )}
        </div>
      </div>
    </div>
  );
}
