import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { User, Search, FolderOpen, ChevronRight, Mail, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ClientFolder {
  client_id: string;
  account_name: string;
  email_count: number;
  unread_count: number;
  latest_at: string;
}

interface FolderEmail {
  id: string;
  subject: string;
  from_name: string | null;
  from_address: string;
  received_at: string;
  is_read: boolean;
  body_preview: string | null;
}

interface ClientEmailFoldersProps {
  onSelectClient: (clientId: string | null) => void;
  selectedClientId: string | null;
}

export function ClientEmailFolders({ onSelectClient, selectedClientId }: ClientEmailFoldersProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [folderEmails, setFolderEmails] = useState<Record<string, FolderEmail[]>>({});
  const [loadingEmails, setLoadingEmails] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFolders = async () => {
      setLoading(true);

      const { data: emails } = await supabase
        .from("synced_emails")
        .select("client_id, is_read, received_at")
        .eq("user_id", user.id)
        .not("client_id", "is", null);

      if (!emails || emails.length === 0) {
        setFolders([]);
        setLoading(false);
        return;
      }

      const clientIds = [...new Set(emails.map((e) => e.client_id).filter(Boolean))] as string[];

      const { data: leads } = await supabase
        .from("leads")
        .select("id, account_name")
        .in("id", clientIds);

      const nameMap = new Map((leads || []).map((l) => [l.id, l.account_name]));

      const folderMap = new Map<string, ClientFolder>();
      for (const e of emails) {
        if (!e.client_id) continue;
        const existing = folderMap.get(e.client_id);
        if (existing) {
          existing.email_count++;
          if (!e.is_read) existing.unread_count++;
          if (e.received_at > existing.latest_at) existing.latest_at = e.received_at;
        } else {
          folderMap.set(e.client_id, {
            client_id: e.client_id,
            account_name: nameMap.get(e.client_id) || "Unknown Client",
            email_count: 1,
            unread_count: e.is_read ? 0 : 1,
            latest_at: e.received_at,
          });
        }
      }

      const sorted = Array.from(folderMap.values()).sort(
        (a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime()
      );
      setFolders(sorted);
      setLoading(false);
    };

    fetchFolders();
  }, [user]);

  const loadFolderEmails = async (clientId: string) => {
    if (folderEmails[clientId]) return;
    if (!user) return;
    setLoadingEmails(clientId);
    const { data } = await supabase
      .from("synced_emails")
      .select("id, subject, from_name, from_address, received_at, is_read, body_preview")
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .order("received_at", { ascending: false })
      .limit(20);
    setFolderEmails((prev) => ({ ...prev, [clientId]: (data as FolderEmail[]) || [] }));
    setLoadingEmails(null);
  };

  const toggleExpand = (clientId: string) => {
    if (expandedId === clientId) {
      setExpandedId(null);
    } else {
      setExpandedId(clientId);
      loadFolderEmails(clientId);
    }
  };

  const filtered = search.trim()
    ? folders.filter((f) => f.account_name.toLowerCase().includes(search.toLowerCase()))
    : folders;

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2">
        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">Client Folders</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">{folders.length}</Badge>
      </div>

      {/* Search */}
      <div className="px-2 mb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {folders.length === 0 ? "No client emails yet" : "No matches"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 px-1">
            {filtered.map((folder) => {
              const isExpanded = expandedId === folder.client_id;
              const emails = folderEmails[folder.client_id];
              const isLoadingThis = loadingEmails === folder.client_id;

              return (
                <Collapsible key={folder.client_id} open={isExpanded} onOpenChange={() => toggleExpand(folder.client_id)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                        isExpanded
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          <span className="text-sm font-medium truncate">{folder.account_name}</span>
                        </div>
                        {folder.unread_count > 0 && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            {folder.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 pl-5.5">
                        {folder.email_count} email{folder.email_count !== 1 ? "s" : ""}
                      </p>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-4 mr-1 border-l border-border pl-3 py-1 space-y-1">
                      {isLoadingThis ? (
                        <div className="space-y-1 py-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : emails && emails.length > 0 ? (
                        <>
                          {emails.map((email) => (
                            <button
                              key={email.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectClient(folder.client_id);
                              }}
                              className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <Mail className={`h-3 w-3 shrink-0 ${email.is_read ? "text-muted-foreground" : "text-primary"}`} />
                                <span className={`text-xs truncate ${email.is_read ? "" : "font-semibold"}`}>
                                  {email.subject || "(no subject)"}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground pl-4.5 truncate">
                                {email.from_name || email.from_address} · {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                              </p>
                            </button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-1.5 text-xs h-7 mt-1 text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pipeline/${folder.client_id}`);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Full Client Page
                          </Button>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground py-2">No emails found</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
