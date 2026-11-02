// Tracking data the browser keeps (habits, sleep, fitness, plan progress),
// stored per account so it follows the person to any device.
//
//   GET /api/me/data                       -> { docs: { [key]: { value, updatedAt } } }
//   PUT /api/me/data { docs: { [key]: { value, updatedAt } } } -> { ok: true, stale: [] }
//                   (or a single { key, value, updatedAt })
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

type Incoming = { value?: unknown; updatedAt?: unknown };

export async function PUT(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return reply(401, { ok: false });

  let body: { key?: unknown; value?: unknown; updatedAt?: unknown; docs?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: 'Expected JSON.' });
  }
  // A batch { docs: { [key]: { value, updatedAt } } }, or one { key, value, updatedAt }.
  const incoming: Record<string, Incoming> =
    body.docs && typeof body.docs === 'object' && !Array.isArray(body.docs)
      ? (body.docs as Record<string, Incoming>)
      : typeof body.key === 'string'
        ? { [body.key]: { value: body.value, updatedAt: body.updatedAt } }
        : {};
  const keys = Object.keys(incoming);
  if (!keys.length || keys.some((k) => !(SYNCED_KEYS as readonly string[]).includes(k))) {
    return reply(400, { ok: false, error: 'Unknown data key.' });
  }
  if (JSON.stringify(incoming).length > MAX_BYTES) {
    return reply(413, { ok: false, error: 'That is more data than the account can hold in one save.' });
  }

  // One read and one write for the whole batch, so keys saved together never
  // overwrite each other.
  const docs = (await readJson<SyncedDocs>(docKey(uid))) ?? {};
  const stale: string[] = [];
  for (const key of keys) {
    const { value, updatedAt: raw } = incoming[key] ?? {};
    const updatedAt = typeof raw === 'number' && Number.isFinite(raw) ? raw : Date.now();
    const existing = docs[key];
    // Last write wins, but an older write (a slow tab) never replaces a newer one.
    if (existing && existing.updatedAt > updatedAt) {
      stale.push(key);
      continue;
    }
    docs[key] = { value: value ?? null, updatedAt };
  }
  if (stale.length < keys.length) await writeJson(docKey(uid), docs);
  if (stale.length === keys.length) return reply(409, { ok: false, stale });
  return reply(200, { ok: true, stale });
}
