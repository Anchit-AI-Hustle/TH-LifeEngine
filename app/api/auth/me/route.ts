// Who is signed in: { mobile: "+91 ••••• •5238", owner }. Never returns the full
// number, nor the account id (it is part of the account's storage paths);
// `owner` is a one-way tag the browser uses to notice an account switch.
import { createHash } from 'node:crypto';
import { currentUserId } from '@/lib/auth';
import { accountLabel } from '@/lib/auth/accounts';
import { reply } from '@/lib/auth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return reply(401, { ok: false });
  const mobile = await accountLabel(uid).catch(() => null);
  const owner = createHash('sha256').update(`owner:${uid}`).digest('base64url').slice(0, 22);
  return reply(200, { ok: true, mobile, owner });
}
