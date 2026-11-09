import { NextResponse } from 'next/server';
import { requireMailbox } from '@/lib/auth/require';
import {
  listTemplates,
  saveTemplate,
  TEMPLATE_CATEGORIES,
} from '@/lib/templates';
import { sanitizeEmailHtml } from '@/lib/email-sanitize';

/**
 * Templates belong to the person signed in.
 *
 *   GET  /api/templates[?category=]   — the list
 *   POST /api/templates               — create or update { id?, name, category, html, text }
 *
 * The HTML is sanitized on the way in; what is stored is what will be
 * shown, so a hostile document cannot keep its scripts around.
 */
export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  const category = new URL(request.url).searchParams.get('category') ?? undefined;
  try {
    // Make sure the starter set exists for this owner.
    const templates = await listTemplates(category);
    return NextResponse.json({ templates, categories: TEMPLATE_CATEGORIES });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
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
  const name = String(body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'A template name, please.' }, { status: 400 });
  }
  try {
    const template = await saveTemplate({
      id: body.id ? String(body.id) : undefined,
      name,
      category: String(body.category ?? 'business'),
      html: sanitizeEmailHtml(String(body.html ?? '')),
      text: String(body.text ?? ''),
      createdBy: context.session.email,
    });
    return NextResponse.json({ template });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

