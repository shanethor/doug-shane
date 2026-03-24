import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Search, Star, Inbox, Send as SendIcon, FilePenLine, SendHorizonal, Tag,
  Plus, Paperclip, ArrowLeft, X, Sparkles, Reply, ReplyAll, Forward,
  Archive, Flag, Activity,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { useEmailEngine } from "./useEmailEngine";
import { SYNCED_ACCOUNTS, CONNECT_MATCHES, TIER_COLORS } from "./useEmailEngine";
import type { useEmailAI } from "./useEmailAI";
import { AIResultPanel } from "./AIResultPanel";

type Engine = ReturnType<typeof useEmailEngine>;
type AI = ReturnType<typeof useEmailAI>;
type Folder = "inbox" | "sent" | "starred" | "drafts";

const FOLDERS: { key: Folder; label: string; icon: React.ElementType }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "sent", label: "Sent Items", icon: SendHorizonal },
  { key: "starred", label: "Flagged", icon: Flag },
  { key: "drafts", label: "Drafts", icon: FilePenLine },
];

export default function EmailViewOutlook({ engine, ai }: { engine: Engine; ai: AI }) {
  const {
    filtered, selectedThread, unreadCount, searchQuery, setSearchQuery,
    folder, setFolder, selectThread, clearThread, toggleStar, markAllRead,
    customLabels,
  } = engine;

  const [replyBody, setReplyBody] = useState("");

  return (
    <div className="flex gap-0 h-[calc(100vh-180px)] min-h-[500px]" style={{ border: "1px solid hsl(240 6% 14%)", borderRadius: 8, overflow: "hidden" }}>
      {/* Outlook folder tree — narrow */}
      <div className="hidden lg:flex flex-col w-44 shrink-0 py-2 space-y-0.5" style={{ background: "hsl(240 8% 6%)", borderRight: "1px solid hsl(240 6% 14%)" }}>
        {FOLDERS.map(f => (
          <button key={f.key} onClick={() => { setFolder(f.key); clearThread(); }}
            className={`flex items-center gap-2.5 text-sm px-3 py-2 transition-colors w-full text-left ${folder === f.key ? "font-semibold" : ""}`}
            style={{ background: folder === f.key ? "hsl(200 60% 50% / 0.1)" : "transparent", color: folder === f.key ? "hsl(200 60% 60%)" : "hsl(240 5% 60%)", borderLeft: folder === f.key ? "3px solid hsl(200 60% 55%)" : "3px solid transparent" }}
          >
            <f.icon className="h-4 w-4" />
            <span className="flex-1">{f.label}</span>
            {f.key === "inbox" && unreadCount > 0 && <span className="text-xs font-bold" style={{ color: "hsl(200 60% 60%)" }}>{unreadCount}</span>}
          </button>
        ))}
        <div className="border-t mt-2 pt-2 px-3" style={{ borderColor: "hsl(240 6% 14%)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 35%)" }}>Custom Folders</span>
          {customLabels.slice(0, 4).map(label => (
            <button key={label} onClick={() => engine.setSearchQuery(`is:${label}`)}
              className="flex items-center gap-2 text-xs px-0 py-1.5 w-full text-left hover:text-white transition-colors"
              style={{ color: "hsl(240 5% 50%)" }}>
              <Archive className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Outlook message list — middle pane */}
      <div className="flex flex-col w-full lg:w-80 shrink-0 overflow-hidden" style={{ background: "hsl(240 8% 7%)", borderRight: "1px solid hsl(240 6% 14%)" }}>
        {/* Search */}
        <div className="p-2" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
            <Input placeholder="Search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-8 rounded-sm" style={{ background: "hsl(240 8% 10%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((thread, idx) => {
            const lastMsg = thread.messages[thread.messages.length - 1];
            const isSelected = selectedThread?.id === thread.id;
            return (
              <button key={thread.id} onClick={() => selectThread(thread.id)}
                className="w-full text-left px-3 py-3 transition-colors hover:bg-white/[0.03]"
                style={{
                  background: isSelected ? "hsl(200 60% 50% / 0.08)" : thread.unread ? "hsl(140 12% 42% / 0.03)" : undefined,
                  borderBottom: "1px solid hsl(240 6% 10%)",
                  borderLeft: isSelected ? "3px solid hsl(200 60% 55%)" : thread.unread ? "3px solid hsl(140 12% 50%)" : "3px solid transparent",
                }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm truncate ${thread.unread ? "font-semibold text-white" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 65%)" } : {}}>
                    {thread.participants.filter(p => p !== "You").join(", ") || "You"}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: "hsl(240 5% 40%)" }}>{lastMsg.date === "Today" ? lastMsg.time : lastMsg.date}</span>
                </div>
                <p className={`text-sm truncate ${thread.unread ? "text-white/80" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 50%)" } : {}}>{thread.subject}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: "hsl(240 5% 38%)" }}>{lastMsg.body.slice(0, 80)}</p>
                <div className="flex gap-1 mt-1">
                  {thread.hasAttachment && <Paperclip className="h-3 w-3" style={{ color: "hsl(240 5% 36%)" }} />}
                  {thread.tags.slice(0, 1).map(t => <Badge key={t} variant="outline" className="text-[8px] h-3.5 px-1" style={{ borderColor: "hsl(140 12% 42% / 0.25)", color: "hsl(140 12% 50%)" }}>{t}</Badge>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Outlook reading pane — right */}
      <div className="hidden lg:flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: "hsl(240 8% 8%)" }}>
        {selectedThread ? (
          <div className="flex-1 overflow-y-auto">
            {/* Actions bar */}
            <div className="flex items-center gap-2 px-4 py-2 flex-wrap" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }}><Reply className="h-3 w-3" /> Reply</Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }}><ReplyAll className="h-3 w-3" /> Reply All</Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }}><Forward className="h-3 w-3" /> Forward</Button>
              <div className="flex-1" />
              {/* AURA AI bar */}
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => ai.summarize(selectedThread)} disabled={ai.summaryLoading}>
                <Sparkles className={`h-3 w-3 ${ai.summaryLoading ? "animate-spin" : ""}`} /> {ai.summaryLoading ? "…" : "Summarize"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => ai.aiReply(selectedThread)} disabled={ai.replyLoading}>
                <Sparkles className={`h-3 w-3 ${ai.replyLoading ? "animate-spin" : ""}`} /> {ai.replyLoading ? "…" : "AI Reply"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => ai.aiDraft(selectedThread)} disabled={ai.draftLoading}>
                <Sparkles className={`h-3 w-3 ${ai.draftLoading ? "animate-spin" : ""}`} /> {ai.draftLoading ? "…" : "AI Draft"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => ai.addToPipeline(selectedThread)}>
                Add to Pipeline
              </Button>
            </div>

            {/* Subject */}
            <div className="px-5 py-4">
              <h2 className="text-lg font-semibold text-white mb-1">{selectedThread.subject}</h2>
              <div className="flex gap-1.5">{selectedThread.tags.map(t => <Badge key={t} variant="outline" className="text-xs" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }}>{t}</Badge>)}</div>
            </div>

            {/* Messages */}
            <div className="px-5 space-y-4">
              {selectedThread.messages.map(msg => (
                <div key={msg.id} className="pb-4" style={{ borderBottom: "1px solid hsl(240 6% 12%)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: msg.from === "You" ? "hsl(140 12% 42%)" : "hsl(200 60% 45%)" }}>
                      {msg.from === "You" ? "Y" : msg.from.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{msg.from}</p>
                      <p className="text-xs" style={{ color: "hsl(240 5% 40%)" }}>To: {msg.to} • {msg.date === "Today" ? msg.time : msg.date}</p>
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap pl-12" style={{ color: "hsl(240 5% 78%)" }}>{msg.body}</div>
                </div>
              ))}
            </div>

            {/* Quick reply at bottom */}
            <div className="p-4 mt-auto" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
              <Textarea placeholder="Click here to reply…" value={replyBody} onChange={e => setReplyBody(e.target.value)} className="min-h-[50px] text-sm resize-none mb-2" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
              <div className="flex gap-2">
                <Button size="sm" style={{ background: "hsl(200 60% 50%)" }} onClick={() => { toast.success("Sent (demo)"); setReplyBody(""); }}><SendIcon className="h-3.5 w-3.5 mr-1" /> Send</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.success("AI draft (demo)")}><Sparkles className="h-3.5 w-3.5" /> AI Draft</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Mail className="h-12 w-12 mx-auto" style={{ color: "hsl(240 5% 25%)" }} />
              <p className="text-sm" style={{ color: "hsl(240 5% 40%)" }}>Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
