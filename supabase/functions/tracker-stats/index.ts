import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TrackerStats = {
  totalProspects: number;
  quotingCount: number;
  presentingCount: number;
  presentingPremium: number;
  presentingRevenue: number;
  totalPremiumSold: number;
  totalRevenueSold: number;
  targetPremium: number;
  targetRevenue: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { uid } = await req.json();
    if (!uid || typeof uid !== "string") {
      return new Response(JSON.stringify({ error: "uid required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [leadsRes, policiesRes, profileRes, authUserRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, stage, presenting_details, target_premium")
        .eq("owner_user_id", uid),
      supabase
        .from("policies")
        .select("lead_id, annual_premium, revenue, status")
        .eq("producer_user_id", uid),
      supabase
        .from("profiles")
        .select("full_name, agency_name")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase.auth.admin.getUserById(uid),
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (policiesRes.error) throw policiesRes.error;

    const leads = leadsRes.data ?? [];
    const allPolicies = policiesRes.data ?? [];
    const approved = allPolicies.filter((p: any) => p.status === "approved");
    const approvedLeadIds = new Set(approved.map((p: any) => p.lead_id));

    const prospectLeads = leads.filter((l: any) => l.stage === "prospect" && !approvedLeadIds.has(l.id));
    const quotingLeads = leads.filter((l: any) => l.stage === "quoting" && !approvedLeadIds.has(l.id));
    const presentingLeads = leads.filter((l: any) => l.stage === "presenting" && !approvedLeadIds.has(l.id));

    let presentingPremium = 0;
    presentingLeads.forEach((l: any) => {
      const lines = l.presenting_details?.lines;
      if (Array.isArray(lines)) {
        lines.forEach((line: any) => {
          presentingPremium += Number(line.premium) || 0;
        });
      } else if (l.presenting_details?.quoted_premium) {
        presentingPremium += Number(l.presenting_details.quoted_premium) || 0;
      }
    });

    const activeLeads = leads.filter((l: any) => !approvedLeadIds.has(l.id) && l.stage !== "lost");
    const targetPremium = activeLeads.reduce((s: number, l: any) => s + (Number(l.target_premium) || 0), 0);

    const stats: TrackerStats = {
      totalProspects: prospectLeads.length,
      quotingCount: quotingLeads.length,
      presentingCount: presentingLeads.length,
      presentingPremium,
      presentingRevenue: presentingPremium * 0.12,
      totalPremiumSold: approved.reduce((s: number, p: any) => s + Number(p.annual_premium || 0), 0),
      totalRevenueSold: approved.reduce((s: number, p: any) => s + Number(p.revenue || Number(p.annual_premium) * 0.12 || 0), 0),
      targetPremium,
      targetRevenue: targetPremium * 0.12,
    };

    const profile = profileRes.data;
    const authUser = authUserRes.data?.user;
    const fullName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email || null;
    const agencyName = profile?.agency_name || null;

    return new Response(
      JSON.stringify({
        uid,
        full_name: fullName,
        agency_name: agencyName,
        stats,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to load tracker stats" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
