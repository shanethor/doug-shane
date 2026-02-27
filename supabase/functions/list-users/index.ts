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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    // Verify JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");

    const userId = claimsData.claims.sub as string;

    // Check admin role
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if (!roleData || roleData.length === 0) throw new Error("Not authorized");

    // Use service role to list auth users
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;

    // Get profiles
    const { data: profiles } = await adminClient.from("profiles").select("*");
    const { data: roles } = await adminClient.from("user_roles").select("*");
    const { data: submissions } = await adminClient
      .from("business_submissions")
      .select("user_id");

    // Build submission counts
    const subCounts: Record<string, number> = {};
    (submissions ?? []).forEach((s: any) => {
      subCounts[s.user_id] = (subCounts[s.user_id] || 0) + 1;
    });

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    const result = users.map((u: any) => {
      const profile = profileMap.get(u.id) as any;
      return {
        id: u.id,
        email: u.email,
        full_name: profile?.full_name || u.user_metadata?.full_name || null,
        agency_name: profile?.agency_name || null,
        phone: profile?.phone || null,
        roles: roleMap.get(u.id) || ["user"],
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed: !!u.email_confirmed_at,
        submission_count: subCounts[u.id] || 0,
      };
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
