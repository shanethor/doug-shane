import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecrypt, encryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// Blocklist patterns for automated senders
const SENDER_BLOCKLIST = [
  /^noreply@/i, /^no-reply@/i, /^notifications?@/i, /^mailer-daemon@/i,
  /^postmaster@/i, /^support@.*\.com$/i, /^info@/i, /^team@/i,
  /@github\.com$/i, /@linkedin\.com$/i, /@facebookmail\.com$/i,
  /@docs\.google\.com$/i, /@calendar\.google\.com$/i, /@accounts\.google\.com$/i,
  /@bounce\./i, /@.*\.noreply\./i, /^alerts?@/i, /^updates?@/i,
  /@slack\.com$/i, /@trello\.com$/i, /@asana\.com$/i,
];

function isBlocklisted(email: string): boolean {
  return SENDER_BLOCKLIST.some(pattern => pattern.test(email));
}

function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

async function refreshToken(connection: any, adminClient: any): Promise<string> {
  const plainRefreshToken = await safeDecrypt(connection.refresh_token);
  let tokenResp: Response;
  let tokenData: any;

  if (connection.provider === "gmail") {
    tokenResp = await fetch(GMAIL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: plainRefreshToken,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        grant_type: "refresh_token",
      }),
    });
  } else {
    tokenResp = await fetch(OUTLOOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: plainRefreshToken,
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
        grant_type: "refresh_token",
        scope: "openid email Mail.Read offline_access",
      }),
    });
  }

  tokenData = await tokenResp.json();
  if (!tokenResp.ok) throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`);

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
  const encAccessToken = await encryptToken(tokenData.access_token);
  const updatePayload: any = { access_token: encAccessToken, token_expires_at: expiresAt, updated_at: new Date().toISOString() };
  if (tokenData.refresh_token) updatePayload.refresh_token = await encryptToken(tokenData.refresh_token);

  await adminClient.from("email_connections").update(updatePayload).eq("id", connection.id);
  return tokenData.access_token;
}

async function getValidToken(connection: any, adminClient: any): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) return safeDecrypt(connection.access_token);
  return refreshToken(connection, adminClient);
}

// Hunter.io enrichment
async function enrichWithHunter(email: string, hunterKey: string): Promise<any> {
  try {
    // Verify email
    const verifyResp = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`
    );
    const verifyData = await verifyResp.json();
    if (!verifyResp.ok) return { verified: false, error: verifyData };

    const result: any = {
      verified: verifyData.data?.result === "deliverable",
      confidence: verifyData.data?.score || 0,
    };

    // Domain search for professional data
    const domain = extractDomain(email);
    if (domain) {
      const domainResp = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterKey}&limit=5`
      );
      if (domainResp.ok) {
        const domainData = await domainResp.json();
        const match = (domainData.data?.emails || []).find(
          (e: any) => e.value?.toLowerCase() === email.toLowerCase()
        );
        if (match) {
          result.position = match.position || null;
          result.company = domainData.data?.organization || null;
          result.linkedin_url = match.linkedin || null;
          result.twitter_url = match.twitter || null;
          result.phone = match.phone_number || null;
          result.first_name = match.first_name || null;
          result.last_name = match.last_name || null;
        } else {
          result.company = domainData.data?.organization || null;
        }
      }
    }

    return result;
  } catch (err) {
    console.error("Hunter.io error for", email, err);
    return { verified: false, error: String(err) };
  }
}

// PDL enrichment for high-value contacts
async function enrichWithPDL(email: string, pdlKey: string): Promise<any> {
  try {
    const resp = await fetch("https://api.peopledatalabs.com/v5/person/enrich", {
      method: "GET",
      headers: { "X-Api-Key": pdlKey },
    });
    // Use query params
    const url = new URL("https://api.peopledatalabs.com/v5/person/enrich");
    url.searchParams.set("email", email);
    url.searchParams.set("min_likelihood", "5");
    const pdlResp = await fetch(url.toString(), {
      headers: { "X-Api-Key": pdlKey },
    });
    if (!pdlResp.ok) return null;
    const data = await pdlResp.json();
    return data.data || data;
  } catch (err) {
    console.error("PDL error for", email, err);
    return null;
  }
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

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const body = await req.json();
    const { connection_id } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active email connections
    let connQuery = adminClient
      .from("email_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (connection_id) connQuery = connQuery.eq("id", connection_id);

    const { data: connections } = await connQuery;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ error: "No active email connections", discovered: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hunterKey = Deno.env.get("HUNTER_API_KEY");
    const pdlKey = Deno.env.get("PDL_API_KEY");

    let totalDiscovered = 0;
    let totalEnriched = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      try {
        const accessToken = await getValidToken(conn, adminClient);
        const contactPairs: { name: string; email: string }[] = [];

        if (conn.provider === "gmail") {
          // Fetch recent messages - headers only
          const listResp = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500&q=newer_than:1d",
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!listResp.ok) {
            const errData = await listResp.json();
            errors.push(`Gmail list error: ${JSON.stringify(errData)}`);
            continue;
          }
          const listData = await listResp.json();
          const msgIds = (listData.messages || []).map((m: any) => m.id).slice(0, 500);

          // Batch fetch headers
          for (const msgId of msgIds) {
            const msgResp = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!msgResp.ok) continue;
            const msg = await msgResp.json();
            const headers = msg.payload?.headers || [];

            for (const h of headers) {
              const headerName = h.name?.toLowerCase();
              if (headerName === "from" || headerName === "to" || headerName === "cc") {
                const addresses = h.value.split(",");
                for (const addr of addresses) {
                  const match = addr.trim().match(/^(.+?)\s*<(.+?)>$/);
                  if (match) {
                    contactPairs.push({ name: match[1].replace(/"/g, "").trim(), email: match[2].toLowerCase() });
                  } else if (addr.includes("@")) {
                    contactPairs.push({ name: "", email: addr.trim().toLowerCase() });
                  }
                }
              }
            }
          }
        } else if (conn.provider === "outlook") {
          const mailResp = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages?$top=500&$select=from,toRecipients,ccRecipients&$orderby=receivedDateTime desc`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!mailResp.ok) {
            const errData = await mailResp.json();
            errors.push(`Outlook error: ${JSON.stringify(errData)}`);
            continue;
          }
          const mailData = await mailResp.json();
          for (const m of (mailData.value || [])) {
            if (m.from?.emailAddress) {
              contactPairs.push({ name: m.from.emailAddress.name || "", email: (m.from.emailAddress.address || "").toLowerCase() });
            }
            for (const r of [...(m.toRecipients || []), ...(m.ccRecipients || [])]) {
              if (r.emailAddress) {
                contactPairs.push({ name: r.emailAddress.name || "", email: (r.emailAddress.address || "").toLowerCase() });
              }
            }
          }
        }

        // Deduplicate and filter
        const userEmail = conn.email_address?.toLowerCase();
        const uniqueEmails = new Map<string, string>();
        for (const { name, email } of contactPairs) {
          if (!email || email === userEmail || isBlocklisted(email)) continue;
          if (!uniqueEmails.has(email)) uniqueEmails.set(email, name);
        }

        // Check which already exist
        const emailList = Array.from(uniqueEmails.keys());
        if (emailList.length === 0) continue;

        const { data: existing } = await adminClient
          .from("email_discovered_contacts")
          .select("email_address")
          .eq("user_id", userId)
          .in("email_address", emailList);

        const existingSet = new Set((existing || []).map((e: any) => e.email_address));
        const newContacts = emailList.filter(e => !existingSet.has(e));

        // Rate limit: max 50 Hunter.io calls per cycle
        const hunterLimit = 50;
        let hunterCalls = 0;

        for (const email of newContacts) {
          const displayName = uniqueEmails.get(email) || "";
          const nameParts = displayName.split(" ");
          const firstName = nameParts[0] || null;
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
          const domain = extractDomain(email);

          // Classify contact type and score
          const isPersonalDomain = ["gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","att.net","sbcglobal.net","hotmail.ca","aol.com","protonmail.com","me.com","live.com","msn.com"].includes(domain);
          const espDomains = ["sendgrid.net","mailchimp.com","constantcontact.com","hubspot.com","hs-send.com","salesforce.com","marketo.com","mailgun.org"];
          const isEsp = espDomains.some(d => domain === d || domain.endsWith("." + d));
          const nameWords = displayName.trim().split(/\s+/);
          const isFirstLastPattern = nameWords.length === 2 && nameWords[0].length > 1 && nameWords[1].length > 1;
          const hasCompanyKeyword = /\b(llc|inc|corp|ltd|gmbh|team|service|group|agency)\b/i.test(displayName);

          let contactScore = 50;
          if (isPersonalDomain) contactScore += 20;
          if (isFirstLastPattern) contactScore += 20;
          if (isEsp) contactScore -= 50;
          if (hasCompanyKeyword) contactScore -= 30;
          if (!displayName || displayName.length < 2) contactScore -= 20;

          const contactType = contactScore >= 70 ? "person" : contactScore >= 40 ? "company" : "filtered";
          const isFiltered = contactScore < 40;

          const record: any = {
            user_id: userId,
            email_address: email,
            display_name: displayName || null,
            first_name: firstName,
            last_name: lastName,
            domain,
            enrichment_status: "pending",
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            email_frequency: 1,
            status: "discovered",
            contact_type: contactType,
            contact_score: contactScore,
            filtered: isFiltered,
          };

          // Hunter.io enrichment
          if (hunterKey && hunterCalls < hunterLimit) {
            const hunter = await enrichWithHunter(email, hunterKey);
            hunterCalls++;
            record.hunter_verified = hunter.verified;
            record.hunter_confidence = hunter.confidence;
            record.hunter_position = hunter.position || null;
            record.hunter_company = hunter.company || null;
            record.hunter_linkedin_url = hunter.linkedin_url || null;
            record.hunter_twitter_url = hunter.twitter_url || null;
            record.hunter_phone = hunter.phone || null;
            if (hunter.first_name && !record.first_name) record.first_name = hunter.first_name;
            if (hunter.last_name && !record.last_name) record.last_name = hunter.last_name;
            record.enrichment_status = "hunter_done";

            // Log API call
            await adminClient.from("enrichment_api_logs").insert({
              user_id: userId,
              provider: "hunter",
              endpoint: "email-verifier+domain-search",
              credits_consumed: 2,
              response_status: hunter.error ? 400 : 200,
              error_message: hunter.error ? String(hunter.error) : null,
            });

            // Full PDL enrichment for high-confidence contacts
            if (pdlKey && hunter.confidence >= 70) {
              const pdl = await enrichWithPDL(email, pdlKey);
              if (pdl) {
                record.enrichment_data = pdl;
                record.enrichment_status = "fully_enriched";
                if (pdl.job_title && !record.hunter_position) record.hunter_position = pdl.job_title;
                if (pdl.job_company_name && !record.hunter_company) record.hunter_company = pdl.job_company_name;
                if (pdl.linkedin_url && !record.hunter_linkedin_url) record.hunter_linkedin_url = pdl.linkedin_url;
              }
              await adminClient.from("enrichment_api_logs").insert({
                user_id: userId,
                provider: "pdl",
                endpoint: "person/enrich",
                credits_consumed: 1,
                response_status: pdl ? 200 : 404,
              });
            }

            totalEnriched++;
          }

          // Insert discovered contact
          const { error: insertErr } = await adminClient
            .from("email_discovered_contacts")
            .upsert(record, { onConflict: "user_id,email_address" });

          if (insertErr) {
            console.error("Insert error:", insertErr);
          } else {
            totalDiscovered++;
          }
        }

        // Update existing contacts' frequency
        for (const email of emailList.filter(e => existingSet.has(e))) {
          await adminClient.rpc("", {}).catch(() => {}); // skip rpc
          // Simple update
          const { data: existing } = await adminClient
            .from("email_discovered_contacts")
            .select("id, email_frequency")
            .eq("user_id", userId)
            .eq("email_address", email)
            .maybeSingle();
          if (existing) {
            await adminClient.from("email_discovered_contacts")
              .update({ email_frequency: (existing.email_frequency || 1) + 1, last_seen_at: new Date().toISOString() })
              .eq("id", existing.id);
          }
        }
      } catch (connErr) {
        console.error(`Error processing connection ${conn.id}:`, connErr);
        errors.push(String(connErr));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      discovered: totalDiscovered,
      enriched: totalEnriched,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-email-contacts error:", err);
    return new Response(JSON.stringify({ error: "An error occurred", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
