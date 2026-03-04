import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, email, code, device_hash } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── SEND CODE ───
    if (action === "send_code") {
      if (!user_id || !email) {
        return new Response(JSON.stringify({ error: "Missing user_id or email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if device is trusted (7-day remember)
      if (device_hash) {
        const { data: trusted } = await supabaseAdmin
          .from("trusted_devices")
          .select("id")
          .eq("user_id", user_id)
          .eq("device_hash", device_hash)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (trusted) {
          return new Response(JSON.stringify({ trusted: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Delete old codes for this user
      await supabaseAdmin
        .from("two_factor_codes")
        .delete()
        .eq("user_id", user_id);

      // Insert new code
      await supabaseAdmin.from("two_factor_codes").insert({
        user_id,
        code: verificationCode,
        expires_at: expiresAt,
      });

      // Send email via existing send-email function
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "Email not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AURA <noreply@buildingaura.site>",
          to: [email],
          subject: `Your AURA verification code: ${verificationCode}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
              <h2 style="color:#142D5A;margin-bottom:8px;">AURA Risk Group</h2>
              <p style="color:#555;font-size:14px;margin-bottom:24px;">Here is your verification code:</p>
              <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#142D5A;">${verificationCode}</span>
              </div>
              <p style="color:#888;font-size:12px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!emailResp.ok) {
        console.error("Failed to send 2FA email:", await emailResp.text());
        return new Response(JSON.stringify({ error: "Failed to send verification email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VERIFY CODE ───
    if (action === "verify_code") {
      if (!user_id || !code) {
        return new Response(JSON.stringify({ error: "Missing user_id or code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: record } = await supabaseAdmin
        .from("two_factor_codes")
        .select("*")
        .eq("user_id", user_id)
        .eq("code", code)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!record) {
        return new Response(JSON.stringify({ verified: false, error: "Invalid or expired code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabaseAdmin
        .from("two_factor_codes")
        .update({ verified: true })
        .eq("id", record.id);

      // If remember device, save trusted device
      if (device_hash) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        // Delete any existing entry for this user+device combo first to avoid duplicates
        await supabaseAdmin
          .from("trusted_devices")
          .delete()
          .eq("user_id", user_id)
          .eq("device_hash", device_hash);
        await supabaseAdmin.from("trusted_devices").insert({
          user_id,
          device_hash,
          expires_at: expiresAt,
        });
      }

      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("2FA error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
