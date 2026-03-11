import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  account_name: string;
  contact_name: string | null;
  email: string | null;
}

interface EmailClientAssignProps {
  emailId: string;
  clientId: string | null;
  onClientChanged: (clientId: string | null) => void;
}

export function EmailClientAssign({ emailId, clientId, onClientChanged }: EmailClientAssignProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);

  // Fetch current client name
  useEffect(() => {
    if (!clientId) { setClientName(null); return; }
    supabase
      .from("leads")
      .select("account_name")
      .eq("id", clientId)
      .single()
      .then(({ data }) => setClientName(data?.account_name || null));
  }, [clientId]);

  const searchLeads = useCallback(async (q: string) => {
    if (!user) return;
    setLoading(true);
    const query = supabase
      .from("leads")
      .select("id, account_name, contact_name, email")
      .eq("owner_user_id", user.id)
      .order("account_name")
      .limit(20);

    if (q.trim()) {
      query.ilike("account_name", `%${q.trim()}%`);
    }

    const { data } = await query;
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) searchLeads(search);
  }, [open, search, searchLeads]);

  const assignClient = async (leadId: string | null) => {
    setSaving(true);
    const { error } = await supabase
      .from("synced_emails")
      .update({ client_id: leadId, client_link_source: leadId ? "manual" : null })
      .eq("id", emailId);

    if (error) {
      toast.error("Failed to assign client");
    } else {
      onClientChanged(leadId);
      toast.success(leadId ? "Client assigned" : "Client unassigned");

      // Trigger attachment ingestion when assigning a client
      if (leadId) {
        try {
          await supabase.functions.invoke("email-sync", {
            body: { action: "ingest-email", email_id: emailId, client_id: leadId },
          });
        } catch (e) {
          console.error("Ingest trigger error:", e);
        }
      }
    }
    setSaving(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 hover:bg-muted transition-colors">
          <User className="h-3 w-3" />
          {clientName ? (
            <span className="font-medium text-foreground">{clientName}</span>
          ) : (
            <span className="text-muted-foreground">Assign to client</span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="pl-7 h-8 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-48">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No clients found</p>
          ) : (
            <div className="space-y-0.5">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => assignClient(lead.id)}
                  disabled={saving}
                  className={`w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors ${
                    lead.id === clientId ? "bg-primary/10 font-medium" : ""
                  }`}
                >
                  <p className="truncate font-medium">{lead.account_name}</p>
                  {lead.contact_name && (
                    <p className="text-muted-foreground truncate">{lead.contact_name}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {clientId && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 text-xs text-destructive hover:text-destructive"
            onClick={() => assignClient(null)}
            disabled={saving}
          >
            <X className="h-3 w-3 mr-1" />
            Remove client link
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
