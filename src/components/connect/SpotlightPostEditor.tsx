import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Download, Copy, RefreshCw, X, Loader2, Sparkles,
  Share2, Facebook, Instagram, Linkedin, Plus,
} from "lucide-react";

const darkInput: React.CSSProperties = { background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" };
const darkTextarea: React.CSSProperties = { ...darkInput };

const SOCIAL_SIZES = [
  { value: "original", label: "Orig", ratio: null },
  { value: "fb", label: "FB", ratio: "1200×630", icon: Facebook },
  { value: "ig-square", label: "IG", ratio: "1080×1080", icon: Instagram },
  { value: "ig-story", label: "Story", ratio: "1080×1920", icon: Instagram },
  { value: "linkedin", label: "LI", ratio: "1200×627", icon: Linkedin },
];

interface Props {
  resultImageUrl: string;
  title: string;
  bullets: string[];
  cta: string;
  disclaimer: string;
  generating: boolean;
  onTitleChange: (v: string) => void;
  onBulletsChange: (v: string[]) => void;
  onCtaChange: (v: string) => void;
  onDisclaimerChange: (v: string) => void;
  onRegenerate: (tweakText?: string) => Promise<void>;
  onDownload: () => void;
  onCopyCaption: () => void;
  onSagePost: (platform: string) => void;
}

export default function SpotlightPostEditor({
  resultImageUrl, title, bullets, cta, disclaimer,
  generating, onTitleChange, onBulletsChange, onCtaChange,
  onDisclaimerChange, onRegenerate, onDownload, onCopyCaption, onSagePost,
}: Props) {
  const [selectedSize, setSelectedSize] = useState("original");
  const [tweakText, setTweakText] = useState("");
  const [dirty, setDirty] = useState(false);

  const markDirty = () => { if (!dirty) setDirty(true); };
  const updateBullet = (i: number, val: string) => {
    const u = [...bullets]; u[i] = val; onBulletsChange(u); markDirty();
  };
  const removeBullet = (i: number) => { onBulletsChange(bullets.filter((_, idx) => idx !== i)); markDirty(); };
  const addBullet = () => { onBulletsChange([...bullets, ""]); };

  const handleRegenerate = async () => {
    await onRegenerate(tweakText.trim() || undefined);
    setTweakText("");
    setDirty(false);
  };

  const aspectStyle = (size: string): React.CSSProperties => {
    const map: Record<string, string> = { fb: "1200/630", "ig-square": "1/1", "ig-story": "9/16", linkedin: "1200/627" };
    if (!map[size]) return {};
    return { aspectRatio: map[size], objectFit: "cover" as const, maxHeight: size === "ig-story" ? "400px" : "500px" };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 400 }}>
      {/* LEFT: Preview */}
      <div className="lg:w-[55%] space-y-3">
        <div className="relative rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)", background: "hsl(240 6% 5%)" }}>
          {generating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(140 12% 50%)" }} />
            </div>
          )}
          <img
            src={resultImageUrl}
            alt={title}
            className="w-full h-auto max-h-[500px] object-contain mx-auto"
            style={aspectStyle(selectedSize)}
          />
        </div>

        {/* Resize pills */}
        <div className="flex flex-wrap gap-1.5">
          {SOCIAL_SIZES.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => setSelectedSize(s.value)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: selectedSize === s.value ? "hsl(140 12% 42%)" : "hsl(240 6% 10%)",
                  color: selectedSize === s.value ? "#fff" : "hsl(240 5% 60%)",
                  border: `1px solid ${selectedSize === s.value ? "hsl(140 12% 42%)" : "hsl(240 6% 18%)"}`,
                }}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Export row */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 text-white text-xs" style={{ background: "hsl(140 12% 42%)" }} onClick={onDownload}>
            <Download className="h-3 w-3" /> Download PNG
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" style={{ background: "transparent", border: "1px solid hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }} onClick={onCopyCaption}>
            <Copy className="h-3 w-3" /> Copy Caption
          </Button>
        </div>
      </div>

      {/* RIGHT: Edit panel */}
      <div className="lg:w-[45%] space-y-3 overflow-y-auto" style={{ maxHeight: 600 }}>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(140 12% 58%)" }}>Edit & Refine</h4>

        <div className="space-y-1">
          <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Headline</label>
          <Input value={title} onChange={e => { onTitleChange(e.target.value); markDirty(); }} style={darkInput} />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Bullet Points</label>
          <div className="space-y-1.5">
            {bullets.map((b, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <span className="text-[10px] w-3 shrink-0" style={{ color: "hsl(240 5% 46%)" }}>•</span>
                <Input value={b} onChange={e => updateBullet(i, e.target.value)} className="flex-1 text-xs" style={darkInput} />
                {bullets.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" style={{ color: "hsl(240 5% 50%)" }} onClick={() => removeBullet(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {bullets.length < 6 && (
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-5" style={{ color: "hsl(140 12% 58%)" }} onClick={addBullet}>
                <Plus className="h-3 w-3" /> Add bullet
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Call to Action</label>
          <Input value={cta} onChange={e => { onCtaChange(e.target.value); markDirty(); }} style={darkInput} />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Footer / Disclaimer</label>
          <Textarea value={disclaimer} onChange={e => { onDisclaimerChange(e.target.value); markDirty(); }} className="min-h-[40px] text-xs" style={darkTextarea} />
        </div>

        <Separator style={{ background: "hsl(240 6% 14%)" }} />

        {/* Tweak + Regenerate */}
        <div className="space-y-2">
          <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Quick Tweaks</label>
          <Textarea value={tweakText} onChange={e => setTweakText(e.target.value)} placeholder="Make the headline larger, use a lighter background..." className="min-h-[40px] text-xs" style={darkTextarea} maxLength={500} />
          <Button
            className="w-full gap-2 text-white text-xs h-9 relative"
            style={{ background: "hsl(140 12% 42%)" }}
            onClick={handleRegenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
            {dirty && !generating && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full" style={{ background: "hsl(45 90% 55%)" }} />
            )}
          </Button>
        </div>

        <Separator style={{ background: "hsl(240 6% 14%)" }} />

        {/* Sage post buttons */}
        <div className="space-y-2">
          <label className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: "hsl(240 5% 50%)" }}>
            <Sparkles className="h-3 w-3" style={{ color: "hsl(140 12% 58%)" }} /> Post with Sage
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "facebook", label: "Facebook", icon: Facebook, color: "#1877F2" },
              { id: "instagram", label: "Instagram", icon: Instagram, color: "#E4405F" },
              { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
            ].map(p => (
              <Button
                key={p.id}
                size="sm"
                className="gap-1.5 text-[10px] h-7"
                style={{ background: "hsl(240 6% 10%)", color: "hsl(240 5% 60%)", border: "1px solid hsl(240 6% 18%)" }}
                onClick={() => onSagePost(p.id)}
              >
                <p.icon className="h-3 w-3" /> {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
