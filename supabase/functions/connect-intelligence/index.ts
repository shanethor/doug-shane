import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error("Not authenticated");
    const userId = claimsData.claims.sub;

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

    // Fetch network contacts for real relationship data
    const { data: networkContacts } = await supabase
      .from("network_contacts")
      .select("full_name, email, phone, company, title, source, location, notes, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200);

    // Fetch network connection stats
    const { data: networkConns } = await supabase
      .from("network_connections")
      .select("source, contact_count, last_sync_at, status")
      .eq("user_id", userId);

    // Fetch calendar events for meeting context
    const { data: calendarEvents } = await supabase
      .from("calendar_events")
      .select("title, start_time, attendees, event_type")
      .eq("user_id", userId)
      .gte("start_time", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: false })
      .limit(30);

    // Fetch outreach feedback to learn from past actions
    const { data: pastFeedback } = await supabase
      .from("outreach_feedback")
      .select("target_name, target_company, action, outreach_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const leadsContext = (leads || []).map(l =>
      `${l.account_name} (${l.contact_name || "no contact"}, ${l.stage}, ${l.business_type || "unknown"}, ${l.state || "?"}, premium: ${l.target_premium || "?"}, renewal: ${l.estimated_renewal_date || "?"})`
    ).join("\n");

    const contactsContext = (networkContacts || []).map(c =>
      `${c.full_name || "Unknown"} | ${c.company || "?"} | ${c.title || "?"} | ${c.email || "?"} | source: ${c.source} | ${c.location || "?"}`
    ).join("\n");

    const connectedSources = (networkConns || []).map(c =>
      `${c.source}: ${c.contact_count} contacts (last sync: ${c.last_sync_at || "never"})`
    ).join(", ");

    const meetingsContext = (calendarEvents || []).map(e =>
      `${e.title} on ${new Date(e.start_time).toLocaleDateString()} (${e.event_type}, attendees: ${(e.attendees || []).join(", ")})`
    ).join("\n");

    const feedbackContext = (pastFeedback || []).map(f =>
      `${f.action} ${f.outreach_type} to ${f.target_name} at ${f.target_company} on ${new Date(f.created_at).toLocaleDateString()}`
    ).join("\n");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "dashboard") {
      systemPrompt = `You are AURA Intelligence, an AI relationship engine for insurance professionals.
You have access to the user's pipeline data, their actual network contacts from connected sources, recent meetings, and past outreach actions.
Generate actionable, data-driven relationship intelligence.

The user is: ${profile?.full_name || "an insurance advisor"} at ${profile?.agency_name || "their agency"}.
Connected data sources: ${connectedSources || "none yet"}.

IMPORTANT: Use REAL names and companies from the provided network contacts and leads data when generating recommendations.
Cross-reference contacts with leads to identify warm paths.
Prioritize contacts who appear across multiple sources (email + LinkedIn + phone = strongest signal).

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
    { "id": "unique_id", "type": "email|linkedin_dm|comment|intro_request", "target": "person name", "company": "company name", "email": "recipient@example.com or null", "subject": "email subject or action", "draft": "the actual draft message", "reason": "why now", "priority": "high|medium|low" }
  ],
  "stats": {
    "warm_paths": 10,
    "active_triggers": 5,
    "pending_touches": 8,
    "meetings_sourced_90d": 3
  }
}

Generate up to 10 top owners, up to 10 top partners, 8-12 triggers, and 6-10 touch queue items.
Use REAL data from the contacts and leads provided. Make every recommendation specific and actionable.
Touch queue drafts should be 2-4 sentences, professional but warm, in the advisor's voice.
For email-type touch_queue items, include a real recipient email from the provided contact data whenever one exists. If no email exists, return null for the email field.
Stats should reflect the actual data counts where possible.`;

      userPrompt = `Here is my current pipeline of ${(leads || []).length} accounts:

${leadsContext || "No pipeline leads yet."}

My network contacts (${(networkContacts || []).length} total from ${connectedSources || "no sources"}):

${contactsContext || "No network contacts imported yet."}

Recent meetings (last 90 days):
${meetingsContext || "No recent meetings."}

Past outreach actions:
${feedbackContext || "No past outreach tracked."}

${context ? `Additional context: ${context}` : ""}

Generate my relationship intelligence dashboard. Cross-reference my network contacts with my pipeline to find:
1. Which business owners I can warm-reach RIGHT NOW through mutual contacts
2. Which referral partners (CPAs, attorneys, lenders, bankers) from my network I should deepen relationships with
3. Triggers and signals I should act on (renewals coming up, new contacts added, dormant relationships to reactivate)
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
        model: "google/gemini-2.5-flash",
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
      console.error("AI gateway error:", aiRes.status, errText.slice(0, 300));
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI request failed: ${aiRes.status}`);
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
    console.error("connect-intelligence error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
