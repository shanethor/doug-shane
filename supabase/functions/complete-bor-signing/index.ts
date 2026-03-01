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
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get BOR record
    const { data: bor, error: borError } = await supabase
      .from("bor_signatures")
      .select("*")
      .eq("token", token)
      .single();

    if (borError || !bor) {
      return new Response(JSON.stringify({ error: "BOR record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update lead stage to "presenting" if lead_id exists
    if (bor.lead_id) {
      await supabase
        .from("leads")
        .update({ stage: "presenting", updated_at: new Date().toISOString() })
        .eq("id", bor.lead_id);

      // Create client_document record for the signed BOR
      await supabase.from("client_documents").insert({
        lead_id: bor.lead_id,
        user_id: bor.agent_id,
        file_name: `BOR_${bor.insured_name.replace(/\s+/g, "_")}_Signed.pdf`,
        file_url: bor.signed_pdf_url || "",
        document_type: "bor_signed",
        file_size: bor.signed_pdf_url ? Math.round(bor.signed_pdf_url.length * 0.75) : 0,
      });
    }

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: bor.agent_id,
      action: "bor_signed",
      object_type: "bor_signature",
      object_id: bor.id,
      metadata: {
        insured_name: bor.insured_name,
        carrier: bor.carrier_name,
        lines: bor.selected_lines,
        signed_at: bor.signed_at,
      },
    });

    // If carrier email is provided, send the signed BOR via email
    if (bor.carrier_email) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AURA <noreply@buildingaura.site>",
              to: [bor.carrier_email],
              subject: `Broker of Record Letter – ${bor.insured_name}`,
              html: `<p>Please find the attached Broker of Record letter for <strong>${bor.insured_name}</strong>.</p><p>This letter authorizes AURA Risk Group as the Broker of Record for the referenced policy.</p><p>If you have any questions, please contact us.</p>`,
            }),
          });
        }
      } catch {
        // Email failure shouldn't block completion
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
