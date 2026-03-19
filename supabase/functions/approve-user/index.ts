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

    const body = await req.json();
    const { target_user_id, action, role, email, password, full_name, branch } = body;
    if (!action) throw new Error("Missing action");

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

    if (action === "create_user") {
      if (!email || !password) throw new Error("Missing email or password");
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });
      if (createError) throw createError;
      const newUserId = newUser.user.id;

      await adminClient.from("profiles").insert({
        user_id: newUserId,
        full_name: full_name || null,
        approval_status: "approved",
      });

      if (role) {
        await adminClient.from("user_roles").insert({ user_id: newUserId, role });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target_user_id) throw new Error("Missing target_user_id");

    if (action === "approve") {
      if (!role) throw new Error("Missing role for approval");

      // Update approval status and branch
      const profileUpdate: Record<string, any> = { approval_status: "approved" };
      if (branch) profileUpdate.branch = branch;
      await adminClient
        .from("profiles")
        .update(profileUpdate)
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
            role === "advisor" ? "Advisor" :
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

    if (action === "delete_user") {
      // Delete related data first
      await adminClient.from("user_roles").delete().eq("user_id", target_user_id);
      await adminClient.from("profiles").delete().eq("user_id", target_user_id);
      await adminClient.from("audit_log").delete().eq("user_id", target_user_id);
      await adminClient.from("trusted_devices").delete().eq("user_id", target_user_id);
      await adminClient.from("two_factor_codes").delete().eq("user_id", target_user_id);
      // Delete the auth user
      const { error: delError } = await adminClient.auth.admin.deleteUser(target_user_id);
      if (delError) throw delError;

      await adminClient.from("audit_log").insert({
        user_id: callerId,
        action: "delete_user",
        object_type: "user",
        object_id: target_user_id,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_agency") {
      const { agency_id } = body;
      const updateData: Record<string, any> = { agency_id: agency_id || null };
      const { error: upErr } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("user_id", target_user_id);
      if (upErr) throw upErr;

      await adminClient.from("audit_log").insert({
        user_id: callerId,
        action: "set_agency",
        object_type: "user",
        object_id: target_user_id,
        metadata: { agency_id },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_agency") {
      // target_user_id is actually agency_id here
      const agencyId = target_user_id;
      // Unassign users from this agency
      await adminClient.from("profiles").update({ agency_id: null }).eq("agency_id", agencyId);
      // Delete the agency
      const { error: delError } = await adminClient.from("agencies").delete().eq("id", agencyId);
      if (delError) throw delError;

      await adminClient.from("audit_log").insert({
        user_id: callerId,
        action: "delete_agency",
        object_type: "agency",
        object_id: agencyId,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_branch") {
      const validBranches = ["risk", "property", "wealth"];
      if (!branch || !validBranches.includes(branch)) throw new Error("Invalid branch");
      
      await adminClient
        .from("profiles")
        .update({ branch })
        .eq("user_id", target_user_id);

      await adminClient.from("audit_log").insert({
        user_id: callerId,
        action: "set_branch",
        object_type: "user",
        object_id: target_user_id,
        metadata: { branch },
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
