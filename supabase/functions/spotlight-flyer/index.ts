import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function normalizeFlyerType(rawValue?: string): string {
  const value = String(rawValue || "").toLowerCase().trim();
  if (["event", "social", "announcement", "educational", "promotion", "custom"].includes(value)) return value;
  if (["webinar", "virtual", "meeting", "zoom"].includes(value)) return "event";
  if (["promo", "promotion", "discount", "sale", "offer"].includes(value)) return "promotion";
  if (["education", "guide", "tips", "training", "infographic"].includes(value)) return "educational";
  if (["announce", "announcement", "launch", "update", "hiring", "job", "careers"].includes(value)) return "announcement";
  if (["linkedin", "instagram", "facebook", "social", "post"].includes(value)) return "social";
  return "event";
}

function buildDefaultCta(type: string): string {
  const normalized = normalizeFlyerType(type);
  const ctaMap: Record<string, string> = {
    event: "RSVP today to reserve your seat.",
    social: "Like, share, and follow for more.",
    promotion: "Call today or book online.",
    educational: "Learn more today.",
    announcement: "Stay tuned for more updates.",
    custom: "Contact us today.",
  };

  return ctaMap[normalized] || ctaMap.custom;
}

function inferTitleFromText(input: string, fallbackType?: string): string {
  const cleaned = String(input || "")
    .replace(/\s+/g, " ")
    .replace(/^create\s+(an?|the)\s+/i, "")
    .replace(/^i need\s+(an?|the)?\s*/i, "")
    .trim();

  if (!cleaned) {
    const labels: Record<string, string> = {
      event: "Event Flyer",
      social: "Social Post",
      announcement: "Announcement",
      educational: "Educational Graphic",
      promotion: "Promotion",
      custom: "Custom Graphic",
    };
    return labels[normalizeFlyerType(fallbackType)] || "Graphic";
  }

  const sentence = cleaned.split(/[.!?\n]/)[0]?.trim() || cleaned;
  return sentence.length > 72 ? `${sentence.slice(0, 69).trim()}…` : sentence;
}

function fallbackBulletsFromText(input: string): string[] {
  return String(input || "")
    .split(/\n|[.!?•]/g)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 8)
    .slice(0, 4);
}

async function persistGeneratedImage(supabase: ReturnType<typeof createClient>, imageUrl: string, folder: string) {
  if (!imageUrl.startsWith("data:image/")) return imageUrl;

  const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Generated image payload was invalid");

  const [, contentType, base64Data] = match;
  const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("agency-assets").upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("agency-assets").getPublicUrl(path);
  return data.publicUrl;
}

