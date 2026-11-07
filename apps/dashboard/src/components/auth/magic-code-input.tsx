'use client';

import React, { useRef, useState } from 'react';

interface MagicCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  /** What the boxes are for — announced with the group. */
  label?: string;
}

/**
 * A one-time code, in boxes.
 *
 * The six boxes had no names: a screen reader announced six anonymous text
 * fields, and the error was a red border and a shake with nothing to say
 * what was wrong. Now the group is named, every box says which digit it is,
 * and the error is announced with the group.
 */
export function MagicCodeInput({
  length = 6,
  onComplete,
  disabled,
  error,
  label = 'One-time code',
}: MagicCodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, val: string) {
    if (!/^\d?$/.test(val)) return; // digits only
    const next = [...values];
    next[index] = val;
    setValues(next);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((v) => v !== '')) {
      onComplete(next.join(''));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      const next = [...values];
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      setValues(next);
      inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
      if (next.every((v) => v !== '')) onComplete(next.join(''));
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      aria-invalid={error ? true : undefined}
      className="flex gap-2 justify-center"
    >
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          maxLength={1}
          value={val}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`
            w-12 h-14 text-center text-xl font-mono rounded-lg
            bg-[var(--surface-2)] border text-[var(--text)]
            placeholder:text-[var(--text-dim)]
            focus:outline-none focus-visible:shadow-[var(--focus-ring)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            ${error ? 'border-[var(--danger)] animate-shake' : 'border-[var(--rail-light)] focus:border-[var(--accent)]'}
          `}
          style={{ animation: error ? 'shake 0.3s ease-in-out' : undefined }}
        />
      ))}
    </div>
  );
}
