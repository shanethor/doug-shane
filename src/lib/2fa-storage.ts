/**
 * Persistent 2FA verification storage using localStorage + TTL.
 * Replaces sessionStorage so closing the browser doesn't force re-login
 * when a trusted device is in use.
 */

const KEY = "aura_2fa_verified";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredValue {
  verified: boolean;
  expiresAt: number;
}

export function set2FAVerified(): void {
  const value: StoredValue = {
    verified: true,
    expiresAt: Date.now() + TTL_MS,
  };
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function is2FAVerified(): boolean {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const parsed: StoredValue = JSON.parse(raw);
    if (!parsed.verified || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(KEY);
    return false;
  }
}

export function clear2FAVerified(): void {
  localStorage.removeItem(KEY);
}
