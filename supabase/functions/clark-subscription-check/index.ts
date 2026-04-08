import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "dwenz@aurarisk.net";

const PRODUCT_TO_TIER: Record<string, string> = {
  prod_UIKhDnujwDeOYb: "starter",
  prod_UIKiOGZubz4ZBN: "pro",
  prod_UIKigWLViBnKOc: "elite",
};

const TIER_LIMITS: Record<string, number> = {
  starter: 5,
  pro: 25,
  elite: Infinity,
};

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

    // Admin bypass
    if (user.email === ADMIN_EMAIL) {
      return new Response(JSON.stringify({
        tier: "elite",
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
          if (PRODUCT_TO_TIER[productId]) {
            tier = PRODUCT_TO_TIER[productId];
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
    const limit = TIER_LIMITS[tier] ?? 0;

    return new Response(JSON.stringify({
      tier,
      limit,
      used,
      canSubmit: used < limit,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("clark-subscription-check error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
