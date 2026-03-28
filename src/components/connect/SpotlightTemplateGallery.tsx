import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Pencil } from "lucide-react";
import { SPOTLIGHT_TEMPLATES, type SpotlightTemplate } from "./spotlight-templates";

const FLYER_TYPE_LABELS: Record<string, string> = {
  event: "Event Flyer",
  social: "Social Post",
  announcement: "Announcement",
  educational: "Educational",
  promotion: "Promotion",
  custom: "Custom",
};

interface Props {
  onSelectTemplate: (template: SpotlightTemplate) => void;
  onStartFromScratch: () => void;
}

export default function SpotlightTemplateGallery({ onSelectTemplate, onStartFromScratch }: Props) {
  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h3 className="text-sm font-semibold text-white flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
          Start with a template or describe your own
        </h3>
        <p className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>
          Pick a template to pre-fill your creation, or start from scratch.
        </p>
      </div>

      <div
        className="grid justify-center gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(104px, 124px))" }}
      >
        {SPOTLIGHT_TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTemplate(t)}
              className="group relative rounded-lg p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              style={{
                background: t.thumbnailBg,
                border: "1px solid transparent",
              }}
            >
              <div className="absolute inset-0 rounded-lg bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative space-y-1.5">
                <Icon className="h-5 w-5 text-white/90" />
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">{t.name}</p>
                  <p className="text-[9px] text-white/70 mt-0.5 leading-tight">{t.tagline}</p>
                </div>
                <Badge className="text-[7px] bg-white/20 text-white border-white/20 hover:bg-white/30 px-1.5 py-0">
                  {FLYER_TYPE_LABELS[t.contentType] || t.contentType}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <Separator style={{ background: "hsl(240 6% 14%)" }} />

      <Button
        variant="outline"
        className="w-full gap-2 text-xs h-9"
        style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)", background: "transparent" }}
        onClick={onStartFromScratch}
      >
        <Pencil className="h-3.5 w-3.5" />
        Start from scratch — describe your own
      </Button>
    </div>
  );
}
