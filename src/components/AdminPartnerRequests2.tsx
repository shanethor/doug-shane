import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PartnerRequest {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export default function AdminPartnerRequests() {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("partner_requests" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("partner_requests" as any)
      .update({ status } as any)
      .eq("id", id);
    load();
  };

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading...</div>;

  if (requests.length === 0) return <div className="p-6 text-muted-foreground text-sm">No partner requests yet.</div>;

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="p-4 rounded-lg border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-sm">{r.full_name}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
              {r.company && <div className="text-xs text-muted-foreground mt-0.5">{r.company}</div>}
              {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
              {r.message && <div className="text-xs text-muted-foreground mt-2 italic">"{r.message}"</div>}
              <div className="text-[10px] text-muted-foreground mt-2">{format(new Date(r.created_at), "MMM d, yyyy h:mm a")}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                {r.status}
              </Badge>
              {r.status === "pending" && (
                <>
                  <button onClick={() => updateStatus(r.id, "approved")} className="text-xs text-green-500 hover:underline">Approve</button>
                  <button onClick={() => updateStatus(r.id, "declined")} className="text-xs text-red-400 hover:underline">Decline</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
