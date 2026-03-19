import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
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

    // ─── Scrape a social profile URL ───
    if (action === "scrape_profile") {
      const { url, platform } = body;
      if (!url?.trim()) {
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ error: "Scraping service not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Scraping social profile: ${url} (platform: ${platform})`);

      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (!scrapeResp.ok) {
        const errData = await scrapeResp.json().catch(() => ({}));
        console.error("Firecrawl error:", scrapeResp.status, JSON.stringify(errData));
        return new Response(JSON.stringify({ error: `Failed to scrape profile (${scrapeResp.status})` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scrapeData = await scrapeResp.json();
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

      // Use AI to extract structured contact info from scraped profile
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI service not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extractPrompt = `Extract contact information from this scraped ${platform || "social media"} profile page.

Return ONLY valid JSON with this structure:
{
  "contacts": [
    {
      "full_name": "string or null",
      "company": "string or null",
      "title": "string or null",
      "email": "string or null",
      "phone": "string or null",
      "location": "string or null",
      "bio": "short bio summary or null",
      "followers": "number or null",
      "following": "number or null",
      "profile_url": "the profile URL"
    }
  ],
  "platform": "${platform || "unknown"}",
  "page_type": "profile|business_page|company_page|other"
}

If this is a single profile, return one contact. If it's a page listing multiple people (like a company team page), extract all visible contacts.
If you cannot extract meaningful contact info, return an empty contacts array.

Profile content:
${markdown.slice(0, 8000)}`;

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
        return new Response(JSON.stringify({ error: "Failed to extract profile data" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content;
      let extracted;
      try {
        extracted = JSON.parse(content);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse extracted data" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const detectedPlatform = extracted.platform || platform || "social";
      const contacts = (extracted.contacts || []).filter((c: any) => c.full_name || c.email);

      if (contacts.length > 0) {
        const records = contacts.map((c: any, idx: number) => ({
          user_id: userId,
          source: `social_${detectedPlatform}`,
          external_id: `${detectedPlatform}-${c.profile_url || url}-${idx}`,
          full_name: c.full_name || null,
          email: c.email || null,
          phone: c.phone || null,
          company: c.company || null,
          title: c.title || null,
          linkedin_url: detectedPlatform === "linkedin" ? (c.profile_url || url) : null,
          location: c.location || null,
          metadata: {
            platform: detectedPlatform,
            bio: c.bio,
            followers: c.followers,
            following: c.following,
            profile_url: c.profile_url || url,
            page_type: extracted.page_type,
            scraped_at: new Date().toISOString(),
          },
        }));

        const { error: upsertErr } = await adminClient
          .from("network_contacts")
          .upsert(records, { onConflict: "user_id,source,external_id" });
        if (upsertErr) console.error("Social contacts upsert error:", upsertErr);
      }

      // Update network connections
      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: `social_${detectedPlatform}`,
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
          metadata: { urls: [url], platform: detectedPlatform },
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({
        success: true,
        imported: contacts.length,
        platform: detectedPlatform,
        contacts: contacts.map((c: any) => ({
          name: c.full_name,
          company: c.company,
          title: c.title,
          bio: c.bio,
        })),
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

      // Count per platform
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

function detectPlatform(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("instagram") || lower.includes("instagr.am")) return "instagram";
  if (lower.includes("facebook") || lower.includes("fb.com")) return "facebook";
  if (lower.includes("twitter") || lower.includes("x.com")) return "x";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("tiktok")) return "tiktok";
  return "social";
}
