/**
 * Session checks. Sign-up and sign-in are a mobile number plus a 4-digit PIN
 * (see app/api/auth/*). This file only answers "which account, if any, does
 * this request belong to?" and stays edge-safe so the middleware can use it.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, authSecret, readSessionToken } from '@/lib/auth/session';

/** The signed-in account id (route handlers, server components), or null. */
export async function currentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value, authSecret());
}

/** Check if the current request is signed in (route handlers, server components). */
export async function isAuthenticated(): Promise<boolean> {
  return (await currentUserId()) !== null;
}

/** Check if a request is signed in (middleware). */
export async function isRequestAuthenticated(request: NextRequest): Promise<boolean> {
  return (await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value, authSecret())) !== null;
}
