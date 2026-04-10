import { PDFDocument } from "npm:pdf-lib@1.17.1";

type ClaudeMessage = {
  role: string;
  content: any;
};

type UploadFile = {
  base64: string;
  mimeType?: string;
  name?: string;
};

type ClaudeDocumentBlock = {
  type: "document" | "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
  title?: string;
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function isBlankValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function dedupeArray(values: any[]): any[] {
  const seen = new Set<string>();
  const deduped: any[] = [];

  for (const value of values) {
    if (isBlankValue(value)) continue;
    const key = typeof value === "object" ? JSON.stringify(value) : String(value);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }

  return deduped;
}

export async function callClaude(
  apiKey: string,
  messages: ClaudeMessage[],
  system: string,
  maxTokens = 16384,
  retries = 3,
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    if (resp.ok) return resp.json();

    if ((resp.status === 529 || resp.status === 429) && attempt < retries) {
      const wait = Math.min(2000 * Math.pow(2, attempt), 16000);
      console.log(`Claude ${resp.status}, retrying in ${wait}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const errText = await resp.text();
    console.error("Claude API error:", resp.status, errText);
    throw new Error(`Claude API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  throw new Error("Claude API: max retries exceeded");
}

export function parseClaudeJson(raw: string): Record<string, any> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through
      }
    }

    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    let repaired = cleaned.replace(/,\s*$/, "");

    repaired = repaired.replace(/,\s*"[^"]*":\s*$/, "");
    repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, "");

    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

    try {
      const obj = JSON.parse(repaired);
      console.warn("Repaired truncated Claude JSON successfully");
      return obj;
    } catch {
      console.error("Failed to parse Claude JSON:", cleaned.slice(0, 500));
      throw new Error("Claude returned invalid JSON");
    }
  }
}

export function mergeExtractionData(
  base: Record<string, any> = {},
  incoming: Record<string, any> = {},
): Record<string, any> {
  const merged: Record<string, any> = { ...base };

  for (const [key, incomingValue] of Object.entries(incoming || {})) {
    if (isBlankValue(incomingValue)) continue;

    const currentValue = merged[key];

    if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
      merged[key] = dedupeArray([...currentValue, ...incomingValue]);
      continue;
    }

    if (isPlainObject(currentValue) && isPlainObject(incomingValue)) {
      merged[key] = mergeExtractionData(currentValue, incomingValue);
      continue;
    }

    merged[key] = incomingValue;
  }

  return merged;
}

export async function buildDocumentBlocks(
  files: UploadFile[],
  options: { maxTotalPdfPages?: number; maxPdfChunkPages?: number } = {},
): Promise<ClaudeDocumentBlock[]> {
  const { maxTotalPdfPages = 100, maxPdfChunkPages = 25 } = options;
  const blocks: ClaudeDocumentBlock[] = [];

  for (const file of files) {
    const mediaType = file.mimeType === "application/pdf"
      ? "application/pdf"
      : file.mimeType || "image/jpeg";

    if (mediaType !== "application/pdf") {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: file.base64,
        },
      });
      continue;
    }

    try {
      const srcDoc = await PDFDocument.load(base64ToUint8Array(file.base64), { ignoreEncryption: true });
      const pageCount = srcDoc.getPageCount();
      const cappedPageCount = Math.min(pageCount, maxTotalPdfPages);

      if (pageCount > maxTotalPdfPages) {
        console.log(`PDF "${file.name}" has ${pageCount} pages — processing first ${maxTotalPdfPages} pages only`);
      }

      for (let start = 0; start < cappedPageCount; start += maxPdfChunkPages) {
        const end = Math.min(start + maxPdfChunkPages, cappedPageCount);
        const chunkDoc = await PDFDocument.create();
        const indices = Array.from({ length: end - start }, (_, i) => start + i);
        const copiedPages = await chunkDoc.copyPages(srcDoc, indices);

        for (const page of copiedPages) chunkDoc.addPage(page);

        const chunkBytes = await chunkDoc.save();
        blocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: mediaType,
            data: uint8ArrayToBase64(new Uint8Array(chunkBytes)),
          },
          title: `${file.name || "document.pdf"} (pages ${start + 1}-${end})`,
        });
      }
    } catch (chunkErr) {
      console.warn(`Could not split PDF "${file.name}":`, chunkErr);
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: mediaType,
          data: file.base64,
        },
        title: file.name,
      });
    }
  }

  return blocks;
}