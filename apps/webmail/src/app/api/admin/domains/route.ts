import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require';
import { admin } from '@/lib/stalwart/admin';
import { audit } from '@/lib/auth/session';

/**
 * Domain management, admin-only.
 *
 *   GET /api/admin/domains — every domain Stalwart knows, with its DKIM
 *                            policy and whether it has a generated zone;
 *   POST { "op": "create", "name" } — a new domain (mail can be addressed to
 *                            it the moment DNS points at the server).
 */
export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  try {
    const domains = await admin.listDomains();
    return NextResponse.json({ domains });
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
  if (!/^[a-z0-9.-]+$/i.test(name)) {
    return NextResponse.json(
      { error: 'A domain name, please — letters, digits, dots, hyphens.' },
      { status: 400 },
    );
  }
  try {
    const id = await admin.ensureDomain(name);
    await audit(context.session.email, 'admin.domain.create', { name, id });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
