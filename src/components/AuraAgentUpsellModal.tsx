import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, Calendar, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AGENT_PRICE_ID = "price_aura_agent_599"; // TODO: replace with real Stripe price ID

const FEATURES = [
  "AI sales agent manages outreach & follow-ups",
  "Automated lead nurturing sequences",
  "Personalized email & SMS campaigns",
  "Smart scheduling & meeting prep",
  "Client engagement analytics",
  "Vertical-specific sales playbooks",
];

export default function AuraAgentUpsellModal({
  open,
  onClose,
  isConnectSubscriber = false,
}: {
  open: boolean;
  onClose: () => void;
  isConnectSubscriber?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: AGENT_PRICE_ID,
          product: "agent",
          success_url: `${window.location.origin}/connect`,
          cancel_url: `${window.location.origin}/connect`,
        },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#0c0c0e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Bot className="h-5 w-5 text-orange-400" />
            </div>
            AURA Agent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-white/50 leading-relaxed">
            Your AI sales agent that manages client outreach and marketing for you.
            Custom-built for your vertical — so you can focus on closing.
          </p>

          {/* Pricing */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-white">$599</span>
              <span className="text-sm text-white/40">/month</span>
            </div>
            <p className="text-xs text-white/30 mb-3">Cancel anytime</p>

            {isConnectSubscriber && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">Connect Subscriber Bonus</span>
                </div>
                <p className="text-xs text-orange-200/70">
                  <span className="font-bold text-orange-300">50% off your first month</span> — just $299.50 to get started.
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-white/60">
                  <CheckCircle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-orange-300">
                <Zap className="h-3 w-3" />
                <span className="font-medium">50% off all purchased leads</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-orange-300">
                <Zap className="h-3 w-3" />
                <span className="font-medium">2× free leads every month</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0 h-11"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Get Started <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <Link to="/book/aura-agent" onClick={onClose}>
              <Button
                variant="outline"
                className="w-full gap-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-10"
              >
                <Calendar className="h-3.5 w-3.5" /> Schedule a call first
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
