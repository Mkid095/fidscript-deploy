import { NextResponse } from 'next/server';
import { currentSession, currentSessionToken, sessionCredential } from '@/lib/auth/session';

/** The signed-in user, and whether the visit's credential is still in hand. */
export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ session: null });
  const token = await currentSessionToken();
  const hasCredential = token ? sessionCredential(token) !== null : false;
  return NextResponse.json({
    session: {
      kind: session.kind,
      email: session.email,
      // The visit's Stalwart credential survived the server's life.
      credential: hasCredential,
    },
  });
}
