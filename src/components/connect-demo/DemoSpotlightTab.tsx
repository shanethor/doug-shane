import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Image as ImageIcon, Palette, Pencil, Plus, Download, Trash2,
  CalendarDays, Share2, BookOpen, Megaphone, FileImage, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import SpotlightFlyerWizard from "@/components/connect/SpotlightFlyerWizard";
import SpotlightBrandSetup, { type BrandPackage } from "@/components/connect/SpotlightBrandSetup";

type ViewMode = "home" | "wizard" | "brand_setup";

const SAMPLE_BRANDS: BrandPackage[] = [
  {
    id: "sample-brand-1",
    name: "Primary Brand",
    brand_name: "Apex Insurance Group",
    is_default: false,
    logo_url: null,
    brand_colors: ["#8A9A8C", "#5a6a5c", "#F5F5F0"],
    tagline: "Protection You Can Trust",
    disclaimer: null,
    industry: "Insurance",
    tone: "professional",
  },
  {
    id: "sample-brand-2",
    name: "Event Brand",
    brand_name: "Apex Community Outreach",
    is_default: false,
    logo_url: null,
    brand_colors: ["#6b8f71", "#3d5a40", "#e8f0e9"],
    tagline: "Building Stronger Communities",
    disclaimer: null,
    industry: "Insurance",
    tone: "friendly",
  },
];

const SAMPLE_FLYERS = [
  { id: "sample-flyer-1", title: "Spring Open Enrollment Event", type: "event", status: "ready", created_at: "2026-03-18T10:00:00Z", result_image_url: null, _sample: true },
  { id: "sample-flyer-2", title: "5 Tips for Commercial Coverage", type: "social", status: "ready", created_at: "2026-03-15T14:00:00Z", result_image_url: null, _sample: true },
  { id: "sample-flyer-3", title: "Referral Program Launch", type: "promotion", status: "ready", created_at: "2026-03-12T09:00:00Z", result_image_url: null, _sample: true },
  { id: "sample-flyer-4", title: "Hurricane Season Prep Guide", type: "educational", status: "draft", created_at: "2026-03-20T16:00:00Z", result_image_url: null, _sample: true },
];

const TYPE_COLORS: Record<string, string> = {
  event: "border-[hsl(140_12%_42%/0.4)] text-[hsl(140_12%_62%)] bg-[hsl(140_12%_42%/0.1)]",
  social: "border-[hsl(200_40%_50%/0.4)] text-[hsl(200_40%_65%)] bg-[hsl(200_40%_50%/0.1)]",
  promotion: "border-[hsl(35_50%_50%/0.4)] text-[hsl(35_50%_65%)] bg-[hsl(35_50%_50%/0.1)]",
  educational: "border-[hsl(260_30%_50%/0.4)] text-[hsl(260_30%_65%)] bg-[hsl(260_30%_50%/0.1)]",
  announcement: "border-[hsl(20_50%_50%/0.4)] text-[hsl(20_50%_65%)] bg-[hsl(20_50%_50%/0.1)]",
};

const CONTENT_TYPES = [
  { icon: CalendarDays, label: "Event Flyer", desc: "Invitations & event promos", type: "event" },
  { icon: Share2, label: "Social Post", desc: "Graphics for social media", type: "social" },
  { icon: Megaphone, label: "Announcement", desc: "News & updates", type: "announcement" },
  { icon: BookOpen, label: "Educational", desc: "Tips, guides & infographics", type: "educational" },
  { icon: FileImage, label: "Promotion", desc: "Offers & referral programs", type: "promotion" },
  { icon: LayoutGrid, label: "Custom", desc: "Describe anything you need", type: "custom" },
];

