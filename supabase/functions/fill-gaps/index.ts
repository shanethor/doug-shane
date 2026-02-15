import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, answers } = await req.json();
    // answers: Record<string, string> — field key to answer value

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: app, error } = await supabase
      .from("insurance_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (error || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge answers into form_data
    const updatedFormData = { ...app.form_data, ...answers };

    // Remove answered gaps
    const answeredFields = Object.keys(answers);
    const remainingGaps = (app.gaps as any[]).filter(
      (g: any) => !answeredFields.includes(g.field)
    );

    const newStatus = remainingGaps.filter((g: any) => g.priority === "required").length === 0
      ? "complete"
      : "draft";

    await supabase
      .from("insurance_applications")
      .update({
        form_data: updatedFormData,
        gaps: remainingGaps,
        status: newStatus,
      })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({ form_data: updatedFormData, gaps: remainingGaps, status: newStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fill-gaps error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
