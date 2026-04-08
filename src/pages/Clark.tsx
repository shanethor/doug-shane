import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ClarkOnboarding from "@/components/clark/ClarkOnboarding";
import ClarkChat from "@/components/clark/ClarkChat";
import ClarkSubmissionsPanel from "@/components/clark/ClarkSubmissionsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLARK_TIERS, CLARK_ADMIN_EMAIL, type ClarkTierKey } from "@/lib/clark-tiers";
import { toast } from "sonner";
import { CreditCard, Zap, PanelLeftClose, PanelLeft } from "lucide-react";

export default function Clark() {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [tier, setTier] = useState<ClarkTierKey | "free">("free");
  const [submissionCount, setSubmissionCount] = useState(0);
  const [activeSubId, setActiveSubId] = useState<string | undefined>();
  const [showPanel, setShowPanel] = useState(true);
  const [chatKey, setChatKey] = useState(0); // force remount on submission change
  const chatRef = useRef<any>(null);

  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (user.email === CLARK_ADMIN_EMAIL) {
      setTier("elite");
    } else {
      const { data: subData } = await supabase.functions.invoke("clark-subscription-check");
      if (subData?.tier) setTier(subData.tier as ClarkTierKey);
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
      .gte("created_at", startOfMonth.toISOString());
    setSubmissionCount(count || 0);
    setLoading(false);
  };

  useEffect(() => { checkProfile(); }, []);

  const handleUpgrade = async (tierKey: ClarkTierKey) => {
    try {
      const priceId = CLARK_TIERS[tierKey].price_id;
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
  };

  const handleNewSubmission = () => {
    setActiveSubId(undefined);
    setChatKey(prev => prev + 1);
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

  const currentTier = tier === "free" ? null : CLARK_TIERS[tier];
  const limit = currentTier?.monthlyLimit ?? 0;
  const atLimit = tier !== "elite" && tier !== "free" && submissionCount >= limit;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPanel(p => !p)}>
              {showPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <h1 className="text-xl font-bold">Clark</h1>
            <Badge variant={tier === "free" ? "secondary" : "default"}>
              {tier === "free" ? "Free" : currentTier?.name}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {tier !== "elite" && (
              <span className="text-sm text-muted-foreground">
                {submissionCount}/{limit || "—"} this month
              </span>
            )}
            {tier === "free" && (
              <Button size="sm" onClick={() => handleUpgrade("starter")} className="gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Upgrade
              </Button>
            )}
            {tier !== "free" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
                const { data } = await supabase.functions.invoke("customer-portal");
                if (data?.url) window.open(data.url, "_blank");
              }}>
                <CreditCard className="h-3.5 w-3.5" /> Manage
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl flex" style={{ height: "calc(100vh - 57px)" }}>
        {showPanel && (
          <div className="w-72 border-r shrink-0">
            <ClarkSubmissionsPanel
              activeSubmissionId={activeSubId}
              onSelect={handleSelectSubmission}
              onNewSubmission={handleNewSubmission}
            />
          </div>
        )}
        <div className="flex-1 p-4 overflow-hidden">
          {atLimit ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
              <h2 className="text-lg font-semibold">Submission limit reached</h2>
              <p className="text-sm text-muted-foreground">
                You've used all {limit} submissions for this month. Upgrade to increase your limit.
              </p>
              <div className="flex gap-2 justify-center">
                {tier === "starter" && <Button onClick={() => handleUpgrade("pro")}>Upgrade to Pro ($99/mo)</Button>}
                {(tier === "starter" || tier === "pro") && <Button variant="outline" onClick={() => handleUpgrade("elite")}>Go Elite ($249/mo)</Button>}
              </div>
            </div>
          ) : (
            <ClarkChat
              key={chatKey}
              submissionId={activeSubId}
              onSubmissionCreated={(id) => setActiveSubId(id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
