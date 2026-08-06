'use client';

import { Input } from '@fidscript/ui';

export interface HttpHeader {
  key: string;
  value: string;
}

interface HttpHeadersInputProps {
  headers: HttpHeader[];
  onChange: (headers: HttpHeader[]) => void;
}

export function HttpHeadersInput({ headers, onChange }: HttpHeadersInputProps) {
  const add = () => onChange([...headers, { key: '', value: '' }]);
  const remove = (idx: number) => onChange(headers.filter((_, i) => i !== idx));
  const update = (idx: number, field: 'key' | 'value', val: string) =>
    onChange(headers.map((h, i) => (i === idx ? { ...h, [field]: val } : h)));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-[var(--text-muted)] font-medium">Headers</label>
        <button type="button" onClick={add}
          className="text-[10px] px-2 py-0.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          + Add header
        </button>
      </div>
      {headers.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic py-2">
          No headers. Default Content-Type will be sent.
        </p>
      ) : (
        <div className="space-y-2">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={h.key} onChange={e => update(i, 'key', e.target.value)}
                placeholder="Header name"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] flex-1 text-sm" />
              <Input value={h.value} onChange={e => update(i, 'value', e.target.value)}
                placeholder="Value"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] flex-1 text-sm" />
              <button type="button" onClick={() => remove(i)}
                className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs px-2">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
