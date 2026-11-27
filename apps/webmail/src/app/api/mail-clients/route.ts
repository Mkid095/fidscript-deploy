import { NextResponse } from 'next/server';

import { requireMailbox } from '@/lib/auth/require';
import { mailClientHost } from '@/lib/env';

/**
 * The settings an external mail client (Outlook, Thunderbird, Apple Mail…)
 * needs to use this account: IMAP in, SMTP out, both implicit-TLS.
 *
 *   GET /api/mail-clients
 */
export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const host = mailClientHost();
  return NextResponse.json({
    imap: {
      host,
      port: 993,
      security: 'SSL/TLS',
      username: context.session.email,
    },
    smtp: {
      host,
      port: 465,
      security: 'SSL/TLS',
      auth: true,
      username: context.session.email,
    },
    // The account's own password — the app never writes it down.
    passwordNote: 'Your mailbox password — the one you sign in with here.',
  });
}
