import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ingestDocument } from "@/services/aiRouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ensurePipelineLead } from "@/lib/pipeline-sync";

export default function SubmitPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!description && files.length === 0) {
      toast.error("Please provide a description or upload files.");
      return;
    }

    setSubmitting(true);
    try {
      // Read text content from files
      let fileContents = "";
      for (const file of files) {
        if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          const content = await readFileAsText(file);
          fileContents += `\n--- ${file.name} ---\n${content}`;
        }
      }

      // Create submission record
      const { data: submission, error: subError } = await supabase
        .from("business_submissions")
        .insert({
          user_id: user.id,
          company_name: companyName || null,
          description: description || null,
          file_urls: files.map((f) => f.name),
          status: "processing",
        })
        .select()
        .single();

      if (subError) throw subError;

      // Call AI extraction via router
      const result = await ingestDocument({
        docType: "business_plan",
        additionalContext: `${companyName ? `Company: ${companyName}\n` : ""}${description}${fileContents ? `\n${fileContents}` : ""}`,
        submissionId: submission.id,
      });

      // Auto-create pipeline lead in Quoting stage
      await ensurePipelineLead({
        userId: user.id,
        accountName: companyName || result?.form_data?.applicant_name || "New Client",
        submissionId: submission.id,
      });

      toast.success("Business plan processed! Review your application.");
      navigate(`/application/${submission.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process submission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl mb-2">New Client Submission</h1>
        <p className="text-muted-foreground font-sans text-sm mb-8">
          Upload your client's business plan and we'll prefill their ACORD applications automatically.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-sans">Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Company Name
                </Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-sans">Client Business Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Describe the Client's Business
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the client's business — what they do, number of employees, annual revenue, locations, etc. The more detail, the better we can prefill their ACORD forms."
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-sans">Upload Client Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <span className="text-sm font-sans text-muted-foreground">
                  Drop the client's business plan, pitch deck, or documents here
                </span>
                <span className="text-xs font-sans text-muted-foreground mt-1">
                  Supports PDF, TXT, DOC, images
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.md"
                />
              </label>
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {f.name}
                      <span className="text-xs">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing with AI…
              </>
            ) : (
              "Submit & Extract Data"
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
