'use client';

/**
 * Status colour maps + tiny formatters used by every Email tab.
 * Domain-scoped (not a generic utils.ts); lives next to the feature.
 */

export const DOMAIN_STATUS_TONE: Record<string, string> = {
  PENDING:  'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900/40 text-[var(--accent)]',
  ACTIVE:   'bg-emerald-900/40 text-[var(--success)]',
  FAILED:   'bg-red-900/40 text-[var(--danger)]',
};

export const VERIFY_TONE: Record<string, string> = {
  true:  'bg-emerald-900/40 text-[var(--success)]',
  false: 'bg-[var(--rail)] text-[var(--text-muted)]',
};

export const MAILBOX_TONE: Record<string, string> = {
  ACTIVE:   'bg-emerald-900/40 text-[var(--success)]',
  SUSPENDED: 'bg-red-900/40 text-[var(--danger)]',
};

export const MESSAGE_STATUS_TONE: Record<string, string> = {
  SUBMITTED: 'bg-[var(--rail)] text-[var(--text-muted)]',
  SENT:      'bg-emerald-900/40 text-[var(--success)]',
  DELIVERED: 'bg-emerald-900/40 text-[var(--success)]',
  FAILED:    'bg-red-900/40 text-[var(--danger)]',
  BOUNCED:   'bg-red-900/40 text-[var(--danger)]',
};

export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export function truncate(value: string | undefined | null, len = 12): string {
  if (!value) return '—';
  return value.length <= len ? value : `${value.slice(0, len)}…`;
}
