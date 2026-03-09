import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, FileText, ShieldAlert, Edit3 } from "lucide-react";

import { toast } from "sonner";

export default function Approvals() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (!user || adminLoading) return;
    loadPolicies();
  }, [user, adminLoading, filter]);

  const loadPolicies = async () => {
    if (!user) return;
    let query = supabase
      .from("policies")
      .select("*, leads(id, account_name, submission_id)")
      .order("submitted_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    const { data } = await query;
    setPolicies(data ?? []);
    setLoading(false);
  };

  const approve = async (policyId: string) => {
    if (!user) return;

    // Check for proof documents
    const { data: docs } = await supabase
      .from("policy_documents")
      .select("id")
      .eq("policy_id", policyId);

    if (!docs || docs.length === 0) {
      toast.error("Cannot approve — no proof documents uploaded");
      return;
    }

    const { error } = await supabase
      .from("policies")
      .update({
        status: "approved" as any,
        approved_at: new Date().toISOString(),
        approved_by_user_id: user.id,
        locked: true,
      })
      .eq("id", policyId);

    if (error) {
      toast.error("Failed to approve");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "approve",
        object_type: "policy",
        object_id: policyId,
      });
      toast.success("Policy approved!");
      loadPolicies();
    }
  };

  const reject = async () => {
    if (!user || !rejectId) return;
    const { error } = await supabase
      .from("policies")
      .update({
        status: "rejected" as any,
        rejected_at: new Date().toISOString(),
        rejected_by_user_id: user.id,
        rejection_reason: rejectReason || "No reason provided",
      })
      .eq("id", rejectId);

    if (error) {
      toast.error("Failed to reject");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "reject",
        object_type: "policy",
        object_id: rejectId,
        metadata: { reason: rejectReason },
      });
      toast.success("Policy rejected");
      setRejectId(null);
      setRejectReason("");
      loadPolicies();
    }
  };

  if (adminLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <ShieldAlert className="h-8 w-8 text-destructive mb-3" />
          <p className="text-muted-foreground font-sans">Admin access required.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-4xl mb-2">Approvals Queue</h1>
      <p className="text-muted-foreground font-sans text-sm mb-6">
        Review and approve bound policies submitted by advisors.
      </p>

      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending ({policies.filter((p) => p.status === "pending").length})
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-sans">No policies awaiting approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm font-sans">
                        {p.leads?.account_name || "Unknown Lead"}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-sans space-y-0.5">
                      <p>{p.carrier} · {p.line_of_business} · #{p.policy_number}</p>
                      <p>Effective: {new Date(p.effective_date).toLocaleDateString()}</p>
                      <p>Premium: ${Number(p.annual_premium).toLocaleString()} · Revenue: ${Number(p.revenue).toLocaleString()}</p>
                      <p>Submitted: {new Date(p.submitted_at).toLocaleString()}</p>
                      {p.rejection_reason && <p className="text-destructive">Reason: {p.rejection_reason}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        {p.leads?.submission_id && (
                          <Link to={`/acord/acord-125/${p.leads.submission_id}`}>
                            <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-accent gap-0.5">
                              <Edit3 className="h-2.5 w-2.5" />
                              Workspace
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1 text-success" onClick={() => approve(p.id)}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => setRejectId(p.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Policy</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
          />
          <Button variant="destructive" onClick={reject}>Reject Policy</Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
