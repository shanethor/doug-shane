import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { prompt, context, tone, action } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.length > 5000) {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user's AI provider preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_provider, openai_api_key_encrypted")
      .eq("user_id", userId)
      .maybeSingle();

    const useOwnKey = profile?.ai_provider === "openai" && profile?.openai_api_key_encrypted;

    const systemPrompt = `You are an expert insurance agency email assistant for AURA Risk Group.
Your job is to draft professional, concise emails for insurance producers.
Tone: ${tone || "professional"}
${context ? `Context about the lead/client:\n${context}` : ""}

Guidelines:
- Be concise but thorough
- Use proper insurance terminology
- Include relevant policy/coverage details when provided
- Sign off as the producer (don't invent names)
- Return ONLY the email content (subject line on first line prefixed with "Subject: ", then blank line, then body)`;

    let responseText = "";

    if (useOwnKey) {
      // Use user's own OpenAI API key
      const apiKey = profile.openai_api_key_encrypted;
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("OpenAI error:", resp.status, errBody);
        if (resp.status === 401) {
          return new Response(JSON.stringify({ error: "Invalid OpenAI API key. Please check your key in Settings." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "OpenAI request failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      responseText = data.choices?.[0]?.message?.content || "";
    } else {
      // Use Lovable AI (default)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await resp.text();
        console.error("AI gateway error:", resp.status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      responseText = data.choices?.[0]?.message?.content || "";
    }

    // Parse subject and body from response
    let subject = "";
    let body = responseText;
    if (responseText.startsWith("Subject:")) {
      const lines = responseText.split("\n");
      subject = lines[0].replace("Subject:", "").trim();
      body = lines.slice(2).join("\n").trim();
    }

    return new Response(JSON.stringify({ subject, body, provider: useOwnKey ? "openai" : "lovable" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compose-email error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
