import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Image as ImageIcon, Palette, Pencil, Plus, Download, Trash2, Wand2, LayoutTemplate, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import SpotlightFlyerWizard from "@/components/connect/SpotlightFlyerWizard";
import SpotlightBrandSetup, { type BrandPackage } from "@/components/connect/SpotlightBrandSetup";
import { SPOTLIGHT_TEMPLATES } from "@/components/connect/spotlight-templates";
import { getTemplateDesign } from "@/components/connect/template-designs";
import newClientWelcomeImg from "@/assets/templates/new-client-welcome.jpg";
import renewalReminderImg from "@/assets/templates/renewal-reminder.jpg";
import eventInviteImg from "@/assets/templates/event-invite.jpg";
import riskTipImg from "@/assets/templates/risk-tip.jpg";
import referralAskImg from "@/assets/templates/referral-ask.jpg";
import seasonalPromoImg from "@/assets/templates/seasonal-promo.jpg";

// Lazy-load heavy canvas editors
const DesignEditor  = lazy(() => import("@/components/connect/DesignEditor"));
const TemplateEditor = lazy(() => import("@/components/connect/TemplateEditor"));

const TEMPLATE_IMAGES: Record<string, string> = {
  "new-client-welcome": newClientWelcomeImg,
  "renewal-reminder": renewalReminderImg,
  "event-invite": eventInviteImg,
  "risk-tip": riskTipImg,
  "referral-ask": referralAskImg,
  "seasonal-promo": seasonalPromoImg,
};

type ViewMode = "home" | "template_editor" | "design_editor" | "generate_wizard" | "brand_setup";
type HomeTab = "templates" | "generate";

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
];

const TYPE_COLORS: Record<string, string> = {
  event: "border-[hsl(140_12%_42%/0.4)] text-[hsl(140_12%_62%)] bg-[hsl(140_12%_42%/0.1)]",
  social: "border-[hsl(200_40%_50%/0.4)] text-[hsl(200_40%_65%)] bg-[hsl(200_40%_50%/0.1)]",
  promotion: "border-[hsl(35_50%_50%/0.4)] text-[hsl(35_50%_65%)] bg-[hsl(35_50%_50%/0.1)]",
  educational: "border-[hsl(260_30%_50%/0.4)] text-[hsl(260_30%_65%)] bg-[hsl(260_30%_50%/0.1)]",
  announcement: "border-[hsl(20_50%_50%/0.4)] text-[hsl(20_50%_65%)] bg-[hsl(20_50%_50%/0.1)]",
};

// ── Category filter bar for template gallery ──────────────────────────────────
const CATEGORY_FILTERS = [
  { value: "",             label: "All" },
  { value: "flyer",        label: "Flyer" },
  { value: "social",       label: "Social" },
  { value: "newsletter",   label: "Newsletter" },
  { value: "presentation", label: "Presentation" },
  { value: "poster",       label: "Poster" },
];

