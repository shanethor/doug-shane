import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search, ChevronDown, User, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fuzzyMatch } from "@/lib/fuzzy-match";

const TAG_CHIPS = [
  { label: "COIs", tag: "coi_request" },
  { label: "Claims", tag: "claim" },
  { label: "Cancellations", tag: "cancellation_notice" },
  { label: "Audits", tag: "audit" },
  { label: "Renewals", tag: "renewal" },
  { label: "Billing", tag: "billing" },
  { label: "Endorsements", tag: "endorsement" },
  { label: "Service Requests", tag: "service_request" },
] as const;

export type Lead = { id: string; account_name: string; email: string | null };

interface EmailFilterChipsProps {
  activeTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedClients: Lead[];
  onClientsChange: (clients: Lead[]) => void;
}

export function EmailFilterChips({
  activeTags,
  onTagsChange,
  selectedClients,
  onClientsChange,
}: EmailFilterChipsProps) {
  const { user } = useAuth();
  const [clientSearch, setClientSearch] = useState("");
  const [allClients, setAllClients] = useState<Lead[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  const toggleTag = (tag: string) => {
    onTagsChange(
      activeTags.includes(tag)
        ? activeTags.filter((t) => t !== tag)
        : [...activeTags, tag]
    );
  };

  // Load all clients once when popover opens
  useEffect(() => {
    if (!clientOpen || clientsLoaded || !user) return;
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, account_name, email")
        .order("account_name", { ascending: true })
        .limit(500);
      setAllClients((data as Lead[]) || []);
      setClientsLoaded(true);
    })();
  }, [clientOpen, clientsLoaded, user]);

  // Fuzzy-filtered client list
  const filteredClients = clientSearch.trim()
    ? fuzzyMatch(clientSearch.trim(), allClients, (l) => `${l.account_name} ${l.email || ""}`, 0.3).map((r) => r.item)
    : allClients;

  const selectedIds = new Set(selectedClients.map((c) => c.id));

  const toggleClient = (lead: Lead) => {
    if (selectedIds.has(lead.id)) {
      onClientsChange(selectedClients.filter((c) => c.id !== lead.id));
    } else {
      onClientsChange([...selectedClients, lead]);
    }
  };

  const clearClients = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClientsChange([]);
  };

  const clientLabel =
    selectedClients.length === 0
      ? "All"
      : selectedClients.length === 1
        ? selectedClients[0].account_name
        : `${selectedClients.length} clients`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Tag filter chips */}
      {TAG_CHIPS.map((chip) => {
        const active = activeTags.includes(chip.tag);
        return (
          <Badge
            key={chip.tag}
            variant={active ? "default" : "outline"}
            className={`cursor-pointer select-none text-[11px] px-2.5 py-1 transition-colors ${
              active
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-muted"
            }`}
            onClick={() => toggleTag(chip.tag)}
          >
            {chip.label}
          </Badge>
        );
      })}

      {/* Client lookup chip */}
      <Popover open={clientOpen} onOpenChange={setClientOpen}>
        <PopoverTrigger asChild>
          <Badge
            variant={selectedClients.length > 0 ? "default" : "outline"}
            className={`cursor-pointer select-none text-[11px] px-2.5 py-1 gap-1 transition-colors ${
              selectedClients.length > 0
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "hover:bg-muted"
            }`}
          >
            <User className="h-3 w-3" />
            Client: {clientLabel}
            {selectedClients.length > 0 ? (
              <X
                className="h-3 w-3 ml-0.5 hover:text-destructive"
                onClick={clearClients}
              />
            ) : (
              <ChevronDown className="h-3 w-3 ml-0.5" />
            )}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="end">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients…"
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>

          {/* Selected clients pills */}
          {selectedClients.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2 px-1">
              {selectedClients.map((c) => (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => toggleClient(c)}
                >
                  {c.account_name}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="max-h-52">
            {filteredClients.length === 0 && clientSearch.trim() ? (
              <p className="text-xs text-muted-foreground text-center py-3">No matches</p>
            ) : filteredClients.length === 0 && !clientSearch.trim() ? (
              <p className="text-xs text-muted-foreground text-center py-3">No clients found</p>
            ) : (
              <div className="space-y-0.5">
                {filteredClients.map((lead) => {
                  const checked = selectedIds.has(lead.id);
                  return (
                    <button
                      key={lead.id}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                        checked ? "bg-muted/60" : ""
                      }`}
                      onClick={() => toggleClient(lead)}
                    >
                      <Checkbox checked={checked} className="h-3.5 w-3.5 pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lead.account_name}</p>
                        {lead.email && (
                          <p className="text-muted-foreground text-[10px] truncate">{lead.email}</p>
                        )}
                      </div>
                      {checked && <Check className="h-3 w-3 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
