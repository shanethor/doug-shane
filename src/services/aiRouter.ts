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
 *  ingestDocument dispatches to specialized backend functions
 *  based on docType; advisorAssist calls the unified ai-router.
 */

import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";

// ── Types ──

export type DocType =
  | "acord_application"
  | "dec_page"
  | "loss_run"
  | "policy"
  | "supplement"
  | "business_plan"
  | "resume"
  | "other";

export type TaskType =
  | "CLIENT_SUMMARY"
  | "RENEWAL_STRATEGY"
  | "NEGOTIATION_PLAN"
  | "EMAIL_DRAFT"
  | "RISK_REVIEW";

export interface IngestDocumentParams {
  /** Base64-encoded file(s) */
  fileBase64?: string;
  fileMimeType?: string;
  /** Multiple files for batch ingestion */
  pdfFiles?: Array<{ base64: string; mimeType?: string; name?: string }>;
  /** Document type hint — controls which backend to use */
  docType?: DocType;
  /** Additional context (company name, description, etc.) */
  additionalContext?: string;
  /** Submission ID for linking results */
  submissionId?: string;
}

export interface IngestDocumentResult {
  data: Record<string, any>;
  metadata: {
    model: string;
    engine: string;
    duration_ms: number;
    docType: string;
  };
}

export interface AdvisorAssistParams {
  taskType: TaskType;
  /** Structured data from ingestion or pipeline */
  structuredData?: Record<string, any>;
  /** Free-text instructions from the advisor */
  userPrompt?: string;
  /** Email-specific: tone */
  tone?: string;
  /** Email-specific: context about the lead */
  context?: string;
}

export interface AdvisorAssistResult {
  text: string;
  /** For email drafts */
  subject?: string;
  body?: string;
  metadata: {
    model: string;
    engine: string;
    duration_ms: number;
    taskType: string;
  };
}

// ── ingestDocument ──

/**
 * Ingest a document using Gemini Flash.
 * Dispatches to the appropriate specialized backend:
 *  - acord_application / business_plan → extract-business-data
 *  - dec_page → extract-dec-pages
 *  - other → ai-router (generic Gemini extraction)
 */
export async function ingestDocument(
  params: IngestDocumentParams,
): Promise<IngestDocumentResult> {
  const t0 = Date.now();
  const docType = params.docType || "other";
  console.log(`[aiRouter] ingestDocument docType=${docType}`);

  try {
    let data: any;

    switch (docType) {
      case "acord_application":
      case "business_plan":
      case "supplement":
      case "policy":
      case "loss_run": {
        // Route to extract-business-data (3-stage pipeline)
        const body: any = {};
        if (params.additionalContext) body.description = params.additionalContext;
        if (params.submissionId) body.submission_id = params.submissionId;
        if (params.pdfFiles) {
          body.pdf_files = params.pdfFiles.map(f => ({
            base64: f.base64,
            mimeType: f.mimeType || "application/pdf",
          }));
        } else if (params.fileBase64) {
          body.pdf_files = [{
            base64: params.fileBase64,
            mimeType: params.fileMimeType || "application/pdf",
          }];
        }

        const { data: result, error } = await supabase.functions.invoke("extract-business-data", { body });
        if (error) throw new Error(error.message || "Extraction failed");
        data = result;
        break;
      }

      case "dec_page": {
        // Route to extract-dec-pages
        const files: any[] = [];
        if (params.pdfFiles) {
          for (const f of params.pdfFiles) {
            files.push({ base64: f.base64, mimeType: f.mimeType || "application/pdf" });
          }
        } else if (params.fileBase64) {
          files.push({ base64: params.fileBase64, mimeType: params.fileMimeType || "application/pdf" });
        }

        const headers = await getAuthHeaders();
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-dec-pages`,
          { method: "POST", headers, body: JSON.stringify({ files }) },
        );
        if (!resp.ok) throw new Error(`Dec page extraction failed (${resp.status})`);
        data = await resp.json();
        break;
      }

      default: {
        // Route to ai-router generic ingestion
        const { data: result, error } = await supabase.functions.invoke("ai-router", {
          body: {
            action: "ingestDocument",
            docType,
            fileBase64: params.fileBase64,
            fileMimeType: params.fileMimeType,
            additionalContext: params.additionalContext,
          },
        });
        if (error) throw new Error(error.message || "Ingestion failed");
        data = result;
        break;
      }
    }

    const duration = Date.now() - t0;
    console.log(`[aiRouter] ingestDocument complete: ${duration}ms`);

    return {
      data: data?.form_data || data?.data || data || {},
      metadata: {
        model: data?.metadata?.model || "google/gemini-2.5-flash",
        engine: data?.metadata?.engine || docType,
        duration_ms: duration,
        docType,
      },
    };
  } catch (err: any) {
    console.error("[aiRouter] ingestDocument error:", err);
    throw err;
  }
}

// ── advisorAssist ──

/**
 * Get advisor assistance using Claude Opus.
 * Used for client summaries, renewal strategies, email drafts, risk reviews.
 */
export async function advisorAssist(
  params: AdvisorAssistParams,
): Promise<AdvisorAssistResult> {
  const t0 = Date.now();
  console.log(`[aiRouter] advisorAssist taskType=${params.taskType}`);

  // For EMAIL_DRAFT with tone/context, route to compose-email for backward compat
  if (params.taskType === "EMAIL_DRAFT" && (params.tone || params.context)) {
    const headers = await getAuthHeaders();
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compose-email`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: params.userPrompt,
          tone: params.tone,
          context: params.context,
        }),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Email draft failed (${resp.status}): ${errText}`);
    }

    const result = await resp.json();
    const duration = Date.now() - t0;

    return {
      text: `Subject: ${result.subject}\n\n${result.body}`,
      subject: result.subject,
      body: result.body,
      metadata: {
        model: result.provider === "openai" ? "gpt-4o" : "gemini-3-flash",
        engine: result.provider || "lovable",
        duration_ms: duration,
        taskType: "EMAIL_DRAFT",
      },
    };
  }

  // All other tasks → ai-router (Claude Opus)
  const { data, error } = await supabase.functions.invoke("ai-router", {
    body: {
      action: "advisorAssist",
      taskType: params.taskType,
      structuredData: params.structuredData,
      userPrompt: params.userPrompt,
      stream: false,
    },
  });

  if (error) {
    console.error("[aiRouter] advisorAssist error:", error);
    throw new Error(error.message || "Advisor assist failed");
  }

  const duration = Date.now() - t0;
  console.log(`[aiRouter] advisorAssist complete: ${duration}ms`);

  return {
    text: data?.text || "",
    metadata: data?.metadata || {
      model: "claude-opus-4",
      engine: "claude",
      duration_ms: duration,
      taskType: params.taskType,
    },
  };
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
