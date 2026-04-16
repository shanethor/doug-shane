/**
 * ═══════════════════════════════════════════════════════════
 *  AURA AI Gateway — Multi-Provider Adapter
 * ═══════════════════════════════════════════════════════════
 *
 *  Drop-in replacement for the (removed) Lovable AI Gateway.
 *  Accepts OpenAI chat-completions-shaped requests and dispatches
 *  to the native provider based on the `model` prefix:
 *
 *    • `google/*`     → Google Generative AI (Gemini)
 *    • `openai/*` | `gpt-*` → OpenAI
 *    • `anthropic/*` | `claude-*` → Anthropic
 *
 *  Env vars required (set whichever providers you use):
 *    GEMINI_API_KEY      — Google AI Studio key
 *    OPENAI_API_KEY      — OpenAI key
 *    ANTHROPIC_API_KEY   — Anthropic key
 *
 *  Returns an OpenAI-shaped response:
 *    { choices: [{ message: { content, tool_calls?, images? } }] }
 *
 *  For streaming, returns a ReadableStream emitting OpenAI-shaped
 *  SSE frames (`data: {...}\n\n`).
 *
 *  Supported features:
 *    ✓ Text chat completion (all providers)
 *    ✓ System prompts
 *    ✓ Tool / function calling (all providers)
 *    ✓ Vision inputs: image_url + base64 PDF (Gemini + Anthropic)
 *    ✓ Image generation: modalities:["image","text"] (Gemini only)
 *    ✓ Streaming (Anthropic + OpenAI; Gemini non-streaming)
 */

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{
    type: "text" | "image_url" | "file" | "input_file";
    text?: string;
    image_url?: { url: string } | string;
    file?: { file_data?: string; filename?: string; mime_type?: string };
    mime_type?: string;
    data?: string;
  }>;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, any>;
  };
}

export interface CallAIOptions {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: OpenAITool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
  modalities?: Array<"text" | "image">;
  stream?: boolean;
  response_format?: { type: string };
}

