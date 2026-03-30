import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Search, Star, Inbox, Send as SendIcon, FilePenLine, SendHorizonal, Tag,
  Plus, Paperclip, ArrowLeft, X, Sparkles, Reply, ReplyAll, Forward,
  CheckCheck, Activity, User, Link2, Target, Building2, MapPin, Users,
  CalendarPlus, FileText, ListTodo, BarChart3, Shield, Bell, TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { useEmailEngine } from "./useEmailEngine";
import { SYNCED_ACCOUNTS, CONNECT_MATCHES, TIER_COLORS, OUTREACH_COLORS, CLIENT_CONTACTS, SMART_FEATURES } from "./useEmailEngine";
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

export default function EmailViewAura({ engine, ai }: { engine: Engine; ai: AI }) {
  const {
    filtered, selectedThread, unreadCount, searchQuery, setSearchQuery,
    folder, setFolder, accountFilter, setAccountFilter,
    selectedClient, setSelectedClient, customLabels, addLabel,
    toggleStar, selectThread, clearThread, markAllRead, hydratingThreadId,
  } = engine;

  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [contextTab, setContextTab] = useState("summary");

  // Get match for selected thread
  const getThreadMatch = () => {
    if (!selectedThread) return null;
    const addrs = selectedThread.messages.map(m => m.from === "You" ? m.toAddr : m.fromAddr);
    for (const addr of addrs) {
      if (CONNECT_MATCHES[addr]) return CONNECT_MATCHES[addr];
    }
    return null;
  };
  const match = getThreadMatch();

  return (
    <div>
      <div className="flex gap-0 lg:gap-3">
        {/* Compact left sidebar */}
        <div className="hidden lg:flex flex-col w-40 shrink-0 space-y-0.5 pt-1">
          {FOLDERS.map(f => (
            <button key={f.key} onClick={() => { setFolder(f.key); clearThread(); setSelectedClient(null); setSearchQuery(""); }}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-colors w-full text-left ${folder === f.key ? "bg-white/10 text-white font-semibold" : ""}`}
              style={folder !== f.key ? { color: "hsl(240 5% 55%)" } : {}}
            >
              <f.icon className="h-3.5 w-3.5" />
              <span className="flex-1">{f.label}</span>
              {f.key === "inbox" && unreadCount > 0 && <span className="text-[10px] font-bold" style={{ color: "hsl(140 12% 58%)" }}>{unreadCount}</span>}
            </button>
          ))}
          <div className="border-t pt-2 mt-2" style={{ borderColor: "hsl(240 6% 14%)" }}>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(240 5% 35%)" }}>Labels</span>
              <button onClick={() => setShowLabelInput(v => !v)}><Plus className="h-3 w-3" style={{ color: "hsl(240 5% 46%)" }} /></button>
            </div>
            {showLabelInput && (
              <div className="px-2 mb-1">
                <Input placeholder="New…" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newLabel.trim()) { addLabel(newLabel); setNewLabel(""); setShowLabelInput(false); } }}
                  className="h-6 text-[10px]" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} autoFocus />
              </div>
            )}
            {customLabels.map(label => {
              const isActive = searchQuery === `is:${label}`;
              const count = engine.threads.filter(t => t.tags.some(tg => tg.toLowerCase() === label.toLowerCase())).length;
              return (
                <button key={label} onClick={() => { setSearchQuery(isActive ? "" : `is:${label}`); clearThread(); setFolder("inbox"); }}
                  className={`flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-md hover:bg-white/5 w-full text-left ${isActive ? "text-white font-semibold" : ""}`}
                  style={!isActive ? { color: "hsl(240 5% 50%)" } : {}}
                >
                  <Tag className="h-3 w-3" style={{ color: "hsl(140 12% 50%)" }} />
                  <span className="flex-1">{label}</span>
                  {count > 0 && <span className="text-[9px] px-1 rounded-full" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center — threaded message list with sales info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
              <Input placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-8" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
            <button onClick={() => setAccountFilter("all")} className={`text-xs px-2 py-1 rounded-md ${accountFilter === "all" ? "bg-white/10 text-white" : ""}`} style={accountFilter !== "all" ? { color: "hsl(240 5% 46%)" } : {}}>All</button>
            {SYNCED_ACCOUNTS.filter(a => a.synced).map(a => (
              <button key={a.key} onClick={() => setAccountFilter(a.key)}
                className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${accountFilter === a.key ? "bg-white/10 text-white" : ""}`}
                style={accountFilter !== a.key ? { color: "hsl(240 5% 46%)" } : {}}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} /> {a.key}
              </button>
            ))}
            <button onClick={() => setAccountFilter("outreach")} className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${accountFilter === "outreach" ? "bg-white/10 text-white" : ""}`}
              style={accountFilter !== "outreach" ? { color: "hsl(240 5% 46%)" } : {}}>
              <Activity className="h-3 w-3" style={{ color: "hsl(140 12% 58%)" }} /> Outreach
            </button>
          </div>

          {/* AI Smart Tools strip removed from inbox — shown in message view below */}

          {selectedThread ? (
            <div className="space-y-3 animate-fade-in">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={clearThread}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
              {/* AI results panel */}
              <AIResultPanel ai={ai} onUseReply={(text) => setReplyBody(text)} />
              <h3 className="text-base font-semibold text-white">{selectedThread.subject}</h3>
              {hydratingThreadId === selectedThread.id && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "hsl(var(--muted) / 0.35)", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                  Loading full email…
                </div>
              )}
              {/* Messages */}
              <div className="space-y-2">
                {selectedThread.messages.map((msg, idx) => (
                  <div key={msg.id} className="rounded-lg p-3" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5" style={{ background: msg.from === "You" ? "hsl(140 12% 42%)" : "hsl(262 83% 45%)" }}>
                        {msg.from === "You" ? "Y" : msg.from.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-white">{msg.from}</span>
                          <span className="text-[10px]" style={{ color: "hsl(240 5% 40%)" }}>&lt;{msg.fromAddr}&gt;</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] flex-wrap" style={{ color: "hsl(240 5% 40%)" }}>
                          <span>To: {msg.to} &lt;{msg.toAddr}&gt;</span>
                          {msg.cc && msg.cc.length > 0 && (
                            <span className="ml-1">• Cc: {msg.cc.join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] shrink-0" style={{ color: "hsl(240 5% 40%)" }}>{msg.date === "Today" ? msg.time : msg.date}</span>
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: "hsl(240 5% 78%)" }}>
                      {msg.body && (msg.body.includes("<") && msg.body.includes(">")) ? (
                        <iframe
                          srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font-family:-apple-system,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#c8c8d0;background:transparent;word-break:break-word;overflow-wrap:break-word;}a{color:#7c9a82;}img{max-width:100%;height:auto;}table{border-collapse:collapse;max-width:100%;}td,th{padding:4px 8px;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body>${msg.body}</body></html>`}
                          className="w-full border-0"
                          style={{ background: "transparent", minHeight: "200px" }}
                          sandbox="allow-same-origin"
                          onLoad={(e) => {
                            const iframe = e.target as HTMLIFrameElement;
                            const tryResize = () => {
                              if (iframe.contentDocument?.body) {
                                const h = iframe.contentDocument.body.scrollHeight;
                                iframe.style.height = Math.max(200, h + 40) + "px";
                              }
                            };
                            tryResize();
                            // Retry after images load
                            setTimeout(tryResize, 500);
                            setTimeout(tryResize, 1500);
                          }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.body || "(No content)"}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Quick reply + hover actions */}
              <div className="flex gap-2 items-end">
                <Textarea placeholder="Reply…" value={replyBody} onChange={e => setReplyBody(e.target.value)} className="flex-1 min-h-[50px] text-sm resize-none rounded-lg" style={{ background: "hsl(240 8% 7%)", color: "white", border: "1px solid hsl(240 6% 14%)" }} />
                <div className="flex flex-col gap-1">
                  <Button size="sm" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success("Sent (demo)"); setReplyBody(""); }}><SendIcon className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && ai.aiReply(selectedThread)} disabled={ai.replyLoading}><Sparkles className={`h-3.5 w-3.5 ${ai.replyLoading ? "animate-spin" : ""}`} style={{ color: "hsl(140 12% 58%)" }} /></Button>
                </div>
              </div>
            </div>
          ) : (
            /* Thread list with pipeline badges */
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(240 6% 14%)" }}>
              {filtered.length === 0 && <p className="text-center text-sm py-8" style={{ color: "hsl(240 5% 40%)" }}>No conversations</p>}
              {filtered.map((thread, idx) => {
                const lastMsg = thread.messages[thread.messages.length - 1];
                const snippet = lastMsg.from === "You" ? `You: ${lastMsg.body.slice(0, 50)}` : lastMsg.body.slice(0, 50);
                // Pipeline badge
                const addrs = thread.messages.map(m => m.from === "You" ? m.toAddr : m.fromAddr);
                const threadMatch = addrs.map(a => CONNECT_MATCHES[a]).find(Boolean);
                return (
                  <div key={thread.id} className="group relative">
                    <button onClick={() => selectThread(thread.id)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:bg-white/[0.04]"
                      style={{ background: thread.unread ? "hsl(140 12% 42% / 0.04)" : undefined, borderBottom: idx < filtered.length - 1 ? "1px solid hsl(240 6% 12%)" : undefined }}
                    >
                      <button className="shrink-0" onClick={(e) => toggleStar(thread.id, e)}>
                        <Star className={`h-3.5 w-3.5 ${thread.starred ? "fill-yellow-400 text-yellow-400" : ""}`} style={!thread.starred ? { color: "hsl(240 5% 30%)" } : {}} />
                      </button>
                      <div className="w-2 shrink-0">{thread.unread && <span className="block h-2 w-2 rounded-full" style={{ background: "hsl(140 12% 58%)" }} />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${thread.unread ? "font-semibold text-white" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 65%)" } : {}}>
                            {thread.participants.filter(p => p !== "You").join(", ") || "You"}
                          </span>
                          {threadMatch?.pipelineStage && (
                            <Badge className="text-[8px] h-4 px-1.5" style={{ background: "hsl(140 12% 42% / 0.12)", color: "hsl(140 12% 58%)" }}>
                              {threadMatch.pipelineStage} • ${(threadMatch.dealValue || 0).toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <span className={`text-sm truncate block ${thread.unread ? "text-white/80" : ""}`} style={!thread.unread ? { color: "hsl(240 5% 50%)" } : {}}>{thread.subject}</span>
                        <p className="text-xs truncate" style={{ color: "hsl(240 5% 38%)" }}>{snippet}…</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[10px]" style={{ color: thread.unread ? "hsl(140 12% 58%)" : "hsl(240 5% 40%)" }}>{lastMsg.date === "Today" ? lastMsg.time : lastMsg.date}</span>
                        <div className="flex gap-1">{thread.tags.slice(0, 1).map(t => <Badge key={t} variant="outline" className="text-[8px] h-3.5 px-1" style={{ borderColor: "hsl(140 12% 42% / 0.25)", color: "hsl(140 12% 50%)" }}>{t}</Badge>)}</div>
                      </div>
                    </button>
                    {/* Hover actions */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 z-10">
                      <button className="p-1 rounded hover:bg-white/10" onClick={() => toast.success("AI reply (demo)")} title="AI Reply"><Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} /></button>
                      <button className="p-1 rounded hover:bg-white/10" onClick={() => toast.success("Schedule meeting (demo)")} title="Schedule"><CalendarPlus className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right context panel — AURA exclusive */}
        {selectedThread && (
          <div className="hidden xl:flex flex-col w-72 shrink-0 rounded-lg overflow-hidden" style={{ background: "hsl(240 8% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
            <Tabs value={contextTab} onValueChange={setContextTab}>
              <TabsList className="w-full h-9 rounded-none" style={{ background: "hsl(240 8% 9%)" }}>
                <TabsTrigger value="summary" className="text-[10px] flex-1 gap-1"><Sparkles className="h-3 w-3" /> Tools</TabsTrigger>
                <TabsTrigger value="pipeline" className="text-[10px] flex-1 gap-1"><BarChart3 className="h-3 w-3" /> Pipeline</TabsTrigger>
                <TabsTrigger value="contact" className="text-[10px] flex-1 gap-1"><User className="h-3 w-3" /> Contact</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="p-3 space-y-3 m-0">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "hsl(140 12% 50%)" }}>AURA Connect Tools</p>
                <p className="text-xs" style={{ color: "hsl(240 5% 65%)" }}>
                  Thread with {selectedThread.participants.filter(p => p !== "You").join(", ")}. {selectedThread.messages.length} message(s).
                </p>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: "hsl(240 5% 40%)" }}>Suggested Actions</p>
                  {[
                    { label: "AI Reply", action: () => ai.aiReply(selectedThread) },
                    { label: "Summarize Thread", action: () => ai.summarize(selectedThread) },
                    { label: "Send follow-up", action: () => ai.followUpReminder(selectedThread) },
                    { label: "Check Compliance", action: () => ai.complianceCheck(selectedThread) },
                    { label: "Analyze Sentiment", action: () => ai.sentimentAnalysis(selectedThread) },
                    { label: "Add to Pipeline", action: () => ai.addToPipeline(selectedThread) },
                  ].map(a => (
                    <button key={a.label} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/5 transition-colors" style={{ color: "hsl(140 12% 58%)" }} onClick={a.action}>
                      → {a.label}
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="pipeline" className="p-3 space-y-3 m-0">
                {match?.pipelineStage ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">{match.pipelineDeal}</p>
                    <div className="flex justify-between text-xs"><span style={{ color: "hsl(240 5% 50%)" }}>Stage</span><Badge className="text-[9px]" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{match.pipelineStage}</Badge></div>
                    <div className="flex justify-between text-xs"><span style={{ color: "hsl(240 5% 50%)" }}>Value</span><span style={{ color: "hsl(140 12% 58%)" }}>${match.dealValue?.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span style={{ color: "hsl(240 5% 50%)" }}>Next Touch</span><span className="text-white">{match.nextTouch || "—"}</span></div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Target className="h-6 w-6 mx-auto mb-1" style={{ color: "hsl(240 5% 30%)" }} />
                    <p className="text-xs" style={{ color: "hsl(240 5% 40%)" }}>No active deal</p>
                    <Button size="sm" variant="outline" className="text-xs mt-2" onClick={() => toast.success("Create deal (demo)")}>Create Deal</Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="contact" className="p-3 space-y-3 m-0">
                {match ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: TIER_COLORS[match.tier]?.bg || "hsl(240 8% 18%)", color: TIER_COLORS[match.tier]?.text || "hsl(240 5% 65%)" }}>
                        {match.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{match.name}</p>
                        <p className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>{match.company}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {match.location && <div className="flex items-center gap-2" style={{ color: "hsl(240 5% 55%)" }}><MapPin className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />{match.location}</div>}
                      {match.phone && <div className="flex items-center gap-2" style={{ color: "hsl(240 5% 55%)" }}><Link2 className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />{match.phone}</div>}
                      <div className="flex items-center gap-2" style={{ color: "hsl(240 5% 55%)" }}><Users className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />{match.mutualConnections} mutual connections</div>
                      <div className="flex items-center gap-2" style={{ color: "hsl(240 5% 55%)" }}><Target className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />Proximity: {match.proximity}%</div>
                    </div>
                    <Badge className="text-[9px]" style={{ background: TIER_COLORS[match.tier]?.bg, color: TIER_COLORS[match.tier]?.text }}>{match.tier}-Tier Contact</Badge>
                    {match.lastTouch && <p className="text-[10px]" style={{ color: "hsl(240 5% 45%)" }}>Last touch: {match.lastTouch}</p>}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(240 5% 30%)" }} />
                    <p className="text-xs" style={{ color: "hsl(240 5% 45%)" }}>Contact not in your network yet</p>
                    <Button size="sm" variant="outline" className="text-xs mt-2 gap-1" onClick={() => toast.success("Contact saved to network")}>
                      <Plus className="h-3 w-3" /> Save to Network
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
