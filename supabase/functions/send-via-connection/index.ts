import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecrypt } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function refreshAccessToken(conn: any, adminClient: any): Promise<string> {
  const plainRefresh = await safeDecrypt(conn.refresh_token);
  let resp: Response;

  if (conn.provider === "gmail") {
    resp = await fetch(GMAIL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: plainRefresh,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        grant_type: "refresh_token",
      }),
    });
  } else {
    resp = await fetch(OUTLOOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: plainRefresh,
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
        grant_type: "refresh_token",
        scope: "openid email Mail.Send Mail.ReadWrite offline_access",
      }),
    });
  }

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  // Update stored tokens
  const { encryptToken } = await import("../_shared/token-crypto.ts");
  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  const updatePayload: any = {
    access_token: await encryptToken(data.access_token),
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (data.refresh_token) updatePayload.refresh_token = await encryptToken(data.refresh_token);
  await adminClient.from("email_connections").update(updatePayload).eq("id", conn.id);

  return data.access_token;
}

async function getToken(conn: any, adminClient: any): Promise<string> {
  const expiresAt = new Date(conn.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) return safeDecrypt(conn.access_token);
  return refreshAccessToken(conn, adminClient);
}

function buildRawRfc822(from: string, to: string, subject: string, body: string): string {
  const boundary = `boundary_${Date.now()}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    body.replace(/<[^>]+>/g, ""),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br>")}</p>`,
    ``,
    `--${boundary}--`,
  ];
  return lines.join("\r\n");
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
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connection_id, to, subject, body } = await req.json();

    // Validate inputs
    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: `Invalid email: ${email}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the specific connection or the first active one
    let connQuery = adminClient
      .from("email_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (connection_id) {
      connQuery = connQuery.eq("id", connection_id);
    }

    const { data: connections } = await connQuery.limit(1);
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ error: "No active email connection found. Please link your email account first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conn = connections[0];
    const accessToken = await getToken(conn, adminClient);

    if (conn.provider === "gmail") {
      // Send via Gmail API
      const raw = buildRawRfc822(conn.email_address, recipients.join(", "), subject, body || "");
      const encodedMessage = btoa(unescape(encodeURIComponent(raw)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendResp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      if (!sendResp.ok) {
        const errData = await sendResp.json();
        console.error("Gmail send error:", errData);
        return new Response(JSON.stringify({ error: "Failed to send via Gmail", details: errData.error?.message }), {
          status: sendResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await sendResp.json();
      return new Response(JSON.stringify({ success: true, id: result.id, provider: "gmail", from: conn.email_address }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (conn.provider === "outlook") {
      // Send via Microsoft Graph
      const message: any = {
        subject,
        body: {
          contentType: body?.includes("<") ? "HTML" : "Text",
          content: body || "",
        },
        toRecipients: recipients.map(email => ({
          emailAddress: { address: email },
        })),
      };

      const sendResp = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
      });

      if (!sendResp.ok) {
        const errText = await sendResp.text();
        console.error("Outlook send error:", errText);
        return new Response(JSON.stringify({ error: "Failed to send via Outlook", details: errText }), {
          status: sendResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, provider: "outlook", from: conn.email_address }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unsupported provider: ${conn.provider}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-via-connection error:", err);
    return new Response(JSON.stringify({ error: "An error occurred sending email" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
