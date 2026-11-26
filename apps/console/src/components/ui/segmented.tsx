'use client';

import type { ReactNode } from 'react';

/**
 * The segmented control.
 *
 * Two or three ways to do the one thing on the screen, chosen side by side
 * — the sign-in's "by password" and "by code", the challenge's "code" and
 * "recovery". The active segment carries the accent underline, so which
 * one is on is never a guess.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-rail bg-surface-2 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
