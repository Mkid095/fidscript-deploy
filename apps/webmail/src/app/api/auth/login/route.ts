import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  audit,
  createSession,
  stashSessionCredential,
  verifyAdmin,
} from '@/lib/auth/session';
import { admin } from '@/lib/stalwart/admin';

/**
 * Sign in: the platform admin (app database) or a mailbox (Stalwart).
 *
 * Rate-limited per IP in memory — enough for a single-node deployment; the
 * audit log carries what actually happened, so a lock-out is visible.
 */

const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const ATTEMPTS_PER_WINDOW = 8;
const attemptsByIp = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (attemptsByIp.get(ip) ?? []).filter(
    (t) => now - t < ATTEMPT_WINDOW_MS,
  );
  recent.push(now);
  attemptsByIp.set(ip, recent);
  return recent.length > ATTEMPTS_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A sign-in form is expected.' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password, both.' }, { status: 400 });
  }

  // 1. The platform admin.
  if (await verifyAdmin(email, password)) {
    const token = await createSession('admin', email);
    await audit(email, 'auth.login', { kind: 'admin' }, ip);
    return respond(token, 'admin');
  }

  // 2. A Stalwart mailbox — proven against Stalwart, not this app.
  if (await admin.verifyMailboxUser(email, password)) {
    const token = await createSession('mailbox', email);
    // The visit's credential, in memory only: the user moves between pages
    // without re-entering the password, and nothing on disk keeps it.
    stashSessionCredential(token, email, password);
    await audit(email, 'auth.login', { kind: 'mailbox' }, ip);
    return respond(token, 'mailbox');
  }

  await audit(email, 'auth.login.failed', { email }, ip);
  return NextResponse.json(
    { error: 'That sign-in did not check out.' },
    { status: 401 },
  );
}

function respond(token: string, kind: string) {
  const response = NextResponse.json({ ok: true, kind });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 86_400,
  });
  return response;
}
