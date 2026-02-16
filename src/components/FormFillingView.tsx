import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACORD_FORMS, ACORD_FORM_LIST, type AcordFormField, type AcordFormDefinition } from "@/lib/acord-forms";
import { buildAutofilledData } from "@/lib/acord-autofill";
import { generateAcordPdf, generateAcordPdfAsync } from "@/lib/pdf-generator";
import { generateSubmissionPackage } from "@/lib/submission-package";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Send, Paperclip, Loader2, FileText, CheckCircle, X, Filter, Eye, Image } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

interface FormFillingViewProps {
  submissionId: string;
  initialMessages: Msg[];
  initialFormId?: string;
  onBack: () => void;
}

type FieldFilter = "all" | "filled" | "empty";
type CenterView = "form" | "data";

export default function FormFillingView({ submissionId, initialMessages, initialFormId, onBack }: FormFillingViewProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeFormId, setActiveFormId] = useState(initialFormId || "acord-125");
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>("all");
  const [centerView, setCenterView] = useState<CenterView>("form");

  // Chat state
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeForm = ACORD_FORMS[activeFormId];

  // Load application data
  useEffect(() => {
    if (!user || !submissionId) return;
    const load = async () => {
      const [appResult, profileResult] = await Promise.all([
        supabase
          .from("insurance_applications")
          .select("form_data")
          .eq("submission_id", submissionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, agency_name, phone, form_defaults")
          .eq("user_id", user.id)
          .single(),
      ]);

      const aiData = (appResult.data?.form_data || {}) as Record<string, any>;
      const defaults = (profileResult.data?.form_defaults || {}) as Record<string, string>;

      // Merge all form fields into one data set
      const merged: Record<string, any> = {};
      for (const form of ACORD_FORM_LIST) {
        const filled = buildAutofilledData(form, aiData, profileResult.data);
        Object.assign(merged, filled);
      }
      // Apply defaults
      for (const [k, v] of Object.entries(defaults)) {
        if (v && !merged[k]) merged[k] = v;
      }
      // Also keep raw AI data for fields not covered by forms
      for (const [k, v] of Object.entries(aiData)) {
        if (!merged[k] && v) merged[k] = v;
      }

      setFormData(merged);
      setLoading(false);
    };
    load();
  }, [user, submissionId]);

  const scrollChatToBottom = useCallback(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollChatToBottom(); }, [messages, scrollChatToBottom]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Send chat message
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) throw new Error("Chat failed");
      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              const currentText = fullText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: currentText };
                return updated;
              });
            }
          } catch { break; }
        }
      }

      // Check if AI response contains field updates (key: value patterns)
      parseAndApplyFieldUpdates(fullText);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to send message");
    }
    setIsLoading(false);
  };

  // Try to extract field values from AI response
  const parseAndApplyFieldUpdates = (text: string) => {
    // Look for patterns like "field_key: value" that match known form fields
    const allKeys = new Set(ACORD_FORM_LIST.flatMap((f) => f.fields.map((field) => field.key)));
    const lines = text.split("\n");
    const updates: Record<string, string> = {};

    for (const line of lines) {
      // Match: - **field_key**: value, field_key: value, field_key = value, * field_key: value
      const match = line.match(/^\s*[-•*]?\s*\*{0,2}([a-z_][a-z0-9_]*)\*{0,2}\s*[:=]\s*(.+)/i);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, "_");
        if (allKeys.has(key)) {
          let val = match[2].trim().replace(/^["'`]|["'`]$/g, "").replace(/\*{1,2}$/g, "").trim();
          if (val) updates[key] = val;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success(`Updated ${Object.keys(updates).length} field(s) from chat`);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const downloadForms = async (mode: "individual" | "package") => {
    if (!user) return;
    setDownloading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, phone")
        .eq("user_id", user.id)
        .single();

      const forms = ACORD_FORM_LIST;
      const results: { form: AcordFormDefinition; data: Record<string, any> }[] = [];

      for (const form of forms) {
        const data: Record<string, any> = {};
        for (const field of form.fields) {
          if (formData[field.key]) data[field.key] = formData[field.key];
        }
        const filledCount = Object.values(data).filter((v) => v && String(v).trim()).length;
        if (filledCount > 3) results.push({ form, data });
      }

      if (results.length === 0) {
        toast.error("No forms have enough data to download.");
        setDownloading(false);
        return;
      }

      if (mode === "individual") {
        for (let i = 0; i < results.length; i++) {
          const { form, data } = results[i];
          const pdf = await generateAcordPdfAsync(form, data);
          pdf.save(`${form.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
          if (i < results.length - 1) await new Promise((r) => setTimeout(r, 600));
        }
        toast.success(`${results.length} form(s) downloaded.`);
      } else {
        const companyName = formData.applicant_name || formData.insured_name || "Submission";
        const pkg = generateSubmissionPackage({
          companyName,
          narrative: "",
          agencyName: profile?.agency_name || "",
          producerName: profile?.full_name || "",
          coverageLines: [],
          forms: results,
          effectiveDate: formData.effective_date || formData.proposed_eff_date || "",
        });
        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
        pkg.save(`Submission_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success("Submission package downloaded!");
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download");
    }
    setDownloading(false);
  };

  // Save form data back to DB
  const saveFormData = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("insurance_applications")
      .update({ form_data: formData })
      .eq("submission_id", submissionId)
      .eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Progress saved!");
  };

  const renderField = (field: AcordFormField) => {
    const value = formData[field.key];
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            rows={2}
            className="text-xs"
          />
        );
      case "select":
        return (
          <Select value={value || ""} onValueChange={(v) => handleFieldChange(field.key, v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}</SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={(checked) => handleFieldChange(field.key, checked)} />
            <span className="text-xs">{field.label}</span>
          </div>
        );
      default:
        return (
          <Input
            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
            value={value || ""}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.type === "currency" ? "$0.00" : ""}
            className="h-8 text-xs"
          />
        );
    }
  };

  // Group fields by section
  const getFilteredSections = () => {
    if (!activeForm) return [];
    const sections: { name: string; fields: AcordFormField[] }[] = [];
    const seen = new Set<string>();
    for (const field of activeForm.fields) {
      if (!seen.has(field.section)) {
        seen.add(field.section);
        let sectionFields = activeForm.fields.filter((f) => f.section === field.section);
        if (fieldFilter === "filled") {
          sectionFields = sectionFields.filter((f) => formData[f.key] && String(formData[f.key]).trim());
        } else if (fieldFilter === "empty") {
          sectionFields = sectionFields.filter((f) => !formData[f.key] || !String(formData[f.key]).trim());
        }
        if (sectionFields.length > 0) {
          sections.push({ name: field.section, fields: sectionFields });
        }
      }
    }
    return sections;
  };

  const filledCount = activeForm?.fields.filter((f) => formData[f.key] && String(formData[f.key]).trim()).length || 0;
  const totalCount = activeForm?.fields.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* LEFT PANEL — Editable Fields */}
      <div className="w-[300px] border-r flex flex-col bg-background shrink-0">
        {/* Form selector tabs */}
        <div className="border-b p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Instrument Serif', serif" }}>Form Fields</h2>
            <Badge variant="secondary" className="text-[10px]">{filledCount}/{totalCount}</Badge>
          </div>
          <div className="flex gap-1 flex-wrap">
            {ACORD_FORM_LIST.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFormId(f.id)}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  activeFormId === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-accent/50"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["all", "filled", "empty"] as FieldFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setFieldFilter(filter)}
                className={`text-[10px] px-2 py-0.5 rounded capitalize transition-colors ${
                  fieldFilter === filter
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-3 pt-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Fields */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {getFilteredSections().map((section) => (
              <div key={section.name}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {section.name}
                </h3>
                <div className="space-y-2">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-0.5">
                      {field.type !== "checkbox" && (
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          {field.required && <span className="text-destructive">*</span>}
                          {field.label}
                        </Label>
                      )}
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Save + Download buttons */}
        <div className="border-t p-3 space-y-2">
          <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={saveFormData}>
            Save Progress
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 text-xs h-8"
              disabled={downloading}
              onClick={() => downloadForms("individual")}
            >
              {downloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Forms
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-8"
              disabled={downloading}
              onClick={() => downloadForms("package")}
            >
              {downloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
              Package
            </Button>
          </div>
        </div>
      </div>

      {/* CENTER PANEL — Form Preview */}
      <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
        <div className="border-b p-3 flex items-center justify-between bg-background">
          <div>
            <h2 className="text-sm font-semibold">{activeForm?.name}</h2>
            <p className="text-[10px] text-muted-foreground">{activeForm?.fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            {filledCount === totalCount && totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" />Complete
              </Badge>
            )}
            {activeForm?.pages && activeForm.pages.length > 0 && (
              <div className="flex rounded-md border overflow-hidden">
                <button
                  onClick={() => setCenterView("form")}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 transition-colors ${
                    centerView === "form" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent/50"
                  }`}
                >
                  <Image className="h-3 w-3" />Form
                </button>
                <button
                  onClick={() => setCenterView("data")}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 transition-colors ${
                    centerView === "data" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent/50"
                  }`}
                >
                  <Eye className="h-3 w-3" />Live Data
                </button>
              </div>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {activeForm?.pages && activeForm.pages.length > 0 && centerView === "form" ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                {activeForm.pages.map((pageSrc, idx) => (
                  <div key={idx} className="bg-background border rounded shadow-sm overflow-hidden">
                    <img
                      src={pageSrc}
                      alt={`${activeForm.name} Page ${idx + 1}`}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                    <div className="bg-muted/50 text-center py-1">
                      <span className="text-[10px] text-muted-foreground">Page {idx + 1} of {activeForm.pages!.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-background border rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
                <div className="text-center border-b pb-4 mb-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">ACORD®</p>
                  <h1 className="text-lg font-bold">{activeForm?.fullName?.toUpperCase()}</h1>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Generated {new Date().toLocaleDateString()}
                  </p>
                </div>
                {activeForm && (() => {
                  const sections: { name: string; fields: AcordFormField[] }[] = [];
                  const seen = new Set<string>();
                  for (const field of activeForm.fields) {
                    if (!seen.has(field.section)) {
                      seen.add(field.section);
                      sections.push({ name: field.section, fields: activeForm.fields.filter((f) => f.section === field.section) });
                    }
                  }
                  return sections.map((section) => (
                    <div key={section.name} className="mb-6">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-primary/30 pb-1 mb-3">
                        {section.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {section.fields.map((field) => {
                          const value = formData[field.key];
                          const hasValue = value && String(value).trim();
                          const isFullWidth = field.type === "textarea";
                          return (
                            <div key={field.key} className={`${isFullWidth ? "col-span-2" : ""}`}>
                              <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">
                                {field.label}
                              </p>
                              <p className={`text-xs border-b pb-1 min-h-[1.25rem] ${
                                hasValue ? "text-foreground" : "text-muted-foreground/40 italic"
                              }`}>
                                {hasValue
                                  ? (Array.isArray(value) ? value.join(", ") : String(value))
                                  : "—"
                                }
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT PANEL — Chat */}
      <div className="w-[340px] border-l flex flex-col bg-background shrink-0">
        <div className="border-b p-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ fontFamily: "'Instrument Serif', serif" }}>Chat</h2>
          <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={onBack}>
            ← Back
          </Button>
        </div>

        {/* Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-lg px-3 py-2 max-w-[90%] text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground prose prose-xs max-w-none"
              }`}>
                {m.role === "assistant" ? (
                  <ReactMarkdown>{m.content.replace(/\[FIELD:[^\]]+\]/g, "").replace(/\[BUTTON:[^\]]+\]/g, "").replace(/\[SUBMISSION_ID:[^\]]+\]/g, "").trim()}</ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="border-t bg-muted/30 px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 rounded-md bg-card border px-2 py-1 text-[10px]">
                  <Paperclip className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="max-w-[80px] truncate">{f.name}</span>
                  <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-1.5 rounded-lg border bg-card p-2">
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
              if (e.target.files) {
                setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 10));
              }
            }} />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-3 w-3" />
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask about fields or upload docs..."
              rows={3}
              className="flex-1 resize-none bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground min-h-[56px] max-h-28 py-1"
            />
            <Button
              onClick={() => {
                let content = input.trim();
                if (attachedFiles.length > 0) {
                  content += `\n\n[${attachedFiles.length} file(s) attached: ${attachedFiles.map((f) => f.name).join(", ")}]`;
                  setAttachedFiles([]);
                }
                sendMessage(content);
              }}
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              size="icon"
              className="shrink-0 h-7 w-7"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
