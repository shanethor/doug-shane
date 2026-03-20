import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Image as ImageIcon, Palette, Pencil, Trash2, Plus } from "lucide-react";
import SpotlightFlyerWizard from "./SpotlightFlyerWizard";
import SpotlightBrandSetup, { type BrandPackage } from "./SpotlightBrandSetup";

type ViewMode = "home" | "wizard" | "brand_setup";

export default function ConnectSpotlightTab() {
  const [view, setView] = useState<ViewMode>("home");
  const [history, setHistory] = useState<any[]>([]);
  const [brands, setBrands] = useState<BrandPackage[]>([]);
  const [editFlyerId, setEditFlyerId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<BrandPackage | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list" } });
      if (!error && data?.flyers) setHistory(data.flyers);
    } catch { /* silent */ }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list_brands" } });
      if (!error && data?.brands) setBrands(data.brands);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadHistory(); loadBrands(); }, [loadHistory, loadBrands]);

  const handleCreateFlyer = () => {
    // If no brands exist, force brand setup first
    if (brands.length === 0) {
      setEditBrand(null);
      setView("brand_setup");
      return;
    }
    setEditFlyerId(null);
    setView("wizard");
  };

  const handleEditFlyer = (flyerId: string) => {
    setEditFlyerId(flyerId);
    setView("wizard");
  };

  const handleDeleteBrand = async (brandId: string) => {
    try {
      await supabase.functions.invoke("spotlight-flyer", { body: { action: "delete_brand", brand_id: brandId } });
      toast("Brand deleted");
      await loadBrands();
    } catch { /* silent */ }
  };

  const handleBrandSaved = async (brand: BrandPackage) => {
    await loadBrands();
    // If this was forced by "Create Flyer" with no brands, go to wizard
    if (view === "brand_setup" && !editBrand) {
      setEditFlyerId(null);
      setView("wizard");
    } else {
      setView("home");
    }
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
            brands={brands}
            editFlyerId={editFlyerId}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
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
            {brands.length === 0 ? (
              <div className="text-center py-4 rounded-lg bg-muted/20 border border-dashed">
                <Palette className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">No brand packages yet.</p>
                <p className="text-[10px] text-muted-foreground">Create one to get started with flyers.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {brands.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.brand_name} className="w-8 h-8 rounded object-contain border bg-white p-0.5 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{b.name}</p>
                        {b.is_default && <Badge variant="secondary" className="text-[8px] h-4">Default</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate">{b.brand_name}</span>
                        <div className="flex gap-0.5 shrink-0">
                          {b.brand_colors.slice(0, 3).map((c, i) => <div key={i} className="w-2 h-2 rounded-full border" style={{ background: c }} />)}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditBrand(b); setView("brand_setup"); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!b.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleDeleteBrand(b.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Flyer History */}
          {history.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Your Flyers</p>
                <div className="space-y-2">
                  {history.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      {f.result_image_url ? (
                        <img src={f.result_image_url} alt={f.title} className="w-12 h-12 rounded object-cover border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.title || "Untitled"}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{f.type}</Badge>
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
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Need toast import
import { toast } from "sonner";
