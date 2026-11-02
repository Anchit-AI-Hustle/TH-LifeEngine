// Delete the signed-in account and everything saved under it.
//
//   POST /api/me/delete { mobile, pin } -> { ok: true } and the session cookie cleared
//
// The number and PIN are asked for again, must belong to the signed-in
// account, and count towards the same five-try lock as sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { isPinShape } from '@/lib/auth/pin';
import { normalizeMobile, MOBILE_HELP } from '@/lib/auth/phone';
import { checkPin, deleteAccount, findAccount, mobileKey } from '@/lib/auth/accounts';
import { lockoutStore, lockMessage, MAX_TRIES } from '@/lib/auth/lockout';
import { authSecret, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { CLOSED, readCredentials, reply } from '@/lib/auth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

declare global {
  var TH_PLANS: Map<string, any> | undefined;
}

export async function POST(req: NextRequest) {
  const secret = authSecret();
  if (!secret) return reply(503, { ok: false, error: CLOSED });
  const uid = await currentUserId();
  if (!uid) return reply(401, { ok: false, error: 'Please sign in again first.' });

  const { mobile: rawMobile, pin } = await readCredentials(req);
  const mobile = normalizeMobile(rawMobile);
  if (!mobile) return reply(400, { ok: false, field: 'mobile', error: MOBILE_HELP });
  if (!isPinShape(pin)) return reply(400, { ok: false, field: 'pin', error: 'Type your 4-digit PIN, numbers only.' });

  const id = `login:${mobileKey(mobile, secret)}`;
  const store = lockoutStore();
  try {
    const claim = await store.claim(id);
    if (!claim.ok) return reply(429, { ok: false, locked: true, error: lockMessage(claim.lockedUntil) });
    if (claim.tries > MAX_TRIES) {
      const until = await store.lock(id);
      return reply(429, { ok: false, locked: true, error: lockMessage(until) });
    }
    const account = await findAccount(mobile, secret);
    const right = await checkPin(account, pin, secret);
    // Someone else's number and PIN must not delete that other account.
    if (!account || !right || account.id !== uid) {
      if (claim.tries >= MAX_TRIES) {
        const until = await store.lock(id);
        return reply(429, { ok: false, locked: true, error: lockMessage(until) });
      }
      const left = MAX_TRIES - claim.tries;
      return reply(401, {
        ok: false,
        field: 'pin',
        left,
        error: `That number and PIN do not match the account you are signed in to. ${left} ${left === 1 ? 'try' : 'tries'} left.`,
      });
    }
    await store.reset(id);
    const removed = await deleteAccount(mobile, account, secret);
    console.info('[Auth] Account deleted', { storedFilesRemoved: removed, at: new Date().toISOString() });
  } catch (e) {
    console.error('[Auth] Account deletion failed', e instanceof Error ? e.message : e);
    return reply(503, { ok: false, error: 'Your account could not be fully deleted right now. Please try again in a minute.' });
  }

  // Plans kept in this server's memory for quick reads.
  for (const [planId, plan] of globalThis.TH_PLANS ?? []) {
    if (plan?.ownerId === uid) globalThis.TH_PLANS?.delete(planId);
  }

  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
