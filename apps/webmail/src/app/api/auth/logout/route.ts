import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  audit,
  clearSessionCredential,
  currentSession,
  currentSessionToken,
  destroySession,
} from '@/lib/auth/session';

export async function POST(request: Request) {
  const session = await currentSession();
  const token = await currentSessionToken();
  if (session && token) {
    await destroySession(token);
    clearSessionCredential(token);
    await audit(
      session.email,
      'auth.logout',
      {},
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '',
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
