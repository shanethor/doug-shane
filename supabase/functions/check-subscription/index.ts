import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error(`Auth error: ${claimsError?.message || "Invalid token"}`);
    const email = claimsData.claims.email as string;
    if (!email) throw new Error("User not authenticated or email not available");
    const user = { email };
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check active subs
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Also check trialing
    let allSubs = [...subscriptions.data];
    const trialing = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 10,
    });
    allSubs = [...allSubs, ...trialing.data];

    if (allSubs.length === 0) {
      logStep("No active subscription");
      return new Response(JSON.stringify({ subscribed: false, has_studio: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find primary (Connect) sub and Studio sub
    const STUDIO_PRICE_ID = "price_1TF5I1EISdUzafyhMrDOU8II";
    let primarySub = allSubs[0];
    let hasStudio = false;

    for (const s of allSubs) {
      const priceId = s.items.data[0]?.price?.id;
      if (priceId === STUDIO_PRICE_ID) {
        hasStudio = true;
      } else {
        primarySub = s;
      }
    }

    let subscriptionEnd: string | null = null;
    const periodEnd = primarySub.current_period_end;
    if (periodEnd && typeof periodEnd === "number" && periodEnd > 0) {
      subscriptionEnd = new Date(periodEnd * 1000).toISOString();
    }
    const productId = primarySub.items.data[0]?.price?.product;
    const isTrialing = primarySub.status === "trialing";
    const branch = primarySub.metadata?.branch || null;

    logStep("Subscription found", { subscriptionEnd, productId, isTrialing, branch, hasStudio });

    return new Response(JSON.stringify({
      subscribed: true,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_trialing: isTrialing,
      branch,
      has_studio: hasStudio,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
