import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  FileText,
  Clock,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

type LossRunStatus = "not_requested" | "requested" | "sent" | "partial_received" | "complete_received" | "not_needed";

const STATUS_CONFIG: Record<LossRunStatus, { label: string; color: string }> = {
  not_requested: { label: "Not Requested", color: "bg-muted text-muted-foreground" },
  requested: { label: "Requested", color: "bg-warning/20 text-warning" },
  sent: { label: "Sent", color: "bg-primary/10 text-primary" },
  partial_received: { label: "Partial Received", color: "bg-accent/20 text-accent-foreground" },
  complete_received: { label: "Complete", color: "bg-success/20 text-success" },
  not_needed: { label: "Not Needed", color: "bg-muted text-muted-foreground" },
};

interface PolicyItem {
  id?: string;
  insured_name: string;
  carrier_name: string;
  policy_number: string;
  effective_start: string;
  effective_end: string;
  line_of_business: string;
  request_email: string;
}

const EMPTY_POLICY: PolicyItem = {
  insured_name: "",
  carrier_name: "",
  policy_number: "",
  effective_start: "",
  effective_end: "",
  line_of_business: "",
  request_email: "",
};

interface LossRunsTabProps {
  leadId: string;
  accountName: string;
  submissionId?: string | null;
}

export function LossRunsTab({ leadId, accountName, submissionId }: LossRunsTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [request, setRequest] = useState<any>(null);
  const [policyItems, setPolicyItems] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PolicyItem | null>(null);
  const [newItem, setNewItem] = useState<PolicyItem>({ ...EMPTY_POLICY, insured_name: accountName });
  const [noteText, setNoteText] = useState("");

  const loadData = useCallback(async () => {
    if (!user || !leadId) return;

    // Get or create loss run request for this lead
    const { data: existing } = await supabase
      .from("loss_run_requests")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      setRequest(existing[0]);

      // Load policy items and attachments
      const [itemsRes, attachRes] = await Promise.all([
        supabase
          .from("loss_run_policy_items")
          .select("*")
          .eq("loss_run_request_id", existing[0].id)
          .order("created_at", { ascending: true }),
        supabase
          .from("loss_run_attachments")
          .select("*")
          .eq("loss_run_request_id", existing[0].id)
          .order("uploaded_at", { ascending: false }),
      ]);

      setPolicyItems(itemsRes.data ?? []);
      setAttachments(attachRes.data ?? []);
    } else {
      setRequest(null);
      setPolicyItems([]);
      setAttachments([]);
    }

    setLoading(false);
  }, [user, leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ensureRequest = async (): Promise<string | null> => {
    if (request) return request.id;
    if (!user) return null;

    const { data, error } = await supabase
      .from("loss_run_requests")
      .insert({
        lead_id: leadId,
        requested_by: user.id,
        status: "not_requested" as any,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create loss run request");
      return null;
    }

    setRequest(data);
    return data.id;
  };

  const addPolicyItem = async () => {
    if (!user) return;
    if (!newItem.carrier_name || !newItem.policy_number || !newItem.effective_start || !newItem.effective_end || !newItem.insured_name) {
      toast.error("Please fill all required fields");
      return;
    }

    const requestId = await ensureRequest();
    if (!requestId) return;

    const { error } = await supabase.from("loss_run_policy_items").insert({
      loss_run_request_id: requestId,
      insured_name: newItem.insured_name,
      carrier_name: newItem.carrier_name,
      policy_number: newItem.policy_number,
      effective_start: newItem.effective_start,
      effective_end: newItem.effective_end,
      line_of_business: newItem.line_of_business || null,
      request_email: newItem.request_email || null,
    });

    if (error) {
      toast.error("Failed to add policy item");
    } else {
      toast.success("Policy item added");
      setNewItem({ ...EMPTY_POLICY, insured_name: accountName });
      setAddPolicyOpen(false);
      loadData();
    }
  };

  const removePolicyItem = async (id: string) => {
    const { error } = await supabase.from("loss_run_policy_items").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
    else loadData();
  };

  const updateStatus = async (newStatus: LossRunStatus) => {
    if (!user) return;
    const requestId = await ensureRequest();
    if (!requestId) return;

    const updates: any = { status: newStatus as any };
    if (newStatus === "requested") updates.requested_at = new Date().toISOString();
    if (newStatus === "sent") updates.sent_at = new Date().toISOString();
    if (newStatus === "complete_received") updates.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from("loss_run_requests")
      .update(updates)
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      // Audit log
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: `loss_runs_${newStatus}`,
        object_type: "lead",
        object_id: leadId,
        metadata: { status: newStatus },
      });
      toast.success(`Loss runs marked as ${STATUS_CONFIG[newStatus].label}`);
      loadData();
    }
  };

  const updateNotes = async () => {
    if (!request) return;
    const { error } = await supabase
      .from("loss_run_requests")
      .update({ notes: noteText })
      .eq("id", request.id);

    if (error) toast.error("Failed to save notes");
    else {
      toast.success("Notes saved");
      loadData();
    }
  };

  const handleSendRequest = async () => {
    if (policyItems.length === 0) {
      toast.error("Add at least one prior policy before sending");
      return;
    }
    await updateStatus("requested");
    setSendModalOpen(false);
  };

  const currentStatus: LossRunStatus = (request?.status as LossRunStatus) || "not_requested";
  const statusConfig = STATUS_CONFIG[currentStatus];
  const receivedFiles = attachments.filter((a) => a.attachment_type === "received");

  useEffect(() => {
    if (request?.notes) setNoteText(request.notes);
  }, [request?.notes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={`${statusConfig.color} text-[10px] uppercase tracking-wider font-sans border-0`}>
                  {statusConfig.label}
                </Badge>
              </div>
              {request?.requested_at && (
                <p className="text-[10px] text-muted-foreground font-sans">
                  Requested {new Date(request.requested_at).toLocaleDateString()}
                </p>
              )}
              {request?.updated_at && (
                <p className="text-[10px] text-muted-foreground font-sans">
                  Last updated {new Date(request.updated_at).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {(currentStatus === "not_requested" || currentStatus === "requested" || currentStatus === "sent") && (
                <Button size="sm" variant="default" className="gap-1.5" onClick={() => setSendModalOpen(true)}>
                  <Send className="h-3.5 w-3.5" />
                  Send Request
                </Button>
              )}
              {receivedFiles.length > 0 && currentStatus !== "complete_received" && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateStatus("complete_received")}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Mark Complete
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => updateStatus("not_needed")}>
                <XCircle className="h-3.5 w-3.5" />
                Not Needed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prior Policies Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-sans">Policies Included in Request</h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
            setNewItem({ ...EMPTY_POLICY, insured_name: accountName });
            setAddPolicyOpen(true);
          }}>
            <Plus className="h-3.5 w-3.5" />
            Add Policy
          </Button>
        </div>

        {policyItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-sans">
                Add each prior policy you need loss runs for. You can add multiple policies and carriers.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Insured</TableHead>
                  <TableHead className="text-xs">Carrier</TableHead>
                  <TableHead className="text-xs">Policy #</TableHead>
                  <TableHead className="text-xs">Eff. Start</TableHead>
                  <TableHead className="text-xs">Eff. End</TableHead>
                  <TableHead className="text-xs">LOB</TableHead>
                  <TableHead className="text-xs w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-sans">{item.insured_name}</TableCell>
                    <TableCell className="text-xs font-sans">{item.carrier_name}</TableCell>
                    <TableCell className="text-xs font-sans">{item.policy_number}</TableCell>
                    <TableCell className="text-xs font-sans">{new Date(item.effective_start).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs font-sans">{new Date(item.effective_end).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs font-sans">{item.line_of_business || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePolicyItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Attachments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-sans">Authorization & Supporting Docs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attachments.filter(a => a.attachment_type === "authorization").map((att) => (
              <div key={att.id} className="flex items-center gap-2 text-xs font-sans">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate flex-1">{att.file_name}</span>
                <span className="text-muted-foreground">{new Date(att.uploaded_at).toLocaleDateString()}</span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground font-sans">
              Upload authorization letters here. File upload integration coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-sans">Received Loss Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {receivedFiles.map((att) => (
              <div key={att.id} className="flex items-center gap-2 text-xs font-sans">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate flex-1">{att.file_name}</span>
                <span className="text-muted-foreground">{new Date(att.uploaded_at).toLocaleDateString()}</span>
              </div>
            ))}
            {receivedFiles.length === 0 && (
              <p className="text-[10px] text-muted-foreground font-sans">
                No loss runs received yet. Upload files when received.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-sans">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add notes about this loss run request…"
            className="min-h-[80px] text-xs"
          />
          <Button size="sm" onClick={updateNotes} disabled={noteText === (request?.notes || "")}>
            Save Notes
          </Button>
        </CardContent>
      </Card>

      {/* Add Policy Item Dialog */}
      <Dialog open={addPolicyOpen} onOpenChange={setAddPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prior Policy</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <div>
              <Label>Insured Name *</Label>
              <Input
                value={newItem.insured_name}
                onChange={(e) => setNewItem({ ...newItem, insured_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Carrier *</Label>
                <Input
                  value={newItem.carrier_name}
                  onChange={(e) => setNewItem({ ...newItem, carrier_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Policy Number *</Label>
                <Input
                  value={newItem.policy_number}
                  onChange={(e) => setNewItem({ ...newItem, policy_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective Start *</Label>
                <Input
                  type="date"
                  value={newItem.effective_start}
                  onChange={(e) => setNewItem({ ...newItem, effective_start: e.target.value })}
                />
              </div>
              <div>
                <Label>Effective End *</Label>
                <Input
                  type="date"
                  value={newItem.effective_end}
                  onChange={(e) => setNewItem({ ...newItem, effective_end: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Line of Business</Label>
                <Input
                  value={newItem.line_of_business}
                  onChange={(e) => setNewItem({ ...newItem, line_of_business: e.target.value })}
                />
              </div>
              <div>
                <Label>Delivery Email</Label>
                <Input
                  type="email"
                  value={newItem.request_email}
                  onChange={(e) => setNewItem({ ...newItem, request_email: e.target.value })}
                  placeholder="AURA mailbox"
                />
              </div>
            </div>
            <Button onClick={addPolicyItem}>Add Policy</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Request Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Loss Run Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Step 1: Confirm policies */}
            <div>
              <h4 className="text-xs font-semibold font-sans mb-2 text-muted-foreground uppercase tracking-wider">
                Policies in Request
              </h4>
              {policyItems.length === 0 ? (
                <p className="text-xs text-destructive font-sans">
                  No policies added. Add at least one prior policy before sending.
                </p>
              ) : (
                <div className="space-y-1">
                  {policyItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs font-sans bg-muted/50 rounded px-2 py-1.5">
                      <span>{item.carrier_name} · #{item.policy_number}</span>
                      <span className="text-muted-foreground">
                        {new Date(item.effective_start).toLocaleDateString()} – {new Date(item.effective_end).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Send method */}
            <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold font-sans mb-2 text-muted-foreground uppercase tracking-wider">
                Send Method
              </h4>
            </div>
            <div className="space-y-2">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium font-sans">Manual Send</p>
                    <p className="text-[10px] text-muted-foreground font-sans">
                      Mark as requested. Producer sends manually.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => {
                  const url = leadId ? `/loss-runs/new?leadId=${leadId}` : "/loss-runs/new";
                  window.location.href = url;
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full border-2 border-primary" />
                  <div>
                    <p className="text-xs font-medium font-sans">AURA Loss Run Request</p>
                    <p className="text-[10px] text-muted-foreground font-sans">
                      Generate letter, e-sign, and auto-send to carrier
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSendRequest} className="flex-1 gap-1.5" disabled={policyItems.length === 0}>
                <Send className="h-3.5 w-3.5" />
                Send Request
              </Button>
              <Button variant="outline" onClick={() => setSendModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
