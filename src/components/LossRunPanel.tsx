import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, FileSearch, Eye, CheckCircle, Settings } from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  draft: { label: "Draft", variant: "bg-muted text-muted-foreground" },
  not_requested: { label: "Not Requested", variant: "bg-muted text-muted-foreground" },
  awaiting_signature: { label: "Awaiting Signature", variant: "bg-warning/20 text-warning" },
  requested: { label: "Requested", variant: "bg-warning/20 text-warning" },
  sent: { label: "Sent", variant: "bg-primary/10 text-primary" },
  partial_received: { label: "Partial", variant: "bg-accent/20 text-accent-foreground" },
  complete_received: { label: "Complete", variant: "bg-success/20 text-success" },
  fulfilled: { label: "Fulfilled", variant: "bg-success/20 text-success" },
  not_needed: { label: "N/A", variant: "bg-muted/50 text-muted-foreground" },
  cancelled: { label: "Cancelled", variant: "bg-destructive/20 text-destructive" },
};

export default function LossRunPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("loss_run_requests")
      .select("*, leads!loss_run_requests_lead_id_fkey(account_name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests(data || []);
        setLoading(false);
      });
  }, [user]);

  const statusCounts = requests.reduce((acc: Record<string, number>, r) => {
    acc[r.status || "draft"] = (acc[r.status || "draft"] || 0) + 1;
    return acc;
  }, {});

  const statCards = [
    { label: "Draft", count: (statusCounts.draft || 0) + (statusCounts.not_requested || 0) },
    { label: "Awaiting", count: (statusCounts.awaiting_signature || 0) + (statusCounts.requested || 0) },
    { label: "Sent", count: statusCounts.sent || 0 },
    { label: "Fulfilled", count: (statusCounts.fulfilled || 0) + (statusCounts.complete_received || 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Loss Run Requests</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/loss-runs/settings")} className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Carrier Directory
          </Button>
          <Button size="sm" onClick={() => navigate("/loss-runs/new")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        {loading ? (
          <CardContent className="py-12 text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          </CardContent>
        ) : requests.length === 0 ? (
          <CardContent className="py-12 text-center">
            <FileSearch className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No loss run requests yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/loss-runs/new")}>
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
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.slice(0, 20).map((r) => {
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
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/loss-runs/${r.id}`);
                      }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {requests.length > 20 && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/loss-runs")}>
            View All {requests.length} Requests
          </Button>
        </div>
      )}
    </div>
  );
}
