import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CARDDAV_BASE = "https://contacts.icloud.com";

/** Build Basic auth header from Apple ID + app-specific password */
function basicAuth(appleId: string, appPassword: string): string {
  return "Basic " + btoa(`${appleId}:${appPassword}`);
}

/** Send a PROPFIND request to discover the principal URL */
async function discoverPrincipal(appleId: string, appPassword: string): Promise<string> {
  const resp = await fetch(`${CARDDAV_BASE}/`, {
    method: "PROPFIND",
    headers: {
      Authorization: basicAuth(appleId, appPassword),
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "0",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("PROPFIND principal failed:", resp.status, text);
    if (resp.status === 401) throw new Error("AUTH_FAILED");
    throw new Error(`PROPFIND failed: ${resp.status}`);
  }

  const xml = await resp.text();
  // Extract href from <d:current-user-principal><d:href>...</d:href></d:current-user-principal>
  const match = xml.match(/<[^>]*current-user-principal[^>]*>\s*<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/i);
  if (!match) throw new Error("Could not discover principal URL from CardDAV response");
  return match[1];
}

/** Discover the address book home set URL */
async function discoverAddressBookHome(principalPath: string, appleId: string, appPassword: string): Promise<string> {
  const url = principalPath.startsWith("http") ? principalPath : `${CARDDAV_BASE}${principalPath}`;
  const resp = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: basicAuth(appleId, appPassword),
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "0",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <card:addressbook-home-set/>
  </d:prop>
</d:propfind>`,
  });

  if (!resp.ok) throw new Error(`PROPFIND home failed: ${resp.status}`);
  const xml = await resp.text();
  const match = xml.match(/<[^>]*addressbook-home-set[^>]*>\s*<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/i);
  if (!match) throw new Error("Could not find addressbook-home-set");
  return match[1];
}

/** List address books and return the first one's URL */
async function discoverAddressBooks(homePath: string, appleId: string, appPassword: string): Promise<string> {
  const url = homePath.startsWith("http") ? homePath : `${CARDDAV_BASE}${homePath}`;
  const resp = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: basicAuth(appleId, appPassword),
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "1",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:resourcetype/>
    <d:displayname/>
  </d:prop>
</d:propfind>`,
  });

  if (!resp.ok) throw new Error(`PROPFIND addressbooks failed: ${resp.status}`);
  const xml = await resp.text();

  // Find responses that have <card:addressbook/> in resourcetype
  const responses = xml.split(/<[^>]*response[^>]*>/i).slice(1);
  for (const r of responses) {
    if (r.match(/addressbook/i) && !r.match(/groups/i)) {
      const hrefMatch = r.match(/<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/i);
      if (hrefMatch) return hrefMatch[1];
    }
  }

  // Fallback: use default/card path
  return `${homePath}card/`;
}

