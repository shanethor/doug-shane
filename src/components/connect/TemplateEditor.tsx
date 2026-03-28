import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Plus, X, Sparkles, Loader2,
  Palette, Upload, Type, RefreshCw, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SPOTLIGHT_TEMPLATES } from "./spotlight-templates";
import type { BrandPackage } from "./SpotlightBrandSetup";

// Layouts
import ReferralAskLayout from "./template-layouts/ReferralAskLayout";
import RenewalReminderLayout from "./template-layouts/RenewalReminderLayout";
import NewClientWelcomeLayout from "./template-layouts/NewClientWelcomeLayout";
import RiskTipLayout from "./template-layouts/RiskTipLayout";
import EventInviteLayout from "./template-layouts/EventInviteLayout";
import SeasonalPromoLayout from "./template-layouts/SeasonalPromoLayout";

export interface TemplateCanvasData {
  title: string;
  bullets: string[];
  cta: string;
  disclaimer: string;
  brandName: string;
  logoUrl: string;
  colors: string[];
  dateTime?: string;
  location?: string;
}

export interface TemplateCanvasProps {
  data: TemplateCanvasData;
  onFieldClick: (field: string) => void;
  activeField: string | null;
}

const LAYOUT_MAP: Record<string, React.ComponentType<TemplateCanvasProps>> = {
  "referral-ask": ReferralAskLayout,
  "renewal-reminder": RenewalReminderLayout,
  "new-client-welcome": NewClientWelcomeLayout,
  "risk-tip": RiskTipLayout,
  "event-invite": EventInviteLayout,
  "seasonal-promo": SeasonalPromoLayout,
};

const PRESET_PALETTES = [
  ["#8A9A8C", "#5a6a5c", "#F5F5F0"],
  ["#1a3a5c", "#c9a24b", "#e8f0f5"],
  ["#2d6a4f", "#40916c", "#e8f5e9"],
  ["#0f1f3d", "#f0b429", "#e8ecf5"],
  ["#3d1a6e", "#a78bfa", "#f0c040"],
  ["#1a1a1a", "#ea580c", "#fff7ed"],
  ["#1e3a5f", "#4a9eff", "#ffffff"],
  ["#4a1942", "#e040fb", "#fce4ec"],
];

interface Props {
  templateId: string;
  brands: BrandPackage[];
  onBack: () => void;
}

