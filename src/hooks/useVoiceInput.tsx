import { useState, useCallback, useRef } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VoiceState = "idle" | "connecting" | "listening";

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [liveText, setLiveText] = useState("");
  const { toast } = useToast();
  const committedRef = useRef("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setLiveText((committedRef.current + " " + data.text).trim());
    },
    onCommittedTranscript: (data) => {
      committedRef.current = (committedRef.current + " " + data.text).trim();
      setLiveText(committedRef.current);
    },
  });

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");
    committedRef.current = "";
    setLiveText("");

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get voice token");
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setState("listening");
      toast({ title: "🎙️ Listening…", description: "Speak now. Click the mic again when done." });
    } catch (err: any) {
      console.error("Voice input error:", err);
      const msg = err?.message || "Could not start voice input";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast({ variant: "destructive", title: "Microphone Access Required", description: "Please enable microphone access to use voice input." });
      } else {
        toast({ variant: "destructive", title: "Voice Error", description: msg });
      }
      setState("idle");
    }
  }, [state, scribe, toast]);

  const stop = useCallback(() => {
    scribe.disconnect();
    const final = committedRef.current.trim();
    if (final) {
      onTranscript(final);
      toast({ title: "✅ Voice captured", description: final.length > 60 ? final.slice(0, 60) + "…" : final });
    } else {
      toast({ title: "No speech detected", description: "Try speaking louder or closer to your mic." });
    }
    committedRef.current = "";
    setLiveText("");
    setState("idle");
  }, [scribe, onTranscript, toast]);

  const toggle = useCallback(() => {
    if (state === "idle") {
      start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  return { state, toggle, isListening: state === "listening", isConnecting: state === "connecting", liveText };
}