/** Fetch all vCards from an address book via REPORT */
async function fetchAllVCards(addressBookPath: string, appleId: string, appPassword: string): Promise<string[]> {
  const url = addressBookPath.startsWith("http") ? addressBookPath : `${CARDDAV_BASE}${addressBookPath}`;
  const resp = await fetch(url, {
    method: "REPORT",
    headers: {
      Authorization: basicAuth(appleId, appPassword),
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "1",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:getetag/>
    <card:address-data/>
  </d:prop>
</card:addressbook-query>`,
  });

  if (!resp.ok) {
    console.error("REPORT failed:", resp.status, await resp.text());
    throw new Error(`REPORT failed: ${resp.status}`);
  }

  const xml = await resp.text();
  // Extract all address-data content (vCards)
  const vcards: string[] = [];
  const regex = /<[^>]*address-data[^>]*>([\s\S]*?)<\/[^>]*address-data>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    const vcard = m[1].trim();
    if (vcard.startsWith("BEGIN:VCARD")) {
      vcards.push(vcard);
    }
  }
  return vcards;
}

/** Parse a vCard string into a contact object */
function parseVCard(vcard: string): Record<string, any> {
  // Unfold continued lines (RFC 6350: line starting with space/tab is continuation)
  const unfolded = vcard.replace(/\r\n[ \t]/g, "").replace(/\r/g, "");
  const lines = unfolded.split("\n").map(l => l.trim()).filter(Boolean);

  const get = (field: string): string | null => {
    for (const line of lines) {
      // Match field name at start, followed by ; (params) or : (value)
      const upper = line.toUpperCase();
      if (upper.startsWith(field.toUpperCase() + ";") || upper.startsWith(field.toUpperCase() + ":")) {
        // Value is everything after the LAST colon for simple fields, but for TEL/EMAIL
        // we want the value portion after parameters
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const val = line.substring(colonIdx + 1).trim();
        return val || null;
      }
    }
    return null;
  };

  const getAll = (field: string): string[] => {
    const results: string[] = [];
    const fieldUpper = field.toUpperCase();
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.startsWith(fieldUpper + ";") || upper.startsWith(fieldUpper + ":")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const val = line.substring(colonIdx + 1).trim();
        if (val) results.push(val);
      }
    }
    return results;
  };

  const fn = get("FN");
  const emails = getAll("EMAIL");
  const phones = getAll("TEL");
  const org = get("ORG");
  const title = get("TITLE");
  const note = get("NOTE");
  const uid = get("UID");

  // Parse N field: LastName;FirstName;MiddleName;Prefix;Suffix
  let parsedName = fn;
  const nVal = get("N");
  if (nVal && !fn) {
    const parts = nVal.split(";");
    parsedName = [parts[1], parts[0]].filter(Boolean).join(" ").trim() || null;
  }

  // Parse ADR
  let location: string | null = null;
  const adrVal = get("ADR");
  if (adrVal) {
    const parts = adrVal.split(";").filter(Boolean);
    location = parts.join(", ") || null;
  }

  // URL (check for LinkedIn)
  const urls = getAll("URL");
  const linkedinUrl = urls.find(u => u.toLowerCase().includes("linkedin")) || null;

  // Clean phone numbers — strip tel: URI prefix
  const cleanPhones = phones.map(p => p.replace(/^tel:/i, "").trim()).filter(Boolean);

  return {
    full_name: (fn || parsedName || "").replace(/\r/g, "").trim() || null,
    email: emails[0] || null,
    phone: cleanPhones[0] || null,
    company: org?.replace(/;/g, " ").trim() || null,
    title: title || null,
    linkedin_url: linkedinUrl,
    location,
    uid: uid?.replace(/\r/g, "").trim() || null,
    note: note || null,
    all_emails: emails,
    all_phones: cleanPhones,
  };
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

    // ─── Connect: store encrypted credentials ───
    if (action === "connect") {
      const { apple_id, app_password } = body;
      if (!apple_id || !app_password) {
        return new Response(JSON.stringify({ error: "Apple ID email and app-specific password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate credentials by attempting PROPFIND
      try {
        await discoverPrincipal(apple_id, app_password);
      } catch (e: any) {
        if (e.message === "AUTH_FAILED") {
          return new Response(JSON.stringify({
            error: "Authentication failed. Check your Apple ID and app-specific password. Make sure you're using an app-specific password, not your regular Apple ID password.",
          }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw e;
      }

      // Encrypt the app password
      const encryptedPassword = await encryptToken(app_password);

      // Upsert connection
      const { error: upsertErr } = await adminClient
        .from("icloud_connections")
        .upsert({
          user_id: userId,
          apple_id_email: apple_id,
          app_password_encrypted: encryptedPassword,
          status: "connected",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertErr) {
        console.error("iCloud upsert error:", upsertErr);
        return new Response(JSON.stringify({ error: "Failed to save connection" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "iCloud connected successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Sync: pull contacts from iCloud CardDAV ───
    if (action === "sync") {
      const { data: conn } = await adminClient
        .from("icloud_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No iCloud connection found. Connect first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const appPassword = await decryptToken(conn.app_password_encrypted);
      const appleId = conn.apple_id_email;

      // CardDAV discovery chain
      console.log("Discovering principal...");
      const principalPath = await discoverPrincipal(appleId, appPassword);
      console.log("Principal:", principalPath);

      console.log("Discovering address book home...");
      const homePath = await discoverAddressBookHome(principalPath, appleId, appPassword);
      console.log("Home:", homePath);

      console.log("Discovering address books...");
      const addressBookPath = await discoverAddressBooks(homePath, appleId, appPassword);
      console.log("Address book:", addressBookPath);

      console.log("Fetching vCards...");
      const vcards = await fetchAllVCards(addressBookPath, appleId, appPassword);
      console.log(`Found ${vcards.length} vCards`);

      // Parse and map to network_contacts format
      const contacts = vcards.map((vcard) => {
        const parsed = parseVCard(vcard);
        if (!parsed.full_name && !parsed.email) return null;

        return {
          user_id: userId,
          source: "icloud",
          external_id: parsed.uid || `icloud-${parsed.email || parsed.full_name || Math.random()}`,
          full_name: parsed.full_name,
          email: parsed.email,
          phone: parsed.phone,
          company: parsed.company,
          title: parsed.title,
          linkedin_url: parsed.linkedin_url,
          location: parsed.location,
          metadata: {
            all_emails: parsed.all_emails,
            all_phones: parsed.all_phones,
            note: parsed.note,
            source_uid: parsed.uid,
          },
        };
      }).filter(Boolean);

      // Upsert contacts in batches
      if (contacts.length > 0) {
        for (let i = 0; i < contacts.length; i += 500) {
          const batch = contacts.slice(i, i + 500);
          const { error: upsertErr } = await adminClient
            .from("network_contacts")
            .upsert(batch as any[], { onConflict: "user_id,source,external_id" });
          if (upsertErr) console.error("iCloud contacts upsert error:", upsertErr);
        }
      }

      // Update connection status
      await adminClient
        .from("icloud_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      // Update network_connections for unified status tracking
      await adminClient
        .from("network_connections")
        .upsert({
          user_id: userId,
          source: "icloud",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          contact_count: contacts.length,
          updated_at: new Date().toISOString(),
          metadata: { apple_id: appleId },
        }, { onConflict: "user_id,source" });

      return new Response(JSON.stringify({
        success: true,
        imported: contacts.length,
        source: "icloud",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Status: check connection ───
    if (action === "status") {
      const { data: conn } = await adminClient
        .from("icloud_connections")
        .select("apple_id_email, status, last_sync_at, contact_count, auto_sync, created_at")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ connection: conn || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Toggle auto-sync ───
    if (action === "toggle_auto_sync") {
      const { enabled } = body;
      await adminClient
        .from("icloud_connections")
        .update({ auto_sync: !!enabled, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ success: true, auto_sync: !!enabled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Disconnect ───
    if (action === "disconnect") {
      await adminClient.from("icloud_connections").delete().eq("user_id", userId);
      await adminClient.from("network_contacts").delete().eq("user_id", userId).eq("source", "icloud");
      await adminClient.from("network_connections").delete().eq("user_id", userId).eq("source", "icloud");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("iCloud sync error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
