import { useState, useRef } from "react";
import { getCurrentBetaUser } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, PhoneOff, Loader2, AlertCircle, User, MonitorUp, MessageSquare } from "lucide-react";
import { ClientInfoPanel, SharedClientBanner } from "@/components/ClientInfoPanel";
import { InCallChat } from "@/components/InCallChat";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function BetaVideo() {
  const user = getCurrentBetaUser();
  const [status, setStatus] = useState<"idle" | "loading" | "joined" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sharedClientName, setSharedClientName] = useState<string | null>(null);
  const [pendingSharedClient, setPendingSharedClient] = useState<any>(null);
  const [acceptedSharedClient, setAcceptedSharedClient] = useState<any>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const joinRoom = async () => {
    if (!user) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/daily-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, roomType: "video" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get token");
      }

      const { token, roomUrl } = await res.json();

      setStatus("joined");
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = `${roomUrl}?t=${token}&showLeaveButton=true&showFullscreenButton=true`;
        }
      }, 0);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to join call, please try again.");
      setStatus("error");
    }
  };

  const leaveRoom = () => {
    if (iframeRef.current) iframeRef.current.src = "";
    setStatus("idle");
    setShowClientPanel(false);
    setShowChat(false);
    setSharedClientName(null);
    setPendingSharedClient(null);
    setAcceptedSharedClient(null);
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      toast.info("Screen sharing stopped");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      stream.getTracks().forEach(track => {
        track.onended = () => setIsScreenSharing(false);
      });
      setIsScreenSharing(true);
      toast.success("Screen sharing started");
    } catch {
      toast.error("Screen sharing was cancelled or denied");
    }
  };

  const handleShareClient = (lead: any) => {
    toast.success(`Shared "${lead.account_name}" with the call`);
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

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Video Room</h2>
        <p className="text-xs text-muted-foreground">Video call for Jane Smith and Douglas Wenz.</p>
      </div>

      {/* Shared client banner */}
      {sharedClientName && pendingSharedClient && (
        <SharedClientBanner
          clientName={sharedClientName}
          onAccept={handleAcceptShared}
          onDismiss={handleDismissShared}
        />
      )}

      {status === "idle" && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Camera and microphone will be enabled when you join.</p>
            <Button onClick={joinRoom} className="gap-2">
              <Video className="h-4 w-4" />
              Join Video Room
            </Button>
            <p className="text-xs text-muted-foreground">Waiting for the other participant to join…</p>
          </CardContent>
        </Card>
      )}

      {status === "loading" && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting to video room…</p>
          </CardContent>
        </Card>
      )}

      {status === "error" && (
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" onClick={joinRoom}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {status === "joined" && (
        <div className="space-y-3">
          <div className={`grid gap-4 ${showChat ? "grid-cols-1 lg:grid-cols-[1fr_300px]" : "grid-cols-1"}`}>
            {/* Video + controls column */}
            <div className="space-y-3">
              <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                <iframe
                  ref={iframeRef}
                  className="w-full"
                  style={{ height: "480px", border: "none" }}
                  allow="microphone; camera; autoplay; display-capture"
                />
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-2">
                <Button
                  variant={showClientPanel ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setShowClientPanel(!showClientPanel); setAcceptedSharedClient(null); }}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  Client Info
                </Button>
                <Button
                  variant={showChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
                <Button
                  variant={isScreenSharing ? "default" : "outline"}
                  size="sm"
                  onClick={toggleScreenShare}
                  className="gap-2"
                >
                  <MonitorUp className="h-4 w-4" />
                  {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                </Button>
                <Button variant="destructive" size="sm" onClick={leaveRoom} className="gap-2">
                  <PhoneOff className="h-4 w-4" />
                  Leave
                </Button>
              </div>
            </div>

            {/* In-call chat sidebar */}
            {showChat && (
              <div className="rounded-xl border border-border overflow-hidden" style={{ height: "540px" }}>
                <InCallChat onClose={() => setShowChat(false)} />
              </div>
            )}
          </div>
        </div>
      )}

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
        Only Jane and Douglas should use this room for the demo.
      </p>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mt-4">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          <strong className="text-foreground">AURA Pulse</strong> will notify users they are being recorded. Our system will determine consistent pain points and issues that arise and notify management with proposed solutions.
        </p>
      </div>
    </div>
  );
}
