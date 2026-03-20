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
  { value: "event", label: "Event" },
  { value: "webinar", label: "Webinar" },
  { value: "promo", label: "Promo" },
  { value: "hiring", label: "Hiring" },
  { value: "announcement", label: "Announcement" },
];

interface SpotlightFlyerWizardProps {
  onClose: () => void;
  brands: BrandPackage[];
  editFlyerId?: string | null;
}

export default function SpotlightFlyerWizard({ onClose, brands, editFlyerId }: SpotlightFlyerWizardProps) {
  const [step, setStep] = useState(editFlyerId ? 0 : 1); // 0 = loading edit
  const [loading, setLoading] = useState(false);

  // Brand selection
  const defaultBrand = brands.find(b => b.is_default) || brands[0] || null;
  const [selectedBrandId, setSelectedBrandId] = useState(defaultBrand?.id || "");

  // Step 1
  const [rawPrompt, setRawPrompt] = useState("");
  const [flyerType, setFlyerType] = useState("");
  const [useDefaults, setUseDefaults] = useState(true);

  // Draft state
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
  const [brandColors, setBrandColors] = useState<string[]>(defaultBrand?.brand_colors || ["#001F3F", "#C9A24B"]);
  const [logoUrl, setLogoUrl] = useState(defaultBrand?.logo_url || "");

  // Step 3
  const [bullets, setBullets] = useState<string[]>([""]);
  const [cta, setCta] = useState("");
  const [disclaimer, setDisclaimer] = useState(defaultBrand?.disclaimer || "");

  // Step 4
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tweakText, setTweakText] = useState("");

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
        setBrandColors(Array.isArray(f.brand_colors) ? f.brand_colors : ["#001F3F", "#C9A24B"]);
        setLogoUrl(f.logo_url || "");
        setBullets(Array.isArray(f.bullets) && f.bullets.length > 0 ? f.bullets : [""]);
        setCta(f.cta || "");
        setDisclaimer(f.disclaimer || "");
        setResultImageUrl(f.result_image_url || null);

        // Determine which step to show
        if (f.status === "ready" && f.result_image_url) {
          setStep(4);
        } else if (f.bullets && f.bullets.length > 0) {
          setStep(3);
        } else if (f.title) {
          setStep(2);
        } else {
          setStep(1);
        }
      } catch (err: any) {
        toast.error("Failed to load flyer");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editFlyerId]);

  // Apply brand when selection changes
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

  // ─── Step 1: Create Draft ───
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
      // Apply brand from draft if set
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
    if (!isEvergreen && !dateTime.trim()) { toast.error("Set a date/time or mark as evergreen"); return; }
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
          event: "RSVP today to reserve your seat.", webinar: "Register today – limited virtual seats.",
          promo: "Call today or book online.", hiring: "Apply now – positions filling fast.", announcement: "Learn more today.",
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
      toast.success("Flyer regenerated");
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
    link.download = `${title || "flyer"}.png`;
    link.click();
  };

  const handleCopyCaption = () => {
    const cleanBullets = bullets.filter(b => b.trim());
    const caption = [title, !isEvergreen && dateTime ? `📅 ${dateTime}` : "", location ? `📍 ${location}` : "", "", ...cleanBullets.map(b => `• ${b}`), "", `👉 ${cta}`].filter(Boolean).join("\n");
    navigator.clipboard.writeText(caption);
    toast.success("Caption copied to clipboard");
  };

  // Loading state for edit mode
  if (step === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" />
              AURA Spotlight
            </h2>
            <p className="text-xs text-muted-foreground">{editFlyerId ? "Edit Flyer" : "Marketing Flyer Generator"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-8 bg-warning" : s < step ? "w-4 bg-warning/40" : "w-4 bg-muted"}`} />
          ))}
        </div>
      </div>

      <Separator />

      {/* ═══ STEP 1: Simple Request ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">What do you need?</h3>
            <p className="text-xs text-muted-foreground mb-3">Describe your flyer in plain English. We'll pull context from your calendar and brand settings.</p>
            <Textarea placeholder="I need a marketing flyer for my March 21st CLE event for young attorneys..." value={rawPrompt} onChange={e => setRawPrompt(e.target.value)} className="min-h-[100px]" maxLength={2000} />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{rawPrompt.length}/2000</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1 flex-1 min-w-[140px]">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Flyer Type (optional)</label>
              <Select value={flyerType} onValueChange={setFlyerType}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                <SelectContent>
                  {FLYER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Brand selector */}
            {brands.length > 0 && (
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Brand Package
                </label>
                <Select value={selectedBrandId} onValueChange={applyBrand}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select brand..." /></SelectTrigger>
                  <SelectContent>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {b.brand_colors.slice(0, 2).map((c, i) => (
                              <div key={i} className="w-2.5 h-2.5 rounded-full border" style={{ background: c }} />
                            ))}
                          </div>
                          {b.name} {b.is_default && <span className="text-[9px] text-muted-foreground">(default)</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button className="w-full gap-2" onClick={handleCreateDraft} disabled={loading || !rawPrompt.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Continue
          </Button>
        </div>
      )}

      {/* ═══ STEP 2: Event & Details ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          {calendarEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Matching Calendar Events
              </h3>
              <div className="space-y-2">
                {calendarEvents.map((ev: any) => (
                  <button key={ev.id} onClick={() => handleSelectEvent(ev.id)} className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedEventId === ev.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ev.start_time).toLocaleDateString()} · {ev.location || "No location"}</p>
                  </button>
                ))}
              </div>
              <Separator className="my-3" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Type className="h-3 w-3" /> Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event or campaign title" maxLength={200} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Date & Time</label>
              <Input value={dateTime} onChange={e => setDateTime(e.target.value)} placeholder="March 21, 2026 at 5:30 PM" disabled={isEvergreen} />
              <div className="flex items-center gap-2 mt-1">
                <Switch checked={isEvergreen} onCheckedChange={setIsEvergreen} id="evergreen" />
                <label htmlFor="evergreen" className="text-[10px] text-muted-foreground cursor-pointer">Evergreen (no date)</label>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="123 Main St or Online" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Description (we'll turn into bullets)</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Key talking points, offer details, or event agenda..." className="min-h-[80px]" maxLength={5000} />
            </div>
          </div>

          <Separator />

          <h4 className="text-xs font-semibold flex items-center gap-2"><Palette className="h-3.5 w-3.5 text-warning" /> Brand Settings</h4>

          {/* Quick brand switch */}
          {brands.length > 1 && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Switch Brand Package</label>
              <Select value={selectedBrandId} onValueChange={applyBrand}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} — {b.brand_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand / Company Name</label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Hamilton & Cole LLP" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Logo URL (optional)</label>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand Colors</label>
              <div className="flex gap-2 items-center">
                {brandColors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="color" value={c} onChange={e => { const u = [...brandColors]; u[i] = e.target.value; setBrandColors(u); }} className="w-8 h-8 rounded border cursor-pointer" />
                    <span className="text-[10px] text-muted-foreground font-mono">{c}</span>
                  </div>
                ))}
                {brandColors.length < 3 && (
                  <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setBrandColors([...brandColors, "#555555"])}>+ Add</Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
            <Button className="flex-1 gap-2" onClick={handleSaveDetails} disabled={loading || !title.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Review & Generate ═══ */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Review Your Flyer</h3>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Title</span>
              <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <Badge variant="outline" className="text-[10px]">{flyerType}</Badge>
            </div>
            {!isEvergreen && dateTime && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Date/Time</span>
                <span className="text-sm">{dateTime}</span>
              </div>
            )}
            {isEvergreen && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Date</span>
                <Badge variant="secondary" className="text-[10px]">Evergreen</Badge>
              </div>
            )}
            {location && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Location</span>
                <span className="text-sm">{location}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Brand</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{brandName || "—"}</span>
                <div className="flex gap-0.5">
                  {brandColors.map((c, i) => <div key={i} className="w-3 h-3 rounded-full border" style={{ background: c }} />)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 block">Bullet Points *</label>
            <div className="space-y-2">
              {bullets.map((b, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">•</span>
                  <Input value={b} onChange={e => updateBullet(i, e.target.value)} placeholder="Key point..." className="flex-1" maxLength={200} />
                  {bullets.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeBullet(i)}><X className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
              {bullets.length < 6 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={addBullet}>+ Add bullet</Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Call to Action *</label>
            <Input value={cta} onChange={e => setCta(e.target.value)} placeholder="RSVP today to reserve your seat." maxLength={200} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Disclaimer / Footer (optional)</label>
            <Textarea value={disclaimer} onChange={e => setDisclaimer(e.target.value)} placeholder="Required disclosures, license numbers..." className="min-h-[60px]" maxLength={500} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
            <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {resultImageUrl ? "Regenerate Flyer" : "Generate Flyer"}
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
                <Loader2 className="h-12 w-12 animate-spin text-warning" />
                <Sparkles className="h-5 w-5 text-warning absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Generating your flyer...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take 15–30 seconds</p>
              </div>
            </div>
          ) : resultImageUrl ? (
            <>
              <div className="rounded-xl border overflow-hidden bg-muted/20">
                <img src={resultImageUrl} alt={title} className="w-full h-auto max-h-[600px] object-contain mx-auto" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1.5" onClick={handleDownload}><Download className="h-3.5 w-3.5" /> Download PNG</Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyCaption}><Copy className="h-3.5 w-3.5" /> Copy Social Caption</Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStep(3)}><ArrowLeft className="h-3.5 w-3.5" /> Edit & Regenerate</Button>
              </div>

              <Separator />
              <div className="space-y-2">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Quick regenerate with tweaks</label>
                <Textarea value={tweakText} onChange={e => setTweakText(e.target.value)} placeholder="Make the headline larger, use a lighter background..." className="min-h-[60px]" maxLength={500} />
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleRegenerate} disabled={generating}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-2">
              <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Generation failed. Try again.</p>
              <Button size="sm" variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Review</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
