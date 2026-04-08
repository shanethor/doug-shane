/**
 * Clark AI Tool — Stripe tier configuration
 */

export const CLARK_TIERS = {
  starter: {
    name: "Starter",
    price_id: "price_1TJkOIEISdUzafyhGaX4kcEd",
    product_id: "prod_UIL4LdZKBoNI3Y",
    monthlyLimit: 3,
    priceLabel: "$49.99/mo",
    priceNum: 49.99,
    features: [
      "3 AI submissions per month",
      "ACORD form generation",
      "Client questionnaires",
      "PDF extraction & mapping",
    ],
  },
  pro: {
    name: "Pro",
    price_id: "price_1TJkOkEISdUzafyhJMMxz8Mu",
    product_id: "prod_UIL4fc1vH7hi7J",
    monthlyLimit: 10,
    priceLabel: "$149.99/mo",
    priceNum: 149.99,
    features: [
      "10 AI submissions per month",
      "Everything in Starter",
      "Priority processing",
      "Carrier-specific packaging",
    ],
  },
  elite: {
    name: "Elite",
    price_id: "price_1TJkQsEISdUzafyhkCGa3JWL",
    product_id: "prod_UIL7wOFaZIvNcS",
    monthlyLimit: Infinity,
    priceLabel: "$399.99/mo",
    priceNum: 399.99,
    features: [
      "Unlimited submissions",
      "Everything in Pro",
      "10 targeted & verified leads/mo",
      "White-glove support",
    ],
  },
} as const;

export type ClarkTierKey = keyof typeof CLARK_TIERS;

/** Admin email that always gets Elite access */
export const CLARK_ADMIN_EMAIL = "dwenz@aurarisk.net";

export function getTierByProductId(productId: string): ClarkTierKey | null {
  for (const [key, tier] of Object.entries(CLARK_TIERS)) {
    if (tier.product_id === productId) return key as ClarkTierKey;
  }
  return null;
}
