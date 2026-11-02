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

/** Send several keys in one request; the server saves them in one write. */
async function pushBatch(docs: Record<string, { value: unknown; updatedAt: number }>, keepalive = false): Promise<void> {
  const res = await fetch('/api/me/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docs }),
    keepalive,
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

  const uploads: Record<string, { value: unknown; updatedAt: number }> = {};
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
      uploads[key] = { value: local, updatedAt: stamp };
    }
  }
  writeMeta(meta);
  if (Object.keys(uploads).length) await pushBatch(uploads).catch(() => {});
  window.dispatchEvent(new Event(SYNCED_EVENT));
}

// Changed keys wait here and go to the account together, one request at a
// time. Separate requests per key raced on the server and lost all but one.
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

async function sendPending(): Promise<void> {
  while (inFlight) await inFlight.catch(() => {});
  if (!pending.size) return;
  const keys = [...pending];
  pending.clear();
  const meta = readMeta();
  const docs: Record<string, { value: unknown; updatedAt: number }> = {};
  for (const key of keys) docs[key] = { value: readRaw(key) ?? null, updatedAt: meta.stamps[key] ?? Date.now() };
  inFlight = pushBatch(docs)
    .catch(() => {
      // Offline or a server error: send these again with the next change.
      for (const key of keys) pending.add(key);
    })
    .finally(() => {
      inFlight = null;
    });
  await inFlight;
}

function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void sendPending();
  }, delay);
}

let unloadHooked = false;
/** Closing the tab inside the wait would drop the change: send it on the way out. */
function hookUnload() {
  if (unloadHooked) return;
  unloadHooked = true;
  window.addEventListener('pagehide', () => {
    if (!pending.size || inFlight) return;
    const meta = readMeta();
    const docs: Record<string, { value: unknown; updatedAt: number }> = {};
    for (const key of pending) docs[key] = { value: readRaw(key) ?? null, updatedAt: meta.stamps[key] ?? Date.now() };
    // keepalive bodies are capped at 64 KB; bigger ones go on the next visit's hydrate.
    if (JSON.stringify(docs).length < 60_000) {
      pending.clear();
      void pushBatch(docs, true).catch(() => {});
    }
  });
}

/** Call after writing a synced key to localStorage. */
export function markChanged(key: string): void {
  if (typeof window === 'undefined' || !isSyncedKey(key)) return;
  hookUnload();
  const meta = readMeta();
  meta.stamps[key] = Date.now();
  writeMeta(meta);
  pending.add(key);
  schedule(800);
}

/** Send any change still waiting, and wait for it to reach the account. */
export async function flushPending(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  await sendPending();
  if (inFlight) await inFlight.catch(() => {});
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
