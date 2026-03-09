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

    // Verify caller is authenticated
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (typeof payload?.sub === "string") userId = payload.sub;
    } catch { /* fallback */ }

    if (!userId) {
      const { data } = await anonClient.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }
    if (!userId) throw new Error("Not authenticated");

    // Check caller has a qualifying role (admin, producer, manager)
    const { data: callerRoles } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    const allowed = roles.some((r: string) => ["admin", "producer", "manager"].includes(r));
    if (!allowed) throw new Error("Not authorized");

    // Use service role to get full directory
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const currentYear = new Date().getFullYear();

    const [usersRes, profilesRes, rolesRes, agenciesRes, goalsRes] = await Promise.all([
      adminClient.auth.admin.listUsers({ perPage: 200 }),
      adminClient.from("profiles").select("user_id, full_name, agency_name, agency_id"),
      adminClient.from("user_roles").select("user_id, role"),
      adminClient.from("agencies").select("id, name"),
      adminClient.from("producer_goals").select("user_id, annual_premium_goal, annual_revenue_goal, year").eq("year", currentYear),
    ]);

    if (usersRes.error) throw usersRes.error;

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
    const agencyMap = new Map((agenciesRes.data ?? []).map((a: any) => [a.id, a.name]));
    const goalMap = new Map((goalsRes.data ?? []).map((g: any) => [g.user_id, g]));
    const roleMap = new Map<string, string[]>();
    (rolesRes.data ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    // Return only producers + admins (people who appear on the scoreboard)
    const result = usersRes.data.users
      .filter((u: any) => {
        const r = roleMap.get(u.id) || [];
        return r.includes("producer") || r.includes("admin");
      })
      .map((u: any) => {
        const profile = profileMap.get(u.id) as any;
        const userRoles = roleMap.get(u.id) || [];
        const agency = profile?.agency_id ? agencyMap.get(profile.agency_id) : null;
        const goal = goalMap.get(u.id) as any;

        return {
          id: u.id,
          full_name: profile?.full_name || u.user_metadata?.full_name || null,
          agency_name: agency || profile?.agency_name || null,
          agency_id: profile?.agency_id || null,
          roles: userRoles,
          annual_premium_goal: Number(goal?.annual_premium_goal) || 0,
          annual_revenue_goal: Number(goal?.annual_revenue_goal) || 0,
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
