import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Image as ImageIcon, Palette, Pencil, Plus, Download, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SpotlightFlyerWizard from "@/components/connect/SpotlightFlyerWizard";
import SpotlightBrandSetup, { type BrandPackage } from "@/components/connect/SpotlightBrandSetup";

type ViewMode = "home" | "wizard" | "brand_setup";

/* ── Sample data shown alongside real data ── */
const SAMPLE_BRANDS: BrandPackage[] = [
  {
    id: "sample-brand-1",
    name: "Primary Brand",
    brand_name: "Apex Insurance Group",
    is_default: false,
    logo_url: null,
    brand_colors: ["#0d9488", "#115e59", "#f0fdfa"],
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
    brand_colors: ["#6366f1", "#312e81", "#eef2ff"],
    tagline: "Building Stronger Communities",
    disclaimer: null,
    industry: "Insurance",
    tone: "friendly",
  },
];

const SAMPLE_FLYERS = [
  {
    id: "sample-flyer-1",
    title: "Spring Open Enrollment Event",
    type: "event",
    status: "ready",
    created_at: "2026-03-18T10:00:00Z",
    result_image_url: null,
    _sample: true,
  },
  {
    id: "sample-flyer-2",
    title: "Commercial Insurance Awareness Week",
    type: "announcement",
    status: "ready",
    created_at: "2026-03-15T14:00:00Z",
    result_image_url: null,
    _sample: true,
  },
  {
    id: "sample-flyer-3",
    title: "Referral Program Launch",
    type: "promotion",
    status: "ready",
    created_at: "2026-03-12T09:00:00Z",
    result_image_url: null,
    _sample: true,
  },
  {
    id: "sample-flyer-4",
    title: "Hurricane Season Prep Guide",
    type: "educational",
    status: "draft",
    created_at: "2026-03-20T16:00:00Z",
    result_image_url: null,
    _sample: true,
  },
];

const TYPE_COLORS: Record<string, string> = {
  event: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  announcement: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  promotion: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  educational: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function DemoSpotlightTab() {
  const [view, setView] = useState<ViewMode>("home");
  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [realBrands, setRealBrands] = useState<BrandPackage[]>([]);
  const [editFlyerId, setEditFlyerId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<BrandPackage | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list" } });
      if (!error && data?.flyers) setRealHistory(data.flyers);
    } catch { /* silent */ }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list_brands" } });
      if (!error && data?.brands) setRealBrands(data.brands);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadHistory(); loadBrands(); }, [loadHistory, loadBrands]);

  // Merge sample + real data
  const allBrands = [...realBrands, ...SAMPLE_BRANDS.filter(sb => !realBrands.some(rb => rb.name === sb.name))];
  const allFlyers = [...realHistory, ...SAMPLE_FLYERS];

  const handleCreateFlyer = () => {
    setEditFlyerId(null);
    setView("wizard");
  };

  const handleEditFlyer = (flyerId: string) => {
    if (flyerId.startsWith("sample-")) {
      toast.info("This is a sample flyer — create a new one to get started!");
      return;
    }
    setEditFlyerId(flyerId);
    setView("wizard");
  };

  const handleBrandSaved = async () => {
    await loadBrands();
    if (view === "brand_setup" && !editBrand) {
      setEditFlyerId(null);
      setView("wizard");
    } else {
      setView("home");
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (brandId.startsWith("sample-")) {
      toast.info("Sample brand — create your own to customize!");
      return;
    }
    try {
      await supabase.functions.invoke("spotlight-flyer", { body: { action: "delete_brand", brand_id: brandId } });
      toast("Brand deleted");
      await loadBrands();
    } catch { /* silent */ }
  };

  if (view === "brand_setup") {
    return (
      <SpotlightBrandSetup
        existing={editBrand}
        onSave={handleBrandSaved}
        onCancel={() => setView("home")}
      />
    );
  }

  if (view === "wizard") {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <SpotlightFlyerWizard
            onClose={() => { setView("home"); loadHistory(); }}
            brands={realBrands.length > 0 ? realBrands : SAMPLE_BRANDS}
            editFlyerId={editFlyerId}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            AuRa Spotlight — Marketing Flyer Generator
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Turn your events and ideas into on-brand flyers and social posts with AI. Up to 20/month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2" onClick={handleCreateFlyer}>
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
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => { setEditBrand(null); setView("brand_setup"); }}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>
            <div className="space-y-1.5">
              {allBrands.map((b, idx) => {
                const isSample = b.id.startsWith("sample-");
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${200 + idx * 80}ms` }}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: b.brand_colors[0] + "22", border: `1px solid ${b.brand_colors[0]}44` }}>
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.brand_name} className="w-6 h-6 rounded object-contain" />
                      ) : (
                        <Palette className="h-3.5 w-3.5" style={{ color: b.brand_colors[0] }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{b.name}</p>
                        {b.is_default && <Badge variant="secondary" className="text-[8px] h-4">Default</Badge>}
                        {isSample && <Badge variant="outline" className="text-[8px] h-4 opacity-50">Sample</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate">{b.brand_name}</span>
                        <div className="flex gap-0.5 shrink-0">
                          {b.brand_colors.slice(0, 3).map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full border border-border" style={{ background: c }} />)}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                      if (isSample) { toast.info("Sample brand — create your own!"); return; }
                      setEditBrand(b); setView("brand_setup");
                    }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!isSample && !b.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleDeleteBrand(b.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flyer History */}
          <Separator />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Your Flyers</p>
            <div className="space-y-2">
              {allFlyers.map((f: any, idx: number) => {
                const isSample = f._sample || f.id?.startsWith("sample-");
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${400 + idx * 80}ms` }}
                  >
                    {f.result_image_url ? (
                      <img src={f.result_image_url} alt={f.title} className="w-12 h-12 rounded object-cover border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted/60 flex items-center justify-center shrink-0 border border-border">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{f.title || "Untitled"}</p>
                        {isSample && <Badge variant="outline" className="text-[8px] h-4 opacity-50">Sample</Badge>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] ${TYPE_COLORS[f.type] || ""}`}>{f.type}</Badge>
                        <Badge variant={f.status === "ready" ? "default" : f.status === "error" ? "destructive" : "secondary"} className="text-[9px]">{f.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => handleEditFlyer(f.id)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {f.result_image_url && (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => {
                          const link = document.createElement("a");
                          link.href = f.result_image_url;
                          link.download = `${f.title || "flyer"}.png`;
                          link.click();
                        }}>
                          <Download className="h-3 w-3 mr-1" /> Get
                        </Button>
                      )}
                    </div>
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
