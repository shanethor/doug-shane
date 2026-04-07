const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find unreached leads expiring within 6 hours that haven't been notified
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: expiringLeads, error: fetchError } = await supabase
      .from("unreached_leads")
      .select("*")
      .eq("expiry_notified", false)
      .lte("expires_at", sixHoursFromNow)
      .gt("expires_at", now);

    if (fetchError) throw fetchError;

    if (!expiringLeads?.length) {
      return new Response(JSON.stringify({ message: "No expiring leads to notify about", notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by original_owner_id
    const byOwner: Record<string, typeof expiringLeads> = {};
    for (const lead of expiringLeads) {
      const ownerId = lead.original_owner_id;
      if (!ownerId) continue;
      (byOwner[ownerId] ??= []).push(lead);
    }

    let notifiedCount = 0;

    for (const [userId, leads] of Object.entries(byOwner)) {
      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;
      if (!userEmail) continue;

      // Get user's name from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();

      const firstName = profile?.full_name?.split(" ")[0] || "there";
      const leadCount = leads.length;
      const expiresAt = new Date(leads[0].expires_at);
      const hoursLeft = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)));

      const companyList = leads
        .slice(0, 5)
        .map((l: any) => `• ${l.company}${l.state ? ` (${l.state})` : ""}`)
        .join("\n");
      const moreText = leadCount > 5 ? `\n• ...and ${leadCount - 5} more` : "";

      // Send notification email via send-email edge function
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: userEmail,
            subject: `⏰ ${leadCount} unclaimed lead${leadCount !== 1 ? "s" : ""} expiring in ~${hoursLeft} hours`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e; margin-bottom: 16px;">Hi ${firstName},</h2>
                <p style="color: #555; font-size: 14px; line-height: 1.6;">
                  You have <strong>${leadCount} unclaimed lead${leadCount !== 1 ? "s" : ""}</strong> 
                  that will expire in approximately <strong>${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}</strong>.
                </p>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; color: #333;">
                  <p style="margin: 0 0 8px; font-weight: 600;">Expiring leads:</p>
                  <pre style="margin: 0; white-space: pre-wrap; font-family: Arial, sans-serif;">${companyList}${moreText}</pre>
                </div>
                <p style="color: #555; font-size: 14px; line-height: 1.6;">
                  Once expired, these leads will no longer be available for purchase. 
                  Log in now to claim them before they're gone.
                </p>
                <a href="https://aura-risk-group.lovable.app/connect/leads" 
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">
                  View & Claim Leads
                </a>
                <p style="color: #999; font-size: 12px; margin-top: 24px;">
                  — AURA Connect Lead Engine
                </p>
              </div>
            `,
          },
        });
        notifiedCount++;
      } catch (emailErr) {
        console.error(`Failed to send expiry email to ${userEmail}:`, emailErr);
      }

      // Mark as notified
      const leadIds = leads.map((l: any) => l.id);
      await supabase
        .from("unreached_leads")
        .update({ expiry_notified: true })
        .in("id", leadIds);
    }

    // Delete expired leads (past their expires_at)
    const { data: expired, error: deleteError } = await supabase
      .from("unreached_leads")
      .delete()
      .lt("expires_at", now)
      .select("id");

    const deletedCount = expired?.length || 0;

    return new Response(
      JSON.stringify({
        message: `Notified ${notifiedCount} user(s), deleted ${deletedCount} expired leads`,
        notified: notifiedCount,
        deleted: deletedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("check-expiring-leads error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
