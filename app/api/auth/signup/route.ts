// Create an account with a mobile number and a 4-digit PIN, and sign in.
//
//   POST /api/auth/signup { mobile: "9876543210", pin: "4827" } -> session cookie
//
// There is no SMS check (the app has no SMS provider), so the number is an
// identifier the person chooses, not a verified one.
import { NextRequest } from 'next/server';
import { isPinShape, pinProblem } from '@/lib/auth/pin';
import { normalizeMobile, MOBILE_HELP } from '@/lib/auth/phone';
import { AccountExistsError, createAccount } from '@/lib/auth/accounts';
import { authSecret } from '@/lib/auth/session';
import { CLOSED, clientIp, readCredentials, reply, signedIn } from '@/lib/auth/http';
import { importLegacyData } from '@/lib/utils/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A light brake on scripted sign-ups: 10 per address per hour, per instance.
const WINDOW_MS = 60 * 60_000;
const MAX_PER_WINDOW = 10;
const recent = new Map<string, number[]>();

function tooMany(ip: string, now = Date.now()): boolean {
  const kept = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  kept.push(now);
  recent.set(ip, kept);
  if (recent.size > 5000) recent.clear();
  return kept.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const secret = authSecret();
  if (!secret) return reply(503, { ok: false, error: CLOSED });

  const { mobile: rawMobile, pin } = await readCredentials(req);
  const mobile = normalizeMobile(rawMobile);
  if (!mobile) return reply(400, { ok: false, field: 'mobile', error: MOBILE_HELP });
  if (!isPinShape(pin)) return reply(400, { ok: false, field: 'pin', error: 'Choose a PIN of exactly 4 numbers.' });
  const problem = pinProblem(pin, mobile);
  if (problem) return reply(400, { ok: false, field: 'pin', error: problem });

  if (tooMany(clientIp(req))) {
    return reply(429, { ok: false, error: 'Too many new accounts from this connection. Please try again later.' });
  }

  let accountId: string;
  try {
    accountId = (await createAccount(mobile, pin, secret)).id;
  } catch (e) {
    if (e instanceof AccountExistsError) {
      return reply(409, {
        ok: false,
        field: 'mobile',
        exists: true,
        error: 'This number already has an account. Sign in with its PIN instead.',
      });
    }
    console.error('[Auth] Sign-up unavailable', e instanceof Error ? e.message : e);
    return reply(503, { ok: false, error: 'Could not create the account right now. Please try again in a minute.' });
  }

  await importLegacyData(accountId, mobile, pin).catch((e) => console.error('[Auth] Legacy import failed', e));
  return signedIn(accountId, secret);
}
