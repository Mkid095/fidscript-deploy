'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';

export interface HeaderRow {
  key: string;
  value: string;
}

interface PublishMessageHeadersProps {
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
}

export function PublishMessageHeaders({ rows, onChange }: PublishMessageHeadersProps) {
  const updateRow = (idx: number, field: 'key' | 'value', val: string) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    onChange([...rows, { key: '', value: '' }]);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={row.key}
            onChange={(e) => updateRow(idx, 'key', e.target.value)}
            placeholder="Header name"
            className="flex-1 px-3 py-2 text-xs bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
          <input
            type="text"
            value={row.value}
            onChange={(e) => updateRow(idx, 'value', e.target.value)}
            placeholder="Value"
            className="flex-1 px-3 py-2 text-xs bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
          <button
            type="button"
            onClick={() => removeRow(idx)}
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--rail)] transition-colors"
            aria-label="Remove header"
          >
            <HugeiconsIcon icon={Delete02Icon} size={12} />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={addRow} className="gap-1.5">
        <HugeiconsIcon icon={Add01Icon} size={12} />
        Add header
      </Button>
    </div>
  );
}