export interface CallAIResponse {
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
      images?: Array<{ image_url: { url: string } }>;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

type Provider = "google" | "openai" | "anthropic";

function detectProvider(model: string): Provider {
  if (model.startsWith("google/") || model.startsWith("gemini-")) return "google";
  if (model.startsWith("anthropic/") || model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("openai/") || model.startsWith("gpt-") || model.startsWith("o1-") || model.startsWith("o3-")) return "openai";
  // Default to Google (the most common in this codebase)
  return "google";
}

function stripPrefix(model: string): string {
  return model.replace(/^(google|openai|anthropic)\//, "");
}

/**
 * Main entry point — OpenAI-shape in, OpenAI-shape out.
 * For streaming, returns a Response whose body is an SSE stream.
 */
export async function callAI(opts: CallAIOptions): Promise<CallAIResponse | Response> {
  const provider = detectProvider(opts.model);

  if (opts.stream) {
    if (provider === "anthropic") return streamAnthropic(opts);
    if (provider === "openai") return streamOpenAI(opts);
    // Gemini: fall through to non-streaming and wrap
    const result = await callGoogle(opts);
    return fakeStreamResponse(result);
  }

  if (provider === "anthropic") return callAnthropic(opts);
  if (provider === "openai") return callOpenAI(opts);
  return callGoogle(opts);
}

// ═══════════════════════════════════════════════════════════
//  Google Gemini
// ═══════════════════════════════════════════════════════════

async function callGoogle(opts: CallAIOptions): Promise<CallAIResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model = stripPrefix(opts.model);

  // Detect image-generation mode
  const wantsImage = Array.isArray(opts.modalities) && opts.modalities.includes("image");

  // Build Gemini "contents" from OpenAI messages
  const { systemInstruction, contents } = openaiToGeminiMessages(opts.messages);

  const generationConfig: Record<string, any> = {};
  if (typeof opts.temperature === "number") generationConfig.temperature = opts.temperature;
  if (typeof opts.max_tokens === "number") generationConfig.maxOutputTokens = opts.max_tokens;
  if (typeof opts.max_completion_tokens === "number") generationConfig.maxOutputTokens = opts.max_completion_tokens;
  if (wantsImage) generationConfig.responseModalities = ["TEXT", "IMAGE"];

  const body: Record<string, any> = { contents };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

  // Tool calling (OpenAI functions → Gemini functionDeclarations)
  if (opts.tools?.length) {
    body.tools = [{
      functionDeclarations: opts.tools.map(t => ({
        name: t.function.name,
        description: t.function.description ?? "",
        parameters: sanitizeJsonSchemaForGemini(t.function.parameters),
      })),
    }];
    if (opts.tool_choice && typeof opts.tool_choice === "object") {
      body.toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [opts.tool_choice.function.name],
        },
      };
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 500)}`);
  }

  const data = await resp.json();
  return geminiToOpenAI(data, opts.model);
}

function openaiToGeminiMessages(messages: OpenAIMessage[]): { systemInstruction?: string; contents: any[] } {
  const systemParts: string[] = [];
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      if (typeof msg.content === "string") systemParts.push(msg.content);
      continue;
    }
    if (msg.role === "tool") {
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: msg.name ?? msg.tool_call_id ?? "tool",
            response: { content: msg.content },
          },
        }],
      });
      continue;
    }
    const role = msg.role === "assistant" ? "model" : "user";
    const parts: any[] = [];

    if (typeof msg.content === "string") {
      if (msg.content) parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === "image_url") {
          const url = typeof part.image_url === "string" ? part.image_url : part.image_url?.url ?? "";
          const dataUrl = parseDataUrl(url);
          if (dataUrl) {
            parts.push({ inlineData: { mimeType: dataUrl.mimeType, data: dataUrl.base64 } });
          } else if (url) {
            parts.push({ fileData: { mimeType: "image/jpeg", fileUri: url } });
          }
        } else if (part.type === "file" || part.type === "input_file") {
          const fd = part.file?.file_data ?? part.data;
          const mime = part.file?.mime_type ?? part.mime_type ?? "application/pdf";
          if (fd) {
            const dataUrl = parseDataUrl(fd);
            if (dataUrl) parts.push({ inlineData: { mimeType: dataUrl.mimeType, data: dataUrl.base64 } });
            else parts.push({ inlineData: { mimeType: mime, data: fd } });
          }
        }
      }
    }

    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        try {
          parts.push({ functionCall: { name: tc.function.name, args: JSON.parse(tc.function.arguments || "{}") } });
        } catch {
          parts.push({ functionCall: { name: tc.function.name, args: {} } });
        }
      }
    }

    if (parts.length) contents.push({ role, parts });
  }

  return { systemInstruction: systemParts.join("\n\n") || undefined, contents };
}

function parseDataUrl(url: string): { mimeType: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

function sanitizeJsonSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  const out: any = Array.isArray(schema) ? [] : {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "additionalProperties") continue; // Gemini rejects this
    if (k === "$schema" || k === "$id") continue;
    out[k] = typeof v === "object" && v !== null ? sanitizeJsonSchemaForGemini(v) : v;
  }
  return out;
}

function geminiToOpenAI(data: any, requestedModel: string): CallAIResponse {
  const cand = data.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  const textParts: string[] = [];
  const toolCalls: any[] = [];
  const images: any[] = [];

  for (const p of parts) {
    if (typeof p.text === "string") textParts.push(p.text);
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${Math.random().toString(36).slice(2, 10)}`,
        type: "function",
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args ?? {}),
        },
      });
    }
    if (p.inlineData && p.inlineData.data) {
      images.push({
        image_url: { url: `data:${p.inlineData.mimeType ?? "image/png"};base64,${p.inlineData.data}` },
      });
    }
  }

  const content = textParts.length ? textParts.join("") : null;
  const message: any = { role: "assistant", content };
  if (toolCalls.length) message.tool_calls = toolCalls;
  if (images.length) message.images = images;

  return {
    choices: [{
      index: 0,
      message,
      finish_reason: toolCalls.length ? "tool_calls" : (cand?.finishReason?.toLowerCase() || "stop"),
    }],
    model: requestedModel,
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount,
      completion_tokens: data.usageMetadata.candidatesTokenCount,
      total_tokens: data.usageMetadata.totalTokenCount,
    } : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
//  OpenAI
// ═══════════════════════════════════════════════════════════

