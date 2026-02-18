import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Trash2, FileText, ClipboardCopy, Loader2 } from "lucide-react";
import { generateRestaurantSupplement, generateContractorSupplement } from "@/lib/dummy-form-data";

export default function GeneratedForms() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formType, setFormType] = useState<string>("restaurant_supplement");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);

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

  const typeLabel = (t: string) =>
    t === "restaurant_supplement" ? "Restaurant Supplement" : "Contractor Supplement";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Form Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate dummy supplemental forms with realistic data, then reference them by ID in Chat to test extraction.
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

                  <div className="flex gap-2">
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
