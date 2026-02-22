import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, Upload, Trash2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "loss_runs", label: "Loss Runs" },
  { value: "supplemental", label: "Supplemental" },
  { value: "previous_coverage", label: "Previous Coverage" },
  { value: "application", label: "Application" },
  { value: "certificate", label: "Certificate" },
  { value: "endorsement", label: "Endorsement" },
  { value: "other", label: "Other" },
];

const DOC_TYPE_COLORS: Record<string, string> = {
  loss_runs: "bg-orange-500/10 text-orange-600",
  supplemental: "bg-blue-500/10 text-blue-600",
  previous_coverage: "bg-purple-500/10 text-purple-600",
  application: "bg-primary/10 text-primary",
  certificate: "bg-green-500/10 text-green-600",
  endorsement: "bg-amber-500/10 text-amber-600",
  other: "bg-muted text-muted-foreground",
};

type ClientDocument = {
  id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  file_size: number | null;
  created_at: string;
};

type Props = {
  submissionId?: string | null;
  leadId?: string | null;
  compact?: boolean;
};

export function ClientDocuments({ submissionId, leadId, compact = false }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("other");
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    if (!user) return;
    let query = supabase
      .from("client_documents" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (submissionId) query = query.eq("submission_id", submissionId);
    else if (leadId) query = query.eq("lead_id", leadId);
    else return;

    const { data } = await query;
    setDocs((data ?? []) as unknown as ClientDocument[]);
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [user, submissionId, leadId]);

  const uploadFile = useCallback(async (file: File, type?: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const insertData: any = {
        user_id: user.id,
        file_name: file.name,
        file_url: dataUrl,
        document_type: type || docType,
        file_size: file.size,
      };

      if (submissionId) insertData.submission_id = submissionId;
      if (leadId) insertData.lead_id = leadId;
      if (submissionId && !leadId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("submission_id", submissionId)
          .maybeSingle();
        if (lead) insertData.lead_id = lead.id;
      }

      const { error } = await supabase.from("client_documents" as any).insert(insertData);
      if (error) throw error;

      toast.success(`${file.name} attached`);
      setDocType("other");
      loadDocs();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [user, submissionId, leadId, docType]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from("client_documents" as any).delete().eq("id", docId);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Document removed");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const typeLabel = (type: string) => DOC_TYPES.find((t) => t.value === type)?.label || type;

  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-accent gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Paperclip className="h-2.5 w-2.5" />
            {loading ? "…" : docs.length}
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Client Documents</DialogTitle>
          </DialogHeader>
          <FullDocumentView
            docs={docs}
            docType={docType}
            setDocType={setDocType}
            uploading={uploading}
            fileRef={fileRef}
            handleUpload={handleUpload}
            handleDelete={handleDelete}
            formatSize={formatSize}
            typeLabel={typeLabel}
            uploadFile={uploadFile}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <FullDocumentView
      docs={docs}
      docType={docType}
      setDocType={setDocType}
      uploading={uploading}
      fileRef={fileRef}
      handleUpload={handleUpload}
      handleDelete={handleDelete}
      formatSize={formatSize}
      typeLabel={typeLabel}
      uploadFile={uploadFile}
    />
  );
}

function FullDocumentView({
  docs,
  docType,
  setDocType,
  uploading,
  fileRef,
  handleUpload,
  handleDelete,
  formatSize,
  typeLabel,
  uploadFile,
}: {
  docs: ClientDocument[];
  docType: string;
  setDocType: (v: string) => void;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDelete: (id: string) => void;
  formatSize: (n: number | null) => string;
  typeLabel: (t: string) => string;
  uploadFile: (file: File, type?: string) => Promise<void>;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      await uploadFile(file, docType);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag-and-drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-muted/20 hover:border-border"
        }`}
      >
        <Upload className={`h-6 w-6 mx-auto mb-2 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-xs text-muted-foreground font-sans mb-2">
          {dragOver ? "Drop files here…" : "Drag & drop files here, or use the button below"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Doc type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv"
            multiple
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Browse Files"}
          </Button>
        </div>
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground font-sans py-2 text-center">
          No documents attached yet.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-md border p-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-sans text-xs truncate">{doc.file_name}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] shrink-0 ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.other}`}
                >
                  {typeLabel(doc.document_type)}
                </Badge>
                {doc.file_size && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatSize(doc.file_size)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={doc.file_name}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
