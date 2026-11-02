// Proof that a new account belongs to the app's original owner. Server only.
//
// Before accounts, the one way in was a PIN whose scrypt "salt:hash" sits in
// APP_PIN_HASH. Numbers are not verified by SMS, so matching
// LEGACY_OWNER_MOBILE alone would let anyone who signs up with the owner's
// number first take the old data. Knowing the old PIN is the proof.
import { scrypt, timingSafeEqual } from 'node:crypto';

// Must match the parameters APP_PIN_HASH was made with.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

export async function isLegacyOwnerPin(pin: string): Promise<boolean> {
  const m = /^([0-9a-f]{32}):([0-9a-f]{64})$/.exec(process.env.APP_PIN_HASH?.trim() ?? '');
  if (!m) return false;
  const key = await new Promise<Buffer>((resolve, reject) =>
    scrypt(pin, m[1], SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, k) => (err ? reject(err) : resolve(k))),
  );
  const want = Buffer.from(m[2], 'hex');
  return key.length === want.length && timingSafeEqual(key, want);
}
