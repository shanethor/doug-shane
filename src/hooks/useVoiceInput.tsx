import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VoiceState = "idle" | "connecting" | "listening";

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const partialRef = useRef("");
  const committedRef = useRef("");

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // Send final transcript
    const final = (committedRef.current + " " + partialRef.current).trim();
    if (final) {
      onTranscript(final);
    }
    committedRef.current = "";
    partialRef.current = "";
    setState("idle");
  }, [onTranscript]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Get token
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get voice token");
      }

      // Connect WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        // Send auth
        ws.send(JSON.stringify({ type: "auth", token: data.token }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "session_started") {
            setState("listening");
            startAudioCapture(stream, ws);
          } else if (msg.type === "partial_transcript") {
            partialRef.current = msg.text || "";
          } else if (msg.type === "committed_transcript") {
            committedRef.current = (committedRef.current + " " + (msg.text || "")).trim();
            partialRef.current = "";
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        toast({ variant: "destructive", title: "Voice Error", description: "Connection failed. Please try again." });
        stop();
      };

      ws.onclose = () => {
        stop();
      };
    } catch (err: any) {
      console.error("Voice input error:", err);
      const msg = err?.message || "Could not start voice input";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast({ variant: "destructive", title: "Microphone Access Required", description: "Please enable microphone access to use voice input." });
      } else {
        toast({ variant: "destructive", title: "Voice Error", description: msg });
      }
      // Cleanup
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setState("idle");
    }
  }, [state, stop, toast]);

  const toggle = useCallback(() => {
    if (state === "idle") {
      start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  return { state, toggle, isListening: state === "listening", isConnecting: state === "connecting" };
}

function startAudioCapture(stream: MediaStream, ws: WebSocket) {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const input = e.inputBuffer.getChannelData(0);
    // Convert float32 to int16
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    // Convert to base64
    const bytes = new Uint8Array(int16.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    ws.send(JSON.stringify({ type: "audio", data: base64 }));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
}
