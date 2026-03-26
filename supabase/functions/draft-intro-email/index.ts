import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Generates a one-click introduction email draft:
 * "We have a mutual connection..."
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prospect_id, client_name, tone } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get prospect details
    const { data: prospect } = await adminClient
      .from("feeder_list_prospects")
      .select("*")
      .eq("id", prospect_id)
      .maybeSingle();

    if (!prospect) {
      return new Response(JSON.stringify({ error: "Prospect not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get producer profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const prompt = `You are a professional email writer for insurance producers. Write a warm introduction email.

Context:
- Producer: ${profile?.full_name || "the producer"}
- Prospect: ${prospect.name} (${prospect.occupation || "Unknown role"} at ${prospect.company || "Unknown company"})
- Mutual connection: ${client_name || prospect.relationship_to_client || "a shared connection"}
- Talking point: ${prospect.suggested_talking_point || ""}
- Tone: ${tone || "professional but warm, conversational"}

Write a short email (3-4 paragraphs max) that:
1. Opens with the mutual connection ("I was speaking with [client] and your name came up...")
2. Briefly explains what the producer does (insurance/risk management)
3. Mentions something specific about the prospect's situation
4. Ends with a soft call-to-action (coffee, quick call)

Return JSON: {"subject": "...", "body_html": "<p>...</p>"}`;

    const aiResp = await fetch(`${supabaseUrl}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        prompt,
        model: "google/gemini-2.5-flash",
        max_tokens: 800,
      }),
    });

    let subject = `Introduction via ${client_name || "mutual connection"}`;
    let bodyHtml = "<p>Draft could not be generated. Please write manually.</p>";

    if (aiResp.ok) {
      const aiData = await aiResp.json();
      const text = aiData.choices?.[0]?.message?.content || aiData.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        subject = parsed.subject || subject;
        bodyHtml = parsed.body_html || bodyHtml;
      }
    }

    // Save draft
    const { data: draft } = await adminClient
      .from("intro_email_drafts")
      .insert({
        user_id: user.id,
        prospect_id: prospect_id,
        subject,
        body_html: bodyHtml,
        status: "draft",
      })
      .select("id")
      .single();

    // Mark prospect as intro email drafted
    await adminClient.from("feeder_list_prospects").update({
      intro_email_sent: false,
    }).eq("id", prospect_id);

    return new Response(JSON.stringify({
      success: true,
      draft_id: draft?.id,
      subject,
      body_html: bodyHtml,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("draft-intro-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
