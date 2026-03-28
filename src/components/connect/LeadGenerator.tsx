import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Rocket, Building2, Globe, MapPin, Target, Search, FileText,
  Download, Plus, ArrowUpRight, Eye, Trash2, Zap, Edit2,
  CheckCircle2, AlertCircle, Sparkles, Users, TrendingUp,
  Upload, Link, File, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCompanyProfile, useUpsertCompanyProfile,
  useGeneratedLeads, useUpdateGeneratedLead, useDeleteGeneratedLead,
  type CompanyProfile,
} from "@/hooks/useLeadsHub";

const US_STATES = [
  "All States", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
  "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

function CompanyProfilePanel() {
  const { data: profile, isLoading } = useCompanyProfile();
  const upsert = useUpsertCompanyProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    industry: "",
    icp_description: "",
    target_geos: [] as string[],
    typical_deal_size: "",
    revenue_range: "",
    target_buyer_titles: [] as string[],
    website_urls: [] as string[],
  });
  const [newGeo, setNewGeo] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const startEdit = () => {
    if (profile) {
      setForm({
        company_name: profile.company_name || "",
        industry: profile.industry || "",
        icp_description: profile.icp_description || "",
        target_geos: profile.target_geos || [],
        typical_deal_size: profile.typical_deal_size || "",
        revenue_range: profile.revenue_range || "",
        target_buyer_titles: profile.target_buyer_titles || [],
        website_urls: profile.website_urls || [],
      });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync(form);
      toast.success("Company profile saved");
      setEditing(false);
    } catch {
      toast.error("Failed to save profile");
    }
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (!editing && !profile) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Set up your company profile</p>
          <p className="text-xs text-muted-foreground mb-4">Tell AURA about your business so it can find the best-fit leads</p>
          <Button onClick={startEdit} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name</label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Industry</label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Insurance, SaaS, Construction" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ideal Customer Profile (ICP)</label>
            <Textarea value={form.icp_description} onChange={(e) => setForm({ ...form, icp_description: e.target.value })} placeholder="Describe your ideal customer…" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Typical Deal Size</label>
              <Input value={form.typical_deal_size} onChange={(e) => setForm({ ...form, typical_deal_size: e.target.value })} placeholder="e.g. $5K-50K" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Revenue Range</label>
              <Input value={form.revenue_range} onChange={(e) => setForm({ ...form, revenue_range: e.target.value })} placeholder="e.g. $1M-10M" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Geos</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.target_geos.map((g) => (
                <Badge key={g} variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setForm({ ...form, target_geos: form.target_geos.filter((x) => x !== g) })}>
                  {g} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newGeo} onChange={(e) => setNewGeo(e.target.value)} placeholder="Add state/city…" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => { if (newGeo.trim()) { setForm({ ...form, target_geos: [...form.target_geos, newGeo.trim()] }); setNewGeo(""); } }}>Add</Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Buyer Titles</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.target_buyer_titles.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setForm({ ...form, target_buyer_titles: form.target_buyer_titles.filter((x) => x !== t) })}>
                  {t} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. VP Operations, CEO" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => { if (newTitle.trim()) { setForm({ ...form, target_buyer_titles: [...form.target_buyer_titles, newTitle.trim()] }); setNewTitle(""); } }}>Add</Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Website URLs</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.website_urls.map((u) => (
                <Badge key={u} variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setForm({ ...form, website_urls: form.website_urls.filter((x) => x !== u) })}>
                  {u} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => { if (newUrl.trim()) { setForm({ ...form, website_urls: [...form.website_urls, newUrl.trim()] }); setNewUrl(""); } }}>Add</Button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save Profile"}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode
  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          {profile?.company_name || "Company Profile"}
        </CardTitle>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={startEdit}>
          <Edit2 className="h-3 w-3" /> Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {profile?.industry && <div className="flex items-center gap-2 text-xs"><Badge variant="outline">{profile.industry}</Badge></div>}
        {profile?.icp_description && <p className="text-xs text-muted-foreground">{profile.icp_description}</p>}
        <div className="flex gap-2 flex-wrap">
          {profile?.target_geos?.map((g) => <Badge key={g} variant="secondary" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-1" />{g}</Badge>)}
          {profile?.target_buyer_titles?.map((t) => <Badge key={t} variant="secondary" className="text-[10px]"><Users className="h-2.5 w-2.5 mr-1" />{t}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateControls({ onGenerate }: { onGenerate: (opts: any) => void }) {
  const [geo, setGeo] = useState("All States");
  const [volume, setVolume] = useState([50]);
  const [focus, setFocus] = useState("new_business");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate generation (in production this would call an edge function)
    await new Promise((r) => setTimeout(r, 2500));
    onGenerate({ geo, volume: volume[0], focus });
    setGenerating(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Generate Leads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Geography</label>
            <Select value={geo} onValueChange={setGeo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Focus</label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_business">New Business</SelectItem>
                <SelectItem value="expansion">Expansion</SelectItem>
                <SelectItem value="partners">Partners</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Volume: {volume[0]} leads</label>
          <Slider value={volume} onValueChange={setVolume} min={10} max={250} step={10} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>10</span><span>250</span>
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="w-full gap-1.5">
          {generating ? (
            <><Sparkles className="h-4 w-4 animate-pulse" /> Generating leads…</>
          ) : (
            <><Zap className="h-4 w-4" /> Generate Leads</>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Data sourced from public web directories, business registries, and licensed data partners.
          Users are responsible for complying with applicable email/telemarketing laws.
        </p>
      </CardContent>
    </Card>
  );
}

function FitScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-500 bg-emerald-500/10" : score >= 50 ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Target className="h-3 w-3" />{score}
    </span>
  );
}

function ResultsTable() {
  const { data: leads, isLoading } = useGeneratedLeads();
  const updateLead = useUpdateGeneratedLead();
  const deleteLead = useDeleteGeneratedLead();
  const [search, setSearch] = useState("");

  const filtered = (leads || []).filter((l) =>
    !search || l.company_name.toLowerCase().includes(search.toLowerCase()) || l.location?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (!leads?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No generated leads yet</p>
          <p className="text-xs text-muted-foreground">Set up your company profile and run the generator above</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Generated Leads ({filtered.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-7 h-8 text-xs w-[180px]" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Company</TableHead>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs">Fit</TableHead>
              <TableHead className="text-xs">Intent</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="py-2">
                  <div>
                    <p className="text-xs font-medium">{lead.company_name}</p>
                    {lead.website && <p className="text-[10px] text-muted-foreground">{lead.website}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">{lead.location || "—"}</TableCell>
                <TableCell className="py-2"><FitScoreBadge score={lead.fit_score} /></TableCell>
                <TableCell className="py-2">
                  {lead.intent_score != null ? <FitScoreBadge score={lead.intent_score} /> : <span className="text-[10px] text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={lead.status === "contacted" ? "default" : lead.status === "won" ? "default" : "secondary"} className="text-[10px]">
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toast.info("Company detail view coming soon")}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { updateLead.mutate({ id: lead.id, status: "pipeline" }); toast.success("Added to pipeline"); }}>
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { deleteLead.mutate(lead.id); toast.success("Removed"); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BusinessDropZone() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<{ name: string; type: string; size: number }[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upsert = useUpsertCompanyProfile();
  const { data: profile } = useCompanyProfile();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => [
      ...prev,
      ...arr.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    ]);
    toast.success(`${arr.length} file(s) added`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    // Check for dropped URLs (text/uri-list or text/plain)
    const droppedText = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (droppedText && /^https?:\/\//i.test(droppedText.trim())) {
      const url = droppedText.trim();
      if (!urls.includes(url)) {
        setUrls((prev) => [...prev, url]);
        toast.success("Website URL added");
      }
      return;
    }

    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [urls, addFiles]);

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (!urls.includes(url)) {
      setUrls((prev) => [...prev, url]);
    }
    setUrlInput("");
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const removeUrl = (idx: number) => setUrls((prev) => prev.filter((_, i) => i !== idx));

  const handleProcess = async () => {
    if (files.length === 0 && urls.length === 0) {
      toast.error("Add at least one document or website URL");
      return;
    }
    setProcessing(true);
    try {
      // Scrape websites for business data
      const scrapedData: any[] = [];
      for (const url of urls) {
        try {
          const { data } = await supabase.functions.invoke("scrape-website", {
            body: { url },
          });
          if (data?.extracted) scrapedData.push(data.extracted);
        } catch {
          // continue on error
        }
      }

      // Build profile from scraped data
      const merged: Partial<CompanyProfile> = {
        company_name: profile?.company_name || "",
        industry: profile?.industry || "",
        icp_description: profile?.icp_description || "",
        target_geos: profile?.target_geos || [],
        typical_deal_size: profile?.typical_deal_size || "",
        revenue_range: profile?.revenue_range || "",
        target_buyer_titles: profile?.target_buyer_titles || [],
        website_urls: [...(profile?.website_urls || []), ...urls.filter((u) => !(profile?.website_urls || []).includes(u))],
      };

      for (const scraped of scrapedData) {
        if (scraped.company_name && !merged.company_name) merged.company_name = scraped.company_name;
        if (scraped.industry && !merged.industry) merged.industry = scraped.industry;
        if (scraped.description && !merged.icp_description) merged.icp_description = scraped.description;
        if (scraped.revenue && !merged.revenue_range) merged.revenue_range = scraped.revenue;
      }

      await upsert.mutateAsync(merged as any);
      toast.success(`Profile updated with data from ${urls.length} website(s) and ${files.length} document(s)`);
      setFiles([]);
      setUrls([]);
    } catch (err: any) {
      toast.error(err.message || "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const hasItems = files.length > 0 || urls.length > 0;

  return (
    <Card className="border-dashed">
      <CardContent className="p-0">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-t-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-b-2 border-primary bg-primary/5"
              : "border-b border-border/50 bg-muted/20 hover:bg-muted/30"
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className={`h-8 w-8 mx-auto mb-2 ${dragOver ? "text-primary" : "text-muted-foreground/40"}`} />
          <p className="text-sm font-medium mb-1">
            {dragOver ? "Drop files or URLs here…" : "Drop business documents & website URLs"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDFs, pitch decks, business plans, or drag a website link directly
          </p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* URL input */}
        <div className="px-4 py-3 flex gap-2 items-center border-b border-border/50">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
            placeholder="Paste a website URL and press Enter…"
            className="h-8 text-xs flex-1"
          />
          <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={addUrl}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {/* Queued items */}
        {hasItems && (
          <div className="px-4 py-3 space-y-2">
            {files.map((f, i) => (
              <div key={`f-${i}`} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 font-medium">{f.name}</span>
                <span className="text-muted-foreground text-[10px] shrink-0">{formatSize(f.size)}</span>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {urls.map((u, i) => (
              <div key={`u-${i}`} className="flex items-center gap-2 text-xs bg-primary/5 rounded px-2 py-1.5">
                <Link className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate flex-1 text-primary">{u}</span>
                <button onClick={() => removeUrl(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button
              onClick={handleProcess}
              disabled={processing}
              className="w-full gap-1.5 mt-2"
              size="sm"
            >
              {processing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting business data…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Extract & Build Profile ({files.length + urls.length} source{files.length + urls.length !== 1 ? "s" : ""})</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeadGenerator() {
  const handleGenerate = (opts: any) => {
    toast.success(`Lead generation started — targeting ${opts.volume} leads in ${opts.geo}`);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone hero */}
      <BusinessDropZone />

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">AI-Powered Lead Generation</p>
            <p className="text-xs text-muted-foreground">
              Drop your business documents and website URLs above — AURA extracts your company data, builds your ICP, and sources leads from public web directories and data providers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <CompanyProfilePanel />
          <GenerateControls onGenerate={handleGenerate} />
        </div>
        <div className="lg:col-span-2">
          <ResultsTable />
        </div>
      </div>
    </div>
  );
}
