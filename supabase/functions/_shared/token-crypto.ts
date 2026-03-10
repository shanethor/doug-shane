/**
 * AES-256-GCM encryption/decryption for OAuth tokens at rest.
 *
 * Cipher-text format (base64 of):  iv (12 bytes) || ciphertext || tag (16 bytes)
 *
 * The key is read from the EMAIL_TOKEN_ENC_KEY env var (64-char hex = 32 bytes).
 */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

let _key: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key;
  const hex = Deno.env.get("EMAIL_TOKEN_ENC_KEY");
  if (!hex || hex.length !== 64) {
    throw new Error("EMAIL_TOKEN_ENC_KEY must be a 64-char hex string (256-bit key)");
  }
  _key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(hex),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return _key;
}

/** Encrypt a plaintext string → base64 ciphertext */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64 ciphertext → plaintext string */
export async function decryptToken(ciphertext: string): Promise<string> {
  const key = await getKey();
  const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

/**
 * Detect whether a stored value is already encrypted (base64 ciphertext)
 * vs plaintext (raw OAuth token).  OAuth tokens are typically long alphanumeric/dot strings,
 * while our ciphertext is base64 of binary data that starts with a random IV.
 *
 * Heuristic: if it decodes to valid plaintext via our key, it's encrypted.
 * If decryption fails, assume plaintext.
 */
export async function safeDecrypt(storedValue: string): Promise<string> {
  if (!storedValue) return storedValue;
  try {
    return await decryptToken(storedValue);
  } catch {
    // Decryption failed → value is still plaintext (pre-migration)
    return storedValue;
  }
}
