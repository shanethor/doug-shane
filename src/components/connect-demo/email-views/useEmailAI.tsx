import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DemoThread } from "./useEmailEngine";

export interface EmailAIState {
  summaryLoading: boolean;
  summaryText: string | null;
  draftLoading: boolean;
  draftText: string | null;
  replyLoading: boolean;
  replyText: string | null;
}

function threadToContext(thread: DemoThread): string {
  return thread.messages
    .map((m) => `[${m.from} – ${m.date} ${m.time}]\n${m.body}`)
    .join("\n\n");
}

export function useEmailAI() {
  const [state, setState] = useState<EmailAIState>({
    summaryLoading: false, summaryText: null,
    draftLoading: false, draftText: null,
    replyLoading: false, replyText: null,
  });

  const reset = useCallback(() => {
    setState({
      summaryLoading: false, summaryText: null,
      draftLoading: false, draftText: null,
      replyLoading: false, replyText: null,
    });
  }, []);

  const callAI = useCallback(async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        },
      });
      if (error) throw error;
      const content = data?.choices?.[0]?.message?.content?.trim();
      return content || null;
    } catch (err: any) {
      console.error("Email AI error:", err);
      toast.error("AI unavailable — please try again");
      return null;
    }
  }, []);

  const summarize = useCallback(async (thread: DemoThread) => {
    setState((s) => ({ ...s, summaryLoading: true, summaryText: null }));
    const result = await callAI(
      "You are an executive assistant. Summarize email threads in 2-3 concise sentences. Focus on key decisions, action items, and next steps. Be direct.",
      `Summarize this email thread:\n\nSubject: ${thread.subject}\n\n${threadToContext(thread)}`
    );
    setState((s) => ({ ...s, summaryLoading: false, summaryText: result }));
    if (result) toast.success("Thread summarized");
  }, [callAI]);

  const aiReply = useCallback(async (thread: DemoThread) => {
    setState((s) => ({ ...s, replyLoading: true, replyText: null }));
    const result = await callAI(
      "You are a professional business advisor. Draft a concise, warm reply to the latest message in this thread. Keep it under 100 words. Don't include a subject line. Just the reply body.",
      `Draft a reply to the latest message in this thread:\n\nSubject: ${thread.subject}\n\n${threadToContext(thread)}`
    );
    setState((s) => ({ ...s, replyLoading: false, replyText: result }));
    if (result) toast.success("AI reply drafted");
  }, [callAI]);

  const aiDraft = useCallback(async (thread: DemoThread) => {
    setState((s) => ({ ...s, draftLoading: true, draftText: null }));
    const result = await callAI(
      "You are a professional business advisor. Draft a follow-up email based on this thread. Be proactive — suggest next steps, propose meeting times, or ask clarifying questions. Keep it under 150 words. Just the email body, no subject line.",
      `Draft a follow-up email for this thread:\n\nSubject: ${thread.subject}\n\n${threadToContext(thread)}`
    );
    setState((s) => ({ ...s, draftLoading: false, draftText: result }));
    if (result) toast.success("AI draft created");
  }, [callAI]);

  const addToPipeline = useCallback((thread: DemoThread) => {
    const contact = thread.participants.filter((p) => p !== "You").join(", ");
    toast.success(`Added "${contact}" to pipeline from: ${thread.subject}`);
  }, []);

  return { ...state, summarize, aiReply, aiDraft, addToPipeline, reset };
}
