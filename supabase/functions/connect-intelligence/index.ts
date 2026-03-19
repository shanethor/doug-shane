import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");
    const userId = user.id;


    const { action, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    // Fetch user's leads for context
    const { data: leads } = await supabase
      .from("leads")
      .select("account_name, contact_name, email, phone, stage, business_type, state, line_type, target_premium, estimated_renewal_date")
      .order("updated_at", { ascending: false })
      .limit(50);

    // Fetch user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, agency_name")
      .eq("user_id", userId)
      .maybeSingle();

    const leadsContext = (leads || []).map(l =>
      `${l.account_name} (${l.contact_name || "no contact"}, ${l.stage}, ${l.business_type || "unknown"}, ${l.state || "?"}, premium: ${l.target_premium || "?"}, renewal: ${l.estimated_renewal_date || "?"})`
    ).join("\n");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "dashboard") {
      systemPrompt = `You are AURA Intelligence, an AI relationship engine for insurance professionals.
You have access to the user's pipeline/leads data. Generate actionable relationship intelligence.

The user is: ${profile?.full_name || "an insurance advisor"} at ${profile?.agency_name || "their agency"}.

Return ONLY valid JSON with this structure:
{
  "top_owners": [
    { "name": "string", "company": "string", "reason": "why they're reachable now", "signal": "trigger event", "warmth": 85, "best_path": "who/how to reach them" }
  ],
  "top_partners": [
    { "name": "string", "type": "CPA|Attorney|Lender|Banker|Other", "reason": "why deepen this relationship", "owners_unlocked": 5, "last_interaction": "description" }
  ],
  "triggers": [
    { "type": "job_change|funding|expansion|renewal|dormant_reactivation|new_contact|content_engagement", "title": "short title", "description": "what happened", "person": "who it involves", "company": "company name", "date": "when", "urgency": "high|medium|low", "suggested_action": "what to do" }
  ],
  "touch_queue": [
    { "id": "unique_id", "type": "email|linkedin_dm|comment|intro_request", "target": "person name", "company": "company name", "subject": "email subject or action", "draft": "the actual draft message", "reason": "why now", "priority": "high|medium|low" }
  ],
  "stats": {
    "warm_paths": 10,
    "active_triggers": 5,
    "pending_touches": 8,
    "meetings_sourced_90d": 3
  }
}

Generate 10 top owners, 10 top partners, 8-12 triggers, and 6-10 touch queue items.
Make everything specific, actionable, and realistic based on the pipeline data.
Triggers should include a mix of types. Touch queue drafts should be 2-4 sentences in the advisor's voice.`;

      userPrompt = `Here is my current pipeline of ${(leads || []).length} accounts:

${leadsContext}

${context ? `Additional context: ${context}` : ""}

Generate my relationship intelligence dashboard. Focus on:
1. Which owners I can warm-reach RIGHT NOW based on triggers and connections
2. Which referral partners (CPAs, attorneys, lenders) I should deepen
3. Recent signals and triggers I should act on
4. Draft outreach messages ready for one-tap approval`;
    } else {
      throw new Error("Unknown action: " + action);
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI request failed: ${aiRes.status} ${errText.slice(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
