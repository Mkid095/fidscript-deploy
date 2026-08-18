'use client';

import type { ExpiryOption } from '@/hooks/use-account-credentials';

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: '30m',  label: '30 minutes' },
  { value: '1h',   label: '1 hour' },
  { value: '7d',   label: '7 days' },
  { value: '30d',  label: '30 days' },
  { value: 'never', label: 'Never' },
];

export function ExpirySelector({ value, onChange }: { value: ExpiryOption; onChange: (o: ExpiryOption) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as ExpiryOption)}
      className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-2 py-2 text-xs text-[var(--text)]">
      {EXPIRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
