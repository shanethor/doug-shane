import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

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
      console.error("email-oauth getClaims error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { action, provider, code, redirect_uri } = body;

    // Use service role for writing tokens
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "get_auth_url") {
      // Return the OAuth URL for the provider
      if (provider === "gmail") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        if (!clientId) {
          return new Response(JSON.stringify({ error: "Google OAuth not configured. Please add GOOGLE_CLIENT_ID secret." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const scopes = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;
        return new Response(JSON.stringify({ url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (provider === "outlook") {
        const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
        if (!clientId) {
          return new Response(JSON.stringify({ error: "Microsoft OAuth not configured. Please add MICROSOFT_CLIENT_ID secret." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const scopes = "openid email profile User.Read Mail.Read Mail.Send Calendars.ReadWrite offline_access";
        const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
        return new Response(JSON.stringify({ url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      // Exchange auth code for tokens
      let tokenResp: Response;
      let tokenData: any;

      if (provider === "gmail") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
        const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
        tokenResp = await fetch(GMAIL_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirect_uri,
            grant_type: "authorization_code",
          }),
        });
        tokenData = await tokenResp.json();
        if (!tokenResp.ok) {
          console.error("Google token error:", tokenData);
          return new Response(JSON.stringify({ error: "Failed to exchange Google auth code" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user email from Google
        const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileResp.json();
        const email = profile.email;

        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

        // Encrypt tokens before storing
        const encAccessToken = await encryptToken(tokenData.access_token);
        const encRefreshToken = await encryptToken(tokenData.refresh_token);

        const { error: upsertErr } = await adminClient
          .from("email_connections")
          .upsert({
            user_id: userId,
            provider: "gmail",
            email_address: email,
            access_token: encAccessToken,
            refresh_token: encRefreshToken,
            token_expires_at: expiresAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,provider" });

        if (upsertErr) {
          console.error("Upsert error:", upsertErr);
          return new Response(JSON.stringify({ error: "Failed to save connection" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Also upsert into external_calendars so calendar sync works
        await adminClient
          .from("external_calendars")
          .upsert({
            user_id: userId,
            provider: "gmail",
            email_address: email,
            access_token: encAccessToken,
            refresh_token: encRefreshToken,
            token_expires_at: expiresAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,provider" });

        return new Response(JSON.stringify({ success: true, email, provider: "gmail" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } else if (provider === "outlook") {
        const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
        const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
        tokenResp = await fetch(OUTLOOK_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirect_uri,
            grant_type: "authorization_code",
            scope: "openid email profile User.Read Mail.Read Mail.Send Calendars.ReadWrite offline_access",
          }),
        });
        tokenData = await tokenResp.json();
        if (!tokenResp.ok) {
          console.error("Microsoft token error:", JSON.stringify(tokenData));
          console.error("Microsoft token status:", tokenResp.status);
          console.error("Used client_id:", clientId);
          console.error("Used redirect_uri:", redirect_uri);
          return new Response(JSON.stringify({ 
            error: `Failed to exchange Microsoft auth code: ${tokenData.error_description || tokenData.error || 'Unknown error'}` 
          }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user email from Microsoft Graph
        let email: string | null = null;
        const meResp = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (meResp.ok) {
          const me = await meResp.json();
          email = me.mail || me.userPrincipalName || null;
        } else {
          const meErr = await meResp.text();
          console.error("Microsoft Graph /me error:", meResp.status, meErr);
        }

        // Fallback to id_token claims
        if (!email && tokenData.id_token) {
          try {
            const [, payload] = tokenData.id_token.split(".");
            const decoded = JSON.parse(atob(payload));
            email = decoded.email || decoded.preferred_username || decoded.upn || null;
          } catch (decodeErr) {
            console.error("Failed to decode Microsoft id_token", decodeErr);
          }
        }

        if (!email) {
          return new Response(JSON.stringify({ error: "Failed to resolve Microsoft account email. Ensure User.Read delegated permission is granted with admin consent." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

        // Encrypt tokens before storing
        const encAccessToken = await encryptToken(tokenData.access_token);
        const encRefreshToken = await encryptToken(tokenData.refresh_token);

        const { error: upsertErr } = await adminClient
          .from("email_connections")
          .upsert({
            user_id: userId,
            provider: "outlook",
            email_address: email,
            access_token: encAccessToken,
            refresh_token: encRefreshToken,
            token_expires_at: expiresAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,provider" });

        if (upsertErr) {
          console.error("Upsert error:", upsertErr);
          return new Response(JSON.stringify({ error: "Failed to save connection" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Also upsert into external_calendars
        await adminClient
          .from("external_calendars")
          .upsert({
            user_id: userId,
            provider: "outlook",
            email_address: email,
            access_token: encAccessToken,
            refresh_token: encRefreshToken,
            token_expires_at: expiresAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,provider" });

        return new Response(JSON.stringify({ success: true, email, provider: "outlook" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "disconnect") {
      await adminClient
        .from("email_connections")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: connections } = await adminClient
        .from("email_connections")
        .select("id, provider, email_address, is_active, created_at")
        .eq("user_id", userId);
      return new Response(JSON.stringify({ connections: connections || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("email-oauth error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});