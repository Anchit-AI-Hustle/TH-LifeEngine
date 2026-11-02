'use client';
// Keeps the browser copies of SYNCED_KEYS in step with the signed-in account.
//
// - hydrate(): before pages read storage, pull the account's data. Newer
//   server copies replace local ones; local data the account does not have
//   yet (saved before sync existed) is uploaded, so nothing is lost.
// - markChanged(key): stores call this after every write; the value is sent
//   to the account shortly after (debounced, retried on the next change).
// - clearLocal(): on sign-out, so the next person on this device sees none of it.
import { SYNCED_KEYS, isSyncedKey, type SyncedDocs } from './keys';

const META_KEY = 'lifeengine.sync.meta.v1';
type Meta = { owner?: string; stamps: Record<string, number> };

export const SYNCED_EVENT = 'lifeengine:synced';

function readMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    const m = raw ? (JSON.parse(raw) as Meta) : null;
    return m && typeof m === 'object' && m.stamps ? m : { stamps: {} };
  } catch {
    return { stamps: {} };
  }
}
function writeMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // storage blocked: sync still works for this visit
  }
}
function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function push(key: string, value: unknown, updatedAt: number): Promise<void> {
  const res = await fetch('/api/me/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, updatedAt }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`sync ${res.status}`);
}

/** Pull the account's data into storage. Resolves even when offline. */
export async function hydrate(accountId: string | null): Promise<void> {
  if (!accountId) return;
  const meta = readMeta();
  // Another account's data on this device: drop it rather than mix them.
  if (meta.owner && meta.owner !== accountId) {
    clearLocal();
    meta.stamps = {};
  }
  meta.owner = accountId;

  let docs: SyncedDocs = {};
  try {
    const res = await fetch('/api/me/data', { cache: 'no-store' });
    if (!res.ok) return;
    docs = ((await res.json()) as { docs?: SyncedDocs }).docs ?? {};
  } catch {
    writeMeta(meta);
    return;
  }

  const uploads: Promise<void>[] = [];
  for (const key of SYNCED_KEYS) {
    const remote = docs[key];
    const local = readRaw(key);
    const localStamp = meta.stamps[key] ?? 0;
    if (remote && (local === undefined || remote.updatedAt > localStamp)) {
      try {
        if (remote.value === null || remote.value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(remote.value));
      } catch {
        // storage full or blocked
      }
      meta.stamps[key] = remote.updatedAt;
    } else if (local !== undefined && (!remote || localStamp > remote.updatedAt)) {
      const stamp = localStamp || Date.now();
      meta.stamps[key] = stamp;
      uploads.push(push(key, local, stamp).catch(() => {}));
    }
  }
  writeMeta(meta);
  await Promise.all(uploads);
  window.dispatchEvent(new Event(SYNCED_EVENT));
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Call after writing a synced key to localStorage. */
export function markChanged(key: string): void {
  if (typeof window === 'undefined' || !isSyncedKey(key)) return;
  const meta = readMeta();
  const stamp = Date.now();
  meta.stamps[key] = stamp;
  writeMeta(meta);
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void push(key, readRaw(key) ?? null, readMeta().stamps[key] ?? stamp).catch(() => {});
    }, 800),
  );
}

/** Send any change still waiting on its debounce timer. */
export async function flushPending(): Promise<void> {
  const keys = [...timers.keys()];
  for (const key of keys) clearTimeout(timers.get(key));
  timers.clear();
  const meta = readMeta();
  await Promise.all(keys.map((key) => push(key, readRaw(key) ?? null, meta.stamps[key] ?? Date.now()).catch(() => {})));
}

/** Remove every synced key from this device (the account keeps its copy). */
export function clearLocal(): void {
  try {
    for (const key of SYNCED_KEYS) localStorage.removeItem(key);
    localStorage.removeItem(META_KEY);
  } catch {
    // nothing to clear
  }
}
