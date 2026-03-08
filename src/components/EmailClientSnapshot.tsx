import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Phone, Mail, Shield, FileText, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ClientSnapshotProps {
  clientId: string;
}

type LeadInfo = {
  id: string;
  account_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  line_type: string;
};

type PolicyInfo = {
  id: string;
  line_of_business: string;
  carrier: string;
  status: string;
  effective_date: string;
  annual_premium: number;
  policy_number: string;
};

type LossRunInfo = {
  id: string;
  status: string;
  request_type: string;
};

export function EmailClientSnapshot({ clientId }: ClientSnapshotProps) {
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);

    Promise.all([
      supabase
        .from("leads")
        .select("id, account_name, contact_name, email, phone, stage, line_type")
        .eq("id", clientId)
        .single(),
      supabase
        .from("policies")
        .select("id, line_of_business, carrier, status, effective_date, annual_premium, policy_number")
        .eq("lead_id", clientId)
        .order("effective_date", { ascending: false })
        .limit(5),
      supabase
        .from("loss_run_requests")
        .select("id, status, request_type")
        .eq("lead_id", clientId)
        .in("status", ["requested", "sent", "partial_received"]),
    ]).then(([leadRes, policiesRes, lossRunsRes]) => {
      setLead((leadRes.data as LeadInfo) || null);
      setPolicies((policiesRes.data as PolicyInfo[]) || []);

      const items: string[] = [];
      const lr = (lossRunsRes.data as LossRunInfo[]) || [];
      if (lr.length > 0) items.push(`${lr.length} open loss run request(s)`);
      setOpenItems(items);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) {
    return (
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!lead) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          No client attached ·{" "}
          <span className="text-primary cursor-pointer hover:underline">Assign client</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardContent className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">{lead.account_name}</span>
          <Badge variant="outline" className="text-[10px]">{lead.stage}</Badge>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {lead.contact_name && (
            <span className="truncate">{lead.contact_name}</span>
          )}
          {lead.phone && (
            <span className="flex items-center gap-1 truncate">
              <Phone className="h-3 w-3" /> {lead.phone}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1 truncate col-span-2">
              <Mail className="h-3 w-3" /> {lead.email}
            </span>
          )}
        </div>

        {/* Policies */}
        {policies.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Policies
            </p>
            {policies.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs border-l-2 border-accent/30 pl-2 py-0.5"
              >
                <div className="truncate">
                  <span className="font-medium">{p.line_of_business}</span>
                  <span className="text-muted-foreground ml-1">· {p.carrier}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={p.status === "approved" ? "default" : "outline"}
                    className="text-[9px]"
                  >
                    {p.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(parseISO(p.effective_date), "MM/dd/yy")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Open items */}
        {openItems.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Open Items
            </p>
            {openItems.map((item, i) => (
              <p key={i} className="text-xs text-amber-600 dark:text-amber-400 pl-2 border-l-2 border-amber-400/30">
                {item}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
