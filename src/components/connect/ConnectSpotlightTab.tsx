import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Image as ImageIcon, Palette, Pencil, Trash2, Plus, Heart, RefreshCw, UserPlus, Lightbulb, Calendar, Zap, Loader2, Layout } from "lucide-react";
import SpotlightFlyerWizard from "./SpotlightFlyerWizard";
import SpotlightBrandSetup, { type BrandPackage } from "./SpotlightBrandSetup";
import DesignEditor from "./DesignEditor";

type ViewMode = "home" | "wizard" | "brand_setup" | "editor";

const CONTENT_TYPE_TILES = [
  { value: "event", label: "Event Flyer", icon: Calendar, color: "hsl(270 45% 45%)" },
  { value: "social", label: "Social Post", icon: Heart, color: "hsl(340 60% 45%)" },
  { value: "announcement", label: "Announcement", icon: RefreshCw, color: "hsl(200 60% 42%)" },
  { value: "educational", label: "Educational", icon: Lightbulb, color: "hsl(45 70% 45%)" },
  { value: "promotion", label: "Promotion", icon: Zap, color: "hsl(15 70% 48%)" },
  { value: "custom", label: "Custom", icon: Pencil, color: "hsl(240 10% 45%)" },
];

interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_width: number;
  base_height: number;
  design_json: any;
  is_default: boolean;
}

