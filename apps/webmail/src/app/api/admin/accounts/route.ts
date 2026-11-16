import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require';
import { admin } from '@/lib/stalwart/admin';
import { audit } from '@/lib/auth/session';

/**
 * Account management, admin-only.
 *
 *   GET /api/admin/accounts                 — every account Stalwart knows
 *   POST { "op": "create", ... }            — a new mailbox
 *   POST { "op": "password", "id", "password" }
 *   POST { "op": "suspend" | "activate", "id" }
 *   POST { "op": "delete", "id" }
 */
export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  try {
    const accounts = await admin.listAccounts();
    return NextResponse.json({ accounts });
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

  try {
    switch (body.op) {
      case 'create': {
        const name = String(body.name ?? '').trim();
        const domain = String(body.domain ?? '').trim();
        const password = String(body.password ?? '');
        if (!name || !domain || password.length < 8) {
          return NextResponse.json(
            { error: 'A local part, a domain, and a password of 8+ characters.' },
            { status: 400 },
          );
        }
        const account = await admin.createAccount({
          name,
          domain,
          password,
          description: body.description ? String(body.description) : undefined,
          quotaMb: body.quotaMb ? Number(body.quotaMb) : undefined,
        });
        await audit(
          context.session.email,
          'admin.account.create',
          { email: account.email, quotaMb: body.quotaMb ?? null },
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '',
        );
        return NextResponse.json({ account });
      }
      case 'password': {
        const id = String(body.id ?? '');
        if (!id || String(body.password ?? '').length < 8) {
          return NextResponse.json(
            { error: 'An account id and a password of 8+ characters.' },
            { status: 400 },
          );
        }
        await admin.setAccountPassword(id, String(body.password));
        await audit(context.session.email, 'admin.account.password', { id });
        return NextResponse.json({ ok: true });
      }
      case 'suspend':
      case 'activate': {
        const id = String(body.id ?? '');
        if (!id) return NextResponse.json({ error: 'Which account?' }, { status: 400 });
        await admin.setAccountEnabled(id, body.op === 'activate');
        await audit(context.session.email, `admin.account.${body.op}`, { id });
        return NextResponse.json({ ok: true });
      }
      case 'delete': {
        const id = String(body.id ?? '');
        if (!id) return NextResponse.json({ error: 'Which account?' }, { status: 400 });
        await admin.deleteAccount(id);
        await audit(context.session.email, 'admin.account.delete', { id });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'An unknown op.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
