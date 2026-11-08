import type { ReactNode } from 'react';

/** A short status. The colour says what it means, and the word says it too. */
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'border-rail text-text-muted',
    accent: 'border-accent/40 text-accent',
    success: 'border-success/40 text-success',
    warning: 'border-warning/40 text-warning',
    danger: 'border-danger/40 text-danger',
    info: 'border-info/40 text-info',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Nothing here.
 *
 * An empty state says what would be here and offers the way to put it here.
 * A blank panel says nothing at all.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {body ? (
        <p className="max-w-sm text-xs leading-relaxed text-text-muted">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** It could not be done, and this is why. */
export function ErrorState({
  title = 'That did not work',
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-danger">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** A number that could not be known says so — it does not show a zero. */
export function UnknownValue() {
  return <span className="text-text-dim">Not available</span>;
}
