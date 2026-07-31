'use client';

import { Input } from '@fidscript/ui';

interface AdminEmailFieldProps {
  value: string;
  onChange: (v: string) => void;
}

export function AdminEmailField({ value, onChange }: AdminEmailFieldProps) {
  return (
    <Input
      label="Admin Email"
      type="email"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="admin@example.com"
      required
      className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
    />
  );
}
