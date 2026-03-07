import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfUrl } = await req.json();
    const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    if (!GOOGLE_CLOUD_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_CLOUD_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: "No pdfUrl provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the PDF from URL and convert to base64
    console.log(`[diag] Fetching PDF from: ${pdfUrl}`);
    const pdfResp = await fetch(pdfUrl);
    if (!pdfResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch PDF: ${pdfResp.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pdfArrayBuffer = await pdfResp.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    let pdfBase64 = "";
    // Convert to base64 in chunks to avoid stack overflow
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.subarray(i, i + chunkSize);
      pdfBase64 += String.fromCharCode(...chunk);
    }
    pdfBase64 = btoa(pdfBase64);
    console.log(`[diag] PDF base64 length: ${pdfBase64.length} (${pdfBytes.length} bytes)`);

    // Test 1: files:annotate (correct endpoint for PDFs)
    const filesUrl = `https://vision.googleapis.com/v1/files:annotate?key=${GOOGLE_CLOUD_API_KEY}`;
    const filesBody = {
      requests: [{
        inputConfig: {
          content: pdfBase64,
          mimeType: "application/pdf",
        },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        pages: [1],
      }],
    };

    console.log(`[diag] Calling files:annotate for page 1...`);
    const filesResp = await fetch(filesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://buildingaura.site",
      },
      body: JSON.stringify(filesBody),
    });

    const filesStatus = filesResp.status;
    const filesRaw = await filesResp.text();
    console.log(`[diag] files:annotate status: ${filesStatus}`);
    console.log(`[diag] files:annotate raw response (first 3000 chars): ${filesRaw.slice(0, 3000)}`);

    let filesJson: any = null;
    try { filesJson = JSON.parse(filesRaw); } catch {}

    // Extract text from various possible locations
    const topResponses = filesJson?.responses || [];
    const innerResponses = topResponses[0]?.responses || [];
    const firstInner = innerResponses[0] || {};
    const fullTextAnnotation = firstInner?.fullTextAnnotation;
    const textAnnotations = firstInner?.textAnnotations;
    const fullText = fullTextAnnotation?.text || "";
    const firstTextAnnotation = textAnnotations?.[0]?.description || "";

    // Also check if text is directly on topResponses[0]
    const directFullText = topResponses[0]?.fullTextAnnotation?.text || "";
    const directTextAnnotation = topResponses[0]?.textAnnotations?.[0]?.description || "";

    const result = {
      filesAnnotateStatus: filesStatus,
      responseStructure: {
        topResponsesCount: topResponses.length,
        innerResponsesCount: innerResponses.length,
        topLevelKeys: topResponses[0] ? Object.keys(topResponses[0]) : [],
        innerLevelKeys: firstInner ? Object.keys(firstInner) : [],
      },
      extractedText: {
        fromInnerFullTextAnnotation: fullText.slice(0, 500),
        fromInnerTextAnnotations: firstTextAnnotation.slice(0, 500),
        fromDirectFullTextAnnotation: directFullText.slice(0, 500),
        fromDirectTextAnnotation: directTextAnnotation.slice(0, 500),
      },
      charCounts: {
        innerFullText: fullText.length,
        innerTextAnnotation: firstTextAnnotation.length,
        directFullText: directFullText.length,
        directTextAnnotation: directTextAnnotation.length,
      },
      rawResponsePreview: filesRaw.slice(0, 2000),
      hasError: !!filesJson?.error || !!topResponses[0]?.error || !!firstInner?.error,
      errors: {
        topLevel: filesJson?.error || null,
        responseLevel: topResponses[0]?.error || null,
        innerLevel: firstInner?.error || null,
      },
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[diag] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
