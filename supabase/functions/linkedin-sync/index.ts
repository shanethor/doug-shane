import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { linkedin_url } = await req.json();
    if (!linkedin_url || !linkedin_url.includes("linkedin.com/in/")) {
      return new Response(JSON.stringify({ error: "Invalid LinkedIn URL" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Extract name from URL slug
    let profileName = "";
    const match = linkedin_url.match(/in\/([^/?]+)/);
    if (match?.[1]) {
      profileName = match[1].replace(/-[0-9a-zA-Z]+$/, "").replace(/-/g, " ")
        .split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }

    // Upsert social_profiles — extension will enrich with real data later
    await adminClient.from("social_profiles").upsert({
      user_id: userId,
      linkedin_url,
      profile_name: profileName,
      headline: null,
      follower_count: 0,
      connection_count: null,
      profile_photo_url: null,
      last_synced_at: new Date().toISOString(),
      sync_source: "manual",
    }, { onConflict: "user_id" });

    console.log(`[linkedin-sync] Registered profile for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      profile_name: profileName,
      posts_synced: 0,
      follower_count: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[linkedin-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
