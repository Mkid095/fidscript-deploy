'use client';

import React, { useRef, useState } from 'react';

interface MagicCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function MagicCodeInput({
  length = 6,
  onComplete,
  disabled,
  error,
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
    <div className="flex gap-2 justify-center">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`
            w-12 h-14 text-center text-xl font-mono rounded-lg
            bg-slate-900 border text-white
            placeholder:text-slate-600
            focus:outline-none focus:ring-2 focus:ring-red-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            ${error ? 'border-red-500 animate-shake' : 'border-slate-700 focus:border-slate-500'}
          `}
          style={{ animation: error ? 'shake 0.3s ease-in-out' : undefined }}
        />
      ))}
    </div>
  );
}
