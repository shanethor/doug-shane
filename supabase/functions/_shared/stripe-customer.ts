/**
 * Resolve a Stripe customer ID for a given user.
 *
 * Priority:
 *  1. profiles.stripe_customer_id  (fast, no Stripe API call)
 *  2. Stripe customer lookup by email (fallback, then persist the ID)
 *  3. Create a new Stripe customer (if none found, then persist the ID)
 *
 * Always call with the service-role Supabase client so we can read/write profiles.
 */
import type Stripe from "https://esm.sh/stripe@18.5.0";

interface ResolveResult {
  customerId: string;
  created: boolean;
}

export async function resolveStripeCustomer(
  stripe: Stripe,
  supaAdmin: any,
  userId: string,
  email: string,
  opts?: { createIfMissing?: boolean },
): Promise<ResolveResult | null> {
  const createIfMissing = opts?.createIfMissing ?? true;

  // 1. Check profiles table first
  const { data: profile } = await supaAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    return { customerId: profile.stripe_customer_id, created: false };
  }

  // 2. Fallback: search Stripe by email
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    const cid = customers.data[0].id;
    // Persist for future lookups
    await persistCustomerId(supaAdmin, userId, cid);
    return { customerId: cid, created: false };
  }

  // 3. Create if allowed
  if (!createIfMissing) return null;

  const newCustomer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });
  await persistCustomerId(supaAdmin, userId, newCustomer.id);
  return { customerId: newCustomer.id, created: true };
}

async function persistCustomerId(supaAdmin: any, userId: string, customerId: string) {
  await supaAdmin
    .from("profiles")
    .update({ stripe_customer_id: customerId } as any)
    .eq("user_id", userId);
}
