import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Network, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CONNECT_PRICE_ID = "price_1RUXuREISdUzafyhyp9y2MhF";

const FEATURES = [
  "AI-powered relationship intelligence",
  "Email & calendar integration",
  "Automated feeder lists & meeting prep",
  "Pipeline & outreach management",
  "Contact enrichment & social signals",
  "Create — branded marketing assets",
];

export default function ConnectUpsellModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-public-checkout", {
        body: {
          price_id: CONNECT_PRICE_ID,
          product: "connect",
          success_url: `${window.location.origin}/post-checkout`,
          cancel_url: `${window.location.origin}/connectdemo`,
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
            <div className="p-2 rounded-lg" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
              <Network className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
            </div>
            AURA Connect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-white/50 leading-relaxed">
            You already know the right people. Let AURA Connect show you the way in.
          </p>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm line-through text-white/30">$250</span>
              <span className="text-3xl font-bold text-white">$100</span>
              <span className="text-sm text-white/40">/month</span>
            </div>
            <p className="text-xs text-white/30 mb-1">Introductory rate for 6 months · 14-day free trial</p>
            <p className="text-[10px] text-white/20 mb-3">Then $250/month</p>

            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-white/60">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full gap-2 text-white border-0 h-11"
              style={{ background: "hsl(140 12% 42%)" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs border-white/10 text-white/40 hover:text-white/60 h-9"
              onClick={onClose}
            >
              Continue exploring
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
