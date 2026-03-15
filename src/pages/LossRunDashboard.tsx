import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, FileSearch, Send, Eye, CheckCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type LRStatus = "draft" | "not_requested" | "awaiting_signature" | "requested" | "sent" | "partial_received" | "complete_received" | "fulfilled" | "not_needed" | "cancelled";

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  draft: { label: "Draft", variant: "bg-muted text-muted-foreground" },
  not_requested: { label: "Not Requested", variant: "bg-muted text-muted-foreground" },
  awaiting_signature: { label: "Awaiting Signature", variant: "bg-warning/20 text-warning" },
  requested: { label: "Requested", variant: "bg-warning/20 text-warning" },
  sent: { label: "Sent", variant: "bg-primary/10 text-primary" },
  partial_received: { label: "Partial", variant: "bg-accent/20 text-accent-foreground" },
  complete_received: { label: "Complete", variant: "bg-success/20 text-success" },
  fulfilled: { label: "Fulfilled", variant: "bg-success/20 text-success" },
  not_needed: { label: "Not Needed", variant: "bg-muted/50 text-muted-foreground" },
  cancelled: { label: "Cancelled", variant: "bg-destructive/20 text-destructive" },
};

export default function LossRunDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("loss_run_requests")
        .select("*, leads!loss_run_requests_lead_id_fkey(account_name)")
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setLoading(false);
    })();
  }, [user]);

  const statusCounts = requests.reduce((acc: Record<string, number>, r) => {
    const s = r.status || "draft";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statCards = [
    { label: "Draft", key: "draft", count: (statusCounts.draft || 0) + (statusCounts.not_requested || 0) },
    { label: "Awaiting Signature", key: "awaiting_signature", count: (statusCounts.awaiting_signature || 0) + (statusCounts.requested || 0) },
    { label: "Sent", key: "sent", count: statusCounts.sent || 0 },
    { label: "Fulfilled", key: "fulfilled", count: (statusCounts.fulfilled || 0) + (statusCounts.complete_received || 0) },
  ];

  const markFulfilled = async (id: string) => {
    const { error } = await supabase
      .from("loss_run_requests")
      .update({ status: "fulfilled" as any, fulfilled_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Marked as fulfilled");
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "fulfilled" } : r));
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileSearch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Loss Run Requests</h1>
        </div>
        <Button onClick={() => navigate("/loss-runs/new")} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Stat Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <Card key={s.key}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="py-12 text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          </CardContent>
        ) : requests.length === 0 ? (
          <CardContent className="py-12 text-center">
            <FileSearch className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No loss run requests yet.</p>
            <Button variant="outline" className="mt-3" onClick={() => navigate("/loss-runs/new")}>
              Create Your First Request
            </Button>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Named Insured</TableHead>
                <TableHead className="text-xs">Lead</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const badge = STATUS_BADGE[r.status] || STATUS_BADGE.draft;
                const leadName = (r as any).leads?.account_name;
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/loss-runs/${r.id}`)}>
                    <TableCell className="text-xs font-medium">{(r as any).named_insured || leadName || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{leadName || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${badge.variant} text-[10px] uppercase tracking-wider border-0`}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/loss-runs/${r.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {(r.status === "sent" || r.status === "partial_received") && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markFulfilled(r.id)}>
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
