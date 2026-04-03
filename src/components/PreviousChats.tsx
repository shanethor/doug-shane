import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Conversation = {
  id: string;
  title: string;
  messages: any[];
  updated_at: string;
};

interface PreviousChatsProps {
  onLoad: (id: string, messages: any[]) => void;
  onNewChat: () => void;
  currentConversationId: string | null;
}

export default function PreviousChats({ onLoad, onNewChat, currentConversationId }: PreviousChatsProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sage_conversations")
      .select("id, title, messages, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);
    setConversations((data as Conversation[]) || []);
    setLoading(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("sage_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  };

  if (!user || loading) return null;

  return (
    <div className="w-full max-w-2xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">Previous chats</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
            {conversations.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={onNewChat}
        >
          <Plus className="h-3 w-3" />
          New chat
        </Button>
      </div>
      {conversations.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-3 text-center">No previous chats yet. Start a conversation and it will appear here.</p>
      ) : (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {conversations.map((conv) => {
              const msgCount = Array.isArray(conv.messages) ? conv.messages.length : 0;
              const isActive = conv.id === currentConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => onLoad(conv.id, conv.messages)}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors group ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {conv.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {msgCount} messages · {formatTime(conv.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
