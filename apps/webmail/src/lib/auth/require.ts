/**
 * The guards the API routes start with.
 *
 * Every mail operation needs the visit's mailbox credential (proven at
 * sign-in, held in process memory for this session). Every admin operation
 * needs the admin session. Neither kind of route runs without its guard,
 * and every mutation is checked against the origin it came from — the
 * cookie is SameSite=Lax, so a cross-site form gets no cookie at all, and
 * the origin check is the second bar for the rest.
 */

import {
  currentSession,
  currentSessionToken,
  sessionCredential,
  type SessionInfo,
} from '@/lib/auth/session';
import type { Credential } from '@/lib/stalwart/mail';

export interface MailContext {
  cred: Credential;
  session: SessionInfo;
}

export interface AdminContext {
  session: SessionInfo;
}

function isSameOrigin(request: Request): boolean {
  const base = process.env.WEBMAIL_BASE_URL;
  const origin = request.headers.get('origin');
  if (!base || !origin) return true; // No configured base, or no Origin (same-site).
  try {
    return new URL(origin).origin === new URL(base).origin;
  } catch {
    return true;
  }
}

/** The mailbox context, or null (the route answers 401 itself). */
export async function requireMailbox(
  request: Request,
): Promise<MailContext | null> {
  const session = await currentSession();
  if (!session || session.kind !== 'mailbox') return null;
  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) return null; // The visit ended (server restarted): sign in again.
  if (!isSameOrigin(request)) return null;
  return { cred, session };
}

/** The admin context, or null. */
export async function requireAdmin(
  request: Request,
): Promise<AdminContext | null> {
  const session = await currentSession();
  if (!session || session.kind !== 'admin') return null;
  if (!isSameOrigin(request)) return null;
  return { session };
}

/** The current session of any kind, or null. */
export async function anySession(request: Request): Promise<SessionInfo | null> {
  void request;
  return currentSession();
}
