import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import { listContacts } from '@/lib/stalwart/contacts';

/** The account's address book, as Stalwart keeps it. */
export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  try {
    const contacts = await listContacts(context.cred);
    return NextResponse.json({ contacts });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
