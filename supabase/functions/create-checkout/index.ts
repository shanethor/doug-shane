import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AURA Connect pricing: $99.99/mo early access for 3 months, then $249.99/mo
const CONNECT_INTRO_PRICE = "price_1TGt0aEISdUzafyhzRsBV7al";  // $99.99/mo early access
const CONNECT_STANDARD_PRICE = "price_1TGZwaEISdUzafyhLYBp9tyZ"; // $249.99/mo

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Check if already subscribed
    const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const existingTrialing = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
    
    if (existingSubs.data.length > 0 || existingTrialing.data.length > 0) {
      logStep("Already subscribed, redirecting to portal");
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.headers.get("origin")}/connect`,
      });
      return new Response(JSON.stringify({ url: portal.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const body = await req.json().catch(() => ({}));
    const selectedBranch = body.branch || "property";
    const product = body.product || "connect";
    const coupon = body.coupon;
    const successUrl = body.success_url || `${req.headers.get("origin")}/connect?checkout=success`;
    const cancelUrl = body.cancel_url || `${req.headers.get("origin")}/request-access?checkout=cancelled`;

    const isStudio = product === "studio";

    if (isStudio) {
      // Studio: simple checkout with its own price
      const priceId = body.price_id || "price_1TF5I1EISdUzafyhMrDOU8II";
      const sessionParams: any = {
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        subscription_data: {
          metadata: { user_id: user.id, branch: selectedBranch, product },
        },
        metadata: { user_id: user.id, branch: selectedBranch, product },
        success_url: successUrl,
        cancel_url: cancelUrl,
      };
      if (coupon) {
        sessionParams.discounts = [{ coupon }];
      }
      const session = await stripe.checkout.sessions.create(sessionParams);
      logStep("Studio checkout session created", { sessionId: session.id });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // AURA Connect: Use Subscription Schedule for auto price transition
    // Phase 1: 14-day trial + 3 months at $149.99
    // Phase 2: $249.99/mo ongoing
    const now = Math.floor(Date.now() / 1000);

    const schedule = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: now,
      end_behavior: "release", // subscription continues after schedule ends
      metadata: { user_id: user.id, branch: selectedBranch, product: "connect" },
      phases: [
        {
          items: [{ price: CONNECT_INTRO_PRICE, quantity: 1 }],
          iterations: 3, // 3 months at intro price
          trial_end: now + (3 * 24 * 60 * 60), // 3-day trial
          metadata: { pricing_phase: "intro", user_id: user.id, branch: selectedBranch },
        },
        {
          items: [{ price: CONNECT_STANDARD_PRICE, quantity: 1 }],
          metadata: { pricing_phase: "standard", user_id: user.id, branch: selectedBranch },
        },
      ],
    });

    logStep("Subscription schedule created", {
      scheduleId: schedule.id,
      introPrice: CONNECT_INTRO_PRICE,
      standardPrice: CONNECT_STANDARD_PRICE,
    });

    // Since subscription schedules create the subscription directly (no checkout page),
    // we redirect to success URL
    return new Response(JSON.stringify({
      url: successUrl,
      schedule_id: schedule.id,
      message: "Subscription schedule created with 14-day trial, 3 months intro, then standard pricing",
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
