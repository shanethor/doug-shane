import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ROLES = ["admin", "advisor", "manager", "client_services"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");

    const { target_user_id, new_role } = await req.json();
    if (!target_user_id || !new_role) throw new Error("Missing target_user_id or new_role");
    if (!VALID_ROLES.includes(new_role)) throw new Error("Invalid role: " + new_role);

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

    // Prevent removing your own admin role
    if (callerId === target_user_id && new_role !== "admin") {
      throw new Error("Cannot remove your own admin role");
    }

    // Use service role client
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete existing roles for the target user
    await adminClient.from("user_roles").delete().eq("user_id", target_user_id);

    // Insert new role
    const { error } = await adminClient.from("user_roles").insert({
      user_id: target_user_id,
      role: new_role,
    });
    if (error) throw error;

    // Audit log
    await adminClient.from("audit_log").insert({
      user_id: callerId,
      action: "change_role",
      object_type: "user",
      object_id: target_user_id,
      metadata: { new_role },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
