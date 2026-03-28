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

export default function LeadGenerator() {
  const handleGenerate = (opts: any) => {
    toast.success(`Lead generation started — targeting ${opts.volume} leads in ${opts.geo}`);
    // In production, this would call an edge function that scrapes/enriches
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">AI-Powered Lead Generation</p>
            <p className="text-xs text-muted-foreground">
              Upload your company info and AURA searches public web sources, business registries, and data providers to build a live lead list tailored to your ICP.
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
