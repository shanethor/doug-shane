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

function buildStructuredPrompt(flyer: any): string {
  const parts: string[] = [];

  // Intro
  const styleMap: Record<string, string> = {
    event: "clean, professional",
    webinar: "modern, trustworthy, minimal",
    promo: "bold, attention-grabbing, bright",
    hiring: "approachable, professional",
    announcement: "elegant, celebratory",
  };
  const style = styleMap[flyer.type] || "professional, clean";

  parts.push(
    `Create a ${style} vertical marketing flyer for ${flyer.brand_name || "a business"}.`
  );

  // Brand
  const colors = Array.isArray(flyer.brand_colors) && flyer.brand_colors.length > 0
    ? flyer.brand_colors.join(" and ")
    : "professional tones";
  parts.push(`Use brand colors: ${colors}.`);
  if (flyer.logo_url) {
    parts.push(`Include the company logo at the top.`);
  }

  // Title
  parts.push(`Headline: "${flyer.title}".`);

  // Date / time / location
  if (!flyer.evergreen && flyer.date_time) {
    parts.push(`Date/Time: ${flyer.date_time}.`);
  }
  if (flyer.location) {
    parts.push(`Location: ${flyer.location}.`);
  }
  if (flyer.type === "webinar") {
    parts.push(`Include a "Live Webinar" tag prominently.`);
  }

  // Bullets
  const bullets = Array.isArray(flyer.bullets) ? flyer.bullets : [];
  if (bullets.length > 0) {
    parts.push(
      `Turn these points into ${bullets.length} concise bullet points on the flyer:\n${bullets.map((b: string) => `• ${b}`).join("\n")}`
    );
  }

  // CTA
  if (flyer.cta) {
    parts.push(`Call to action: "${flyer.cta}".`);
  }

  // Layout guidance
  parts.push(
    `Design style: ${style}, suitable for print and social media.`,
    `Use clear hierarchy: large headline, date/time, location, bullet points, and a strong call to action.`,
    `Include 1–2 subtle background or b-roll images relevant to the topic without showing recognizable faces.`
  );

  // Disclaimer
  if (flyer.disclaimer) {
    parts.push(`Leave a small area at the bottom for disclaimer text: "${flyer.disclaimer}".`);
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
          {
            role: "system",
            content: "You summarize event or campaign descriptions into 3-5 concise bullet points (8-12 words each). Return ONLY a JSON array of strings. No markdown."
          },
          { role: "user", content: description },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_bullets",
              description: "Return the bullet points",
              parameters: {
                type: "object",
                properties: {
                  bullets: { type: "array", items: { type: "string" } },
                },
                required: ["bullets"],
                additionalProperties: false,
              },
            },
          },
        ],
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
  if (lower.includes("webinar") || lower.includes("zoom") || lower.includes("virtual")) return "webinar";
  if (lower.includes("promo") || lower.includes("special") || lower.includes("discount") || lower.includes("sale")) return "promo";
  if (lower.includes("hiring") || lower.includes("job") || lower.includes("careers")) return "hiring";
  if (lower.includes("announcement") || lower.includes("announce")) return "announcement";
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
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const body = await req.json();
    const { action } = body;

    // ─── ACTION: create_draft ───
    if (action === "create_draft") {
      const { raw_prompt, type: flyerType } = body;
      if (!raw_prompt || typeof raw_prompt !== "string" || raw_prompt.length > 2000) {
        throw new Error("raw_prompt is required and must be under 2000 characters");
      }

      // Rate limit: max 3 per 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("marketing_flyers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", tenMinAgo);

      if ((recentCount || 0) >= 3) {
        throw new Error("Rate limit: max 3 flyers per 10 minutes. Please wait.");
      }

      // Monthly limit: 20
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: monthCount } = await supabase
        .from("marketing_flyers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStart.toISOString());

      if ((monthCount || 0) >= 20) {
        throw new Error("Monthly limit reached: 20 flyers per month.");
      }

      const detectedType = flyerType || await detectFlyerType(raw_prompt);

      // Check for calendar events mentioned
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

      // Create draft row
      const { data: flyer, error: insertErr } = await supabase
        .from("marketing_flyers")
        .insert({
          user_id: userId,
          type: detectedType,
          raw_prompt,
          status: "draft",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({ flyer, calendar_events: calendarEvents }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: update_details ───
    if (action === "update_details") {
      const { flyer_id, ...details } = body;
      if (!flyer_id) throw new Error("flyer_id required");

      // Validate ownership
      const { data: existing } = await supabase
        .from("marketing_flyers")
        .select("id, user_id")
        .eq("id", flyer_id)
        .single();
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

      const { data: updated, error: updateErr } = await supabase
        .from("marketing_flyers")
        .update(updateFields)
        .eq("id", flyer_id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ flyer: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: summarize_bullets ───
    if (action === "summarize_bullets") {
      const { description } = body;
      if (!description) throw new Error("description required");
      const bullets = await summarizeToBullets(String(description).slice(0, 5000));
      return new Response(
        JSON.stringify({ bullets }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: build_prompt ───
    if (action === "build_prompt") {
      const { flyer_id } = body;
      if (!flyer_id) throw new Error("flyer_id required");

      const { data: flyer } = await supabase
        .from("marketing_flyers")
        .select("*")
        .eq("id", flyer_id)
        .single();
      if (!flyer || flyer.user_id !== userId) throw new Error("Not found");

      // Validation
      if (!flyer.title) throw new Error("Title is required");
      if (!flyer.evergreen && !flyer.date_time) throw new Error("Date/time or evergreen flag required");
      const bullets = Array.isArray(flyer.bullets) ? flyer.bullets : [];
      if (bullets.length === 0) throw new Error("At least one bullet point is required");
      if (!flyer.cta) throw new Error("Call to action is required");

      const structured = buildStructuredPrompt(flyer);

      const { error: saveErr } = await supabase
        .from("marketing_flyers")
        .update({ structured_prompt: structured, status: "pending" })
        .eq("id", flyer_id);
      if (saveErr) throw saveErr;

      return new Response(
        JSON.stringify({ structured_prompt: structured }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: generate ───
    if (action === "generate") {
      const { flyer_id, extra_instructions } = body;
      if (!flyer_id) throw new Error("flyer_id required");

      const { data: flyer } = await supabase
        .from("marketing_flyers")
        .select("*")
        .eq("id", flyer_id)
        .single();
      if (!flyer || flyer.user_id !== userId) throw new Error("Not found");

      if (!flyer.structured_prompt) throw new Error("Build the prompt first");

      // Set generating status
      await supabase
        .from("marketing_flyers")
        .update({ status: "generating" })
        .eq("id", flyer_id);

      let prompt = flyer.structured_prompt;
      if (extra_instructions) {
        prompt += `\n\nAdditional instructions: ${String(extra_instructions).slice(0, 500)}`;
      }

      try {
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
          const status = aiResp.status;
          if (status === 429) {
            await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
            throw new Error("Rate limit exceeded. Please try again in a moment.");
          }
          if (status === 402) {
            await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
            throw new Error("AI credits exhausted. Please add funds to continue.");
          }
          const errText = await aiResp.text();
          console.error("AI generation error:", status, errText);
          await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
          throw new Error("AI generation failed");
        }

        const aiData = await aiResp.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
          throw new Error("No image was generated");
        }

        // Store as base64 data URL directly (can be large)
        await supabase
          .from("marketing_flyers")
          .update({
            result_image_url: imageUrl,
            result_metadata: { model: "google/gemini-3-pro-image-preview", generated_at: new Date().toISOString() },
            status: "ready",
          })
          .eq("id", flyer_id);

        return new Response(
          JSON.stringify({ image_url: imageUrl, status: "ready" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (genErr: any) {
        await supabase.from("marketing_flyers").update({ status: "error" }).eq("id", flyer_id);
        throw genErr;
      }
    }

    // ─── ACTION: list ───
    if (action === "list") {
      const { data: flyers, error: listErr } = await supabase
        .from("marketing_flyers")
        .select("id, title, type, status, result_image_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (listErr) throw listErr;

      return new Response(
        JSON.stringify({ flyers: flyers || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[spotlight-flyer]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
