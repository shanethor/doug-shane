import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, FileSignature, Send, CheckCircle, Download, RefreshCw, Upload, ExternalLink, Clock,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "awaiting_signature", label: "Awaiting Signature" },
  { key: "sent", label: "Sent" },
  { key: "fulfilled", label: "Fulfilled" },
];

const STATUS_MAP: Record<string, number> = {
  draft: 0, not_requested: 0,
  awaiting_signature: 1, requested: 1,
  sent: 2,
  fulfilled: 3, complete_received: 3, partial_received: 2,
  cancelled: -1, not_needed: -1,
};

export default function LossRunDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    const [reqRes, polRes, attRes] = await Promise.all([
      supabase.from("loss_run_requests").select("*").eq("id", id).single(),
      supabase.from("loss_run_policy_items").select("*").eq("loss_run_request_id", id),
      supabase.from("loss_run_attachments").select("*").eq("loss_run_request_id", id),
    ]);
    setRequest(reqRes.data);
    setPolicies(polRes.data || []);
    setAttachments(attRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const currentStep = STATUS_MAP[request?.status] ?? 0;

  const updateStatus = async (status: string) => {
    const updates: any = { status };
    if (status === "sent") updates.sent_at = new Date().toISOString();
    if (status === "fulfilled") updates.fulfilled_at = new Date().toISOString();
    await supabase.from("loss_run_requests").update(updates).eq("id", id);
    toast.success(`Status updated to ${status}`);
    load();
  };

  const resendSignatureEmail = async () => {
    if (!request?.signer_email || !request?.signature_token) {
      toast.error("Missing signer info");
      return;
    }
    const signUrl = `${window.location.origin}/loss-runs/${id}/sign?token=${request.signature_token}`;
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: request.signer_email,
          subject: `Reminder: Signature Required — Loss Run Request for ${request.named_insured}`,
          html: `<p>Please sign the loss run request: <a href="${signUrl}">Click here</a></p>`,
        },
      });
      toast.success("Signature reminder sent");
    } catch {
      toast.error("Failed to send reminder");
    }
  };

  const sendToCarrier = async () => {
    try {
      await supabase.functions.invoke("send-loss-run", { body: { requestId: id } });
      toast.success("Request sent to carrier(s)!");
      load();
    } catch {
      toast.error("Failed to send to carrier");
    }
  };

  const toggleRenewalSchedule = async (enabled: boolean) => {
    await supabase.from("loss_run_requests").update({
      renewal_scheduled: enabled,
    } as any).eq("id", id);
    toast.success(enabled ? "Renewal scheduling enabled" : "Renewal scheduling disabled");
    load();
  };

  const updateDaysBefore = async (days: number) => {
    await supabase.from("loss_run_requests").update({
      days_before_renewal: days,
    } as any).eq("id", id);
    load();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!request) {
    return (
      <AppLayout>
        <p className="text-center py-20 text-muted-foreground">Request not found.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/loss-runs")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{request.named_insured || "Loss Run Request"}</h1>
            <p className="text-xs text-muted-foreground">Created {new Date(request.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((s, i) => {
                const active = currentStep >= i;
                const isCurrent = currentStep === i;
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}>
                      {i + 1}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                      {s.key === "draft" && request.created_at && (
                        <p className="text-[10px] text-muted-foreground">{new Date(request.created_at).toLocaleDateString()}</p>
                      )}
                      {s.key === "awaiting_signature" && request.signed_at && (
                        <p className="text-[10px] text-muted-foreground">Signed {new Date(request.signed_at).toLocaleDateString()}</p>
                      )}
                      {s.key === "sent" && request.sent_at && (
                        <p className="text-[10px] text-muted-foreground">{new Date(request.sent_at).toLocaleDateString()}</p>
                      )}
                      {s.key === "fulfilled" && request.fulfilled_at && (
                        <p className="text-[10px] text-muted-foreground">{new Date(request.fulfilled_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    {i < STATUS_STEPS.length - 1 && <div className={`h-0.5 flex-1 ${active ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {(request.status === "draft" || request.status === "not_requested") && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={() => navigate(`/loss-runs/new?leadId=${request.lead_id}`)}>
                    <FileSignature className="h-3.5 w-3.5" /> Edit & Send
                  </Button>
                </>
              )}
              {request.status === "awaiting_signature" && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={resendSignatureEmail}>
                    <RefreshCw className="h-3.5 w-3.5" /> Resend Signature Request
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/loss-runs/${id}/sign?token=${request.signature_token}`
                      );
                      toast.success("Signing link copied");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Copy Signing Link
                  </Button>
                </>
              )}
              {(request.status === "sent" || request.status === "requested") && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
                    <Upload className="h-3.5 w-3.5" /> Upload Returned Loss Run
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={sendToCarrier}>
                    <Send className="h-3.5 w-3.5" /> Resend to Carrier
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateStatus("fulfilled")}>
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Fulfilled
                  </Button>
                </>
              )}
              {(request.status === "fulfilled" || request.status === "complete_received") && request.returned_loss_run_url && (
                <a href={request.returned_loss_run_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download Returned Loss Run
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Letter Preview */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Letter Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-muted/30 border border-border rounded-lg p-5 font-serif text-sm leading-relaxed space-y-2">
              <p>{new Date(request.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              <p className="font-bold">RE: Loss Run Request</p>
              <p>Named Insured: {request.named_insured}</p>
              {policies.map((p, i) => (
                <div key={i} className="pl-4 border-l-2 border-primary/20">
                  <p>Carrier: {p.carrier_name} · Policy: {p.policy_number}</p>
                </div>
              ))}
              <p>To Whom It May Concern,</p>
              <p>On behalf of {request.named_insured}, I hereby request a copy of the current Loss Run for policies listed above for the past {(request as any).years_requested || 5} years.</p>
              <p>Sincerely,<br/>{(request as any).signer_name}</p>
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Policies Included</CardTitle></CardHeader>
          <CardContent>
            {policies.length === 0 ? (
              <p className="text-xs text-muted-foreground">No policies attached.</p>
            ) : (
              <div className="space-y-2">
                {policies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
                    <span className="font-medium">{p.carrier_name} · #{p.policy_number}</span>
                    <span className="text-muted-foreground">
                      {p.effective_start && new Date(p.effective_start).toLocaleDateString()} – {p.effective_end && new Date(p.effective_end).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renewal Scheduling */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Renewal Scheduling</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={(request as any).renewal_scheduled || false}
                onCheckedChange={toggleRenewalSchedule}
              />
              <Label className="text-xs">Auto-request loss run before renewal</Label>
            </div>
            {(request as any).renewal_scheduled && (
              <div>
                <Label className="text-xs">Days before expiration</Label>
                <Select
                  value={String((request as any).days_before_renewal || 90)}
                  onValueChange={(v) => updateDaysBefore(Number(v))}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[30, 60, 90, 120].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Attachments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
                    <span>{a.file_name}</span>
                    <Badge className="text-[9px]">{a.attachment_type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Returned Loss Run</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <p className="text-xs text-muted-foreground">Upload the loss run PDF received from the carrier.</p>
              <Input ref={fileRef} type="file" accept=".pdf,.jpg,.png" />
              <Button onClick={async () => {
                const file = fileRef.current?.files?.[0];
                if (!file || !user) return;
                toast.info("Upload feature requires storage bucket setup. Marking as fulfilled.");
                await updateStatus("fulfilled");
                setUploadOpen(false);
              }}>
                Upload & Mark Fulfilled
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
