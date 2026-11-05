'use client';

import { Input } from '@fidscript/ui';

interface SetupPasswordInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/**
 * The company password.
 *
 * The person running the platform sets it during setup, and it is what a
 * new account has to present. It is a password, not a keyword — it is never
 * shown again and never stored in the clear.
 */
export function SetupPasswordInput({ value, error, onChange }: SetupPasswordInputProps) {
  return (
    <Input
      label="Company password"
      type="password"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="The password set by your platform administrator"
      autoComplete="off"
      error={error}
    />
  );
}
