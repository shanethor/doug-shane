import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILED_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Authenticate the caller ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = claimsData.claims.sub as string;

    const { action, user_id, code, device_hash } = await req.json();

    // Ensure the caller can only act on their own account
    if (user_id && user_id !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = authenticatedUserId;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── SEND CODE ───
    if (action === "send_code") {
      // Fetch the user's real email from auth – never trust caller-supplied email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(effectiveUserId);
      if (userError || !userData?.user?.email) {
        return new Response(JSON.stringify({ error: "Could not resolve user email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userEmail = userData.user.email;

      // Check if device is trusted (7-day remember)
      if (device_hash) {
        const { data: trusted } = await supabaseAdmin
          .from("trusted_devices")
          .select("id")
          .eq("user_id", effectiveUserId)
          .eq("device_hash", device_hash)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (trusted) {
          return new Response(JSON.stringify({ trusted: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Check if a valid unexpired code already exists (prevent race condition overwrites)
      const { data: existingCode } = await supabaseAdmin
        .from("two_factor_codes")
        .select("id, code, expires_at")
        .eq("user_id", effectiveUserId)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (existingCode) {
        // Re-send the same code to the user's verified email
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AURA <noreply@buildingaura.site>",
              to: [userEmail],
              subject: "Your AURA verification code",
              html: buildOtpEmailHtml(existingCode.code),
            }),
          });
        }
        return new Response(JSON.stringify({ sent: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Delete old codes for this user
      await supabaseAdmin
        .from("two_factor_codes")
        .delete()
        .eq("user_id", effectiveUserId);

      // Insert new code
      const { error: insertErr } = await supabaseAdmin.from("two_factor_codes").insert({
        user_id: effectiveUserId,
        code: verificationCode,
        expires_at: expiresAt,
      });
      if (insertErr) {
        console.error("Failed to insert 2FA code:", insertErr);
      }

      // Send email via Resend to the user's verified email
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
          to: [userEmail],
          subject: "Your AURA verification code",
          html: buildOtpEmailHtml(verificationCode),
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
      if (!code) {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for active (non-expired, non-verified) code
      const { data: activeCode } = await supabaseAdmin
        .from("two_factor_codes")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!activeCode) {
        return new Response(JSON.stringify({ verified: false, error: "No active code. Please request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: check failed attempts
      const { count } = await supabaseAdmin
        .from("two_factor_codes")
        .select("*", { count: "exact", head: true })
        .eq("id", activeCode.id)
        .gte("failed_attempts", MAX_FAILED_ATTEMPTS);

      if (count && count > 0) {
        // Too many attempts – expire the code
        await supabaseAdmin
          .from("two_factor_codes")
          .delete()
          .eq("id", activeCode.id);

        return new Response(JSON.stringify({ verified: false, error: "Too many attempts. Please request a new code." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (activeCode.code !== code) {
        // Increment failed attempts
        await supabaseAdmin.rpc("increment_2fa_failed_attempts", { row_id: activeCode.id });

        return new Response(JSON.stringify({ verified: false, error: "Invalid or expired code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabaseAdmin
        .from("two_factor_codes")
        .update({ verified: true })
        .eq("id", activeCode.id);

      // If remember device, save trusted device
      if (device_hash) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("trusted_devices")
          .delete()
          .eq("user_id", effectiveUserId)
          .eq("device_hash", device_hash);
        await supabaseAdmin.from("trusted_devices").insert({
          user_id: effectiveUserId,
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

function buildOtpEmailHtml(otpCode: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
      <h2 style="color:#142D5A;margin-bottom:8px;">AURA Risk Group</h2>
      <p style="color:#555;font-size:14px;margin-bottom:24px;">Here is your verification code:</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#142D5A;">${otpCode}</span>
      </div>
      <p style="color:#888;font-size:12px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}
