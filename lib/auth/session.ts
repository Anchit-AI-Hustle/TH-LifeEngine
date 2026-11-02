// The session cookie. Edge-safe (WebCrypto only), so the middleware and the
// route handlers share one implementation.
//
// The cookie carries the account id, a fixed expiry, a random nonce and an
// HMAC over all three, keyed from AUTH_SECRET:
// - nobody without the server secret can mint or alter a session; and
// - rotating AUTH_SECRET signs out every device at once.
// The cookie is httpOnly, Secure (in production) and SameSite=Lax.
export const SESSION_COOKIE = 'th-session';
export const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60; // seconds

// v3 adds the account id. Older single-owner (v2) cookies no longer verify,
// so anyone signed in before accounts existed is asked to sign in again.
const VERSION = 'v3';
const enc = new TextEncoder();
const UID_RE = /^[A-Za-z0-9_-]{16,64}$/;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function keyFrom(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest('SHA-256', enc.encode(`th-lifeengine-session-${VERSION}\n${secret}`));
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/**
 * The server secret sessions and PIN hashes are bound to, or null when it is
 * missing or too short, in which case sign-in stays closed.
 */
export function authSecret(): string | null {
  const v = process.env.AUTH_SECRET?.trim();
  return v && v.length >= 32 ? v : null;
}

export async function createSessionToken(secret: string, uid: string, nowMs: number = Date.now()): Promise<string> {
  if (!UID_RE.test(uid)) throw new Error('bad account id');
  const exp = Math.floor(nowMs / 1000) + SESSION_MAX_AGE;
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const body = `${VERSION}.${exp}.${uid}.${nonce}`;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await keyFrom(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** The account id a valid, unexpired token belongs to, or null. */
export async function readSessionToken(
  token: string | undefined | null,
  secret: string | null,
  nowMs: number = Date.now(),
): Promise<string | null> {
  if (!token || !secret || token.length > 512) return null;
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== VERSION || !/^\d{1,12}$/.test(parts[1])) return null;
  if (Number(parts[1]) * 1000 <= nowMs) return null;
  if (!UID_RE.test(parts[2])) return null;
  const sig = fromB64url(parts[4]);
  // Canonical encoding only, so one signature has exactly one spelling.
  if (!sig || sig.length !== 32 || b64url(sig) !== parts[4]) return null;
  // crypto.subtle.verify compares in constant time.
  const ok = await crypto.subtle.verify('HMAC', await keyFrom(secret), sig, enc.encode(parts.slice(0, 4).join('.')));
  return ok ? parts[2] : null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}
