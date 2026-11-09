import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import { queryMessages } from '@/lib/stalwart/mail';

/**
 * A mailbox's messages: GET /api/mail/query?mailbox=<id>&text=&unread=
 * &starred=&limit=&position= — "all" for no mailbox, and the
 * starred/search views use that with their own filters.
 */
export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const mailbox = params.get('mailbox');
  try {
    const result = await queryMessages(context.cred, mailbox ?? 'all', {
      filterText: params.get('text') ?? undefined,
      unread: params.get('unread') === '1',
      starred: params.get('starred') === '1',
      limit: params.get('limit') ? Number(params.get('limit')) : 50,
      position: params.get('position') ? Number(params.get('position')) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}
