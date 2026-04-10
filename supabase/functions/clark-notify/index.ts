import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Authentication failed");

    const { submission_id, client_email, client_name, action } = await req.json();
    if (!submission_id) throw new Error("submission_id is required");

    const { data: submission, error: subErr } = await supabase
      .from("clark_submissions")
      .select("*")
      .eq("id", submission_id)
      .eq("user_id", user.id)
      .single();

    if (subErr || !submission) throw new Error("Submission not found");

    const { data: clarkProfile } = await supabase
      .from("clark_profiles")
      .select("producer_name, firm_name, contact_email")
      .eq("user_id", user.id)
      .single();

    const agentName = clarkProfile?.producer_name || "Your Insurance Agent";
    const firmName = clarkProfile?.firm_name || "AURA";
    const origin = req.headers.get("origin") || "https://aura-risk-group.lovable.app";

    const sendEmail = async (payload: { from: string; to: string[]; subject: string; html: string }) => {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Resend error:", errText);
        throw new Error("Failed to send email via Resend");
      }
      return resp.json();
    };

    if (action === "send_questionnaire") {
      if (!client_email) throw new Error("client_email is required");

      const questionnaireUrl = `${origin}/clark/questionnaire/${submission.questionnaire_token}`;
      const missingFields = (submission.missing_fields as string[]) || [];

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Complete Your Insurance Application</h2>
          <p>Hi ${client_name || "there"},</p>
          <p>${agentName} from <strong>${firmName}</strong> needs a few more details to finalize your insurance application.</p>
          <p>We're missing the following information:</p>
          <ul>
            ${missingFields.slice(0, 10).map(f => `<li>${f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</li>`).join("")}
            ${missingFields.length > 10 ? `<li>...and ${missingFields.length - 10} more</li>` : ""}
          </ul>
          <p style="margin: 25px 0;">
            <a href="${questionnaireUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Questionnaire
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">This link is unique to your submission. If you have questions, reply to this email or contact ${agentName}.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">${firmName} — Powered by Clark AI</p>
        </div>
      `;

      await sendEmail({
        from: `${firmName} <onboarding@resend.dev>`,
        to: [client_email],
        subject: `Action Required: Complete Your Insurance Application — ${firmName}`,
        html,
      });

      await supabase
        .from("clark_submissions")
        .update({ status: "questionnaire_sent" })
        .eq("id", submission_id);

      return new Response(JSON.stringify({ success: true, message: "Questionnaire sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "notify_agent_complete") {
      const agentEmail = clarkProfile?.contact_email || user.email;
      if (!agentEmail) throw new Error("No agent email found");

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Client Questionnaire Completed ✅</h2>
          <p>Hi ${agentName},</p>
          <p>Your client <strong>${submission.client_name || "N/A"}</strong> (${submission.business_name || "N/A"}) has completed their questionnaire.</p>
          <p>All missing fields have been filled. You can now finalize the submission and generate ACORD forms.</p>
          <p style="margin: 25px 0;">
            <a href="${origin}/clark" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Open Clark
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">${firmName} — Powered by Clark AI</p>
        </div>
      `;

      await sendEmail({
        from: `Clark AI <onboarding@resend.dev>`,
        to: [agentEmail],
        subject: `✅ Questionnaire Complete — ${submission.business_name || submission.client_name || "Submission"}`,
        html,
      });

      return new Response(JSON.stringify({ success: true, message: "Agent notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("clark-notify error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
