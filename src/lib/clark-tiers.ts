/**
 * Clark AI Tool — Stripe tier configuration
 *
 * Single plan: $299.99/month "Unlimited" (soft cap at 100 submissions,
 * triggers notification to shane@houseofthor.com for outreach).
 */

export const CLARK_TIERS = {
  unlimited: {
    name: "Unlimited",
    price_id: "price_1TJkQsEISdUzafyhkCGa3JWL", // reuse existing Elite Stripe price — update in Stripe dashboard to $299.99
    product_id: "prod_UIL7wOFaZIvNcS",
    monthlyLimit: Infinity,
    priceLabel: "$299.99/mo",
    priceNum: 299.99,
    features: [
      "Unlimited AI submissions",
      "ACORD form generation (125, 126, 127, 130)",
      "Client questionnaires & outreach",
      "PDF extraction & smart field mapping",
      "Carrier-specific packaging",
      "Priority processing",
    ],
  },
} as const;

/** Legacy Stripe product IDs that should still resolve to "unlimited" */
export const LEGACY_PRODUCT_IDS = [
  "prod_UIL4LdZKBoNI3Y", // old starter
  "prod_UIL4fc1vH7hi7J", // old pro
  "prod_UIL7wOFaZIvNcS", // old elite (now unlimited)
  "prod_UIKhDnujwDeOYb", // legacy starter
  "prod_UIKiOGZubz4ZBN", // legacy pro
  "prod_UIKigWLViBnKOc", // legacy elite
];

export type ClarkTierKey = keyof typeof CLARK_TIERS;

/** Emails that always get full access without a Stripe subscription */
export const CLARK_ADMIN_EMAILS = [
  "dwenz@aurarisk.net",
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
];

/** Soft cap — triggers outreach notification when hit in a month */
export const CLARK_MONTHLY_SOFT_CAP = 100;

export function getTierByProductId(productId: string): ClarkTierKey | null {
  if (LEGACY_PRODUCT_IDS.includes(productId)) return "unlimited";
  if (CLARK_TIERS.unlimited.product_id === productId) return "unlimited";
  return null;
}
