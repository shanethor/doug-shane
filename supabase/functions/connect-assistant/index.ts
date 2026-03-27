import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(context: any) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const pipelineSection = context?.pipeline ? `
## YOUR REAL PIPELINE DATA (from the database — use ONLY this data):
Total leads: ${context.pipeline.total}
By stage: ${JSON.stringify(context.pipeline.byStage)}
Total pipeline value: $${(context.pipeline.totalValue || 0).toLocaleString()}
Recent leads:
${(context.pipeline.leads || []).map((l: any) => `- ${l.account_name} (${l.stage}) — $${(l.target_premium || 0).toLocaleString()} — Contact: ${l.contact_name || "N/A"} — Source: ${l.lead_source || "N/A"}`).join("\n")}
` : `
## PIPELINE: No pipeline data loaded yet.
`;

  const contactsSection = context?.contacts ? `
## YOUR REAL NETWORK CONTACTS (from the database — use ONLY this data):
Total contacts: ${context.contacts.total}
Contacts:
${(context.contacts.list || []).map((c: any) => `- ${c.display_name || "Unknown"} — ${c.primary_email || "no email"} — ${c.company || ""} — ${c.title || ""} — Tier: ${c.tier || "unranked"}`).join("\n")}
` : `
## CONTACTS: No contact data loaded yet.
`;

  const calendarSection = context?.calendar ? `
## YOUR REAL CALENDAR (from the database — use ONLY this data):
Upcoming events: ${context.calendar.total}
${(context.calendar.events || []).map((e: any) => `- ${e.title} — ${new Date(e.start_time).toLocaleDateString()} ${new Date(e.start_time).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} — Attendees: ${(e.attendees || []).join(", ") || "None listed"}`).join("\n")}
` : `
## CALENDAR: No calendar data loaded yet.
`;

  const emailSection = context?.email ? `
## YOUR REAL EMAIL STATS:
Total synced emails: ${context.email.total}
Unread: ${context.email.unread}
Recent subjects: ${(context.email.recent || []).map((e: any) => `"${e.subject}" from ${e.from_name || e.from_address}`).join(", ")}
` : `
## EMAIL: No email data loaded yet.
`;

  return `You are Sage, the AURA CONNECT AI assistant — built for insurance producers and account managers.

CURRENT DATE AND TIME: ${dateStr} at ${timeStr}

CRITICAL RULES — REAL DATA ONLY:
1. You have access to the user's REAL platform data below. Use ONLY this data when answering questions about their pipeline, contacts, calendar, or email.
2. NEVER fabricate contacts, deals, values, dates, or statistics. If data is not available, say "I don't have that data loaded yet" and suggest how to populate it.
3. When scheduling, ALWAYS use dates relative to today (${dateStr}). Never use dates from 2024 or arbitrary future dates.
4. For actions (sending emails, creating events, adding leads), confirm the action and explain what you'll do. Use action markers so the frontend can execute.
5. Be concise, use markdown formatting, bullet points, and tables where helpful.

${pipelineSection}
${contactsSection}
${calendarSection}
${emailSection}

## ACTION MARKERS (include these in your response when taking action):
- To add a lead: [PIPELINE_ACTION:ADD|name|company|value|stage]
- To move a lead: [PIPELINE_ACTION:MOVE|lead_id|new_stage]
- To create a calendar event: [CALENDAR_ACTION:CREATE|title|date|time|duration_minutes]
- To navigate: [NAVIGATE:/connect/pipeline] or [NAVIGATE:/connect/email] etc.

## CAPABILITIES:
1. **Pipeline Management**: Show real pipeline data, suggest priorities, add/move leads
2. **Contact Intelligence**: Look up real contacts, find connection paths, suggest outreach
3. **Calendar Management**: Show upcoming events, help schedule meetings (use real dates from today)
4. **Email Intelligence**: Summarize recent emails, draft replies, compose new emails
5. **Analytics**: Show real metrics from the platform data above
6. **Company Research**: Use your knowledge to research companies for prospecting
7. **Content**: Help draft emails, social posts, marketing content

## RESPONSE FORMAT:
- Use **bold** headers for sections
- Use > blockquotes for key callouts
- Keep bullet lists tight
- Use tables for comparing data
- End responses with 2-3 actionable next steps when appropriate
- Keep paragraphs to 2-3 sentences max

## PERSONALITY:
You are a knowledgeable, proactive insurance industry assistant. You speak with confidence about insurance-specific topics. You're direct, action-oriented, and always looking for ways to help the user close more business.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // If no context provided, try to fetch it from the database using the user's token
    let enrichedContext = context || {};
    
    const authHeader = req.headers.get("authorization");
    if (authHeader && (!context || Object.keys(context).length === 0)) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch pipeline
          const { data: leads } = await supabase
            .from("leads")
            .select("id, account_name, contact_name, email, stage, target_premium, lead_source, updated_at")
            .eq("owner_user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(50);
          
          const byStage: Record<string, number> = {};
          let totalValue = 0;
          (leads || []).forEach((l: any) => {
            byStage[l.stage] = (byStage[l.stage] || 0) + 1;
            totalValue += l.target_premium || 0;
          });
          
          enrichedContext.pipeline = {
            total: (leads || []).length,
            byStage,
            totalValue,
            leads: (leads || []).slice(0, 20),
          };

          // Fetch contacts
          const { data: contacts } = await supabase
            .from("canonical_persons")
            .select("id, display_name, primary_email, company, title, tier")
            .eq("owner_user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(50);
          
          enrichedContext.contacts = {
            total: (contacts || []).length,
            list: contacts || [],
          };

          // Fetch calendar events
          const { data: events } = await supabase
            .from("calendar_events")
            .select("id, title, start_time, end_time, attendees, location, event_type")
            .eq("user_id", user.id)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(20);
          
          enrichedContext.calendar = {
            total: (events || []).length,
            events: events || [],
          };

          // Fetch email stats
          const { data: emails, count } = await supabase
            .from("synced_emails")
            .select("id, subject, from_name, from_address, is_read, received_at", { count: "exact" })
            .eq("user_id", user.id)
            .order("received_at", { ascending: false })
            .limit(10);
          
          const unreadCount = (emails || []).filter((e: any) => !e.is_read).length;
          enrichedContext.email = {
            total: count || 0,
            unread: unreadCount,
            recent: (emails || []).slice(0, 5),
          };
        }
      } catch (e) {
        console.error("Context enrichment failed (non-fatal):", e);
      }
    }

    const systemPrompt = buildSystemPrompt(enrichedContext);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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
