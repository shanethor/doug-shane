import { useState, useRef, useCallback } from "react";
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

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ label: string; action: string; icon?: string }>;
  widget?: "carrier_select" | "inline_questionnaire";
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [currentSubId, setCurrentSubId] = useState<string | undefined>(initialSubId);
  const [lastExtractionData, setLastExtractionData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    const names = files.map(f => f.name).join(", ");
    setMessages(prev => [...prev, { role: "user", content: `📎 Uploaded: ${names}` }]);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleCarrierFormConfirm = async (selectedForms: string[], carriers: string[]) => {
    if (!currentSubId) return;
    setIsLoading(true);
    try {
      await supabase
        .from("clark_submissions")
        .update({ acord_forms: selectedForms, carriers })
        .eq("id", currentSubId);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **Selection confirmed!**\n\n- ACORD Forms: ${selectedForms.join(", ")}\n- Carriers: ${carriers.join(", ")}\n\nYou can now fill any missing fields below or generate the forms.`,
        actions: lastExtractionData?.missing_fields?.length > 0
          ? [{ label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" }]
          : [{ label: "Generate ACORD Forms & ZIP", action: "finalize", icon: "download" }],
      }]);

      // Show inline questionnaire if there are missing fields
      if (lastExtractionData?.missing_fields?.length > 0) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "",
          widget: "inline_questionnaire",
          widgetData: { submissionId: currentSubId, missingFields: lastExtractionData.missing_fields },
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
        const clientEmail = prompt("Enter the client's email address:");
        const clientName = prompt("Enter the client's name (optional):");
        if (!clientEmail) { setIsLoading(false); return; }

        const { error } = await supabase.functions.invoke("clark-notify", {
          body: {
            submission_id: currentSubId,
            client_email: clientEmail,
            client_name: clientName || undefined,
            action: "send_questionnaire",
          },
        });
        if (error) throw error;
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📧 Questionnaire sent to **${clientEmail}**! I'll notify you when they complete it.`,
        }]);
        toast.success("Questionnaire email sent!");
      }

      if (action === "finalize") {
        setMessages(prev => [...prev, { role: "assistant", content: "⏳ Generating ACORD forms and bundling into ZIP..." }]);

        const { data, error } = await supabase.functions.invoke("clark-finalize", {
          body: { submission_id: currentSubId },
        });
        if (error) throw error;

        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ **Submission finalized!**\n\n- ${data.forms_generated} ACORD form(s) generated\n- Carriers: ${data.carriers.join(", ")}\n\nYour ZIP is ready for download.`,
          actions: [{ label: "Download ZIP", action: "download", icon: "download" }],
        }]);

        if (data.zip_url) window.open(data.zip_url, "_blank");
      }

      if (action === "download" && lastExtractionData?.zip_url) {
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
        const pdfFiles = await Promise.all(
          uploadedFiles.map(async (f) => ({
            base64: await fileToBase64(f),
            mimeType: f.type || "application/pdf",
            name: f.name,
          }))
        );

        const { data, error } = await supabase.functions.invoke("clark-extract", {
          body: { pdf_files: pdfFiles, user_prompt: trimmed, submission_id: currentSubId },
        });
        if (error) throw error;

        const subId = data?.submission_id;
        if (subId) {
          setCurrentSubId(subId);
          if (onSubmissionCreated) onSubmissionCreated(subId);
        }
        setLastExtractionData(data);

        const missingCount = data?.missing_fields?.length || 0;
        const extractedKeys = Object.keys(data?.extracted_data || {}).length;

        let response = `✅ **Extraction complete!**\n\n`;
        response += `- **${extractedKeys}** fields extracted from ${uploadedFiles.length} document(s)\n`;
        if (missingCount > 0) {
          response += `- **${missingCount}** fields still missing\n\n`;
          response += `Missing: ${(data?.missing_fields || []).slice(0, 8).join(", ")}${missingCount > 8 ? "..." : ""}`;
        } else {
          response += `\n🎉 All required fields captured!`;
        }
        response += `\n\nNow select which ACORD forms to generate and which carriers to submit to:`;

        setMessages(prev => [...prev, { role: "assistant", content: response }]);

        // Show carrier/form selection widget
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "",
          widget: "carrier_select",
          widgetData: { suggestedForms: data?.acord_forms || ["125"] },
        }]);

        setUploadedFiles([]);
      } else {
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
      }
    } catch (err: any) {
      console.error("Clark chat error:", err);
      toast.error(err.message || "Something went wrong");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, uploadedFiles, messages, currentSubId, onSubmissionCreated]);

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
          content: "Fill the missing fields above, or send an email questionnaire to your client:",
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

      setLastExtractionData({ missing_fields: missing, acord_forms: acordForms });
      setMessages(loadedMessages);
    } catch (err: any) {
      toast.error(err.message || "Failed to load submission");
    } finally {
      setIsLoading(false);
    }
  };

  // Expose loadSubmission for parent to call
  (ClarkChat as any)._loadSubmission = loadSubmission;

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
    return null;
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Clark AI
          <Badge variant="secondary" className="text-xs">Insurance Tool</Badge>
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
                        disabled={isLoading}
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
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
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
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Clark or upload documents…"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
