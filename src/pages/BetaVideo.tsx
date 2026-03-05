import { useState, useRef } from "react";
import { getCurrentBetaUser } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, PhoneOff, Loader2, AlertCircle } from "lucide-react";

export default function BetaVideo() {
  const user = getCurrentBetaUser();
  const [status, setStatus] = useState<"idle" | "loading" | "joined" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
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
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Video Room</h2>
        <p className="text-xs text-muted-foreground">Video call for Jane Smith and Douglas Wenz.</p>
      </div>

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
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
            <iframe
              ref={iframeRef}
              className="w-full"
              style={{ height: "560px", border: "none" }}
              allow="microphone; camera; autoplay; display-capture"
            />
          </div>
          <div className="flex justify-center">
            <Button variant="destructive" size="sm" onClick={leaveRoom} className="gap-2">
              <PhoneOff className="h-4 w-4" />
              Leave Room
            </Button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground">
        Only Jane and Douglas should use this room for the demo.
      </p>
    </div>
  );
}
