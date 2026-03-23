import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles, Loader2, ArrowLeft, ArrowRight, Download,
  Copy, RefreshCw, Calendar, Image as ImageIcon,
  X, Palette, Type, MapPin, Clock,
  FileText, Wand2, Eye,
} from "lucide-react";
import type { BrandPackage } from "./SpotlightBrandSetup";

const FLYER_TYPES = [
  { value: "event", label: "Event Flyer" },
  { value: "social", label: "Social Post" },
  { value: "announcement", label: "Announcement" },
  { value: "educational", label: "Educational" },
  { value: "promotion", label: "Promotion" },
  { value: "custom", label: "Custom" },
];

/* dark-themed inline styles for inputs to avoid white backgrounds */
const darkInput: React.CSSProperties = { background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "#F5F5F0" };
const darkTextarea: React.CSSProperties = { ...darkInput };

interface SpotlightFlyerWizardProps {
  onClose: () => void;
  brands: BrandPackage[];
  editFlyerId?: string | null;
  initialType?: string;
}

export default function SpotlightFlyerWizard({ onClose, brands, editFlyerId, initialType }: SpotlightFlyerWizardProps) {
  const [step, setStep] = useState(editFlyerId ? 0 : 1);
  const [loading, setLoading] = useState(false);

  const defaultBrand = brands.find(b => b.is_default) || brands[0] || null;
  const [selectedBrandId, setSelectedBrandId] = useState(defaultBrand?.id || "");

  // Step 1
  const [rawPrompt, setRawPrompt] = useState("");
  const [flyerType, setFlyerType] = useState(initialType || "");
  const [useDefaults, setUseDefaults] = useState(true);

  const [flyerId, setFlyerId] = useState<string | null>(editFlyerId || null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Step 2
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [isEvergreen, setIsEvergreen] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [brandName, setBrandName] = useState(defaultBrand?.brand_name || "");
  const [brandColors, setBrandColors] = useState<string[]>(defaultBrand?.brand_colors || ["#8A9A8C", "#F5F5F0"]);
  const [logoUrl, setLogoUrl] = useState(defaultBrand?.logo_url || "");

  // Step 3
  const [bullets, setBullets] = useState<string[]>([""]);
  const [cta, setCta] = useState("");
  const [disclaimer, setDisclaimer] = useState(defaultBrand?.disclaimer || "");

  // Step 4
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tweakText, setTweakText] = useState("");

  // Sync initialType
  useEffect(() => { if (initialType) setFlyerType(initialType); }, [initialType]);

  // Load existing flyer for editing
  useEffect(() => {
    if (!editFlyerId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
          body: { action: "get_flyer", flyer_id: editFlyerId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const f = data.flyer;
        setFlyerId(f.id);
        setRawPrompt(f.raw_prompt || "");
        setFlyerType(f.type || "event");
        setTitle(f.title || "");
        setDateTime(f.date_time || "");
        setIsEvergreen(f.evergreen || false);
        setLocation(f.location || "");
        setBrandName(f.brand_name || "");
        setBrandColors(Array.isArray(f.brand_colors) ? f.brand_colors : ["#8A9A8C", "#F5F5F0"]);
        setLogoUrl(f.logo_url || "");
        setBullets(Array.isArray(f.bullets) && f.bullets.length > 0 ? f.bullets : [""]);
        setCta(f.cta || "");
        setDisclaimer(f.disclaimer || "");
        setResultImageUrl(f.result_image_url || null);
        if (f.status === "ready" && f.result_image_url) setStep(4);
        else if (f.bullets && f.bullets.length > 0) setStep(3);
        else if (f.title) setStep(2);
        else setStep(1);
      } catch (err: any) {
        toast.error("Failed to load flyer");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editFlyerId]);

  const applyBrand = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setBrandName(brand.brand_name);
      setBrandColors(brand.brand_colors);
      setLogoUrl(brand.logo_url || "");
      if (brand.disclaimer && !disclaimer) setDisclaimer(brand.disclaimer);
    }
  };

  const handleCreateDraft = async () => {
    if (!rawPrompt.trim()) { toast.error("Describe what you need"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "create_draft", raw_prompt: rawPrompt.trim(), type: flyerType || undefined, brand_id: selectedBrandId || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFlyerId(data.flyer.id);
      setFlyerType(data.flyer.type);
      setCalendarEvents(data.calendar_events || []);
      if (data.flyer.brand_name) setBrandName(data.flyer.brand_name);
      if (Array.isArray(data.flyer.brand_colors)) setBrandColors(data.flyer.brand_colors);
      if (data.flyer.logo_url) setLogoUrl(data.flyer.logo_url);
      if (data.flyer.disclaimer) setDisclaimer(data.flyer.disclaimer);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to create draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (eventId: string) => {
    const ev = calendarEvents.find((e: any) => e.id === eventId);
    if (ev) {
      setSelectedEventId(eventId);
      setTitle(ev.title || "");
      const start = new Date(ev.start_time);
      setDateTime(start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " at " + start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      setLocation(ev.location || "");
      setDescription(ev.description || "");
    }
  };

  const handleSaveDetails = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const needsDateTime = ["event", "announcement"].includes(flyerType);
    if (needsDateTime && !isEvergreen && !dateTime.trim()) { toast.error("Set a date/time or mark as evergreen"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
        body: {
          action: "update_details", flyer_id: flyerId,
          title: title.trim(), date_time: isEvergreen ? null : dateTime.trim(), evergreen: isEvergreen,
          location: location.trim(), brand_name: brandName.trim(), brand_colors: brandColors.filter(c => c),
          logo_url: logoUrl.trim(), calendar_event_id: selectedEventId, type: flyerType,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (description.trim()) {
        const { data: bulletData } = await supabase.functions.invoke("spotlight-flyer", {
          body: { action: "summarize_bullets", description: description.trim() },
        });
        if (bulletData?.bullets?.length) setBullets(bulletData.bullets);
      }

      if (!cta) {
        const ctaMap: Record<string, string> = {
          event: "RSVP today to reserve your seat.", social: "Like, share, and follow for more.",
          promotion: "Call today or book online.", educational: "Learn more today.",
          announcement: "Stay tuned for more updates.", custom: "Contact us today.",
        };
        setCta(ctaMap[flyerType] || "Contact us today.");
      }
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Failed to save details");
    } finally {
      setLoading(false);
    }
  };

  const addBullet = () => setBullets([...bullets, ""]);
  const removeBullet = (i: number) => setBullets(bullets.filter((_, idx) => idx !== i));
  const updateBullet = (i: number, val: string) => { const u = [...bullets]; u[i] = val; setBullets(u); };

  const handleGenerate = async () => {
    const cleanBullets = bullets.filter(b => b.trim());
    if (cleanBullets.length === 0) { toast.error("Add at least one bullet point"); return; }
    if (!cta.trim()) { toast.error("Add a call to action"); return; }
    setLoading(true);
    try {
      await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "update_details", flyer_id: flyerId, bullets: cleanBullets, cta: cta.trim(), disclaimer: disclaimer.trim() },
      });
      const { data: promptData, error: promptErr } = await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "build_prompt", flyer_id: flyerId },
      });
      if (promptErr) throw promptErr;
      if (promptData?.error) throw new Error(promptData.error);
      setStep(4);
      setGenerating(true);
      const { data: genData, error: genErr } = await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "generate", flyer_id: flyerId },
      });
      if (genErr) throw genErr;
      if (genData?.error) throw new Error(genData.error);
      setResultImageUrl(genData.image_url);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
      if (step === 4) setStep(3);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "generate", flyer_id: flyerId, extra_instructions: tweakText.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResultImageUrl(data.image_url);
      setTweakText("");
      toast.success("Graphic regenerated");
    } catch (err: any) {
      toast.error(err.message || "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImageUrl) return;
    const link = document.createElement("a");
    link.href = resultImageUrl;
    link.download = `${title || "graphic"}.png`;
    link.click();
  };

  const handleCopyCaption = () => {
    const cleanBullets = bullets.filter(b => b.trim());
    const caption = [title, !isEvergreen && dateTime ? `📅 ${dateTime}` : "", location ? `📍 ${location}` : "", "", ...cleanBullets.map(b => `• ${b}`), "", `👉 ${cta}`].filter(Boolean).join("\n");
    navigator.clipboard.writeText(caption);
    toast.success("Caption copied to clipboard");
  };

  const typeLabel = FLYER_TYPES.find(t => t.value === flyerType)?.label || "Graphic";

  if (step === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" style={{ color: "hsl(240 5% 56%)" }}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
              AuRa Create
            </h2>
            <p className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>
              {editFlyerId ? `Edit ${typeLabel}` : `New ${typeLabel}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: s === step ? 28 : 14,
                background: s === step ? "hsl(140 12% 50%)" : s < step ? "hsl(140 12% 42% / 0.4)" : "hsl(240 6% 18%)",
              }}
            />
          ))}
        </div>
      </div>

      <Separator style={{ background: "hsl(240 6% 14%)" }} />

      {/* ═══ STEP 1: Request ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1 text-white">What do you need?</h3>
            <p className="text-[10px] mb-3" style={{ color: "hsl(240 5% 50%)" }}>
              Describe your {typeLabel.toLowerCase()} in plain English. We'll pull context from your calendar and brand settings.
            </p>
            <Textarea
              placeholder={flyerType === "social" ? "Create a tip graphic about umbrella coverage for LinkedIn..." : flyerType === "educational" ? "Design an infographic about hurricane preparedness..." : "I need a marketing flyer for my March 21st CLE event for young attorneys..."}
              value={rawPrompt}
              onChange={e => setRawPrompt(e.target.value)}
              className="min-h-[100px]"
              style={darkTextarea}
              maxLength={2000}
            />
            <p className="text-[9px] text-right mt-1" style={{ color: "hsl(240 5% 40%)" }}>{rawPrompt.length}/2000</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Content Type</label>
              <Select value={flyerType} onValueChange={setFlyerType}>
                <SelectTrigger className="h-8 text-xs" style={darkInput}><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                <SelectContent style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 18%)" }}>
                  {FLYER_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs text-white">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {brands.length > 0 && (
              <div className="space-y-1 flex-1 min-w-[130px]">
                <label className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: "hsl(240 5% 50%)" }}>
                  <Palette className="h-2.5 w-2.5" /> Brand
                </label>
                <Select value={selectedBrandId} onValueChange={applyBrand}>
                  <SelectTrigger className="h-8 text-xs" style={darkInput}><SelectValue placeholder="Select brand..." /></SelectTrigger>
                  <SelectContent style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 18%)" }}>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-xs text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {b.brand_colors.slice(0, 2).map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />)}
                          </div>
                          {b.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button
            className="w-full gap-2 text-white text-xs h-9"
            style={{ background: "hsl(140 12% 42%)" }}
            onClick={handleCreateDraft}
            disabled={loading || !rawPrompt.trim()}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Continue
          </Button>
        </div>
      )}

      {/* ═══ STEP 2: Details ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          {calendarEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 text-white">
                <Calendar className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} /> Matching Calendar Events
              </h3>
              <div className="space-y-1.5">
                {calendarEvents.map((ev: any) => (
                  <button
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev.id)}
                    className="w-full text-left p-2.5 rounded-lg transition-colors"
                    style={{
                      background: selectedEventId === ev.id ? "hsl(140 12% 42% / 0.1)" : "hsl(240 6% 7%)",
                      border: `1px solid ${selectedEventId === ev.id ? "hsl(140 12% 42% / 0.4)" : "hsl(240 6% 14%)"}`,
                    }}
                  >
                    <p className="text-xs font-medium text-white">{ev.title}</p>
                    <p className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>{new Date(ev.start_time).toLocaleDateString()} · {ev.location || "No location"}</p>
                  </button>
                ))}
              </div>
              <Separator className="my-3" style={{ background: "hsl(240 6% 14%)" }} />
            </div>
          )}

          {(() => {
            const needsDateTime = ["event", "announcement"].includes(flyerType);
            const needsLocation = ["event"].includes(flyerType);
            const descPlaceholders: Record<string, string> = {
              event: "Key talking points, event agenda, speakers...",
              social: "What message do you want to share? Key points for the post...",
              promotion: "Offer details, discount info, what you're promoting...",
              educational: "Topic details, key facts, tips to highlight...",
              announcement: "What's the news? Key details to share...",
              custom: "Describe what you need on the graphic...",
            };

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: "hsl(240 5% 50%)" }}><Type className="h-2.5 w-2.5" /> Title *</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={flyerType === "promotion" ? "Offer or campaign name" : flyerType === "social" ? "Post headline" : "Event or campaign title"} maxLength={200} style={darkInput} />
                </div>
                {needsDateTime && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: "hsl(240 5% 50%)" }}><Clock className="h-2.5 w-2.5" /> Date & Time</label>
                    <Input value={dateTime} onChange={e => setDateTime(e.target.value)} placeholder="March 21, 2026 at 5:30 PM" disabled={isEvergreen} style={darkInput} />
                    <div className="flex items-center gap-2 mt-1">
                      <Switch checked={isEvergreen} onCheckedChange={setIsEvergreen} id="evergreen" />
                      <label htmlFor="evergreen" className="text-[9px] cursor-pointer" style={{ color: "hsl(240 5% 50%)" }}>Evergreen (no date)</label>
                    </div>
                  </div>
                )}
                {needsLocation && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: "hsl(240 5% 50%)" }}><MapPin className="h-2.5 w-2.5" /> Location</label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="123 Main St or Online" style={darkInput} />
                  </div>
                )}
                <div className={`space-y-1 ${needsDateTime && needsLocation ? "sm:col-span-2" : "sm:col-span-2"}`}>
                  <label className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: "hsl(240 5% 50%)" }}>
                    <FileText className="h-2.5 w-2.5" /> {flyerType === "promotion" ? "Offer Details (we'll turn into bullets)" : "Description (we'll turn into bullets)"}
                  </label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={descPlaceholders[flyerType] || descPlaceholders.custom} className="min-h-[70px]" maxLength={5000} style={darkTextarea} />
                </div>
              </div>
            );
          })()}

          <Separator style={{ background: "hsl(240 6% 14%)" }} />

          <h4 className="text-[10px] font-semibold flex items-center gap-2 uppercase tracking-wider" style={{ color: "hsl(140 12% 58%)" }}>
            <Palette className="h-3 w-3" /> Brand Settings
          </h4>

          {brands.length > 1 && (
            <div className="space-y-1">
              <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Switch Brand</label>
              <Select value={selectedBrandId} onValueChange={applyBrand}>
                <SelectTrigger className="h-8 text-xs" style={darkInput}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent style={{ background: "hsl(240 8% 12%)", borderColor: "hsl(240 6% 18%)" }}>
                  {brands.map(b => <SelectItem key={b.id} value={b.id} className="text-xs text-white">{b.name} — {b.brand_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Brand / Company Name</label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Hamilton & Cole LLP" style={darkInput} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Logo URL (optional)</label>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." style={darkInput} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Brand Colors</label>
              <div className="flex gap-2 items-center">
                {brandColors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="color" value={c} onChange={e => { const u = [...brandColors]; u[i] = e.target.value; setBrandColors(u); }} className="w-7 h-7 rounded cursor-pointer" style={{ border: "1px solid hsl(240 6% 18%)", background: "transparent" }} />
                    <span className="text-[9px] font-mono" style={{ color: "hsl(240 5% 46%)" }}>{c}</span>
                  </div>
                ))}
                {brandColors.length < 3 && (
                  <Button variant="ghost" size="sm" className="text-[9px] h-6" style={{ color: "hsl(140 12% 58%)" }} onClick={() => setBrandColors([...brandColors, "#555555"])}>+ Add</Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5 text-xs h-9" style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)", background: "transparent" }}>
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>
            <Button className="flex-1 gap-2 text-white text-xs h-9" style={{ background: "hsl(140 12% 42%)" }} onClick={handleSaveDetails} disabled={loading || !title.trim()}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Review & Generate ═══ */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold flex items-center gap-2 text-white"><Eye className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} /> Review Your {typeLabel}</h3>

          <div className="rounded-lg p-3 space-y-2" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Title</span>
              <span className="text-xs font-medium text-white">{title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Type</span>
              <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 62%)" }}>{flyerType}</Badge>
            </div>
            {!isEvergreen && dateTime && (
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Date/Time</span>
                <span className="text-xs text-white">{dateTime}</span>
              </div>
            )}
            {isEvergreen && (
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Date</span>
                <Badge className="text-[9px]" style={{ background: "hsl(240 6% 14%)", color: "hsl(240 5% 60%)" }}>Evergreen</Badge>
              </div>
            )}
            {location && (
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Location</span>
                <span className="text-xs text-white">{location}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>Brand</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white">{brandName || "—"}</span>
                <div className="flex gap-0.5">
                  {brandColors.map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c, border: "1px solid hsl(240 6% 20%)" }} />)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "hsl(240 5% 50%)" }}>Bullet Points *</label>
            <div className="space-y-1.5">
              {bullets.map((b, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[10px] w-3 shrink-0" style={{ color: "hsl(240 5% 46%)" }}>•</span>
                  <Input value={b} onChange={e => updateBullet(i, e.target.value)} placeholder="Key point..." className="flex-1 text-xs" maxLength={200} style={darkInput} />
                  {bullets.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" style={{ color: "hsl(240 5% 50%)" }} onClick={() => removeBullet(i)}><X className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
              {bullets.length < 6 && (
                <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-6" style={{ color: "hsl(140 12% 58%)" }} onClick={addBullet}>+ Add bullet</Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Call to Action *</label>
            <Input value={cta} onChange={e => setCta(e.target.value)} placeholder="RSVP today to reserve your seat." maxLength={200} style={darkInput} />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Disclaimer / Footer (optional)</label>
            <Textarea value={disclaimer} onChange={e => setDisclaimer(e.target.value)} placeholder="Required disclosures, license numbers..." className="min-h-[50px]" maxLength={500} style={darkTextarea} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5 text-xs h-9" style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)", background: "transparent" }}>
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>
            <Button className="flex-1 gap-2 text-white text-xs h-9" style={{ background: "hsl(140 12% 42%)" }} onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {resultImageUrl ? `Regenerate ${typeLabel}` : `Generate ${typeLabel}`}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Result ═══ */}
      {step === 4 && (
        <div className="space-y-4">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: "hsl(140 12% 50%)" }} />
                <Sparkles className="h-4 w-4 absolute -top-1 -right-1 animate-pulse" style={{ color: "hsl(140 12% 58%)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Generating your {typeLabel.toLowerCase()}...</p>
                <p className="text-[10px] mt-1" style={{ color: "hsl(240 5% 50%)" }}>This may take 15–30 seconds</p>
              </div>
            </div>
          ) : resultImageUrl ? (
            <>
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)", background: "hsl(240 6% 5%)" }}>
                <img src={resultImageUrl} alt={title} className="w-full h-auto max-h-[600px] object-contain mx-auto" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1.5 text-white text-xs" style={{ background: "hsl(140 12% 42%)" }} onClick={handleDownload}>
                  <Download className="h-3 w-3" /> Download PNG
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" style={{ background: "transparent", border: "1px solid hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }} onClick={handleCopyCaption}>
                  <Copy className="h-3 w-3" /> Copy Caption
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" style={{ background: "transparent", border: "1px solid hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }} onClick={() => setStep(3)}>
                  <ArrowLeft className="h-3 w-3" /> Edit
                </Button>
              </div>

              <Separator style={{ background: "hsl(240 6% 14%)" }} />
              <div className="space-y-2">
                <label className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 50%)" }}>Quick regenerate with tweaks</label>
                <Textarea value={tweakText} onChange={e => setTweakText(e.target.value)} placeholder="Make the headline larger, use a lighter background..." className="min-h-[50px]" maxLength={500} style={darkTextarea} />
                <Button size="sm" className="gap-1.5 text-xs text-white" style={{ background: "hsl(240 6% 14%)" }} onClick={handleRegenerate} disabled={generating}>
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-2">
              <ImageIcon className="h-8 w-8 mx-auto" style={{ color: "hsl(240 5% 40%)" }} />
              <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>Generation failed. Try again.</p>
              <Button size="sm" className="text-xs" style={{ background: "transparent", border: "1px solid hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }} onClick={() => setStep(3)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Back to Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
