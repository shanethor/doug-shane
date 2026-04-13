import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Emails that always get unlimited access without Stripe */
const ADMIN_EMAILS = new Set([
  "dwenz@aurarisk.net",
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
]);

/** All Stripe product IDs (current + legacy) that map to the single unlimited plan */
const UNLIMITED_PRODUCT_IDS = new Set([
  "prod_UIL7wOFaZIvNcS",  // current unlimited (was elite)
  "prod_UIL4LdZKBoNI3Y",  // legacy starter
  "prod_UIL4fc1vH7hi7J",  // legacy pro
  "prod_UIKhDnujwDeOYb",  // legacy starter v1
  "prod_UIKiOGZubz4ZBN",  // legacy pro v1
  "prod_UIKigWLViBnKOc",  // legacy elite v1
]);

/** Soft cap per month — triggers notification to admin for outreach */
const MONTHLY_SOFT_CAP = 100;
const CAP_NOTIFY_EMAIL = "shane@houseofthor.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Authentication failed");

    // Admin bypass — unlimited, no Stripe check needed
    if (user.email && ADMIN_EMAILS.has(user.email)) {
      return new Response(JSON.stringify({
        tier: "unlimited",
        limit: Infinity,
        used: 0,
        canSubmit: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check Stripe subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let tier = "free";

    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Resolve customer
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      let customerId = profile?.stripe_customer_id;
      if (!customerId && user.email) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      }

      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "active" });
        for (const sub of subs.data) {
          const productId = sub.items.data[0]?.price?.product as string;
          if (UNLIMITED_PRODUCT_IDS.has(productId)) {
            tier = "unlimited";
            break;
          }
        }
      }
    }

    // Count submissions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("clark_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const used = count || 0;

    // If paying user just hit the soft cap, fire a notification
    if (tier === "unlimited" && used === MONTHLY_SOFT_CAP) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "AURA <noreply@buildingaura.site>",
              to: [CAP_NOTIFY_EMAIL],
              subject: `Clark: ${user.email} hit ${MONTHLY_SOFT_CAP} submissions this month`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                  <h2 style="color:#1a1a2e;">High-Volume Clark User</h2>
                  <p><strong>${user.email}</strong> just reached <strong>${MONTHLY_SOFT_CAP} submissions</strong> this billing period.</p>
                  <p>This is the soft cap trigger. Consider reaching out to discuss their usage, offer a dedicated plan, or check if they need support.</p>
                  <p style="color:#888;font-size:12px;margin-top:24px;">User ID: ${user.id}</p>
                </div>
              `,
            }),
          });
          console.log(`Cap notification sent for ${user.email}`);
        } catch (notifyErr) {
          console.error("Failed to send cap notification:", notifyErr);
        }
      }
    }

    return new Response(JSON.stringify({
      tier,
      limit: tier === "unlimited" ? Infinity : 0,
      used,
      canSubmit: tier === "unlimited",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("clark-subscription-check error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
