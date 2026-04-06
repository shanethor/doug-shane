import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveStripeCustomer } from "../_shared/stripe-customer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PACKS = [10, 25, 50, 100];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supaAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supaAdmin.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { pack, price, vertical } = await req.json();
    const packNum = Number(pack);
    const priceNum = Number(price);

    if (!VALID_PACKS.includes(packNum)) throw new Error("Invalid lead pack selection");
    if (!priceNum || priceNum < 100 || priceNum > 500000) throw new Error("Invalid price");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { customerId } = (await resolveStripeCustomer(stripe, supaAdmin, user.id, user.email))!;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `${packNum} ${vertical || "Commercial"} Leads`,
            description: `Pack of ${packNum} verified, exclusive leads`,
          },
          unit_amount: priceNum,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/connect/leads?purchased=${packNum}`,
      cancel_url: `${req.headers.get("origin")}/connect/leads`,
      metadata: {
        user_id: user.id,
        lead_count: String(packNum),
        vertical: vertical || "general",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
