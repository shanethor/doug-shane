import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const MAX_PAGES = 10;

const EXTRACTION_PROMPT = `You are an insurance document data extraction expert. Extract ALL information from these declaration pages and return a JSON object.

Extract the following fields where available. Return empty strings for missing data. Do NOT guess or fabricate values.

{
  "applicant_name": "Full name of the insured",
  "applicant_email": "",
  "applicant_phone": "",
  "applicant_address": "Street address",
  "applicant_city": "",
  "applicant_state": "2-letter state code",
  "applicant_zip": "",
  "current_carrier": "Insurance company name",
  "naic_code": "Insurance company NAIC code (digits only)",
  "naic_number": "Insurance company NAIC code (digits only)",
  "policy_number": "",
  "policy_effective_date": "YYYY-MM-DD",
  "drivers": [
    { "name": "", "dob": "YYYY-MM-DD", "license_number": "", "license_state": "", "gender": "male|female|other", "marital_status": "single|married|divorced|widowed" }
  ],
  "vehicles": [
    { "year": "", "make": "", "model": "", "vin": "", "usage": "commute|pleasure|business|farm", "garaging_zip": "" }
  ],
  "home": {
    "address": "", "city": "", "state": "", "zip": "", "year_built": "", "square_footage": "",
    "construction_type": "frame|masonry|masonry_veneer|superior",
    "roof_type": "asphalt_shingle|tile|metal|slate|flat", "roof_year": ""
  },
  "auto_coverage": {
    "liability_type": "split|csl", "bi_limit": "", "pd_limit": "", "csl_limit": "",
    "um_uim_limit": "", "med_pay_limit": "", "comp_deductible": "", "collision_deductible": "",
    "current_carrier": "", "policy_expiration": "YYYY-MM-DD"
  },
  "flood": { "flood_zone": "", "building_coverage": "", "contents_coverage": "", "current_flood_carrier": "", "current_flood_premium": "" },
  "boats": [{ "year": "", "make": "", "model": "", "length": "", "hull_type": "", "engine_type": "", "horsepower": "", "value": "" }],
  "umbrella": { "has_umbrella": "yes|no", "limit": "" },
  "coverage_types_detected": ["auto", "homeowners", "renters", "flood", "boat", "umbrella"]
}

Return ONLY valid JSON. No markdown fences, no explanation. If a section has no data, use empty arrays/objects.`;

/** Slice a PDF to the first N pages using pdf-lib */
async function truncatePdf(base64: string, maxPages: number): Promise<{ base64: string; originalPages: number; sliced: boolean }> {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const srcDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
  const originalPages = srcDoc.getPageCount();

  if (originalPages <= maxPages) {
    return { base64, originalPages, sliced: false };
  }

  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, Array.from({ length: maxPages }, (_, i) => i));
  pages.forEach((p) => newDoc.addPage(p));
  const slicedBytes = await newDoc.save();
  const slicedBase64 = btoa(String.fromCharCode(...slicedBytes));
  return { base64: slicedBase64, originalPages, sliced: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { files } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI extraction not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build content parts for Lovable AI gateway (OpenAI-compatible format)
    type ContentPart = { type: string; text?: string; image_url?: { url: string } };
    const userContent: ContentPart[] = [{ type: "text", text: "Extract all policy information from the attached declaration pages." }];

    for (const file of files) {
      const mimeType = file.mimeType || "application/pdf";
      let fileBase64 = file.base64;

      // Slice large PDFs to first N pages to avoid context overflow
      if (mimeType === "application/pdf") {
        try {
          const result = await truncatePdf(file.base64, MAX_PAGES);
          fileBase64 = result.base64;
          if (result.sliced) {
            console.log(`[extract-dec] Sliced PDF from ${result.originalPages} to ${MAX_PAGES} pages`);
          }
        } catch (sliceErr) {
          console.warn("[extract-dec] PDF slice failed, sending original:", sliceErr);
        }
      }

      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    }

    const t0 = Date.now();
    console.log(`[extract-dec] Calling Gemini Flash with ${files.length} file(s)...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    console.log(`[extract-dec] Response in ${Date.now() - t0}ms (status: ${response.status})`);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[extract-dec] AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const rawText = aiResult.choices?.[0]?.message?.content || "{}";

    // Parse JSON (strip markdown fences if present)
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let extracted: any = {};
    try {
      extracted = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[extract-dec] JSON parse error:", parseErr, "Raw:", rawText.substring(0, 500));
      return new Response(JSON.stringify({ success: true, data: {}, error: "parse_failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize NAIC aliases so downstream storage/autofill can use a single key
    if (!extracted.naic_code && extracted.naic_number) extracted.naic_code = String(extracted.naic_number);
    if (!extracted.naic_number && extracted.naic_code) extracted.naic_number = String(extracted.naic_code);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[extract-dec] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
