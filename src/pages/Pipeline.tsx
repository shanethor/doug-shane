import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, GripVertical, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: string;
  account_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  business_type: string | null;
  lead_source: string | null;
  owner_user_id: string;
  stage: "prospect" | "quoting" | "presenting" | "lost";
  created_at: string;
  updated_at: string;
  has_approved_policy?: boolean;
};

const STAGES = ["prospect", "quoting", "presenting", "lost"] as const;
const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  quoting: "Quoting",
  presenting: "Presenting",
  lost: "Lost",
  sold: "Sold",
};

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  quoting: "bg-primary/10 text-primary",
  presenting: "bg-accent/20 text-accent-foreground",
  lost: "bg-destructive/10 text-destructive",
  sold: "bg-success/20 text-success",
};

export default function Pipeline() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    account_name: "",
    contact_name: "",
    phone: "",
    email: "",
    state: "",
    business_type: "",
    lead_source: "",
  });

  const loadLeads = useCallback(async () => {
    if (!user) return;
    // Fetch leads and check for approved policies
    const { data: leadsData } = await supabase
      .from("leads")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!leadsData) {
      setLeads([]);
      setLoading(false);
      return;
    }

    // Check which leads have approved policies
    const { data: approvedPolicies } = await supabase
      .from("policies")
      .select("lead_id")
      .eq("status", "approved");

    const approvedLeadIds = new Set(
      (approvedPolicies ?? []).map((p: any) => p.lead_id)
    );

    setLeads(
      leadsData.map((l: any) => ({
        ...l,
        has_approved_policy: approvedLeadIds.has(l.id),
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleAddLead = async () => {
    if (!user || !newLead.account_name.trim()) return;
    const { error } = await supabase.from("leads").insert({
      account_name: newLead.account_name.trim(),
      contact_name: newLead.contact_name || null,
      phone: newLead.phone || null,
      email: newLead.email || null,
      state: newLead.state || null,
      business_type: newLead.business_type || null,
      lead_source: newLead.lead_source || null,
      owner_user_id: user.id,
    });

    if (error) {
      toast.error("Failed to add lead");
    } else {
      // Audit
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "create",
        object_type: "lead",
        object_id: "00000000-0000-0000-0000-000000000000",
      });
      toast.success("Lead added!");
      setNewLead({ account_name: "", contact_name: "", phone: "", email: "", state: "", business_type: "", lead_source: "" });
      setAddOpen(false);
      loadLeads();
    }
  };

  const moveStage = async (leadId: string, newStage: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage as any })
      .eq("id", leadId);

    if (error) {
      toast.error("Failed to move lead");
    } else {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "stage_move",
        object_type: "lead",
        object_id: leadId,
        metadata: { new_stage: newStage },
      });
      loadLeads();
    }
  };

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.account_name.toLowerCase().includes(q) ||
      (l.contact_name || "").toLowerCase().includes(q) ||
      (l.business_type || "").toLowerCase().includes(q)
    );
  });

  // Group by stage + sold
  const columns = [...STAGES, "sold" as const];
  const grouped: Record<string, Lead[]> = {};
  columns.forEach((s) => (grouped[s] = []));

  filtered.forEach((l) => {
    if (l.has_approved_policy) {
      grouped["sold"].push(l);
    } else {
      grouped[l.stage]?.push(l);
    }
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-4xl">Pipeline</h1>
          <p className="text-muted-foreground font-sans text-sm mt-1">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} — drag between stages to manage your pipeline.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 mt-2">
              <div>
                <Label>Account Name *</Label>
                <Input
                  value={newLead.account_name}
                  onChange={(e) => setNewLead({ ...newLead, account_name: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={newLead.contact_name}
                    onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    type="email"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={newLead.state}
                    onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Business Type</Label>
                  <Input
                    value={newLead.business_type}
                    onChange={(e) => setNewLead({ ...newLead, business_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lead Source</Label>
                  <Input
                    value={newLead.lead_source}
                    onChange={(e) => setNewLead({ ...newLead, lead_source: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddLead} disabled={!newLead.account_name.trim()}>
                Add Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {leads.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="pl-9 h-10"
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-3 min-h-[60vh]">
        {columns.map((stage) => (
          <div key={stage} className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </Badge>
              <span className="text-xs text-muted-foreground font-sans">{grouped[stage].length}</span>
            </div>
            <div className="flex-1 space-y-2 rounded-lg border border-dashed border-border/50 p-2 bg-muted/30 min-h-[200px]">
              {grouped[stage].map((lead) => (
                <Link key={lead.id} to={`/pipeline/${lead.id}`}>
                  <Card className="hover-lift cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm font-sans truncate">{lead.account_name}</p>
                          {lead.contact_name && (
                            <p className="text-xs text-muted-foreground font-sans truncate">{lead.contact_name}</p>
                          )}
                          {lead.business_type && (
                            <p className="text-[10px] text-muted-foreground font-sans mt-1">{lead.business_type}</p>
                          )}
                        </div>
                        {lead.has_approved_policy && (
                          <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {/* Stage move drop targets — simplified with buttons */}
              {stage !== "sold" && grouped[stage].length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-8 font-sans">
                  No leads
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
