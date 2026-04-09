import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Upload, FileText, Loader2, Bot, User, Mail, Download } from "lucide-react";
import ClarkCarrierFormSelect from "./ClarkCarrierFormSelect";
import ClarkInlineQuestionnaire from "./ClarkInlineQuestionnaire";
import { Label } from "@/components/ui/label";

function InlineEmailInput({ onSend }: { onSend: (email: string, name: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-3 flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-green-500" />
          Questionnaire email sent to {email}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="q-email" className="text-xs">Client Email *</Label>
          <Input
            id="q-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-name" className="text-xs">Client Name (optional)</Label>
          <Input
            id="q-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          className="w-full gap-1.5"
          disabled={!email.includes("@")}
          onClick={() => { setSent(true); onSend(email, name); }}
        >
          <Mail className="h-3.5 w-3.5" />
          Send Questionnaire
        </Button>
      </CardContent>
    </Card>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ label: string; action: string; icon?: string }>;
  widget?: "carrier_select" | "inline_questionnaire" | "email_questionnaire";
  widgetData?: any;
}

interface ClarkChatProps {
  submissionId?: string;
  onSubmissionCreated?: (id: string) => void;
}

export default function ClarkChat({ submissionId: initialSubId, onSubmissionCreated }: ClarkChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Clark. Upload your client documents (dec pages, ACORD apps, loss runs) and I'll extract the data, map it to ACORD forms, and identify any missing information.\n\nDrop files below or describe what you need." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [currentSubId, setCurrentSubId] = useState<string | undefined>(initialSubId);
  const [lastExtractionData, setLastExtractionData] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didLoad = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isExtracting]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadedFiles(prev => [...prev, ...files]);
    const names = files.map(f => f.name).join(", ");
    
    // Show file upload message
    setMessages(prev => [...prev, { role: "user", content: `📎 Uploaded: ${names}` }]);

    // Immediately show carrier/form selector while we'll extract in parallel
    setMessages(prev => [...prev, 
      { 
        role: "assistant", 
        content: "📋 **Great!** While I analyze these documents, please select which ACORD forms you need and which carrier(s) you're submitting to:" 
      },
      {
        role: "assistant",
        content: "",
        widget: "carrier_select",
        widgetData: { suggestedForms: ["125"] },
      }
    ]);

    // Store files for extraction (will start after carrier/form confirm)
    setPendingFiles(prev => prev ? [...prev, ...files] : files);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /** Run the extraction in the background */
  const runExtraction = async (files: File[], userPrompt: string, subId?: string) => {
    setIsExtracting(true);
    try {
      const pdfFiles = await Promise.all(
        files.map(async (f) => ({
          base64: await fileToBase64(f),
          mimeType: f.type || "application/pdf",
          name: f.name,
        }))
      );

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "🔍 **Step 1/3:** Extracting all insurance data from your documents with Claude AI..."
      }]);

      const { data, error } = await supabase.functions.invoke("clark-extract", {
        body: { pdf_files: pdfFiles, user_prompt: userPrompt, submission_id: subId },
      });
      if (error) throw error;

      const newSubId = data?.submission_id;
      if (newSubId) {
        setCurrentSubId(newSubId);
        if (onSubmissionCreated) onSubmissionCreated(newSubId);
      }
      setLastExtractionData(data);

      const missingCount = data?.missing_fields?.length || 0;
      const extractedKeys = Object.keys(data?.extracted_data || {}).length;
      const steps = data?.steps_completed;

      let response = `✅ **Extraction complete!**\n\n`;
      if (steps) {
        response += `- **Step 1:** ${steps.step1_fields} fields extracted from documents\n`;
        response += `- **Step 2:** ${steps.step2_enrichment} fields enriched from web research\n`;
        response += `- **Step 3:** ${steps.step3_final} total fields after merge\n\n`;
      } else {
        response += `- **${extractedKeys}** fields extracted from ${files.length} document(s)\n\n`;
      }
      
      if (missingCount > 0) {
        response += `⚠️ **${missingCount}** fields still missing:\n${(data?.missing_fields || []).slice(0, 8).map((f: string) => `  • ${f.replace(/_/g, " ")}`).join("\n")}${missingCount > 8 ? "\n  • ..." : ""}`;
      } else {
        response += `🎉 All required fields captured!`;
      }

      setMessages(prev => [...prev, { role: "assistant", content: response }]);

      // Show inline questionnaire if there are missing fields
      if (missingCount > 0 && newSubId) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Fill in the missing fields below, or skip and generate forms with what we have:",
          widget: "inline_questionnaire",
          widgetData: { submissionId: newSubId, missingFields: data.missing_fields },
        }]);
      }

      // Always show finalize button
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "",
        actions: [
          ...(missingCount > 0 ? [{ label: "Email Questionnaire to Client", action: "send_questionnaire", icon: "mail" }] : []),
          { label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" },
        ],
      }]);

      setUploadedFiles([]);
    } catch (err: any) {
      console.error("Extraction error:", err);
      toast.error(err.message || "Extraction failed");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Extraction failed: ${err.message || "Unknown error"}. Please try again.`,
      }]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCarrierFormConfirm = async (selectedForms: string[], carriers: string[]) => {
    setIsLoading(true);
    try {
      // If we already have a submission, update it
      if (currentSubId) {
        await supabase
          .from("clark_submissions")
          .update({ acord_forms: selectedForms, carriers })
          .eq("id", currentSubId);
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **Selection saved!**\n\n- ACORD Forms: ${selectedForms.join(", ")}\n- Carriers: ${carriers.join(", ")}`,
      }]);

      // Now kick off extraction if we have pending files
      if (pendingFiles && pendingFiles.length > 0) {
        const files = pendingFiles;
        const prompt = pendingPrompt;
        setPendingFiles(null);
        setPendingPrompt("");
        setIsLoading(false);
        
        // Run extraction — it will create a submission and update with carrier/form info
        await runExtraction(files, prompt, currentSubId);
        
        // After extraction, update the submission with the selected forms/carriers
        if (currentSubId || lastExtractionData?.submission_id) {
          const subId = currentSubId || lastExtractionData?.submission_id;
          await supabase
            .from("clark_submissions")
            .update({ acord_forms: selectedForms, carriers })
            .eq("id", subId);
        }
      } else if (lastExtractionData?.missing_fields?.length > 0) {
        // Already extracted — show questionnaire
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "",
          widget: "inline_questionnaire",
          widgetData: { submissionId: currentSubId, missingFields: lastExtractionData.missing_fields },
        }]);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "",
          actions: [{ label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" }],
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "",
          actions: [{ label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" }],
        }]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save selection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineQuestionnaireComplete = (filledData: Record<string, string>) => {
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "🎉 All fields captured! You're ready to generate the ACORD forms.",
      actions: [{ label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" }],
    }]);
  };

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      if (action === "send_questionnaire") {
        // Show inline email input widget instead of prompt()
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "📧 Enter the client's email address to send the questionnaire:",
          widget: "email_questionnaire",
          widgetData: { submissionId: currentSubId },
        }]);
        setIsLoading(false);
        return;
      }

      if (action === "finalize") {
        setMessages(prev => [...prev, { role: "assistant", content: "⏳ Generating filled ACORD forms and bundling into ZIP..." }]);

        const { data, error } = await supabase.functions.invoke("clark-finalize", {
          body: { submission_id: currentSubId },
        });
        if (error) throw error;

        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ **Submission finalized!**\n\n- ${data.forms_generated} ACORD form(s) filled with extracted data\n- Carriers: ${data.carriers.join(", ")}\n\nYour ZIP is ready for download.`,
          actions: [{ label: "Download ZIP", action: "download_zip", icon: "download" }],
        }]);

        setLastExtractionData((prev: any) => ({ ...prev, zip_url: data.zip_url }));
        if (data.zip_url) window.open(data.zip_url, "_blank");
      }

      if (action === "download_zip" && lastExtractionData?.zip_url) {
        window.open(lastExtractionData.zip_url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err.message || "Something went wrong."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && uploadedFiles.length === 0) return;

    const userMsg: Message = { role: "user", content: trimmed || "Process uploaded documents" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (uploadedFiles.length > 0) {
        // Files are in uploadedFiles — if carrier wasn't selected yet, prompt it
        if (!pendingFiles) {
          setPendingFiles(uploadedFiles);
          setPendingPrompt(trimmed);

          setMessages(prev => [...prev,
            {
              role: "assistant",
              content: "📋 Before I extract, please select which ACORD forms you need and which carrier(s):"
            },
            {
              role: "assistant",
              content: "",
              widget: "carrier_select",
              widgetData: { suggestedForms: ["125"] },
            }
          ]);
        } else {
          // Already have pending, just add more context
          setPendingPrompt(prev => prev ? `${prev}\n${trimmed}` : trimmed);
        }
        setIsLoading(false);
      } else {
        // Text-only message — send to assistant
        const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
        const { data, error } = await supabase.functions.invoke("connect-assistant", {
          body: { messages: allMessages, context: { mode: "clark" } },
        });
        if (error) throw error;

        if (typeof data === "string") {
          setMessages(prev => [...prev, { role: "assistant", content: data }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: data?.text || data?.choices?.[0]?.message?.content || "I'm not sure how to help with that." }]);
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Clark chat error:", err);
      toast.error(err.message || "Something went wrong");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      setIsLoading(false);
    }
  }, [input, uploadedFiles, messages, currentSubId, onSubmissionCreated, pendingFiles]);

  // Load an existing submission into the chat
  const loadSubmission = async (subId: string) => {
    setCurrentSubId(subId);
    setIsLoading(true);
    try {
      const { data: sub } = await supabase
        .from("clark_submissions")
        .select("*")
        .eq("id", subId)
        .single();

      if (!sub) { toast.error("Submission not found"); return; }

      const extracted = (sub.extracted_data || {}) as Record<string, any>;
      const missing = ((sub.missing_fields || []) as string[]);
      const acordForms = ((sub.acord_forms || []) as string[]);
      const carriers = ((sub.carriers || []) as string[]);

      const loadedMessages: Message[] = [
        { role: "assistant", content: `📂 **Loaded submission:** ${sub.business_name || sub.client_name || "Untitled"}\n\n- Status: ${sub.status}\n- Forms: ${acordForms.join(", ") || "Not selected"}\n- Carriers: ${carriers.join(", ") || "Not selected"}\n- Extracted fields: ${Object.keys(extracted).length}\n- Missing fields: ${missing.length}` },
      ];

      if (sub.status === "needs_info" && missing.length > 0) {
        loadedMessages.push({
          role: "assistant",
          content: "",
          widget: "inline_questionnaire",
          widgetData: { submissionId: subId, missingFields: missing },
        });
        loadedMessages.push({
          role: "assistant",
          content: "Fill the missing fields above, or proceed with what we have:",
          actions: [
            { label: "Email Questionnaire to Client", action: "send_questionnaire", icon: "mail" },
            { label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" },
          ],
        });
      } else if (sub.status === "questionnaire_sent") {
        loadedMessages.push({
          role: "assistant",
          content: "⏳ Waiting for client to complete the questionnaire. You can also fill the missing fields yourself:",
          widget: "inline_questionnaire",
          widgetData: { submissionId: subId, missingFields: missing },
        });
      } else {
        loadedMessages.push({
          role: "assistant",
          content: "Ready to proceed:",
          actions: [{ label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" }],
        });
      }

      setLastExtractionData({ missing_fields: missing, acord_forms: acordForms, zip_url: sub.final_zip_url });
      setMessages(loadedMessages);
    } catch (err: any) {
      toast.error(err.message || "Failed to load submission");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSubId && !didLoad.current) {
      didLoad.current = true;
      loadSubmission(initialSubId);
    }
  }, [initialSubId]);

  const handleSendQuestionnaire = async (email: string, name: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("clark-notify", {
        body: {
          submission_id: currentSubId,
          client_email: email,
          client_name: name || undefined,
          action: "send_questionnaire",
        },
      });
      if (error) throw error;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📧 Questionnaire sent to **${email}**! I'll notify you when they complete it.`,
      }]);
      toast.success("Questionnaire email sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send questionnaire");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Failed to send questionnaire: ${err.message || "Unknown error"}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWidget = (msg: Message) => {
    if (msg.widget === "carrier_select") {
      return (
        <ClarkCarrierFormSelect
          suggestedForms={msg.widgetData?.suggestedForms || ["125"]}
          onConfirm={handleCarrierFormConfirm}
        />
      );
    }
    if (msg.widget === "inline_questionnaire") {
      return (
        <ClarkInlineQuestionnaire
          submissionId={msg.widgetData?.submissionId}
          missingFields={msg.widgetData?.missingFields || []}
          onComplete={handleInlineQuestionnaireComplete}
        />
      );
    }
    if (msg.widget === "email_questionnaire") {
      return <InlineEmailInput onSend={handleSendQuestionnaire} />;
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Clark AI
          <Badge variant="secondary" className="text-xs">Insurance Tool</Badge>
          {isExtracting && (
            <Badge variant="outline" className="text-xs gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Extracting…
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-4 pt-0">
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.content && (
                  <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )}
                {msg.widget && <div className="ml-9 mt-2">{renderWidget(msg)}</div>}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex gap-2 mt-2 ml-9 flex-wrap">
                    {msg.actions.map((a, j) => (
                      <Button
                        key={j}
                        size="sm"
                        variant={a.action === "finalize" ? "default" : "outline"}
                        className="gap-1.5"
                        onClick={() => handleAction(a.action)}
                        disabled={isLoading || isExtracting}
                      >
                        {a.icon === "mail" && <Mail className="h-3.5 w-3.5" />}
                        {a.icon === "download" && <Download className="h-3.5 w-3.5" />}
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {(isLoading || isExtracting) && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uploadedFiles.map((f, i) => (
              <Badge key={i} variant="outline" className="gap-1 text-xs">
                <FileText className="h-3 w-3" />
                {f.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isExtracting}>
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Clark or upload documents…"
            disabled={isLoading || isExtracting}
          />
          <Button onClick={handleSend} disabled={isLoading || isExtracting} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
