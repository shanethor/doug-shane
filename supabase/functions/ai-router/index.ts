import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * ═══════════════════════════════════════════════════════════
 *  AURA AI Router
 * ═══════════════════════════════════════════════════════════
 *
 *  Central AI gateway that routes requests to the correct model:
 *
 *  ┌─────────────────┐   Gemini 2.5 Flash   ┌──────────────┐
 *  │ ingestDocument   │ ──────────────────── │ Structured   │
 *  │ (PDF/OCR/schema) │                      │ JSON output  │
 *  └─────────────────┘                       └──────────────┘
 *
 *  ┌─────────────────┐   Claude Opus 4      ┌──────────────┐
 *  │ advisorAssist    │ ──────────────────── │ Strategy /   │
 *  │ (reasoning/copy) │                      │ prose output │
 *  └─────────────────┘                       └──────────────┘
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Task-type prompt templates for advisorAssist ──
const TASK_TEMPLATES: Record<string, string> = {
  CLIENT_SUMMARY: `Write a 2–3 paragraph professional client and program summary suitable for a submission cover letter. Include key business details, coverage lines, and any notable risk characteristics. Be concise but thorough.`,

  RENEWAL_STRATEGY: `Create a numbered renewal/negotiation strategy plan. Consider current market conditions, loss history, coverage adequacy, and competitive positioning. Include specific action items with timelines.`,

  NEGOTIATION_PLAN: `Develop a detailed negotiation plan for this account. Identify leverage points, market alternatives, coverage gaps to address, and recommended talking points. Be specific and actionable.`,

  EMAIL_DRAFT: `Draft a professional, client-ready email in clear business language. The tone should be warm but professional. Do not use insurance jargon unnecessarily. Include a clear call to action.`,

  RISK_REVIEW: `Perform a comprehensive risk review of this account. Identify coverage gaps, potential exposures, areas of concern, and recommendations for improvement. Prioritize findings by severity.`,
};

const ADVISOR_SYSTEM_PROMPT = `You are AURA, an elite insurance advisor assistant built for relationship-driven producers. Your philosophy:
- The advisor's relationships are the #1 asset — protect and strengthen them.
- Negotiation leverage comes from data, market knowledge, and timing.
- Every recommendation must be grounded in the structured data provided — never fabricate facts.
- Write in a confident, professional voice that the advisor can present directly to clients or carriers.

Use the structured data provided as absolute ground truth. If data is missing, note it as a gap rather than inventing values.`;

