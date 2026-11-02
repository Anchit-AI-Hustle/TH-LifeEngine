// PIN hashing. Runs on the server only (Node runtime): it needs node:crypto.
//
// A 4-digit PIN has ten thousand possibilities, so a stored hash alone could
// be brute-forced offline in moments. Two things stop that:
// - scrypt makes each guess slow; and
// - the scrypt output is then HMAC'd with AUTH_SECRET (a "pepper") that only
//   the server holds, so a leaked account record cannot be tested offline.
// The PIN itself is never stored anywhere.
import { createHmac, scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

export { PIN_LEN, PIN_RE, isPinShape, pinProblem } from './pinRules';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

export type PinHash = { salt: string; hash: string };

function derive(pin: string, salt: string, pepper: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) => {
      if (err) reject(err);
      else resolve(createHmac('sha256', pepper).update(key).digest());
    });
  });
}

export async function hashPin(pin: string, pepper: string): Promise<PinHash> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(pin, salt, pepper);
  return { salt, hash: key.toString('hex') };
}

// Constant-time compare, so the answer cannot be learned one digit at a time
// from how long the reply takes.
export async function verifyPin(pin: string, stored: PinHash, pepper: string): Promise<boolean> {
  const a = await derive(pin, stored.salt, pepper);
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Spend the same time as a real check, for numbers with no account. */
export async function burnPinCheck(pin: string, pepper: string): Promise<void> {
  await derive(pin, '00000000000000000000000000000000', pepper);
}
