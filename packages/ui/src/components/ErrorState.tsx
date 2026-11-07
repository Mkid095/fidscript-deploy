import React from 'react';
import { Button } from './Button';

/**
 * The state a screen shows when it could not do what it was asked to.
 *
 * The platform had **no** error state: a failed request was swallowed, the
 * screen rendered as if it were empty, and the operator was told nothing.
 * This is what replaces that — the message, and what to do next.
 */
export interface ErrorStateProps {
  title?: string;
  /** What went wrong, in the platform's words. */
  message: string;
  /** What the person can do about it. */
  action?: { label: string; onClick: () => void };
  /** A smaller, quieter presentation — for a panel inside a page. */
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  compact,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`
        rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5
        ${compact ? 'p-3' : 'p-5'}
        ${className}
      `}
    >
      <p className={`text-sm font-medium text-[var(--danger)] ${compact ? 'mb-1' : 'mb-2'}`}>
        {title}
      </p>
      <p className="text-xs text-[var(--text-muted)]">{message}</p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-3"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
