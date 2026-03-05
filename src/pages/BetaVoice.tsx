import { useEffect, useState, useRef, useCallback } from "react";
import { getCurrentBetaUser, getOtherUser, BETA_USERS } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Loader2, AlertCircle, Headphones, Volume2, User, MessageSquare } from "lucide-react";
import { ClientInfoPanel, SharedClientBanner } from "@/components/ClientInfoPanel";
import { InCallChat } from "@/components/InCallChat";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DailyIframe from "@daily-co/daily-js";

interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
}

export default function BetaVoice() {
  const user = getCurrentBetaUser();
  const other = user ? getOtherUser(user.id) : null;
  const [status, setStatus] = useState<"idle" | "loading" | "joined" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sharedClientName, setSharedClientName] = useState<string | null>(null);
  const [pendingSharedClient, setPendingSharedClient] = useState<any>(null);
  const [acceptedSharedClient, setAcceptedSharedClient] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const callRef = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);

  const syncParticipants = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const ps = call.participants();
    const list: Participant[] = [];

    Object.values(ps).forEach((p: any) => {
      const isLocal = p.local;
      const betaId = isLocal ? user?.id : other?.id;
      const betaUser = betaId ? BETA_USERS[betaId] : null;

      list.push({
        id: p.session_id || p.user_id || "unknown",
        name: betaUser?.name || p.user_name || "Participant",
        initials: betaUser?.initials || (p.user_name?.[0] || "?"),
        color: betaUser?.avatarColor || "bg-muted",
        isSpeaking: false,
        isMuted: isLocal ? !p.audio : !p.audio,
        isLocal,
      });
    });

    setParticipants(list);
  }, [user, other]);

  const joinRoom = async () => {
    if (!user) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/daily-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, roomType: "voice" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get token");
      }

      const { token, roomUrl } = await res.json();

      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      });

      callRef.current = call;

      call.on("joined-meeting", () => {
        setStatus("joined");
        syncParticipants();
      });
      call.on("participant-joined", syncParticipants);
      call.on("participant-left", syncParticipants);
      call.on("participant-updated", syncParticipants);
      call.on("active-speaker-change", (evt: any) => {
        setParticipants(prev =>
          prev.map(p => ({
            ...p,
            isSpeaking: p.id === evt?.activeSpeaker?.peerId,
          }))
        );
      });
      call.on("app-message", (evt: any) => {
        if (evt?.data?.type === "share-client") {
          setPendingSharedClient(evt.data.client);
          setSharedClientName(evt.data.client.account_name);
        }
        if (evt?.data?.type === "in-call-chat" && evt?.data?.message) {
          setChatMessages(prev => [...prev, { ...evt.data.message, timestamp: new Date(evt.data.message.timestamp) }]);
        }
      });
      call.on("error", (e: any) => {
        setErrorMsg(e?.errorMsg || "Call error");
        setStatus("error");
      });

      await call.join({ url: roomUrl, token });
      call.setLocalVideo(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to join call, please try again.");
      setStatus("error");
    }
  };

  const toggleMute = () => {
    const call = callRef.current;
    if (!call) return;
    const next = !muted;
    call.setLocalAudio(!next);
    setMuted(next);
  };

  const leaveRoom = async () => {
    const call = callRef.current;
    if (call) {
      await call.leave();
      call.destroy();
      callRef.current = null;
    }
    setStatus("idle");
    setMuted(false);
    setParticipants([]);
    setShowClientPanel(false);
    setShowChat(false);
    setSharedClientName(null);
    setPendingSharedClient(null);
    setAcceptedSharedClient(null);
    setChatMessages([]);
  };

  const handleShareClient = (lead: any) => {
    const call = callRef.current;
    if (!call) return;
    call.sendAppMessage({ type: "share-client", client: lead }, "*");
  };

  const handleAcceptShared = () => {
    setAcceptedSharedClient(pendingSharedClient);
    setShowClientPanel(true);
    setPendingSharedClient(null);
    setSharedClientName(null);
  };

  const handleDismissShared = () => {
    setPendingSharedClient(null);
    setSharedClientName(null);
  };

  const sendAppMessage = (msg: any) => {
    const call = callRef.current;
    if (call) call.sendAppMessage(msg, "*");
  };

  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.leave();
        callRef.current.destroy();
        callRef.current = null;
      }
    };
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-2">
        <Volume2 className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold text-sm">Voice Channel</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {status === "joined" ? `${participants.length} connected` : "Not connected"}
        </span>
      </div>

      {/* Shared client banner */}
      {sharedClientName && pendingSharedClient && (
        <SharedClientBanner
          clientName={sharedClientName}
          onAccept={handleAcceptShared}
          onDismiss={handleDismissShared}
        />
      )}

      {/* Main call area */}
      <div className="space-y-3">
        {/* Participant list */}
        <div className="rounded-xl border border-border bg-card p-4 min-h-[200px]">
          {status === "idle" && (
            <div className="flex flex-col items-center justify-center h-[180px] gap-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Headphones className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                No one is in the voice channel yet.
              </p>
              <Button onClick={joinRoom} size="sm" className="gap-2">
                <Headphones className="h-4 w-4" />
                Join Channel
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center justify-center h-[180px] gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Connecting…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center h-[180px] gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-xs text-destructive text-center">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={joinRoom}>Retry</Button>
            </div>
          )}

          {status === "joined" && (
            <div className="space-y-2">
              {participants.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${p.color} ${
                        p.isSpeaking ? "ring-2 ring-green-400 ring-offset-2 ring-offset-card" : ""
                      }`}
                    >
                      {p.initials}
                    </div>
                    {p.isMuted && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
                        <MicOff className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {p.name}
                    {p.isLocal && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                  </span>
                  {p.isSpeaking && (
                    <div className="ml-auto flex gap-0.5">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="w-0.5 bg-green-400 rounded-full animate-pulse"
                          style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Waiting for participants…</p>
              )}
            </div>
          )}
        </div>

        {/* In-call text chat (inline below participants) */}
        {showChat && status === "joined" && (
          <div className="rounded-xl border border-border overflow-hidden" style={{ height: "320px" }}>
            <InCallChat
              onClose={() => setShowChat(false)}
              sendAppMessage={sendAppMessage}
            />
          </div>
        )}

        {/* Controls */}
        {status === "joined" && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={muted ? "destructive" : "secondary"}
              size="icon"
              onClick={toggleMute}
              className="h-10 w-10 rounded-full"
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant={showClientPanel ? "default" : "outline"}
              size="icon"
              onClick={() => { setShowClientPanel(!showClientPanel); setAcceptedSharedClient(null); }}
              className="h-10 w-10 rounded-full"
              title="Pull up client info"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant={showChat ? "default" : "outline"}
              size="icon"
              onClick={() => setShowChat(!showChat)}
              className="h-10 w-10 rounded-full"
              title="Text chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={leaveRoom}
              className="h-10 w-10 rounded-full"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Client info as full-screen dialog overlay */}
      <Dialog open={showClientPanel && status === "joined"} onOpenChange={(open) => { setShowClientPanel(open); if (!open) setAcceptedSharedClient(null); }}>
        <DialogContent className="max-w-3xl w-[90vw] h-[85vh] p-0 flex flex-col overflow-hidden">
          <ClientInfoPanel
            onClose={() => { setShowClientPanel(false); setAcceptedSharedClient(null); }}
            onShare={handleShareClient}
            sharedClient={acceptedSharedClient}
          />
        </DialogContent>
      </Dialog>

      <p className="text-[10px] text-center text-muted-foreground">
        Audio-only · Jane &amp; Douglas demo channel
      </p>
    </div>
  );
}
