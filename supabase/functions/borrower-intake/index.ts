import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fallback agent ID — first admin/advisor found
async function getFallbackAgentId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "advisor"])
    .limit(1)
    .single();
  return data?.user_id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, quick_apply, partner_quick_apply } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const agentId = await getFallbackAgentId(supabase);
    if (!agentId) {
      return new Response(JSON.stringify({ error: "no agent configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Quick Apply: create lead directly without full intake ──
    if (quick_apply) {
      const { name, email, old_address, new_address } = quick_apply;
      if (!name || !email || !new_address) {
        return new Response(JSON.stringify({ error: "name, email, and new_address required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find linked advisor for this partner slug
      const { data: partnerLink } = await supabase
        .from("property_partner_links")
        .select("linked_advisor_user_id")
        .eq("partner_slug", slug)
        .limit(1)
        .maybeSingle();

      const ownerUserId = partnerLink?.linked_advisor_user_id || agentId;

      const { error: leadError } = await supabase.from("leads").insert({
        account_name: name,
        contact_name: name,
        email: email,
        line_type: "personal",
        stage: "prospect",
        owner_user_id: ownerUserId,
        lead_source: `partner:${slug}:quick`,
        business_type: "Residential Property",
        presenting_details: {
          old_address: old_address || "",
          new_address: new_address,
          quick_apply: true,
          partner_slug: slug,
        },
      });

      if (leadError) {
        console.error("Quick apply lead creation failed:", leadError);
        return new Response(JSON.stringify({ error: leadError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Notify the advisor
      await supabase.from("notifications").insert({
        user_id: ownerUserId,
        type: "pipeline",
        title: `Quick apply: ${name}`,
        body: `New address: ${new_address} — via ${slug} partner page`,
        link: "/pipeline",
        metadata: { partner_slug: slug, is_quick_apply: true },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Partner Quick Apply: create lead from partner page quick info form ──
    if (partner_quick_apply) {
      const { first_name, last_name, email, phone, coverage } = partner_quick_apply;
      if (!first_name || !email) {
        return new Response(JSON.stringify({ error: "first_name and email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fullName = [first_name, last_name].filter(Boolean).join(" ");

      // Find linked advisor for this partner slug
      const { data: partnerLink } = await supabase
        .from("property_partner_links")
        .select("linked_advisor_user_id")
        .eq("partner_slug", slug)
        .limit(1)
        .maybeSingle();

      const ownerUserId = partnerLink?.linked_advisor_user_id || agentId;

      const { error: leadError } = await supabase.from("leads").insert({
        account_name: fullName,
        contact_name: fullName,
        email: email,
        phone: phone || null,
        line_type: "commercial",
        stage: "prospect",
        owner_user_id: ownerUserId,
        lead_source: `partner:${slug}:quick`,
        business_type: coverage || "Not specified",
        presenting_details: {
          partner_quick_apply: true,
          partner_slug: slug,
          first_name,
          last_name,
          coverage_type: coverage || "",
        },
      });

      if (leadError) {
        console.error("Partner quick apply lead creation failed:", leadError);
        return new Response(JSON.stringify({ error: leadError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Notify the advisor
      await supabase.from("notifications").insert({
        user_id: ownerUserId,
        type: "pipeline",
        title: `Partner quick apply: ${fullName}`,
        body: `${coverage || "Coverage TBD"} — via ${slug} partner page`,
        link: "/pipeline",
        metadata: { partner_slug: slug, is_partner_quick_apply: true },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard intake link creation ──
    const personalOnlySlugs = ["josh-chernes"];
    const lineType = personalOnlySlugs.includes(slug) ? "personal" : null;

    const insertPayload: Record<string, unknown> = {
      agent_id: agentId,
      partner_slug: slug,
    };
    if (lineType) insertPayload.line_type = lineType;

    const { data, error } = await supabase
      .from("intake_links")
      .insert(insertPayload)
      .select("token")
      .single();

    if (error || !data) {
      console.error("Failed to create intake:", error);
      return new Response(JSON.stringify({ error: error?.message ?? "insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ token: data.token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
