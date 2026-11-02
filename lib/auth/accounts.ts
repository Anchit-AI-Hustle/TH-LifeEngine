// Accounts: one record per mobile number. Server only.
//
// The record lives at accounts/<HMAC(AUTH_SECRET, mobile)>.json, so neither
// the path nor the file reveals the number, and without the secret nobody can
// find a record or test PINs against it (see lib/auth/pin.ts). The record
// keeps the last 4 digits only, to show "signed in as ••••5238".
import { createHmac, randomBytes } from 'node:crypto';
import { deleteAll, readJson, writeJson } from '@/lib/storage/jsonStore';
import { hashPin, verifyPin, burnPinCheck, type PinHash } from './pin';

export type Account = {
  v: 1;
  /** Random, never derived from the number; keys the account's data. */
  id: string;
  pin: PinHash;
  /** "+91" or the international prefix, and the last 4 digits. */
  country: string;
  last4: string;
  createdAt: string;
};

/** Stable, secret-keyed handle for a number: record key and lockout key. */
export function mobileKey(e164: string, secret: string): string {
  return createHmac('sha256', secret).update(`mobile:${e164}`).digest('hex');
}

const recordKey = (e164: string, secret: string) => `accounts/${mobileKey(e164, secret)}.json`;

export async function findAccount(e164: string, secret: string): Promise<Account | null> {
  return readJson<Account>(recordKey(e164, secret));
}

export class AccountExistsError extends Error {}

export async function createAccount(e164: string, pin: string, secret: string): Promise<Account> {
  if (await findAccount(e164, secret)) throw new AccountExistsError('exists');
  const account: Account = {
    v: 1,
    id: randomBytes(16).toString('base64url'),
    pin: await hashPin(pin, secret),
    country: e164.startsWith('+91') ? '+91' : e164.slice(0, 3),
    last4: e164.slice(-4),
    createdAt: new Date().toISOString(),
  };
  await writeJson(recordKey(e164, secret), account);
  // Read it back: if two sign-ups raced for one number, only the record that
  // landed last is real, and the other one must not get a session.
  const stored = await findAccount(e164, secret);
  if (!stored || stored.id !== account.id) throw new AccountExistsError('race');
  // Index by id, for "signed in as ••••5238" without the number.
  await writeJson(`accounts/by-id/${account.id}.json`, { country: account.country, last4: account.last4 });
  return account;
}

/** Whether the PIN is right. Takes the same time when there is no account. */
export async function checkPin(account: Account | null, pin: string, secret: string): Promise<boolean> {
  if (!account) {
    await burnPinCheck(pin, secret);
    return false;
  }
  return verifyPin(pin, account.pin, secret);
}

export async function accountLabel(id: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) return null;
  const rec = await readJson<{ country: string; last4: string }>(`accounts/by-id/${id}.json`);
  if (!rec) return null;
  return rec.country === '+91' ? `+91 ••••• •${rec.last4}` : `${rec.country}•••••${rec.last4}`;
}

/**
 * Remove the account and everything saved under it: profiles, plans and
 * synced data first, then the record itself, so a failure part-way leaves an
 * account that can sign in and try again rather than orphaned data.
 */
export async function deleteAccount(e164: string, account: Account, secret: string): Promise<number> {
  let removed = await deleteAll(`users/${account.id}/`);
  removed += await deleteAll(`accounts/by-id/${account.id}`);
  removed += await deleteAll(`accounts/${mobileKey(e164, secret)}`);
  return removed;
}
