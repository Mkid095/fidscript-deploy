'use client';

import { Input } from '@fidscript/ui';

interface CloudflareTokenFieldProps {
  value: string;
  onChange: (v: string) => void;
}

export function CloudflareTokenField({ value, onChange }: CloudflareTokenFieldProps) {
  return (
    <Input
      label="Cloudflare API Token"
      type="password"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Press Enter to skip if you don't use Cloudflare"
      hint="Used for automatic DNS configuration. Optional."
      className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
    />
  );
}
