import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type VoiceState = "idle" | "connecting" | "listening";

/**
 * Voice input hook that lazy-loads ElevenLabs Scribe to avoid
 * WebSocket crashes on browsers that block insecure connections (e.g. mobile Safari).
 */
export function useVoiceInput(onTranscript: (text: string) => void, autoSend?: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [liveText, setLiveText] = useState("");
  const { toast } = useToast();
  const committedRef = useRef("");
  const scribeRef = useRef<any>(null);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");
    committedRef.current = "";
    setLiveText("");

    try {
      // Lazy-load ElevenLabs only when user actually clicks the mic
      if (!scribeRef.current) {
        scribeRef.current = {};
      }

      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get voice token");
      }

      // Use the WebSocket API directly via the token
      const ws = new WebSocket(`wss://api.elevenlabs.io/v1/scribe?model_id=scribe_v2_realtime&token=${data.token}`);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      scribeRef.current.mediaRecorder = mediaRecorder;
      scribeRef.current.stream = stream;
      scribeRef.current.ws = ws;

      ws.onopen = () => {
        setState("listening");
        toast({ title: "🎙️ Listening…", description: "Speak now. Click the mic again when done." });
        mediaRecorder.start(250); // send chunks every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "transcript" && msg.text) {
            if (msg.is_final) {
              committedRef.current = (committedRef.current + " " + msg.text).trim();
              setLiveText(committedRef.current);
            } else {
              setLiveText((committedRef.current + " " + msg.text).trim());
            }
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = (err) => {
        console.error("Voice WebSocket error:", err);
        cleanup();
        toast({ variant: "destructive", title: "Voice Error", description: "WebSocket connection failed. Voice input may not be supported on this device." });
        setState("idle");
      };

      ws.onclose = () => {
        // Handled by stop() — no-op here
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

    } catch (err: any) {
      console.error("Voice input error:", err);
      const msg = err?.message || "Could not start voice input";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast({ variant: "destructive", title: "Microphone Access Required", description: "Please enable microphone access to use voice input." });
      } else if (msg.includes("insecure") || msg.includes("WebSocket")) {
        toast({ variant: "destructive", title: "Not Supported", description: "Voice input is not available on this device/browser." });
      } else {
        toast({ variant: "destructive", title: "Voice Error", description: msg });
      }
      setState("idle");
    }
  }, [state, toast]);

  const cleanup = useCallback(() => {
    try {
      if (scribeRef.current?.mediaRecorder) {
        scribeRef.current.mediaRecorder.stop();
      }
      if (scribeRef.current?.stream) {
        scribeRef.current.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
      if (scribeRef.current?.ws) {
        scribeRef.current.ws.close();
      }
    } catch { /* ignore cleanup errors */ }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    const final = committedRef.current.trim();
    if (final) {
      onTranscript(final);
      toast({ title: "✅ Voice captured", description: final.length > 60 ? final.slice(0, 60) + "…" : final });
      if (autoSend) {
        setTimeout(() => autoSend(final), 300);
      }
    } else {
      toast({ title: "No speech detected", description: "Try speaking louder or closer to your mic." });
    }
    committedRef.current = "";
    setLiveText("");
    setState("idle");
  }, [cleanup, onTranscript, toast, autoSend]);

  const toggle = useCallback(() => {
    if (state === "idle") {
      start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  return { state, toggle, isListening: state === "listening", isConnecting: state === "connecting", liveText };
}
