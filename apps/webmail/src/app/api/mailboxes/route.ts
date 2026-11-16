import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import {
  createMailbox,
  destroyMailbox,
  listMailboxes,
  renameMailbox,
} from '@/lib/stalwart/mail';

/** The account's mailboxes: GET lists; POST creates/renames/destroys. */
export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  try {
    const mailboxes = await listMailboxes(context.cred);
    return NextResponse.json({ mailboxes });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  let body: { op?: string; name?: string; id?: string; parentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON form is expected.' }, { status: 400 });
  }
  try {
    if (body.op === 'create') {
      if (!body.name) {
        return NextResponse.json({ error: 'A folder name, please.' }, { status: 400 });
      }
      const id = await createMailbox(context.cred, body.name, body.parentId ?? null);
      return NextResponse.json({ id });
    }
    if (body.op === 'rename') {
      if (!body.id || !body.name) {
        return NextResponse.json(
          { error: 'A folder and its new name, please.' },
          { status: 400 },
        );
      }
      await renameMailbox(context.cred, body.id, body.name);
      return NextResponse.json({ ok: true });
    }
    if (body.op === 'destroy') {
      if (!body.id) {
        return NextResponse.json({ error: 'Which folder?' }, { status: 400 });
      }
      await destroyMailbox(context.cred, body.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'An unknown op.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