async function enrichDemoInput(body: Record<string, unknown>) {
  const rawPrompt = String(body.raw_prompt || "").trim();
  const description = String(body.description || "").trim();
  const seedText = [rawPrompt, description].filter(Boolean).join("\n\n");
  const requestedType = normalizeFlyerType(String(body.type || "") || await detectFlyerType(rawPrompt));
  const fallbackTitle = String(body.title || "").trim() || inferTitleFromText(seedText, requestedType);
  const fallbackBullets = Array.isArray(body.bullets)
    ? body.bullets.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : fallbackBulletsFromText(seedText);
  const fallback = {
    flyer_type: requestedType,
    title: fallbackTitle,
    description: description || rawPrompt,
    date_time: body.date_time ? String(body.date_time) : null,
    location: body.location ? String(body.location) : null,
    bullets: fallbackBullets,
    cta: String(body.cta || "").trim() || buildDefaultCta(requestedType),
    evergreen: typeof body.evergreen === "boolean" ? body.evergreen : false,
  };

  if (!seedText || !LOVABLE_API_KEY()) return fallback;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Extract flyer planning details from the user's request. Preserve the user's wording, keep titles concise, only include fields grounded in the text, and map flyer_type to one of: event, social, announcement, educational, promotion, custom.",
          },
          {
            role: "user",
            content: JSON.stringify({
              raw_prompt: rawPrompt,
              title: body.title || null,
              description: description || null,
              date_time: body.date_time || null,
              location: body.location || null,
              evergreen: body.evergreen ?? null,
              cta: body.cta || null,
              requested_type: requestedType,
            }),
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_flyer_fields",
            description: "Extract flyer details for a marketing graphic wizard.",
            parameters: {
              type: "object",
              properties: {
                flyer_type: { type: "string", enum: ["event", "social", "announcement", "educational", "promotion", "custom"] },
                title: { type: "string" },
                description: { type: "string" },
                date_time: { type: ["string", "null"] },
                location: { type: ["string", "null"] },
                bullets: { type: "array", items: { type: "string" } },
                cta: { type: ["string", "null"] },
                evergreen: { type: "boolean" },
              },
              required: ["flyer_type", "title", "description", "bullets", "cta", "evergreen"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_flyer_fields" } },
      }),
    });

    if (!response.ok) return fallback;

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return fallback;

    const args = JSON.parse(toolCall.function.arguments);
    const normalizedType = normalizeFlyerType(args.flyer_type || requestedType);
    const bullets = Array.isArray(args.bullets)
      ? args.bullets.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 6)
      : fallbackBullets;

    return {
      flyer_type: normalizedType,
      title: String(body.title || "").trim() || String(args.title || "").trim() || fallbackTitle,
      description: description || String(args.description || "").trim() || rawPrompt,
      date_time: body.date_time ? String(body.date_time) : args.date_time || null,
      location: body.location ? String(body.location) : args.location || null,
      bullets: bullets.length > 0 ? bullets : fallbackBullets,
      cta: String(body.cta || "").trim() || String(args.cta || "").trim() || buildDefaultCta(normalizedType),
      evergreen: typeof body.evergreen === "boolean" ? body.evergreen : !!args.evergreen,
    };
  } catch (error) {
    console.error("[spotlight-flyer] demo enrichment failed", error);
    return fallback;
  }
}

