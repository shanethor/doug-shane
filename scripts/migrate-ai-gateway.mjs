#!/usr/bin/env node
/**
 * Mechanical migration: replace Lovable AI Gateway fetch calls with fetchAIGateway().
 *
 * Pattern matched:
 *   fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
 *     method: "POST",
 *     headers: { Authorization: `Bearer ${X}`, "Content-Type": "application/json" },
 *     body: JSON.stringify(Y),
 *     ...
 *   })
 *
 * Becomes:
 *   fetchAIGateway(Y)
 *
 * Adds an import at the top if not already present.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";

const FILES = [
  "supabase/functions/agent-chat/index.ts",
  "supabase/functions/ai-router/index.ts",
  "supabase/functions/audit-form/index.ts",
  "supabase/functions/benchmark-extraction/index.ts",
  "supabase/functions/classify-contacts/index.ts",
  "supabase/functions/compose-email/index.ts",
  "supabase/functions/connect-assistant/index.ts",
  "supabase/functions/connect-intelligence/index.ts",
  "supabase/functions/connection-brief/index.ts",
  "supabase/functions/email-sync/index.ts",
  "supabase/functions/extract-business-data/index.ts",
  "supabase/functions/extract-dec-pages/index.ts",
  "supabase/functions/fill-gaps/index.ts",
  "supabase/functions/ingest-document/index.ts",
  "supabase/functions/lead-engine-scan/index.ts",
  "supabase/functions/map-fields/index.ts",
  "supabase/functions/scrape-website/index.ts",
  "supabase/functions/spotlight-flyer/index.ts",
  "supabase/functions/sync-social/index.ts",
  "supabase/functions/_shared/clark-extract-utils.ts",
];

function importPathFor(filePath) {
  // Files in supabase/functions/<name>/index.ts → ../_shared/ai-gateway.ts
  // Files in supabase/functions/_shared/*.ts    → ./ai-gateway.ts
  const parts = filePath.split("/");
  if (parts.includes("_shared")) return "./ai-gateway.ts";
  return "../_shared/ai-gateway.ts";
}

/**
 * Given a source string, find all fetch calls to the Lovable gateway,
 * rewriting them to fetchAIGateway(body).
 *
 * We do this by locating `fetch("https://ai.gateway.lovable.dev/v1/chat/completions"`
 * then finding the matching close `)` of the fetch call, then inside those args
 * finding the `body: JSON.stringify(` and extracting the argument.
 */
function rewrite(source) {
  const needle = `fetch("https://ai.gateway.lovable.dev/v1/chat/completions"`;
  let out = "";
  let i = 0;
  let count = 0;
  while (true) {
    const idx = source.indexOf(needle, i);
    if (idx === -1) { out += source.slice(i); break; }
    out += source.slice(i, idx);

    // Find the matching close-paren for the fetch(...) call
    const openParen = source.indexOf("(", idx);
    let depth = 0, j = openParen;
    while (j < source.length) {
      const ch = source[j];
      if (ch === "(") depth++;
      else if (ch === ")") { depth--; if (depth === 0) break; }
      else if (ch === '"' || ch === "'" || ch === "`") {
        // skip string
        const quote = ch;
        j++;
        while (j < source.length) {
          if (source[j] === "\\") { j += 2; continue; }
          if (source[j] === quote) break;
          if (quote === "`" && source[j] === "$" && source[j + 1] === "{") {
            let td = 1; j += 2;
            while (j < source.length && td > 0) {
              if (source[j] === "{") td++;
              else if (source[j] === "}") td--;
              j++;
            }
            continue;
          }
          j++;
        }
      }
      j++;
    }
    const closeParen = j;
    const fetchCallText = source.slice(openParen + 1, closeParen);

    // Inside fetchCallText, find `body: JSON.stringify(` and extract the argument
    const bodyKey = /body\s*:\s*JSON\.stringify\s*\(/;
    const m = bodyKey.exec(fetchCallText);
    if (!m) {
      // Couldn't parse — leave original in place
      out += source.slice(idx, closeParen + 1);
      i = closeParen + 1;
      continue;
    }
    const argStart = m.index + m[0].length;
    let bdepth = 1, k = argStart;
    while (k < fetchCallText.length && bdepth > 0) {
      const ch = fetchCallText[k];
      if (ch === "(") bdepth++;
      else if (ch === ")") bdepth--;
      else if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        k++;
        while (k < fetchCallText.length) {
          if (fetchCallText[k] === "\\") { k += 2; continue; }
          if (fetchCallText[k] === quote) break;
          if (quote === "`" && fetchCallText[k] === "$" && fetchCallText[k + 1] === "{") {
            let td = 1; k += 2;
            while (k < fetchCallText.length && td > 0) {
              if (fetchCallText[k] === "{") td++;
              else if (fetchCallText[k] === "}") td--;
              k++;
            }
            continue;
          }
          k++;
        }
      }
      k++;
    }
    const bodyArg = fetchCallText.slice(argStart, k - 1).trim();

    out += `fetchAIGateway(${bodyArg})`;
    i = closeParen + 1;
    count++;
  }
  return { out, count };
}

function ensureImport(source, importPath) {
  if (source.includes("fetchAIGateway")) {
    if (source.includes(`from "${importPath}"`)) return source;
  }
  const importLine = `import { fetchAIGateway } from "${importPath}";\n`;
  // Insert after the last top-level import
  const importRe = /^import [^;]+;$/gm;
  let lastMatch = null;
  for (const m of source.matchAll(importRe)) lastMatch = m;
  if (lastMatch) {
    const insertAt = lastMatch.index + lastMatch[0].length;
    return source.slice(0, insertAt) + "\n" + importLine + source.slice(insertAt);
  }
  return importLine + source;
}

let totalReplacements = 0;
for (const f of FILES) {
  const path = resolve(f);
  const src = readFileSync(path, "utf8");
  const { out, count } = rewrite(src);
  if (count === 0) {
    console.log(`· ${f}: no matches`);
    continue;
  }
  const withImport = ensureImport(out, importPathFor(f));
  writeFileSync(path, withImport);
  totalReplacements += count;
  console.log(`✓ ${f}: ${count} call(s) replaced`);
}
console.log(`\nTotal: ${totalReplacements} replacements across ${FILES.length} files`);
