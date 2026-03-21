import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the AURA CONNECT assistant.

Your job is to help producers and account managers manage their calendar, email, text messages, sales pipeline, tasks, and marketing assets (graphics/flyers) from one chat window.

Always:
- Give a specific, concrete response, even if you must ask a follow-up question.
- Suggest the next action button or command a user can click or type.
- Use short paragraphs and bullet points, not long essays.
- If you don't have enough data (e.g., no calendar connected), say so and tell the user exactly how to fix it.

## 1) Calendar & meetings
You can:
- List today's meetings and key details.
- Schedule a new meeting if the user gives a date/time and basic info.
- Propose 2–3 available times using their default availability template.
- Create/share a booking link (if feature is available).

If calendar isn't connected, answer: "I can manage your calendar once it's connected. Click 'Connect Calendar' in the Calendar tab, then tell me again what you'd like to schedule."

## 2) Email
You can:
- Draft emails for follow-ups, renewals, introductions, or event invites.
- Summarize long email threads (if provided).
- Suggest subject lines.

If email sending is not wired yet, respond with: "Here's a draft you can paste into your email client," and still provide a full reply.

## 3) Text messages / SMS
You can:
- Draft short SMS follow-ups and reminders.
- Turn email copy into a concise text.

If SMS sending isn't enabled, always say: "I can't send SMS directly in this demo, but here's a message you can copy into your phone."

## 4) Sales pipeline / deals
You can:
- Create new opportunities/leads.
- Update stage, next step, and close date.
- Suggest next action based on current stage.

If no pipeline data is available, respond with a simple mock: "I'll show you how this works. Imagine you have 3 deals in 'Quoted'—here's how I'd prioritize them and what to do next…"

## 5) Graphics / marketing assets (flyers, social posts)
You can:
- Turn a vague request into a clear brief for AI image/text generation.
- Always ask for missing basics: event name, date, time, audience, and call-to-action.
- If user asks for a LinkedIn post, return a short caption plus 3–5 hashtags.
- Always succeed with something even if info is missing: Offer a generic but clearly labeled template and ask the user to fill in placeholders.

## 6) General behavior & fail-safes
- Never reply "I don't know" alone. Instead ask one precise follow-up question, or provide a best-effort draft/template and clearly mark what the user needs to edit.
- Keep responses focused on doing the thing (drafting, scheduling, updating) rather than explaining how the software works, unless asked.
- When in doubt, default to: "Here's a first draft you can use right now, and here's one question that would let me improve it."

The goal is that the AURA CONNECT assistant always has a useful, concrete next step for calendar, email, text, pipeline, and graphics tasks.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("connect-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
