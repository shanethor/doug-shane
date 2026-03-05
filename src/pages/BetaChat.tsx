import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBetaUser, getOtherUser, BETA_USERS } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
}

export default function BetaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [rtError, setRtError] = useState(false);
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

  const sendMessage = async () => {
    if (!input.trim() || !user || !other || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    await supabase.from("beta_messages").insert({
      sender_id: user.id,
      recipient_id: other.id,
      text,
    });

    setSending(false);
  };

  if (!user || !other) return null;

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
                  {msg.text}
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

      {/* Input */}
      <div className="border-t border-border bg-background p-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${other.name}…`}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
