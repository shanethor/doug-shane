import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Palette, Building2, X, Sparkles, FileImage, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface BrandPackage {
  id: string;
  name: string;
  brand_name: string;
  brand_colors: string[];
  logo_url: string | null;
  tagline: string | null;
  disclaimer: string | null;
  industry: string | null;
  tone: string;
  is_default: boolean;
  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
}

interface Props {
  existing?: BrandPackage | null;
  onSave: (brand: BrandPackage) => void;
  onCancel: () => void;
}

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly & Approachable" },
  { value: "bold", label: "Bold & Energetic" },
  { value: "minimal", label: "Clean & Minimal" },
  { value: "luxury", label: "Luxury & Premium" },
];

const INDUSTRIES = [
  { value: "insurance", label: "Insurance" },
  { value: "real_estate", label: "Real Estate" },
  { value: "financial", label: "Financial Services" },
  { value: "legal", label: "Legal" },
  { value: "healthcare", label: "Healthcare" },
  { value: "hvac", label: "HVAC / Home Services" },
  { value: "restaurant", label: "Restaurant / Hospitality" },
  { value: "retail", label: "Retail" },
  { value: "tech", label: "Technology" },
  { value: "other", label: "Other" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SpotlightBrandSetup({ existing, onSave, onCancel }: Props) {
  const [name, setName] = useState(existing?.name || "Default");
  const [brandName, setBrandName] = useState(existing?.brand_name || "");
  const [brandColors, setBrandColors] = useState<string[]>(existing?.brand_colors || ["#001F3F", "#C9A24B"]);
  const [logoUrl, setLogoUrl] = useState(existing?.logo_url || "");
  const [tagline, setTagline] = useState(existing?.tagline || "");
  const [disclaimer, setDisclaimer] = useState(existing?.disclaimer || "");
  const [industry, setIndustry] = useState(existing?.industry || "");
  const [tone, setTone] = useState(existing?.tone || "professional");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [materialUploading, setMaterialUploading] = useState(false);
  const [materialAnalyzing, setMaterialAnalyzing] = useState(false);
  const [materialFiles, setMaterialFiles] = useState<{ name: string; url: string }[]>([]);
  const [designNotes, setDesignNotes] = useState<string>("");
  const [fontStyles, setFontStyles] = useState<string[]>([]);
  const [brandExtracted, setBrandExtracted] = useState(false);
  const [materialExtracted, setMaterialExtracted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const materialRef = useRef<HTMLInputElement>(null);

  const analyzeBrandImage = async (base64Url: string, type: "logo" | "material") => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "analyze_brand", image_url: base64Url, image_type: type },
      });
      if (error) throw error;
      const attrs = data?.attributes;
      if (!attrs) return;

      if (attrs.colors) {
        const hexColors = attrs.colors
          .filter((c: string) => /^#[0-9A-Fa-f]{3,8}$/.test(c))
          .slice(0, 4);
        if (hexColors.length > 0) setBrandColors(hexColors);
      }
      if (type === "logo") {
        if (attrs.industry) {
          const matched = INDUSTRIES.find(i => i.value === attrs.industry || i.label.toLowerCase().includes(attrs.industry.toLowerCase()));
          if (matched) setIndustry(matched.value);
        }
        if (attrs.tone) {
          const matched = TONES.find(t => t.value === attrs.tone || t.label.toLowerCase().includes(attrs.tone.toLowerCase()));
          if (matched) setTone(matched.value);
        }
        if (attrs.brand_name && !brandName.trim()) {
          setBrandName(attrs.brand_name);
        }
        setBrandExtracted(true);
        toast.success("Brand colors, industry & tone extracted from logo");
      } else {
        if (attrs.font_styles) setFontStyles(prev => [...new Set([...prev, ...attrs.font_styles])]);
        if (attrs.design_notes) setDesignNotes(prev => prev ? `${prev}\n${attrs.design_notes}` : attrs.design_notes);
        if (attrs.tone) {
          const matched = TONES.find(t => t.value === attrs.tone || t.label.toLowerCase().includes(attrs.tone.toLowerCase()));
          if (matched) setTone(matched.value);
        }
        if (attrs.industry && !industry) {
          const matched = INDUSTRIES.find(i => i.value === attrs.industry || i.label.toLowerCase().includes(attrs.industry.toLowerCase()));
          if (matched) setIndustry(matched.value);
        }
        if (attrs.brand_name && !brandName.trim()) {
          setBrandName(attrs.brand_name);
        }
        setMaterialExtracted(true);
        toast.success("Design theme & fonts extracted from material");
      }
    } catch (err: any) {
      console.error("Brand analysis error:", err);
      toast.error("Could not analyze image — brand saved without AI extraction");
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }
    setUploading(true);
    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("brand-logos").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("brand-logos").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo uploaded — analyzing brand…");

      // Analyze via AI
      const base64 = await fileToBase64(file);
      await analyzeBrandImage(base64, "logo");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleMaterialUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setMaterialUploading(true);
    setMaterialAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      setMaterialFiles(prev => [...prev, { name: file.name, url: base64.slice(0, 50) }]);
      toast.info("Analyzing marketing material…");
      await analyzeBrandImage(base64, "material");
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setMaterialUploading(false);
      setMaterialAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!brandName.trim()) {
      toast.error("Company / brand name is required");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
        body: {
          action: "save_brand",
          brand_id: existing?.id || undefined,
          name: name.trim() || "Default",
          brand_name: brandName.trim(),
          brand_colors: brandColors.filter(c => c),
          logo_url: logoUrl.trim() || null,
          tagline: tagline.trim() || null,
          disclaimer: disclaimer.trim() || null,
          industry: industry || null,
          tone,
          is_default: !existing ? true : existing.is_default,
          // Extra design intelligence persisted for future generation
          font_styles: fontStyles.length > 0 ? fontStyles : undefined,
          design_notes: designNotes.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(existing ? "Brand updated" : "Brand package created!");
      onSave(data.brand);
    } catch (err: any) {
      toast.error(err.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4 text-warning" />
          {existing ? "Edit Brand Package" : "Set Up Your Brand"}
        </CardTitle>
        {!existing && (
          <p className="text-[11px] text-muted-foreground">
            Create your brand package so every flyer matches your identity. You can create multiple packages and switch between them.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Package name */}
        <div className="space-y-1">
          <Label className="text-xs">Package Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Brand, Event Series" className="h-9" />
        </div>

        {/* Brand / Company Name */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Company / Brand Name *</Label>
          <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Hamilton & Cole LLP" className="h-9" />
        </div>

        {/* Logo upload with AI extraction */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            Logo
            {brandExtracted && <Badge variant="outline" className="text-[9px] h-4 ml-1 gap-0.5" style={{ borderColor: "hsl(140 50% 40%)", color: "hsl(140 50% 60%)" }}><CheckCircle2 className="h-2.5 w-2.5" /> AI Extracted</Badge>}
          </Label>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="relative">
                <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded border bg-white p-1" />
                <button onClick={() => { setLogoUrl(""); setBrandExtracted(false); }} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="w-14 h-14 rounded border border-dashed flex items-center justify-center bg-muted/30">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading || analyzing} onClick={() => fileRef.current?.click()}>
                {uploading || analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {analyzing ? "Analyzing…" : "Upload Logo"}
              </Button>
              <p className="text-[10px] text-muted-foreground">PNG or SVG, max 5MB — AI will extract colors, industry & tone</p>
            </div>
          </div>
        </div>

        {/* Marketing Materials Upload */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <FileImage className="h-3 w-3" /> Previous Marketing Materials (optional)
            {materialExtracted && <Badge variant="outline" className="text-[9px] h-4 ml-1 gap-0.5" style={{ borderColor: "hsl(140 50% 40%)", color: "hsl(140 50% 60%)" }}><CheckCircle2 className="h-2.5 w-2.5" /> Learned</Badge>}
          </Label>
          <p className="text-[10px] text-muted-foreground">Upload existing flyers, brochures, or ads so AI can learn your fonts, colors, and design style for better generation.</p>
          <div className="border border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={() => materialRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleMaterialUpload(f); }}
          >
            <input ref={materialRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleMaterialUpload(f); e.target.value = ""; }} />
            {materialUploading || materialAnalyzing ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Analyzing design patterns…</span>
              </div>
            ) : (
              <div className="py-2">
                <Sparkles className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Drop or click to upload a marketing material</p>
                <p className="text-[10px] text-muted-foreground/60">JPG, PNG — max 10MB</p>
              </div>
            )}
          </div>
          {materialFiles.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {materialFiles.map((f, i) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1">
                  <FileImage className="h-3 w-3" /> {f.name}
                  <button onClick={() => setMaterialFiles(prev => prev.filter((_, j) => j !== i))}><X className="h-2.5 w-2.5" /></button>
                </Badge>
              ))}
            </div>
          )}
          {fontStyles.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Detected fonts:</span>
              {fontStyles.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
              ))}
            </div>
          )}
          {designNotes && (
            <p className="text-[10px] italic text-muted-foreground border-l-2 pl-2" style={{ borderColor: "hsl(140 12% 42%)" }}>
              {designNotes.slice(0, 200)}{designNotes.length > 200 ? "…" : ""}
            </p>
          )}
        </div>

        {/* Brand Colors */}
        <div className="space-y-1">
          <Label className="text-xs">Brand Colors</Label>
          <div className="flex gap-2 items-center flex-wrap">
            {brandColors.map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={c}
                  onChange={e => {
                    const u = [...brandColors];
                    u[i] = e.target.value;
                    setBrandColors(u);
                  }}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <span className="text-[10px] text-muted-foreground font-mono">{c}</span>
                {brandColors.length > 1 && (
                  <button onClick={() => setBrandColors(brandColors.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {brandColors.length < 4 && (
              <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setBrandColors([...brandColors, "#555555"])}>
                + Add Color
              </Button>
            )}
          </div>
        </div>

        {/* Industry & Tone */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Design Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-1">
          <Label className="text-xs">Tagline (optional)</Label>
          <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Protecting what matters most" className="h-9" maxLength={150} />
        </div>

        {/* Default Disclaimer */}
        <div className="space-y-1">
          <Label className="text-xs">Default Disclaimer / Footer (optional)</Label>
          <Textarea value={disclaimer} onChange={e => setDisclaimer(e.target.value)} placeholder="License numbers, required disclosures..." className="min-h-[60px]" maxLength={500} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !brandName.trim()} className="flex-1 gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {existing ? "Save Changes" : "Create Brand Package"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
