'use client';

import { useState } from 'react';

import { Input, type InputProps } from './input';

/**
 * A password field you can look at.
 *
 * A person mistypes a password more often than they forget it, and a
 * field that cannot be seen makes the mistyping permanent. The eye is a
 * button, and it says what it does.
 */
export function PasswordInput({ ...props }: InputProps) {
  const [shown, setShown] = useState(false);

  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      adornment={
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-label={shown ? 'Hide the password' : 'Show the password'}
          title={shown ? 'Hide the password' : 'Show the password'}
          className="rounded px-1.5 py-0.5 text-[11px] text-text-dim transition-colors hover:text-text"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}
