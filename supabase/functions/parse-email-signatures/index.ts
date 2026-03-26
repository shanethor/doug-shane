import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user has email_body_parsing consent
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: consent } = await adminClient
      .from("user_consent_records")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", "email_body_parsing")
      .eq("accepted", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consent) {
      return new Response(JSON.stringify({ error: "Email body parsing consent required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's active email connection
    const { data: emailConn } = await adminClient
      .from("email_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!emailConn) {
      return new Response(JSON.stringify({ error: "No active email connection", parsed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email_bodies } = body; // Array of { message_id, body_text }

    if (!email_bodies || !Array.isArray(email_bodies) || email_bodies.length === 0) {
      return new Response(JSON.stringify({ error: "No email bodies provided", parsed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to 20 emails per call
    const toProcess = email_bodies.slice(0, 20);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use AI to extract signature blocks
    const prompt = `You are a contact extraction AI. Given email body text, extract ONLY the signature block contact information. Ignore the email body content itself.

For each email, extract these fields if present in the signature:
- name (full name)
- email (email address in signature, not the sender)
- phone (phone number)
- title (job title)
- company (company name)
- address (physical address)
- website (URL)
- linkedin (LinkedIn URL)

Return JSON array: [{"message_id": "...", "contacts": [{"name": "...", "email": "...", "phone": "...", "title": "...", "company": "...", "address": "...", "website": "...", "linkedin": "...", "confidence": 0.0-1.0}]}]

If no signature is found, return empty contacts array for that message.

Email bodies to process:
${toProcess.map((e: any, i: number) => `--- EMAIL ${i + 1} (ID: ${e.message_id}) ---\n${(e.body_text || "").slice(-2000)}`).join("\n\n")}`;

    const aiResp = await fetch(`${supabaseUrl}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        prompt,
        model: "google/gemini-2.5-flash",
        max_tokens: 2000,
      }),
    });

    let parsed = 0;
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      const text = aiData.choices?.[0]?.message?.content || aiData.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        try {
          const results = JSON.parse(jsonMatch[0]);
          for (const result of results) {
            for (const contact of (result.contacts || [])) {
              if (!contact.name && !contact.email && !contact.phone) continue;

              // Dedup check
              if (contact.email) {
                const { data: existing } = await adminClient
                  .from("email_signature_contacts")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("extracted_email", contact.email)
                  .limit(1)
                  .maybeSingle();
                if (existing) continue;
              }

              await adminClient.from("email_signature_contacts").insert({
                user_id: user.id,
                source_email_id: result.message_id,
                extracted_name: contact.name || null,
                extracted_email: contact.email || null,
                extracted_phone: contact.phone || null,
                extracted_title: contact.title || null,
                extracted_company: contact.company || null,
                extracted_address: contact.address || null,
                extracted_website: contact.website || null,
                extracted_linkedin: contact.linkedin || null,
                confidence: contact.confidence || 0.5,
              });
              parsed++;
            }
          }
        } catch (e) {
          console.error("Failed to parse AI response:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-email-signatures error:", err);
    return new Response(JSON.stringify({ error: "An error occurred", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
