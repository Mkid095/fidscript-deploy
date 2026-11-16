import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import { getTemplate, deleteTemplate } from '@/lib/templates';

/** One template: GET the document, DELETE it (the maker's, or the admin's). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) {
    return NextResponse.json({ error: 'No such template.' }, { status: 404 });
  }
  return NextResponse.json({ template });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) {
    return NextResponse.json({ error: 'No such template.' }, { status: 404 });
  }
  // Only the maker (or a platform admin) removes a template.
  if (template.createdBy !== context.session.email && context.session.kind !== 'admin') {
    return NextResponse.json(
      { error: 'That template belongs to someone else.' },
      { status: 403 },
    );
  }
  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
