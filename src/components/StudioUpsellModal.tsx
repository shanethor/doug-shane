import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Zap, Calendar, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STUDIO_PRICE_ID = "price_1TF5I1EISdUzafyhMrDOU8II";
const STUDIO_COUPON_ID = "qj03MTZb"; // 50% off first month for Connect subscribers

const FEATURES = [
  "Custom CRM & dashboard builds",
  "AI agent integrations",
  "Marketing automation systems",
  "Process & workflow automation",
  "Data analytics dashboards",
  "Dedicated build team",
];

export default function StudioUpsellModal({
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
          price_id: STUDIO_PRICE_ID,
          coupon: isConnectSubscriber ? STUDIO_COUPON_ID : undefined,
          product: "studio",
          success_url: `${window.location.origin}/studio`,
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
              <Wrench className="h-5 w-5 text-orange-400" />
            </div>
            Aura Studio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-white/50 leading-relaxed">
            Your AI-native on-call build team. Custom tools, dashboards, AI agents & assets —
            built and delivered by our team.
          </p>

          {/* Pricing */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-white">$1,500</span>
              <span className="text-sm text-white/40">/month</span>
            </div>
            <p className="text-xs text-white/30 mb-3">3-month minimum commitment</p>

            {isConnectSubscriber && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">Connect Subscriber Bonus</span>
                </div>
                <p className="text-xs text-orange-200/70">
                  <span className="font-bold text-orange-300">50% off your first month</span> — just $750 to get started.
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

            <Link to="/book/aura-studio" onClick={onClose}>
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
