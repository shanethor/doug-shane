import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, safeDecrypt } from "../_shared/token-crypto.ts";

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("email-oauth getUser error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const body = await req.json();
    const { action, provider, code, redirect_uri } = body;

    // Use service role for writing tokens
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "get_auth_url") {
      const { code_challenge, code_challenge_method } = body;

      // Return the OAuth URL for the provider
      if (provider === "gmail") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        if (!clientId) {
          return new Response(JSON.stringify({ error: "Google OAuth not configured. Please add GOOGLE_CLIENT_ID secret." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const scopes = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/contacts.readonly";
        let url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=gmail`;
        // PKCE: append code_challenge if provided
        if (code_challenge && code_challenge_method) {
          url += `&code_challenge=${encodeURIComponent(code_challenge)}&code_challenge_method=${code_challenge_method}`;
        }
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
        const scopes = "openid email profile User.Read Mail.Read Mail.Send Calendars.ReadWrite Contacts.Read offline_access";
        let url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=outlook`;
        // PKCE: append code_challenge if provided
        if (code_challenge && code_challenge_method) {
          url += `&code_challenge=${encodeURIComponent(code_challenge)}&code_challenge_method=${code_challenge_method}`;
        }
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
      const { code_verifier } = body;

      if (provider === "gmail") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
        const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
        const tokenParams: Record<string, string> = {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
        };
        // PKCE: include code_verifier if provided
        if (code_verifier) tokenParams.code_verifier = code_verifier;

        tokenResp = await fetch(GMAIL_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(tokenParams),
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
          }, { onConflict: "user_id,provider,email_address" });

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
          }, { onConflict: "user_id,provider,email_address" });

        return new Response(JSON.stringify({ success: true, email, provider: "gmail" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } else if (provider === "outlook") {
        const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
        const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
        const outlookParams: Record<string, string> = {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
          scope: "openid email profile User.Read Mail.Read Mail.Send Calendars.ReadWrite Contacts.Read offline_access",
        };
        // PKCE: include code_verifier if provided
        if (code_verifier) outlookParams.code_verifier = code_verifier;

        tokenResp = await fetch(OUTLOOK_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(outlookParams),
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
          }, { onConflict: "user_id,provider,email_address" });

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
          }, { onConflict: "user_id,provider,email_address" });

        return new Response(JSON.stringify({ success: true, email, provider: "outlook" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "disconnect" || action === "remove") {
      const { connection_id } = body;
      if (connection_id) {
        // Fetch connection to revoke tokens at the provider
        const { data: conn } = await adminClient
          .from("email_connections")
          .select("provider, email_address, access_token, refresh_token")
          .eq("id", connection_id)
          .eq("user_id", userId)
          .maybeSingle();

        // Revoke tokens at the OAuth provider (best-effort)
        if (conn) {
          try {
            const accessToken = await safeDecrypt(conn.access_token || "");
            const refreshToken = await safeDecrypt(conn.refresh_token || "");
            if (conn.provider === "gmail") {
              // Google: revoke either token (revoking one revokes the family)
              const tokenToRevoke = refreshToken || accessToken;
              if (tokenToRevoke) {
                await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });
              }
            } else if (conn.provider === "outlook") {
              // Microsoft: no single revoke endpoint, but we can invalidate the refresh token
              // by calling the logout endpoint — tokens expire naturally (1hr for access)
              // Best practice: delete from DB + let access token expire
              console.log(`[email-oauth] Outlook tokens for ${conn.email_address} cleared from DB; access token will expire naturally.`);
            }
          } catch (revokeErr) {
            // Don't block disconnect on revocation failure
            console.warn("[email-oauth] Token revocation failed (non-blocking):", revokeErr);
          }
        }

        await adminClient
          .from("email_connections")
          .delete()
          .eq("id", connection_id)
          .eq("user_id", userId);

        // Also remove matching external calendar
        if (conn) {
          await adminClient
            .from("external_calendars")
            .delete()
            .eq("user_id", userId)
            .eq("provider", conn.provider)
            .eq("email_address", conn.email_address);
        }
      } else {
        // Legacy: disconnect by provider (removes all connections for that provider)
        // Fetch all connections to revoke tokens first
        const { data: conns } = await adminClient
          .from("email_connections")
          .select("access_token, refresh_token")
          .eq("user_id", userId)
          .eq("provider", provider);

        for (const conn of (conns || [])) {
          try {
            const refreshToken = await safeDecrypt(conn.refresh_token || "");
            if (provider === "gmail" && refreshToken) {
              await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
              });
            }
          } catch { /* non-blocking */ }
        }

        await adminClient
          .from("email_connections")
          .delete()
          .eq("user_id", userId)
          .eq("provider", provider);
      }
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