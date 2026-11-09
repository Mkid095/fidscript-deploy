import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import {
  destroyMessages,
  moveMessages,
  setFlags,
} from '@/lib/stalwart/mail';

/**
 * What can be done to messages. One route, one action:
 *
 *   POST { "action": "flags",  "ids": [...], "flags": { seen?, flagged?, junk? } }
 *   POST { "action": "move",   "ids": [...], "fromMailbox": "<id>", "toMailbox": "<id>" }
 *   POST { "action": "destroy","ids": [...] }
 */
export async function POST(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }

  let body: {
    action?: string;
    ids?: string[];
    flags?: { seen?: boolean; flagged?: boolean; junk?: boolean };
    fromMailbox?: string;
    toMailbox?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON form is expected.' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string') : [];
  try {
    switch (body.action) {
      case 'flags': {
        await setFlags(context.cred, ids, body.flags ?? {});
        break;
      }
      case 'move': {
        if (!body.toMailbox) {
          return NextResponse.json({ error: 'A move needs a to mailbox.' }, { status: 400 });
        }
        await moveMessages(context.cred, ids, body.toMailbox);
        break;
      }
      case 'destroy': {
        await destroyMessages(context.cred, ids);
        break;
      }
      default:
        return NextResponse.json({ error: 'An unknown action.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
