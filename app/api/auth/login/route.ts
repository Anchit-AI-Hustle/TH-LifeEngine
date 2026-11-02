// Sign in with a mobile number and a 4-digit PIN.
//
//   POST /api/auth/login   { mobile: "9876543210", pin: "4827" } -> session cookie
//   POST /api/auth/signup  creates the account (see ../signup)
//   POST /api/auth/logout  clears the cookie
//
// Five wrong PINs lock that number for 15 minutes. An unknown number and a
// wrong PIN get the same answer, so sign-in does not reveal who has an account.
import { NextRequest } from 'next/server';
import { isPinShape } from '@/lib/auth/pin';
import { normalizeMobile, MOBILE_HELP } from '@/lib/auth/phone';
import { checkPin, findAccount, mobileKey } from '@/lib/auth/accounts';
import { lockoutStore, lockMessage, wrongPinMessage, MAX_TRIES } from '@/lib/auth/lockout';
import { authSecret } from '@/lib/auth/session';
import { CLOSED, clientIp, readCredentials, reply, signedIn } from '@/lib/auth/http';
import { importLegacyData } from '@/lib/utils/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Guessing across many numbers from one address: 30 failed sign-ins an hour,
// per address, per server instance.
const IP_WINDOW_MS = 60 * 60_000;
const IP_MAX_FAILS = 30;
const failsByIp = new Map<string, number[]>();

function recentFails(ip: string, now = Date.now()): number[] {
  const kept = (failsByIp.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  failsByIp.set(ip, kept);
  if (failsByIp.size > 5000) failsByIp.clear();
  return kept;
}

export async function POST(req: NextRequest) {
  const secret = authSecret();
  if (!secret) return reply(503, { ok: false, error: CLOSED });

  const { mobile: rawMobile, pin } = await readCredentials(req);
  const mobile = normalizeMobile(rawMobile);
  if (!mobile) return reply(400, { ok: false, field: 'mobile', error: MOBILE_HELP });
  if (!isPinShape(pin)) return reply(400, { ok: false, field: 'pin', error: 'Type your 4-digit PIN, numbers only.' });

  const ip = clientIp(req);
  if (recentFails(ip).length >= IP_MAX_FAILS) {
    return reply(429, { ok: false, locked: true, error: 'Too many failed sign-ins from this connection. Please try again in an hour.' });
  }

  const id = `login:${mobileKey(mobile, secret)}`;
  const store = lockoutStore();
  let accountId: string;
  try {
    // Claim the try before checking it, so parallel guesses cannot get past the limit.
    const claim = await store.claim(id);
    if (!claim.ok) return reply(429, { ok: false, locked: true, error: lockMessage(claim.lockedUntil) });
    if (claim.tries > MAX_TRIES) {
      const until = await store.lock(id);
      return reply(429, { ok: false, locked: true, error: lockMessage(until) });
    }
    const account = await findAccount(mobile, secret);
    // Always run the PIN check, so an unknown number takes as long as a wrong PIN.
    const right = await checkPin(account, pin, secret);
    if (!account || !right) {
      recentFails(ip).push(Date.now());
      console.warn('[Auth] Failed sign-in', { ip, at: new Date().toISOString() });
      if (claim.tries >= MAX_TRIES) {
        const until = await store.lock(id);
        return reply(429, { ok: false, locked: true, error: lockMessage(until) });
      }
      const left = MAX_TRIES - claim.tries;
      return reply(401, { ok: false, field: 'pin', left, error: wrongPinMessage(left) });
    }
    await store.reset(id);
    accountId = account.id;
  } catch (e) {
    console.error('[Auth] Sign-in unavailable', e instanceof Error ? e.message : e);
    return reply(503, { ok: false, error: 'Sign-in is unavailable right now. Please try again in a minute.' });
  }

  await importLegacyData(accountId, mobile, pin).catch((e) => console.error('[Auth] Legacy import failed', e));
  return signedIn(accountId, secret);
}
