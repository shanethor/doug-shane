import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Computes agency-wide network overlaps across all producers.
 * Finds contacts that appear in multiple producers' networks.
 * Admin-only operation.
 */
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather all contacts across producers
    const { data: canonicalContacts } = await adminClient
      .from("canonical_persons")
      .select("primary_email, display_name, owner_user_id")
      .not("primary_email", "is", null);

    const { data: discoveredContacts } = await adminClient
      .from("email_discovered_contacts")
      .select("email_address, display_name, user_id")
      .neq("status", "dismissed");

    // Build email → producers map
    const emailMap = new Map<string, { name: string; producers: Set<string> }>();

    for (const c of (canonicalContacts || [])) {
      const email = c.primary_email?.toLowerCase();
      if (!email) continue;
      if (!emailMap.has(email)) emailMap.set(email, { name: c.display_name || email, producers: new Set() });
      emailMap.get(email)!.producers.add(c.owner_user_id);
    }

    for (const c of (discoveredContacts || [])) {
      const email = c.email_address?.toLowerCase();
      if (!email) continue;
      if (!emailMap.has(email)) emailMap.set(email, { name: c.display_name || email, producers: new Set() });
      emailMap.get(email)!.producers.add(c.user_id);
    }

    // Filter to overlaps (2+ producers)
    const overlaps: { email: string; name: string; producers: string[]; count: number }[] = [];
    for (const [email, data] of emailMap) {
      if (data.producers.size >= 2) {
        overlaps.push({
          email,
          name: data.name,
          producers: Array.from(data.producers),
          count: data.producers.size,
        });
      }
    }

    // Clear old overlaps and insert new
    await adminClient.from("agency_network_overlaps").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (const overlap of overlaps) {
      await adminClient.from("agency_network_overlaps").insert({
        contact_email: overlap.email,
        contact_name: overlap.name,
        producer_user_ids: overlap.producers,
        overlap_count: overlap.count,
        last_computed_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      total_overlaps: overlaps.length,
      top_overlaps: overlaps.sort((a, b) => b.count - a.count).slice(0, 20),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("network-overlap error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
