import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");

    const { target_user_id, action, role } = await req.json();
    if (!target_user_id || !action) throw new Error("Missing target_user_id or action");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    // Resolve caller
    const token = authHeader.replace("Bearer ", "");
    let callerId: string | null = null;
    try {
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64));
        if (typeof payload?.sub === "string" && payload.sub.length > 0) {
          callerId = payload.sub;
        }
      }
    } catch {}

    if (!callerId) {
      const { data: userData } = await anonClient.auth.getUser(token);
      callerId = userData?.user?.id || null;
    }
    if (!callerId) throw new Error("Not authenticated");

    // Check caller is admin
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin");
    if (!roleData || roleData.length === 0) throw new Error("Not authorized");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "approve") {
      if (!role) throw new Error("Missing role for approval");

      // Update approval status
      await adminClient
        .from("profiles")
        .update({ approval_status: "approved" })
        .eq("user_id", target_user_id);

      // Set role
      await adminClient.from("user_roles").delete().eq("user_id", target_user_id);
      await adminClient.from("user_roles").insert({
        user_id: target_user_id,
        role: role,
      });

      // Get user email for notification
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const targetUser = users?.find((u: any) => u.id === target_user_id);

      if (targetUser?.email) {
        // Send approval notification email via Resend
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const roleLabel = role === "admin" ? "Administrator" :
            role === "producer" ? "Producer" :
            role === "manager" ? "Manager" :
            role === "client_services" ? "Client Services" : role;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "AURA <noreply@buildingaura.site>",
              to: [targetUser.email],
              subject: "Your AURA Account Has Been Approved",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                  <h1 style="color: #111; font-size: 24px; margin-bottom: 16px;">Welcome to AURA</h1>
                  <p style="color: #555; font-size: 14px; line-height: 1.6;">
                    Great news! Your AURA account has been approved. You've been assigned the <strong>${roleLabel}</strong> role.
                  </p>
                  <p style="color: #555; font-size: 14px; line-height: 1.6;">
                    You can now sign in and start using the platform.
                  </p>
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://doug-shane.lovable.app'}/auth"
                     style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">
                    Sign In to AURA
                  </a>
                  <p style="color: #999; font-size: 11px; margin-top: 30px;">
                    © 2026 AURA Risk Group
                  </p>
                </div>
              `,
            }),
          });
        }
      }

      // Audit log
      await adminClient.from("audit_log").insert({
        user_id: callerId,
        action: "approve_user",
        object_type: "user",
        object_id: target_user_id,
        metadata: { role },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      await adminClient
        .from("profiles")
        .update({ approval_status: "rejected" })
        .eq("user_id", target_user_id);

      await adminClient.from("audit_log").insert({
        user_id: callerId,
        action: "reject_user",
        object_type: "user",
        object_id: target_user_id,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action: " + action);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
