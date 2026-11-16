import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import { getMessage } from '@/lib/stalwart/mail';

/** One message, with its bodies and parts. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const message = await getMessage(context.cred, id);
    if (!message) {
      return NextResponse.json({ error: 'No such message.' }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
