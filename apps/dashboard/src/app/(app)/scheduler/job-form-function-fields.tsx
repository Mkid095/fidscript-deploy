'use client';

import type { Function_ } from '@/types';

interface FunctionActionFieldsProps {
  functions: Function_[];
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
}

export function FunctionActionFields({ functions, loading, value, onChange }: FunctionActionFieldsProps) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Function</label>
      {loading ? (
        <p className="text-xs text-[var(--text-muted)] italic py-2">Loading functions…</p>
      ) : functions.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic py-2">No functions in this project yet.</p>
      ) : (
        <select value={value} onChange={e => onChange(e.target.value)}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
          <option value="">Select a function…</option>
          {functions.map(f => (
            <option key={f.id} value={f.id}>{f.name} ({f.runtime})</option>
          ))}
        </select>
      )}
    </div>
  );
}