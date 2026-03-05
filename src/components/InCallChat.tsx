import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, X, FileText, Image } from "lucide-react";
import { getCurrentBetaUser } from "@/lib/beta-users";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  sender: string;
  senderInitials: string;
  senderColor: string;
  text: string;
  timestamp: Date;
  attachment?: { name: string; type: string; url: string };
}

interface InCallChatProps {
  onClose: () => void;
  sendAppMessage?: (msg: any) => void;
}

export function InCallChat({ onClose, sendAppMessage }: InCallChatProps) {
  const user = getCurrentBetaUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() && !pendingFile) return;
    if (!user) return;

    let attachment: ChatMessage["attachment"] | undefined;
    if (pendingFile) {
      attachment = {
        name: pendingFile.name,
        type: pendingFile.type,
        url: URL.createObjectURL(pendingFile),
      };
    }

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: user.name,
      senderInitials: user.initials,
      senderColor: user.avatarColor,
      text: input.trim(),
      timestamp: new Date(),
      attachment,
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");
    setPendingFile(null);

    // Broadcast via Daily app-message if available
    if (sendAppMessage) {
      sendAppMessage({
        type: "in-call-chat",
        message: {
          ...msg,
          attachment: attachment ? { name: attachment.name, type: attachment.type } : undefined,
        },
      });
    }
  };

  // Called from parent when receiving a remote chat message
  const handleRemoteMessage = (data: any) => {
    if (data?.type === "in-call-chat" && data.message) {
      setMessages((prev) => [...prev, { ...data.message, timestamp: new Date(data.message.timestamp) }]);
    }
  };

  // Expose via ref-like pattern — parent can call this
  (InCallChat as any).__addRemote = handleRemoteMessage;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 shrink-0">
        <span className="text-xs font-semibold">Call Chat</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-8">
              No messages yet. Send a message or attach a file.
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender === user?.name;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${msg.senderColor}`}
                >
                  {msg.senderInitials}
                </div>
                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end" : ""}`}>
                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-xs ${
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {msg.text && <p>{msg.text}</p>}
                    {msg.attachment && (
                      <div className="mt-1">
                        {isImage(msg.attachment.type) && msg.attachment.url ? (
                          <img
                            src={msg.attachment.url}
                            alt={msg.attachment.name}
                            className="rounded max-h-32 max-w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] opacity-80">
                            <FileText className="h-3 w-3" />
                            <span className="truncate">{msg.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className={`text-[9px] text-muted-foreground ${isMe ? "text-right" : ""}`}>
                    {format(msg.timestamp, "h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Pending file preview */}
      {pendingFile && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex items-center gap-2">
          {pendingFile.type.startsWith("image/") ? (
            <Image className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          <span className="text-[10px] truncate flex-1">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="p-0.5 rounded hover:bg-muted">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-2 shrink-0">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={sendMessage}
          disabled={!input.trim() && !pendingFile}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
