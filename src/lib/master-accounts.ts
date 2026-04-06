/**
 * Single source of truth for master / super-admin email addresses.
 *
 * ⚠️  This is a client-side convenience check only.
 *     Real authorization must happen server-side (RLS / edge-function JWT checks).
 *     Treat this as a UI hint, never as a security gate.
 *
 * TODO: migrate to a DB-backed `user_roles` admin flag so the list
 *       is not baked into the bundle at all.
 */

const MASTER_EMAIL_SET = new Set([
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
]);

/** Emails that appear in the whitelist for early-access features */
const WHITELISTED_EMAIL_SET = new Set([
  ...MASTER_EMAIL_SET,
  "shafer.cailin@gmail.com",
]);

export function isMasterEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return MASTER_EMAIL_SET.has(email.toLowerCase());
}

export function isWhitelistedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return WHITELISTED_EMAIL_SET.has(email.toLowerCase());
}

/**
 * @deprecated — only kept so existing imports don't break during migration.
 * Prefer `isMasterEmail()` for new code.
 */
export const MASTER_EMAILS = Array.from(MASTER_EMAIL_SET);
