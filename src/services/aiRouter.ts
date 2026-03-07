/**
 * ═══════════════════════════════════════════════════════════
 *  AURA AI Router — Client-Side Service
 * ═══════════════════════════════════════════════════════════
 *
 *  All AI calls in the app go through these two functions:
 *
 *  • ingestDocument()  → Gemini Flash for PDF/document extraction
 *  • advisorAssist()   → Claude Opus for strategy, summaries, drafts
 *
 *  No other part of the app should call AI models directly.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ──

export type DocType =
  | "acord_application"
  | "dec_page"
  | "loss_run"
  | "policy"
  | "supplement"
  | "business_plan"
  | "other";

export type TaskType =
  | "CLIENT_SUMMARY"
  | "RENEWAL_STRATEGY"
  | "NEGOTIATION_PLAN"
  | "EMAIL_DRAFT"
  | "RISK_REVIEW";

export interface IngestDocumentParams {
  /** Base64-encoded file */
  fileBase64?: string;
  fileMimeType?: string;
  /** Pre-extracted OCR text */
  ocrText?: string;
  /** Document type hint */
  docType?: DocType;
  /** Schema name or field list for structured output */
  schemaHint?: string;
  /** Additional context (company name, description, etc.) */
  additionalContext?: string;
}

export interface IngestDocumentResult {
  data: Record<string, any>;
  metadata: {
    model: string;
    engine: string;
    duration_ms: number;
    usage: Record<string, any>;
    docType: string;
  };
}

export interface AdvisorAssistParams {
  taskType: TaskType;
  /** Structured data from ingestion or pipeline */
  structuredData?: Record<string, any>;
  /** Free-text instructions from the advisor */
  userPrompt?: string;
  /** Stream the response via SSE */
  stream?: boolean;
}

export interface AdvisorAssistResult {
  text: string;
  metadata: {
    model: string;
    engine: string;
    duration_ms: number;
    usage: Record<string, any>;
    taskType: string;
  };
}

// ── Functions ──

/**
 * Ingest a document using Gemini Flash.
 * Used for PDF extraction, ACORD parsing, dec page reading, loss runs, etc.
 */
export async function ingestDocument(
  params: IngestDocumentParams,
): Promise<IngestDocumentResult> {
  const t0 = Date.now();
  console.log(`[aiRouter] ingestDocument docType=${params.docType || "unknown"}`);

  const { data, error } = await supabase.functions.invoke("ai-router", {
    body: {
      action: "ingestDocument",
      ...params,
    },
  });

  if (error) {
    console.error("[aiRouter] ingestDocument error:", error);
    throw new Error(error.message || "Document ingestion failed");
  }

  const duration = Date.now() - t0;
  console.log(`[aiRouter] ingestDocument complete: ${duration}ms, fields=${Object.keys(data?.data || {}).length}`);

  return data as IngestDocumentResult;
}

/**
 * Get advisor assistance using Claude Opus.
 * Used for client summaries, renewal strategies, email drafts, risk reviews.
 *
 * For streaming, use advisorAssistStream() instead.
 */
export async function advisorAssist(
  params: AdvisorAssistParams,
): Promise<AdvisorAssistResult> {
  const t0 = Date.now();
  console.log(`[aiRouter] advisorAssist taskType=${params.taskType}`);

  const { data, error } = await supabase.functions.invoke("ai-router", {
    body: {
      action: "advisorAssist",
      ...params,
      stream: false,
    },
  });

  if (error) {
    console.error("[aiRouter] advisorAssist error:", error);
    throw new Error(error.message || "Advisor assist failed");
  }

  const duration = Date.now() - t0;
  console.log(`[aiRouter] advisorAssist complete: ${duration}ms`);

  return data as AdvisorAssistResult;
}

/**
 * Stream advisor assistance via SSE.
 * Returns tokens as they arrive for real-time UI updates.
 */
export async function advisorAssistStream(params: {
  taskType: TaskType;
  structuredData?: Record<string, any>;
  userPrompt?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  const { taskType, structuredData, userPrompt, onDelta, onDone, onError } = params;

  console.log(`[aiRouter] advisorAssistStream taskType=${taskType}`);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        action: "advisorAssist",
        taskType,
        structuredData,
        userPrompt,
        stream: true,
      }),
    });

    if (!resp.ok || !resp.body) {
      const errText = await resp.text();
      throw new Error(`Stream failed (${resp.status}): ${errText}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // Partial JSON, put it back
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    onDone();
  } catch (err: any) {
    console.error("[aiRouter] advisorAssistStream error:", err);
    onError?.(err);
  }
}