export default function TemplateEditor({ templateId, brands, onBack }: Props) {
  const template = SPOTLIGHT_TEMPLATES.find(t => t.id === templateId)!;
  const defaultBrand = brands.find(b => b.is_default) || brands[0];

  const [data, setData] = useState<TemplateCanvasData>({
    title: template.title,
    bullets: [...template.bullets],
    cta: template.cta,
    disclaimer: template.disclaimer,
    brandName: defaultBrand?.brand_name || "",
    logoUrl: defaultBrand?.logo_url || "",
    colors: defaultBrand?.brand_colors?.slice(0, 3) || PRESET_PALETTES[0],
    dateTime: "",
    location: "",
  });

  const [activeField, setActiveField] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"text" | "brand" | "sage">("text");
  const [sagePrompt, setSagePrompt] = useState("");
  const [sageLoading, setSageLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const Layout = LAYOUT_MAP[templateId] || ReferralAskLayout;

  const update = useCallback((patch: Partial<TemplateCanvasData>) => {
    setData(d => ({ ...d, ...patch }));
  }, []);

  const updateBullet = (i: number, val: string) => {
    const b = [...data.bullets]; b[i] = val; update({ bullets: b });
  };
  const removeBullet = (i: number) => {
    update({ bullets: data.bullets.filter((_, idx) => idx !== i) });
  };
  const addBullet = () => {
    if (data.bullets.length >= 6) return;
    update({ bullets: [...data.bullets, ""] });
  };

  // Parse which field is active for the edit panel
  const activeBulletIndex = activeField?.startsWith("bullet-") ? parseInt(activeField.split("-")[1]) : -1;

  // Sage AI edit
  const handleSageEdit = async () => {
    if (!sagePrompt.trim()) return;
    setSageLoading(true);
    try {
      const { data: res } = await supabase.functions.invoke("spotlight-flyer", {
        body: {
          action: "demo_enrich",
          raw_prompt: sagePrompt,
          title: data.title,
          bullets: data.bullets,
          cta: data.cta,
          disclaimer: data.disclaimer,
          type: template.contentType,
        },
      });
      const e = res?.enrichment;
      if (e) {
        if (e.title) update({ title: e.title });
        if (e.bullets?.length) update({ bullets: e.bullets });
        if (e.cta) update({ cta: e.cta });
        toast.success("Sage updated your template");
      }
    } catch {
      toast.error("Sage couldn't update the template right now");
    } finally {
      setSageLoading(false);
      setSagePrompt("");
    }
  };

  // Export to PNG via html2canvas
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      // Dynamically import html2canvas to keep initial bundle lean
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${template.name.replace(/\s+/g, "-").toLowerCase()}-aura.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Downloaded!");
    } catch {
      toast.error("Export failed — try again");
    } finally {
      setExporting(false);
    }
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => update({ logoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const darkInput: React.CSSProperties = { background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "hsl(240 5% 55%)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = "hsl(240 5% 55%)")}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Templates
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white">{template.name}</span>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-white text-xs h-8"
          style={{ background: "hsl(140 12% 42%)" }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export PNG
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-0">
        {/* LEFT — Canvas preview */}
        <div className="lg:w-[55%] flex flex-col items-center justify-start p-4 overflow-y-auto" style={{ background: "hsl(240 6% 6%)" }}>
          <div className="w-full max-w-[360px]">
            {/* Click-to-edit hint */}
            <p className="text-center text-[9px] mb-2.5" style={{ color: "hsl(240 5% 40%)" }}>
              Click any text on the card to edit it
            </p>
            <div
              ref={canvasRef}
              className="w-full rounded-2xl overflow-hidden shadow-2xl"
              onClick={() => setActiveField(null)}
              style={{ cursor: "default" }}
            >
              <Layout data={data} onFieldClick={(f) => { setActiveField(f); setActivePanel("text"); }} activeField={activeField} />
            </div>
          </div>
        </div>

        {/* RIGHT — Edit panel */}
        <div className="lg:w-[45%] flex flex-col" style={{ borderLeft: "1px solid hsl(240 6% 14%)" }}>
          {/* Panel tabs */}
          <div className="flex shrink-0" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
            {[
              { id: "text", label: "Text", icon: Type },
              { id: "brand", label: "Brand", icon: Palette },
              { id: "sage", label: "Sage AI", icon: Sparkles },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as any)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors"
                style={{
                  color: activePanel === tab.id ? "white" : "hsl(240 5% 50%)",
                  borderBottom: activePanel === tab.id ? "2px solid hsl(140 12% 50%)" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── TEXT PANEL ── */}
            {activePanel === "text" && (
              <>
                {/* Active field focus hint */}
                {activeField && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: "hsl(140 12% 42% / 0.15)", border: "1px solid hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 65%)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(140 12% 55%)" }} />
                    Editing: <span className="font-semibold capitalize">{activeField === "title" ? "Headline" : activeField === "cta" ? "Call to Action" : `Bullet ${activeBulletIndex + 1}`}</span>
                  </div>
                )}

                {/* Headline */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Headline</label>
                  <Input
                    value={data.title}
                    onChange={e => update({ title: e.target.value })}
                    onFocus={() => setActiveField("title")}
                    style={{ ...darkInput, ...(activeField === "title" ? { borderColor: "hsl(140 12% 50%)" } : {}) }}
                    className="text-xs"
                  />
                </div>

                {/* Bullets */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Bullet Points</label>
                  <div className="space-y-1.5">
                    {data.bullets.map((b, i) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        <span className="text-[10px] w-3 shrink-0" style={{ color: "hsl(240 5% 46%)" }}>•</span>
                        <Input
                          value={b}
                          onChange={e => updateBullet(i, e.target.value)}
                          onFocus={() => setActiveField(`bullet-${i}`)}
                          className="flex-1 text-[11px]"
                          style={{ ...darkInput, ...(activeField === `bullet-${i}` ? { borderColor: "hsl(140 12% 50%)" } : {}) }}
                        />
                        {data.bullets.length > 1 && (
                          <button onClick={() => removeBullet(i)} style={{ color: "hsl(240 5% 40%)" }}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {data.bullets.length < 6 && (
                      <button
                        onClick={addBullet}
                        className="flex items-center gap-1 text-[10px] mt-1"
                        style={{ color: "hsl(140 12% 58%)" }}
                      >
                        <Plus className="h-3 w-3" /> Add bullet
                      </button>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Call to Action</label>
                  <Input
                    value={data.cta}
                    onChange={e => update({ cta: e.target.value })}
                    onFocus={() => setActiveField("cta")}
                    style={{ ...darkInput, ...(activeField === "cta" ? { borderColor: "hsl(140 12% 50%)" } : {}) }}
                    className="text-xs"
                  />
                </div>

                {/* Disclaimer */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Disclaimer <span style={{ color: "hsl(240 5% 38%)" }}>(optional)</span></label>
                  <Textarea
                    value={data.disclaimer}
                    onChange={e => update({ disclaimer: e.target.value })}
                    className="text-[10px] min-h-[52px] resize-none"
                    style={darkInput}
                    placeholder="Coverage subject to underwriting approval..."
                  />
                </div>

                {/* Date/Location (for event templates) */}
                {templateId === "event-invite" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Date & Time</label>
                      <Input value={data.dateTime || ""} onChange={e => update({ dateTime: e.target.value })} placeholder="e.g. April 15, 2026 at 6:00 PM" style={darkInput} className="text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Location</label>
                      <Input value={data.location || ""} onChange={e => update({ location: e.target.value })} placeholder="e.g. The Grand Ballroom, Miami FL" style={darkInput} className="text-xs" />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── BRAND PANEL ── */}
            {activePanel === "brand" && (
              <>
                {/* Brand name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Agency / Brand Name</label>
                  <Input value={data.brandName} onChange={e => update({ brandName: e.target.value })} style={darkInput} className="text-xs" placeholder="Apex Insurance Group" />
                </div>

                {/* Logo */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Logo</label>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  {data.logoUrl ? (
                    <div className="flex items-center gap-2">
                      <img src={data.logoUrl} alt="logo" className="h-10 w-auto object-contain rounded" style={{ background: "hsl(240 6% 12%)", padding: "4px" }} />
                      <button
                        onClick={() => update({ logoUrl: "" })}
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: "hsl(0 60% 55%)" }}
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs transition-colors"
                      style={{ background: "hsl(240 6% 7%)", border: "1px dashed hsl(240 6% 20%)", color: "hsl(240 5% 55%)" }}
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload Logo
                    </button>
                  )}
                </div>

                {/* Color palette */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Color Palette</label>
                    <button className="text-[9px]" style={{ color: "hsl(140 12% 58%)" }} onClick={() => setShowColorPicker(v => !v)}>
                      {showColorPicker ? "Hide" : "Custom"}
                    </button>
                  </div>

                  {/* Preset swatches */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_PALETTES.map((palette, idx) => (
                      <button
                        key={idx}
                        onClick={() => update({ colors: palette })}
                        className="relative h-8 rounded-lg overflow-hidden transition-transform hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${palette[0]} 33%, ${palette[1]} 66%, ${palette[2] || palette[0]} 100%)`,
                          border: JSON.stringify(data.colors) === JSON.stringify(palette) ? "2px solid white" : "2px solid transparent",
                        }}
                      >
                        {JSON.stringify(data.colors) === JSON.stringify(palette) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom hex inputs */}
                  {showColorPicker && (
                    <div className="flex gap-1.5 mt-1">
                      {data.colors.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex-1 space-y-1">
                          <div className="h-6 rounded" style={{ background: c, border: "1px solid hsl(240 6% 20%)" }} />
                          <input
                            type="color"
                            value={c}
                            onChange={e => {
                              const nc = [...data.colors]; nc[i] = e.target.value; update({ colors: nc });
                            }}
                            className="w-full h-6 rounded cursor-pointer"
                            style={{ padding: "1px", background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 16%)" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick brand load from saved packages */}
                {brands.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Load Brand Package</label>
                    <div className="space-y-1">
                      {brands.filter(b => !b.id.startsWith("sample-")).map(b => (
                        <button
                          key={b.id}
                          onClick={() => update({
                            brandName: b.brand_name || b.name,
                            logoUrl: b.logo_url || "",
                            colors: b.brand_colors?.slice(0, 3) || data.colors,
                          })}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[11px] transition-colors"
                          style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)", color: "white" }}
                        >
                          <div className="flex gap-0.5">
                            {(b.brand_colors || []).slice(0, 3).map((c, i) => (
                              <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                            ))}
                          </div>
                          <span className="truncate">{b.name}</span>
                          <span className="ml-auto text-[9px]" style={{ color: "hsl(240 5% 42%)" }}>{b.brand_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── SAGE AI PANEL ── */}
            {activePanel === "sage" && (
              <div className="space-y-4">
                <div className="px-3 py-3 rounded-xl space-y-1" style={{ background: "hsl(140 12% 42% / 0.1)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} />
                    <p className="text-xs font-semibold text-white">Edit with Sage</p>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: "hsl(240 5% 55%)" }}>
                    Tell Sage what to change — it will rewrite your headline, bullets, or CTA while keeping the template design intact.
                  </p>
                </div>

                {/* Quick prompts */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Quick edits</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Make the tone more professional",
                      "Make it warmer and friendlier",
                      "Shorten all bullets",
                      "Add more urgency",
                      "Focus on commercial insurance",
                      "Focus on personal lines",
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => setSagePrompt(q)}
                        className="text-[10px] px-2.5 py-1 rounded-full transition-colors"
                        style={{
                          background: sagePrompt === q ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 8%)",
                          border: `1px solid ${sagePrompt === q ? "hsl(140 12% 42% / 0.5)" : "hsl(240 6% 16%)"}`,
                          color: sagePrompt === q ? "hsl(140 12% 65%)" : "hsl(240 5% 55%)",
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom prompt */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Or describe your change</label>
                  <Textarea
                    value={sagePrompt}
                    onChange={e => setSagePrompt(e.target.value)}
                    placeholder="e.g. Change the headline to focus on commercial trucking clients and rewrite the bullets accordingly..."
                    className="min-h-[80px] text-xs resize-none"
                    style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" }}
                  />
                </div>

                <Button
                  className="w-full gap-2 text-white text-xs h-9"
                  style={{ background: "hsl(140 12% 42%)" }}
                  onClick={handleSageEdit}
                  disabled={sageLoading || !sagePrompt.trim()}
                >
                  {sageLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {sageLoading ? "Sage is editing..." : "Apply with Sage"}
                </Button>

                <div className="pt-2" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
                  <button
                    onClick={() => {
                      update({ title: template.title, bullets: [...template.bullets], cta: template.cta, disclaimer: template.disclaimer });
                      toast("Reset to template defaults");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-[10px] py-2"
                    style={{ color: "hsl(240 5% 46%)" }}
                  >
                    <RefreshCw className="h-3 w-3" /> Reset to template defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
