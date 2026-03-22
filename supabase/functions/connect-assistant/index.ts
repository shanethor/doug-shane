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

## 1) Company Research
You CAN research companies. When the user asks to look up or research a company and provides a name or URL, you will receive live research data scraped from the web. Use it to provide:
- A company overview (what they do, industry, size)
- Key contacts or leadership if found
- Insurance-relevant insights (risks, coverage needs, pain points)
- Outreach suggestions and talking points
- A recommended next step (add to pipeline, draft outreach email, schedule call)

If research data is provided as context, analyze it thoroughly and present findings in a clear, actionable format. DO NOT say you "can't browse the web" or "can't look up information" — the system handles research for you.

## 2) Calendar & meetings
You can:
- List today's meetings and key details.
- Schedule a new meeting if the user gives a date/time and basic info.
- Propose 2–3 available times using their default availability template.
- Create/share a booking link (if feature is available).

If calendar isn't connected, answer: "I can manage your calendar once it's connected. Click 'Connect Calendar' in the Calendar tab, then tell me again what you'd like to schedule."

## 3) Email
You can:
- Draft emails for follow-ups, renewals, introductions, or event invites.
- Summarize long email threads (if provided).
- Suggest subject lines.

If email sending is not wired yet, respond with: "Here's a draft you can paste into your email client," and still provide a full reply.

## 4) Text messages / SMS
You can:
- Draft short SMS follow-ups and reminders.
- Turn email copy into a concise text.

If SMS sending isn't enabled, always say: "I can't send SMS directly in this demo, but here's a message you can copy into your phone."

## 5) Sales pipeline / deals
You can:
- Create new opportunities/leads.
- Update stage, next step, and close date.
- Suggest next action based on current stage.

## 6) Graphics / marketing assets (flyers, social posts)
You can:
- Turn a vague request into a clear brief for AI image/text generation.
- Always ask for missing basics: event name, date, time, audience, and call-to-action.
- If user asks for a LinkedIn post, return a short caption plus 3–5 hashtags.

## 7) General behavior & fail-safes
- Never reply "I don't know" alone. Instead ask one precise follow-up question, or provide a best-effort draft/template.
- Keep responses focused on doing the thing (drafting, scheduling, updating) rather than explaining how the software works.
- When in doubt, default to: "Here's a first draft you can use right now, and here's one question that would let me improve it."

The goal is that the AURA CONNECT assistant always has a useful, concrete next step for calendar, email, text, pipeline, research, and graphics tasks.`;

/** Try to scrape a company using Firecrawl search */
async function researchCompany(query: string, firecrawlKey: string, lovableKey: string): Promise<string | null> {
  try {
    // Step 1: Search for the company
    console.log("Researching company:", query);
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        limit: 3,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!searchResp.ok) {
      console.error("Firecrawl search error:", searchResp.status);
      return null;
    }

    const searchData = await searchResp.json();
    const results = searchData.data || [];

    if (results.length === 0) {
      console.log("No search results found");
      return null;
    }

    // Combine top results into research context
    let researchContext = `## Live Research Results for: "${query}"\n\n`;
    for (const result of results.slice(0, 3)) {
      researchContext += `### Source: ${result.title || result.url}\n`;
      researchContext += `URL: ${result.url}\n`;
      if (result.description) researchContext += `Summary: ${result.description}\n`;
      if (result.markdown) {
        researchContext += `Content:\n${result.markdown.slice(0, 4000)}\n`;
      }
      researchContext += "\n---\n\n";
    }

    console.log(`Research gathered: ${researchContext.length} chars from ${results.length} sources`);
    return researchContext;
  } catch (e) {
    console.error("Research error:", e);
    return null;
  }
}

/** Detect if a message is asking for company research and extract the query */
function detectResearchIntent(messages: Array<{ role: string; content: string }>): string | null {
  if (messages.length === 0) return null;
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return null;

  const text = lastUser.content.toLowerCase();

  // Check for research-related keywords
  const researchPatterns = [
    /(?:research|look up|look into|find out about|tell me about|info(?:rmation)? (?:on|about)|investigate|check out|what do you know about|learn about)\s+(.+)/i,
    /(?:research|look up|info)\s+(.+)/i,
  ];

  for (const pattern of researchPatterns) {
    const match = lastUser.content.match(pattern);
    if (match) {
      // Clean up the extracted company name
      let company = match[1].trim();
      company = company.replace(/[?.!]$/, "").trim();
      if (company.length > 2 && company.length < 200) {
        return company;
      }
    }
  }

  // Check if conversation context suggests research (e.g., user answered "What company?")
  if (messages.length >= 3) {
    const prevAssistant = messages[messages.length - 2];
    if (prevAssistant?.role === "assistant" && 
        /what.*company|company name|which company|what.*business/i.test(prevAssistant.content)) {
      const answer = lastUser.content.trim();
      if (answer.length > 1 && answer.length < 200 && !/^(yes|no|ok|sure|thanks)/i.test(answer)) {
        return answer;
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, research_query } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Determine if we need to research
    let researchData: string | null = null;
    const queryToResearch = research_query || (FIRECRAWL_API_KEY ? detectResearchIntent(messages) : null);

    if (queryToResearch && FIRECRAWL_API_KEY) {
      researchData = await researchCompany(queryToResearch, FIRECRAWL_API_KEY, LOVABLE_API_KEY);
    }

    // Build messages with research context
    const systemMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (researchData) {
      systemMessages.push({
        role: "system",
        content: `The following is LIVE research data gathered from the web. Use this to provide a comprehensive company overview and actionable insights:\n\n${researchData}`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [...systemMessages, ...messages],
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
