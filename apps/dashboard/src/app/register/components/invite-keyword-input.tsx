'use client';

import { Input } from '@fidscript/ui';

interface InviteKeywordInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function InviteKeywordInput({ value, error, onChange }: InviteKeywordInputProps) {
  return (
    <Input
      label="Invite keyword"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Enter your invite keyword"
      autoComplete="off"
      error={error}
    />
  );
}
