import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    return new Response(null, { headers: corsHeaders });
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

    const agentId = await getFallbackAgentId(supabase);
    if (!agentId) {
      return new Response(JSON.stringify({ error: "no agent configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Slugs that should skip the line-type selection (auto-select personal)
    const personalOnlySlugs = ["josh-chernes"];
    const lineType = personalOnlySlugs.includes(slug) ? "personal" : null;

    const insertPayload: Record<string, unknown> = { agent_id: agentId };
    if (lineType) insertPayload.line_type = lineType;

    const { data, error } = await supabase
      .from("intake_links")
      .insert(insertPayload)
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
