import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Check if already subscribed
    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length > 0) {
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
    }

    const body = await req.json().catch(() => ({}));
    const selectedBranch = body.branch || "property";
    const product = body.product || "connect";
    const priceId = body.price_id || "price_1TCnlREISdUzafyhciDRHyxM";
    const coupon = body.coupon;
    const successUrl = body.success_url || `${req.headers.get("origin")}/connect?checkout=success`;
    const cancelUrl = body.cancel_url || `${req.headers.get("origin")}/request-access?checkout=cancelled`;

    const isStudio = product === "studio";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        metadata: { user_id: user.id, branch: selectedBranch, product },
      },
      metadata: { user_id: user.id, branch: selectedBranch, product },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    // Apply discounts: Studio uses passed coupon, Connect uses intro coupon + trial
    if (isStudio && coupon) {
      sessionParams.discounts = [{ coupon }];
    } else if (!isStudio) {
      sessionParams.discounts = [{ coupon: "9BtS7KcT" }];
      sessionParams.subscription_data.trial_period_days = 14;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
