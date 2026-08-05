'use client';

import React, { useId, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { Input } from '@fidscript/ui';

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export function PasswordInput({
  label,
  error,
  hint,
  className = '',
  id,
  disabled,
  ...props
}: PasswordInputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        label={label}
        error={error}
        hint={hint}
        disabled={disabled}
        className={`pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputId}
        tabIndex={-1}
        className="
          absolute right-3 top-[34px]
          flex items-center justify-center
          w-7 h-7 rounded-md
          text-[var(--text-dim)] hover:text-[var(--text)]
          hover:bg-[var(--surface-3)]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-150
        "
      >
        <HugeiconsIcon
          icon={visible ? ViewOffIcon : ViewIcon}
          size={16}
          strokeWidth={1.5}
        />
      </button>
    </div>
  );
}