function TemplateCategoryFilter({ selectedType, onChange }: { selectedType: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {CATEGORY_FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
          style={{
            background: selectedType === f.value ? "hsl(140 12% 42%)" : "hsl(240 6% 14%)",
            color: selectedType === f.value ? "#fff" : "hsl(240 5% 50%)",
            border: `1px solid ${selectedType === f.value ? "hsl(140 12% 42%)" : "hsl(240 6% 22%)"}`,
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export default function DemoSpotlightTab() {
  const [view, setView] = useState<ViewMode>("home");
  const [homeTab, setHomeTab] = useState<HomeTab>("templates");
  const [designEditorProps, setDesignEditorProps] = useState<{
    templateId: string; designJson: any; width: number; height: number; title: string;
  } | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showAllCreations, setShowAllCreations] = useState(false);
  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [realBrands, setRealBrands] = useState<BrandPackage[]>([]);
  const [editFlyerId, setEditFlyerId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<BrandPackage | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("spotlight-flyer", { body: { action: "list" } });
      if (data?.flyers) setRealHistory(data.flyers.map((d: any) => ({
        id: d.id, title: d.title, type: d.type, status: d.status,
        created_at: d.created_at, result_image_url: d.result_image_url,
      })));
    } catch {}
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const { data } = await supabase.from("branding_packages").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setRealBrands(data.map(d => ({
          id: d.id, name: d.name, brand_name: d.brand_name, is_default: d.is_default,
          logo_url: d.logo_url, brand_colors: (d.brand_colors as string[]) || ["#8A9A8C", "#F5F5F0"],
          tagline: d.tagline, disclaimer: d.disclaimer, industry: d.industry, tone: d.tone,
        })));
      }
    } catch {}
  }, []);

  useEffect(() => { loadBrands(); loadHistory(); }, [loadBrands, loadHistory]);

  const allBrands = [...realBrands, ...SAMPLE_BRANDS.filter(sb => !realBrands.some(rb => rb.name === sb.name))];
  const allFlyers = [...realHistory, ...SAMPLE_FLYERS];

  const handleDeleteFlyer = async (flyerId: string) => {
    if (flyerId.startsWith("sample-")) { toast.info("Sample flyer — create your own to delete it!"); return; }
    try {
      await supabase.functions.invoke("spotlight-flyer", { body: { action: "delete_flyer", flyer_id: flyerId } });
      toast("Flyer deleted"); await loadHistory();
    } catch { toast.error("Could not delete flyer."); }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (brandId.startsWith("sample-")) { toast.info("Sample brand — create your own to customize!"); return; }
    try {
      await supabase.functions.invoke("spotlight-flyer", { body: { action: "delete_brand", brand_id: brandId } });
      toast("Brand deleted"); await loadBrands();
    } catch {}
  };

  // ── VIEW: Brand setup ──
  if (view === "brand_setup") {
    return (
      <SpotlightBrandSetup
        existing={editBrand}
        onSave={async () => { await loadBrands(); setView("home"); }}
        onCancel={() => setView("home")}
      />
    );
  }

  // ── VIEW: Full Fabric.js Design Editor (new Canva templates) ──
  if (view === "design_editor" && designEditorProps) {
    const defaultBrand = (realBrands.length > 0 ? realBrands : SAMPLE_BRANDS)[0];
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
        </div>
      }>
        <DesignEditor
          templateId={designEditorProps.templateId}
          initialDesignJson={designEditorProps.designJson}
          width={designEditorProps.width}
          height={designEditorProps.height}
          title={designEditorProps.title}
          brandColors={defaultBrand?.brand_colors}
          brandName={defaultBrand?.brand_name}
          disclaimer={defaultBrand?.disclaimer}
          onBack={() => { setView("home"); setHomeTab("templates"); }}
        />
      </Suspense>
    );
  }

  // ── VIEW: Legacy Template editor (original 6 text-based templates) ──
  if (view === "template_editor" && activeTemplateId) {
    return (
      <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
        <CardContent className="p-0">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} /></div>}>
            <TemplateEditor
              templateId={activeTemplateId}
              brands={realBrands.length > 0 ? realBrands : SAMPLE_BRANDS}
              onBack={() => { setView("home"); setHomeTab("templates"); }}
            />
          </Suspense>
        </CardContent>
      </Card>
    );
  }

  // ── VIEW: AI Generate wizard ──
  if (view === "generate_wizard") {
    return (
      <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
        <CardContent className="p-4 sm:p-6">
          <SpotlightFlyerWizard
            onClose={() => { setView("home"); setHomeTab("generate"); loadHistory(); }}
            brands={realBrands.length > 0 ? realBrands : SAMPLE_BRANDS}
            editFlyerId={editFlyerId}
            initialType={selectedType}
            demoMode
            skipTemplateGallery
          />
        </CardContent>
      </Card>
    );
  }

  // ── VIEW: Home ──
  return (
    <div className="space-y-3">

      {/* Header explainer */}
      <Card className="animate-fade-in" style={{ background: "hsl(140 12% 42% / 0.06)", borderColor: "hsl(140 12% 42% / 0.2)" }}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-semibold text-white">Create marketing content to grow your network.</p>
                <Badge className="text-[8px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30 font-semibold">Beta</Badge>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: "hsl(240 5% 56%)" }}>
                Edit ready-made templates instantly, or use AI to generate something completely custom.
                We're expanding with more templates, AI-powered image sourcing, and advanced design tools soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── MAIN TABS ── */}
      <Card className="animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: "30ms" }}>
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
          {[
            { id: "templates" as HomeTab, label: "Templates", icon: LayoutTemplate, desc: "Edit & export instantly" },
            { id: "generate" as HomeTab, label: "Generate", icon: Wand2, desc: "AI-powered custom" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setHomeTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 px-2 transition-colors relative"
              style={{
                color: homeTab === tab.id ? "white" : "hsl(240 5% 50%)",
                background: "transparent",
              }}
            >
              {homeTab === tab.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: "hsl(140 12% 50%)" }} />
              )}
              <div className="flex items-center gap-1.5">
                <tab.icon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{tab.label}</span>
              </div>
              <span className="text-[9px]" style={{ color: "hsl(240 5% 40%)" }}>{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* ── TEMPLATES TAB ── */}
        {homeTab === "templates" && (
          <CardContent className="p-3">
            {/* ── Category filter bar ── */}
            <TemplateCategoryFilter selectedType={selectedType} onChange={setSelectedType} />

            {/* ── Template card grid — 3 columns, contained cards ── */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {SPOTLIGHT_TEMPLATES
                .filter(tpl => !selectedType || tpl.category === selectedType ||
                  (selectedType === "social" && ["instagram", "facebook", "linkedin"].includes(tpl.category ?? "")))
                .map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    // Try embedded design JSON first (20 new templates)
                    const design = getTemplateDesign(tpl.id);
                    if (design) {
                      setDesignEditorProps({
                        templateId: tpl.id,
                        designJson: design.designJson,
                        width: design.width,
                        height: design.height,
                        title: tpl.name,
                      });
                      setView("design_editor");
                    } else {
                      // Legacy text editor for original 6 templates only
                      setActiveTemplateId(tpl.id);
                      setView("template_editor");
                    }
                  }}
                  className="group flex flex-col text-left cursor-pointer rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.02] hover:shadow-lg"
                  style={{ border: "1px solid hsl(240 6% 16%)", background: "hsl(240 8% 7%)" }}
                >
                  {/* ── Contained preview thumbnail ── */}
                  <div
                    className="relative w-full overflow-hidden flex items-center justify-center"
                    style={{ height: 110, background: "hsl(240 6% 11%)" }}
                  >
                    {tpl.thumbnailUrl ? (
                      <img
                        src={tpl.thumbnailUrl}
                        alt={tpl.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : TEMPLATE_IMAGES[tpl.id] ? (
                      <img
                        src={TEMPLATE_IMAGES[tpl.id]}
                        alt={tpl.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: tpl.thumbnailBg }}
                      >
                        <tpl.icon className="h-8 w-8 text-white/30" />
                      </div>
                    )}

                    {/* Category pill — top right */}
                    {tpl.category && (
                      <span
                        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide"
                        style={{ background: "rgba(0,0,0,0.70)", color: "hsl(140 12% 65%)", backdropFilter: "blur(4px)" }}
                      >
                        {tpl.category}
                      </span>
                    )}

                    {/* Hover: Edit overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex items-center justify-center">
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg"
                        style={{ background: "hsl(140 12% 42%)" }}
                      >
                        Edit
                      </span>
                    </div>
                  </div>

                  {/* ── Card footer — name + tagline ── */}
                  <div className="px-2 py-2 flex-1">
                    <p className="text-[10px] font-bold leading-tight text-white line-clamp-2">{tpl.name}</p>
                    <p className="text-[9px] leading-tight mt-0.5 line-clamp-1" style={{ color: "hsl(240 5% 45%)" }}>{tpl.tagline}</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-[9px] mt-3" style={{ color: "hsl(240 5% 35%)" }}>
              Click any template to customize text and export as PNG
            </p>
          </CardContent>
        )}

        {/* ── GENERATE TAB ── */}
        {homeTab === "generate" && (
          <CardContent className="p-3 space-y-3">
            {/* Hero CTA */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
                  <Wand2 className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">AI-Powered Generation</p>
                  <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "hsl(240 5% 52%)" }}>
                    Describe what you need in plain English — Clark builds it into a polished flyer using your brand colors and logo.
                  </p>
                </div>
              </div>
              <Button
                className="w-full gap-2 text-white text-xs h-9"
                style={{ background: "hsl(140 12% 42%)" }}
                onClick={() => { setEditFlyerId(null); setSelectedType(""); setView("generate_wizard"); }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Start Generating
              </Button>
            </div>

            {/* Generated flyer history */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: "hsl(240 5% 46%)" }}>Your Generated Flyers</p>
              <div className="space-y-1.5">
                {(showAllCreations ? allFlyers : allFlyers.slice(0, 5)).map((f: any, idx: number) => {
                  const isSample = f._sample || f.id?.startsWith("sample-");
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg animate-fade-in"
                      style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 12%)", animationDelay: `${idx * 50}ms` }}
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          if (isSample) { toast.info("This is a sample — generate your own!"); return; }
                          setEditFlyerId(f.id); setView("generate_wizard");
                        }}>
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
                        {!isSample && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteFlyer(f.id)}>
                            <Trash2 className="h-3 w-3 text-red-400/60" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {allFlyers.length > 5 && (
                <Button variant="ghost" className="w-full text-[10px] h-7 mt-1" style={{ color: "hsl(140 12% 58%)" }} onClick={() => setShowAllCreations(!showAllCreations)}>
                  {showAllCreations ? "Show less" : `View all (${allFlyers.length})`}
                </Button>
              )}
            </div>

            {/* Brand packages */}
            <Separator style={{ background: "hsl(240 6% 14%)" }} />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "hsl(240 5% 46%)" }}>
                  <Palette className="h-3 w-3" /> Brand Packages
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" style={{ color: "hsl(140 12% 58%)" }}
                  onClick={() => { setEditBrand(null); setView("brand_setup"); }}>
                  <Plus className="h-3 w-3" /> New
                </Button>
              </div>
              <div className="space-y-1">
                {allBrands.map((b) => {
                  const isSample = b.id.startsWith("sample-");
                  return (
                    <div key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 12%)" }}>
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
        )}
      </Card>
    </div>
  );
}