export default function DemoSpotlightTab() {
  const [view, setView] = useState<ViewMode>("home");
  const [showAllCreations, setShowAllCreations] = useState(false);
  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [realBrands, setRealBrands] = useState<BrandPackage[]>([]);
  const [editFlyerId, setEditFlyerId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<BrandPackage | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await supabase.from("generated_forms").select("*").order("created_at", { ascending: false }).limit(20);
      if (data) setRealHistory(data.map(d => ({ id: d.id, title: d.display_name, type: d.form_type, status: "ready", created_at: d.created_at, result_image_url: null })));
    } catch {}
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const { data } = await supabase.from("branding_packages").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setRealBrands(data.map(d => ({
          id: d.id,
          name: d.name,
          brand_name: d.brand_name,
          is_default: d.is_default,
          logo_url: d.logo_url,
          brand_colors: (d.brand_colors as string[]) || ["#8A9A8C", "#F5F5F0"],
          tagline: d.tagline,
          disclaimer: d.disclaimer,
          industry: d.industry,
          tone: d.tone,
        })));
      }
    } catch {}
  }, []);

  useEffect(() => { loadBrands(); loadHistory(); }, [loadBrands, loadHistory]);

  const allBrands = [...realBrands, ...SAMPLE_BRANDS.filter(sb => !realBrands.some(rb => rb.name === sb.name))];
  const allFlyers = [...realHistory, ...SAMPLE_FLYERS];

  const handleCreateFlyer = (type?: string) => { setEditFlyerId(null); setSelectedType(type || ""); setView("wizard"); };

  const handleEditFlyer = (flyerId: string) => {
    if (flyerId.startsWith("sample-")) { toast.info("This is a sample — create a new one to get started!"); return; }
    setEditFlyerId(flyerId); setView("wizard");
  };

  const handleBrandSaved = async () => {
    await loadBrands();
    if (view === "brand_setup" && !editBrand) { setEditFlyerId(null); setView("wizard"); } else { setView("home"); }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (brandId.startsWith("sample-")) { toast.info("Sample brand — create your own to customize!"); return; }
    try {
      await supabase.functions.invoke("spotlight-flyer", { body: { action: "delete_brand", brand_id: brandId } });
      toast("Brand deleted"); await loadBrands();
    } catch { /* silent */ }
  };

  if (view === "brand_setup") {
    return <SpotlightBrandSetup existing={editBrand} onSave={handleBrandSaved} onCancel={() => setView("home")} />;
  }

  if (view === "wizard") {
    return (
      <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
        <CardContent className="p-4 sm:p-6">
          <SpotlightFlyerWizard
            onClose={() => { setView("home"); loadHistory(); }}
            brands={realBrands.length > 0 ? realBrands : SAMPLE_BRANDS}
            editFlyerId={editFlyerId}
            initialType={selectedType}
            demoMode
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <Card className="animate-fade-in" style={{ background: "hsl(140 12% 42% / 0.06)", borderColor: "hsl(140 12% 42% / 0.2)" }}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-0.5">Create marketing content to grow your network.</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "hsl(240 5% 56%)" }}>
                Event flyers, social media graphics, announcements, educational content & more — all on-brand in seconds.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Grid */}
      <Card className="animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: "40ms" }}>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>
            What do you want to create?
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-1.5">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => handleCreateFlyer(ct.type)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors text-center"
                style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "hsl(140 12% 42% / 0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "hsl(240 6% 14%)"; }}
              >
                <ct.icon className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
                <span className="text-[10px] font-medium text-white leading-tight">{ct.label}</span>
                <span className="text-[8px] leading-tight" style={{ color: "hsl(240 5% 46%)" }}>{ct.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Creations */}
      <Card className="animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: "80ms" }}>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-2 text-white">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} />
            Your Creations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <Button className="w-full gap-2 text-white text-xs h-9" style={{ background: "hsl(140 12% 42%)" }} onClick={() => handleCreateFlyer()}>
            <Plus className="h-3.5 w-3.5" /> New Creation
          </Button>

          {/* Flyer History */}
          <div className="space-y-1.5">
            {allFlyers.map((f: any, idx: number) => {
              const isSample = f._sample || f.id?.startsWith("sample-");
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg transition-colors animate-fade-in"
                  style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 12%)", animationDelay: `${120 + idx * 60}ms` }}
                >
                  {f.result_image_url ? (
                    <img src={f.result_image_url} alt={f.title} className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: "hsl(240 6% 5%)", border: "1px solid hsl(240 6% 14%)" }}>
                      <ImageIcon className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 40%)" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] font-medium truncate text-white">{f.title || "Untitled"}</p>
                      {isSample && <Badge className="text-[7px] h-3.5 px-1" style={{ background: "transparent", color: "hsl(240 5% 44%)", border: "1px solid hsl(240 6% 18%)" }}>Sample</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[8px] h-4 px-1 ${TYPE_COLORS[f.type] || ""}`}>{f.type}</Badge>
                      <span className="text-[9px]" style={{ color: "hsl(240 5% 44%)" }}>{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditFlyer(f.id)}>
                      <Pencil className="h-3 w-3" style={{ color: "hsl(240 5% 56%)" }} />
                    </Button>
                    {f.result_image_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const link = document.createElement("a");
                        link.href = f.result_image_url;
                        link.download = `${f.title || "flyer"}.png`;
                        link.click();
                      }}>
                        <Download className="h-3 w-3" style={{ color: "hsl(240 5% 56%)" }} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Brand Packages */}
          <Separator style={{ background: "hsl(240 6% 14%)" }} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: "hsl(240 5% 50%)" }}>
                <Palette className="h-3 w-3" /> Brand Packages
              </p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" style={{ color: "hsl(140 12% 58%)" }} onClick={() => { setEditBrand(null); setView("brand_setup"); }}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>
            <div className="space-y-1">
              {allBrands.map((b, idx) => {
                const isSample = b.id.startsWith("sample-");
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg transition-colors animate-fade-in"
                    style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 12%)", animationDelay: `${200 + idx * 60}ms` }}
                  >
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: b.brand_colors[0] + "18", border: `1px solid ${b.brand_colors[0]}33` }}>
                      <Palette className="h-3 w-3" style={{ color: b.brand_colors[0] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] font-medium truncate text-white">{b.name}</p>
                        {isSample && <Badge className="text-[7px] h-3.5 px-1" style={{ background: "transparent", color: "hsl(240 5% 44%)", border: "1px solid hsl(240 6% 18%)" }}>Sample</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] truncate" style={{ color: "hsl(240 5% 46%)" }}>{b.brand_name}</span>
                        <div className="flex gap-0.5 shrink-0">
                          {b.brand_colors.slice(0, 3).map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />)}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                      if (isSample) { toast.info("Sample brand — create your own!"); return; }
                      setEditBrand(b); setView("brand_setup");
                    }}>
                      <Pencil className="h-3 w-3" style={{ color: "hsl(240 5% 56%)" }} />
                    </Button>
                    {!isSample && !b.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDeleteBrand(b.id)}>
                        <Trash2 className="h-3 w-3 text-red-400/60" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
