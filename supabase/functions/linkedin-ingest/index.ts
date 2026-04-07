import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * linkedin-ingest — receives private analytics data from the Chrome extension.
 * The extension sends the user's JWT + post data including views/impressions/demographics.
 */
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

    const body = await req.json();
    const { posts, profile, demographics } = body;

    if (!Array.isArray(posts)) {
      return new Response(JSON.stringify({ error: "posts must be an array" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Update profile with extension flag
    if (profile) {
      await adminClient.from("social_profiles").upsert({
        user_id: userId,
        linkedin_url: profile.linkedin_url || "",
        profile_name: profile.name || null,
        headline: profile.headline || null,
        follower_count: profile.follower_count || 0,
        connection_count: profile.connection_count || null,
        profile_photo_url: profile.photo_url || null,
        last_synced_at: new Date().toISOString(),
        sync_source: "extension",
        extension_installed: true,
      }, { onConflict: "user_id" });
    } else {
      // Just mark extension as installed
      await adminClient.from("social_profiles")
        .update({ extension_installed: true, last_synced_at: new Date().toISOString(), sync_source: "extension" })
        .eq("user_id", userId);
    }

    // Upsert posts with private metrics
    const postRows = posts.map((p: any) => ({
      user_id: userId,
      linkedin_url: p.linkedin_url || profile?.linkedin_url || "",
      post_url: p.post_url || null,
      post_text: p.text || null,
      post_format: p.format || "text",
      posted_at: p.posted_at || null,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      reposts: p.reposts ?? 0,
      views: p.views ?? null,
      impressions: p.impressions ?? null,
      engagement_rate: p.engagement_rate ?? null,
      audience_demographics: demographics || p.demographics || null,
      source: "extension",
      external_post_id: p.external_post_id || p.post_url || `ext_${userId}_${Date.now()}_${Math.random()}`,
    }));

    if (postRows.length > 0) {
      const { error: postErr } = await adminClient
        .from("social_posts")
        .upsert(postRows, { onConflict: "user_id,external_post_id" });
      if (postErr) {
        console.error("[linkedin-ingest] Post upsert error:", postErr);
        return new Response(JSON.stringify({ error: "Failed to save posts" }), { status: 500, headers: corsHeaders });
      }
    }

    console.log(`[linkedin-ingest] Ingested ${postRows.length} posts with private metrics for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      posts_ingested: postRows.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[linkedin-ingest] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
