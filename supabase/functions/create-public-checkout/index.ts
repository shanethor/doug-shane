import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AURA Connect pricing: $99.99/mo early access for 3 months, then $249.99/mo
const CONNECT_INTRO_PRICE = "price_1TGt0aEISdUzafyhzRsBV7al";
const CONNECT_STANDARD_PRICE = "price_1TGZwaEISdUzafyhLYBp9tyZ";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email;
    if (!email) throw new Error("Email is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check if already subscribed
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      const trialing = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
      if (subs.data.length > 0 || trialing.data.length > 0) {
        return new Response(JSON.stringify({ already_subscribed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      const newCustomer = await stripe.customers.create({
        email,
        metadata: { signup_source: "public_checkout" },
      });
      customerId = newCustomer.id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const now = Math.floor(Date.now() / 1000);

    // Create subscription schedule: 14-day trial + 3 months intro, then standard
    const schedule = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: now,
      end_behavior: "release",
      metadata: { signup_email: email, product: "connect" },
      phases: [
        {
          items: [{ price: CONNECT_INTRO_PRICE, quantity: 1 }],
          iterations: 3,
          trial_end: now + (3 * 24 * 60 * 60), // 3-day trial
          metadata: { pricing_phase: "intro", signup_email: email },
        },
        {
          items: [{ price: CONNECT_STANDARD_PRICE, quantity: 1 }],
          metadata: { pricing_phase: "standard", signup_email: email },
        },
      ],
    });

    console.log("[create-public-checkout] Schedule created:", schedule.id);

    // For public checkout, we still need to collect payment method
    // Create a checkout session in setup mode to collect payment details
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      metadata: { signup_email: email, schedule_id: schedule.id },
      success_url: `${origin}/onboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/request-access?checkout=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url, schedule_id: schedule.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-public-checkout] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
