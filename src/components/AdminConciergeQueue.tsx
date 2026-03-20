import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES, STATUS_ORDER } from "@/hooks/useConcierge";
import { toast } from "sonner";
import { Clock, Loader2, CheckCircle, AlertCircle, Archive, Wrench, Mail, Phone, FileIcon, Upload, Download } from "lucide-react";

interface ConciergeReq {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  contact_preference?: string;
  contact_phone?: string | null;
}

interface ConciergeSub {
  user_id: string;
  subscription_status: string;
  trial_end_at: string | null;
}

interface ConciergeFile {
  id: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by_role: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  needs_info: "bg-warning/20 text-warning",
  completed: "bg-success/20 text-success",
  archived: "bg-muted text-muted-foreground",
};

export default function AdminConciergeQueue({ profileMap }: { profileMap: Record<string, string> }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConciergeReq[]>([]);
  const [subs, setSubs] = useState<ConciergeSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Files
  const [expandedFiles, setExpandedFiles] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, ConciergeFile[]>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadReqId = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [reqRes, subRes] = await Promise.all([
        supabase.from("concierge_requests" as any).select("*").order("created_at", { ascending: false }),
        supabase.from("concierge_subscriptions" as any).select("user_id, subscription_status, trial_end_at"),
      ]);
      setRequests((reqRes.data as any) ?? []);
      setSubs((subRes.data as any) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const subMap = new Map(subs.map(s => [s.user_id, s]));

  const updateStatus = async (id: string, userId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const sub = subMap.get(userId);
      if (!sub || sub.subscription_status !== "active") {
        toast.error("User not active on AURA CONCIERGE; cannot mark request completed.");
        return;
      }
    }
    const updates: any = { status: newStatus };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await (supabase.from("concierge_requests" as any) as any).update(updates).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    toast.success("Status updated");
  };

  const saveNotes = async (id: string) => {
    const { error } = await (supabase.from("concierge_requests" as any) as any).update({ internal_notes: noteText }).eq("id", id);
    if (error) { toast.error("Failed to save notes"); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, internal_notes: noteText } : r));
    setEditingNotes(null);
    toast.success("Notes saved");
  };

  const loadFiles = async (requestId: string) => {
    const { data } = await supabase.from("concierge_files" as any).select("*").eq("request_id", requestId).order("created_at", { ascending: false });
    setFiles(prev => ({ ...prev, [requestId]: (data as any) ?? [] }));
  };

  const toggleFiles = (requestId: string) => {
    if (expandedFiles === requestId) {
      setExpandedFiles(null);
    } else {
      setExpandedFiles(requestId);
      if (!files[requestId]) loadFiles(requestId);
    }
  };

  const handleFileUpload = async (requestId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `admin/${requestId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("concierge-files").upload(path, file);
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("concierge-files").getPublicUrl(path);
    const { error: dbError } = await (supabase.from("concierge_files" as any) as any).insert({
      request_id: requestId,
      user_id: user.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      uploaded_by_role: "admin",
    });
    if (dbError) { toast.error("Failed to save file record"); setUploading(false); return; }
    toast.success("File uploaded");
    await loadFiles(requestId);
    setUploading(false);
  };

  const downloadFile = async (file: ConciergeFile) => {
    const pathMatch = file.file_url.match(/concierge-files\/(.+)$/);
    if (pathMatch) {
      const { data } = await supabase.storage.from("concierge-files").createSignedUrl(pathMatch[1], 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Could not get download link");
    } else {
      window.open(file.file_url, "_blank");
    }
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && activeUploadReqId.current) handleFileUpload(activeUploadReqId.current, f);
          e.target.value = "";
        }}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No concierge requests found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const sub = subMap.get(r.user_id);
            const subLabel = sub?.subscription_status === "active" ? "Paid" :
              sub?.subscription_status === "trial_active" ? "Trial" : "Inactive";
            const subColor = sub?.subscription_status === "active" ? "text-success" :
              sub?.subscription_status === "trial_active" ? "text-[#F59E0B]" : "text-destructive";
            const isFilesExpanded = expandedFiles === r.id;
            const reqFiles = files[r.id] || [];

            return (
              <Card key={r.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                        <span>{profileMap[r.user_id] || r.user_id.slice(0, 8)}</span>
                        <span>·</span>
                        <span className={subColor}>{subLabel}</span>
                        <span>·</span>
                        <span>{CATEGORIES.find(c => c.value === r.category)?.label || r.category}</span>
                        {r.contact_preference === "email" && (
                          <Badge variant="outline" className="text-[9px] gap-0.5 ml-1">
                            <Mail className="h-2.5 w-2.5" /> Email
                          </Badge>
                        )}
                        {r.contact_preference === "phone" && (
                          <Badge variant="outline" className="text-[9px] gap-0.5 ml-1">
                            <Phone className="h-2.5 w-2.5" /> {r.contact_phone || "Phone"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, r.user_id, v)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColors[r.status] || ""}`}>{r.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 ml-auto gap-1" onClick={() => toggleFiles(r.id)}>
                      <FileIcon className="h-3 w-3" /> Files
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => { setEditingNotes(r.id); setNoteText(r.internal_notes || ""); }}>
                      {r.internal_notes ? "Edit Notes" : "Add Notes"}
                    </Button>
                  </div>

                  {/* Files section */}
                  {isFilesExpanded && (
                    <div className="border-t pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Shared Files</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={uploading}
                          onClick={() => {
                            activeUploadReqId.current = r.id;
                            fileInputRef.current?.click();
                          }}
                        >
                          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Upload for User
                        </Button>
                      </div>
                      {reqFiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No files shared yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {reqFiles.map((f: ConciergeFile) => (
                            <div key={f.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                              <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate flex-1">{f.file_name}</span>
                              <Badge variant="outline" className="text-[9px] shrink-0">
                                {f.uploaded_by_role === "admin" ? "Admin" : "User"}
                              </Badge>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => downloadFile(f)}>
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {editingNotes === r.id && (
                    <div className="space-y-2">
                      <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} placeholder="Internal notes..." className="text-xs" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingNotes(null)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveNotes(r.id)}>Save</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
