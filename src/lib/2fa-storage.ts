/**
 * Persistent 2FA verification storage.
 * - "remember" mode: localStorage with 7-day TTL (survives browser close)
 * - "session" mode: sessionStorage (cleared when browser closes)
 */

const KEY = "aura_2fa_verified";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredValue {
  verified: boolean;
  expiresAt: number;
}

/**
 * Mark 2FA as verified.
 * @param persistent – true = remember for 7 days (localStorage), false = session only (sessionStorage)
 */
export function set2FAVerified(persistent = false): void {
  const value: StoredValue = {
    verified: true,
    expiresAt: Date.now() + TTL_MS,
  };
  const json = JSON.stringify(value);
  if (persistent) {
    localStorage.setItem(KEY, json);
  } else {
    // Session-only: cleared when browser/tab closes
    sessionStorage.setItem(KEY, json);
    // Clean up any leftover persistent entry
    localStorage.removeItem(KEY);
  }
}

export function is2FAVerified(): boolean {
  // Check localStorage first (persistent remember), then sessionStorage (session-only)
  const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const parsed: StoredValue = JSON.parse(raw);
    if (!parsed.verified || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    return false;
  }
}

export function clear2FAVerified(): void {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
