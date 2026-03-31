import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, Sparkles, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PERKS = [
  "Free targeted leads every month",
  "40% off all paid leads",
  "Advanced AI sales pipeline",
  "Relationship intelligence engine",
  "AI-powered email & calendar",
];

export default function ConnectUpsellPopup({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#0C0C0E] border-[hsl(140_12%_42%/0.2)] text-white p-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#71717A] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full bg-[hsl(140_12%_42%/0.12)] border border-[hsl(140_12%_42%/0.2)] flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5 text-[hsl(140_12%_58%)]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Supercharge with AURA Connect
          </h2>
          <p className="text-sm text-[#71717A] mt-1">
            Unlock the full power of AURA — start your free trial today.
          </p>
        </div>

        {/* Perks */}
        <div className="px-6 pb-4 space-y-2.5">
          {PERKS.map((perk) => (
            <div key={perk} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[hsl(140_12%_42%/0.15)] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-[hsl(140_12%_62%)]" />
              </div>
              <span className="text-sm text-[#A1A1AA]">{perk}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <Link
            to="/connect"
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(140_12%_42%)] text-[#08080A] hover:bg-[hsl(140_12%_52%)] transition-colors flex items-center justify-center gap-2 no-underline"
          >
            <Zap className="w-4 h-4" />
            Try AURA Connect free
          </Link>
          <p className="text-[11px] text-[#52525B] text-center leading-relaxed">
            Free trial activates discounted leads & sales pipeline.
            <br />
            Free monthly leads available after becoming a paid member.
          </p>
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-[#52525B] hover:text-[#71717A] transition-colors py-1"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