interface DesignCreation {
  id: string;
  title: string;
  template_id: string | null;
  design_json: any;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export default function ConnectSpotlightTab() {
  const [view, setView] = useState<ViewMode>("home");
  const [history, setHistory] = useState<any[]>([]);
  const [brands, setBrands] = useState<BrandPackage[]>([]);
  const [editFlyerId, setEditFlyerId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<BrandPackage | null>(null);
  const [initialType, setInitialType] = useState<string | undefined>(undefined);
  const [skipTemplateGallery, setSkipTemplateGallery] = useState(false);

  // Template / Editor state
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [creations, setCreations] = useState<DesignCreation[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editorProps, setEditorProps] = useState<{
    creationId?: string; templateId?: string; designJson?: any;
    width?: number; height?: number; title?: string;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list" } });
      if (!error && data?.flyers) {
        const sorted = [...data.flyers].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHistory(sorted);
      }
    } catch { /* silent */ }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list_brands" } });
      if (!error && data?.brands) setBrands(data.brands);
    } catch { /* silent */ }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const { data } = await supabase.from("design_templates" as any).select("*").order("name");
    setTemplates((data as any as DesignTemplate[]) || []);
    setLoadingTemplates(false);
  }, []);

  const loadCreations = useCallback(async () => {
    const { data } = await supabase.from("design_creations" as any)
      .select("*").order("updated_at", { ascending: false });
    setCreations((data as any as DesignCreation[]) || []);
  }, []);

  useEffect(() => { loadHistory(); loadBrands(); loadTemplates(); loadCreations(); }, [loadHistory, loadBrands, loadTemplates, loadCreations]);

  const defaultBrand = brands.find(b => b.is_default) || brands[0];

  const handleCreateFlyer = () => {
    if (brands.length === 0) {
      setEditBrand(null);
      setView("brand_setup");
      return;
    }
    setEditFlyerId(null);
    setInitialType(undefined);
    setSkipTemplateGallery(false);
    setView("wizard");
  };

  const handleTypeTileClick = (type: string) => {
    if (brands.length === 0) {
      setEditBrand(null);
      setView("brand_setup");
      return;
    }
    setEditFlyerId(null);
    setInitialType(type);
    setSkipTemplateGallery(true);
    setView("wizard");
  };

  const handleEditFlyer = (flyerId: string) => {
    setEditFlyerId(flyerId);
    setInitialType(undefined);
    setSkipTemplateGallery(true);
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
    if (view === "brand_setup" && !editBrand) {
      setEditFlyerId(null);
      setView("wizard");
    } else {
      setView("home");
    }
  };

  const openTemplateInEditor = (template: DesignTemplate) => {
    setEditorProps({
      templateId: template.id,
      designJson: template.design_json,
      width: template.base_width,
      height: template.base_height,
      title: template.name,
    });
    setView("editor");
  };

  const openCreationInEditor = (creation: DesignCreation) => {
    setEditorProps({
      creationId: creation.id,
      templateId: creation.template_id || undefined,
      designJson: creation.design_json,
      width: creation.width,
      height: creation.height,
      title: creation.title,
    });
    setView("editor");
  };

  const deleteCreation = async (id: string) => {
    await supabase.from("design_creations" as any).delete().eq("id", id);
    setCreations(prev => prev.filter(c => c.id !== id));
    toast("Creation deleted");
  };

  const openBlankEditor = () => {
    setEditorProps({
      designJson: { version: "1.0", objects: [{ type: "rect", left: 0, top: 0, width: 1080, height: 1080, fill: "#ffffff", selectable: false }] },
      width: 1080, height: 1080, title: "Custom Design",
    });
    setView("editor");
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
            onClose={() => { setView("home"); loadHistory(); setInitialType(undefined); setSkipTemplateGallery(false); }}
            brands={brands}
            editFlyerId={editFlyerId}
            initialType={initialType}
            skipTemplateGallery={skipTemplateGallery}
          />
        </CardContent>
      </Card>
    );
  }

  if (view === "editor" && editorProps) {
    return (
      <DesignEditor
        creationId={editorProps.creationId}
        templateId={editorProps.templateId}
        initialDesignJson={editorProps.designJson}
        width={editorProps.width}
        height={editorProps.height}
        title={editorProps.title}
        brandColors={defaultBrand?.brand_colors}
        brandName={defaultBrand?.brand_name}
        disclaimer={defaultBrand?.disclaimer}
        onBack={() => { setView("home"); loadCreations(); }}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* AI Flyer Generator */}
      <Card className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            AI Flyer Generator
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Describe what you need and AI will generate it. Up to 20/month.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full gap-2" onClick={handleCreateFlyer}>
            <Sparkles className="h-4 w-4" /> Generate with AI
          </Button>
          <div className="grid grid-cols-3 gap-2">
            {CONTENT_TYPE_TILES.map(tile => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.value}
                  onClick={() => handleTypeTileClick(tile.value)}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all hover:scale-[1.02] cursor-pointer bg-muted/30 border border-border/50 hover:border-border"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors group-hover:opacity-90" style={{ background: tile.color }}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{tile.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Editable Templates */}
      <Card className="animate-fade-in" style={{ animationDelay: "160ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layout className="h-4 w-4 text-primary" />
            Editable Templates
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Pick a template and customize it in the visual editor — Canva-style.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingTemplates ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No templates available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => openTemplateInEditor(t)}
                  className="group text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all"
                >
                  <div className="w-full aspect-square rounded bg-muted/50 flex items-center justify-center mb-2 overflow-hidden">
                    <div className="text-[8px] text-muted-foreground/50 text-center px-2">
                      {t.base_width}×{t.base_height}
                    </div>
                  </div>
                  <p className="text-xs font-medium truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.description || t.category}</p>
                </button>
              ))}
              <button
                onClick={openBlankEditor}
                className="group text-left p-3 rounded-lg border border-dashed border-border/50 hover:border-primary/50 bg-muted/10 hover:bg-muted/30 transition-all"
              >
                <div className="w-full aspect-square rounded flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Start from Scratch</p>
                <p className="text-[10px] text-muted-foreground/60">Blank 1080×1080 canvas</p>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Packages */}
      <Card className="animate-fade-in" style={{ animationDelay: "240ms" }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" /> Brand Packages
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => { setEditBrand(null); setView("brand_setup"); }}>
              <Plus className="h-3 w-3" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <div className="text-center py-4 rounded-lg bg-muted/20 border border-dashed">
              <Palette className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">No brand packages yet.</p>
              <p className="text-[10px] text-muted-foreground">Create one to get started.</p>
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
        </CardContent>
      </Card>

      {/* Your Creations (Editor-based) */}
      {creations.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: "320ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Your Designs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {creations.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 text-[9px] text-muted-foreground">
                  {c.width}×{c.height}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Edited {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => openCreationInEditor(c)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive" onClick={() => deleteCreation(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI-Generated Flyer History */}
      {history.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: "400ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">AI-Generated Flyers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
