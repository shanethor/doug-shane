import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// TEST MODE: redirect all questionnaire emails here instead of the real lead email
const TEST_EMAIL = "shanebaseball08@gmail.com";
const TEST_MODE = true; // flip to false when ready for production

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the lead
    const { data: lead, error: leadErr } = await supabase
      .from("engine_leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique token
    const token = crypto.randomUUID();
    const siteUrl = Deno.env.get("SITE_URL") || "https://buildingaura.site";
    const verifyUrl = `${siteUrl}/lead-verify/${token}`;

    // Save token + mark as sent
    const { error: updateErr } = await supabase
      .from("engine_leads")
      .update({
        questionnaire_token: token,
        questionnaire_sent_at: new Date().toISOString(),
        questionnaire_status: "sent",
      })
      .eq("id", lead_id);

    if (updateErr) {
      console.error("Failed to update lead with token:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = TEST_MODE ? TEST_EMAIL : (lead.email || TEST_EMAIL);
    const recipientName = lead.contact_name || "there";
    const companyName = lead.company || "your business";

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="margin-bottom: 28px;">
          <h2 style="color: #1a1a2e; font-size: 20px; font-weight: 700; margin: 0 0 6px;">
            Quick question about ${companyName}
          </h2>
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0;">
            Hi ${recipientName},
          </p>
        </div>

        <p style="color: #444; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          I came across ${companyName} and wanted to reach out. We help businesses like yours
          find the right insurance coverage — often at a better rate than what you're currently paying.
        </p>

        <p style="color: #444; font-size: 14px; line-height: 1.7; margin-bottom: 28px;">
          I just have one quick question:
        </p>

        <div style="background: #f8f8fc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
          <p style="color: #1a1a2e; font-size: 16px; font-weight: 600; margin: 0 0 20px;">
            Are you actively looking for insurance coverage?
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="${verifyUrl}?response=yes"
               style="display: inline-block; padding: 12px 28px; background-color: #1a6b3c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 4px;">
              ✅ Yes, I am
            </a>
            <a href="${verifyUrl}?response=maybe"
               style="display: inline-block; padding: 12px 28px; background-color: #4a5568; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 4px;">
              🤔 Maybe / Tell me more
            </a>
            <a href="${verifyUrl}?response=no"
               style="display: inline-block; padding: 12px 28px; background-color: #9ca3af; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 4px;">
              ❌ Not right now
            </a>
          </div>
        </div>

        <p style="color: #888; font-size: 12px; line-height: 1.6; margin: 0;">
          This takes one click. No forms, no obligation. If you're not interested, just click "Not right now" and we won't bother you again.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 11px;">Sent via AURA · Powered by buildingaura.site${TEST_MODE ? " · [TEST MODE — real recipient: " + (lead.email || "no email on file") + "]" : ""}</p>
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
        to: [recipientEmail],
        subject: `Quick question about ${companyName}`,
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

    return new Response(
      JSON.stringify({ success: true, sent_to: recipientEmail, test_mode: TEST_MODE }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-lead-questionnaire error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
