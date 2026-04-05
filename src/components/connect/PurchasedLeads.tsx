import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Mail, Phone, ArrowUpRight, ShoppingBag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PurchasedLeads() {
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["purchased-leads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("purchased_leads")
        .select("*")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const filtered = (leads ?? []).filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.company?.toLowerCase().includes(q) ||
      l.contact_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.state?.toLowerCase().includes(q)
    );
  });

  if (!leads?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No purchased leads yet</p>
          <p className="text-xs text-muted-foreground">
            Generate and purchase leads from the Lead Generator tab to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purchased leads…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
        <Badge variant="secondary" className="text-xs">{leads.length} purchased</Badge>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Company</TableHead>
                {!isMobile && <TableHead className="text-xs">Contact</TableHead>}
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Contact Info</TableHead>
                <TableHead className="text-xs">Purchased</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (lead.engine_lead_id) navigate(`/connect/leads/${lead.engine_lead_id}`);
                  }}
                >
                  <TableCell className="text-xs font-medium max-w-[180px] truncate">
                    {lead.company || "Unknown"}
                  </TableCell>
                  {!isMobile && (
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {lead.contact_name || "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{lead.state || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        (lead.score ?? 0) >= 80
                          ? "border-emerald-500/40 text-emerald-600"
                          : (lead.score ?? 0) >= 60
                          ? "border-yellow-500/40 text-yellow-600"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {lead.score ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {lead.email && <Mail className="h-3 w-3 text-primary" />}
                      {lead.phone && <Phone className="h-3 w-3 text-emerald-500" />}
                      {!lead.email && !lead.phone && <span className="text-[10px] text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {new Date(lead.purchased_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
