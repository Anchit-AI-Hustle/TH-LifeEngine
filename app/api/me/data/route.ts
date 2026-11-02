// Tracking data the browser keeps (habits, sleep, fitness, plan progress),
// stored per account so it follows the person to any device.
//
//   GET /api/me/data                       -> { docs: { [key]: { value, updatedAt } } }
//   PUT /api/me/data { key, value, updatedAt } -> { ok: true }
//
// Only the keys below are accepted; each is one JSON document inside
// users/<account id>/client-data.json.
import { NextRequest } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { reply } from '@/lib/auth/http';
import { readJson, writeJson } from '@/lib/storage/jsonStore';
import { SYNCED_KEYS, type SyncedDocs } from '@/lib/sync/keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 1_000_000;
const docKey = (uid: string) => `users/${uid}/client-data.json`;

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return reply(401, { ok: false });
  const docs = (await readJson<SyncedDocs>(docKey(uid))) ?? {};
  return reply(200, { ok: true, docs });
}

export async function PUT(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return reply(401, { ok: false });

  let body: { key?: unknown; value?: unknown; updatedAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: 'Expected JSON.' });
  }
  const key = body.key;
  if (typeof key !== 'string' || !(SYNCED_KEYS as readonly string[]).includes(key)) {
    return reply(400, { ok: false, error: 'Unknown data key.' });
  }
  const updatedAt = typeof body.updatedAt === 'number' && Number.isFinite(body.updatedAt) ? body.updatedAt : Date.now();
  if (JSON.stringify(body.value ?? null).length > MAX_BYTES) {
    return reply(413, { ok: false, error: 'That is more data than one entry can hold.' });
  }

  const docs = (await readJson<SyncedDocs>(docKey(uid))) ?? {};
  const existing = docs[key];
  // Last write wins, but an older write (a slow tab) never replaces a newer one.
  if (existing && existing.updatedAt > updatedAt) {
    return reply(409, { ok: false, stale: true, current: existing });
  }
  docs[key] = { value: body.value ?? null, updatedAt };
  await writeJson(docKey(uid), docs);
  return reply(200, { ok: true });
}
