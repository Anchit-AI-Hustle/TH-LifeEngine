// A tiny JSON document store: Vercel Blob in deployments, a local folder in
// development. Server only.
//
// Blob documents are public at their URL (the free tier has no private
// blobs), so every caller must use an unguessable key: account records are
// keyed by an HMAC of the mobile number under AUTH_SECRET, and user data by a
// random 128-bit account id. Nothing lists the store.
import { BlobNotFoundError, head, put } from '@vercel/blob';
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
  let meta;
  try {
    meta = await head(key);
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
  // The query string asks the CDN for this exact upload, not a cached older one.
  const res = await fetch(`${meta.url}?v=${meta.uploadedAt.getTime()}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`store read failed (${res.status})`);
  return (await res.json()) as T;
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
  await put(key, body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}