// ── Ingestion schema prompt (reused from extract-business-data) ──
const INGESTION_SYSTEM_PROMPT = `You are an expert insurance document parser. Extract data into strict JSON that matches the provided schema. Do not invent fields.

CRITICAL ANTI-HALLUCINATION RULES:
- NEVER fabricate, guess, or invent data. If information is not explicitly present, leave the field as an empty string "".
- Do NOT fill in sample/placeholder data.
- Do NOT infer employee counts, revenue, addresses, or any factual data that is not stated.
- Only populate a field if you can point to the specific text that contains that value.
- CODES (SIC, NAICS, NAIC, GL, class codes, hazard codes, policy numbers): ONLY populate if the EXACT code appears verbatim in the source.
- All scalar values must be strings — booleans as "true"/"false"
- Dates → MM/DD/YYYY format, currencies → plain number without $ or commas`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const body = await req.json();
    const { action } = body;

    if (!action || !["ingestDocument", "advisorAssist"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'ingestDocument' or 'advisorAssist'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "ingestDocument") {
      return await handleIngest(body, t0);
    } else {
      return await handleAdvisor(body, t0);
    }
  } catch (err: any) {
    console.error("[ai-router] Error:", err);
    const status = err.message?.includes("Rate limit") ? 429
      : err.message?.includes("credits") ? 402
      : 500;
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ═══════════════════════════════════════════════════════════
//  ingestDocument — Gemini Flash
// ═══════════════════════════════════════════════════════════

interface IngestRequest {
  action: "ingestDocument";
  /** Document type hint */
  docType?: string;
  /** JSON schema name or inline field list */
  schemaHint?: string;
  /** Base64-encoded file content */
  fileBase64?: string;
  fileMimeType?: string;
  /** Pre-extracted OCR text (if OCR was done externally) */
  ocrText?: string;
  /** Additional text context (description, etc.) */
  additionalContext?: string;
}

async function handleIngest(body: IngestRequest, t0: number): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

  const { docType, schemaHint, fileBase64, fileMimeType, ocrText, additionalContext } = body;

  // Build user prompt
  let userPrompt = "";
  if (docType) userPrompt += `Document type: ${docType}\n`;
  if (schemaHint) userPrompt += `Expected schema/fields: ${schemaHint}\n`;
  if (additionalContext) userPrompt += `Context: ${additionalContext}\n`;

  // Build content parts
  type ContentPart = { type: string; text?: string; image_url?: { url: string } };
  const userContent: ContentPart[] = [];

  if (ocrText) {
    userContent.push({ type: "text", text: `${userPrompt}\n\nOCR TEXT:\n${ocrText}` });
  } else if (fileBase64) {
    userContent.push({ type: "text", text: `${userPrompt}\n\nExtract all data from the attached document.` });
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${fileMimeType || "application/pdf"};base64,${fileBase64}` },
    });
  } else {
    userContent.push({ type: "text", text: `${userPrompt}\n\nExtract all relevant data.` });
  }

  console.log(`[ai-router] ingestDocument docType=${docType || "unknown"} hasFile=${!!fileBase64} hasOcr=${!!ocrText}`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: INGESTION_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai-router] Gemini error:", response.status, errText);
    if (response.status === 429) throw new Error("Rate limit exceeded, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    throw new Error(`Gemini ingestion error: ${response.status}`);
  }

  const aiResult = await response.json();
  const rawContent = aiResult.choices?.[0]?.message?.content || "{}";
  const usage = aiResult.usage || {};

  // Parse JSON
  const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let data: any;
  try {
    data = JSON.parse(cleaned);
  } catch {
    console.error("[ai-router] JSON parse failed, raw:", rawContent.substring(0, 500));
    data = { raw_text: rawContent };
  }

  const duration = Date.now() - t0;
  console.log(`[ai-router] ingestDocument complete: ${duration}ms, model=gemini-2.5-flash, tokens=${JSON.stringify(usage)}`);

  return new Response(
    JSON.stringify({
      data,
      metadata: {
        model: "google/gemini-2.5-flash",
        engine: "gemini",
        duration_ms: duration,
        usage,
        docType: docType || "unknown",
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ═══════════════════════════════════════════════════════════
//  advisorAssist — Claude Opus
// ═══════════════════════════════════════════════════════════

interface AdvisorRequest {
  action: "advisorAssist";
  taskType: "CLIENT_SUMMARY" | "RENEWAL_STRATEGY" | "NEGOTIATION_PLAN" | "EMAIL_DRAFT" | "RISK_REVIEW";
  structuredData?: Record<string, any>;
  userPrompt?: string;
  /** If true, stream SSE */
  stream?: boolean;
}

async function handleAdvisor(body: AdvisorRequest, t0: number): Promise<Response> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!ANTHROPIC_API_KEY && !LOVABLE_API_KEY) {
    throw new Error("AI service not configured");
  }

  const { taskType, structuredData, userPrompt, stream } = body;

  const taskTemplate = TASK_TEMPLATES[taskType] || TASK_TEMPLATES.CLIENT_SUMMARY;

  const fullUserPrompt = `TASK: ${taskTemplate}

${structuredData ? `STRUCTURED DATA (ground truth):\n${JSON.stringify(structuredData, null, 2)}\n\n` : ""}${userPrompt ? `ADVISOR INSTRUCTIONS:\n${userPrompt}` : ""}`;

  console.log(`[ai-router] advisorAssist taskType=${taskType} stream=${!!stream} hasData=${!!structuredData}`);

  // Prefer Claude Opus for advisor tasks; fall back to Lovable AI
  if (ANTHROPIC_API_KEY) {
    return await callClaudeAdvisor(ANTHROPIC_API_KEY, fullUserPrompt, stream || false, t0);
  } else {
    return await callLovableAdvisor(LOVABLE_API_KEY!, fullUserPrompt, stream || false, t0);
  }
}

async function callClaudeAdvisor(
  apiKey: string,
  userPrompt: string,
  stream: boolean,
  t0: number,
): Promise<Response> {
  const claudeBody: any = {
    model: "claude-opus-4-20250514",
    max_tokens: 4096,
    system: ADVISOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  };

  if (stream) {
    claudeBody.stream = true;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(claudeBody),
    signal: AbortSignal.timeout(50_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai-router] Claude Opus error:", response.status, errText);

    // Fall back to Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      console.log("[ai-router] Falling back to Lovable AI for advisor");
      return await callLovableAdvisor(LOVABLE_API_KEY, userPrompt, stream, t0);
    }
    throw new Error(`Claude Opus error: ${response.status}`);
  }

  if (stream) {
    // Convert Claude SSE to OpenAI-compatible SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();

    const transformedStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const openaiChunk = { choices: [{ delta: { content: parsed.delta.text } }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const duration = Date.now() - t0;
    console.log(`[ai-router] advisorAssist stream started: ${duration}ms, model=claude-opus-4`);

    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }

  // Non-streaming
  const result = await response.json();
  const text = (result.content || [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();

  const duration = Date.now() - t0;
  console.log(`[ai-router] advisorAssist complete: ${duration}ms, model=claude-opus-4, usage=${JSON.stringify(result.usage || {})}`);

  return new Response(
    JSON.stringify({
      text,
      metadata: {
        model: "claude-opus-4-20250514",
        engine: "claude",
        duration_ms: duration,
        usage: result.usage || {},
        taskType: "advisorAssist",
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function callLovableAdvisor(
  apiKey: string,
  userPrompt: string,
  stream: boolean,
  t0: number,
): Promise<Response> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: ADVISOR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: stream || false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai-router] Lovable AI advisor error:", response.status, errText);
    if (response.status === 429) throw new Error("Rate limit exceeded, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    throw new Error(`Advisor AI error: ${response.status}`);
  }

  if (stream) {
    const duration = Date.now() - t0;
    console.log(`[ai-router] advisorAssist stream started (Lovable fallback): ${duration}ms`);
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }

  const aiResult = await response.json();
  const text = aiResult.choices?.[0]?.message?.content || "";
  const duration = Date.now() - t0;
  console.log(`[ai-router] advisorAssist complete (Lovable fallback): ${duration}ms`);

  return new Response(
    JSON.stringify({
      text,
      metadata: {
        model: "google/gemini-2.5-pro",
        engine: "gemini-fallback",
        duration_ms: duration,
        usage: aiResult.usage || {},
        taskType: "advisorAssist",
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
