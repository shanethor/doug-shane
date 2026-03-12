import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map borrower slugs → agent user IDs (the AURA agent who owns the intake)
const BORROWER_AGENT_MAP: Record<string, string> = {
  // Will be populated with real agent IDs; for now use a fallback
};

// Fallback agent ID — first admin/advisor found
async function getFallbackAgentId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "advisor"])
    .limit(1)
    .single();
  return data?.user_id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let agentId = BORROWER_AGENT_MAP[slug];
    if (!agentId) {
      agentId = (await getFallbackAgentId(supabase))!;
    }
    if (!agentId) {
      return new Response(JSON.stringify({ error: "no agent configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a personal intake submission record
    const { data, error } = await supabase
      .from("personal_intake_submissions")
      .insert({
        agent_id: agentId,
        delivery_emails: [],
        cc_producer: false,
        client_email: null,
      })
      .select("token")
      .single();

    if (error || !data) {
      console.error("Failed to create intake:", error);
      return new Response(JSON.stringify({ error: error?.message ?? "insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ token: data.token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
