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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { requestId, signedPdfBase64 } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch request
    const { data: request, error: reqErr } = await supabaseAdmin
      .from("loss_run_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch policies
    const { data: policies } = await supabaseAdmin
      .from("loss_run_policy_items")
      .select("*")
      .eq("loss_run_request_id", requestId);

    if (!policies || policies.length === 0) {
      return new Response(JSON.stringify({ error: "No policies found for this request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build letter body
    const r = request as any;
    const namedInsured = r.named_insured || "Insured";
    const yearsRequested = r.years_requested || 5;

    const letterBody = `
Loss Run Request

Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

RE: Loss Run Request
Named Insured: ${namedInsured}

To Whom It May Concern,

On behalf of ${namedInsured}, I hereby request a copy of the entire History / a current Loss Run for the policies listed below, and any for other policies that pertain to ${namedInsured} for the past ${yearsRequested} years.

${policies.map((p: any) => `Carrier: ${p.carrier_name} | Policy: ${p.policy_number} | ${p.effective_start || ''} to ${p.effective_end || ''}`).join("\n")}

Please send the requested information by e-mail to ${r.signer_email || ''}${r.producer_email ? ` and ${r.producer_email}` : ''}${r.producer_fax ? ` or by fax at ${r.producer_fax}` : ''}.

Thank you,
${r.signer_name || ''}
${r.signer_title || ''}
    `.trim();

    // Send email to each carrier
    const results: { carrier: string; success: boolean; error?: string }[] = [];

    for (const policy of policies) {
      const carrierEmail = (policy as any).request_email;
      if (!carrierEmail) {
        results.push({ carrier: (policy as any).carrier_name, success: false, error: "No email" });
        continue;
      }

      const emailPayload: any = {
        from: "AURA <noreply@buildingaura.site>",
        to: [carrierEmail],
        subject: `Loss Run Request — ${namedInsured} — Policy ${(policy as any).policy_number || ""}`,
        text: letterBody,
      };

      // Attach signed PDF if available
      if (signedPdfBase64) {
        emailPayload.attachments = [
          {
            filename: `Loss_Run_Request_${namedInsured.replace(/\s+/g, "_")}.pdf`,
            content: signedPdfBase64,
          },
        ];
      }

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (resp.ok) {
          results.push({ carrier: (policy as any).carrier_name, success: true });
        } else {
          const err = await resp.text();
          results.push({ carrier: (policy as any).carrier_name, success: false, error: err });
        }
      } catch (e) {
        results.push({ carrier: (policy as any).carrier_name, success: false, error: String(e) });
      }
    }

    // Update request status
    await supabaseAdmin
      .from("loss_run_requests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", requestId);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-loss-run error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
