import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "Missing submission_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: submission, error } = await supabase
      .from("personal_intake_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (error || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emails = submission.delivery_emails as string[];
    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No delivery emails" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fd = submission.form_data as Record<string, any>;
    const coverages = fd.coverages || {};
    const coverageList = Object.entries(coverages)
      .filter(([_, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
      .join(", ");

    // Build HTML email
    let html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a2e;">
        <div style="background: linear-gradient(135deg, #1a2744 0%, #4a5568 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">Personal Lines Intake Submission</h1>
        </div>
        <div style="background: #fff; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="font-size: 16px; color: #1a2744; margin: 0 0 16px;">Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 6px 0; color: #718096; width: 140px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${fd.full_name || "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #718096;">Email</td><td style="padding: 6px 0;">${fd.email || "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #718096;">Phone</td><td style="padding: 6px 0;">${fd.phone || "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #718096;">Coverages</td><td style="padding: 6px 0; font-weight: 600;">${coverageList || "None selected"}</td></tr>
          </table>`;

    // Auto section
    if (fd.auto) {
      html += `<h2 style="font-size: 16px; color: #1a2744; margin: 20px 0 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">🚗 Auto</h2>`;
      if (fd.auto.drivers?.length) {
        html += `<h3 style="font-size: 13px; color: #718096; margin: 8px 0;">Drivers</h3>`;
        html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px;">
          <tr style="background: #f7fafc;"><th style="text-align: left; padding: 6px 8px;">Name</th><th style="text-align: left; padding: 6px 8px;">DOB</th><th style="text-align: left; padding: 6px 8px;">License #</th></tr>`;
        for (const d of fd.auto.drivers) {
          html += `<tr><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${d.full_name || "—"}</td><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${d.dob || "—"}</td><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${d.license_number || "—"}</td></tr>`;
        }
        html += `</table>`;
      }
      if (fd.auto.vehicles?.length) {
        html += `<h3 style="font-size: 13px; color: #718096; margin: 8px 0;">Vehicles</h3>`;
        html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px;">
          <tr style="background: #f7fafc;"><th style="text-align: left; padding: 6px 8px;">Year</th><th style="text-align: left; padding: 6px 8px;">Make</th><th style="text-align: left; padding: 6px 8px;">Model</th><th style="text-align: left; padding: 6px 8px;">VIN</th></tr>`;
        for (const v of fd.auto.vehicles) {
          html += `<tr><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${v.year || "—"}</td><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${v.make || "—"}</td><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${v.model || "—"}</td><td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0;">${v.vin || "—"}</td></tr>`;
        }
        html += `</table>`;
      }
    }

    // Home section
    if (fd.home) {
      html += `<h2 style="font-size: 16px; color: #1a2744; margin: 20px 0 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">🏠 Home</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px;">`;
      html += `<tr><td style="padding: 6px 0; color: #718096; width: 160px;">Names</td><td style="padding: 6px 0;">${fd.home.names || "—"}</td></tr>`;
      html += `<tr><td style="padding: 6px 0; color: #718096;">DOBs</td><td style="padding: 6px 0;">${fd.home.dobs || "—"}</td></tr>`;
      html += `<tr><td style="padding: 6px 0; color: #718096;">Address</td><td style="padding: 6px 0;">${[fd.home.address, fd.home.city, fd.home.state, fd.home.zip].filter(Boolean).join(", ") || "—"}</td></tr>`;
      if (fd.home.prior_address) html += `<tr><td style="padding: 6px 0; color: #718096;">Prior Address</td><td style="padding: 6px 0;">${fd.home.prior_address}</td></tr>`;
      html += `<tr><td style="padding: 6px 0; color: #718096;">Trampoline</td><td style="padding: 6px 0;">${fd.home.trampoline ? "Yes" : "No"}</td></tr>`;
      html += `<tr><td style="padding: 6px 0; color: #718096;">Dog</td><td style="padding: 6px 0;">${fd.home.dog ? `Yes — ${fd.home.dog_breeds || "breed not specified"}` : "No"}</td></tr>`;
      html += `<tr><td style="padding: 6px 0; color: #718096;">Occupancy</td><td style="padding: 6px 0;">${(fd.home.occupancy || []).join(", ") || "—"}</td></tr>`;
      if (fd.home.investment_type) html += `<tr><td style="padding: 6px 0; color: #718096;">Investment Type</td><td style="padding: 6px 0;">${fd.home.investment_type}</td></tr>`;
      if (fd.home.annual_rent_roll) html += `<tr><td style="padding: 6px 0; color: #718096;">Annual Rent Roll</td><td style="padding: 6px 0;">${fd.home.annual_rent_roll}</td></tr>`;
      html += `</table>`;
    }

    // Umbrella section
    if (fd.umbrella) {
      html += `<h2 style="font-size: 16px; color: #1a2744; margin: 20px 0 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">☂️ Umbrella</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px;">`;
      html += `<tr><td style="padding: 6px 0; color: #718096; width: 160px;">Limit</td><td style="padding: 6px 0; font-weight: 600;">$${fd.umbrella.limit || "—"}</td></tr>`;
      html += `<tr><td style="padding: 6px 0; color: #718096;">Cover UM/UIM</td><td style="padding: 6px 0;">${fd.umbrella.cover_um_uim ? "Yes" : "No"}</td></tr>`;
      html += `</table>`;
    }

    html += `
          <p style="font-size: 11px; color: #a0aec0; margin-top: 24px; text-align: center;">
            Submitted via AURA Personal Lines Intake • ${new Date().toLocaleDateString()}
          </p>
        </div>
      </div>`;

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AURA <noreply@buildingaura.site>",
        to: emails,
        subject: `Personal Lines Intake: ${fd.full_name || "New Submission"} — ${coverageList || "Coverage Request"}`,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-personal-intake error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
