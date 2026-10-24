/**
 * Session checks for the app's single owner.
 *
 * Sign-in is a 4-digit PIN only (see app/api/auth/login/route.ts). The PIN is
 * checked on the server against the scrypt hash in the APP_PIN_HASH env var;
 * there is no username, password or other way in. This file only answers
 * "does this request carry a valid session cookie?" and stays edge-safe so
 * the middleware can use it.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, sessionSecret, verifySessionToken } from '@/lib/auth/session';

/**
 * Check if the current request is signed in (route handlers, server components).
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value, sessionSecret());
}

/**
 * Check if a request is signed in (middleware).
 */
export async function isRequestAuthenticated(request: NextRequest): Promise<boolean> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
}
