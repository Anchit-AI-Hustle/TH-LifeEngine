// A tiny JSON document store: Vercel Blob in deployments, a local folder in
// development. Server only.
//
// Blob documents are public at their URL (the free tier has no private
// blobs), so every caller must use an unguessable key: account records are
// keyed by an HMAC of the mobile number under AUTH_SECRET, and user data by a
// random 128-bit account id. Only deleteAll() lists the store, and only
// under one account's own prefix.
import { BlobNotFoundError, del, head, list, put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const LOCAL_ROOT = process.env.LIFEENGINE_DATA_DIR
  ? process.env.LIFEENGINE_DATA_DIR
  : process.env.VERCEL
    ? path.join('/tmp', 'lifeengine-data')
    : path.join(process.cwd(), '.lifeengine-data');

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,200}\.json$/i;

function checkKey(key: string) {
  if (!KEY_RE.test(key) || key.includes('..')) throw new Error(`bad store key: ${key}`);
  // On Vercel, /tmp belongs to one short-lived instance: accounts written there
  // would vanish or split between instances. Refuse rather than lose data.
  if (process.env.VERCEL && !useBlob()) throw new Error('BLOB_READ_WRITE_TOKEN is not set on this deployment');
}

// Blob overwrites take up to 60s to reach the CDN, so reading a document soon
// after it was overwritten can return the older copy, and the next save then
// writes that older copy back (saved plans and profiles were lost this way).
// So a document's content is never overwritten: each save goes to a new
// version path, and the document's own key holds a small pointer to it. The
// pointer is found with head(), which asks the Blob API rather than the CDN,
// and a version path is never cached before it exists.
const VERSION_IN_TYPE = /;\s*v=([a-z0-9-]{6,64})/i;
const POINTER_FIELD = '__lifeengineVersion';
const versionPath = (key: string, v: string) => `${key.replace(/\.json$/i, '')}.versions/${v}.json`;
const isVersionId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{6,64}$/i.test(v);

async function fetchBlob(url: string): Promise<Response> {
  return fetch(url, { cache: 'no-store' });
}

async function readBlob<T>(key: string, attempt = 0): Promise<T | null> {
  let meta;
  try {
    meta = await head(key);
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
  const origin = new URL(meta.url).origin;
  let version = VERSION_IN_TYPE.exec(meta.contentType ?? '')?.[1] ?? null;
  if (!version) {
    // A document saved before versioning, or a pointer whose type lost its
    // version: read the body (the query only bypasses the browser cache).
    const res = await fetchBlob(`${meta.url}?v=${meta.uploadedAt.getTime()}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`store read failed (${res.status})`);
    const body = (await res.json()) as Record<string, unknown> | null;
    const pointed = body && typeof body === 'object' ? body[POINTER_FIELD] : undefined;
    if (!isVersionId(pointed)) return body as T;
    version = pointed;
  }
  const res = await fetchBlob(`${origin}/${versionPath(key, version)}`);
  // A newer save removed this version between our head() and fetch: look again.
  if (res.status === 404 && attempt < 2) return readBlob<T>(key, attempt + 1);
  if (!res.ok) throw new Error(`store read failed (${res.status})`);
  return (await res.json()) as T;
}

export async function readJson<T>(key: string): Promise<T | null> {
  checkKey(key);
  if (!useBlob()) {
    try {
      return JSON.parse(await fs.readFile(path.join(LOCAL_ROOT, key), 'utf-8')) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  return readBlob<T>(key);
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  checkKey(key);
  const body = JSON.stringify(value);
  if (!useBlob()) {
    const file = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    // Write then rename, so a reader never sees a half-written file.
    const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tmp, body, 'utf-8');
    await fs.rename(tmp, file);
    return;
  }

  let previous: { origin: string; version: string } | null = null;
  try {
    const meta = await head(key);
    const v = VERSION_IN_TYPE.exec(meta.contentType ?? '')?.[1];
    if (v) previous = { origin: new URL(meta.url).origin, version: v };
  } catch (e) {
    if (!(e instanceof BlobNotFoundError)) throw e;
  }

  const version = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}`;
  await put(versionPath(key, version), body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  await put(key, JSON.stringify({ [POINTER_FIELD]: version }), {
    access: 'public',
    addRandomSuffix: false,
    contentType: `application/json; v=${version}`,
    cacheControlMaxAge: 60,
  });
  if (previous && previous.version !== version) {
    // Tidy up; a failure only leaves an unused old version behind.
    await del(`${previous.origin}/${versionPath(key, previous.version)}`).catch(() => {});
  }
}

// Only an account's own documents can be removed: its record, its by-id label
// and its data folder. The ids are fixed-length (64 hex / 22 base64url
// characters), so one account's prefix never matches another account.
const DELETABLE = [
  /^accounts\/[0-9a-f]{64}$/,
  /^accounts\/by-id\/[A-Za-z0-9_-]{22}$/,
  /^users\/[A-Za-z0-9_-]{22}\/$/,
];

/** Remove every document whose key starts with `prefix` (and its saved versions). Returns how many were removed. */
export async function deleteAll(prefix: string): Promise<number> {
  if (!DELETABLE.some((re) => re.test(prefix))) throw new Error(`refusing to delete ${prefix}`);
  if (process.env.VERCEL && !useBlob()) throw new Error('BLOB_READ_WRITE_TOKEN is not set on this deployment');

  if (!useBlob()) {
    const trimmed = prefix.replace(/\/$/, '');
    const dir = path.join(LOCAL_ROOT, path.dirname(trimmed));
    const start = path.basename(trimmed);
    let names: string[] = [];
    try {
      names = await fs.readdir(dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return 0;
      throw e;
    }
    const matches = prefix.endsWith('/') ? names.filter((n) => n === start) : names.filter((n) => n.startsWith(`${start}.`));
    for (const n of matches) await fs.rm(path.join(dir, n), { recursive: true, force: true });
    return matches.length;
  }

  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    const urls = page.blobs.map((b) => b.url);
    if (urls.length) await del(urls);
    removed += urls.length;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}