async function callOpenAI(opts: CallAIOptions): Promise<CallAIResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const body: Record<string, any> = {
    model: stripPrefix(opts.model),
    messages: opts.messages,
  };
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (typeof opts.max_tokens === "number") body.max_tokens = opts.max_tokens;
  if (typeof opts.max_completion_tokens === "number") body.max_completion_tokens = opts.max_completion_tokens;
  if (opts.tools?.length) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (opts.response_format) body.response_format = opts.response_format;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 500)}`);
  }

  return await resp.json();
}

async function streamOpenAI(opts: CallAIOptions): Promise<Response> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const body: Record<string, any> = {
    model: stripPrefix(opts.model),
    messages: opts.messages,
    stream: true,
  };
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (opts.tools?.length) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI stream ${resp.status}: ${errText.slice(0, 500)}`);
  }
  return new Response(resp.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

// ═══════════════════════════════════════════════════════════
//  Anthropic
// ═══════════════════════════════════════════════════════════

async function callAnthropic(opts: CallAIOptions): Promise<CallAIResponse> {
  const body = buildAnthropicBody(opts, false);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errText.slice(0, 500)}`);
  }

  const data = await resp.json();
  return anthropicToOpenAI(data, opts.model);
}

async function streamAnthropic(opts: CallAIOptions): Promise<Response> {
  const body = buildAnthropicBody(opts, true);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(`Anthropic stream ${upstream.status}: ${errText.slice(0, 500)}`);
  }

  // Translate Anthropic SSE → OpenAI SSE on the fly
  const { readable, writable } = new TransformStream();
  (async () => {
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body!.getReader();
    let buf = "";
    const id = `chatcmpl_${Math.random().toString(36).slice(2, 10)}`;

    const emit = async (obj: any) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              await emit({
                id, object: "chat.completion.chunk", model: opts.model,
                choices: [{ index: 0, delta: { content: evt.delta.text }, finish_reason: null }],
              });
            } else if (evt.type === "message_stop") {
              await emit({
                id, object: "chat.completion.chunk", model: opts.model,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              });
            }
          } catch { /* ignore malformed */ }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("[anthropic-stream] translation error:", e);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

function buildAnthropicBody(opts: CallAIOptions, stream: boolean): Record<string, any> {
  const systemParts: string[] = [];
  const messages: any[] = [];

  for (const msg of opts.messages) {
    if (msg.role === "system") {
      if (typeof msg.content === "string") systemParts.push(msg.content);
      continue;
    }
    if (msg.role === "tool") {
      messages.push({
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: msg.tool_call_id ?? "unknown",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        }],
      });
      continue;
    }

    const content: any[] = [];
    if (typeof msg.content === "string") {
      if (msg.content) content.push({ type: "text", text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          content.push({ type: "text", text: part.text });
        } else if (part.type === "image_url") {
          const url = typeof part.image_url === "string" ? part.image_url : part.image_url?.url ?? "";
          const d = parseDataUrl(url);
          if (d) content.push({ type: "image", source: { type: "base64", media_type: d.mimeType, data: d.base64 } });
          else if (url) content.push({ type: "image", source: { type: "url", url } });
        } else if (part.type === "file" || part.type === "input_file") {
          const fd = part.file?.file_data ?? part.data;
          const mime = part.file?.mime_type ?? part.mime_type ?? "application/pdf";
          if (fd) {
            const d = parseDataUrl(fd);
            const base64 = d?.base64 ?? fd;
            const mt = d?.mimeType ?? mime;
            content.push({ type: "document", source: { type: "base64", media_type: mt, data: base64 } });
          }
        }
      }
    }

    if (msg.role === "assistant" && msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        try {
          content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments || "{}") });
        } catch {
          content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input: {} });
        }
      }
    }

    if (content.length) messages.push({ role: msg.role, content });
  }

  const body: Record<string, any> = {
    model: stripPrefix(opts.model),
    messages,
    max_tokens: opts.max_tokens ?? opts.max_completion_tokens ?? 4096,
  };
  if (systemParts.length) body.system = systemParts.join("\n\n");
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (stream) body.stream = true;
  if (opts.tools?.length) {
    body.tools = opts.tools.map(t => ({
      name: t.function.name,
      description: t.function.description ?? "",
      input_schema: t.function.parameters,
    }));
    if (opts.tool_choice && typeof opts.tool_choice === "object") {
      body.tool_choice = { type: "tool", name: opts.tool_choice.function.name };
    } else if (opts.tool_choice === "auto") {
      body.tool_choice = { type: "auto" };
    }
  }
  return body;
}

function anthropicToOpenAI(data: any, requestedModel: string): CallAIResponse {
  const textParts: string[] = [];
  const toolCalls: any[] = [];

  for (const block of data.content ?? []) {
    if (block.type === "text") textParts.push(block.text);
    if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
      });
    }
  }

  const message: any = {
    role: "assistant",
    content: textParts.length ? textParts.join("") : null,
  };
  if (toolCalls.length) message.tool_calls = toolCalls;

  return {
    choices: [{
      index: 0,
      message,
      finish_reason: toolCalls.length ? "tool_calls" : (data.stop_reason === "end_turn" ? "stop" : data.stop_reason ?? "stop"),
    }],
    model: requestedModel,
    usage: data.usage ? {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
    } : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
//  Streaming fallback for non-streaming providers
// ═══════════════════════════════════════════════════════════

function fakeStreamResponse(result: CallAIResponse): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl_${Math.random().toString(36).slice(2, 10)}`;
  const content = result.choices[0]?.message?.content ?? "";
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        id, object: "chat.completion.chunk", model: result.model,
        choices: [{ index: 0, delta: { content }, finish_reason: null }],
      })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        id, object: "chat.completion.chunk", model: result.model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

/**
 * Convenience helper mimicking the old `fetch(lovable-gateway, {...})` shape.
 * Returns a Response object so legacy code that does `await resp.json()` still works.
 */
export async function fetchAIGateway(body: CallAIOptions): Promise<Response> {
  if (body.stream) {
    const result = await callAI(body);
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const result = await callAI(body) as CallAIResponse;
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const m = /^(\w+) (\d+):/.exec(msg);
    const status = m ? parseInt(m[2], 10) : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { "Content-Type": "application/json" },
    });
  }
}
