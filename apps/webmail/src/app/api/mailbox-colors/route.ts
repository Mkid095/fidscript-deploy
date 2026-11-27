import { NextResponse } from 'next/server';

import { requireMailbox } from '@/lib/auth/require';
import { db } from '@/lib/db';

/**
 * Folder colours.
 *
 * This Stalwart build's mailboxes take no colour property, so the paint a
 * folder wears in the rail is kept here, one row per (account, mailbox).
 *
 *   GET  /api/mailbox-colors            — this account's colours
 *   POST /api/mailbox-colors            — { mailboxId, color } paints one,
 *                                         { mailboxId, color: null } clears it
 */

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  try {
    const rows = await db.mailboxColor.findMany({
      where: { email: context.session.email },
    });
    return NextResponse.json({
      colors: rows.map((row) => ({ mailboxId: row.mailboxId, color: row.color })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  let body: { mailboxId?: string; color?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON form is expected.' }, { status: 400 });
  }
  const mailboxId = typeof body.mailboxId === 'string' ? body.mailboxId : '';
  if (!mailboxId) {
    return NextResponse.json({ error: 'Which folder?' }, { status: 400 });
  }
  try {
    if (body.color === null || body.color === undefined) {
      // A null colour clears the paint: the folder falls back to the
      // rail's default.
      await db.mailboxColor.deleteMany({
        where: { email: context.session.email, mailboxId },
      });
      return NextResponse.json({ ok: true });
    }
    const color = String(body.color);
    if (!HEX_COLOR.test(color)) {
      return NextResponse.json(
        { error: 'A colour is a hex value, e.g. #ea580c.' },
        { status: 400 },
      );
    }
    await db.mailboxColor.upsert({
      where: { email_mailboxId: { email: context.session.email, mailboxId } },
      update: { color },
      create: { email: context.session.email, mailboxId, color },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
