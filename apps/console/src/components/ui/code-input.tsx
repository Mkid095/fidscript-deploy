'use client';

import { useRef } from 'react';

/**
 * A one-time code, one digit a box.
 *
 * The boxes fill in order: a typed digit lands and the focus moves on,
 * backspace comes back, a paste drops the whole code into place, and the
 * first box is named a one-time code so the password manager offers one.
 * Nothing here is a sixth hidden input — the boxes are the control.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  label = 'The code',
}: {
  /** The code so far, one digit a position; shorter than `length` while it is being typed. */
  value: string;
  onChange: (next: string) => void;
  /** How many digits the code has. */
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  /** The word that names the boxes to a screen reader. */
  label?: string;
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const focusAt = (index: number) => {
    boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  };

  /**
   * One box's new content, as the browser sent it: the digit that was
   * typed, the paste that was dropped in, or the empty string of a
   * backspace.
   */
  const handle = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');

    // A backspace: drop this box's digit, or the one just before it.
    if (digits === '') {
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0 && value[index - 1]) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusAt(index - 1);
      }
      return;
    }

    // A type or a paste: the digit lands in this box, whatever follows it
    // in the code is kept, and the box's own old digit is replaced.
    const kept = value.slice(index + 1);
    onChange((value.slice(0, index) + digits + kept).slice(0, length));
    focusAt(index + digits.length);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1.5"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          value={value[i] ?? ''}
          onChange={(event) => handle(i, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              focusAt(i - 1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              focusAt(i + 1);
            } else if (event.key === 'Backspace' && !value[i]) {
              // An empty box has no character to delete, so the browser
              // sends nothing; the take-back of the digit before is done
              // here, not in the change that never comes.
              event.preventDefault();
              if (i > 0 && value[i - 1]) {
                onChange(value.slice(0, i - 1) + value.slice(i));
                focusAt(i - 1);
              }
            }
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          className="h-11 w-full rounded-md border border-rail bg-surface-2 text-center font-mono text-base font-semibold text-text transition-colors focus:border-accent disabled:opacity-50"
        />
      ))}
    </div>
  );
}
