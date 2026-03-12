import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, mode } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate tracker token
    const { data: trackerToken, error: tokenErr } = await supabase
      .from("partner_tracker_tokens")
      .select("partner_slug, is_active")
      .eq("token", token)
      .single();

    if (tokenErr || !trackerToken || !trackerToken.is_active) {
      return new Response(JSON.stringify({ error: "Invalid or inactive token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = trackerToken.partner_slug;

    // Get all intake_links for this partner
    const { data: intakeLinks } = await supabase
      .from("intake_links")
      .select("id, created_at, is_used, lead_id, line_type, submission_id")
      .eq("partner_slug", slug)
      .order("created_at", { ascending: false });

    const links = intakeLinks ?? [];
    const usedLinks = links.filter((l: any) => l.is_used);
    const leadIds = usedLinks.map((l: any) => l.lead_id).filter(Boolean);

    let leads: any[] = [];
    let policiesData: any[] = [];
    if (leadIds.length > 0) {
      const [leadsRes, policiesRes] = await Promise.all([
        supabase.from("leads").select("id, stage, account_name, line_type, created_at").in("id", leadIds),
        supabase.from("policies").select("id, lead_id, annual_premium, revenue, status").in("lead_id", leadIds),
      ]);
      leads = leadsRes.data ?? [];
      policiesData = policiesRes.data ?? [];
    }

    const approvedPolicies = policiesData.filter((p: any) => p.status === "approved");
    const totalPremiumSold = approvedPolicies.reduce((s: number, p: any) => s + (Number(p.annual_premium) || 0), 0);
    const totalRevenueSold = approvedPolicies.reduce((s: number, p: any) => s + (Number(p.revenue) || Number(p.annual_premium) * 0.12 || 0), 0);

    const stageCounts: Record<string, number> = {};
    leads.forEach((l: any) => {
      stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;
    });

    // Summary view (for partner): no PII
    const summary = {
      partner_slug: slug,
      total_links_generated: links.length,
      total_submissions: usedLinks.length,
      leads_created: leads.length,
      stage_breakdown: stageCounts,
      policies_sold: approvedPolicies.length,
      total_premium_sold: totalPremiumSold,
      total_revenue_sold: totalRevenueSold,
    };

    // Full view (for admin): includes client names
    if (mode === "admin") {
      const referrals = leads.map((l: any) => {
        const leadPolicies = approvedPolicies.filter((p: any) => p.lead_id === l.id);
        return {
          id: l.id,
          account_name: l.account_name,
          line_type: l.line_type,
          stage: l.stage,
          created_at: l.created_at,
          policies_count: leadPolicies.length,
          premium: leadPolicies.reduce((s: number, p: any) => s + (Number(p.annual_premium) || 0), 0),
          revenue: leadPolicies.reduce((s: number, p: any) => s + (Number(p.revenue) || Number(p.annual_premium) * 0.12 || 0), 0),
        };
      });
      return new Response(JSON.stringify({ ...summary, referrals }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
