'use client';

import { Input } from '@fidscript/ui';

interface PasswordFieldsProps {
  adminPassword: string;
  confirmPassword: string;
  onAdminPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
}

export function PasswordFields({
  adminPassword,
  confirmPassword,
  onAdminPasswordChange,
  onConfirmPasswordChange,
}: PasswordFieldsProps) {
  return (
    <>
      <Input
        label="Admin Password"
        type="password"
        value={adminPassword}
        onChange={e => onAdminPasswordChange(e.target.value)}
        placeholder="Minimum 12 characters"
        required
        minLength={12}
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
      />
      <Input
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={e => onConfirmPasswordChange(e.target.value)}
        placeholder="Repeat your password"
        required
        minLength={12}
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
      />
    </>
  );
}
