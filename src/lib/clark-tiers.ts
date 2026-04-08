/**
 * Clark AI Tool — Stripe tier configuration
 */

export const CLARK_TIERS = {
  starter: {
    name: "Starter",
    price_id: "price_1TJk22EISdUzafyh8ebbq6g1",
    product_id: "prod_UIKhDnujwDeOYb",
    monthlyLimit: 5,
    priceLabel: "$49/mo",
  },
  pro: {
    name: "Pro",
    price_id: "price_1TJk2eEISdUzafyhCusmqxer",
    product_id: "prod_UIKiOGZubz4ZBN",
    monthlyLimit: 25,
    priceLabel: "$99/mo",
  },
  elite: {
    name: "Elite",
    price_id: "price_1TJk2wEISdUzafyhOZJvIDRZ",
    product_id: "prod_UIKigWLViBnKOc",
    monthlyLimit: Infinity,
    priceLabel: "$249/mo",
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
