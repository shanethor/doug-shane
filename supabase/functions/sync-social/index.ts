import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Save user's own profile URLs ───
    if (action === "save_my_profiles") {
      const { profiles } = body; // [{ platform: "instagram", url: "..." }, ...]
      if (!Array.isArray(profiles) || profiles.length === 0) {
        return new Response(JSON.stringify({ error: "No profiles provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validProfiles = profiles.filter((p: any) => p.url?.trim() && p.platform);
      const results: any[] = [];

      for (const profile of validProfiles) {
        const source = `social_${profile.platform}`;
        // Store the profile URL in network_connections metadata
        await adminClient
          .from("network_connections")
          .upsert({
            user_id: userId,
            source,
            status: "connected",
            last_sync_at: new Date().toISOString(),
            contact_count: 0,
            updated_at: new Date().toISOString(),
            metadata: {
              my_profile_url: profile.url.trim(),
              platform: profile.platform,
              saved_at: new Date().toISOString(),
            },
          }, { onConflict: "user_id,source" });

        results.push({ platform: profile.platform, url: profile.url.trim() });
      }

      // Now attempt initial scrape of all saved profiles
      const scrapeResults = await scrapeProfiles(adminClient, userId, validProfiles);

      return new Response(JSON.stringify({
        success: true,
        saved: results.length,
        scrape_results: scrapeResults,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Rescrape all saved profile URLs ───
    if (action === "rescrape_my_profiles") {
      // Fetch all social connections for this user that have my_profile_url
      const { data: connections } = await adminClient
        .from("network_connections")
        .select("source, metadata")
        .eq("user_id", userId)
        .like("source", "social_%");

      const profiles = (connections || [])
        .filter((c: any) => c.metadata?.my_profile_url)
        .map((c: any) => ({
          platform: c.metadata.platform || c.source.replace("social_", ""),
          url: c.metadata.my_profile_url,
        }));

      if (profiles.length === 0) {
        return new Response(JSON.stringify({ error: "No saved profile URLs to rescrape. Add your profiles first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scrapeResults = await scrapeProfiles(adminClient, userId, profiles);

      return new Response(JSON.stringify({
        success: true,
        rescraped: profiles.length,
        results: scrapeResults,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get saved profile URLs ───
    if (action === "get_my_profiles") {
      const { data: connections } = await adminClient
        .from("network_connections")
        .select("source, metadata, last_sync_at, contact_count")
        .eq("user_id", userId)
        .like("source", "social_%");

      const profiles = (connections || [])
        .filter((c: any) => c.metadata?.my_profile_url)
        .map((c: any) => ({
          platform: c.metadata.platform || c.source.replace("social_", ""),
          url: c.metadata.my_profile_url,
          last_sync: c.last_sync_at,
          contact_count: c.contact_count,
        }));

      return new Response(JSON.stringify({ profiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Scrape a social profile URL (single) ───
    if (action === "scrape_profile") {
      const { url, platform } = body;
      if (!url?.trim()) {
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = await scrapeProfiles(adminClient, userId, [{ url: url.trim(), platform: platform || detectPlatform(url) }]);
      const result = results[0];

      if (result?.error) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        imported: result?.imported || 0,
        platform: result?.platform || platform,
        contacts: result?.contacts || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Bulk import social handles ───
    if (action === "import_social_handles") {
      const { handles } = body;
      if (!Array.isArray(handles) || handles.length === 0) {
        return new Response(JSON.stringify({ error: "No handles provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contacts = handles.slice(0, 500).map((h: any, idx: number) => {
        const platform = h.platform || detectPlatform(h.url || h.handle || "");
        return {
          user_id: userId,
          source: `social_${platform}`,
          external_id: `${platform}-${h.url || h.handle || idx}`,
          full_name: h.name || h.handle || null,
          email: null,
          phone: null,
          company: h.company || null,
          title: null,
          linkedin_url: null,
          location: null,
          metadata: {
            platform,
            handle: h.handle,
            profile_url: h.url,
            scraped_at: new Date().toISOString(),
          },
        };
      }).filter((c: any) => c.full_name);

      if (contacts.length > 0) {
        const { error: upsertErr } = await adminClient
          .from("network_contacts")
          .upsert(contacts, { onConflict: "user_id,source,external_id" });
        if (upsertErr) console.error("Social handles upsert error:", upsertErr);
      }

      const platforms = new Set(contacts.map((c: any) => c.source));
      for (const src of platforms) {
        const count = contacts.filter((c: any) => c.source === src).length;
        await adminClient
          .from("network_connections")
          .upsert({
            user_id: userId,
            source: src,
            status: "connected",
            last_sync_at: new Date().toISOString(),
            contact_count: count,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,source" });
      }

      return new Response(JSON.stringify({ success: true, imported: contacts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-social error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Scrape multiple profiles via Firecrawl + AI extraction ───
async function scrapeProfiles(
  adminClient: any,
  userId: string,
  profiles: { url: string; platform: string }[]
): Promise<any[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
    return profiles.map((p) => ({
      platform: p.platform,
      error: "Scraping or AI service not configured",
      imported: 0,
    }));
  }

  const results: any[] = [];

  for (const profile of profiles) {
    try {
      console.log(`Scraping profile: ${profile.url} (${profile.platform})`);

      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: profile.url.trim(),
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (!scrapeResp.ok) {
        const errData = await scrapeResp.json().catch(() => ({}));
        console.error(`Firecrawl error for ${profile.url}:`, scrapeResp.status, JSON.stringify(errData));
        results.push({
          platform: profile.platform,
          url: profile.url,
          error: `Scrape failed (${scrapeResp.status}). Platform may block automated access.`,
          imported: 0,
        });
        // Still mark as connected with the saved URL
        await adminClient
          .from("network_connections")
          .upsert({
            user_id: userId,
            source: `social_${profile.platform}`,
            status: "connected",
            updated_at: new Date().toISOString(),
            metadata: {
              my_profile_url: profile.url.trim(),
              platform: profile.platform,
              last_scrape_error: `Failed (${scrapeResp.status})`,
              last_scrape_attempt: new Date().toISOString(),
            },
          }, { onConflict: "user_id,source" });
        continue;
      }

      const scrapeData = await scrapeResp.json();
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

      // Use AI to extract contacts
      const extractPrompt = `Extract contact/follower information from this scraped ${profile.platform} profile page.
This is the user's OWN profile — extract any visible contacts, followers, following, tagged people, mentioned businesses, or linked accounts.

Return ONLY valid JSON:
{
  "profile_info": {
    "display_name": "string or null",
    "bio": "string or null",
    "followers_count": "number or null",
    "following_count": "number or null",
    "posts_count": "number or null",
    "website": "string or null",
    "location": "string or null"
  },
  "contacts": [
    {
      "full_name": "string or null",
      "company": "string or null",
      "title": "string or null",
      "email": "string or null",
      "phone": "string or null",
      "location": "string or null",
      "bio": "short bio or null",
      "profile_url": "their profile URL or null",
      "relationship": "follower|following|tagged|mentioned|linked"
    }
  ],
  "platform": "${profile.platform}",
  "scrape_quality": "full|partial|minimal"
}

If the platform blocked most content, still extract whatever is visible. Return empty contacts array if none found.

Profile content:
${markdown.slice(0, 10000)}`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You extract structured contact data from scraped web pages. Return only valid JSON." },
            { role: "user", content: extractPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (!aiRes.ok) {
        console.error("AI extraction error:", aiRes.status);
        results.push({ platform: profile.platform, url: profile.url, error: "AI extraction failed", imported: 0 });
        continue;
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content;
      let extracted;
      try {
        extracted = JSON.parse(content);
      } catch {
        results.push({ platform: profile.platform, url: profile.url, error: "Failed to parse AI output", imported: 0 });
        continue;
      }

      const contacts = (extracted.contacts || []).filter((c: any) => c.full_name || c.email);
      const profileInfo = extracted.profile_info || {};

      if (contacts.length > 0) {
        const records = contacts.map((c: any, idx: number) => ({
          user_id: userId,
          source: `social_${profile.platform}`,
          external_id: `${profile.platform}-${c.profile_url || profile.url}-${idx}`,
          full_name: c.full_name || null,
          email: c.email || null,
          phone: c.phone || null,
          company: c.company || null,
          title: c.title || null,
          linkedin_url: null,
          location: c.location || null,
          metadata: {
            platform: profile.platform,
            bio: c.bio,
            profile_url: c.profile_url,
            relationship: c.relationship,
            scraped_at: new Date().toISOString(),
          },
        }));

        const { error: upsertErr } = await adminClient
          .from("network_contacts")
          .upsert(records, { onConflict: "user_id,source,external_id" });
        if (upsertErr) console.error("Social contacts upsert error:", upsertErr);
      }

      // Update network connection with profile info and scrape results
      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: `social_${profile.platform}`,
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
          metadata: {
            my_profile_url: profile.url.trim(),
            platform: profile.platform,
            profile_info: profileInfo,
            scrape_quality: extracted.scrape_quality || "unknown",
            last_scrape_attempt: new Date().toISOString(),
            last_scrape_error: null,
          },
        }, { onConflict: "user_id,source" });

      results.push({
        platform: profile.platform,
        url: profile.url,
        imported: contacts.length,
        profile_info: profileInfo,
        scrape_quality: extracted.scrape_quality,
        contacts: contacts.map((c: any) => ({
          name: c.full_name,
          company: c.company,
          relationship: c.relationship,
        })),
      });
    } catch (err: any) {
      console.error(`Error scraping ${profile.url}:`, err);
      results.push({ platform: profile.platform, url: profile.url, error: err.message, imported: 0 });
    }
  }

  return results;
}

function detectPlatform(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("instagram") || lower.includes("instagr.am")) return "instagram";
  if (lower.includes("facebook") || lower.includes("fb.com")) return "facebook";
  if (lower.includes("twitter") || lower.includes("x.com")) return "x";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("tiktok")) return "tiktok";
  return "social";
}
