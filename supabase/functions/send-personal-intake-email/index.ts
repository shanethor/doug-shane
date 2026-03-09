import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, applicant_name, sections } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the submission record
    const { data: record, error } = await supabase
      .from("personal_intake_submissions")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !record) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deliveryEmails = record.delivery_emails;
    if (!deliveryEmails || deliveryEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No delivery emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agent name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, agency_name, agency_id")
      .eq("user_id", record.agent_id)
      .maybeSingle();

    const agentName = profile?.full_name || "Your agent";
    // Resolve agency name from agencies table (canonical source)
    let agencyName = "";
    if (profile?.agency_id) {
      const { data: ag } = await supabase.from("agencies").select("name").eq("id", profile.agency_id).maybeSingle();
      if (ag?.name) agencyName = ag.name;
    }
    if (!agencyName) agencyName = profile?.agency_name || "";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the lead created for this submission to build the "View Full Submission" link
    let viewLink = "";
    const { data: leadMatch } = await supabase
      .from("leads")
      .select("id")
      .eq("owner_user_id", record.agent_id)
      .ilike("account_name", (applicant_name || "").trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leadMatch) {
      // Use the published app URL from the origin or fallback
      const appUrl = Deno.env.get("APP_URL") || "https://doug-shane.lovable.app";
      viewLink = `${appUrl}/lead/${leadMatch.id}`;
    }

    // Build summary from form_data
    const fd = record.form_data as any;
    const applicant = fd?.applicant || {};
    const sectionList = sections || "Not specified";

    const viewButton = viewLink ? `
      <div style="margin: 24px 0; text-align: center;">
        <a href="${viewLink}" style="display: inline-block; background-color: #1a1a2e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          View Full Submission →
        </a>
      </div>
    ` : "";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Personal Lines Intake Received</h2>
        <p>A new personal lines intake form has been submitted.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 140px;">Applicant</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${applicant_name || applicant.name || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${applicant.email || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${applicant.phone || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Coverage Sections</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sectionList}</td></tr>
        </table>
        ${fd?.sections?.auto ? `<p><strong>Auto:</strong> ${fd.sections.auto.drivers?.length || 0} driver(s), ${fd.sections.auto.vehicles?.length || 0} vehicle(s)</p>` : ""}
        ${fd?.sections?.home ? `<p><strong>Home:</strong> ${fd.sections.home.properties?.length || 0} property/properties</p>` : ""}
        ${fd?.sections?.boat ? `<p><strong>Boat:</strong> ${fd.sections.boat.boats?.length || 0} watercraft</p>` : ""}
        ${fd?.sections?.umbrella ? `<p><strong>Umbrella:</strong> Requested limit $${Number(fd.sections.umbrella.requested_limit || 0).toLocaleString()}</p>` : ""}
        ${fd?.notes ? `<p><strong>Notes:</strong> ${fd.notes}</p>` : ""}
        ${viewButton}
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
        from: "AURA <noreply@buildingaura.site>",
        to: deliveryEmails,
        subject: `Personal Lines Intake: ${applicant_name || "New Submission"}`,
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
    console.error("send-personal-intake-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
