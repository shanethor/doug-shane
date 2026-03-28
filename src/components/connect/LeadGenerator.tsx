import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import LeadOutreachPanel from "./LeadOutreachPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Rocket, Building2, Globe, MapPin, Target, Search, FileText,
  Download, Plus, ArrowUpRight, Eye, Trash2, Zap, Edit2,
  CheckCircle2, AlertCircle, Sparkles, Users, TrendingUp,
  Upload, Link, File, X, Loader2, Mail, Phone, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCompanyProfile, useUpsertCompanyProfile,
  type CompanyProfile,
} from "@/hooks/useLeadsHub";
import {
  useEngineLeads, useUpdateEngineLead, useDeleteEngineLead,
  type EngineLead,
} from "@/hooks/useLeadEngine";

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

const FOCUS_TO_SOURCE: Record<string, string> = {
  new_business: "Business Filings",
  social: "Reddit",
  linkedin: "LinkedIn",
  permits: "Permit Database",
};

const LEAD_PACKS = [
  { leads: 10,  price: 200,  originalPrice: 330,  perLead: 20,  popular: false },
  { leads: 25,  price: 475,  originalPrice: 790,  perLead: 19,  popular: false },
  { leads: 50,  price: 900,  originalPrice: 1500, perLead: 18,  popular: true },
  { leads: 100, price: 1500, originalPrice: 2500, perLead: 15,  popular: false },
];

