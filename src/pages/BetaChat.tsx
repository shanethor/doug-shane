import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBetaUser, getOtherUser, BETA_USERS } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, AlertCircle, Paperclip, X, FileText, Image as ImageIcon,
  Building2, Search, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
}

interface LinkedClient {
  id: string;
  account_name: string;
  stage: string;
  line_type: string;
}

interface Attachment {
  name: string;
  type: string;
  url: string;
}

// Local enrichment store keyed by message id
const localAttachments = new Map<string, Attachment>();
const localLinkedClients = new Map<string, LinkedClient>();

export default function BetaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [rtError, setRtError] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingClient, setPendingClient] = useState<LinkedClient | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<LinkedClient[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const user = getCurrentBetaUser();
  const other = user ? getOtherUser(user.id) : null;

  // Load initial messages
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("beta_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data as ChatMessage[]);
    };
    load();
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("beta-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "beta_messages" },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setRtError(true);
      });
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Client search
  useEffect(() => {
    if (!showClientPicker) return;
    const t = setTimeout(async () => {
      setClientLoading(true);
      let query = supabase
        .from("leads")
        .select("id, account_name, stage, line_type")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (clientSearch.trim()) {
        query = query.ilike("account_name", `%${clientSearch}%`);
      }
      const { data } = await query;
      setClientResults((data as LinkedClient[]) || []);
      setClientLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [clientSearch, showClientPicker]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const selectClient = (client: LinkedClient) => {
    setPendingClient(client);
    setShowClientPicker(false);
    setClientSearch("");
  };

  const sendMessage = async () => {
    if (!user || !other || sending) return;
    if (!input.trim() && !pendingFile && !pendingClient) return;
    setSending(true);

    // Build the message text
    let text = input.trim();
    if (pendingClient) {
      const clientTag = `[client:${pendingClient.id}:${pendingClient.account_name}]`;
      text = text ? `${clientTag} ${text}` : clientTag;
    }
    if (pendingFile) {
      const fileTag = `[file:${pendingFile.name}]`;
      text = text ? `${text} ${fileTag}` : fileTag;
    }

    setInput("");
    const fileToStore = pendingFile;
    const clientToStore = pendingClient;
    setPendingFile(null);
    setPendingClient(null);

    const { data } = await supabase.from("beta_messages").insert({
      sender_id: user.id,
      recipient_id: other.id,
      text,
    }).select("id").single();

    // Store enrichments locally (keyed by message id)
    if (data?.id) {
      if (fileToStore) {
        localAttachments.set(data.id, {
          name: fileToStore.name,
          type: fileToStore.type,
          url: URL.createObjectURL(fileToStore),
        });
      }
      if (clientToStore) {
        localLinkedClients.set(data.id, clientToStore);
      }
    }

    setSending(false);
  };

  if (!user || !other) return null;

  const STAGE_LABELS: Record<string, string> = {
    prospect: "Prospect", quoting: "Quoting", presenting: "Presenting", lost: "Lost",
  };

  const renderMessageContent = (msg: ChatMessage) => {
    let text = msg.text;
    const attachment = localAttachments.get(msg.id);
    const linkedClient = localLinkedClients.get(msg.id);

    // Parse client tag from text
    const clientMatch = text.match(/\[client:([^:]+):([^\]]+)\]/);
    let parsedClient = linkedClient;
    if (clientMatch && !parsedClient) {
      parsedClient = { id: clientMatch[1], account_name: clientMatch[2], stage: "", line_type: "" };
    }
    text = text.replace(/\[client:[^\]]+\]/g, "").trim();

    // Parse file tag from text
    const fileMatch = text.match(/\[file:([^\]]+)\]/);
    let parsedFile = attachment;
    if (fileMatch && !parsedFile) {
      parsedFile = { name: fileMatch[1], type: "", url: "" };
    }
    text = text.replace(/\[file:[^\]]+\]/g, "").trim();

    return (
      <>
        {parsedClient && (
          <Link
            to={`/lead/${parsedClient.id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors mb-1 text-[11px] font-medium"
          >
            <Building2 className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate text-primary">{parsedClient.account_name}</span>
            <ExternalLink className="h-2.5 w-2.5 text-primary/60 shrink-0 ml-auto" />
          </Link>
        )}
        {text && <p>{text}</p>}
        {parsedFile && (
          <div className="mt-1">
            {parsedFile.type?.startsWith("image/") && parsedFile.url ? (
              <img src={parsedFile.url} alt={parsedFile.name} className="rounded max-h-40 max-w-full" />
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] opacity-80">
                <FileText className="h-3 w-3" />
                <span className="truncate">{parsedFile.name}</span>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {rtError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-1.5 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Real-time connection issue — messages may not update automatically.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center pt-20">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id;
          const sender = BETA_USERS[msg.sender_id];
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className={`h-7 w-7 rounded-full ${sender?.avatarColor || "bg-muted"} flex items-center justify-center shrink-0`}>
                <span className="text-[9px] font-bold text-white">{sender?.initials || "?"}</span>
              </div>
              <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {renderMessageContent(msg)}
                </div>
                <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? "text-right" : ""}`}>
                  {sender?.name} · {format(new Date(msg.created_at), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Pending items preview */}
      {(pendingFile || pendingClient) && (
        <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center gap-3 flex-wrap">
          {pendingClient && (
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2.5 py-1 text-[11px]">
              <Building2 className="h-3 w-3 text-primary" />
              <span className="font-medium text-primary">{pendingClient.account_name}</span>
              <button onClick={() => setPendingClient(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {pendingFile && (
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 text-[11px]">
              {pendingFile.type.startsWith("image/") ? (
                <ImageIcon className="h-3 w-3 text-primary" />
              ) : (
                <FileText className="h-3 w-3 text-primary" />
              )}
              <span className="truncate max-w-[150px]">{pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-background p-3">
        <div className="max-w-3xl mx-auto flex gap-2 items-center">
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fileRef.current?.click()}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Popover open={showClientPicker} onOpenChange={setShowClientPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Link a client"
              >
                <Building2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start" side="top">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search clients…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                    autoFocus
                  />
                </div>
                <ScrollArea className="max-h-48">
                  {clientLoading && (
                    <p className="text-[10px] text-muted-foreground text-center py-3">Searching…</p>
                  )}
                  {!clientLoading && clientResults.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-3">No clients found.</p>
                  )}
                  {clientResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 transition-colors flex items-center gap-2"
                    >
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.account_name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.line_type}</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] shrink-0">
                        {STAGE_LABELS[c.stage] || c.stage}
                      </Badge>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${other.name}…`}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() && !pendingFile && !pendingClient}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
