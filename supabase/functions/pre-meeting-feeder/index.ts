import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Called by pg_cron daily. Finds calendar events 5 days out,
 * generates feeder lists, and emails them to the producer.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Find meetings 5 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: events } = await adminClient
      .from("calendar_events")
      .select("*")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .in("event_type", ["meeting", "client_meeting", "review"]);

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No meetings in 5 days", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const event of events) {
      // Check if we already generated a feeder list for this event
      const { data: existing } = await adminClient
        .from("feeder_lists")
        .select("id")
        .eq("calendar_event_id", event.id)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      // Extract client name from event title or attendees
      const clientName = event.title?.replace(/^(Meeting with|Call with|Review:)\s*/i, "").trim() || event.title;

      // Generate feeder list via the existing function
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/generate-feeder-list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            // Use service role to act on behalf of the producer
            "x-service-role": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          },
          body: JSON.stringify({
            client_name: clientName,
            meeting_date: event.start_time,
            calendar_event_id: event.id,
            auto_triggered: true,
            producer_user_id: event.user_id,
          }),
        });

        if (resp.ok) {
          const result = await resp.json();

          // Mark the feeder list as auto-triggered
          if (result.feeder_list_id) {
            await adminClient.from("feeder_lists").update({
              auto_triggered: true,
              calendar_event_id: event.id,
            }).eq("id", result.feeder_list_id);

            // Get producer email
            const { data: profile } = await adminClient
              .from("profiles")
              .select("full_name")
              .eq("user_id", event.user_id)
              .maybeSingle();

            // Get prospects for the email
            const { data: prospects } = await adminClient
              .from("feeder_list_prospects")
              .select("name, company, occupation, prospect_score, suggested_talking_point, relationship_to_client")
              .eq("feeder_list_id", result.feeder_list_id)
              .order("prospect_score", { ascending: false })
              .limit(10);

            // Send pre-meeting email with feeder list
            if (prospects && prospects.length > 0) {
              const prospectRows = prospects.map((p: any, i: number) =>
                `${i + 1}. **${p.name}** (Score: ${p.prospect_score || "N/A"}) — ${p.company || "Unknown"}, ${p.occupation || "Unknown"}\n   💡 ${p.suggested_talking_point || "Research this connection."}\n   🔗 ${p.relationship_to_client || ""}`
              ).join("\n\n");

              const meetingDateStr = new Date(event.start_time).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              });

              const emailBody = `
Hi ${profile?.full_name || "there"},

Your meeting with **${clientName}** is coming up on **${meetingDateStr}**. Here's your AI-generated feeder list with warm referral targets:

${prospectRows}

---
*Generated automatically by AuRa Connect Intelligence 5 days before your meeting.*
*[View full details in Connect Intelligence →](${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/connect/intelligence)*
              `.trim();

              // Use compose-email to send
              await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
                body: JSON.stringify({
                  to: event.user_id,
                  subject: `📋 Meeting Prep: ${clientName} — ${meetingDateStr}`,
                  body: emailBody,
                  type: "feeder_list_notification",
                }),
              });

              await adminClient.from("feeder_lists").update({
                emailed_to_producer: true,
                emailed_at: new Date().toISOString(),
              }).eq("id", result.feeder_list_id);
            }

            processed++;
          }
        }
      } catch (e) {
        console.error(`Failed to generate feeder list for event ${event.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, processed, total_events: events.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pre-meeting-feeder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
