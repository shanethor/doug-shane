import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Clock, CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export default function AdminIndustryRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("industry_requests" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests((data as any[]) || []);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("industry_requests" as any)
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Marked as ${status}`);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-[10px]">Building</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">{status}</Badge>;
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Industry Vertical Requests
          {requests.filter((r) => r.status === "pending").length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {requests.filter((r) => r.status === "pending").length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No industry requests yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{r.requested_industry}</span>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>
                    {r.full_name && <span>{r.full_name}</span>}
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(r.id, "in_progress")}>
                      Building
                    </Button>
                  )}
                  {r.status !== "completed" && (
                    <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(r.id, "completed")}>
                      Done
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
