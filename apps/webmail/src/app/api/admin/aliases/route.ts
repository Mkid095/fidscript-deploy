import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require';
import { admin } from '@/lib/stalwart/admin';
import { audit } from '@/lib/auth/session';

/**
 * Aliases, admin-only. An alias is an address with no mailbox of its own,
 * resolving to the accounts that hold it — a Group account in Stalwart.
 *
 *   GET /api/admin/aliases — the group-style accounts
 *   POST { "op": "create", "name", "domain", "description" }
 */
export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  try {
    const aliases = await admin.listAliases();
    return NextResponse.json({ aliases });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON form is expected.' }, { status: 400 });
  }
  if (body.op !== 'create') {
    return NextResponse.json({ error: 'An unknown op.' }, { status: 400 });
  }
  const name = String(body.name ?? '').trim();
  const domain = String(body.domain ?? '').trim();
  if (!name || !domain) {
    return NextResponse.json({ error: 'A local part and a domain, please.' }, { status: 400 });
  }
  try {
    const alias = await admin.createAlias({
      name,
      domain,
      description: body.description ? String(body.description) : undefined,
    });
    await audit(context.session.email, 'admin.alias.create', { email: alias.email });
    return NextResponse.json({ alias });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