function buildStructuredPrompt(flyer: any, brandMeta?: Record<string, unknown>): string {
  const parts: string[] = [];
  const styleMap: Record<string, string> = {
    event: "clean, professional",
    webinar: "modern, trustworthy, minimal",
    promotion: "bold, attention-grabbing, high-contrast",
    promo: "bold, attention-grabbing, high-contrast",
    hiring: "approachable, professional",
    announcement: "elegant, celebratory",
    social: "modern, visually striking, social-media ready",
    educational: "authoritative, clean, infographic-style",
  };
  const style = styleMap[flyer.type] || "professional, clean, modern";

  const brandName = flyer.brand_name || "an insurance professional";
  parts.push(
    `Generate a high-quality, VERTICAL (portrait orientation, 1080x1350px or 4:5 ratio) marketing graphic for ${brandName}, an insurance industry professional.`,
    `The graphic is intended for digital use: social media posts, email campaigns, and print-ready PDFs.`,
    `Visual style: ${style}. The design should look like it was produced by a top-tier marketing agency — not AI-generated. No clip art, no generic stock imagery, no fake people.`,
  );

  const colors = Array.isArray(flyer.brand_colors) && flyer.brand_colors.length > 0
    ? flyer.brand_colors.join(", ")
    : "deep navy #1a2744 and gold #c9a24b";
  parts.push(
    `Brand palette: ${colors}. Use these colors for backgrounds, accents, and UI elements. No hex color codes should appear as visible text anywhere on the image.`,
  );

  if (flyer.logo_url) parts.push(`Place the company logo prominently near the top center or top-left. Do not alter or distort it.`);

  parts.push(`Main headline (large, bold, center or top-aligned): "${flyer.title}".`);

  if (!flyer.evergreen && flyer.date_time) parts.push(`Date/Time detail: ${flyer.date_time} — render this clearly in a date badge or styled subheading.`);
  if (flyer.location) parts.push(`Location: ${flyer.location} — include a location pin icon or styled location line.`);
  if (flyer.type === "webinar") parts.push(`Prominently include a "LIVE WEBINAR" badge or tag.`);

  const bullets = Array.isArray(flyer.bullets) ? flyer.bullets : [];
  if (bullets.length > 0) {
    parts.push(
      `Feature these ${bullets.length} key points as styled bullet points or icon-list items on the flyer. Render each as a short, punchy, polished line:`,
      bullets.map((b: string, i: number) => `  ${i + 1}. ${b}`).join("\n"),
    );
  }

  if (flyer.cta) {
    parts.push(`Call-to-action button or banner (make it visually prominent, high-contrast): "${flyer.cta}".`);
  }

  // Insurance industry context
  parts.push(
    `Industry context: This is for the insurance and financial services industry. Use professional imagery: abstract financial/shield/protection motifs, clean geometric shapes, subtle textures, or tasteful stock-style backgrounds WITHOUT recognizable faces or real people.`,
    `Typography guidance: Use a bold display font for the headline, a clean sans-serif for body copy. Strong typographic hierarchy is essential.`,
    `Negative space: Leave breathing room around each element — do not overcrowd. Design should feel premium.`,
  );

  // Inject scraped brand intelligence from company URLs
  const meta = brandMeta || {};
  if (meta.scraped_summary) {
    parts.push(`\nBRAND CONTEXT (from company website/social media — use this to inform imagery, style, and copy):\n${String(meta.scraped_summary).slice(0, 800)}`);
  }
  if (meta.design_notes) {
    parts.push(`Design notes from brand analysis: ${String(meta.design_notes).slice(0, 400)}`);
  }
  if (Array.isArray(meta.font_styles) && meta.font_styles.length > 0) {
    parts.push(`Preferred font styles: ${(meta.font_styles as string[]).join(", ")}.`);
  }

  parts.push(
    `HARD RULES — NEVER VIOLATE:`,
    `1. Output must be VERTICAL / PORTRAIT orientation. Never landscape.`,
    `2. NEVER show hex color codes (like #FF5733), RGB values, or any color reference notation anywhere on the graphic.`,
    `3. NEVER include raw prompt text, instructions, or marketing jargon on the graphic. All visible text must be polished, publication-ready copy.`,
    `4. NEVER show recognizable real people’s faces. Abstract or silhouette-style human shapes are fine.`,
    `5. NEVER invent product names or company names not explicitly provided.`,
    `6. If a logo is provided, render it faithfully — do not alter, recolor, or distort it.`,
    `7. No watermarks, no AI artifacts, no lorem ipsum text.`,
    `8. NEVER invent or display fake contact information: no fake phone numbers, email addresses, website URLs, or social media handles. If real contact info is not explicitly provided, leave that space blank or use a tasteful placeholder like [Your Contact Info].`,
  );

  if (flyer.disclaimer) {
    parts.push(`Include small disclaimer text at the very bottom (8pt equivalent, muted): "${flyer.disclaimer}".`);
  }

  return parts.join("\n");
}

async function summarizeToBullets(description: string): Promise<string[]> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You summarize event or campaign descriptions into 3-5 concise bullet points (8-12 words each). Return ONLY a JSON array of strings. No markdown." },
          { role: "user", content: description },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_bullets",
            description: "Return the bullet points",
            parameters: { type: "object", properties: { bullets: { type: "array", items: { type: "string" } } }, required: ["bullets"], additionalProperties: false },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_bullets" } },
      }),
    });
    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (call) {
      const args = JSON.parse(call.function.arguments);
      return args.bullets || [];
    }
    return [];
  } catch (e) {
    console.error("Bullet summarization failed:", e);
    return [];
  }
}

