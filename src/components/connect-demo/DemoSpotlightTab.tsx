import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Image as ImageIcon, Palette, Pencil, Plus, Download, Eye } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_BRANDS = [
  {
    id: "brand-1",
    name: "Primary Brand",
    brand_name: "Apex Insurance Group",
    is_default: true,
    logo_url: null,
    brand_colors: ["#0d9488", "#115e59", "#f0fdfa"],
    tagline: "Protection You Can Trust",
  },
  {
    id: "brand-2",
    name: "Event Brand",
    brand_name: "Apex Community Outreach",
    is_default: false,
    logo_url: null,
    brand_colors: ["#6366f1", "#312e81", "#eef2ff"],
    tagline: "Building Stronger Communities",
  },
];

const SAMPLE_FLYERS = [
  {
    id: "flyer-1",
    title: "Spring Open Enrollment Event",
    type: "event",
    status: "ready",
    created_at: "2026-03-18T10:00:00Z",
    result_image_url: null,
    description: "Join us for a free insurance review and community BBQ. Bring the family!",
  },
  {
    id: "flyer-2",
    title: "Commercial Insurance Awareness Week",
    type: "announcement",
    status: "ready",
    created_at: "2026-03-15T14:00:00Z",
    result_image_url: null,
    description: "Is your business properly covered? Free risk assessments available.",
  },
  {
    id: "flyer-3",
    title: "Referral Program Launch",
    type: "promotion",
    status: "ready",
    created_at: "2026-03-12T09:00:00Z",
    result_image_url: null,
    description: "Earn $50 for every friend you refer. No limits!",
  },
  {
    id: "flyer-4",
    title: "Hurricane Season Prep Guide",
    type: "educational",
    status: "draft",
    created_at: "2026-03-20T16:00:00Z",
    result_image_url: null,
    description: "5 steps every homeowner should take before storm season.",
  },
];

const TYPE_COLORS: Record<string, string> = {
  event: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  announcement: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  promotion: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  educational: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function DemoSpotlightTab() {
  const [selectedFlyer, setSelectedFlyer] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            AURA Spotlight — Marketing Flyer Generator
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Turn your events and ideas into on-brand flyers and social posts with AI. Up to 20/month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2" onClick={() => toast.info("Flyer wizard available in the full version")}>
            <Sparkles className="h-4 w-4" />
            Create New Flyer
          </Button>

          {/* Brand Packages */}
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Palette className="h-3 w-3" /> Brand Packages
              </p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => toast.info("Brand setup available in the full version")}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>
            <div className="space-y-1.5">
              {SAMPLE_BRANDS.map((b, idx) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${200 + idx * 80}ms` }}
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: b.brand_colors[0] + "22", border: `1px solid ${b.brand_colors[0]}44` }}>
                    <Palette className="h-3.5 w-3.5" style={{ color: b.brand_colors[0] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{b.name}</p>
                      {b.is_default && <Badge variant="secondary" className="text-[8px] h-4">Default</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground truncate">{b.brand_name}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {b.brand_colors.map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full border border-border" style={{ background: c }} />)}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toast.info("Brand editing available in the full version")}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Flyer History */}
          <Separator />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Sample Flyers</p>
            <div className="space-y-2">
              {SAMPLE_FLYERS.map((f, idx) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${400 + idx * 80}ms` }}
                >
                  <div className="w-12 h-12 rounded bg-muted/60 flex items-center justify-center shrink-0 border border-border">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[9px] ${TYPE_COLORS[f.type] || ""}`}>{f.type}</Badge>
                      <Badge variant={f.status === "ready" ? "default" : "secondary"} className="text-[9px]">{f.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    {selectedFlyer === f.id && (
                      <p className="text-[10px] text-muted-foreground mt-1 animate-fade-in">{f.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setSelectedFlyer(selectedFlyer === f.id ? null : f.id)}>
                      <Eye className="h-3 w-3 mr-1" /> {selectedFlyer === f.id ? "Hide" : "Preview"}
                    </Button>
                    {f.status === "ready" && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => toast.info("Download available in the full version")}>
                        <Download className="h-3 w-3 mr-1" /> Get
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage footer */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-muted-foreground">
              Demo mode — 4 sample flyers shown. Full version supports AI-generated images with your brand.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
