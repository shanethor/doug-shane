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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { name, notes } = await req.json();
    if (!name?.trim()) throw new Error("Name is required");

    // Call Lovable AI to generate the Connection Brief
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const systemPrompt = `You are AURA Intelligence, a relationship intelligence engine for insurance advisors and business professionals.
Given a person's name and optional notes, generate a Connection Brief.

IMPORTANT: Generate realistic, plausible research based on the name and notes provided. This is a research and intelligence tool.

Return ONLY valid JSON matching this exact structure:
{
  "who_they_are": {
    "name": "full name",
    "location": "city, state",
    "employer": "company name or null",
    "role": "title or null",
    "industry": "industry or null",
    "affiliations": ["org1", "org2"],
    "summary": "2-3 sentence profile summary"
  },
  "what_changed": {
    "events": [
      { "type": "Job Change|New Business|Property|Growth Signal|Press", "description": "what happened", "date": "approximate date or null" }
    ]
  },
  "who_can_get_you_there": [
    { "name": "connector name", "relationship": "how they relate", "confidence": 75, "reason": "why this path works" }
  ],
  "best_path_in": {
    "person": "best connector name",
    "reason": "why this is the warmest path",
    "confidence": "high|medium|low"
  },
  "recommended_move": "One sentence: the specific action to take"
}`;

    const userPrompt = `Build a Connection Brief for:
Name: ${name.trim()}
${notes?.trim() ? `Notes: ${notes.trim()}` : "No additional notes provided."}

Generate a thorough intelligence brief. If notes mention specific details (industry, location, referral source), use them to build richer context.`;

    const aiRes = await fetch("https://lovable.dev/api/chat", {
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

    let brief;
    try {
      brief = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
