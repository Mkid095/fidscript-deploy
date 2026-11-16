import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import { downloadPart } from '@/lib/stalwart/mail';

/** Download one message part (attachment or inline content). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; partId: string }> },
) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const { id, partId } = await params;
  try {
    const part = await downloadPart(context.cred, id, partId);
    if (!part) {
      return NextResponse.json({ error: 'No such part.' }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(part.data), {
      headers: {
        'Content-Type': part.contentType ?? 'application/octet-stream',
        ...(part.name
          ? {
              'Content-Disposition': `attachment; filename="${encodeURIComponent(
                part.name,
              )}"`,
            }
          : {}),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