function GenerateControls({ onGenerate }: { onGenerate: (opts: any) => void }) {
  const [geo, setGeo] = useState("All States");
  const [focus, setFocus] = useState("new_business");
  const [selectedPack, setSelectedPack] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { data: profile } = useCompanyProfile();

  const handleGenerate = async () => {
    if (!profile?.icp_description && !profile?.industry) {
      toast.error("Set up your company profile first so AURA knows what leads to find");
      return;
    }
    setGenerating(true);
    try {
      const source = FOCUS_TO_SOURCE[focus] || "Business Filings";
      const states = geo === "All States" ? [] : [geo];
      const settings: Record<string, string> = {
        states: states.join(", ") || "NY, CA, TX, FL",
        industries: profile?.industry || "Construction, Restaurant, Retail",
        keywords: profile?.icp_description?.slice(0, 100) || "new business insurance",
        entity_types: "LLC, Corp",
      };
      const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
        body: { source, settings, enrich: true },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const count = data?.leads_found ?? 0;
      onGenerate({ geo, volume: selectedPack, focus, leads_found: count });
      if (count > 0) {
        toast.success(`Found ${count} new enriched leads from ${source}`);
      } else {
        toast.info(data?.message || "No leads found this scan — try a different focus or geography");
      }
    } catch (err: any) {
      toast.error(err.message || "Lead generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lead-checkout", {
        body: { pack: selectedPack },
      });
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pricing tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Lead Packages
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Enriched leads with full company & contact profiles via Apollo, Hunter & PDL</p>
          <Badge variant="outline" className="text-[9px] mt-1 text-emerald-600 border-emerald-600/30">🎉 Connect Member — 40% discount applied</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {LEAD_PACKS.map((pack) => (
            <button
              key={pack.leads}
              onClick={() => setSelectedPack(pack.leads)}
              className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                selectedPack === pack.leads
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  selectedPack === pack.leads ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {pack.leads}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{pack.leads} Leads</span>
                    {pack.popular && <Badge className="text-[9px] px-1.5 py-0">Most Popular</Badge>}
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-emerald-600">40% Off</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">${pack.perLead}/lead • Full enrichment</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground line-through">${pack.originalPrice.toLocaleString()}</span>
                <span className="text-sm font-bold ml-1.5">${pack.price.toLocaleString()}</span>
              </div>
            </button>
          ))}
          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full gap-1.5 mt-2"
          >
            {purchasing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
            ) : (
              <>Purchase {selectedPack} Leads — ${LEAD_PACKS.find(p => p.leads === selectedPack)?.price.toLocaleString()}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generate controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Targeting
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
                  <SelectItem value="new_business">New Business Filings</SelectItem>
                  <SelectItem value="permits">Permit Database</SelectItem>
                  <SelectItem value="social">Reddit Signals</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-1.5">
            {generating ? (
              <><Sparkles className="h-4 w-4 animate-pulse" /> Generating enriched leads…</>
            ) : (
              <><Zap className="h-4 w-4" /> Generate Leads</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Each lead is enriched with company data, contacts, social profiles, and verified emails via Apollo, Hunter & PDL.
          </p>
        </CardContent>
      </Card>
    </div>
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
  const { data: leads, isLoading } = useEngineLeads();
  const updateLead = useUpdateEngineLead();
  const deleteLead = useDeleteEngineLead();
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<EngineLead | null>(null);

  const filtered = (leads || []).filter((l: EngineLead) =>
    !search ||
    l.company.toLowerCase().includes(search.toLowerCase()) ||
    l.state?.toLowerCase().includes(search.toLowerCase()) ||
    l.industry?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (!leads?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No generated leads yet</p>
          <p className="text-xs text-muted-foreground">Set up your company profile and generate leads above</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Company</TableHead>
              <TableHead className="text-xs">Industry</TableHead>
              <TableHead className="text-xs">State</TableHead>
              <TableHead className="text-xs">Est. Premium</TableHead>
              <TableHead className="text-xs">Score</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead: EngineLead) => (
              <TableRow key={lead.id}>
                <TableCell className="py-2">
                  <div
                    className="cursor-pointer group"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <p className="text-xs font-medium group-hover:text-primary transition-colors">{lead.company}</p>
                    {lead.contact_name && <p className="text-[10px] text-muted-foreground">{lead.contact_name}</p>}
                    {lead.signal && <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[200px] truncate" title={lead.signal}>{lead.signal}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">{lead.industry || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">{lead.state || "—"}</TableCell>
                <TableCell className="text-xs py-2">${(lead.est_premium || 0).toLocaleString()}</TableCell>
                <TableCell className="py-2"><FitScoreBadge score={lead.score || 0} /></TableCell>
                <TableCell className="py-2">
                  <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                </TableCell>
                <TableCell className="text-right py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedLead(lead)}>
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

    {/* Lead outreach panel */}
    {selectedLead && (
      <LeadOutreachPanel
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    )}
    </>
  );
}

function BusinessDropZone() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<{ name: string; type: string; size: number; raw?: File }[]>([]);
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
      ...arr.map((f) => ({ name: f.name, type: f.type, size: f.size, raw: f })),
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
      const scrapedData: any[] = [];

      // Scrape websites for business data
      for (const url of urls) {
        try {
          const { data, error } = await supabase.functions.invoke("scrape-website", {
            body: { url },
          });
          if (error) console.warn("Scrape error for", url, error);
          // scrape-website returns { extracted_data: {...}, scraped_content: "..." }
          if (data?.extracted_data && Object.keys(data.extracted_data).length > 0) {
            scrapedData.push(data.extracted_data);
          } else if (data?.scraped_content) {
            // Fallback: use raw scraped content as ICP description
            scrapedData.push({ raw_content: data.scraped_content.slice(0, 500) });
          }
        } catch (e) {
          console.warn("Scrape failed for", url, e);
        }
      }

      // Process uploaded documents — read all file types and extract business data via AI
      for (const file of files) {
        if (!file.raw) continue;
        try {
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          const isText = file.type === "text/plain" || file.type === "text/csv" ||
            file.name.endsWith(".txt") || file.name.endsWith(".csv");

          if (isText) {
            // Read plain text directly
            const text = await file.raw.text();
            if (text.trim()) scrapedData.push({ raw_content: text.slice(0, 2000) });
          } else {
            // For PDF, DOCX, PPTX — read as base64 and send to Gemini vision
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                // Strip the data URL prefix: "data:application/pdf;base64,"
                resolve(result.split(",")[1] || "");
              };
              reader.onerror = reject;
              reader.readAsDataURL(file.raw!);
            });

            if (!base64) continue;

            // Determine MIME type for Gemini
            const mimeType = isPdf ? "application/pdf" :
              file.name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
              file.name.endsWith(".pptx") ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" :
              file.type || "application/octet-stream";

            // Call Gemini directly via the AI gateway to extract business profile data
            const { data: aiResult, error: aiErr } = await supabase.functions.invoke("spotlight-flyer", {
              body: {
                action: "extract_document_profile",
                file_base64: base64,
                file_mime: mimeType,
                file_name: file.name,
              },
            });

            if (aiErr) console.warn("Doc extraction error:", aiErr);
            if (aiResult?.profile) scrapedData.push(aiResult.profile);
            else if (aiResult?.raw_content) scrapedData.push({ raw_content: aiResult.raw_content });
          }
        } catch (e) {
          console.warn("File processing failed:", file.name, e);
        }
      }

      // Build profile from scraped data — correct field mapping
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
        // Handles both scrape-website fields and extract_document_profile fields
        const name = scraped.applicant_name || scraped.company_name;
        if (name && !merged.company_name) merged.company_name = name;

        const industry = scraped.business_category || scraped.industry || scraped.naics_description;
        if (industry && !merged.industry) merged.industry = industry;

        const ops = scraped.description_of_operations || scraped.description || scraped.target_customers || scraped.raw_content;
        if (ops && !merged.icp_description) merged.icp_description = String(ops).slice(0, 400);

        const revenue = scraped.annual_revenue || scraped.revenue_range || scraped.revenue;
        if (revenue && !merged.revenue_range) merged.revenue_range = String(revenue);

        const state = scraped.state;
        if (state && !(merged.target_geos || []).includes(state)) {
          merged.target_geos = [...(merged.target_geos || []), state];
        }

        const dealSize = scraped.deal_size || scraped.typical_deal_size;
        if (dealSize && !merged.typical_deal_size) merged.typical_deal_size = String(dealSize);

        // Extract target buyer titles from key_products_services or target_customers hints
        if (scraped.target_customers && !merged.target_buyer_titles?.length) {
          // Try to parse buyer roles from the description
          const roles = ["CEO", "CFO", "COO", "Owner", "President", "VP", "Director", "Manager"];
          const mentioned = roles.filter(r => String(scraped.target_customers).includes(r));
          if (mentioned.length > 0) merged.target_buyer_titles = mentioned;
        }
      }

      await upsert.mutateAsync(merged as any);

      const populated = Object.entries(merged)
        .filter(([k, v]) => k !== "website_urls" && v && (Array.isArray(v) ? v.length > 0 : String(v).trim()))
        .length;

      if (populated > 1) {
        toast.success(`Profile built from ${urls.length} website(s) — ${populated} fields populated`);
      } else {
        toast.info("Website scraped but limited data found. Try filling in your profile manually or add more sources.");
      }
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
  const qc = useQueryClient();
  const handleGenerate = (_opts: any) => {
    // Refresh leads table after generation completes
    setTimeout(() => qc.invalidateQueries({ queryKey: ["engine-leads"] }), 1500);
    setTimeout(() => qc.invalidateQueries({ queryKey: ["engine-leads"] }), 4000); // second refresh for slower connections
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
