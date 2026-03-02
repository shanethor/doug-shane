import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, form_data } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: record, error: fetchError } = await supabase
      .from("personal_intake_submissions")
      .select("id, is_used, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (fetchError || !record) {
      return new Response(JSON.stringify({ error: "Invalid intake token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (record.is_used || record.status === "submitted") {
      return new Response(JSON.stringify({ error: "Intake already submitted" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Intake token expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("personal_intake_submissions")
      .update({
        form_data: form_data ?? {},
        status: "submitted",
        submitted_at: new Date().toISOString(),
        is_used: true,
      })
      .eq("id", record.id)
      .eq("is_used", false)
      .select("id")
      .single();

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: "Unable to submit intake" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: updated.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-personal-intake error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