async function detectFlyerType(rawPrompt: string): Promise<string> {
  const lower = rawPrompt.toLowerCase();
  if (lower.includes("linkedin") || lower.includes("instagram") || lower.includes("facebook") || lower.includes("social post")) return "social";
  if (lower.includes("promo") || lower.includes("special") || lower.includes("discount") || lower.includes("sale")) return "promotion";
  if (lower.includes("guide") || lower.includes("tips") || lower.includes("educational") || lower.includes("learn")) return "educational";
  if (lower.includes("hiring") || lower.includes("job") || lower.includes("careers") || lower.includes("announcement") || lower.includes("announce")) return "announcement";
  return "event";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL(), SUPABASE_SERVICE_KEY(), {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

      if (action === "demo_enrich") {
        const enrichment = await enrichDemoInput(body);
        return new Response(JSON.stringify({ enrichment }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    // ─── ACTION: analyze_brand ───
    if (action === "analyze_brand") {
      const imageUrl = String(body.image_url || "").trim();
      const imageType = String(body.image_type || "logo").trim(); // "logo" or "material"
      if (!imageUrl) throw new Error("image_url required");

      const systemPrompt = imageType === "material"
        ? `You are a brand design analyst. Analyze this marketing material image and extract design attributes: dominant colors (as hex), secondary colors, font style descriptions (serif/sans-serif/script, weight, feel), overall design tone (professional, bold, playful, luxury, minimal, friendly), any brand/company name visible, and any brand patterns or themes you detect. This data will improve future marketing material generation.`
        : `You are a brand design analyst. Analyze this logo image and extract: the dominant brand colors (as hex values), the likely industry, the design tone/style (professional, bold, playful, luxury, minimal, friendly), and any company/brand name text visible in or around the logo. Infer from visual cues only.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              { type: "text", text: imageType === "material" ? "Analyze this marketing material for design attributes including any company name visible." : "Analyze this logo and extract brand attributes including any company/brand name text." },
              { type: "image_url", image_url: { url: imageUrl } },
            ]},
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_brand_attributes",
              description: "Extract brand visual attributes from an image",
              parameters: {
                type: "object",
                properties: {
                  colors: { type: "array", items: { type: "string" }, description: "Hex color values detected" },
                  industry: { type: ["string", "null"], description: "Detected industry or null" },
                  tone: { type: "string", description: "Design tone: professional, bold, playful, luxury, minimal, friendly" },
                  font_styles: { type: "array", items: { type: "string" }, description: "Font style descriptions found" },
                  design_notes: { type: ["string", "null"], description: "Additional design observations" },
                  brand_name: { type: ["string", "null"], description: "Company or brand name detected in the image, or null if none visible" },
                },
                required: ["colors", "tone"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_brand_attributes" } },
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) throw new Error("Rate limit exceeded. Please try again.");
        if (aiRes.status === 402) throw new Error("AI credits exhausted.");
        throw new Error("Brand analysis failed");
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) throw new Error("No analysis returned");
      const attributes = JSON.parse(toolCall.function.arguments);

      return new Response(JSON.stringify({ attributes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "demo_generate") {
      const prompt = String(body.prompt || "").trim();
      if (!prompt) throw new Error("prompt required");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
        if (aiResp.status === 402) throw new Error("AI credits exhausted. Please add funds to continue.");
        const errorText = await aiResp.text();
        console.error("[spotlight-flyer] demo_generate failed", aiResp.status, errorText);
        throw new Error("Image generation failed");
      }

      const aiData = await aiResp.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error("No image was generated");

        const persistedImageUrl = await persistGeneratedImage(supabase, imageUrl, "generated-flyers/demo");

        return new Response(JSON.stringify({ image_url: persistedImageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    // ─── ACTION: scrape_brand_urls ───
    if (action === "scrape_brand_urls") {
      const urls: string[] = Array.isArray(body.urls) ? body.urls.filter((u: string) => u.trim()) : [];
      if (urls.length === 0) throw new Error("At least one URL is required");

      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
      const scrapeResults: string[] = [];

      for (const url of urls.slice(0, 3)) {
        try {
          let formattedUrl = url.trim();
          if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
            formattedUrl = `https://${formattedUrl}`;
          }

          if (FIRECRAWL_API_KEY) {
            const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: formattedUrl, formats: ["markdown", "branding"], onlyMainContent: true }),
            });
            if (scrapeResp.ok) {
              const scrapeData = await scrapeResp.json();
              const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
              const branding = scrapeData.data?.branding || scrapeData.branding || null;
              if (branding) {
                scrapeResults.push(`[BRANDING from ${formattedUrl}]: ${JSON.stringify(branding)}`);
              }
              if (markdown) {
                scrapeResults.push(`[CONTENT from ${formattedUrl}]: ${markdown.slice(0, 2000)}`);
              }
            }
          } else {
            // Fallback: just note the URL for later reference
            scrapeResults.push(`[URL]: ${formattedUrl} (Firecrawl not configured — URL saved for reference)`);
          }
        } catch (err) {
          console.error(`[spotlight-flyer] scrape error for ${url}:`, err);
          scrapeResults.push(`[URL]: ${url} (scrape failed)`);
        }
      }

      // Send scraped content to AI for brand extraction
      const scrapedContent = scrapeResults.join("\n\n");
      let result: Record<string, unknown> = { scraped_summary: scrapedContent.slice(0, 1000) };

      if (LOVABLE_API_KEY() && scrapedContent.length > 10) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Extract brand identity from scraped website/social content. Return structured brand attributes. Focus on visual identity, messaging, services, and imagery described." },
                { role: "user", content: scrapedContent.slice(0, 8000) },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "extract_brand_from_web",
                  description: "Extract brand attributes from scraped web content",
                  parameters: {
                    type: "object",
                    properties: {
                      brand_name: { type: ["string", "null"] },
                      colors: { type: "array", items: { type: "string" }, description: "Hex color values" },
                      industry: { type: ["string", "null"] },
                      tone: { type: "string", description: "professional, bold, playful, luxury, minimal, friendly" },
                      tagline: { type: ["string", "null"] },
                      services: { type: "array", items: { type: "string" }, description: "Key services or offerings" },
                      design_notes: { type: ["string", "null"], description: "Design patterns, imagery themes, visual style notes for future flyer generation" },
                      scraped_summary: { type: "string", description: "Concise summary of brand identity, services, and imagery for use in generation prompts" },
                    },
                    required: ["colors", "tone", "scraped_summary"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "extract_brand_from_web" } },
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              result = { ...result, ...JSON.parse(toolCall.function.arguments) };
            }
          }
        } catch (err) {
          console.error("[spotlight-flyer] AI extraction from scraped content failed:", err);
        }
      }

      return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── BRANDING: list_brands ───
    if (action === "list_brands") {
      const { data, error } = await supabase
        .from("branding_packages")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ brands: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── BRANDING: save_brand ───
    if (action === "save_brand") {
      const { brand_id, name, brand_name, brand_colors, logo_url, tagline, disclaimer, industry, tone, is_default, font_styles, design_notes, website_url, facebook_url, instagram_url, scraped_summary } = body;

      // Build metadata with design intelligence
      const metadata: Record<string, unknown> = {};
      if (font_styles && Array.isArray(font_styles) && font_styles.length > 0) metadata.font_styles = font_styles;
      if (design_notes && typeof design_notes === "string") metadata.design_notes = design_notes;
      if (website_url) metadata.website_url = website_url;
      if (facebook_url) metadata.facebook_url = facebook_url;
      if (instagram_url) metadata.instagram_url = instagram_url;
      if (scraped_summary) metadata.scraped_summary = scraped_summary;

      // If setting as default, unset other defaults
      if (is_default) {
        await supabase.from("branding_packages").update({ is_default: false }).eq("user_id", userId);
      }

      const payload = {
        name: name || "Default",
        brand_name: brand_name || "",
        brand_colors: brand_colors || ["#001F3F", "#C9A24B"],
        logo_url: logo_url || null,
        tagline: tagline || null,
        disclaimer: disclaimer || null,
        industry: industry || null,
        tone: tone || "professional",
        is_default: !!is_default,
        metadata: Object.keys(metadata).length > 0 ? metadata : {},
      };

      if (brand_id) {
        // Update existing
        const { data: existing } = await supabase.from("branding_packages").select("id, user_id").eq("id", brand_id).single();
        if (!existing || existing.user_id !== userId) throw new Error("Brand not found");

        const { data, error } = await supabase.from("branding_packages").update(payload).eq("id", brand_id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ brand: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        // Create new
        const { data, error } = await supabase.from("branding_packages").insert({ ...payload, user_id: userId }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ brand: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ─── BRANDING: delete_brand ───
    if (action === "delete_brand") {
      const { brand_id } = body;
      if (!brand_id) throw new Error("brand_id required");
      const { error } = await supabase.from("branding_packages").delete().eq("id", brand_id).eq("user_id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: create_draft ───
    if (action === "create_draft") {
      const { raw_prompt, type: flyerType, brand_id } = body;
      if (!raw_prompt || typeof raw_prompt !== "string" || raw_prompt.length > 2000) {
        throw new Error("raw_prompt is required and must be under 2000 characters");
      }

      // Rate limits
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("marketing_flyers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", tenMinAgo);
      if ((recentCount || 0) >= 3) throw new Error("Rate limit: max 3 flyers per 10 minutes. Please wait.");

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: monthCount } = await supabase
        .from("marketing_flyers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStart.toISOString());
      if ((monthCount || 0) >= 20) throw new Error("Monthly limit reached: 20 flyers per month.");

      const detectedType = flyerType || await detectFlyerType(raw_prompt);

      // Load brand if specified
      let brandData: any = {};
      if (brand_id) {
        const { data: brand } = await supabase.from("branding_packages").select("*").eq("id", brand_id).eq("user_id", userId).single();
        if (brand) {
          const meta = typeof brand.metadata === "object" && brand.metadata ? brand.metadata : {};
          brandData = {
            brand_name: brand.brand_name,
            brand_colors: brand.brand_colors,
            logo_url: brand.logo_url,
            disclaimer: brand.disclaimer,
            // Include design intelligence for generation prompt
            ...(meta.font_styles ? { font_styles: meta.font_styles } : {}),
            ...(meta.design_notes ? { design_notes: meta.design_notes } : {}),
          };
        }
      }

      // Calendar events
      let calendarEvents: any[] = [];
      const datePatterns = raw_prompt.match(
        /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/gi
      );
      if (datePatterns && datePatterns.length > 0) {
        const { data: events } = await supabase
          .from("calendar_events")
          .select("id, title, start_time, end_time, location, description")
          .eq("user_id", userId)
          .order("start_time", { ascending: true })
          .limit(10);
        calendarEvents = events || [];
      }

      const { data: flyer, error: insertErr } = await supabase
        .from("marketing_flyers")
        .insert({ user_id: userId, type: detectedType, raw_prompt, status: "draft", ...brandData })
        .select()
        .single();
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ flyer, calendar_events: calendarEvents }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: get_flyer ───
    if (action === "get_flyer") {
      const { flyer_id } = body;
      if (!flyer_id) throw new Error("flyer_id required");
      const { data: flyer, error } = await supabase.from("marketing_flyers").select("*").eq("id", flyer_id).eq("user_id", userId).single();
      if (error || !flyer) throw new Error("Flyer not found");
      return new Response(JSON.stringify({ flyer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: update_details ───
    if (action === "update_details") {
      const { flyer_id, ...details } = body;
      if (!flyer_id) throw new Error("flyer_id required");

      const { data: existing } = await supabase.from("marketing_flyers").select("id, user_id").eq("id", flyer_id).single();
      if (!existing || existing.user_id !== userId) throw new Error("Not found or not yours");

      const updateFields: any = {};
      if (details.title !== undefined) updateFields.title = String(details.title).slice(0, 200);
      if (details.date_time !== undefined) updateFields.date_time = details.date_time;
      if (details.evergreen !== undefined) updateFields.evergreen = !!details.evergreen;
      if (details.location !== undefined) updateFields.location = details.location;
      if (details.bullets !== undefined) updateFields.bullets = details.bullets;
      if (details.cta !== undefined) updateFields.cta = details.cta;
      if (details.brand_name !== undefined) updateFields.brand_name = details.brand_name;
      if (details.brand_colors !== undefined) updateFields.brand_colors = details.brand_colors;
      if (details.logo_url !== undefined) updateFields.logo_url = details.logo_url;
      if (details.disclaimer !== undefined) updateFields.disclaimer = details.disclaimer;
      if (details.calendar_event_id !== undefined) updateFields.calendar_event_id = details.calendar_event_id;
      if (details.type !== undefined) updateFields.type = details.type;

      const { data: updated, error: updateErr } = await supabase.from("marketing_flyers").update(updateFields).eq("id", flyer_id).select().single();
      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ flyer: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: summarize_bullets ───
    if (action === "summarize_bullets") {
      const { description } = body;
      if (!description) throw new Error("description required");
      const bullets = await summarizeToBullets(String(description).slice(0, 5000));
      return new Response(JSON.stringify({ bullets }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: build_prompt ───
    if (action === "build_prompt") {
      const { flyer_id } = body;
      if (!flyer_id) throw new Error("flyer_id required");

      const { data: flyer } = await supabase.from("marketing_flyers").select("*").eq("id", flyer_id).single();
      if (!flyer || flyer.user_id !== userId) throw new Error("Not found");

      if (!flyer.title) throw new Error("Title is required");
      if (!flyer.evergreen && !flyer.date_time) throw new Error("Date/time or evergreen flag required");
      const bullets = Array.isArray(flyer.bullets) ? flyer.bullets : [];
      if (bullets.length === 0) throw new Error("At least one bullet point is required");
      if (!flyer.cta) throw new Error("Call to action is required");

      // Load brand metadata for scraped intelligence
      let brandMeta: Record<string, unknown> = {};
      if (flyer.brand_name) {
        const { data: brandPkg } = await supabase.from("branding_packages").select("metadata").eq("user_id", userId).eq("brand_name", flyer.brand_name).limit(1).single();
        if (brandPkg?.metadata && typeof brandPkg.metadata === "object") {
          brandMeta = brandPkg.metadata as Record<string, unknown>;
        }
      }

      const structured = buildStructuredPrompt(flyer, brandMeta);

      const { error: saveErr } = await supabase.from("marketing_flyers").update({ structured_prompt: structured, status: "pending" }).eq("id", flyer_id);
      if (saveErr) throw saveErr;

      return new Response(JSON.stringify({ structured_prompt: structured }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: generate ───
    if (action === "generate") {
      const { flyer_id, extra_instructions } = body;
      if (!flyer_id) throw new Error("flyer_id required");

      const { data: flyer } = await supabase.from("marketing_flyers").select("*").eq("id", flyer_id).single();
      if (!flyer || flyer.user_id !== userId) throw new Error("Not found");
      if (!flyer.structured_prompt) throw new Error("Build the prompt first");

      await supabase.from("marketing_flyers").update({ status: "generating" }).eq("id", flyer_id);

      let prompt = flyer.structured_prompt;
      if (extra_instructions) prompt += `\n\nAdditional instructions: ${String(extra_instructions).slice(0, 500)}`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
        });

        if (!aiResp.ok) {
          const status = aiResp.status;
          await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
          if (status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
          if (status === 402) throw new Error("AI credits exhausted. Please add funds to continue.");
          throw new Error("AI generation failed");
        }

        const aiData = await aiResp.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
          throw new Error("No image was generated");
        }

        const persistedImageUrl = await persistGeneratedImage(supabase, imageUrl, `generated-flyers/${userId}`);

        await supabase.from("marketing_flyers").update({
          result_image_url: persistedImageUrl,
          result_metadata: { model: "google/gemini-3-pro-image-preview", generated_at: new Date().toISOString() },
          status: "ready",
        }).eq("id", flyer_id);

        return new Response(JSON.stringify({ image_url: persistedImageUrl, status: "ready" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (genErr: any) {
        await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
        throw genErr;
      }
    }

    // ─── ACTION: delete_flyer ───
    if (action === "delete_flyer") {
      const { flyer_id } = body;
      if (!flyer_id) throw new Error("flyer_id required");
      // Verify ownership first
      const { data: existing } = await supabase.from("marketing_flyers").select("id, user_id, result_image_url").eq("id", flyer_id).single();
      if (!existing || existing.user_id !== userId) throw new Error("Flyer not found or not yours");
      // Attempt to remove from storage if a generated image exists
      if (existing.result_image_url) {
        try {
          const url = new URL(existing.result_image_url);
          // Extract path after /object/public/agency-assets/
          const pathMatch = url.pathname.match(/\/object\/public\/agency-assets\/(.+)/);
          if (pathMatch) {
            await supabase.storage.from("agency-assets").remove([pathMatch[1]]);
          }
        } catch { /* non-fatal: image cleanup best-effort */ }
      }
      const { error } = await supabase.from("marketing_flyers").delete().eq("id", flyer_id).eq("user_id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: list ───
    if (action === "list") {
      const { data: flyers, error: listErr } = await supabase
        .from("marketing_flyers")
        .select("id, title, type, status, result_image_url, created_at, brand_name, bullets, cta, evergreen, date_time, location")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (listErr) throw listErr;
      return new Response(JSON.stringify({ flyers: flyers || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[spotlight-flyer]", msg);
    return new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
