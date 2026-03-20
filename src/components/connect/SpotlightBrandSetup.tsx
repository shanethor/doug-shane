import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Palette, Building2, X } from "lucide-react";

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
  const fileRef = useRef<HTMLInputElement>(null);

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("brand-logos").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("brand-logos").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
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

        {/* Logo upload */}
        <div className="space-y-1">
          <Label className="text-xs">Logo</Label>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="relative">
                <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded border bg-white p-1" />
                <button onClick={() => setLogoUrl("")} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
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
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload Logo
              </Button>
              <p className="text-[10px] text-muted-foreground">PNG or SVG, max 5MB</p>
            </div>
          </div>
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
