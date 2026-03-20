import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_PEOPLE_API = "https://people.googleapis.com/v1/people/me/connections";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_CONTACTS_API = "https://graph.microsoft.com/v1.0/me/contacts";

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

async function refreshMicrosoftToken(refreshTokenEnc: string): Promise<string> {
  const refreshToken = await decryptToken(refreshTokenEnc);
  const resp = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
      client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "openid email profile User.Read Mail.Read Mail.Send Calendars.ReadWrite Contacts.Read offline_access",
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`MS token refresh failed: ${JSON.stringify(data)}`);
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
      const requestedConnectionId = typeof body.connection_id === "string" ? body.connection_id : null;
      const requestedEmailAddress = typeof body.email_address === "string" ? body.email_address : null;

      let googleQuery = adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "gmail")
        .eq("is_active", true);

      if (requestedConnectionId) {
        googleQuery = googleQuery.eq("id", requestedConnectionId);
      }
      if (requestedEmailAddress) {
        googleQuery = googleQuery.eq("email_address", requestedEmailAddress);
      }

      const { data: conns } = await googleQuery
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!conns?.length) {
        return new Response(JSON.stringify({ error: "No matching Gmail connection found. Please reconnect that account first." }), {
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

      let allContacts: any[] = [];
      let nextPageToken = "";
      let page = 0;
      const maxPages = 10;

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
          let errJson: any = null;
          try {
            errJson = JSON.parse(errText);
          } catch {
            errJson = null;
          }
          console.error("People API error:", resp.status, errText);
          const googleErrorInfo = errJson?.error?.details?.find((detail: any) => detail?.["@type"] === "type.googleapis.com/google.rpc.ErrorInfo");
          const activationUrl = googleErrorInfo?.metadata?.activationUrl
            || errJson?.error?.details?.find((detail: any) => detail?.["@type"] === "type.googleapis.com/google.rpc.Help")?.links?.[0]?.url
            || null;

          if (resp.status === 403 && googleErrorInfo?.reason === "SERVICE_DISABLED") {
            return new Response(JSON.stringify({
              error: "Google People API is disabled in your Google Cloud project. Enable the People API, wait a minute, then try again.",
              needs_enable_api: true,
              activation_url: activationUrl,
            }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

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
          metadata: { google_resource: person.resourceName },
        };
      }).filter((c: any) => c.full_name || c.email);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error: upsertErr } = await adminClient
            .from("network_contacts")
            .upsert(batch, { onConflict: "user_id,source,external_id" });
          if (upsertErr) console.error("Contacts upsert error:", upsertErr);
        }
      }

      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: "google_contacts",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
          metadata: { email_address: conn.email_address },
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "google_contacts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Sync Microsoft/Outlook Contacts ───
    if (action === "sync_outlook") {
      const requestedConnectionId = typeof body.connection_id === "string" ? body.connection_id : null;
      const requestedEmailAddress = typeof body.email_address === "string" ? body.email_address : null;

      let outlookQuery = adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "outlook")
        .eq("is_active", true);

      if (requestedConnectionId) {
        outlookQuery = outlookQuery.eq("id", requestedConnectionId);
      }
      if (requestedEmailAddress) {
        outlookQuery = outlookQuery.eq("email_address", requestedEmailAddress);
      }

      const { data: conns } = await outlookQuery
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!conns?.length) {
        return new Response(JSON.stringify({ error: "No matching Outlook connection found. Please reconnect that account first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conn = conns[0];
      let accessToken: string;
      try {
        accessToken = await refreshMicrosoftToken(conn.refresh_token);
      } catch (e) {
        console.error("MS Token refresh failed:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        const requiresReconnect = errorMessage.includes("AADSTS70000") || errorMessage.includes("unauthorized or expired") || errorMessage.includes("invalid_grant");
        return new Response(JSON.stringify({
          error: requiresReconnect
            ? "Outlook needs to be reconnected in Settings → Email Accounts so Microsoft can grant Contacts access again."
            : "Outlook token refresh failed. Please reconnect Outlook in Settings → Email Accounts.",
          needs_reconnect: true,
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch contacts from Microsoft Graph
      let allContacts: any[] = [];
      let nextLink = `${MS_CONTACTS_API}?$top=500&$select=displayName,emailAddresses,homePhones,businessPhones,companyName,jobTitle,homeAddress,businessAddress`;

      while (nextLink && allContacts.length < 10000) {
        const resp = await fetch(nextLink, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("MS Contacts API error:", resp.status, errText);
          if (resp.status === 403 || resp.status === 401) {
            return new Response(JSON.stringify({
              error: "Contacts permission not granted. Please reconnect Outlook with contacts access.",
              needs_reconnect: true,
            }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Failed to fetch Outlook Contacts" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await resp.json();
        allContacts = allContacts.concat(data.value || []);
        nextLink = data["@odata.nextLink"] || "";
      }

      const contacts = allContacts.map((person: any) => {
        const email = person.emailAddresses?.[0]?.address;
        const phone = person.businessPhones?.[0] || person.homePhones?.[0];
        const addr = person.businessAddress || person.homeAddress;
        const location = addr ? [addr.city, addr.state].filter(Boolean).join(", ") : null;

        return {
          user_id: userId,
          source: "outlook",
          external_id: person.id || `outlook-${email || person.displayName || Math.random()}`,
          full_name: person.displayName || null,
          email: email || null,
          phone: phone || null,
          company: person.companyName || null,
          title: person.jobTitle || null,
          linkedin_url: null,
          location,
          metadata: { outlook_id: person.id },
        };
      }).filter((c: any) => c.full_name || c.email);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error: upsertErr } = await adminClient
            .from("network_contacts")
            .upsert(batch, { onConflict: "user_id,source,external_id" });
          if (upsertErr) console.error("Outlook contacts upsert error:", upsertErr);
        }
      }

      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: "outlook_contacts",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "outlook_contacts" }), {
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

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "linkedin" }), {
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

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Slack API Sync (via Slack connector gateway or manual token) ───
    if (action === "sync_slack_api") {
      const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");

      if (!LOVABLE_API_KEY || !SLACK_API_KEY) {
        return new Response(JSON.stringify({
          error: "Slack connector not configured. Connect Slack via Settings → Connectors.",
          needs_connector: true, connector_id: "slack",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let allMembers: any[] = [];
      let cursor = "";
      do {
        const url = `${GATEWAY_URL}/users.list?limit=200${cursor ? `&cursor=${cursor}` : ""}`;
        const resp = await fetch(url, {
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": SLACK_API_KEY,
          },
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          return new Response(JSON.stringify({ error: `Slack API error: ${data.error || resp.status}` }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const members = (data.members || []).filter((m: any) => !m.is_bot && !m.deleted && m.id !== "USLACKBOT");
        allMembers = allMembers.concat(members);
        cursor = data.response_metadata?.next_cursor || "";
      } while (cursor);

      const contacts = allMembers.map((m: any) => ({
        user_id: userId,
        source: "slack",
        external_id: `slack-${m.id}`,
        full_name: m.real_name || m.profile?.real_name || m.name || null,
        email: m.profile?.email || null,
        phone: m.profile?.phone || null,
        company: null,
        title: m.profile?.title || null,
        linkedin_url: null,
        location: m.tz_label || null,
        metadata: { slack_id: m.id, display_name: m.profile?.display_name, avatar: m.profile?.image_72 },
      })).filter((c: any) => c.full_name || c.email);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          await adminClient.from("network_contacts").upsert(batch, { onConflict: "user_id,source,external_id" });
        }
      }

      await adminClient.from("network_connections").upsert({
        user_id: userId, source: "slack", status: "connected",
        last_sync_at: new Date().toISOString(), contact_count: contacts.length,
        updated_at: new Date().toISOString(), metadata: { method: "api" },
      }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "slack" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Microsoft Teams API Sync (uses existing MS OAuth) ───
    if (action === "sync_teams_api") {
      const { data: conns } = await adminClient
        .from("email_connections").select("*")
        .eq("user_id", userId).eq("provider", "outlook").eq("is_active", true)
        .order("updated_at", { ascending: false }).limit(1);

      if (!conns?.length) {
        return new Response(JSON.stringify({
          error: "Connect your Microsoft/Outlook account first in Settings → Email to enable Teams sync.",
          needs_outlook: true,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let accessToken: string;
      try { accessToken = await refreshMicrosoftToken(conns[0].refresh_token); }
      catch { return new Response(JSON.stringify({ error: "Microsoft token refresh failed. Reconnect Outlook.", needs_reconnect: true }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      // Fetch users in org via Graph
      let allUsers: any[] = [];
      let nextLink = "https://graph.microsoft.com/v1.0/users?$top=999&$select=displayName,mail,jobTitle,department,companyName,mobilePhone,officeLocation";
      while (nextLink && allUsers.length < 5000) {
        const resp = await fetch(nextLink, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!resp.ok) {
          const errText = await resp.text();
          console.error("Teams/Graph error:", resp.status, errText);
          return new Response(JSON.stringify({ error: `Microsoft Graph error: ${resp.status}` }), {
            status: resp.status === 403 ? 403 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const data = await resp.json();
        allUsers = allUsers.concat(data.value || []);
        nextLink = data["@odata.nextLink"] || "";
      }

      const contacts = allUsers.map((u: any) => ({
        user_id: userId, source: "teams",
        external_id: `teams-${u.id}`,
        full_name: u.displayName || null, email: u.mail || null,
        phone: u.mobilePhone || null, company: u.companyName || null,
        title: u.jobTitle || null, linkedin_url: null,
        location: u.officeLocation || null,
        metadata: { department: u.department, ms_id: u.id, method: "api" },
      })).filter((c: any) => c.full_name || c.email);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          await adminClient.from("network_contacts").upsert(contacts.slice(i, i + 500), { onConflict: "user_id,source,external_id" });
        }
      }

      await adminClient.from("network_connections").upsert({
        user_id: userId, source: "teams", status: "connected",
        last_sync_at: new Date().toISOString(), contact_count: contacts.length,
        updated_at: new Date().toISOString(), metadata: { method: "api" },
      }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "teams" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Eventbrite API Sync ───
    if (action === "sync_eventbrite_api") {
      const EVENTBRITE_TOKEN = Deno.env.get("EVENTBRITE_API_KEY");
      if (!EVENTBRITE_TOKEN) {
        return new Response(JSON.stringify({
          error: "Eventbrite API key not configured.",
          needs_secret: true, secret_name: "EVENTBRITE_API_KEY",
          instructions: "Get your private token from https://www.eventbrite.com/platform/api-keys",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get user's org ID first
      const meResp = await fetch("https://www.eventbriteapi.com/v3/users/me/", {
        headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` },
      });
      if (!meResp.ok) return new Response(JSON.stringify({ error: `Eventbrite auth failed: ${meResp.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const me = await meResp.json();
      const orgId = me.id;

      // Get events
      const eventsResp = await fetch(`https://www.eventbriteapi.com/v3/organizations/${orgId}/events/?status=all&page_size=50`, {
        headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` },
      });
      const eventsData = await eventsResp.json();
      const events = eventsData.events || [];

      let allAttendees: any[] = [];
      for (const event of events.slice(0, 20)) {
        let page = 1;
        let hasMore = true;
        while (hasMore && allAttendees.length < 5000) {
          const attResp = await fetch(`https://www.eventbriteapi.com/v3/events/${event.id}/attendees/?page=${page}`, {
            headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` },
          });
          if (!attResp.ok) break;
          const attData = await attResp.json();
          allAttendees = allAttendees.concat(attData.attendees || []);
          hasMore = attData.pagination?.has_more_items || false;
          page++;
        }
      }

      const contacts = allAttendees.map((a: any) => ({
        user_id: userId, source: "eventbrite",
        external_id: `eventbrite-${a.id}`,
        full_name: a.profile?.name || [a.profile?.first_name, a.profile?.last_name].filter(Boolean).join(" ") || null,
        email: a.profile?.email || null,
        phone: a.profile?.cell_phone || null,
        company: a.profile?.company || null,
        title: a.profile?.job_title || null,
        linkedin_url: null, location: null,
        metadata: { event_id: a.event_id, order_id: a.order_id, method: "api" },
      })).filter((c: any) => c.full_name || c.email);

      // Deduplicate by email
      const seen = new Set<string>();
      const unique = contacts.filter((c: any) => {
        const key = c.email || c.external_id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length > 0) {
        for (let i = 0; i < unique.length; i += 500) {
          await adminClient.from("network_contacts").upsert(unique.slice(i, i + 500), { onConflict: "user_id,source,external_id" });
        }
      }

      await adminClient.from("network_connections").upsert({
        user_id: userId, source: "eventbrite", status: "connected",
        last_sync_at: new Date().toISOString(), contact_count: unique.length,
        updated_at: new Date().toISOString(), metadata: { method: "api", events_scanned: events.length },
      }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: unique.length, source: "eventbrite" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Strava API Sync ───
    if (action === "sync_strava_api") {
      const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
      const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
      const { strava_access_token, strava_refresh_token } = body;

      if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
        return new Response(JSON.stringify({
          error: "Strava API not configured.",
          needs_secrets: true,
          instructions: "Create a Strava API app at https://www.strava.com/settings/api to get Client ID and Secret.",
          secrets_needed: ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"],
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!strava_access_token) {
        // Return OAuth URL for user to authorize
        const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-contacts`;
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read,activity:read&approval_prompt=auto`;
        return new Response(JSON.stringify({
          needs_oauth: true, auth_url: authUrl,
          instructions: "Authorize Strava access to sync your followers.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch athlete's followers (Strava API is limited — only friends list available)
      const friendsResp = await fetch("https://www.strava.com/api/v3/athlete/friends?per_page=200", {
        headers: { Authorization: `Bearer ${strava_access_token}` },
      });
      if (!friendsResp.ok) {
        return new Response(JSON.stringify({ error: `Strava API error: ${friendsResp.status}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const friends = await friendsResp.json();

      const contacts = (Array.isArray(friends) ? friends : []).map((f: any) => ({
        user_id: userId, source: "strava",
        external_id: `strava-${f.id}`,
        full_name: [f.firstname, f.lastname].filter(Boolean).join(" ") || null,
        email: null, phone: null, company: null, title: null, linkedin_url: null,
        location: [f.city, f.state, f.country].filter(Boolean).join(", ") || null,
        metadata: { strava_id: f.id, profile: f.profile, method: "api" },
      })).filter((c: any) => c.full_name);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          await adminClient.from("network_contacts").upsert(contacts.slice(i, i + 500), { onConflict: "user_id,source,external_id" });
        }
      }

      await adminClient.from("network_connections").upsert({
        user_id: userId, source: "strava", status: "connected",
        last_sync_at: new Date().toISOString(), contact_count: contacts.length,
        updated_at: new Date().toISOString(), metadata: { method: "api" },
      }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source: "strava" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Generic Source Import (for any platform CSV/paste/file) ───
    if (action === "import_source_contacts") {
      const { source, contacts: rawContacts } = body;
      const validSources = [
        "slack", "teams", "eventbrite", "meetup", "alignable",
        "strava", "peloton", "nextdoor", "snapchat", "clubhouse",
        "discord", "steam", "whatsapp", "telegram",
      ];
      if (!source || !validSources.includes(source)) {
        return new Response(JSON.stringify({ error: `Invalid source. Must be one of: ${validSources.join(", ")}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
        return new Response(JSON.stringify({ error: "No contacts provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contacts = rawContacts.slice(0, 5000).map((c: any, idx: number) => ({
        user_id: userId,
        source,
        external_id: c.external_id || `${source}-${idx}-${c.name || c.full_name || c.email || idx}`,
        full_name: c.full_name || c.name || c.display_name || c.displayName || null,
        email: c.email || c.emailAddress || null,
        phone: c.phone || c.tel || null,
        company: c.company || c.organization || null,
        title: c.title || c.jobTitle || c.position || null,
        linkedin_url: c.linkedin_url || c.linkedinUrl || null,
        location: c.location || c.city || null,
        metadata: { raw: c, imported_from: source },
      })).filter((c: any) => c.full_name || c.email || c.phone);

      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error } = await adminClient
            .from("network_contacts")
            .upsert(batch, { onConflict: "user_id,source,external_id" });
          if (error) console.error(`${source} upsert error:`, error);
        }
      }

      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source,
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({ success: true, imported: contacts.length, source }), {
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

      const counts: Record<string, number> = {};
      (contactCounts || []).forEach((c: any) => {
        counts[c.source] = (counts[c.source] || 0) + 1;
      });

      return new Response(JSON.stringify({ connections: connections || [], contact_counts: counts }), {
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

      await adminClient.from("network_contacts").delete().eq("user_id", userId).eq("source", source);
      await adminClient.from("network_connections").delete().eq("user_id", userId).eq("source", source);

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
