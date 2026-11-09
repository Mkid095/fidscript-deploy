import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import {
  getVacation,
  getSieveScript,
  listIdentities,
  setSieveScript,
  setVacation,
  updateIdentity,
  type VacationState,
} from '@/lib/stalwart/mail';

/**
 * The settings back end, all mailbox-scoped:
 *   GET  → { identities, vacation, filters }
 *   POST → { op, ... } where op is one of
 *           identity { id, name?, email?, isDefault?, signatureHtml?, signatureText? }
 *           vacation { enabled, subject, text, startDate?, endDate?, interval? }
 *           filters  { script, active }
 */
export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  try {
    const [identities, vacation, filters] = await Promise.all([
      listIdentities(context.cred),
      getVacation(context.cred),
      getSieveScript(context.cred),
    ]);
    return NextResponse.json({
      identities,
      vacation,
      filters: filters
        ? { script: filters.script, active: filters.active }
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON form is expected.' }, { status: 400 });
  }
  try {
    switch (body.op) {
      case 'identity': {
        const id = String(body.id ?? '');
        if (!id) return NextResponse.json({ error: 'Which identity?' }, { status: 400 });
        await updateIdentity(context.cred, {
          id,
          name: body.name !== undefined ? String(body.name) : undefined,
          email: body.email !== undefined ? String(body.email) : undefined,
          isDefault: body.isDefault !== undefined ? Boolean(body.isDefault) : undefined,
          signatureHtml:
            body.signatureHtml !== undefined ? String(body.signatureHtml) : undefined,
          signatureText:
            body.signatureText !== undefined ? String(body.signatureText) : undefined,
        });
        break;
      }
      case 'vacation': {
        const state: VacationState = {
          enabled: Boolean(body.enabled),
          subject: String(body.subject ?? ''),
          text: String(body.text ?? ''),
          startDate: body.startDate ? String(body.startDate) : null,
          endDate: body.endDate ? String(body.endDate) : null,
          interval: body.interval ? String(body.interval) : null,
        };
        await setVacation(context.cred, state);
        break;
      }
      case 'filters': {
        await setSieveScript(
          context.cred,
          String(body.script ?? ''),
          Boolean(body.active),
        );
        break;
      }
      default:
        return NextResponse.json({ error: 'An unknown op.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
