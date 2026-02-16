import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import SubmissionReviewPanel from "@/components/SubmissionReviewPanel";
import { Send, FileUp, ClipboardList, Search, Loader2, Paperclip, X, Download, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ACORD_FORM_LIST } from "@/lib/acord-forms";
import { buildAutofilledData } from "@/lib/acord-autofill";
import { generateAcordPdf } from "@/lib/pdf-generator";
import { generateSubmissionPackage } from "@/lib/submission-package";
import { useAuth } from "@/hooks/useAuth";

type ButtonMarker = { label: string; action: string };
type Msg = { role: "user" | "assistant"; content: string; fields?: FieldBubble[]; buttons?: ButtonMarker[] };
type FieldBubble = { label: string; placeholder: string; key: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

const SUGGESTIONS = [
  { icon: FileUp, label: "Submit a new client", message: "I want to submit a new client for coverage." },
  { icon: ClipboardList, label: "Fill an ACORD form", message: "Help me fill out an ACORD form for a client." },
  { icon: Search, label: "Review a submission", message: "I need to review an existing client submission." },
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("No response stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

/** Parse assistant text for field markers like [FIELD:Label:placeholder:key] */
function parseFields(text: string): FieldBubble[] {
  const regex = /\[FIELD:([^:]+):([^:]+):([^\]]+)\]/g;
  const fields: FieldBubble[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    fields.push({ label: m[1], placeholder: m[2], key: m[3] });
  }
  return fields;
}

function parseButtons(text: string): ButtonMarker[] {
  const regex = /\[BUTTON:([^:]+):([^\]]+)\]/g;
  const buttons: ButtonMarker[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    buttons.push({ label: m[1], action: m[2] });
  }
  return buttons;
}

function stripMarkers(text: string): string {
  return text.replace(/\[FIELD:[^\]]+\]/g, "").replace(/\[BUTTON:[^\]]+\]/g, "").trim();
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [displayedText, setDisplayedText] = useState(""); // typewriter buffer
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullTextRef = useRef(""); // full streamed text so far
  const typewriterRef = useRef<number | null>(null);
  const streamDoneRef = useRef(false); // true once SSE finishes
  const onFinishRef = useRef<(() => void) | null>(null); // callback when typewriter catches up
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadSubmission = async (subId: string, mode: "individual" | "package" = "package") => {
    if (!user) return;
    setDownloadingId(subId);
    try {
      const { data: app } = await supabase
        .from("insurance_applications")
        .select("*")
        .eq("submission_id", subId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!app) { toast({ variant: "destructive", title: "Error", description: "Application not found" }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, phone, form_defaults")
        .eq("user_id", user.id)
        .single();

      const aiData = (app.form_data || {}) as Record<string, any>;
      const defaults = (profile?.form_defaults || {}) as Record<string, string>;

      // Use all forms for download
      const forms = ACORD_FORM_LIST;
      const results: { form: typeof forms[0]; data: Record<string, any> }[] = [];

      for (const form of forms) {
        let filled = buildAutofilledData(form, aiData, profile);
        for (const [k, v] of Object.entries(defaults)) {
          if (v && (!filled[k] || (typeof filled[k] === "string" && !filled[k].trim()))) {
            filled[k] = v;
          }
        }
        // Only include forms that have meaningful data
        const filledCount = Object.values(filled).filter(v => v && String(v).trim()).length;
        if (filledCount > 3) results.push({ form, data: filled });
      }

      if (results.length === 0) {
        toast({ variant: "destructive", title: "No forms", description: "No forms have enough data to download." });
        return;
      }

      if (mode === "individual") {
        for (let i = 0; i < results.length; i++) {
          const { form, data } = results[i];
          const pdf = generateAcordPdf(form, data);
          pdf.save(`${form.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
          if (i < results.length - 1) await new Promise(r => setTimeout(r, 600));
        }
        toast({ title: "Downloaded", description: `${results.length} form(s) downloaded.` });
      } else {
        const companyName = aiData.applicant_name || aiData.insured_name || aiData.company_name || "Submission";
        const pkg = generateSubmissionPackage({
          companyName,
          narrative: (app as any).narrative || "",
          agencyName: profile?.agency_name || defaults.agency_name || "",
          producerName: profile?.full_name || defaults.producer_name || "",
          coverageLines: [],
          forms: results,
          effectiveDate: aiData.effective_date || aiData.proposed_eff_date || "",
        });
        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
        pkg.save(`Submission_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast({ title: "Downloaded", description: "Submission package downloaded!" });
      }
    } catch (err) {
      console.error("Download error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to download" });
    } finally {
      setDownloadingId(null);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, displayedText, scrollToBottom]);

  // Typewriter: drains fullTextRef into displayedText char-by-char
  const startTypewriter = useCallback(() => {
    if (typewriterRef.current) return;
    const tick = () => {
      const full = fullTextRef.current;
      setDisplayedText((prev) => {
        if (prev.length >= full.length) {
          if (streamDoneRef.current) {
            // Typewriter caught up and stream is done — finalize
            if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
            if (onFinishRef.current) { setTimeout(onFinishRef.current, 0); onFinishRef.current = null; }
            return prev;
          }
          // Stream still going — wait for more text
          typewriterRef.current = window.setTimeout(tick, 30);
          return prev;
        }
        // Reveal a few chars at a time for smoothness
        const step = Math.min(3, full.length - prev.length);
        typewriterRef.current = window.setTimeout(tick, 18);
        return full.slice(0, prev.length + step);
      });
    };
    tick();
  }, []);

  const killTypewriter = useCallback(() => {
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    setDisplayedText(fullTextRef.current);
    streamDoneRef.current = false;
    onFinishRef.current = null;
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10);
    setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const removeFile = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    let content = text.trim();
    if (attachedFiles.length > 0) {
      content += `\n\n[${attachedFiles.length} file(s) attached: ${attachedFiles.map((f) => f.name).join(", ")}]`;
    }

    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    fullTextRef.current = "";
    setDisplayedText("");
    streamDoneRef.current = false;

    const upsert = (chunk: string) => {
      fullTextRef.current += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev;
        return [...prev, { role: "assistant", content: "" }];
      });
    };

    const finalizeMessage = () => {
      const finalText = fullTextRef.current;
      const fields = parseFields(finalText);
      const buttons = parseButtons(finalText);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: finalText, fields, buttons } : m
          );
        }
        return [...prev, { role: "assistant", content: finalText, fields, buttons }];
      });
      setIsLoading(false);
    };

    setTimeout(() => startTypewriter(), 50);

    try {
      await streamChat({
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        onDelta: upsert,
        onDone: () => {
          // Signal stream done — typewriter will call finalizeMessage when it catches up
          streamDoneRef.current = true;
          onFinishRef.current = finalizeMessage;
        },
        onError: (err) => {
          killTypewriter();
          toast({ variant: "destructive", title: "Error", description: err });
          setIsLoading(false);
        },
      });
    } catch {
      killTypewriter();
      toast({ variant: "destructive", title: "Connection error", description: "Could not reach the assistant." });
      setIsLoading(false);
    }
  };

  const submitFields = (fields: FieldBubble[]) => {
    const filled = fields.map((f) => `${f.label}: ${fieldValues[f.key] || "(empty)"}`).join("\n");
    send(`Here are the details:\n${filled}`);
    setFieldValues({});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragIn = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragOut = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout>
      <div
        className="flex flex-col h-[calc(100vh-7.5rem)]"
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragActive && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl m-4 pointer-events-none">
            <div className="text-center space-y-2">
              <FileUp className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm font-medium text-primary">Drop files here</p>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
              <div className="text-center space-y-2">
                <h1 className="text-4xl tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  How can I help you?
                </h1>
                <p className="text-muted-foreground text-sm max-w-md">
                  I can guide you through client submissions, ACORD forms, and coverage reviews.
                </p>
              </div>

              {/* Chat input inline */}
              <div className="w-full max-w-2xl">
                {attachedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-md bg-card border px-2.5 py-1.5 text-xs">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-xl border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your clients..."
                    rows={2}
                    className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[52px] max-h-40 py-2"
                  />
                  <Button
                    onClick={() => send(input)}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="shrink-0 h-9 w-9"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Drop files anywhere or click <Paperclip className="inline h-3 w-3" /> to attach
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.message)}
                    className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <s.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.map((m, i) => {
                const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
                const textToShow = isLastAssistant && isLoading ? displayedText : m.content;
                return (
                <div key={i}>
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-xl px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                          : "bg-muted text-foreground prose prose-sm prose-headings:text-foreground prose-strong:text-foreground prose-p:my-1.5 prose-li:my-0.5 prose-ol:my-1 prose-ul:my-1 max-w-none"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <ReactMarkdown>{stripMarkers(textToShow)}</ReactMarkdown>
                      ) : m.content}
                    </div>
                  </div>

                  {/* Pop-out field bubbles with slide-up animation */}
                  {m.role === "assistant" && m.fields && m.fields.length > 0 && !isLoading && (
                    <div className="mt-3 ml-0 max-w-[85%] opacity-0 animate-[slideUpFadeIn_0.5s_ease-out_0.3s_forwards]">
                      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Please fill in the following
                        </p>
                        {m.fields.map((f, fIdx) => (
                          <div
                            key={f.key}
                            className="space-y-1 opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]"
                            style={{ animationDelay: `${0.5 + fIdx * 0.1}s` }}
                          >
                            <label className="text-xs font-medium text-foreground">{f.label}</label>
                            <Input
                              placeholder={f.placeholder}
                              value={fieldValues[f.key] || ""}
                              onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        ))}
                        <Button size="sm" className="w-full mt-1 opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]" style={{ animationDelay: `${0.5 + (m.fields?.length || 0) * 0.1 + 0.1}s` }} onClick={() => submitFields(m.fields!)}>
                          <Send className="h-3.5 w-3.5 mr-2" />
                          Submit details
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {m.role === "assistant" && m.buttons && m.buttons.length > 0 && !isLoading && (
                    <div className="mt-3 ml-0 max-w-[85%] opacity-0 animate-[slideUpFadeIn_0.5s_ease-out_0.3s_forwards]">
                      <div className="flex flex-wrap gap-2">
                        {m.buttons.map((b, bIdx) => {
                          const appMatch = b.action.match(/^\/application\/(.+)/);
                          const downloadMatch = b.action.match(/^download:(.+)/);
                          const downloadPkgMatch = b.action.match(/^download-pkg:(.+)/);
                          const isDownloading = downloadingId && (downloadMatch?.[1] === downloadingId || downloadPkgMatch?.[1] === downloadingId);

                          return (
                            <Button
                              key={bIdx}
                              variant={downloadMatch || downloadPkgMatch ? "default" : "outline"}
                              disabled={!!isDownloading}
                              onClick={() => {
                                if (downloadPkgMatch) {
                                  downloadSubmission(downloadPkgMatch[1], "package");
                                } else if (downloadMatch) {
                                  downloadSubmission(downloadMatch[1], "individual");
                                } else if (appMatch) {
                                  setReviewSubmissionId(appMatch[1]);
                                } else if (b.action.startsWith("/") || b.action.startsWith("http")) {
                                  navigate(b.action);
                                } else {
                                  send(b.label);
                                }
                              }}
                              className="opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]"
                              style={{ animationDelay: `${0.5 + bIdx * 0.1}s` }}
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : downloadMatch || downloadPkgMatch ? (
                                <Download className="h-4 w-4 mr-2" />
                              ) : appMatch ? (
                                <ClipboardList className="h-4 w-4 mr-2" />
                              ) : (
                                <ClipboardList className="h-4 w-4 mr-2" />
                              )}
                              {b.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
              {isLoading && displayedText === "" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attached files preview — only when conversation active */}
        {!isEmpty && attachedFiles.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-md bg-card border px-2.5 py-1.5 text-xs">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input area — only when conversation active */}
        {!isEmpty && (
          <div className="border-t bg-background p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 rounded-xl border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your clients..."
                  rows={2}
                  className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[52px] max-h-40 py-2"
                />
                <Button
                  onClick={() => send(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0 h-9 w-9"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Drop files anywhere or click <Paperclip className="inline h-3 w-3" /> to attach
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submission Review Dialog */}
      <Dialog open={!!reviewSubmissionId} onOpenChange={(open) => { if (!open) setReviewSubmissionId(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
          <ScrollArea className="h-full p-6">
            {reviewSubmissionId && (
              <SubmissionReviewPanel submissionId={reviewSubmissionId} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
