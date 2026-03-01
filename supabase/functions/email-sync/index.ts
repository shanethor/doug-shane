import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function refreshToken(connection: any, adminClient: any): Promise<string> {
  let tokenResp: Response;
  let tokenData: any;

  if (connection.provider === "gmail") {
    tokenResp = await fetch(GMAIL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: connection.refresh_token,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        grant_type: "refresh_token",
      }),
    });
    tokenData = await tokenResp.json();
  } else {
    tokenResp = await fetch(OUTLOOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: connection.refresh_token,
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
        grant_type: "refresh_token",
        scope: "openid email Mail.Read Mail.Send offline_access",
      }),
    });
    tokenData = await tokenResp.json();
  }

  if (!tokenResp.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`);
  }

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
  await adminClient
    .from("email_connections")
    .update({
      access_token: tokenData.access_token,
      token_expires_at: expiresAt,
      ...(tokenData.refresh_token ? { refresh_token: tokenData.refresh_token } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

async function getValidToken(connection: any, adminClient: any): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return connection.access_token;
  }
  return refreshToken(connection, adminClient);
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

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { action, provider, connection_id } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "sync") {
      // Get the connection
      const { data: conn } = await adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", provider || "gmail")
        .eq("is_active", true)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No active email connection found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(conn, adminClient);
      let emails: any[] = [];

      if (conn.provider === "gmail") {
        // Fetch last 50 emails from Gmail
        const listResp = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const listData = await listResp.json();
        if (!listResp.ok) throw new Error(`Gmail list error: ${JSON.stringify(listData)}`);

        const messageIds = (listData.messages || []).map((m: any) => m.id);

        // Fetch each message (batch of 50)
        for (const msgId of messageIds.slice(0, 50)) {
          const msgResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const msg = await msgResp.json();
          if (!msgResp.ok) continue;

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          const fromRaw = getHeader("From");
          const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);

          emails.push({
            user_id: userId,
            connection_id: conn.id,
            external_id: msgId,
            from_address: fromMatch ? fromMatch[2] : fromRaw,
            from_name: fromMatch ? fromMatch[1].replace(/"/g, "").trim() : null,
            to_addresses: getHeader("To").split(",").map((e: string) => e.trim().replace(/.*<([^>]+)>.*/, "$1")),
            subject: getHeader("Subject"),
            body_preview: msg.snippet || "",
            is_read: !msg.labelIds?.includes("UNREAD"),
            received_at: new Date(parseInt(msg.internalDate)).toISOString(),
          });
        }

      } else if (conn.provider === "outlook") {
        // Fetch last 50 emails from Microsoft Graph
        const mailResp = await fetch(
          "https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,from,toRecipients,subject,bodyPreview,isRead,receivedDateTime&$orderby=receivedDateTime desc",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const mailData = await mailResp.json();
        if (!mailResp.ok) throw new Error(`Outlook error: ${JSON.stringify(mailData)}`);

        emails = (mailData.value || []).map((m: any) => ({
          user_id: userId,
          connection_id: conn.id,
          external_id: m.id,
          from_address: m.from?.emailAddress?.address || "",
          from_name: m.from?.emailAddress?.name || null,
          to_addresses: (m.toRecipients || []).map((r: any) => r.emailAddress?.address),
          subject: m.subject || "",
          body_preview: m.bodyPreview || "",
          is_read: m.isRead ?? false,
          received_at: m.receivedDateTime,
        }));
      }

      // Upsert emails
      if (emails.length > 0) {
        const { error: upsertErr } = await adminClient
          .from("synced_emails")
          .upsert(emails, { onConflict: "connection_id,external_id", ignoreDuplicates: false });
        if (upsertErr) console.error("Email upsert error:", upsertErr);
      }

      return new Response(JSON.stringify({ synced: emails.length, provider: conn.provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      const { to, subject, body_html, send_provider } = body;

      if (!to || !subject) {
        return new Response(JSON.stringify({ error: "Missing to or subject" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get active connection
      const { data: conn } = await adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", send_provider || provider || "gmail")
        .eq("is_active", true)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No email account connected. Connect Gmail or Outlook in Settings." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(conn, adminClient);
      const recipients = Array.isArray(to) ? to : [to];

      if (conn.provider === "gmail") {
        // Build RFC 2822 message
        const toLine = recipients.join(", ");
        const rawEmail = [
          `To: ${toLine}`,
          `Subject: ${subject}`,
          "MIME-Version: 1.0",
          "Content-Type: text/html; charset=utf-8",
          "",
          body_html || "",
        ].join("\r\n");

        // Base64url encode
        const encoder = new TextEncoder();
        const bytes = encoder.encode(rawEmail);
        const base64 = btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const sendResp = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: base64 }),
          }
        );

        if (!sendResp.ok) {
          const errBody = await sendResp.text();
          console.error("Gmail send error:", errBody);
          return new Response(JSON.stringify({ error: "Failed to send via Gmail" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await sendResp.json();
        return new Response(JSON.stringify({ success: true, id: result.id, sent_from: conn.email_address }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } else if (conn.provider === "outlook") {
        const message = {
          message: {
            subject,
            body: { contentType: "HTML", content: body_html || "" },
            toRecipients: recipients.map((email: string) => ({
              emailAddress: { address: email },
            })),
          },
          saveToSentItems: true,
        };

        const sendResp = await fetch(
          "https://graph.microsoft.com/v1.0/me/sendMail",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        if (!sendResp.ok) {
          const errBody = await sendResp.text();
          console.error("Outlook send error:", errBody);
          return new Response(JSON.stringify({ error: "Failed to send via Outlook" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, sent_from: conn.email_address }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("email-sync error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
