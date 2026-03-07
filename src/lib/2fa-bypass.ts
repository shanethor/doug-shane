/**
 * Emails that bypass 2FA verification (for testing/admin purposes).
 * These accounts still authenticate normally but skip the OTP step.
 */
const BYPASS_EMAILS: string[] = [
  "shane@houseofthor.com",
  "shanebaseball08@gmail.com",
];

export function is2FABypassed(email: string | undefined | null): boolean {
  if (!email) return false;
  return BYPASS_EMAILS.includes(email.toLowerCase());
}
