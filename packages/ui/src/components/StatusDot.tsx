import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * A status, as a dot and a word.
 *
 * The dot alone is a colour and nothing else: a screen reader says
 * "green" or nothing at all. This carries the **name** as well, so the
 * status is readable by everybody.
 */
export function StatusDot({
  tone = 'neutral',
  label,
  className = '',
}: {
  tone?: StatusTone;
  /** What the status is. It is required: a dot with no name says nothing. */
  label: string;
  className?: string;
}) {
  const colours: Record<StatusTone, string> = {
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]',
    info: 'bg-[var(--info)]',
    neutral: 'bg-[var(--text-dim)]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${colours[tone]}`} />
      <span className="text-[var(--text-muted)]">{label}</span>
    </span>
  );
}
