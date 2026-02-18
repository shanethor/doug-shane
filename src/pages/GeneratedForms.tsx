import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Trash2, FileText, ClipboardCopy, Loader2, FlaskConical, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { generateRestaurantSupplement, generateContractorSupplement } from "@/lib/dummy-form-data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ACORD_FORMS } from "@/lib/acord-forms";
import { buildAutofilledData, buildAutofilledDataWithAI } from "@/lib/acord-autofill";

type AcordFillResult = {
  formId: string;
  formName: string;
  totalFields: number;
  filledFields: number;
  fillRate: number;
  filledKeys: string[];
  emptyKeys: string[];
};

type BenchmarkResult = {
  form_id: string;
  form_type: string;
  display_name: string;
  accuracy: number;
  matched: number;
  partial: number;
  missed: number;
  extra: number;
  total_fields: number;
  missed_fields: string[];
  partial_fields: string[];
  details: Record<string, { expected: any; got: any; status: string }>;
  extracted_data?: Record<string, any>;
  acord_fill?: AcordFillResult[];
  error?: string;
};

type BenchmarkSummary = {
  total_forms: number;
  successful: number;
  failed: number;
  avg_accuracy: number;
  top_missed_fields: { field: string; count: number; pct: number }[];
};

export default function GeneratedForms() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formType, setFormType] = useState<string>("restaurant_supplement");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [training, setTraining] = useState(false);
  const [benchmarkSummary, setBenchmarkSummary] = useState<BenchmarkSummary | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [testingFormId, setTestingFormId] = useState<string | null>(null);
  const [cardWebsiteUrls, setCardWebsiteUrls] = useState<Record<string, string>>({});
  const [scrapingWebsite, setScrapingWebsite] = useState(false);
  const { data: forms, isLoading } = useQuery({
    queryKey: ["generated-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const handleGenerate = async () => {
    if (!session) return;
    setGenerating(true);
    try {
      const rows = [];
      for (let i = 0; i < count; i++) {
        const data = formType === "restaurant_supplement"
          ? generateRestaurantSupplement()
          : generateContractorSupplement();
        const label = formType === "restaurant_supplement"
          ? (data.named_insured || data.establishment_name)
          : data.applicant_name;
        rows.push({
          form_type: formType,
          form_data: data,
          display_name: label,
          user_id: session.user.id,
        });
      }
      const { error } = await supabase.from("generated_forms").insert(rows);
      if (error) throw error;
      toast({ title: `Generated ${count} form(s)` });
      queryClient.invalidateQueries({ queryKey: ["generated-forms"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("generated_forms").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["generated-forms"] });
    }
  };

  const handleDownload = (form: any) => {
    const blob = new Blob([JSON.stringify(form.form_data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.form_type}-${form.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "Copied", description: `Form ID ${id.slice(0, 8)}… copied to clipboard` });
  };

  /** Load agent profile and form defaults for autofill */
  const loadAgentProfile = async () => {
    if (!session) return { profile: null, formDefaults: null };
    const { data } = await supabase
      .from("profiles")
      .select("full_name, agency_name, phone, form_defaults")
      .eq("user_id", session.user.id)
      .single();
    if (!data) return { profile: null, formDefaults: null };
    const profile = { full_name: data.full_name, agency_name: data.agency_name, phone: data.phone };
    const formDefaults = (data.form_defaults && Object.keys(data.form_defaults as Record<string, string>).length > 0)
      ? data.form_defaults as Record<string, string>
      : null;
    return { profile, formDefaults };
  };

  /** Run extracted data through the ACORD autofill pipeline (with AI inference) to measure form fill coverage */
  const computeAcordFill = async (extractedData: Record<string, any>): Promise<AcordFillResult[]> => {
    const { profile, formDefaults } = await loadAgentProfile();
    const acordFormIds = ["acord-125", "acord-126", "acord-127", "acord-130", "acord-131", "acord-140"];
    const results: AcordFillResult[] = [];
    for (const formId of acordFormIds) {
      const form = ACORD_FORMS[formId];
      if (!form) {
        results.push({ formId, formName: formId, totalFields: 0, filledFields: 0, fillRate: 0, filledKeys: [], emptyKeys: [] });
        continue;
      }
      // Use AI-enhanced autofill with agent profile and defaults
      const { data: filled, aiInferredCount } = await buildAutofilledDataWithAI(form, extractedData, profile, formDefaults);
      const totalFields = form.fields.length;
      const filledKeys = Object.keys(filled).filter((k) => filled[k] !== "" && filled[k] !== null && filled[k] !== undefined);
      const emptyKeys = form.fields.map((f) => f.key).filter((k) => !filledKeys.includes(k));
      results.push({
        formId,
        formName: form.name,
        totalFields,
        filledFields: filledKeys.length,
        fillRate: totalFields > 0 ? Math.round((filledKeys.length / totalFields) * 100) : 0,
        filledKeys,
        emptyKeys,
      });
    }
    return results;
  };

  /** Enrich benchmark results with ACORD fill analysis */
  const enrichWithAcordFill = async (results: any[]): Promise<BenchmarkResult[]> => {
    const enriched: BenchmarkResult[] = [];
    for (const r of results) {
      if (r.error || !r.extracted_data) {
        enriched.push(r);
        continue;
      }
      const acord_fill = await computeAcordFill(r.extracted_data);
      enriched.push({ ...r, acord_fill });
    }
    return enriched;
  };

  const handleTestSingleForm = async (formId: string, websiteUrl?: string) => {
    if (!session) return;
    setTestingFormId(formId);
    try {
      const { data, error } = await supabase.functions.invoke("benchmark-extraction", {
        body: { form_ids: [formId] },
      });
      if (error) throw error;

      let results = data.results;

      // If a website URL was provided, scrape and merge data
      if (websiteUrl?.trim()) {
        setScrapingWebsite(true);
        try {
          const scrapeResp = await supabase.functions.invoke("scrape-website", {
            body: { url: websiteUrl.trim() },
          });
          if (!scrapeResp.error) {
            const websiteData = scrapeResp.data?.extracted_data || {};
            results = results.map((r: any) => ({
              ...r,
              extracted_data: { ...websiteData, ...(r.extracted_data || {}) },
            }));
            toast({ title: "Website scraped", description: `Merged ${Object.keys(websiteData).length} fields from website` });
          }
        } catch (scrapeErr) {
          console.warn("Website scrape failed:", scrapeErr);
          toast({ title: "Website scrape failed", description: "Continuing with supplement data only", variant: "destructive" });
        } finally {
          setScrapingWebsite(false);
        }
      }

      const enriched = await enrichWithAcordFill(results);
      setBenchmarkSummary(data.summary);
      setBenchmarkResults(enriched);
      setExpandedResult(enriched[0]?.form_id || null);
      const fillSummary = enriched[0]?.acord_fill;
      const avgFill = fillSummary ? Math.round(fillSummary.reduce((s: number, f: AcordFillResult) => s + f.fillRate, 0) / fillSummary.length) : 0;
      toast({ title: "Test complete", description: `${data.results[0]?.accuracy ?? 0}% extraction · ${avgFill}% avg ACORD fill (AI-enhanced)` });
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    } finally {
      setTestingFormId(null);
    }
  };

  const handleRunTraining = async () => {
    if (!session) return;
    setTraining(true);
    setBenchmarkSummary(null);
    setBenchmarkResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("benchmark-extraction", {
        body: { user_id: session.user.id },
      });
      if (error) throw error;
      const enriched = await enrichWithAcordFill(data.results);
      setBenchmarkSummary(data.summary);
      setBenchmarkResults(enriched);
      toast({ title: "Training complete", description: `${data.summary.avg_accuracy}% avg accuracy across ${data.summary.successful} forms (AI-enhanced)` });
    } catch (err: any) {
      toast({ title: "Training failed", description: err.message, variant: "destructive" });
    } finally {
      setTraining(false);
    }
  };

  const handleDownloadReport = () => {
    if (!benchmarkSummary || !benchmarkResults.length) return;
    const report = {
      timestamp: new Date().toISOString(),
      summary: benchmarkSummary,
      results: benchmarkResults,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extraction-benchmark-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabel = (t: string) =>
    t === "restaurant_supplement" ? "Restaurant Supplement" : "Contractor Supplement";

  const accuracyColor = (acc: number) => {
    if (acc >= 80) return "text-green-600";
    if (acc >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const accuracyBg = (acc: number) => {
    if (acc >= 80) return "bg-green-500";
    if (acc >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Form Generator & Training</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate dummy supplemental forms, then run extraction training to benchmark and improve AI data extraction coverage.
          </p>
        </div>

        {/* Generator controls */}
        <Card className="aura-glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generate Dummy Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Form Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant_supplement">Restaurant Supplement</SelectItem>
                    <SelectItem value="contractor_supplement">Contractor Supplement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="w-24"
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Training controls */}
        <Card className="aura-glass border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-accent" />
              Extraction Training
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Run all stored forms through the AI extraction pipeline, compare extracted data against ground truth, and identify gaps in coverage.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleRunTraining} disabled={training || !forms?.length} className="gap-2">
                {training ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                {training ? "Running Training…" : `Run Training (${forms?.length || 0} forms)`}
              </Button>
              {benchmarkSummary && (
                <Button variant="outline" size="sm" onClick={handleDownloadReport} className="gap-1.5 text-xs">
                  <Download className="h-3 w-3" /> Download Report
                </Button>
              )}
            </div>

            {training && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Processing forms through AI extraction… This may take a few minutes.</p>
                <Progress value={undefined} className="h-1.5" />
              </div>
            )}

            {/* Summary */}
            {benchmarkSummary && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{benchmarkSummary.avg_accuracy}%</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Accuracy</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{benchmarkSummary.successful}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Processed</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{benchmarkSummary.failed}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{benchmarkSummary.total_forms}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Forms</div>
                  </div>
                </div>

                {/* Top Missed Fields */}
                {benchmarkSummary.top_missed_fields.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Most Commonly Missed Fields</h3>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                      {benchmarkSummary.top_missed_fields.map((f) => (
                        <div key={f.field} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-foreground">{f.field}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-1.5">
                              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${f.pct}%` }} />
                            </div>
                            <span className="text-muted-foreground w-16 text-right">{f.count}/{benchmarkSummary.successful} ({f.pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-form results */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Per-Form Results</h3>
                  <div className="space-y-2">
                    {benchmarkResults.map((r) => (
                      <Collapsible key={r.form_id} open={expandedResult === r.form_id} onOpenChange={(open) => setExpandedResult(open ? r.form_id : null)}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between bg-muted/30 hover:bg-muted/50 rounded-lg p-3 text-left transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {r.error ? (
                                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                              ) : r.accuracy >= 80 ? (
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className="text-sm font-medium truncate block">{r.display_name}</span>
                                <span className="text-[10px] text-muted-foreground">{typeLabel(r.form_type)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {!r.error && (
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${accuracyColor(r.accuracy)}`}>{r.accuracy}%</span>
                                  <div className="hidden sm:flex items-center gap-1 text-[10px]">
                                    <span className="text-green-600">{r.matched}✓</span>
                                    <span className="text-yellow-600">{r.partial}~</span>
                                    <span className="text-red-600">{r.missed}✗</span>
                                  </div>
                                </div>
                              )}
                              {r.error && <span className="text-xs text-red-500">Error</span>}
                              {expandedResult === r.form_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {r.error ? (
                            <div className="p-3 text-xs text-red-500">{r.error}</div>
                          ) : (
                            <div className="p-3 space-y-4">
                              {/* Extraction accuracy */}
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Data Extraction</h4>
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div className={`${accuracyBg(r.accuracy)} h-2 rounded-full transition-all`} style={{ width: `${r.accuracy}%` }} />
                                  </div>
                                  <span className="text-xs font-mono shrink-0">{r.matched + r.partial}/{r.total_fields}</span>
                                </div>
                              </div>

                              {/* ACORD Form Fill Rates */}
                              {r.acord_fill && r.acord_fill.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">ACORD Form Fill Coverage</h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {r.acord_fill.map((af) => (
                                      <div key={af.formId} className="bg-muted/40 rounded-lg p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-semibold text-foreground">{af.formName}</span>
                                          <span className={`text-xs font-bold ${accuracyColor(af.fillRate)}`}>{af.fillRate}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                                          <div className={`${accuracyBg(af.fillRate)} h-1.5 rounded-full transition-all`} style={{ width: `${af.fillRate}%` }} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{af.filledFields}/{af.totalFields} fields</span>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Unfilled fields summary */}
                                  {r.acord_fill.some((af) => af.emptyKeys.length > 0) && (
                                    <Collapsible className="mt-2">
                                      <CollapsibleTrigger asChild>
                                        <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                          <ChevronDown className="h-3 w-3" /> Show unfilled ACORD fields
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                                          {r.acord_fill.filter((af) => af.emptyKeys.length > 0).map((af) => (
                                            <div key={af.formId}>
                                              <span className="text-[10px] font-semibold text-foreground">{af.formName}</span>
                                              <span className="text-[10px] text-muted-foreground ml-1">({af.emptyKeys.length} empty)</span>
                                              <div className="flex flex-wrap gap-1 mt-0.5">
                                                {af.emptyKeys.slice(0, 20).map((k) => (
                                                  <span key={k} className="text-[9px] font-mono bg-muted rounded px-1 py-0.5">{k}</span>
                                                ))}
                                                {af.emptyKeys.length > 20 && (
                                                  <span className="text-[9px] text-muted-foreground">+{af.emptyKeys.length - 20} more</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                </div>
                              )}

                              {/* Field-level details table */}
                              {r.details && Object.keys(r.details).length > 0 && (
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                      <ChevronDown className="h-3 w-3" /> Show extraction field details
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="overflow-x-auto mt-2">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-1 px-2 font-medium text-muted-foreground">Field</th>
                                            <th className="text-left py-1 px-2 font-medium text-muted-foreground">Expected</th>
                                            <th className="text-left py-1 px-2 font-medium text-muted-foreground">Extracted</th>
                                            <th className="text-center py-1 px-2 font-medium text-muted-foreground">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(r.details)
                                            .sort(([, a], [, b]) => {
                                              const order = { missed: 0, mismatch: 1, partial: 2, match: 3 };
                                              return (order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4);
                                            })
                                            .map(([field, detail]) => (
                                              <tr key={field} className="border-b border-muted/50">
                                                <td className="py-1 px-2 font-mono">{field}</td>
                                                <td className="py-1 px-2 max-w-[200px] truncate">{typeof detail.expected === "object" ? JSON.stringify(detail.expected) : String(detail.expected)}</td>
                                                <td className="py-1 px-2 max-w-[200px] truncate">{detail.got === null ? "—" : typeof detail.got === "object" ? JSON.stringify(detail.got) : String(detail.got)}</td>
                                                <td className="py-1 px-2 text-center">
                                                  {detail.status === "match" && <CheckCircle className="h-3 w-3 text-green-500 inline" />}
                                                  {detail.status === "partial" && <AlertTriangle className="h-3 w-3 text-yellow-500 inline" />}
                                                  {detail.status === "mismatch" && <AlertTriangle className="h-3 w-3 text-orange-500 inline" />}
                                                  {detail.status === "missed" && <XCircle className="h-3 w-3 text-red-500 inline" />}
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}

                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stored forms */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Stored Forms {forms && <span className="text-muted-foreground font-normal text-sm">({forms.length})</span>}
          </h2>

          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {forms && forms.length === 0 && (
            <p className="text-sm text-muted-foreground">No forms generated yet. Use the controls above to create some.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {forms?.map((form: any) => (
              <Card key={form.id} className="aura-glass group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-medium text-sm truncate">{form.display_name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {typeLabel(form.form_type)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1">
                    <span className="truncate">{form.id}</span>
                    <button onClick={() => handleCopyId(form.id)} className="shrink-0 hover:text-foreground transition-colors">
                      <ClipboardCopy className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    {new Date(form.created_at).toLocaleDateString()} {new Date(form.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Website URL input */}
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={cardWebsiteUrls[form.id] || ""}
                      onChange={(e) => setCardWebsiteUrls((prev) => ({ ...prev, [form.id]: e.target.value }))}
                      placeholder="Company website URL (optional)"
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      disabled={testingFormId === form.id || scrapingWebsite}
                      onClick={() => handleTestSingleForm(form.id, cardWebsiteUrls[form.id])}
                    >
                      {testingFormId === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
                      {testingFormId === form.id && scrapingWebsite ? "Scraping…" : testingFormId === form.id ? "Testing…" : cardWebsiteUrls[form.id]?.trim() ? "Test + Scrape" : "Test"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => handleDownload(form)}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs" onClick={() => handleDelete(form.id)}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
