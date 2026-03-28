import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Image as ImageIcon, Palette, Pencil, Trash2, Plus, Heart, RefreshCw, UserPlus, Lightbulb, Calendar, Zap, Loader2, Layout } from "lucide-react";
import SpotlightFlyerWizard from "./SpotlightFlyerWizard";
import SpotlightBrandSetup, { type BrandPackage } from "./SpotlightBrandSetup";
import templateSeasonalPromo from "@/assets/templates/seasonal-promo.jpg";
import templateEventInvite from "@/assets/templates/event-invite.jpg";
import templateRiskTip from "@/assets/templates/risk-tip.jpg";
import templateReferralAsk from "@/assets/templates/referral-ask.jpg";
import templateRenewalReminder from "@/assets/templates/renewal-reminder.jpg";
import templateNewClientWelcome from "@/assets/templates/new-client-welcome.jpg";

// Lazy-load fabric-based editor so it doesn't block Lovable HMR
const DesignEditor = lazy(() => import("./DesignEditor"));

type ViewMode = "home" | "wizard" | "brand_setup" | "editor";

interface FeaturedTemplate {
  id: string;
  name: string;
  description: string;
  contentType: string;
  icon: typeof Heart;
  accentColor: string;
  preview: string | null;
  defaultTitle: string;
  defaultBody: string;
}

const FEATURED_TEMPLATES: FeaturedTemplate[] = [
  {
    id: "referral-ask",
    name: "Referral Ask",
    description: "Turn your network into your pipeline",
    contentType: "social",
    icon: Heart,
    accentColor: "hsl(340 60% 45%)",
    preview: templateReferralAsk,
    defaultTitle: "Your Referral Means the World",
    defaultBody: "I help individuals, families, and businesses get the right coverage. Quick, no-pressure conversations — I do the heavy lifting. Your referral means the world to my practice.",
  },
  {
    id: "renewal-reminder",
    name: "Renewal Reminder",
    description: "Keep clients before someone else does",
    contentType: "announcement",
    icon: RefreshCw,
    accentColor: "hsl(200 60% 42%)",
    preview: templateRenewalReminder,
    defaultTitle: "It's Renewal Season — Let's Review Your Coverage",
    defaultBody: "Coverage needs change — annual reviews catch gaps. Rate shopping across carriers to get you the best value. Renewals processed quickly with minimal paperwork.",
  },
  {
    id: "new-client-welcome",
    name: "New Client Welcome",
    description: "Celebrate the relationship from day one",
    contentType: "announcement",
    icon: UserPlus,
    accentColor: "hsl(140 40% 38%)",
    preview: templateNewClientWelcome,
    defaultTitle: "Welcome Aboard — We're Proud to Protect You",
    defaultBody: "Proud to protect another client and their family. You can count on us for fast answers and real advocacy. Coverage questions? We are always one call away.",
  },
  {
    id: "risk-tip",
    name: "Risk Tip of the Week",
    description: "Educate your audience, build authority",
    contentType: "educational",
    icon: Lightbulb,
    accentColor: "hsl(45 70% 45%)",
    preview: templateRiskTip,
    defaultTitle: "Risk Tip: Is Your Cyber Coverage Enough?",
    defaultBody: "Most business owners underestimate their cyber exposure. One data breach can cost more than your annual premium. Cyber liability insurance covers breach response costs.",
  },
  {
    id: "event-invite",
    name: "Event Invite",
    description: "Fill your next seminar, lunch, or mixer",
    contentType: "event",
    icon: Calendar,
    accentColor: "hsl(270 45% 45%)",
    preview: templateEventInvite,
    defaultTitle: "You're Invited — Business Networking Event",
    defaultBody: "Connect with local business owners and professionals. Learn actionable strategies to protect your business. Complimentary lunch and refreshments provided.",
  },
  {
    id: "seasonal-promo",
    name: "Seasonal Promotion",
    description: "Drive urgency with a timely offer",
    contentType: "promotion",
    icon: Zap,
    accentColor: "hsl(15 70% 48%)",
    preview: templateSeasonalPromo,
    defaultTitle: "Limited Time — Lock In Your Rate Today",
    defaultBody: "Rates are competitive right now — lock yours in before they change. Quick 15-minute review could save you hundreds. New carrier options available for your industry.",
  },
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
      <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} /></div>}>
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
      </Suspense>
    );
  }

  const handleTemplateCardClick = (template: FeaturedTemplate) => {
    if (brands.length === 0) {
      setEditBrand(null);
      setView("brand_setup");
      return;
    }
    setEditFlyerId(null);
    setInitialType(template.contentType);
    setSkipTemplateGallery(true);
    setView("wizard");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Featured Templates */}
      <Card className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-warning" />
              Templates
            </CardTitle>
            <button
              onClick={() => {
                setEditFlyerId(null);
                setInitialType(undefined);
                setSkipTemplateGallery(false);
                if (brands.length === 0) { setEditBrand(null); setView("brand_setup"); }
                else setView("wizard");
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Start from scratch
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pick a template to customize with AI, or start from scratch.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-2">
            {FEATURED_TEMPLATES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTemplateCardClick(t)}
                  className="group text-left rounded-lg overflow-hidden border border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all hover:shadow-md cursor-pointer"
                >
                  {/* Preview image */}
                  <div className="relative">
                    <AspectRatio ratio={3 / 2}>
                      {t.preview ? (
                        <img src={t.preview} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: t.accentColor }}>
                          <Icon className="h-6 w-6 text-white/60" />
                        </div>
                      )}
                    </AspectRatio>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full border border-white/30">
                        Use Template
                      </span>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="p-1.5 flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: t.accentColor }}>
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate leading-tight">{t.name}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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
      <Card className="animate-fade-in" style={{ animationDelay: "320ms" }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Your Designs</CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleCreateFlyer}>
              <Plus className="h-3 w-3" /> New Creation
            </Button>
          </div>
        </CardHeader>
        {creations.length > 0 ? (
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
        ) : (
          <CardContent>
            <div className="text-center py-6 rounded-lg bg-muted/20 border border-dashed">
              <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">No designs yet.</p>
              <p className="text-[10px] text-muted-foreground/60">Pick a template above or create from scratch.</p>
            </div>
          </CardContent>
        )}
      </Card>

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
