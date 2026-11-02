// Who is signed in: { mobile: "+91 ••••• •5238" }. Never returns the full number.
import { currentUserId } from '@/lib/auth';
import { accountLabel } from '@/lib/auth/accounts';
import { reply } from '@/lib/auth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return reply(401, { ok: false });
  const mobile = await accountLabel(uid).catch(() => null);
  return reply(200, { ok: true, mobile });
}
