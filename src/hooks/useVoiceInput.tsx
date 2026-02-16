import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VoiceState = "idle" | "connecting" | "listening";

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [liveText, setLiveText] = useState("");
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const committedRef = useRef("");
  const partialRef = useRef("");

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    // Capture final text before cleanup
    const final = (committedRef.current + " " + partialRef.current).trim();
    cleanup();
    if (final) {
      onTranscript(final);
    }
    committedRef.current = "";
    partialRef.current = "";
    setLiveText("");
    setState("idle");
  }, [onTranscript, cleanup]);

  const startAudioCapture = useCallback((stream: MediaStream, ws: WebSocket) => {
    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      contextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

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
    } catch (err) {
      console.error("Audio capture error:", err);
    }
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");
    committedRef.current = "";
    partialRef.current = "";
    setLiveText("");

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
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
        // Send auth message
        ws.send(JSON.stringify({ type: "auth", token: data.token }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "session_started") {
            setState("listening");
            toast({ title: "🎙️ Listening…", description: "Speak now. Click the mic again when done." });
            startAudioCapture(stream, ws);
          } else if (msg.type === "partial_transcript" && msg.text) {
            partialRef.current = msg.text;
            setLiveText((committedRef.current + " " + msg.text).trim());
          } else if (msg.type === "committed_transcript" && msg.text) {
            committedRef.current = (committedRef.current + " " + msg.text).trim();
            partialRef.current = "";
            setLiveText(committedRef.current);
          } else if (msg.type === "error") {
            console.error("ElevenLabs STT error:", msg);
            toast({ variant: "destructive", title: "Voice Error", description: msg.message || "Transcription error" });
            stop();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        toast({ variant: "destructive", title: "Voice Error", description: "Connection failed. Please try again." });
        cleanup();
        setState("idle");
      };

      ws.onclose = (e) => {
        console.log("WebSocket closed:", e.code, e.reason);
        // Only auto-stop if we were actively listening (not if user manually stopped)
        if (wsRef.current) {
          stop();
        }
      };
    } catch (err: any) {
      console.error("Voice input error:", err);
      const msg = err?.message || "Could not start voice input";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast({ variant: "destructive", title: "Microphone Access Required", description: "Please enable microphone access to use voice input." });
      } else {
        toast({ variant: "destructive", title: "Voice Error", description: msg });
      }
      cleanup();
      setState("idle");
    }
  }, [state, stop, cleanup, toast, startAudioCapture]);

  const toggle = useCallback(() => {
    if (state === "idle") {
      start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  return { state, toggle, isListening: state === "listening", isConnecting: state === "connecting", liveText };
}
