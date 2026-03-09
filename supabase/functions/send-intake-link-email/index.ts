import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, clientEmail, agentId } = await req.json();
    if (!token || !clientEmail) {
      return new Response(JSON.stringify({ error: "token and clientEmail required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get agent profile for branding
    let agentName = "Your insurance agent";
    let agencyName = "";
    if (agentId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, agency_id")
        .eq("user_id", agentId)
        .maybeSingle();
      if (profile?.full_name) agentName = profile.full_name;
      // Resolve from agencies table first, then profile fallback
      if (profile?.agency_id) {
        const { data: ag } = await supabase.from("agencies").select("name").eq("id", profile.agency_id).maybeSingle();
        if (ag?.name) agencyName = ag.name;
      }
      if (!agencyName && profile?.agency_name) agencyName = profile.agency_name;
    }

    // Build the intake URL using the project's public URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://buildingaura.site";
    const intakeUrl = `${siteUrl}/personal-intake/${token}`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">You've been sent an intake form</h2>
        <p style="color: #444; line-height: 1.6;">
          <strong>${agentName}</strong> at <strong>${agencyName}</strong> has requested some information from you
          to get started on your personal insurance quote.
        </p>
        <p style="color: #444; line-height: 1.6;">
          Please click the button below to fill out the intake form. It covers Auto, Home, Boat, and Umbrella coverage.
          The link expires in 30 days.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${intakeUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a2e; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Open Intake Form
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${intakeUrl}" style="color: #1a1a2e;">${intakeUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #888; font-size: 12px;">Sent via ${agencyName} · Powered by AURA</p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${agencyName} <noreply@buildingaura.site>`,
        to: [clientEmail],
        subject: `${agentName} has requested your insurance information`,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-intake-link-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
