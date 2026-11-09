/**
 * Application sessions and the platform admin account.
 *
 * Two kinds of sign-in, kept strictly apart:
 *   - 'admin'   — the application's own administrator (created from the
 *                 WEBMAIL_ADMIN_* env on first boot), verified against the
 *                 app database;
 *   - 'mailbox' — a Stalwart mailbox, verified against Stalwart itself
 *                 (its own Basic credential; a disabled account will not
 *                 authenticate at Stalwart, so this check is authoritative).
 *
 * The mailbox password is never stored here; Stalwart is authoritative.
 * Sessions are opaque tokens in the app database, in an HttpOnly cookie —
 * so sign-out and revocation are real, and nothing the browser holds can
 * outlive the server saying it can.
 */
import { randomBytes, scryptSync } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export interface SessionInfo {
  kind: 'admin' | 'mailbox';
  email: string;
}

const COOKIE = 'webmail_session';
const SESSION_DAYS = 30;

function scryptHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function scryptVerify(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = scryptSync(password, salt, 32).toString('hex');
  return check === hash;
}

/**
 * Ensure the platform admin exists. Created from the env on first boot; if
 * the password is not set, one is generated and returned so the caller can
 * log it exactly once.
 */
export async function ensurePlatformAdmin(): Promise<{
  email: string;
  generatedPassword: string | null;
}> {
  const email = process.env.WEBMAIL_ADMIN_EMAIL ?? 'admin@localhost';
  const existing = await db.adminUser.findFirst();
  if (existing) return { email: existing.email, generatedPassword: null };

  const configured = process.env.WEBMAIL_ADMIN_PASSWORD;
  const password =
    configured && configured.length > 0
      ? configured
      : `webmail-${randomBytes(12).toString('base64url')}`;
  await db.adminUser.create({
    data: { email, passHash: scryptHash(password) },
  });
  return {
    email,
    generatedPassword: configured ? null : password,
  };
}

export async function verifyAdmin(email: string, password: string): Promise<boolean> {
  const row = await db.adminUser.findUnique({ where: { email } });
  return row ? scryptVerify(password, row.passHash) : false;
}

export async function createSession(
  kind: SessionInfo['kind'],
  email: string,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await db.session.create({
    data: {
      id: token,
      kind,
      email,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
    },
  });
  return token;
}

export async function readSession(token: string): Promise<SessionInfo | null> {
  const row = await db.session.findUnique({ where: { id: token } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: token } });
    return null;
  }
  return { kind: row.kind as SessionInfo['kind'], email: row.email };
}

export async function destroySession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: token } });
}

/** The signed-in user of the current request, or null. */
export async function currentSession(): Promise<SessionInfo | null> {
  const token = await currentSessionToken();
  if (!token) return null;
  return readSession(token);
}

/** The raw session cookie value of the current request, or null. */
export async function currentSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function audit(
  actor: string,
  action: string,
  detail: Record<string, unknown>,
  ip = '',
): Promise<void> {
  await db.auditLog.create({
    data: { actor, action, detail: JSON.stringify(detail), ip },
  });
}

export const SESSION_COOKIE = COOKIE;

/**
 * The mailbox credential, held for a visit.
 *
 * A mailbox sign-in proves the password at Stalwart; for the rest of that
 * session the server keeps the credential **in process memory, bound to
 * the session token**, so the user moves between pages without re-entering
 * it. It is never written to the database or disk: a server restart drops
 * it, and the user signs in again — the honest outcome.
 */
const mailboxCredentials = new Map<string, { user: string; pass: string }>();

export function stashSessionCredential(
  token: string,
  user: string,
  pass: string,
): void {
  mailboxCredentials.set(token, { user, pass });
}

export function sessionCredential(
  token: string,
): { user: string; pass: string } | null {
  return mailboxCredentials.get(token) ?? null;
}

export function clearSessionCredential(token: string): void {
  mailboxCredentials.delete(token);
}
