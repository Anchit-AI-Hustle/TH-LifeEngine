// Shared helpers for the /api/auth routes. Server only.
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from './session';

export function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const CLOSED = 'Sign-in is closed until the server has an AUTH_SECRET. Please try again later.';

export async function readCredentials(req: NextRequest): Promise<{ mobile: unknown; pin: unknown }> {
  try {
    const body = (await req.json()) as { mobile?: unknown; pin?: unknown } | null;
    return { mobile: body?.mobile, pin: body?.pin };
  } catch {
    return { mobile: undefined, pin: undefined };
  }
}

export async function signedIn(uid: string, secret: string, body: Record<string, unknown> = {}) {
  const res = reply(200, { ok: true, ...body });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret, uid), sessionCookieOptions());
  return res;
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}
