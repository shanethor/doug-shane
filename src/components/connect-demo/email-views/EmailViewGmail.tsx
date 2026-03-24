import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Search, Star, Inbox, Send as SendIcon, FilePenLine, SendHorizonal, Tag,
  Plus, Paperclip, ArrowLeft, X, Sparkles, Reply, ReplyAll, Forward,
  ChevronDown, ChevronUp, Activity, User, Link2, CheckCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { useEmailEngine } from "./useEmailEngine";
import { SYNCED_ACCOUNTS, CLIENT_CONTACTS, CONNECT_MATCHES, TIER_COLORS, OUTREACH_COLORS, SMART_FEATURES } from "./useEmailEngine";
import type { useEmailAI } from "./useEmailAI";
import { AIResultPanel } from "./AIResultPanel";

type Engine = ReturnType<typeof useEmailEngine>;
type AI = ReturnType<typeof useEmailAI>;
type Folder = "inbox" | "sent" | "starred" | "drafts";

const FOLDERS: { key: Folder; label: string; icon: React.ElementType }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "sent", label: "Sent", icon: SendHorizonal },
  { key: "starred", label: "Starred", icon: Star },
  { key: "drafts", label: "Drafts", icon: FilePenLine },
];

export default function EmailViewGmail({ engine, ai }: { engine: Engine; ai: AI }) {
  const {
    filtered, selectedThread, unreadCount, searchQuery, setSearchQuery,
    folder, setFolder, accountFilter, setAccountFilter,
    selectedClient, setSelectedClient, customLabels, addLabel,
    toggleStar, selectThread, clearThread, markAllRead,
  } = engine;

  const [showCompose, setShowCompose] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [replyBody, setReplyBody] = useState("");

  return (
    <div>
      <div className="flex gap-0 lg:gap-4">
        {/* Gmail-style left sidebar */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 space-y-0.5 pt-1">
          <Button size="sm" className="w-full gap-2 text-sm mb-4 justify-start h-10 rounded-2xl shadow-md" style={{ background: "hsl(240 8% 12%)", color: "white", border: "1px solid hsl(240 6% 18%)" }} onClick={() => setShowCompose(true)}>
            <Plus className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} /> Compose
          </Button>
          {FOLDERS.map(f => (
            <button key={f.key} onClick={() => { setFolder(f.key); clearThread(); setSelectedClient(null); setSearchQuery(""); }}
              className={`flex items-center gap-3 text-sm px-4 py-2 rounded-r-full transition-colors w-full text-left ${folder === f.key ? "font-semibold" : ""}`}
              style={{ background: folder === f.key ? "hsl(140 12% 42% / 0.12)" : "transparent", color: folder === f.key ? "hsl(140 12% 58%)" : "hsl(240 5% 60%)" }}
            >
              <f.icon className="h-4 w-4" />
              <span className="flex-1">{f.label}</span>
              {f.key === "inbox" && unreadCount > 0 && <span className="text-xs font-bold" style={{ color: "hsl(140 12% 58%)" }}>{unreadCount}</span>}
            </button>
          ))}

          <div className="border-t pt-3 mt-3" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <div className="flex items-center justify-between px-4 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 40%)" }}>Labels</span>
              <button onClick={() => setShowLabelInput(v => !v)}><Plus className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} /></button>
            </div>
            {showLabelInput && (
              <div className="px-3 mb-1">
                <Input placeholder="New label…" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newLabel.trim()) { addLabel(newLabel); setNewLabel(""); setShowLabelInput(false); } }}
                  className="h-7 text-xs" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} autoFocus />
              </div>
            )}
            {customLabels.map(label => {
              const isActive = searchQuery === `is:${label}`;
              const count = engine.threads.filter(t => t.tags.some(tg => tg.toLowerCase() === label.toLowerCase())).length;
              return (
                <button key={label} onClick={() => { setSearchQuery(isActive ? "" : `is:${label}`); clearThread(); setFolder("inbox"); }}
                  className={`flex items-center gap-2 text-sm px-4 py-1.5 rounded-r-full hover:bg-white/5 w-full text-left ${isActive ? "font-semibold" : ""}`}
                  style={{ color: isActive ? "hsl(140 12% 58%)" : "hsl(240 5% 56%)" }}
                >
                  <Tag className="h-3 w-3" style={{ color: "hsl(140 12% 50%)" }} />
                  <span className="flex-1">{label}</span>
                  {count > 0 && <span className="text-[10px]" style={{ color: "hsl(140 12% 58%)" }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Search bar — Gmail style */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />
            <Input placeholder="Search mail" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 text-sm h-11 rounded-lg" style={{ background: "hsl(240 8% 10%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
            {searchQuery && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>}
          </div>

          {/* Filter chips row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["Unread", "Starred", "Has attachment"].map(chip => {
              const qMap: Record<string, string> = { "Unread": "is:unread", "Starred": "is:starred", "Has attachment": "has:attachment" };
              const active = searchQuery.includes(qMap[chip]);
              return (
                <button key={chip} onClick={() => setSearchQuery(active ? searchQuery.replace(qMap[chip], "").trim() : `${searchQuery} ${qMap[chip]}`.trim())}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: active ? "hsl(140 12% 42% / 0.15)" : "hsl(240 8% 12%)", color: active ? "hsl(140 12% 58%)" : "hsl(240 5% 55%)", border: `1px solid ${active ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 18%)"}` }}
                >{chip}</button>
              );
            })}
            <span className="mx-1 hidden lg:inline" style={{ color: "hsl(240 6% 20%)" }}>|</span>
            <button onClick={() => setAccountFilter("outreach")} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 ${accountFilter === "outreach" ? "" : ""}`}
              style={{ background: accountFilter === "outreach" ? "hsl(140 12% 42% / 0.15)" : "hsl(240 8% 12%)", color: accountFilter === "outreach" ? "hsl(140 12% 58%)" : "hsl(240 5% 55%)", border: `1px solid ${accountFilter === "outreach" ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 18%)"}` }}>
              <Activity className="h-3 w-3" /> Active Outreach
            </button>
          </div>

          {selectedThread ? (
            /* Gmail conversation view — full width stacked */
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1.5 text-sm" onClick={clearThread}><ArrowLeft className="h-4 w-4" /> Back to Inbox</Button>
              </div>
              <h2 className="text-lg font-semibold text-white">{selectedThread.subject}</h2>
              {/* AURA AI toolbar */}
              <div className="flex gap-2 flex-wrap">
                {["Summarize thread", "Draft reply with AI", "Log to pipeline"].map(a => (
                  <Button key={a} size="sm" variant="outline" className="text-xs h-7 gap-1.5" style={{ borderColor: "hsl(140 12% 42% / 0.3)", color: "hsl(140 12% 58%)" }} onClick={() => toast.success(`${a} (demo)`)}>
                    <Sparkles className="h-3 w-3" /> {a}
                  </Button>
                ))}
              </div>
              {/* Messages */}
              <div className="space-y-2">
                {selectedThread.messages.map((msg, idx) => (
                  <div key={msg.id} className="rounded-lg overflow-hidden" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: msg.from === "You" ? "hsl(140 12% 42%)" : "hsl(262 83% 45%)" }}>
                          {msg.from === "You" ? "Y" : msg.from.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-white">{msg.from}</span>
                          <span className="text-xs ml-2" style={{ color: "hsl(240 5% 40%)" }}>&lt;{msg.fromAddr}&gt;</span>
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: "hsl(240 5% 40%)" }}>{msg.date === "Today" ? msg.time : msg.date}</span>
                    </div>
                    <div className="px-3 pb-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 78%)" }}>{msg.body}</div>
                    {idx === selectedThread.messages.length - 1 && (
                      <div className="flex gap-2 px-3 pb-3 flex-wrap">
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }} onClick={() => toast.info("Reply (demo)")}><Reply className="h-3 w-3" /> Reply</Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" style={{ color: "hsl(240 5% 70%)" }}><Forward className="h-3 w-3" /> Forward</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Quick reply */}
              <div className="flex gap-2 items-end">
                <Textarea placeholder="Reply…" value={replyBody} onChange={e => setReplyBody(e.target.value)} className="flex-1 min-h-[60px] text-sm border-0 resize-none rounded-lg" style={{ background: "hsl(240 8% 7%)", color: "white", border: "1px solid hsl(240 6% 14%)" }} />
                <Button size="sm" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Reply sent (demo)"); setReplyBody(""); }}><SendIcon className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : (
            /* Gmail thread list — compact rows */
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }}>
              {filtered.length === 0 && <p className="text-center text-sm py-8" style={{ color: "hsl(240 5% 40%)" }}>No conversations</p>}
              {filtered.map((thread, idx) => {
                const lastMsg = thread.messages[thread.messages.length - 1];
                const snippet = lastMsg.from === "You" ? `You: ${lastMsg.body.slice(0, 60)}` : lastMsg.body.slice(0, 60);
                return (
                  <button key={thread.id} onClick={() => selectThread(thread.id)}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:bg-white/[0.04]"
                    style={{ background: thread.unread ? "hsl(140 12% 42% / 0.04)" : undefined, borderBottom: idx < filtered.length - 1 ? "1px solid hsl(240 6% 12%)" : undefined }}
                  >
                    <button className="shrink-0" onClick={(e) => toggleStar(thread.id, e)}>
                      <Star className={`h-4 w-4 ${thread.starred ? "fill-yellow-400 text-yellow-400" : ""}`} style={!thread.starred ? { color: "hsl(240 5% 30%)" } : {}} />
                    </button>
                    <span className={`text-sm w-32 truncate shrink-0 ${thread.unread ? "font-semibold text-white" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 65%)" } : {}}>
                      {thread.participants.filter(p => p !== "You").join(", ") || "You"}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`text-sm truncate ${thread.unread ? "text-white/90" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 50%)" } : {}}>{thread.subject}</span>
                      <span className="text-sm truncate" style={{ color: "hsl(240 5% 35%)" }}>— {snippet}…</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {thread.tags.slice(0, 1).map(t => <Badge key={t} variant="outline" className="text-[9px] h-4 px-1.5" style={{ borderColor: "hsl(140 12% 42% / 0.25)", color: "hsl(140 12% 50%)" }}>{t}</Badge>)}
                      {thread.hasAttachment && <Paperclip className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 36%)" }} />}
                      <span className="text-xs" style={{ color: thread.unread ? "hsl(140 12% 58%)" : "hsl(240 5% 40%)" }}>{lastMsg.date === "Today" ? lastMsg.time : lastMsg.date}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          <DialogHeader><DialogTitle className="text-white">New Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="To" className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <Input placeholder="Subject" className="text-sm h-9" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <Textarea placeholder="Compose email…" className="min-h-[120px] text-sm resize-none" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            <div className="flex gap-2">
              <Button className="text-sm" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { setShowCompose(false); toast.success("Sent (demo)"); }}><SendIcon className="h-4 w-4 mr-1.5" /> Send</Button>
              <Button variant="outline" className="text-sm gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI Draft</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
