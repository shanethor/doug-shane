import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEAD_PACKS: Record<string, { price_id: string; leads: number }> = {
  "10":  { price_id: "price_1TFoIfEISdUzafyhBSXM0ZsV", leads: 10 },
  "25":  { price_id: "price_1TFoKxEISdUzafyhF3Oj5Bql", leads: 25 },
  "50":  { price_id: "price_1TFoLFEISdUzafyh8nbp9PwC", leads: 50 },
  "100": { price_id: "price_1TFoMVEISdUzafyh0JQXinEw", leads: 100 },
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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { pack } = await req.json();
    const selectedPack = LEAD_PACKS[String(pack)];
    if (!selectedPack) throw new Error("Invalid lead pack selection");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: selectedPack.price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/connect/leads?purchased=${selectedPack.leads}`,
      cancel_url: `${req.headers.get("origin")}/connect/leads`,
      metadata: {
        user_id: user.id,
        lead_count: String(selectedPack.leads),
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
