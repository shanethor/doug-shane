import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Search, ChevronDown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

type Lead = { id: string; account_name: string; email: string | null };

interface EmailFilterChipsProps {
  activeTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedClient: Lead | null;
  onClientChange: (client: Lead | null) => void;
}

export function EmailFilterChips({
  activeTags,
  onTagsChange,
  selectedClient,
  onClientChange,
}: EmailFilterChipsProps) {
  const { user } = useAuth();
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Lead[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    onTagsChange(
      activeTags.includes(tag)
        ? activeTags.filter((t) => t !== tag)
        : [...activeTags, tag]
    );
  };

  // Typeahead search for clients (leads)
  useEffect(() => {
    if (!clientSearch.trim() || !user) {
      setClientResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const q = clientSearch.trim().toLowerCase();
      const { data } = await supabase
        .from("leads")
        .select("id, account_name, email")
        .or(`account_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setClientResults((data as Lead[]) || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [clientSearch, user]);

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
            variant={selectedClient ? "default" : "outline"}
            className={`cursor-pointer select-none text-[11px] px-2.5 py-1 gap-1 transition-colors ${
              selectedClient
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "hover:bg-muted"
            }`}
          >
            <User className="h-3 w-3" />
            Client: {selectedClient ? selectedClient.account_name : "All"}
            {selectedClient ? (
              <X
                className="h-3 w-3 ml-0.5 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onClientChange(null);
                }}
              />
            ) : (
              <ChevronDown className="h-3 w-3 ml-0.5" />
            )}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search by name, email, FEIN…"
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-48">
            {clientResults.length === 0 && clientSearch.trim() ? (
              <p className="text-xs text-muted-foreground text-center py-3">No matches</p>
            ) : (
              <div className="space-y-0.5">
                {clientResults.map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
                    onClick={() => {
                      onClientChange(lead);
                      setClientOpen(false);
                      setClientSearch("");
                    }}
                  >
                    <p className="font-medium truncate">{lead.account_name}</p>
                    {lead.email && (
                      <p className="text-muted-foreground text-[10px] truncate">{lead.email}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
