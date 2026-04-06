import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { buildSystemPrompt } from "./system-prompt.ts";
import { enrichContext } from "./context-enrichment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_DAILY_LIMIT = 10;

async function isSubscriber(userId: string, supabase: any): Promise<boolean> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return false;

  // Get user email from profile or auth
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    // Fallback: lookup by auth email
    const { data: { user } } = await supabase.auth.admin.getUser(userId);
    if (!user?.email) return false;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) return false;
    customerId = customers.data[0].id;
  }

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
  return subs.data.length > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");

    // --- Subscription & query limit check ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    if (userId) {
      const subscribed = await isSubscriber(userId, supabase);
      if (!subscribed) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const { count } = await supabase
          .from("sage_conversations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", startOfDay);

        if ((count || 0) >= FREE_DAILY_LIMIT) {
          return new Response(
            JSON.stringify({ error: "Daily query limit reached. Upgrade to Connect for unlimited Clark access." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Enrich context from DB if not provided
    let enrichedContext = context || {};
    if (authHeader && (!context || Object.keys(context).length === 0)) {
      enrichedContext = await enrichContext(authHeader);
    }

    const systemPrompt = buildSystemPrompt(enrichedContext);

    // Pass messages as-is to support vision content blocks (multimodal)
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("connect-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});