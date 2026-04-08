import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Upload, FileText, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ClarkChatProps {
  submissionId?: string;
  onSubmissionCreated?: (id: string) => void;
}

export default function ClarkChat({ submissionId, onSubmissionCreated }: ClarkChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Clark. Upload your client documents (dec pages, ACORD apps, loss runs) and I'll extract the data, map it to ACORD forms, and identify any missing information. Drop files below or describe what you need." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && uploadedFiles.length === 0) return;

    const userMsg: Message = { role: "user", content: trimmed || "Process uploaded documents" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // If files are present, send to extraction
      if (uploadedFiles.length > 0) {
        const pdfFiles = await Promise.all(
          uploadedFiles.map(async (f) => ({
            base64: await fileToBase64(f),
            mimeType: f.type || "application/pdf",
            name: f.name,
          }))
        );

        const { data, error } = await supabase.functions.invoke("clark-extract", {
          body: {
            pdf_files: pdfFiles,
            user_prompt: trimmed,
            submission_id: submissionId,
          },
        });

        if (error) throw error;

        const subId = data?.submission_id;
        if (subId && onSubmissionCreated) onSubmissionCreated(subId);

        const missingCount = data?.missing_fields?.length || 0;
        const extractedKeys = Object.keys(data?.extracted_data || {}).length;

        let response = `✅ **Extraction complete!**\n\n`;
        response += `- **${extractedKeys}** fields extracted from ${uploadedFiles.length} document(s)\n`;
        if (missingCount > 0) {
          response += `- **${missingCount}** fields still missing — I can generate a client questionnaire to collect them\n`;
          response += `\nMissing fields: ${(data?.missing_fields || []).join(", ")}`;
        } else {
          response += `- All required fields captured! Ready to generate ACORD forms.`;
        }

        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        setUploadedFiles([]);
      } else {
        // Regular chat message — route to connect-assistant for general guidance
        const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
        
        const { data, error } = await supabase.functions.invoke("connect-assistant", {
          body: {
            messages: allMessages,
            context: { mode: "clark" },
          },
        });

        if (error) throw error;

        // Handle streaming response
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
  }, [input, uploadedFiles, messages, submissionId, onSubmissionCreated]);

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
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
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
