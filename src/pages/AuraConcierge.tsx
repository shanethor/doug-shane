import { useState, useRef } from "react";
import { useUserFeatures } from "@/hooks/useUserFeatures";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useConcierge, CATEGORIES, STATUS_ORDER } from "@/hooks/useConcierge";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Plus, Clock, CheckCircle, AlertCircle, Archive,
  Wrench, BarChart3, Palette, TrendingUp, Cog, HelpCircle,
  Lock, Sparkles, Mail, Phone, Upload, Download, FileIcon, X,
} from "lucide-react";
import { toast } from "sonner";

const categoryIcons: Record<string, any> = {
  web_tool: Wrench,
  dashboard: BarChart3,
  design: Palette,
  sales_assets: TrendingUp,
  process_automation: Cog,
  other: HelpCircle,
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-primary/10 text-primary", icon: Loader2 },
  needs_info: { label: "Needs Info", color: "bg-warning/20 text-warning", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-success/20 text-success", icon: CheckCircle },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground", icon: Archive },
};

interface ConciergeFile {
  id: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by_role: string;
  created_at: string;
}

function ConciergePaywall({ onStartTrial }: { onStartTrial: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-6 max-w-lg mx-auto">
      <div className="rounded-full bg-[#F59E0B]/10 p-4">
        <Lock className="h-8 w-8 text-[#F59E0B]" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">AURA Concierge</h2>
      <p className="text-muted-foreground leading-relaxed">
        Your on-call build team for systems, tools, and assets that make your business easier to run — and easier to sell.
      </p>
      <div className="bg-card border rounded-xl p-5 w-full text-left space-y-2">
        <div className="text-sm text-muted-foreground"><strong className="text-foreground">$1,000</strong>/month subscription</div>
        <div className="text-sm text-[#F59E0B] font-medium">Launch offer: first 3 months at $500/month</div>
        <div className="text-xs text-muted-foreground">1-week free trial · card on file required</div>
      </div>
      <Button onClick={onStartTrial} className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A] font-semibold px-8">
        <Sparkles className="h-4 w-4 mr-2" />
        Start Free Trial
      </Button>
    </div>
  );
}

