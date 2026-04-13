import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, response } = await req.json();

    if (!token || !response) {
      return new Response(JSON.stringify({ error: "token and response required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validResponses = ["yes", "no", "maybe"];
    if (!validResponses.includes(response)) {
      return new Response(JSON.stringify({ error: "Invalid response value" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role so public (unauthenticated) can submit
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find lead by token
    const { data: lead, error: findErr } = await supabase
      .from("engine_leads")
      .select("id, company, questionnaire_status")
      .eq("questionnaire_token", token)
      .single();

    if (findErr || !lead) {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent double-submission
    if (lead.questionnaire_status === "responded") {
      return new Response(
        JSON.stringify({ success: true, already_responded: true, company: lead.company }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark lead as verified if response is yes or maybe
    const isVerified = response === "yes" || response === "maybe";

    const { error: updateErr } = await supabase
      .from("engine_leads")
      .update({
        questionnaire_response: response,
        questionnaire_responded_at: new Date().toISOString(),
        questionnaire_status: "responded",
        verified: isVerified,
        // If they said yes/maybe, bump status to signal interest
        status: isVerified ? "interested" : lead.status,
      })
      .eq("id", lead.id);

    if (updateErr) {
      console.error("Failed to save questionnaire response:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, response, company: lead.company }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("submit-lead-questionnaire error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
