import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reward definitions: reward_id -> credit amount in cents
const REWARD_AMOUNTS: Record<string, number> = {
  acct_5: 500,
  acct_10: 1000,
  acct_all: 1500,
  cont_100: 500,
  cont_250: 1000,
  cont_500: 1500,
  cont_1000: 5000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { reward_id } = await req.json();
    if (!reward_id || !REWARD_AMOUNTS[reward_id]) {
      throw new Error("Invalid reward_id");
    }

    const amountOff = REWARD_AMOUNTS[reward_id];

    // Check if already claimed
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("metadata")
      .eq("user_id", user.id)
      .maybeSingle();

    const meta = (profile as any)?.metadata || {};
    const claimed: string[] = meta.claimed_rewards || [];
    if (claimed.includes(reward_id)) {
      throw new Error("Reward already claimed");
    }

    // Create a one-time Stripe coupon and apply it
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No active subscription found. Subscribe first to claim rewards.");
    }
    const customerId = customers.data[0].id;

    // Find active subscription
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    if (subs.data.length === 0) {
      throw new Error("No active subscription found. Subscribe first to claim rewards.");
    }

    // Create one-time coupon
    const coupon = await stripe.coupons.create({
      amount_off: amountOff,
      currency: "usd",
      duration: "once",
      name: `Connect Reward: ${reward_id}`,
      max_redemptions: 1,
    });

    // Apply as credit to the next invoice via a discount on the subscription
    await stripe.subscriptions.update(subs.data[0].id, {
      discounts: [
        ...(subs.data[0].discounts || []).map((d: any) => ({ discount: typeof d === "string" ? d : d.id })),
        { coupon: coupon.id },
      ],
    });

    // Mark as claimed in profile metadata
    const newClaimed = [...claimed, reward_id];
    await supabaseAdmin
      .from("profiles")
      .update({ metadata: { ...meta, claimed_rewards: newClaimed } } as any)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true, credit: amountOff / 100 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[claim-connect-reward]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
