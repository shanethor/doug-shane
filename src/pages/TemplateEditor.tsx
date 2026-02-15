import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AcordFormField } from "@/lib/acord-forms";

const FIELD_TYPES: AcordFormField["type"][] = ["text", "textarea", "select", "checkbox", "date", "number", "currency"];

export default function TemplateEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New template state
  const [formId, setFormId] = useState("");
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<AcordFormField[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("custom_form_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTemplates(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { key: "", label: "", type: "text", section: "General", required: false },
    ]);
  };

  const updateField = (index: number, updates: Partial<AcordFormField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const autoGenerateKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40);
  };

  const saveTemplate = async () => {
    if (!user) return;
    if (!formId || !name || fields.length === 0) {
      toast.error("Please fill in form ID, name, and at least one field.");
      return;
    }

    // Validate all fields have keys and labels
    const invalidFields = fields.filter((f) => !f.key || !f.label);
    if (invalidFields.length > 0) {
      toast.error("All fields must have a key and label.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("custom_form_templates").insert({
      user_id: user.id,
      form_id: formId,
      name,
      full_name: fullName || name,
      description: description || "",
      fields: fields as any,
    });

    if (error) {
      toast.error("Failed to save template");
      console.error(error);
    } else {
      toast.success("Template saved! It's now available in your form library.");
      // Reset
      setFormId("");
      setName("");
      setFullName("");
      setDescription("");
      setFields([]);
      // Reload
      const { data } = await supabase
        .from("custom_form_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setTemplates(data ?? []);
    }
    setSaving(false);
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("custom_form_templates").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Template deleted");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl mb-2">Form Templates</h1>
        <p className="text-muted-foreground font-sans text-sm mb-8">
          Create custom ACORD form templates. These appear alongside the built-in forms when building submissions.
        </p>

        {/* Existing Templates */}
        {templates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl mb-4">Your Templates</h2>
            <div className="grid gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm font-sans">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {(t.fields as any[])?.length || 0} fields
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">
                      {t.full_name} · {t.form_id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(t.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-sans">Create New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Form ID *
                </Label>
                <Input
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="acord-137"
                />
                <p className="text-[10px] text-muted-foreground">Unique identifier (e.g., acord-137)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Short Name *
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ACORD 137"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Commercial Auto State Coverage"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this form covers…"
                  rows={2}
                />
              </div>
            </div>

            {/* Fields */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium font-sans">Fields ({fields.length})</h3>
                <Button type="button" size="sm" variant="outline" onClick={addField} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans text-center py-6">
                  No fields yet. Click "Add Field" to start building your template.
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3 bg-muted/30">
                      <div className="col-span-4 space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            updateField(i, {
                              label,
                              key: field.key || autoGenerateKey(label),
                            });
                          }}
                          placeholder="Field Label"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Key</Label>
                        <Input
                          value={field.key}
                          onChange={(e) => updateField(i, { key: e.target.value })}
                          placeholder="field_key"
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(v) => updateField(i, { type: v as any })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Section</Label>
                        <Input
                          value={field.section}
                          onChange={(e) => updateField(i, { section: e.target.value })}
                          placeholder="Section"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(i)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={saveTemplate}
              disabled={saving || !formId || !name || fields.length === 0}
              className="w-full h-12 mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
