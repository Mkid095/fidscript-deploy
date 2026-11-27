import { NextResponse } from 'next/server';

import { requireMailbox } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { getSieveScript, listMailboxes, setSieveScript } from '@/lib/stalwart/mail';
import { compileFilterRules, FilterRuleInput } from '@/lib/stalwart/sieve';

/**
 * Filter rules, structured.
 *
 * The server takes only a plain sieve script, so the rules live here as
 * rows the UI can edit; every POST rewrites the whole set and compiles it
 * into the script Stalwart runs.
 *
 *   GET  /api/filter-rules          — this account's rules, in order
 *   POST /api/filter-rules          — { rules: [...], active? } replaces the
 *                                     set and writes the generated script
 */

const MATCH_KEYS = ['from', 'subject'] as const;
const ACTIONS = ['move', 'forward', 'junk'] as const;
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRules(
  body: Record<string, unknown>,
): { rules: FilterRuleInput[]; error: string | null } {
  const raw = body.rules;
  if (!Array.isArray(raw)) return { rules: [], error: 'The rules list is expected.' };
  if (raw.length > 25) return { rules: [], error: 'Keep it to 25 rules, please.' };
  const rules: FilterRuleInput[] = [];
  for (const entry of raw) {
    const row = entry as Record<string, unknown>;
    const matchKey = String(row.matchKey ?? 'from');
    const matchValue = String(row.matchValue ?? '').trim();
    const action = String(row.action ?? 'move');
    let target = String(row.target ?? '').trim();
    if (!MATCH_KEYS.includes(matchKey as (typeof MATCH_KEYS)[number])) {
      return { rules: [], error: 'A rule looks at the sender or the subject.' };
    }
    if (!matchValue) return { rules: [], error: 'Each rule needs something to match.' };
    if (matchValue.length > 200) {
      return { rules: [], error: 'A match keeps under 200 characters, please.' };
    }
    if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
      return { rules: [], error: 'An unknown action — move, forward or junk.' };
    }
    if (action === 'move' && !target) {
      return { rules: [], error: 'Move needs a target folder.' };
    }
    if (action === 'forward') {
      if (!ADDRESS.test(target)) {
        return { rules: [], error: 'Forward needs an email address, e.g. you@elsewhere.example.' };
      }
    }
    if (action === 'junk') target = '';
    rules.push({ matchKey: matchKey as FilterRuleInput['matchKey'], matchValue, action: action as FilterRuleInput['action'], target });
  }
  return { rules, error: null };
}

export async function GET(request: Request) {
  const context = await requireMailbox(request);
  if (!context) {
    return NextResponse.json({ error: 'Sign in to your mailbox.' }, { status: 401 });
  }
  try {
    const rows = await db.mailFilterRule.findMany({
      where: { email: context.session.email },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return NextResponse.json({
      rules: rows.map((row) => ({
        id: row.id,
        matchKey: row.matchKey,
        matchValue: row.matchValue,
        action: row.action,
        target: row.target,
      })),
    });
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
  const { rules, error } = validateRules(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  try {
    await db.mailFilterRule.deleteMany({ where: { email: context.session.email } });
    if (rules.length) {
      await db.mailFilterRule.createMany({
        data: rules.map((rule, position) => ({
          email: context.session.email,
          position,
          matchKey: rule.matchKey,
          matchValue: rule.matchValue,
          action: rule.action,
          target: rule.target,
        })),
      });
    }
    // The server's copy of the rules: regenerate the script, keep the
    // active flag unless this call set one.
    const mailboxes = await listMailboxes(context.cred);
    const existing = await getSieveScript(context.cred);
    const active = typeof body.active === 'boolean' ? body.active : existing?.active ?? false;
    const script = compileFilterRules(rules, mailboxes);
    await setSieveScript(context.cred, script, active);
    return NextResponse.json({ ok: true, active, script });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