export default function AuraConcierge() {
  const { hasConcierge, loading: featuresLoading } = useUserFeatures();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    requests, loading, activeCount, maxActive,
    isTrialActive, isPaid, isLocked, trialDaysLeft,
    startTrial, createRequest, refresh,
  } = useConcierge();

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [contactPref, setContactPref] = useState("none");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // File viewing per request
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, ConciergeFile[]>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!featuresLoading && !roleLoading && !hasConcierge && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [featuresLoading, roleLoading, hasConcierge, isAdmin, navigate]);

  const handleStartTrial = async () => {
    const error = await startTrial();
    if (error) toast.error("Failed to start trial");
    else toast.success("Trial started! You have 7 days to explore Concierge.");
  };

  const canBypassLock = hasConcierge || isAdmin;

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (contactPref === "phone" && !contactPhone.trim()) { toast.error("Please enter your phone number"); return; }
    setSubmitting(true);
    const { error } = await createRequest(
      { title: title.trim(), description: description.trim(), category, contact_preference: contactPref, contact_phone: contactPref === "phone" ? contactPhone.trim() : null },
      canBypassLock
    );
    setSubmitting(false);
    if (error) { toast.error(error); return; }
    toast.success("Request submitted!");
    setShowNew(false);
    setTitle("");
    setDescription("");
    setCategory("other");
    setContactPref("none");
    setContactPhone("");
  };

  const loadFiles = async (requestId: string) => {
    const { data } = await supabase.from("concierge_files" as any).select("*").eq("request_id", requestId).order("created_at", { ascending: false });
    setFiles(prev => ({ ...prev, [requestId]: (data as any) ?? [] }));
  };

  const toggleExpand = (requestId: string) => {
    if (expandedRequest === requestId) {
      setExpandedRequest(null);
    } else {
      setExpandedRequest(requestId);
      if (!files[requestId]) loadFiles(requestId);
    }
  };

  const handleFileUpload = async (requestId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${requestId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("concierge-files").upload(path, file);
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("concierge-files").getPublicUrl(path);
    const fileUrl = urlData.publicUrl;
    const { error: dbError } = await (supabase.from("concierge_files" as any) as any).insert({
      request_id: requestId,
      user_id: user.id,
      file_name: file.name,
      file_url: fileUrl,
      file_size: file.size,
      uploaded_by_role: "user",
    });
    if (dbError) { toast.error("Failed to save file record"); setUploading(false); return; }
    toast.success("File uploaded");
    await loadFiles(requestId);
    setUploading(false);
  };

  const downloadFile = async (file: ConciergeFile) => {
    // For private bucket, get signed URL
    const pathMatch = file.file_url.match(/concierge-files\/(.+)$/);
    if (pathMatch) {
      const { data } = await supabase.storage.from("concierge-files").createSignedUrl(pathMatch[1], 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Could not get download link");
    } else {
      window.open(file.file_url, "_blank");
    }
  };

  if (featuresLoading || roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AURA Concierge</h1>
            <p className="text-sm text-muted-foreground mt-1">Your on-call build team</p>
          </div>
          {(!isLocked || hasConcierge || isAdmin) && (
            <div className="flex items-center gap-3">
              {isTrialActive && (
                <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B]">
                  Trial · {trialDaysLeft}d left
                </Badge>
              )}
              {isPaid && (
                <Badge variant="outline" className="border-success text-success">Active</Badge>
              )}
              <Badge variant="secondary">{activeCount}/{maxActive} active</Badge>
            </div>
          )}
        </div>

        {/* Paywall */}
        {isLocked && !hasConcierge && !isAdmin && <ConciergePaywall onStartTrial={handleStartTrial} />}

        {/* Active user view */}
        {(!isLocked || hasConcierge || isAdmin) && (
          <>
            <Button
              onClick={() => setShowNew(true)}
              disabled={activeCount >= maxActive}
              className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A]"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Request
              {activeCount >= maxActive && <span className="ml-2 text-xs opacity-70">(limit reached)</span>}
            </Button>

            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No requests yet. Submit your first build request!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {requests.map((r: any) => {
                  const sc = statusConfig[r.status] || statusConfig.queued;
                  const CatIcon = categoryIcons[r.category] || HelpCircle;
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedRequest === r.id;
                  const reqFiles = files[r.id] || [];
                  return (
                    <Card key={r.id} className="hover:border-border/80 transition-colors">
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="rounded-lg bg-muted p-2 shrink-0">
                            <CatIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{r.title}</span>
                              <Badge className={`text-[10px] ${sc.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {sc.label}
                              </Badge>
                              {r.contact_preference === "email" && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Mail className="h-3 w-3" /> Email contact
                                </Badge>
                              )}
                              {r.contact_preference === "phone" && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Phone className="h-3 w-3" /> {r.contact_phone || "Phone"}
                                </Badge>
                              )}
                            </div>
                            {r.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                              <span>{CATEGORIES.find((c: any) => c.value === r.category)?.label || r.category}</span>
                              <span>·</span>
                              <span>{new Date(r.created_at).toLocaleDateString()}</span>
                              {r.completed_at && (
                                <>
                                  <span>·</span>
                                  <span className="text-success">Completed {new Date(r.completed_at).toLocaleDateString()}</span>
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 ml-auto gap-1" onClick={() => toggleExpand(r.id)}>
                                <FileIcon className="h-3 w-3" />
                                Files
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Files section */}
                        {isExpanded && (
                          <div className="ml-11 space-y-2 border-t pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Shared Files</span>
                              <div className="flex gap-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  className="hidden"
                                  onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFileUpload(r.id, f);
                                    e.target.value = "";
                                  }}
                                />
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                  Upload
                                </Button>
                              </div>
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
                                      {f.uploaded_by_role === "admin" ? "Admin" : "You"}
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* New request dialog */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Concierge Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a client intake landing page" />
              </div>
              <div>
                <Label className="mb-1 block">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need built, any tools involved, and any deadlines..."
                  rows={4}
                />
              </div>

              {/* Contact preference */}
              <div>
                <Label className="mb-2 block">How should we contact you about this project?</Label>
                <RadioGroup value={contactPref} onValueChange={setContactPref} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="none" id="cp-none" />
                    <Label htmlFor="cp-none" className="font-normal cursor-pointer">No contact needed (updates in-app)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="cp-email" />
                    <Label htmlFor="cp-email" className="font-normal cursor-pointer flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Be contacted by email
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="phone" id="cp-phone" />
                    <Label htmlFor="cp-phone" className="font-normal cursor-pointer flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Be contacted by phone call
                    </Label>
                  </div>
                </RadioGroup>
                {contactPref === "phone" && (
                  <Input
                    className="mt-2"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="Your phone number"
                    type="tel"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A]"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
