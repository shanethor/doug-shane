import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_PEOPLE_API = "https://people.googleapis.com/v1/people/me/connections";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshGoogleToken(refreshTokenEnc: string): Promise<string> {
  const refreshToken = await decryptToken(refreshTokenEnc);
  const resp = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

serve(async (req) => {
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

    // ─── Sync Google Contacts ───
    if (action === "sync_google") {
      // Get the user's Gmail connection
      const { data: conns } = await adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "gmail")
        .eq("is_active", true)
        .limit(1);

      if (!conns?.length) {
        return new Response(JSON.stringify({ error: "No Gmail connection found. Please connect Gmail first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conn = conns[0];
      let accessToken: string;
      try {
        accessToken = await refreshGoogleToken(conn.refresh_token);
      } catch (e) {
        console.error("Token refresh failed:", e);
        return new Response(JSON.stringify({ 
          error: "Gmail needs to be reconnected with contacts permission.",
          needs_reconnect: true
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch contacts from Google People API
      let allContacts: any[] = [];
      let nextPageToken = "";
      let page = 0;
      const maxPages = 10; // safety limit

      do {
        const url = new URL(GOOGLE_PEOPLE_API);
        url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,organizations,locations,urls");
        url.searchParams.set("pageSize", "1000");
        if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

        const resp = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("People API error:", resp.status, errText);
          if (resp.status === 403) {
            return new Response(JSON.stringify({ 
              error: "Contacts permission not granted. Please reconnect Gmail with contacts access.",
              needs_reconnect: true
            }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Failed to fetch Google Contacts" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await resp.json();
        const connections = data.connections || [];
        allContacts = allContacts.concat(connections);
        nextPageToken = data.nextPageToken || "";
        page++;
      } while (nextPageToken && page < maxPages);

      // Map to our schema
      const contacts = allContacts.map((person: any) => {
        const name = person.names?.[0];
        const email = person.emailAddresses?.[0];
        const phone = person.phoneNumbers?.[0];
        const org = person.organizations?.[0];
        const loc = person.locations?.[0];
        const linkedinUrl = person.urls?.find((u: any) => u.value?.includes("linkedin"))?.value;

        return {
          user_id: userId,
          source: "google",
          external_id: person.resourceName || `google-${email?.value || name?.displayName || Math.random()}`,
          full_name: name?.displayName || null,
          email: email?.value || null,
          phone: phone?.value || null,
          company: org?.name || null,
          title: org?.title || null,
          linkedin_url: linkedinUrl || null,
          location: loc?.value || null,
          metadata: {
            google_resource: person.resourceName,
          },
        };
      }).filter((c: any) => c.full_name || c.email); // skip empty contacts

      // Upsert contacts
      if (contacts.length > 0) {
        // Batch in chunks of 500
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error: upsertErr } = await adminClient
            .from("network_contacts")
            .upsert(batch, { onConflict: "user_id,source,external_id" });
          if (upsertErr) {
            console.error("Contacts upsert error:", upsertErr);
          }
        }
      }

      // Update network_connections tracker
      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: "google_contacts",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ 
        success: true, 
        imported: contacts.length,
        source: "google_contacts"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Import LinkedIn CSV ───
    if (action === "import_linkedin_csv") {
      const { contacts: csvContacts } = body;
      if (!Array.isArray(csvContacts) || csvContacts.length === 0) {
        return new Response(JSON.stringify({ error: "No contacts provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Map LinkedIn CSV fields to our schema
      const contacts = csvContacts.slice(0, 5000).map((c: any, idx: number) => ({
        user_id: userId,
        source: "linkedin_csv",
        external_id: c.profileUrl || c["Profile URL"] || `linkedin-${idx}-${c.firstName || c["First Name"] || ""}`,
        full_name: [c.firstName || c["First Name"], c.lastName || c["Last Name"]].filter(Boolean).join(" ") || null,
        email: c.emailAddress || c["Email Address"] || null,
        company: c.company || c["Company"] || null,
        title: c.position || c["Position"] || null,
        linkedin_url: c.profileUrl || c["Profile URL"] || null,
        location: null,
        phone: null,
        metadata: { raw: c },
      })).filter((c: any) => c.full_name);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error } = await adminClient
            .from("network_contacts")
            .upsert(batch, { onConflict: "user_id,source,external_id" });
          if (error) console.error("LinkedIn upsert error:", error);
        }
      }

      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: "linkedin",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ 
        success: true, 
        imported: contacts.length,
        source: "linkedin"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Import Phone Contacts ───
    if (action === "import_phone_contacts") {
      const { contacts: phoneContacts } = body;
      if (!Array.isArray(phoneContacts) || phoneContacts.length === 0) {
        return new Response(JSON.stringify({ error: "No contacts provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contacts = phoneContacts.slice(0, 5000).map((c: any, idx: number) => ({
        user_id: userId,
        source: "phone",
        external_id: `phone-${c.name || idx}-${c.tel?.[0] || c.email?.[0] || idx}`,
        full_name: c.name?.[0] || c.name || null,
        email: Array.isArray(c.email) ? c.email[0] : c.email || null,
        phone: Array.isArray(c.tel) ? c.tel[0] : c.tel || null,
        company: c.company || null,
        title: null,
        linkedin_url: null,
        location: null,
        metadata: { raw: c },
      })).filter((c: any) => c.full_name || c.phone);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error } = await adminClient
            .from("network_contacts")
            .upsert(batch, { onConflict: "user_id,source,external_id" });
          if (error) console.error("Phone upsert error:", error);
        }
      }

      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: "phone",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ 
        success: true, 
        imported: contacts.length,
        source: "phone"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get Connection Status ───
    if (action === "status") {
      const { data: connections } = await adminClient
        .from("network_connections")
        .select("*")
        .eq("user_id", userId);

      const { data: contactCounts } = await adminClient
        .from("network_contacts")
        .select("source")
        .eq("user_id", userId);

      // Count by source
      const counts: Record<string, number> = {};
      (contactCounts || []).forEach((c: any) => {
        counts[c.source] = (counts[c.source] || 0) + 1;
      });

      return new Response(JSON.stringify({ 
        connections: connections || [],
        contact_counts: counts
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Disconnect a source ───
    if (action === "disconnect") {
      const { source } = body;
      if (!source) {
        return new Response(JSON.stringify({ error: "Source required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient
        .from("network_contacts")
        .delete()
        .eq("user_id", userId)
        .eq("source", source);

      await adminClient
        .from("network_connections")
        .delete()
        .eq("user_id", userId)
        .eq("source", source);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-contacts error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
