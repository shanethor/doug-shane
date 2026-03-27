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
  complianceLoading: boolean;
  complianceText: string | null;
  sentimentLoading: boolean;
  sentimentText: string | null;
  followUpLoading: boolean;
  followUpText: string | null;
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
    complianceLoading: false, complianceText: null,
    sentimentLoading: false, sentimentText: null,
    followUpLoading: false, followUpText: null,
  });

  const reset = useCallback(() => {
    setState({
      summaryLoading: false, summaryText: null,
      draftLoading: false, draftText: null,
      replyLoading: false, replyText: null,
      complianceLoading: false, complianceText: null,
      sentimentLoading: false, sentimentText: null,
      followUpLoading: false, followUpText: null,
    });
  }, []);

  const callAI = useCallback(async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "advisorAssist",
          taskType: "EMAIL_DRAFT",
          userPrompt: `${systemPrompt}\n\n${userPrompt}`,
        },
      });
      if (error) throw error;
      // ai-router returns { text, metadata } for advisorAssist
      const content = data?.text?.trim() || data?.choices?.[0]?.message?.content?.trim();
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

  const complianceCheck = useCallback(async (thread: DemoThread) => {
    setState((s) => ({ ...s, complianceLoading: true, complianceText: null }));
    const result = await callAI(
      "You are a compliance officer for a professional services firm. Review this email thread for any potential compliance issues: regulatory concerns, missing disclaimers, unauthorized promises, data privacy issues, or inappropriate language. If nothing is found, say so. Be brief and specific.",
      `Review this thread for compliance issues:\n\nSubject: ${thread.subject}\n\n${threadToContext(thread)}`
    );
    setState((s) => ({ ...s, complianceLoading: false, complianceText: result }));
    if (result) toast.success("Compliance check complete");
  }, [callAI]);

  const sentimentAnalysis = useCallback(async (thread: DemoThread) => {
    setState((s) => ({ ...s, sentimentLoading: true, sentimentText: null }));
    const result = await callAI(
      "You are an emotional intelligence expert. Analyze the sentiment and tone of this email thread. Rate the overall sentiment (Positive/Neutral/Negative), identify the emotional tone of each participant, and flag any tension or urgency. Be concise — 3-4 sentences max.",
      `Analyze sentiment:\n\nSubject: ${thread.subject}\n\n${threadToContext(thread)}`
    );
    setState((s) => ({ ...s, sentimentLoading: false, sentimentText: result }));
    if (result) toast.success("Sentiment analysis complete");
  }, [callAI]);

  const followUpReminder = useCallback(async (thread: DemoThread) => {
    setState((s) => ({ ...s, followUpLoading: true, followUpText: null }));
    const result = await callAI(
      "You are a sales assistant. Based on this email thread, suggest when and how to follow up. Include: 1) Recommended follow-up date/timing, 2) What to say, 3) What channel (email, call, text). Keep it to 2-3 bullet points.",
      `Suggest follow-up for:\n\nSubject: ${thread.subject}\n\n${threadToContext(thread)}`
    );
    setState((s) => ({ ...s, followUpLoading: false, followUpText: result }));
    if (result) toast.success("Follow-up reminder set");
  }, [callAI]);

  return { ...state, summarize, aiReply, aiDraft, addToPipeline, complianceCheck, sentimentAnalysis, followUpReminder, reset };
}
