import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, User, Search } from "lucide-react";
import { toast } from "sonner";

type MarketplaceRequest = {
  id: string;
  user_id: string;
  referral_types: string;
  leads_seeking: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  email?: string;
  full_name?: string;
};

export default function AdminMarketplaceRequests() {
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Enrich with profile info
      const userIds = data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setRequests(
        data.map((r: any) => ({
          ...r,
          full_name: profileMap.get(r.user_id)?.full_name || "Unknown",
          email: profileMap.get(r.user_id)?.email || "",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: string, status: "approved" | "denied") => {
    const { error } = await supabase
      .from("marketplace_access_requests")
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update request");
      return;
    }
    toast.success(`Request ${status}`);
    fetchRequests();
  };

  const filtered = requests.filter((r) => {
    if (filter === "pending" && r.status !== "pending") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.referral_types.toLowerCase().includes(q) ||
        r.leads_seeking.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/30"><Clock className="h-2.5 w-2.5" />Pending</Badge>;
      case "approved": return <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-500/30"><CheckCircle className="h-2.5 w-2.5" />Approved</Badge>;
      case "denied": return <Badge variant="outline" className="text-[10px] gap-1 text-destructive border-destructive/30"><XCircle className="h-2.5 w-2.5" />Denied</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-8 text-xs" placeholder="Search requests…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setFilter("pending")}>
            Pending ({requests.filter(r => r.status === "pending").length})
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setFilter("all")}>
            All ({requests.length})
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No marketplace requests {filter === "pending" ? "pending" : "found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{req.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{req.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(req.status)}
                    <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Referrals They Can Offer</p>
                    <p className="text-xs leading-relaxed">{req.referral_types}</p>
                  </div>
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Leads They're Looking For</p>
                    <p className="text-xs leading-relaxed">{req.leads_seeking}</p>
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleAction(req.id, "denied")}>
                      <XCircle className="h-3 w-3" /> Deny
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(req.id, "approved")}>
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
