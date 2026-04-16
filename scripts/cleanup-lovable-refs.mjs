#!/usr/bin/env node
/**
 * Clean up residual Lovable references:
 *   • Remove dead `const LOVABLE_API_KEY = Deno.env.get(...)` lines and
 *     their `if (!LOVABLE_API_KEY) throw ...` guards.
 *   • Strip `LOVABLE_API_KEY!,` / `LOVABLE_API_KEY,` as first-arg to helper calls
 *     (our adapter no longer needs a key passed in).
 *   • Swap `*.lovable.app` / `*.lovableproject.com` fallback URLs to buildingaura.site.
 *   • Collapse `"provider_lovable" | "provider_openai"` defaults to neutral string.
 *
 * Writes in place.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync(
  `grep -rl -E "LOVABLE_API_KEY|lovable\\.app|lovableproject\\.com" supabase/functions src --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null`,
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean).filter(f => !f.includes("ai-gateway.ts"));

console.log(`Cleaning ${files.length} file(s)…`);

const lovableAppUrlRe = /https?:\/\/[a-z0-9-]*\.lovable\.app/g;
const lovableProjectUrlRe = /https?:\/\/[a-z0-9-]*\.lovableproject\.com/g;

let total = 0;
for (const f of files) {
  let src = readFileSync(f, "utf8");
  const before = src;

  // Remove `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");` lines
  src = src.replace(/^[ \t]*const\s+LOVABLE_API_KEY\s*=\s*Deno\.env\.get\([^)]*\);?[ \t]*\n/gm, "");

  // Remove guard: `if (!LOVABLE_API_KEY) throw new Error(...);`
  src = src.replace(/^[ \t]*if\s*\(\s*!LOVABLE_API_KEY\s*\)\s*throw\s+new\s+Error\([^)]*\);?[ \t]*\n/gm, "");

  // Remove guard: `if (!LOVABLE_API_KEY) { ... }` (single-line block)
  src = src.replace(/^[ \t]*if\s*\(\s*!LOVABLE_API_KEY\s*\)\s*\{\s*[^}]*\s*\}[ \t]*\n/gm, "");

  // Remove `LOVABLE_API_KEY!,` or `LOVABLE_API_KEY,` as first arg on its own line
  src = src.replace(/^[ \t]*LOVABLE_API_KEY\s*!?\s*,[ \t]*\n/gm, "");

  // Inline: `LOVABLE_API_KEY!,` or `LOVABLE_API_KEY,` as leading arg
  src = src.replace(/\bLOVABLE_API_KEY\s*!?\s*,\s*/g, "");

  // Bare `LOVABLE_API_KEY` → replaced as empty string (rare trailing use)
  src = src.replace(/\bLOVABLE_API_KEY\b/g, '""');

  // URL swaps
  src = src.replace(lovableAppUrlRe, "https://buildingaura.site");
  src = src.replace(lovableProjectUrlRe, "https://buildingaura.site");

  // Lovable hostname → buildingaura.site  (for PDF viewer map)
  src = src.replace(/"[a-z0-9-]+\.lovable\.app"/g, '"buildingaura.site"');

  if (src !== before) {
    writeFileSync(f, src);
    total++;
    console.log(`✓ ${f}`);
  }
}
console.log(`\nUpdated ${total} file(s).`);
