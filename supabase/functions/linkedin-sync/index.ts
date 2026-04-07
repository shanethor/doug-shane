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
    // Auth
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

    const PROXYCURL_KEY = Deno.env.get("PROXYCURL_API_KEY");
    if (!PROXYCURL_KEY) {
      return new Response(JSON.stringify({ error: "Proxycurl API key not configured" }), { status: 500, headers: corsHeaders });
    }

    // Admin client for upserts
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Step 1: Fetch profile ──
    console.log(`[linkedin-sync] Fetching profile for ${linkedin_url}`);
    const profileResp = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedin_url)}&use_cache=if-recent`,
      { headers: { Authorization: `Bearer ${PROXYCURL_KEY}` } }
    );

    let profileData: any = {};
    if (profileResp.ok) {
      profileData = await profileResp.json();
    } else {
      console.warn(`[linkedin-sync] Profile fetch failed: ${profileResp.status}`);
      const errText = await profileResp.text();
      console.warn(errText);
    }

    // Extract name from profile or URL
    let profileName = profileData.full_name || "";
    if (!profileName) {
      const match = linkedin_url.match(/in\/([^/]+)/);
      if (match?.[1]) {
        profileName = match[1].replace(/-[0-9a-zA-Z]+$/, "").replace(/-/g, " ")
          .split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    }

    // Upsert social_profiles
    await adminClient.from("social_profiles").upsert({
      user_id: userId,
      linkedin_url,
      profile_name: profileName,
      headline: profileData.headline || null,
      follower_count: profileData.follower_count || 0,
      connection_count: profileData.connections || null,
      profile_photo_url: profileData.profile_pic_url || null,
      last_synced_at: new Date().toISOString(),
      sync_source: "proxycurl",
    }, { onConflict: "user_id" });

    // ── Step 2: Fetch recent posts (public) ──
    console.log(`[linkedin-sync] Fetching posts...`);
    const postsResp = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin/profile/post?linkedin_profile_url=${encodeURIComponent(linkedin_url)}&use_cache=if-recent`,
      { headers: { Authorization: `Bearer ${PROXYCURL_KEY}` } }
    );

    const posts: any[] = [];
    if (postsResp.ok) {
      const postsData = await postsResp.json();
      const rawPosts = postsData.posts || postsData || [];
      
      for (const p of (Array.isArray(rawPosts) ? rawPosts : [])) {
        const postId = p.post_url || p.url || `${userId}_${p.posted_date?.value || Date.now()}`;
        
        // Determine format
        let format = "text";
        if (p.images?.length) format = "image";
        if (p.videos?.length) format = "video";
        if (p.document) format = "carousel";

        const postRow = {
          user_id: userId,
          linkedin_url,
          post_url: p.post_url || p.url || null,
          post_text: p.text || p.title || null,
          post_format: format,
          posted_at: p.posted_date?.value ? new Date(p.posted_date.value).toISOString() : null,
          likes: p.num_likes || 0,
          comments: p.num_comments || 0,
          reposts: p.num_reposts || p.num_shares || 0,
          views: null, // Not available from public API
          impressions: null,
          source: "proxycurl",
          external_post_id: postId,
        };
        posts.push(postRow);
      }
    } else {
      console.warn(`[linkedin-sync] Posts fetch failed: ${postsResp.status}`);
      await postsResp.text();
    }

    // Batch upsert posts
    if (posts.length > 0) {
      const { error: postErr } = await adminClient
        .from("social_posts")
        .upsert(posts, { onConflict: "user_id,external_post_id" });
      if (postErr) console.error("[linkedin-sync] Post upsert error:", postErr);
    }

    console.log(`[linkedin-sync] Synced profile + ${posts.length} posts for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      profile_name: profileName,
      posts_synced: posts.length,
      follower_count: profileData.follower_count || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[linkedin-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
