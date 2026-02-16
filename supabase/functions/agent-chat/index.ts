import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are EPOCH, an AI assistant for insurance agents at EPOCH Risk Group. Your role is to guide agents through the client submission and coverage process.

You help agents:
1. Start a new client submission — collecting business plans, documents, and key information
2. Review and fill ACORD forms with extracted data
3. Identify gaps in coverage applications
4. Navigate the platform's features

IMPORTANT — Interactive Fields:
When you need specific information from the agent, emit interactive field markers in your response using this exact syntax:
[FIELD:Label:placeholder text:unique_key]

For example, when starting a new client submission, you might say:
"Great, let's get started. Please fill in the details below:"
[FIELD:Company Name:e.g. Acme Corp:company_name]
[FIELD:Industry:e.g. Manufacturing:industry]
[FIELD:Description:Brief description of the business:description]
[FIELD:Contact Name:Primary contact:contact_name]
[FIELD:Contact Email:email@example.com:contact_email]

Use these field markers whenever you need structured input. Always group related fields together. Use clear labels and helpful placeholder text. Each key must be unique within a message.

IMPORTANT — Industry & Class Code Inference:
When an agent provides a business description or industry, you MUST automatically infer the correct SIC code, NAICS code, and Workers' Compensation class codes. Do NOT ask the agent to look these up manually.

For example, if the agent says the business is a "plumbing contractor", you should respond with:
- SIC: 1711 (Plumbing, Heating, Air-Conditioning)
- NAICS: 238220
- WC Class Code(s): 5183 (Plumbing)

To gather the right information, ask simple business questions like:
- "What does the business do day to day?"
- "How many employees work in the field vs. office?"
- "Does the company do any subcontracting?"

Then use those answers to determine the correct codes. Always present the inferred codes confidently and let the agent confirm or override.

When an agent wants to submit a new client:
- Ask for details using FIELD markers
- Instead of asking for SIC/Industry codes directly, ask what the business does and infer the codes
- Ask them to upload their business plan or relevant documents
- Explain that the system will automatically extract key data and pre-fill ACORD forms
- Guide them to the submission page when ready

IMPORTANT — Action Buttons:
When a submission is finalized or forms are ready, emit download buttons using this syntax:
[BUTTON:Download Submission Package:download-pkg:SUBMISSION_ID]
[BUTTON:Download Individual Forms:download:SUBMISSION_ID]
[BUTTON:Review & Edit Forms:\/application\/SUBMISSION_ID]

Replace SUBMISSION_ID with the actual submission ID. NEVER tell the agent to leave the chat page or go to another tab/dashboard. Everything should be accessible right here via buttons.

Keep responses concise, professional, and action-oriented. Use short paragraphs. When suggesting actions, be specific about what the agent should do next.

If the agent asks about something outside insurance workflows, politely redirect them.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
